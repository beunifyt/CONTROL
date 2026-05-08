// roles.js — sistema de permisos por rol y módulo
import { db } from './firebase-config.js';
import {
  doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const MODULES = [
  { id:'dashboard',   label:'Dashboard',   icon:'dashboard' },
  { id:'recintos',    label:'Recintos',    icon:'recintos' },
  { id:'eventos',     label:'Eventos',     icon:'eventos' },
  { id:'referencias', label:'Referencias', icon:'referencias' },
  { id:'ingresos',    label:'Ingresos',    icon:'ingresos' },
  { id:'agenda',      label:'Agenda',      icon:'agenda' },
  { id:'conductores', label:'Conductores', icon:'conductores' },
  { id:'empresas',    label:'Empresas',    icon:'empresas' },
  { id:'flota',       label:'Flota',       icon:'flota' },
  { id:'analytics',   label:'Analytics',   icon:'analytics' },
  { id:'mensajes',    label:'Mensajes',    icon:'mensajes' },
  { id:'impresion',   label:'Impresión',   icon:'impresion' },
  { id:'usuarios',    label:'Usuarios',    icon:'usuarios', adminOnly:true }
];

export const ROLES = ['admin','supervisor','operario','user'];

export const ROLE_LABEL = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  operario: 'Operario',
  user: 'Usuario'
};

export const DEFAULT_PERMS = {
  supervisor: {
    modules: ['dashboard','recintos','eventos','referencias','ingresos','agenda','conductores','empresas','flota','analytics','mensajes','impresion'],
    canCreate: true, canEdit: true, canDelete: true
  },
  operario: {
    modules: ['dashboard','referencias','ingresos','agenda','mensajes'],
    canCreate: true, canEdit: true, canDelete: false
  },
  user: {
    modules: ['dashboard','mensajes'],
    canCreate: false, canEdit: false, canDelete: false
  }
};

let _perms = JSON.parse(JSON.stringify(DEFAULT_PERMS));
let _unsubPerms = null;
const _listeners = new Set();

export function getPerms(){ return _perms; }

export function onPermsChange(fn){
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _notifyPermsChange(){
  for(const fn of _listeners){
    try{ fn(_perms); } catch(e){ console.error('perms listener', e); }
  }
}

export async function startPermsListener(){
  if(_unsubPerms) _unsubPerms();
  const ref = doc(db, 'config', 'permisos');
  _unsubPerms = onSnapshot(ref, (snap) => {
    if(snap.exists()){
      const d = snap.data();
      _perms = {
        supervisor: d.supervisor || DEFAULT_PERMS.supervisor,
        operario:   d.operario   || DEFAULT_PERMS.operario,
        user:       d.user       || DEFAULT_PERMS.user
      };
    } else {
      _perms = JSON.parse(JSON.stringify(DEFAULT_PERMS));
    }
    _notifyPermsChange();
  }, (err) => {
    console.warn('[roles] perms listener error', err);
  });
}

export function stopPermsListener(){
  if(_unsubPerms){ _unsubPerms(); _unsubPerms = null; }
}

export async function savePerms(perms, byUid){
  const ref = doc(db, 'config', 'permisos');
  await setDoc(ref, {
    ...perms,
    updatedAt: serverTimestamp(),
    updatedBy: byUid || null
  }, { merge: true });
}

export function isAdmin(profile){
  return profile && profile.role === 'admin' && profile.active !== false;
}

export function canSeeModule(profile, moduleId){
  if(!profile || profile.active === false) return false;
  if(profile.role === 'admin') return true;
  const mod = MODULES.find(m => m.id === moduleId);
  if(mod?.adminOnly) return false;
  const perm = _perms[profile.role];
  if(!perm) return false;
  return (perm.modules || []).includes(moduleId);
}

export function canCreate(profile){
  if(!profile || profile.active === false) return false;
  if(profile.role === 'admin') return true;
  return !!_perms[profile.role]?.canCreate;
}

export function canEdit(profile){
  if(!profile || profile.active === false) return false;
  if(profile.role === 'admin') return true;
  return !!_perms[profile.role]?.canEdit;
}

export function canDelete(profile){
  if(!profile || profile.active === false) return false;
  if(profile.role === 'admin') return true;
  return !!_perms[profile.role]?.canDelete;
}

export function visibleModules(profile){
  if(!profile) return [];
  return MODULES.filter(m => canSeeModule(profile, m.id));
}
