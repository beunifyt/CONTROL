// ingresos.js — Ingresos libres (tipo 2) con campo Posición separado
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, matchesSearch, fmtTime, todayKey } from '../utils.js';
import { listLive, list, update, remove, createIngreso, isPosicionTaken, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, searchInput, selectInput, statusBadge } from './_shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';

let _container = null;
let _items = [];
let _eventos = [];
let _filterEvento = '';
let _search = '';
let _filterToday = true;
const KEY_PREFIX = 'mod:ingresos:';

export async function init(container){
  _container = container;
  _eventos = await list('eventos', { orderBy:'createdAt', order:'desc' });
  render();
  listLive('ingresos', { key: KEY_PREFIX+'all', orderBy:'createdAt', order:'desc', limit: 500 }, (items) => {
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
    }, el('span', { html: icon('plus') }), 'Nuevo Ingreso'));
  }

  _container.appendChild(pageHeader({
    title:'Ingresos',
    sub:'Entradas libres sin reserva previa (Ingresos tipo 2). Posición se reinicia cada día.',
    actions
  }));

  const filterRow = el('div', { class:'filter-row' });
  filterRow.appendChild(searchInput({ placeholder:'Buscar matrícula, conductor, empresa…', onInput: v => { _search = v; renderTable(); } }));
  filterRow.appendChild(selectInput({
    value: _filterEvento,
    options: [{ value:'', label:'Todos los eventos' }, ..._eventos.map(e => ({ value:e.id, label:e.nombre }))],
    onChange: v => { _filterEvento = v; renderTable(); }
  }));
  filterRow.appendChild(selectInput({
    value: _filterToday ? 'today' : 'all',
    options: [{ value:'today', label:'Solo hoy' }, { value:'all', label:'Todos los días' }],
    onChange: v => { _filterToday = (v === 'today'); renderTable(); }
  }));
  _container.appendChild(filterRow);

  const tableContainer = el('div', { id:'ingresos-table' });
  _container.appendChild(tableContainer);
  renderTable();
}

function renderTable(){
  const t = document.getElementById('ingresos-table');
  if(!t) return;
  clear(t);
  const p = getCurrentProfile();

  let filtered = _items;
  if(_filterToday) filtered = filtered.filter(i => i.fechaKey === todayKey());
  if(_filterEvento) filtered = filtered.filter(i => i.eventoId === _filterEvento);
  if(_search) filtered = filtered.filter(i => matchesSearch(_search, i.matricula, i.conductor, i.empresa));

  if(filtered.length === 0){
    t.appendChild(emptyState({
      iconName:'ingresos',
      title: _items.length === 0 ? 'Sin ingresos' : 'Sin resultados',
      message: _items.length === 0 ? 'Registra el primer ingreso libre.' : 'Cambia los filtros o el término de búsqueda.'
    }));
    return;
  }

  const wrap = el('div', { class:'table-wrap' });
  const tbl = el('table', { class:'table' });
  const thead = el('thead', {}, el('tr', {},
    el('th',{},'Pos.'),
    el('th',{},'Día'),
    el('th',{},'Matrícula'),
    el('th',{},'Conductor'),
    el('th',{},'Empresa'),
    el('th',{},'Hall'),
    el('th',{},'Estado'),
    el('th',{},'Entrada'),
    el('th',{},'Salida'),
    el('th',{},'Acciones')
  ));
  tbl.appendChild(thead);
  const tb = el('tbody');
  for(const i of filtered){
    const ev = _eventos.find(e => e.id === i.eventoId);
    const tr = el('tr', {},
      el('td', {}, el('span', { class:`cell-pos ${i.posicionManual ? 'manual' : ''}`, title: i.posicionManual ? 'Posición manual' : 'Posición automática' }, String(i.posicion || '—'))),
      el('td', { class:'cell-mute' }, i.fechaKey || '—'),
      el('td', { class:'cell-plate' }, i.matricula || '—'),
      el('td', {}, i.conductor || '—'),
      el('td', { class:'cell-mute' }, i.empresa || '—'),
      el('td', {}, i.hall || '—'),
      el('td', {}, statusBadge(i.estado || 'dentro')),
      el('td', { class:'cell-mute' }, i.horaEntrada || '—'),
      el('td', { class:'cell-mute' }, i.horaSalida || '—'),
      rowActions(i, p)
    );
    tb.appendChild(tr);
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  t.appendChild(wrap);
}

function rowActions(i, p){
  const td = el('td', {}, el('div', { class:'row-actions' }));
  const wrap = td.firstChild;

  if(canEdit(p)){
    if(i.estado === 'salida'){
      // ya salió
    } else {
      wrap.appendChild(el('button', {
        class:'btn btn-secondary btn-icon',
        title:'Registrar salida',
        onclick: () => registrarSalida(i)
      }, el('span', { html: icon('exit') })));
    }
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => openForm(i), title:'Editar' },
      el('span', { html: icon('edit') })));
  }
  if(canDelete(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => deleteItem(i), title:'Eliminar' },
      el('span', { html: icon('trash') })));
  }
  return td;
}

async function registrarSalida(i){
  const horaSalida = new Date().toTimeString().slice(0,5);
  try{
    await update('ingresos', i.id, { estado:'salida', horaSalida });
    toast('Salida registrada', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}

function openForm(item){
  const isEdit = !!item;
  const data = item || {
    matricula:'', conductor:'', telefono:'', empresa:'',
    hall:'', stand:'', remolque:'', tipoVehiculo:'camion',
    eventoId:'', posicion:'', estado:'dentro',
    horaEntrada: new Date().toTimeString().slice(0,5),
    notas:''
  };

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    if(!fd.matricula){ toast('La matrícula es obligatoria', 'err'); return; }
    if(!fd.eventoId){ toast('Selecciona un evento', 'err'); return; }

    const payload = {
      matricula: String(fd.matricula).toUpperCase().trim(),
      conductor: fd.conductor || '',
      telefono: fd.telefono || '',
      empresa: fd.empresa || '',
      hall: fd.hall || '',
      stand: fd.stand || '',
      remolque: fd.remolque || '',
      tipoVehiculo: fd.tipoVehiculo || 'camion',
      eventoId: fd.eventoId,
      estado: fd.estado || 'dentro',
      horaEntrada: fd.horaEntrada || '',
      horaSalida: fd.horaSalida || '',
      notas: fd.notas || ''
    };
    if(fd.posicion) payload.posicion = Number(fd.posicion);

    try{
      if(isEdit){
        // P-03.1: si la posición cambió, validar colisión (scoped al día)
        if(payload.posicion && Number(item.posicion) !== Number(payload.posicion)){
          const taken = await isPosicionTaken('ingresos', payload.eventoId, payload.posicion, { day: item.fechaKey });
          if(taken){
            toast(`La posición ${payload.posicion} ya está ocupada hoy`, 'err');
            return;
          }
          payload.posicionManual = true;
        }
        await update('ingresos', item.id, payload);
      } else {
        await createIngreso(payload);
      }
      toast(isEdit ? 'Actualizado' : 'Ingreso creado', 'ok');
      closeModal();
    } catch(e){
      toast(e.message || 'Error al guardar', 'err');
    }
  }});

  const eventoOpts = [{ value:'', label:'Seleccionar evento' }, ..._eventos.map(e => ({ value:e.id, label:e.nombre }))];

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Matrícula', name:'matricula', value:data.matricula, required:true, placeholder:'Ej: 1234ABC' }));
  grid.appendChild(formField({ label:'Remolque', name:'remolque', value:data.remolque, placeholder:'(opcional)' }));
  grid.appendChild(formField({ label:'Conductor', name:'conductor', value:data.conductor }));
  grid.appendChild(formField({ label:'Teléfono', name:'telefono', value:data.telefono }));
  grid.appendChild(formField({ label:'Empresa', name:'empresa', value:data.empresa, full:true }));
  grid.appendChild(formField({ label:'Evento', name:'eventoId', value:data.eventoId, options:eventoOpts, required:true, full:true }));
  grid.appendChild(formField({
    label: isEdit ? 'Posición' : 'Posición (vacío = automática)',
    name:'posicion', type:'number', value:data.posicion || '',
    hint: isEdit ? 'Editar manualmente la posición' : 'Si dejas vacío, el sistema asigna la siguiente disponible (reinicia cada día)'
  }));
  grid.appendChild(formField({ label:'Hall', name:'hall', value:data.hall }));
  grid.appendChild(formField({ label:'Stand', name:'stand', value:data.stand }));
  grid.appendChild(formField({ label:'Tipo vehículo', name:'tipoVehiculo', value:data.tipoVehiculo, options:[
    { value:'camion', label:'Camión' },
    { value:'trailer', label:'Trailer' },
    { value:'furgoneta', label:'Furgoneta' },
    { value:'otro', label:'Otro' }
  ]}));
  grid.appendChild(formField({ label:'Estado', name:'estado', value:data.estado, options:[
    { value:'dentro', label:'Dentro' },
    { value:'salida', label:'Salida' }
  ]}));
  grid.appendChild(formField({ label:'Hora entrada', name:'horaEntrada', type:'time', value:data.horaEntrada }));
  grid.appendChild(formField({ label:'Hora salida', name:'horaSalida', type:'time', value:data.horaSalida }));
  grid.appendChild(formField({ label:'Notas', name:'notas', type:'textarea', value:data.notas, full:true }));
  form.appendChild(grid);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary' }, 'Guardar')
  );

  openModal({
    title: isEdit ? 'Editar ingreso' : 'Nuevo ingreso libre',
    body: form,
    size:'lg'
  });

  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title: 'Eliminar ingreso',
    message: `¿Eliminar el ingreso de matrícula ${item.matricula}? La posición ${item.posicion} no se reutilizará.`,
    danger: true, okText: 'Eliminar'
  });
  if(!ok) return;
  try{
    await remove('ingresos', item.id);
    toast('Eliminado', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}
