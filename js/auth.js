// auth.js — flujo de autenticación
import {
  auth, db, googleProvider, bootstrapAdminEmail, defaultCompanyName
} from './firebase-config.js';
import {
  onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut as fbSignOut, updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  doc, getDoc, setDoc, onSnapshot, runTransaction, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { validateInvite, consumeInvite, INVITE_ERRORS } from './invites.js';
import { startPermsListener, stopPermsListener } from './roles.js';
import { cleanupAllListeners, registerListener } from './db.js';
import { normalizeEmail, $, el, setText, toast, log, logErr } from './utils.js';
import { logger } from './logger.js';
import { tr, getLang, setLang } from './i18n.js';
import { checkLoginLock, recordLoginFailure, clearLoginFailures, registerDeviceForUser, logAccess, getDeviceFingerprint, getDeviceLabel } from './security.js';

const MAX_FAIL_ATTEMPTS = 5;
const LOCK_MIN = 15;

let currentUser = null;
let currentProfile = null;
const readyHandlers = [];

export function onAuthReady(fn){ readyHandlers.push(fn); }
export function getCurrentProfile(){ return currentProfile; }
export function getCurrentUser(){ return currentUser; }

async function loadOrCreateProfile(fbUser, inviteCode=null){
  const uid = fbUser.uid;
  const email = normalizeEmail(fbUser.email);
  const userRef = doc(db, 'users', uid);

  const existing = await getDoc(userRef);
  if(existing.exists()) return { id: uid, ...existing.data() };

  let role = 'user';
  let active = false;
  let empresa = defaultCompanyName;
  let invitedBy = null;
  let usedInviteCode = null;

  const bootstrap = normalizeEmail(bootstrapAdminEmail);
  if(bootstrap && email && email === bootstrap){
    role = 'admin';
    active = true;
  }

  if(inviteCode){
    const v = await validateInvite(inviteCode);
    if(v.valid){
      role = v.data.role || 'user';
      active = true;
      empresa = v.data.empresa || defaultCompanyName;
      invitedBy = v.data.createdBy || null;
      usedInviteCode = v.code;
    }
  }

  const profile = await runTransaction(db, async (tx) => {
    const fresh = await tx.get(userRef);
    if(fresh.exists()) return { id: uid, ...fresh.data() };

    const data = {
      email,
      displayName: fbUser.displayName || email.split('@')[0] || 'Usuario',
      photoURL: fbUser.photoURL || null,
      role, active, empresa,
      invitedBy, inviteCode: usedInviteCode,
      lang: getLang(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    tx.set(userRef, data);
    return { id: uid, ...data };
  });

  if(usedInviteCode){
    try{ await consumeInvite(usedInviteCode, uid, email); }
    catch(e){ logErr('consumeInvite', e); }
  }

  return profile;
}

function startProfileListener(uid){
  const ref = doc(db, 'users', uid);
  const unsub = onSnapshot(ref, (snap) => {
    if(!snap.exists()) return;
    const newProfile = { id: snap.id, ...snap.data() };
    const wasActive = currentProfile?.active !== false;
    const becameInactive = wasActive && newProfile.active === false;
    currentProfile = newProfile;

    if(becameInactive){
      toast('Tu acceso ha sido revocado', 'err', 4000);
      setTimeout(() => doSignOut(), 2000);
      return;
    }

    document.dispatchEvent(new CustomEvent('profile-changed', { detail: newProfile }));
  }, (err) => {
    logErr('profile listener', err);
  });
  registerListener('auth:profile', unsub);
}

export async function doSignOut(){
  cleanupAllListeners();
  stopPermsListener();
  currentUser = null;
  currentProfile = null;
  try{ await fbSignOut(auth); } catch(e){ logErr('signOut', e); }
  setTimeout(() => location.reload(), 200);
}

async function loginWithGoogle(inviteCode=null){
  showError('');
  try{
    const cred = await signInWithPopup(auth, googleProvider);
    log('Google login OK', cred.user.email);
  } catch(e){
    if(e.code === 'auth/popup-closed-by-user') return;
    showError(translateAuthError(e));
  }
}

async function loginWithEmail(email, password){
  showError('');
  // Comprobar bloqueo
  const lockState = checkLoginLock(email);
  if(lockState.locked){
    showError(`Cuenta bloqueada por intentos fallidos. Intenta de nuevo en ${lockState.remainingMinutes} min.`);
    return;
  }
  try{
    await signInWithEmailAndPassword(auth, email, password);
    clearLoginFailures(email);
    // El log de acceso lo hace onAuthStateChanged
  } catch(e){
    const failState = recordLoginFailure(email);
    const remaining = MAX_FAIL_ATTEMPTS - failState.attempts;
    let msg = translateAuthError(e);
    if(failState.lockedUntil){
      msg = `Cuenta bloqueada ${LOCK_MIN} min por ${MAX_FAIL_ATTEMPTS} intentos fallidos.`;
    } else if(remaining <= 2 && remaining > 0){
      msg += ` · ${remaining} intento${remaining === 1 ? '' : 's'} restante${remaining === 1 ? '' : 's'}.`;
    }
    showError(msg);
    // Registrar fallo en audit (sin uid)
    try{ logAccess({ email, success:false }); } catch(_){}
  }
}

async function signupWithEmail(email, password, displayName, inviteCode=null){
  showError('');
  if(!password || password.length < 8){ showError('La contraseña debe tener al menos 8 caracteres'); return; }
  try{
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if(displayName){
      try{ await updateProfile(cred.user, { displayName }); } catch(_){}
    }
  } catch(e){
    showError(translateAuthError(e));
  }
}

function translateAuthError(e){
  const code = e.code || '';
  const map = {
    'auth/invalid-email': 'Email no válido',
    'auth/user-not-found': 'Usuario no encontrado',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/invalid-credential': 'Credenciales no válidas',
    'auth/email-already-in-use': 'Este email ya tiene cuenta',
    'auth/weak-password': 'Contraseña demasiado débil',
    'auth/network-request-failed': 'Sin conexión',
    'auth/popup-blocked': 'El navegador bloqueó la ventana emergente',
    'auth/unauthorized-domain': 'Dominio no autorizado en Firebase'
  };
  return map[code] || e.message || 'Error de autenticación';
}

function getInviteFromUrl(){
  const p = new URLSearchParams(location.search);
  return (p.get('invite') || '').toUpperCase().trim();
}

function showError(msg){
  const er = $('#login-error');
  if(!er) return;
  if(msg){
    setText(er, msg);
    er.classList.remove('hidden');
  } else {
    er.classList.add('hidden');
  }
}

let _mode = 'login';

function renderLogin(){
  const inviteCode = getInviteFromUrl();
  const body = $('#login-body');
  if(!body) return;
  body.innerHTML = '';

  const googleBtn = el('button', {
    class:'login-google',
    onclick: () => loginWithGoogle(inviteCode)
  },
    el('svg', { viewBox:'0 0 24 24', width:'18', height:'18', html:`
      <path fill="#4285F4" d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.08-1.92 3.22-4.74 3.22-8.07z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
      <path fill="#FBBC05" d="M5.85 14.12A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.46.35-2.12V7.04H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.96l3.67-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.04l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>`
    })
  , 'Continuar con Google');
  body.appendChild(googleBtn);

  body.appendChild(el('div', { class:'login-divider' }, 'o'));

  const form = el('form', { onsubmit: (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if(_mode === 'login'){
      loginWithEmail(fd.get('email'), fd.get('password'));
    } else {
      signupWithEmail(fd.get('email'), fd.get('password'), fd.get('displayName'), inviteCode);
    }
  }});

  if(_mode === 'signup'){
    form.appendChild(field('Nombre', 'displayName', 'text', { autocomplete:'name' }));
  }
  form.appendChild(field('Email', 'email', 'email', { required:true, autocomplete:'email' }));
  form.appendChild(field('Contraseña', 'password', 'password', {
    required:true, autocomplete: _mode === 'login' ? 'current-password' : 'new-password',
    hint: _mode === 'signup' ? 'Mínimo 8 caracteres' : ''
  }));

  if(_mode === 'signup' && !inviteCode){
    form.appendChild(field('Código de invitación (opcional)', 'invite', 'text', { hint:'Si tienes un código, te dará acceso automático' }));
  }

  form.appendChild(el('button', {
    type:'submit',
    class:'btn btn-primary btn-full',
    style:{ marginTop:'8px' }
  }, _mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'));

  body.appendChild(form);

  const toggle = el('div', { class:'login-toggle' });
  if(_mode === 'login'){
    toggle.appendChild(document.createTextNode('¿No tienes cuenta? '));
    toggle.appendChild(el('a', { onclick: () => { _mode = 'signup'; renderLogin(); } }, 'Crear cuenta'));
  } else {
    toggle.appendChild(document.createTextNode('¿Ya tienes cuenta? '));
    toggle.appendChild(el('a', { onclick: () => { _mode = 'login'; renderLogin(); } }, 'Iniciar sesión'));
  }
  body.appendChild(toggle);

  if(inviteCode){
    const banner = el('div', {
      style:{
        marginTop:'14px', padding:'10px 12px',
        background:'var(--primary-soft)', color:'var(--primary-soft-text)',
        borderRadius:'var(--r)', fontSize:'13px',
        border:'1px solid #BFDBFE'
      }
    }, `Invitación detectada: ${inviteCode}. Inicia sesión o crea cuenta para activarla.`);
    body.insertBefore(banner, body.firstChild);
  }
}

function field(label, name, type='text', opts={}){
  const wrap = el('div', { class:'field' });
  wrap.appendChild(el('label', { class:'field-label' }, label));
  const input = el('input', {
    class:'field-input',
    name, type,
    autocomplete: opts.autocomplete || 'off',
    required: opts.required ? 'required' : null
  });
  wrap.appendChild(input);
  if(opts.hint) wrap.appendChild(el('div', { class:'field-hint' }, opts.hint));
  return wrap;
}

function showScreen(name){
  $('#boot')?.classList.add('hidden');
  $('#login-screen')?.classList.toggle('hidden', name !== 'login');
  $('#pending-screen')?.classList.toggle('hidden', name !== 'pending');
  $('#app')?.classList.toggle('hidden', name !== 'app');
}

onAuthStateChanged(auth, async (fbUser) => {
  try{
    if(!fbUser){
      currentUser = null;
      currentProfile = null;
      showScreen('login');
      renderLogin();
      return;
    }

    currentUser = fbUser;
    const inviteCode = getInviteFromUrl();
    const profile = await loadOrCreateProfile(fbUser, inviteCode);
    currentProfile = profile;

    if(profile.lang) setLang(profile.lang);

    // Registrar dispositivo + log de acceso
    try{
      // SuperAdmin (rol "admin") obliga aprobación de dispositivos nuevos en otros usuarios.
      // Para el admin propio NO requerimos aprobación (siempre auto-aprobado).
      const requiresApproval = profile.role !== 'admin' && profile.requireDeviceApproval !== false;
      const devResult = await registerDeviceForUser(fbUser.uid, requiresApproval);
      logAccess({
        uid: fbUser.uid,
        email: fbUser.email || profile.email,
        success: true,
        deviceFingerprint: getDeviceFingerprint(),
        deviceLabel: getDeviceLabel()
      });
      if(devResult.isNew && devResult.requiresApproval){
        toast('⚠ Dispositivo nuevo detectado · Esperando aprobación del administrador', 'warn', 8000);
      } else if(devResult.isNew){
        toast('🆕 Nuevo dispositivo registrado', 'info', 4000);
      }
      // Limpiar intentos fallidos (login exitoso)
      if(fbUser.email) clearLoginFailures(fbUser.email);
    } catch(e){
      logger.warn('No se pudo registrar acceso/dispositivo', { error: e.message });
    }

    if(inviteCode){
      const url = new URL(location.href);
      url.searchParams.delete('invite');
      history.replaceState({}, '', url.toString());
    }

    // Arrancamos el profile listener SIEMPRE (incluso si está pending)
    // para detectar activación remota (A-FLOW.1)
    startProfileListener(fbUser.uid);

    if(!profile.active){
      // Listener específico para detectar activación
      const ref = doc(db, 'users', fbUser.uid);
      const unsubPending = onSnapshot(ref, (snap) => {
        if(snap.exists() && snap.data().active === true){
          unsubPending();
          location.reload();
        }
      });
      registerListener('auth:pending', unsubPending);
      showScreen('pending');
      return;
    }

    await startPermsListener();

    showScreen('app');

    for(const fn of readyHandlers){
      try{ await fn(profile); } catch(e){ logErr('onAuthReady', e); }
    }
  } catch(e){
    logger.fatal('Flujo de autenticación falló', { error: e.message, stack: e.stack });
    showError(e.message || 'Error de autenticación');
    showScreen('login');
    renderLogin();
  }
});

window.beunifyt = window.beunifyt || {};
window.beunifyt.signOut = doSignOut;
