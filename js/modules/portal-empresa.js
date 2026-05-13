// ═══════════════════════════════════════════════════════════════
// portal-empresa.js — Portal B2B
//
// Vista separada para usuarios con role='empresa'.
// Filtro automático: solo SUS referencias, vehículos, ingresos.
//
// MATCH como monolito:
//   - cada user tiene role='empresa' y empresaId
//   - _getMyEmpresa busca por: e.id === user.empresaId OR e.email === user.email
//
// La empresa puede:
//   - Ver sus referencias (estado en parking / dentro feria / salida)
//   - Ver su flota
//   - Ver estado en tiempo real de cada vehículo
//   - (futuro) Recibir notificación "papeles listos"
// ═══════════════════════════════════════════════════════════════

import { el, clear, icon, toast, fmtTime } from '../utils.js';
import { list, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, statusBadge } from './shared.js';
import { getCurrentProfile } from '../auth.js';
import { logger } from '../logger.js';

let _container = null;
let _empresa = null;
let _refs = [];
let _ingresos = [];
let _flota = [];
let _activeTab = 'estado';

const KEY_PREFIX = 'mod:portal-empresa:';

export async function init(container){
  _container = container;
  const profile = getCurrentProfile();
  if(!profile){ return; }

  // Match como monolito: e.id === user.empresaId OR e.email === user.email
  await loadEmpresa(profile);

  if(!_empresa){
    clear(container);
    container.appendChild(pageHeader({ title:'🏢 Portal Empresa', sub:'No se ha podido vincular tu cuenta a ninguna empresa' }));
    container.appendChild(emptyState({
      iconName:'empresas', title:'Sin empresa vinculada',
      message:'Tu cuenta no está asociada a ninguna empresa. Contacta con el administrador para vincularla.'
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

async function loadEmpresa(profile){
  try{
    const empresas = await list('empresas');
    _empresa = empresas.find(e =>
      e.id === profile.empresaId ||
      (e.email && profile.email && e.email.toLowerCase() === profile.email.toLowerCase())
    );
  } catch(e){
    logger.error('Portal: error cargando empresa', { error: e.message });
    _empresa = null;
  }
}

async function loadData(){
  if(!_empresa) return;
  try{
    [_refs, _ingresos, _flota] = await Promise.all([
      list('referencias', { where:{ empresaId: _empresa.id } }),
      list('ingresos',    { where:{ empresaId: _empresa.id } }),
      list('flota',       { where:{ empresaId: _empresa.id } })
    ]);
    // Fallback por nombre de empresa si empresaId no estaba poblado en docs antiguos
    if(_refs.length === 0 && _empresa.nombre){
      const allRefs = await list('referencias');
      _refs = allRefs.filter(r => r.empresa === _empresa.nombre);
    }
    if(_ingresos.length === 0 && _empresa.nombre){
      const allIng = await list('ingresos');
      _ingresos = allIng.filter(i => i.empresa === _empresa.nombre);
    }
    if(_flota.length === 0 && _empresa.nombre){
      const allFlota = await list('flota');
      _flota = allFlota.filter(v => v.empresa === _empresa.nombre);
    }
  } catch(e){
    logger.error('Portal: error cargando datos', { error: e.message });
    _refs = []; _ingresos = []; _flota = [];
  }
}

function render(){
  if(!_container) return;
  clear(_container);

  _container.appendChild(pageHeader({
    title:`🏢 ${_empresa.nombre}`,
    sub:`Portal de empresa · ${_empresa.cif || ''}${_empresa.nivel ? ' · ' + _empresa.nivel : ''}`
  }));

  // Stats
  const inside     = _ingresos.filter(i => i.estado === 'dentro' || i.estado === 'dentro_fira').length;
  const outRecent  = _ingresos.filter(i => i.estado === 'salida').length;
  const pending    = _refs.filter(r => r.estado === 'prerregistrado' || r.estado === 'rampa_parking').length;
  const totalRefs  = _refs.length;

  const stats = el('div', { class:'portal-stats' });
  stats.appendChild(statBox('Vehículos dentro', inside, 'green'));
  stats.appendChild(statBox('Han salido hoy',   outRecent, 'gray'));
  stats.appendChild(statBox('Pendientes',       pending, 'amber'));
  stats.appendChild(statBox('Refs. totales',    totalRefs, 'blue'));
  _container.appendChild(stats);

  // Tabs
  const tabs = el('div', { class:'role-tabs', style:{margin:'16px 0'} });
  for(const t of [
    ['estado',     `📍 Estado actual (${_refs.length + _ingresos.length})`],
    ['refs',       `📋 Mis referencias (${_refs.length})`],
    ['flota',      `🚛 Mi flota (${_flota.length})`],
    ['empresa',    `🏢 Datos empresa`]
  ]){
    tabs.appendChild(el('button', {
      class:`role-tab ${_activeTab === t[0] ? 'active' : ''}`,
      onclick: () => { _activeTab = t[0]; render(); }
    }, t[1]));
  }
  _container.appendChild(tabs);

  if(_activeTab === 'estado')      renderEstado();
  else if(_activeTab === 'refs')   renderRefs();
  else if(_activeTab === 'flota')  renderFlota();
  else                              renderEmpresa();
}

function statBox(label, value, color){
  return el('div', { class:`portal-stat-box stat-${color}` },
    el('div', { class:'pstat-value' }, String(value)),
    el('div', { class:'pstat-label' }, label)
  );
}

function renderEstado(){
  // Combinar refs + ingresos por matrícula y mostrar última actividad
  const byPlate = {};
  for(const r of _refs){
    if(!r.matricula) continue;
    if(!byPlate[r.matricula]) byPlate[r.matricula] = { plate: r.matricula, source:'ref', latest: r };
  }
  for(const i of _ingresos){
    if(!i.matricula) continue;
    const prev = byPlate[i.matricula];
    if(!prev || (i.horaEntrada && (!prev.latest.horaEntrada || i.horaEntrada > prev.latest.horaEntrada))){
      byPlate[i.matricula] = { plate: i.matricula, source:'ing', latest: i };
    }
  }
  const list = Object.values(byPlate);
  if(list.length === 0){
    _container.appendChild(emptyState({ iconName:'inbox', title:'Sin movimientos',
      message:'Cuando alguno de tus vehículos pase por el control aparecerá aquí.' }));
    return;
  }
  const wrap = el('div', { class:'portal-estado-grid' });
  for(const it of list){
    const r = it.latest;
    const estadoBadge = statusBadge(r.estado || 'prerregistrado');
    wrap.appendChild(el('div', { class:'portal-veh-card' },
      el('div', { class:'pveh-plate' }, it.plate),
      el('div', { class:'pveh-driver' }, r.conductor || '—'),
      el('div', { class:'pveh-meta' },
        el('span', {}, r.hall || '—'),
        el('span', { class:'cell-mute' }, '•'),
        el('span', { class:'cell-mute' }, r.horaEntrada || r.fechaKey || '—')
      ),
      el('div', { class:'pveh-state' }, estadoBadge)
    ));
  }
  _container.appendChild(wrap);
}

function renderRefs(){
  if(_refs.length === 0){
    _container.appendChild(emptyState({ iconName:'referencias', title:'Sin referencias',
      message:'Aún no tienes referencias asociadas a tu empresa.' }));
    return;
  }
  const wrap = el('div', { class:'table-wrap' });
  const tbl = el('table', { class:'table' });
  tbl.appendChild(el('thead', {}, el('tr', {},
    el('th',{},'Referencia'),
    el('th',{},'Matrícula'),
    el('th',{},'Conductor'),
    el('th',{},'Hall'),
    el('th',{},'Estado'),
    el('th',{},'Entrada'),
    el('th',{},'Salida')
  )));
  const tb = el('tbody');
  for(const r of _refs){
    tb.appendChild(el('tr', {},
      el('td', { class:'cell-mute' }, r.referencia || '—'),
      el('td', { class:'cell-plate' }, r.matricula || '—'),
      el('td', {}, r.conductor || '—'),
      el('td', {}, r.hall || '—'),
      el('td', {}, statusBadge(r.estado || 'prerregistrado')),
      el('td', { class:'cell-mute' }, r.horaEntrada || '—'),
      el('td', { class:'cell-mute' }, r.horaSalida || '—')
    ));
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  _container.appendChild(wrap);
}

function renderFlota(){
  if(_flota.length === 0){
    _container.appendChild(emptyState({ iconName:'flota', title:'Sin flota',
      message:'Tu empresa no tiene vehículos registrados.' }));
    return;
  }
  const wrap = el('div', { class:'table-wrap' });
  const tbl = el('table', { class:'table' });
  tbl.appendChild(el('thead', {}, el('tr', {},
    el('th',{},'Matrícula'),
    el('th',{},'Tipo'),
    el('th',{},'Marca/Modelo'),
    el('th',{},'Estado')
  )));
  const tb = el('tbody');
  for(const v of _flota){
    tb.appendChild(el('tr', {},
      el('td', { class:'cell-plate' }, v.matricula || '—'),
      el('td', { class:'cell-mute' }, v.tipo || '—'),
      el('td', {}, [v.marca, v.modelo].filter(Boolean).join(' ') || '—'),
      el('td', {}, statusBadge(v.estado || 'almacen'))
    ));
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  _container.appendChild(wrap);
}

function renderEmpresa(){
  const wrap = el('div', { class:'portal-empresa-info' });
  const row = (label, value) => wrap.appendChild(el('div', { class:'pemp-row' },
    el('div', { class:'pemp-label' }, label),
    el('div', { class:'pemp-value' }, value || '—')
  ));
  row('Nombre comercial', _empresa.nombre);
  row('CIF / VAT', _empresa.cif);
  row('Email', _empresa.email);
  row('Teléfono', _empresa.telefono);
  row('Dirección', _empresa.direccion);
  row('Ciudad', _empresa.ciudad);
  row('Contacto', _empresa.contacto);
  row('Nivel', _empresa.nivel || 'estándar');
  row('RGPD aceptado', _empresa.rgpdAceptado ? `✓ ${_empresa.rgpdFecha || ''}` : '✗ Pendiente');
  _container.appendChild(wrap);
}
