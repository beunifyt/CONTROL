// agenda.js — citas planificadas con hora plan vs hora real
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, fmtDate, matchesSearch } from '../utils.js';
import { listLive, list, create, update, remove, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, searchInput, selectInput, statusBadge, excelButtons } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';

let _container = null;
let _items = [];
let _eventos = [];
let _filterEvento = '';
let _filterEstado = '';
let _search = '';
const KEY_PREFIX = 'mod:agenda:';

export async function init(container){
  _container = container;
  _eventos = await list('eventos', { orderBy:'createdAt', order:'desc' });
  render();
  listLive('agenda', { key: KEY_PREFIX+'all', orderBy:'fechaPlanificada', order:'asc' }, (items) => {
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

  const actions = [];
  if(canCreate(p)){
    actions.push(el('button', {
      class:'btn btn-primary',
      onclick: () => openForm(null)
    }, el('span', { html: icon('plus') }), 'Nueva cita'));
  }
  actions.push(...excelButtons('agenda', {
    eventoId: _filterEvento || null,
    canImport: canCreate(p),
    canExport: true
  }));

  _container.appendChild(pageHeader({
    title:'Agenda',
    sub:'Citas planificadas. Compara hora prevista vs hora real.',
    actions
  }));

  const filterRow = el('div', { class:'filter-row' });
  filterRow.appendChild(searchInput({ placeholder:'Buscar conductor, matrícula, empresa…', onInput: v => { _search = v; renderTable(); } }));
  filterRow.appendChild(selectInput({
    value: _filterEvento,
    options: [{ value:'', label:'Todos los eventos' }, ..._eventos.map(e => ({ value:e.id, label:e.nombre }))],
    onChange: v => { _filterEvento = v; renderTable(); }
  }));
  filterRow.appendChild(selectInput({
    value: _filterEstado,
    options: [
      { value:'', label:'Todos los estados' },
      { value:'planificado', label:'Planificado' },
      { value:'llegado', label:'Llegado' },
      { value:'finalizado', label:'Finalizado' },
      { value:'cancelado', label:'Cancelado' }
    ],
    onChange: v => { _filterEstado = v; renderTable(); }
  }));
  _container.appendChild(filterRow);

  const tableContainer = el('div', { id:'agenda-table' });
  _container.appendChild(tableContainer);
  renderTable();
}

function renderTable(){
  const t = document.getElementById('agenda-table');
  if(!t) return;
  clear(t);
  const p = getCurrentProfile();

  let filtered = _items;
  if(_filterEvento) filtered = filtered.filter(a => a.eventoId === _filterEvento);
  if(_filterEstado) filtered = filtered.filter(a => a.estado === _filterEstado);
  if(_search) filtered = filtered.filter(a => matchesSearch(_search, a.conductor, a.matricula, a.empresa));

  if(filtered.length === 0){
    t.appendChild(emptyState({
      iconName:'agenda',
      title: _items.length === 0 ? 'Sin citas' : 'Sin resultados',
      message: _items.length === 0 ? 'Planifica tu primera cita.' : 'Cambia los filtros.'
    }));
    return;
  }

  const wrap = el('div', { class:'table-wrap' });
  const tbl = el('table', { class:'table' });
  tbl.appendChild(el('thead', {}, el('tr', {},
    el('th',{},'Fecha'), el('th',{},'Hora plan'), el('th',{},'Hora real'),
    el('th',{},'Matrícula'), el('th',{},'Conductor'), el('th',{},'Empresa'),
    el('th',{},'Hall'), el('th',{},'Estado'), el('th',{},'Acciones')
  )));
  const tb = el('tbody');
  for(const a of filtered){
    const fecha = a.fechaPlanificada ? (a.fechaPlanificada.toDate ? a.fechaPlanificada.toDate() : new Date(a.fechaPlanificada)) : null;
    let desfase = '';
    if(a.horaPlanificada && a.horaReal){
      const [hp,mp] = a.horaPlanificada.split(':').map(Number);
      const [hr,mr] = a.horaReal.split(':').map(Number);
      const diff = (hr*60+mr) - (hp*60+mp);
      if(Math.abs(diff) >= 5){
        desfase = el('span', { class:`badge badge-${diff > 0 ? 'amber' : 'green'}`, style:{marginLeft:'6px'} },
          (diff > 0 ? '+' : '') + diff + 'min');
      }
    }
    const horaRealCell = el('td', {});
    if(a.horaReal) horaRealCell.appendChild(el('span', {}, a.horaReal));
    if(desfase) horaRealCell.appendChild(desfase);
    if(!a.horaReal && !desfase) horaRealCell.appendChild(el('span', { class:'cell-mute' }, '—'));

    tb.appendChild(el('tr', {},
      el('td', { class:'cell-mute' }, fecha ? fmtDate(fecha) : '—'),
      el('td', { class:'cell-strong' }, a.horaPlanificada || '—'),
      horaRealCell,
      el('td', { class:'cell-plate' }, a.matricula || '—'),
      el('td', {}, a.conductor || '—'),
      el('td', { class:'cell-mute' }, a.empresa || '—'),
      el('td', {}, a.hall || '—'),
      el('td', {}, statusBadge(a.estado || 'planificado')),
      rowActions(a, p)
    ));
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  t.appendChild(wrap);
}

function rowActions(a, p){
  const td = el('td', {}, el('div', { class:'row-actions' }));
  const wrap = td.firstChild;

  if(canEdit(p) && a.estado === 'planificado'){
    wrap.appendChild(el('button', {
      class:'btn btn-secondary btn-icon', title:'Marcar llegado',
      onclick: () => marcarLlegado(a)
    }, el('span', { html: icon('check') })));
  }
  if(canEdit(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => openForm(a), title:'Editar' },
      el('span', { html: icon('edit') })));
  }
  if(canDelete(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => deleteItem(a), title:'Eliminar' },
      el('span', { html: icon('trash') })));
  }
  return td;
}

async function marcarLlegado(a){
  const horaReal = new Date().toTimeString().slice(0,5);
  try{
    await update('agenda', a.id, { estado:'llegado', horaReal });
    toast('Marcado como llegado', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}

function openForm(item){
  const isEdit = !!item;
  const data = item || {
    matricula:'', conductor:'', empresa:'',
    eventoId:'', hall:'', stand:'',
    fechaPlanificada:'', horaPlanificada:'', horaReal:'',
    estado:'planificado', notas:''
  };

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    const payload = {
      matricula: fd.matricula ? String(fd.matricula).toUpperCase() : '',
      conductor: fd.conductor || '',
      empresa: fd.empresa || '',
      eventoId: fd.eventoId || null,
      hall: fd.hall || '',
      stand: fd.stand || '',
      fechaPlanificada: fd.fechaPlanificada ? new Date(fd.fechaPlanificada) : null,
      horaPlanificada: fd.horaPlanificada || '',
      horaReal: fd.horaReal || '',
      estado: fd.estado || 'planificado',
      notas: fd.notas || ''
    };
    try{
      if(isEdit) await update('agenda', item.id, payload);
      else await create('agenda', payload);
      toast('Guardado', 'ok');
      closeModal();
    } catch(e){ toast(e.message, 'err'); }
  }});

  const fechaStr = data.fechaPlanificada ? (data.fechaPlanificada.toDate ? data.fechaPlanificada.toDate() : new Date(data.fechaPlanificada)).toISOString().slice(0,10) : '';
  const eventoOpts = [{ value:'', label:'Seleccionar evento' }, ..._eventos.map(e => ({ value:e.id, label:e.nombre }))];

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Matrícula', name:'matricula', value:data.matricula }));
  grid.appendChild(formField({ label:'Conductor', name:'conductor', value:data.conductor }));
  grid.appendChild(formField({ label:'Empresa', name:'empresa', value:data.empresa, full:true }));
  grid.appendChild(formField({ label:'Evento', name:'eventoId', value:data.eventoId, options:eventoOpts, full:true }));
  grid.appendChild(formField({ label:'Hall', name:'hall', value:data.hall }));
  grid.appendChild(formField({ label:'Stand', name:'stand', value:data.stand }));
  grid.appendChild(formField({ label:'Fecha planificada', name:'fechaPlanificada', type:'date', value:fechaStr }));
  grid.appendChild(formField({ label:'Hora planificada', name:'horaPlanificada', type:'time', value:data.horaPlanificada }));
  grid.appendChild(formField({ label:'Hora real (al llegar)', name:'horaReal', type:'time', value:data.horaReal }));
  grid.appendChild(formField({ label:'Estado', name:'estado', value:data.estado, options:[
    { value:'planificado', label:'Planificado' },
    { value:'llegado', label:'Llegado' },
    { value:'finalizado', label:'Finalizado' },
    { value:'cancelado', label:'Cancelado' }
  ]}));
  grid.appendChild(formField({ label:'Notas', name:'notas', type:'textarea', value:data.notas, full:true }));
  form.appendChild(grid);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary', onclick: () => form.requestSubmit() }, 'Guardar')
  );

  openModal({
    title: isEdit ? 'Editar cita' : 'Nueva cita',
    body: form, size:'lg'
  });
  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title:'Eliminar cita', message:`¿Eliminar esta cita?`,
    danger:true, okText:'Eliminar'
  });
  if(!ok) return;
  try{
    await remove('agenda', item.id);
    toast('Eliminado', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}
