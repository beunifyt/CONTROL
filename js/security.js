// ═══════════════════════════════════════════════════════════════
// security.js — Bloqueo intentos + Dispositivos + Histórico accesos
//
// FUNCIONES:
// - Bloqueo tras 5 intentos fallidos (15 min)
// - Detección de dispositivo nuevo (fingerprint)
// - Aprobación de dispositivos por SuperAdmin
// - Histórico de accesos (loginAttempts en audit)
// ═══════════════════════════════════════════════════════════════

import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, setDoc, updateDoc, query, where,
  getDocs, orderBy, limit, serverTimestamp, addDoc, increment
} from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { logger } from './logger.js';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// ── FINGERPRINT del dispositivo ────────────────────────────────
export function getDeviceFingerprint(){
  // Hash simple del navegador + pantalla + zona horaria
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || '?',
    navigator.platform
  ].join('|');
  // Hash FNV-1a sencillo (32 bits)
  let h = 0x811c9dc5;
  for(let i = 0; i < data.length; i++){
    h ^= data.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

export function getDeviceLabel(){
  const ua = navigator.userAgent;
  let os = 'Desconocido';
  if(/Windows/.test(ua)) os = 'Windows';
  else if(/Macintosh|Mac OS X/.test(ua)) os = 'macOS';
  else if(/iPhone|iPad/.test(ua)) os = 'iOS';
  else if(/Android/.test(ua)) os = 'Android';
  else if(/Linux/.test(ua)) os = 'Linux';

  let browser = 'Navegador';
  if(/Edg\//.test(ua)) browser = 'Edge';
  else if(/Chrome\//.test(ua)) browser = 'Chrome';
  else if(/Firefox/.test(ua)) browser = 'Firefox';
  else if(/Safari/.test(ua)) browser = 'Safari';

  return `${os} · ${browser}`;
}

// ── BLOQUEO POR INTENTOS FALLIDOS ──────────────────────────────
// Para usuarios con email: contador en doc users/{uid}.loginAttempts
// Para login sin uid (email no encontrado): contador local por email
const LOCAL_ATTEMPTS = 'beunifyt_login_attempts';

function localAttempts(){
  try{ return JSON.parse(localStorage.getItem(LOCAL_ATTEMPTS) || '{}'); }
  catch(_){ return {}; }
}
function saveLocal(data){
  try{ localStorage.setItem(LOCAL_ATTEMPTS, JSON.stringify(data)); }
  catch(_){}
}

/**
 * @returns {object} { locked:boolean, remainingMinutes:number, attempts:number }
 */
export function checkLoginLock(email){
  const data = localAttempts();
  const e = (email || '').toLowerCase().trim();
  const rec = data[e];
  if(!rec) return { locked:false, attempts:0, remainingMinutes:0 };
  if(rec.lockedUntil && rec.lockedUntil > Date.now()){
    return {
      locked:true,
      attempts: rec.attempts,
      remainingMinutes: Math.ceil((rec.lockedUntil - Date.now()) / 60000)
    };
  }
  // Limpiar si ya expiró
  if(rec.lockedUntil && rec.lockedUntil <= Date.now()){
    delete data[e];
    saveLocal(data);
    return { locked:false, attempts:0, remainingMinutes:0 };
  }
  return { locked:false, attempts: rec.attempts || 0, remainingMinutes:0 };
}

/**
 * Registra un fallo y bloquea si alcanza el límite.
 */
export function recordLoginFailure(email){
  const data = localAttempts();
  const e = (email || '').toLowerCase().trim();
  if(!data[e]) data[e] = { attempts:0, firstFail: Date.now() };
  data[e].attempts++;
  data[e].lastFail = Date.now();
  if(data[e].attempts >= MAX_ATTEMPTS){
    data[e].lockedUntil = Date.now() + LOCK_MINUTES * 60 * 1000;
    logger.warn('Login bloqueado por intentos fallidos', { email: e, attempts: data[e].attempts });
  }
  saveLocal(data);
  return data[e];
}

/**
 * Limpia los intentos tras login exitoso.
 */
export function clearLoginFailures(email){
  const data = localAttempts();
  const e = (email || '').toLowerCase().trim();
  if(data[e]){
    delete data[e];
    saveLocal(data);
  }
}

// ── DISPOSITIVOS ───────────────────────────────────────────────

/**
 * Registra el dispositivo actual si no existe.
 * @returns {object} { isNew:boolean, requiresApproval:boolean, device:object }
 */
export async function registerDeviceForUser(uid, requireApproval = false){
  if(!uid) return { isNew:false, requiresApproval:false, device:null };
  const fp = getDeviceFingerprint();
  const docId = `${uid}_${fp}`;
  try{
    const ref = doc(db, 'devices', docId);
    const snap = await getDoc(ref);
    if(snap.exists()){
      // Actualizar última vez visto
      await updateDoc(ref, { lastSeen: serverTimestamp() });
      return { isNew:false, requiresApproval: requireApproval && snap.data().approved === false, device: { id:docId, ...snap.data() } };
    }
    // Dispositivo nuevo
    const device = {
      uid, fingerprint: fp,
      label: getDeviceLabel(),
      userAgent: navigator.userAgent.slice(0, 250),
      approved: !requireApproval, // si requiere aprobación, queda pendiente
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    };
    await setDoc(ref, device);
    logger.info('Dispositivo nuevo registrado', { uid, fp, requiresApproval: requireApproval });
    return { isNew:true, requiresApproval: requireApproval, device: { id:docId, ...device } };
  } catch(e){
    logger.warn('No se pudo registrar dispositivo', { error: e.message });
    return { isNew:false, requiresApproval:false, device:null };
  }
}

/**
 * Lista dispositivos del usuario.
 */
export async function listUserDevices(uid){
  try{
    const q = query(collection(db, 'devices'), where('uid', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch(e){
    logger.warn('No se pudieron listar dispositivos', { error: e.message });
    return [];
  }
}

/**
 * Lista TODOS los dispositivos (SuperAdmin).
 */
export async function listAllDevices({onlyPending = false} = {}){
  try{
    let q = collection(db, 'devices');
    if(onlyPending){
      q = query(q, where('approved', '==', false));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch(e){
    logger.warn('No se pudieron listar dispositivos', { error: e.message });
    return [];
  }
}

/**
 * Aprueba un dispositivo.
 */
export async function approveDevice(deviceId){
  await updateDoc(doc(db, 'devices', deviceId), {
    approved: true,
    approvedAt: serverTimestamp()
  });
}

/**
 * Revoca un dispositivo.
 */
export async function revokeDevice(deviceId){
  await updateDoc(doc(db, 'devices', deviceId), {
    approved: false,
    revokedAt: serverTimestamp()
  });
}

// ── HISTÓRICO DE ACCESOS ───────────────────────────────────────

/**
 * Registra un login (exitoso o fallido) en audit.
 */
export async function logAccess({uid, email, success, deviceFingerprint, deviceLabel}){
  try{
    await addDoc(collection(db, 'audit'), {
      type:'login',
      uid: uid || null,
      email: email || null,
      success: !!success,
      deviceFingerprint: deviceFingerprint || getDeviceFingerprint(),
      deviceLabel: deviceLabel || getDeviceLabel(),
      userAgent: navigator.userAgent.slice(0, 250),
      createdAt: serverTimestamp()
    });
  } catch(e){
    logger.warn('No se pudo registrar acceso en audit', { error: e.message });
  }
}

/**
 * Devuelve los últimos N accesos de un usuario.
 */
export async function getUserAccessHistory(uid, max = 30){
  try{
    const q = query(
      collection(db, 'audit'),
      where('type', '==', 'login'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id:d.id, ...d.data() }));
  } catch(e){
    logger.warn('No se pudo cargar histórico accesos', { error: e.message });
    return [];
  }
}
