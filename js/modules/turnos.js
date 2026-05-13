// ═══════════════════════════════════════════════════════════════
// turnos.js — Gestión de turnos y fichaje
//
// Schema Turno (Firestore: collection 'turnos'):
//   usuario_email, usuario_nombre, evento_id, puerta,
//   fecha (YYYY-MM-DD), hora_inicio (HH:MM), hora_fin,
//   hora_fichaje_entrada, hora_fichaje_salida,
//   estado: 'programado' | 'activo' | 'completado' | 'ausente',
//   notas
// ═══════════════════════════════════════════════════════════════
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, fmtTime } from '../utils.js';
import { listLive, list, create, update, remove, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, badge } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';

let _container = null;
let _items = [];
let _eventos = [];
let _users = [];
let _filterFecha = new Date().toISOString().slice(0,10);
const KEY_PREFIX = 'mod:turnos:';

const ESTADO_LABEL = {
  programado: 'Programado',
  activo:     'Activo',
  completado: 'Completado',
  ausente:    'Ausente'
};
const ESTADO_COLOR = {
  programado: 'blue',
  activo:     'green',
  completado: 'gray',
  ausente:    'red'
};

export async function init(container){
  _container = container;
  _eventos = await list('eventos', { orderBy:'createdAt', order:'desc' });
  _users   = await list('users',   { orderBy:'displayName' });
  render();
  listLive('turnos', { key: KEY_PREFIX+'all', orderBy:'fecha', order:'desc', limit:300 }, (items) => {
    _items = items;
    render();
  });
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  _container = null;
}

function render(){
  if(!_container) return;
  clear(_container);
  const p = getCurrentProfile();
  const today = new Date().toISOString().slice(0,10);

  // Header
  const actions = [];
  if(canCreate(p, 'turnos')){
    actions.push(el('button', { class:'btn btn-primary', onclick: () => openForm(null) },
      el('span', { html: icon('plus') }), 'Programar turno'));
  }
  _container.appendChild(pageHeader({
    title:'⏰ Turnos y Fichaje',
    sub:'Control de turnos y presencia del personal operativo',
    actions
  }));

  // Stats
  const turnosHoy = _items.filter(t => t.fecha === today);
  const activosAhora = _items.filter(t => t.fecha === today && t.estado === 'activo').length;
  const programadosHoy = turnosHoy.filter(t => t.estado === 'programado').length;
  const completadosHoy = turnosHoy.filter(t => t.estado === 'completado').length;

  const stats = el('div', { class:'turnos-stats' });
  stats.appendChild(statBox('Activos ahora', activosAhora, 'green', 'check'));
  stats.appendChild(statBox('Programados hoy', programadosHoy, 'blue', 'calendar'));
  stats.appendChild(statBox('Completados hoy', completadosHoy, 'gray', 'history'));
  stats.appendChild(statBox('Total turnos', _items.length, 'amber', 'list'));
  _container.appendChild(stats);

  // Filtro fecha
  const filterRow = el('div', { class:'turnos-filter-row' });
  filterRow.appendChild(el('label', { class:'edit-label' }, 'Fecha:'));
  filterRow.appendChild(el('input', {
    type:'date', value: _filterFecha,
    class:'field-input', style:{ width:'180px' },
    onchange: e => { _filterFecha = e.target.value; render(); }
  }));
  filterRow.appendChild(el('button', { class:'btn btn-ghost btn-sm',
    onclick: () => { _filterFecha = today; render(); }
  }, 'Hoy'));
  _container.appendChild(filterRow);

  // Lista de turnos filtrados
  const filtered = _items.filter(t => !_filterFecha || t.fecha === _filterFecha);
  if(filtered.length === 0){
    _container.appendChild(emptyState({
      iconName:'calendar',
      title:'Sin turnos',
      message: `No hay turnos programados para ${_filterFecha}`,
      columns:['Operario','Horario','Puerta','Fichaje entrada','Fichaje salida','Estado','Acciones']
    }));
    return;
  }

  const wrap = el('div', { class:'turnos-list' });
  for(const t of filtered){
    wrap.appendChild(renderTurnoCard(t, p));
  }
  _container.appendChild(wrap);
}

function statBox(label, value, color, ico){
  return el('div', { class:`turno-stat stat-${color}` },
    el('div', { class:'turno-stat-ico', html: icon(ico) }),
    el('div', {},
      el('div', { class:'turno-stat-value' }, String(value)),
      el('div', { class:'turno-stat-label' }, label)
    )
  );
}

function renderTurnoCard(t, p){
  const initials = (t.usuario_nombre || t.usuario_email || '?')[0].toUpperCase();
  const card = el('div', { class:`turno-card turno-state-${t.estado}` });

  card.appendChild(el('div', { class:'turno-avatar' }, initials));

  const info = el('div', { class:'turno-info' });
  info.appendChild(el('div', { class:'turno-name' }, t.usuario_nombre || t.usuario_email || '—'));
  const meta = el('div', { class:'turno-meta' });
  meta.appendChild(el('span', {}, `🕐 ${t.hora_inicio || '--'} – ${t.hora_fin || '--'}`));
  if(t.puerta) meta.appendChild(el('span', {}, `📍 ${t.puerta}`));
  if(t.hora_fichaje_entrada) meta.appendChild(el('span', { style:{color:'#15803D'} }, `↗ Entró ${t.hora_fichaje_entrada}`));
  if(t.hora_fichaje_salida)  meta.appendChild(el('span', { style:{color:'#DC2626'} }, `↙ Salió ${t.hora_fichaje_salida}`));
  info.appendChild(meta);
  card.appendChild(info);

  card.appendChild(badge(ESTADO_LABEL[t.estado] || t.estado, ESTADO_COLOR[t.estado] || 'gray'));

  const acts = el('div', { class:'turno-acts' });
  if(canEdit(p, 'turnos')){
    if(t.estado === 'programado'){
      acts.appendChild(el('button', {
        class:'btn btn-success btn-sm',
        onclick: () => ficharEntrada(t)
      }, '↗ Entrada'));
    } else if(t.estado === 'activo'){
      acts.appendChild(el('button', {
        class:'btn btn-danger btn-sm',
        onclick: () => ficharSalida(t)
      }, '↙ Salida'));
    }
    acts.appendChild(el('button', {
      class:'btn btn-ghost btn-icon', title:'Editar',
      onclick: () => openForm(t)
    }, el('span', { html: icon('edit') })));
  }
  if(canDelete(p, 'turnos')){
    acts.appendChild(el('button', {
      class:'btn btn-ghost btn-icon', title:'Eliminar',
      onclick: () => deleteItem(t)
    }, el('span', { html: icon('trash') })));
  }
  card.appendChild(acts);

  return card;
}

async function ficharEntrada(t){
  const ahora = new Date().toTimeString().slice(0,5);
  try{
    await update('turnos', t.id, {
      hora_fichaje_entrada: ahora,
      estado: 'activo'
    });
    toast(`✓ Entrada fichada: ${ahora}`, 'ok');
  } catch(e){
    toast('Error al fichar entrada', 'err');
  }
}

async function ficharSalida(t){
  const ahora = new Date().toTimeString().slice(0,5);
  try{
    await update('turnos', t.id, {
      hora_fichaje_salida: ahora,
      estado: 'completado'
    });
    toast(`✓ Salida fichada: ${ahora}`, 'ok');
  } catch(e){
    toast('Error al fichar salida', 'err');
  }
}

function openForm(item){
  const isEdit = !!item;
  const data = item || {
    usuario_email:'', usuario_nombre:'',
    evento_id:'', puerta:'',
    fecha: _filterFecha,
    hora_inicio:'08:00', hora_fin:'16:00',
    estado:'programado', notas:''
  };

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    if(!fd.usuario_nombre || !fd.fecha){
      toast('Nombre y fecha son obligatorios', 'err');
      return;
    }
    const payload = {
      usuario_email: fd.usuario_email || '',
      usuario_nombre: fd.usuario_nombre,
      evento_id: fd.evento_id || '',
      puerta: fd.puerta || '',
      fecha: fd.fecha,
      hora_inicio: fd.hora_inicio || '',
      hora_fin: fd.hora_fin || '',
      hora_fichaje_entrada: data.hora_fichaje_entrada || '',
      hora_fichaje_salida:  data.hora_fichaje_salida || '',
      estado: fd.estado || 'programado',
      notas: fd.notas || ''
    };
    try{
      if(isEdit) await update('turnos', item.id, payload);
      else       await create('turnos', payload);
      toast('Turno guardado', 'ok');
      closeModal();
    } catch(e){ toast(e.message, 'err'); }
  }});

  const userOpts = [{ value:'', label:'— Manual —' }, ..._users.map(u => ({
    value: u.email || u.id,
    label: `${u.displayName || u.email}`
  }))];
  const evOpts = [{ value:'', label:'Sin evento' }, ..._eventos.map(e => ({ value:e.id, label:e.nombre }))];

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Nombre operario', name:'usuario_nombre', value:data.usuario_nombre, required:true, full:true }));
  grid.appendChild(formField({ label:'Email', name:'usuario_email', type:'email', value:data.usuario_email, full:true }));
  grid.appendChild(formField({ label:'Evento', name:'evento_id', value:data.evento_id, options:evOpts, full:true }));
  grid.appendChild(formField({ label:'Puerta / Zona', name:'puerta', value:data.puerta }));
  grid.appendChild(formField({ label:'Fecha', name:'fecha', type:'date', value:data.fecha, required:true }));
  grid.appendChild(formField({ label:'Hora inicio', name:'hora_inicio', type:'time', value:data.hora_inicio }));
  grid.appendChild(formField({ label:'Hora fin', name:'hora_fin', type:'time', value:data.hora_fin }));
  if(isEdit){
    grid.appendChild(formField({ label:'Estado', name:'estado', value:data.estado, options:[
      { value:'programado', label:'Programado' },
      { value:'activo',     label:'Activo' },
      { value:'completado', label:'Completado' },
      { value:'ausente',    label:'Ausente' }
    ]}));
  }
  grid.appendChild(formField({ label:'Notas', name:'notas', type:'textarea', value:data.notas, full:true }));
  form.appendChild(grid);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary', onclick: () => form.requestSubmit() }, 'Guardar')
  );

  openModal({ title: isEdit ? 'Editar turno' : 'Programar turno', body: form, size:'md' });
  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title:'Eliminar turno',
    message:`¿Eliminar turno de "${item.usuario_nombre || item.usuario_email}" del ${item.fecha}?`,
    danger:true, okText:'Eliminar'
  });
  if(!ok) return;
  try{
    await remove('turnos', item.id);
    toast('Eliminado', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}
