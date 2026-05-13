// roles.js — sistema de permisos por rol y módulo (v3 granular)
//
// Niveles por módulo: 'none' | 'read' | 'write'
//   - none:  no aparece en el menú, no acceso
//   - read:  ve datos pero no puede crear/editar/eliminar
//   - write: acceso completo
//
import { db } from './firebase-config.js';
import {
  doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const MODULES = [
  { id:'dashboard',       label:'Dashboard',        icon:'dashboard',   group:'Operaciones', desc:'Resumen operacional' },
  { id:'recintos',        label:'Recintos',         icon:'recintos',    group:'Gestión',     desc:'Gestión de recintos' },
  { id:'eventos',         label:'Eventos',          icon:'eventos',     group:'Gestión',     desc:'Gestión de eventos' },
  { id:'referencias',     label:'Referencias',      icon:'referencias', group:'Operaciones', desc:'Prerregistros y refs' },
  { id:'ingresos',        label:'Ingresos',         icon:'ingresos',    group:'Operaciones', desc:'Acceso libre vehículos' },
  { id:'agenda',          label:'Agenda & Booking', icon:'agenda',      group:'Operaciones', desc:'Planificación y reservas' },
  { id:'conductores',     label:'Conductores',      icon:'conductores', group:'Recursos',    desc:'Base de conductores' },
  { id:'empresas',        label:'Empresas',         icon:'empresas',    group:'Recursos',    desc:'Gestión de empresas' },
  { id:'flota',           label:'Flota',            icon:'flota',       group:'Recursos',    desc:'Gestión de flota' },
  { id:'analytics',       label:'Analytics',        icon:'analytics',   group:'Análisis',    desc:'Análisis y tendencias' },
  { id:'mensajes',        label:'Mensajes',         icon:'mensajes',    group:'Sistema',     desc:'Comunicación interna' },
  { id:'impresion',       label:'Impresión',        icon:'impresion',   group:'Análisis',    desc:'Editor de tarjetas' },
  { id:'turnos',          label:'Turnos',           icon:'calendar',    group:'Gestión',     desc:'Fichaje y turnos' },
  { id:'incidencias',     label:'Incidencias',      icon:'warn',        group:'Gestión',     desc:'Gestión de incidencias' },
  { id:'usuarios',        label:'Usuarios',         icon:'usuarios',    group:'Sistema',     desc:'Control de accesos', adminOnly:true },
  { id:'papelera',        label:'Papelera',         icon:'trash',       group:'Sistema',     desc:'Restaurar eliminados' },
  { id:'tutorial',        label:'Ayuda & Curso',    icon:'info',        group:'Sistema',     desc:'Formación y soporte' },
  { id:'tracking',        label:'Seguimiento',      icon:'search',      group:'Análisis',    desc:'Tracking público' },
  { id:'seguridad',       label:'Seguridad',        icon:'lock',        group:'Sistema',     desc:'Dispositivos y accesos', adminOnly:true },
  { id:'asistentes',      label:'Asistentes IA',    icon:'message',     group:'Sistema',     desc:'Agentes inteligentes' },
  { id:'portal-empresa',  label:'Mi Empresa',       icon:'empresas',    group:'Sistema',     desc:'Portal externo B2B', empresaOnly:true }
];

export const MODULE_GROUPS = [
  { label:'Operaciones', ids:['dashboard','referencias','ingresos','agenda'] },
  { label:'Recursos',    ids:['conductores','empresas','flota','portal-empresa'] },
  { label:'Gestión',     ids:['recintos','eventos','turnos','incidencias'] },
  { label:'Análisis',    ids:['analytics','impresion','tracking'] },
  { label:'Sistema',     ids:['mensajes','tutorial','papelera','asistentes','usuarios','seguridad'] }
];

export const BUILTIN_ROLES = ['admin','supervisor','operario','user','empresa'];

export const ROLE_LABEL = {
  admin:      'Administrador',
  supervisor: 'Supervisor',
  operario:   'Operario',
  user:       'Usuario',
  empresa:    'Empresa (Portal B2B)'
};

export const ROLE_COLOR = {
  admin:      { bg:'#F5F3FF', text:'#6D28D9', border:'#C4B5FD' },
  supervisor: { bg:'#DBEAFE', text:'#1D4ED8', border:'#93C5FD' },
  operario:   { bg:'#DCFCE7', text:'#15803D', border:'#86EFAC' },
  user:       { bg:'#F3F4F6', text:'#4B5563', border:'#D1D5DB' },
  empresa:    { bg:'#FEF3C7', text:'#92400E', border:'#FCD34D' }
};

function buildPerm(writeIds = [], readIds = []){
  const out = {};
  for(const m of MODULES){
    if(writeIds.includes(m.id))      out[m.id] = 'write';
    else if(readIds.includes(m.id))  out[m.id] = 'read';
    else                              out[m.id] = 'none';
  }
  return out;
}

export const DEFAULT_ROLE_PERMS = {
  supervisor: buildPerm(
    ['dashboard','recintos','eventos','referencias','ingresos','agenda','conductores','empresas','flota','analytics','mensajes','impresion','turnos','incidencias','papelera','tutorial','tracking','asistentes'],
    []
  ),
  operario: buildPerm(
    ['dashboard','referencias','ingresos','agenda','mensajes','incidencias','tutorial','asistentes'],
    ['conductores','empresas','flota','impresion','analytics']
  ),
  user: buildPerm(
    [],
    ['dashboard','mensajes','tutorial']
  ),
  empresa: buildPerm(
    ['portal-empresa'],
    []
  )
};

let _perms = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMS));
let _customRoles = [];
let _unsubPerms = null;
const _listeners = new Set();

export function getPerms(){ return _perms; }
export function getCustomRoles(){ return _customRoles; }
export function getAllRoles(){
  return [...BUILTIN_ROLES, ..._customRoles.map(r => r.id)];
}
export function getRoleLabel(roleId){
  return ROLE_LABEL[roleId] || _customRoles.find(r => r.id === roleId)?.label || roleId;
}
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
      _perms = {};
      for(const role of ['supervisor','operario','user','empresa']){
        _perms[role] = d[role] || DEFAULT_ROLE_PERMS[role];
        // Migración formato antiguo {modules:[...]} → granular
        if(_perms[role] && Array.isArray(_perms[role].modules)){
          _perms[role] = buildPerm(_perms[role].modules, []);
        }
      }
      _customRoles = Array.isArray(d.customRoles) ? d.customRoles : [];
      for(const cr of _customRoles){
        if(cr.id && cr.perms) _perms[cr.id] = cr.perms;
      }
    } else {
      _perms = JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMS));
      _customRoles = [];
    }
    _notifyPermsChange();
  }, (err) => {
    console.warn('[roles] perms listener error', err);
  });
}
export function stopPermsListener(){
  if(_unsubPerms){ _unsubPerms(); _unsubPerms = null; }
}

export async function savePerms({ perms, customRoles }, byUid){
  const ref = doc(db, 'config', 'permisos');
  const payload = {
    updatedAt: serverTimestamp(),
    updatedBy: byUid || null
  };
  if(perms){
    for(const role of Object.keys(perms)){
      payload[role] = perms[role];
    }
  }
  if(customRoles) payload.customRoles = customRoles;
  await setDoc(ref, payload, { merge: true });
}

export function isAdmin(profile){
  return profile && profile.role === 'admin' && profile.active !== false;
}

export function getModuleAccess(profile, moduleId){
  if(!profile || profile.active === false) return 'none';
  if(profile.role === 'admin') return 'write';
  const mod = MODULES.find(m => m.id === moduleId);

  if(profile.role === 'empresa'){
    return moduleId === 'portal-empresa' ? 'write' : 'none';
  }
  if(mod?.empresaOnly) return 'none';
  if(mod?.adminOnly)   return 'none';

  // Override por usuario individual (matriz granular)
  if(profile.modulePerms && typeof profile.modulePerms === 'object'){
    const lvl = profile.modulePerms[moduleId];
    if(lvl === 'none' || lvl === 'read' || lvl === 'write') return lvl;
  }

  const rolePerms = _perms[profile.role];
  if(!rolePerms) return 'none';
  const lvl = rolePerms[moduleId];
  return (lvl === 'read' || lvl === 'write') ? lvl : 'none';
}

export function canSeeModule(profile, moduleId){
  const lvl = getModuleAccess(profile, moduleId);
  return lvl === 'read' || lvl === 'write';
}
export function canWriteModule(profile, moduleId){
  return getModuleAccess(profile, moduleId) === 'write';
}
export function canCreate(profile, moduleId){
  if(!profile || profile.active === false) return false;
  if(profile.role === 'admin') return true;
  if(moduleId) return canWriteModule(profile, moduleId);
  return MODULES.some(m => canWriteModule(profile, m.id));
}
export function canEdit(profile, moduleId)   { return canCreate(profile, moduleId); }
export function canDelete(profile, moduleId) { return canCreate(profile, moduleId); }
export function visibleModules(profile){
  if(!profile) return [];
  return MODULES.filter(m => canSeeModule(profile, m.id));
}
