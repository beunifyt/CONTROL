// ═══════════════════════════════════════════════════════════════
// seguridad.js — Panel SuperAdmin
//
// - Dispositivos pendientes de aprobación
// - Dispositivos aprobados de todos los usuarios
// - Histórico de accesos (logins)
// - Revocar/aprobar dispositivos
// ═══════════════════════════════════════════════════════════════

import { el, clear, icon, toast, confirmModal } from '../utils.js';
import { list, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState } from './shared.js';
import { getCurrentProfile } from '../auth.js';
import { listAllDevices, approveDevice, revokeDevice, getUserAccessHistory } from '../security.js';
import { logger } from '../logger.js';

let _container = null;
let _activeTab = 'pending';
let _devices = [];
let _users = [];
let _accessLogs = [];

const KEY_PREFIX = 'mod:seguridad:';

export async function init(container){
  _container = container;
  const profile = getCurrentProfile();
  if(profile?.role !== 'admin'){
    clear(container);
    container.appendChild(pageHeader({ title:'🔒 Seguridad', sub:'Solo para administradores' }));
    container.appendChild(emptyState({
      iconName:'lock', title:'Acceso restringido',
      message:'Este módulo es exclusivo para el administrador del sistema.'
    }));
    return;
  }
  await loadData();
  render();
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  _container = null;
}

async function loadData(){
  try{
    [_devices, _users] = await Promise.all([
      listAllDevices(),
      list('users', { orderBy:'createdAt', order:'desc' })
    ]);
    // Cargar últimos 50 accesos GLOBALES (de toda la tabla audit type=login)
    _accessLogs = await list('audit', {
      where:{ type:'login' },
      orderBy:'createdAt', order:'desc', limit:50
    });
  } catch(e){
    logger.error('Seguridad: error cargando datos', { error: e.message });
    _devices = []; _users = []; _accessLogs = [];
  }
}

function userOf(uid){
  return _users.find(u => u.id === uid);
}

function render(){
  if(!_container) return;
  clear(_container);

  _container.appendChild(pageHeader({
    title:'🔒 Seguridad',
    sub:'Dispositivos · Accesos · Bloqueos'
  }));

  const pendingCount = _devices.filter(d => !d.approved).length;
  const approvedCount = _devices.filter(d => d.approved).length;

  // Tabs
  const tabs = el('div', { class:'role-tabs', style:{marginBottom:'16px'} });
  for(const t of [
    ['pending',  `⏳ Pendientes (${pendingCount})`],
    ['approved', `✓ Aprobados (${approvedCount})`],
    ['access',   `📋 Accesos (${_accessLogs.length})`]
  ]){
    tabs.appendChild(el('button', {
      class:`role-tab ${_activeTab === t[0] ? 'active' : ''}`,
      onclick: () => { _activeTab = t[0]; render(); }
    }, t[1]));
  }
  _container.appendChild(tabs);

  if(_activeTab === 'pending')      renderDevices(d => !d.approved);
  else if(_activeTab === 'approved') renderDevices(d => d.approved);
  else                               renderAccessLog();
}

function renderDevices(filter){
  const list = _devices.filter(filter);
  if(list.length === 0){
    _container.appendChild(emptyState({
      iconName:'inbox',
      title: _activeTab === 'pending' ? 'Sin dispositivos pendientes' : 'Sin dispositivos aprobados',
      message: _activeTab === 'pending' ? 'Cuando alguien acceda desde un dispositivo nuevo, aparecerá aquí.' : 'Aún no hay dispositivos aprobados.'
    }));
    return;
  }

  const wrap = el('div', { class:'table-wrap' });
  const tbl = el('table', { class:'table' });
  tbl.appendChild(el('thead', {}, el('tr', {},
    el('th',{},'Usuario'),
    el('th',{},'Dispositivo'),
    el('th',{},'Huella'),
    el('th',{},'Primera vez'),
    el('th',{},'Última vez'),
    el('th',{},'Acciones')
  )));
  const tb = el('tbody');
  for(const d of list){
    const u = userOf(d.uid);
    const created = d.createdAt?.toDate ? d.createdAt.toDate() : null;
    const seen = d.lastSeen?.toDate ? d.lastSeen.toDate() : null;
    tb.appendChild(el('tr', {},
      el('td', {}, u ? (u.displayName || u.email || u.id) : el('span', { class:'cell-mute' }, d.uid?.slice(0,8) + '…')),
      el('td', {}, d.label || '—'),
      el('td', { class:'cell-mute', style:{fontFamily:'monospace', fontSize:'11px'} }, d.fingerprint || '—'),
      el('td', { class:'cell-mute' }, created ? created.toLocaleString() : '—'),
      el('td', { class:'cell-mute' }, seen ? seen.toLocaleString() : '—'),
      el('td', {}, renderDeviceActions(d))
    ));
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  _container.appendChild(wrap);
}

function renderDeviceActions(d){
  const wrap = el('div', { class:'row-actions' });
  if(!d.approved){
    wrap.appendChild(el('button', {
      class:'btn btn-primary btn-sm',
      onclick: async () => {
        try{ await approveDevice(d.id); toast('Dispositivo aprobado', 'ok'); await loadData(); render(); }
        catch(e){ toast(e.message, 'err'); }
      }
    }, '✓ Aprobar'));
  } else {
    wrap.appendChild(el('button', {
      class:'btn btn-danger btn-sm',
      onclick: async () => {
        const ok = await confirmModal({ title:'Revocar dispositivo', message:`Bloquear acceso desde este dispositivo? El usuario tendrá que esperar nueva aprobación.`, danger:true });
        if(!ok) return;
        try{ await revokeDevice(d.id); toast('Dispositivo revocado', 'ok'); await loadData(); render(); }
        catch(e){ toast(e.message, 'err'); }
      }
    }, '✕ Revocar'));
  }
  return wrap;
}

function renderAccessLog(){
  if(_accessLogs.length === 0){
    _container.appendChild(emptyState({
      iconName:'inbox', title:'Sin accesos registrados',
      message:'Los accesos a la plataforma aparecerán aquí cuando se produzcan.'
    }));
    return;
  }

  const wrap = el('div', { class:'table-wrap' });
  const tbl = el('table', { class:'table' });
  tbl.appendChild(el('thead', {}, el('tr', {},
    el('th',{},'Fecha'),
    el('th',{},'Usuario'),
    el('th',{},'Email'),
    el('th',{},'Dispositivo'),
    el('th',{},'Resultado'),
    el('th',{},'Huella')
  )));
  const tb = el('tbody');
  for(const a of _accessLogs){
    const u = userOf(a.uid);
    const fecha = a.createdAt?.toDate ? a.createdAt.toDate() : null;
    tb.appendChild(el('tr', {},
      el('td', { class:'cell-mute', style:{fontSize:'12px'} }, fecha ? fecha.toLocaleString() : '—'),
      el('td', {}, u ? (u.displayName || u.email || u.id?.slice(0,8)) : el('span', { class:'cell-mute' }, '—')),
      el('td', { class:'cell-mute' }, a.email || '—'),
      el('td', {}, a.deviceLabel || '—'),
      el('td', {}, el('span', { class:`badge ${a.success ? 'badge-green' : 'badge-red'}` }, a.success ? 'OK' : 'Fallo')),
      el('td', { class:'cell-mute', style:{fontFamily:'monospace', fontSize:'11px'} }, a.deviceFingerprint || '—')
    ));
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  _container.appendChild(wrap);
}
