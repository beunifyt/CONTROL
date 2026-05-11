// referencias.js — Referencias (Ingresos tipo 1) con campo Posición
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, matchesSearch, fmtTime } from '../utils.js';
import { listLive, list, update, remove, createReferencia, isPosicionTaken, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, searchInput, selectInput, statusBadge, excelButtons } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { attachAutocomplete, applyDataToForm, markAgendaArrived } from '../autocomplete.js';
import { scanPlate } from '../ocr.js';
import { getHistory, logIncidencia, listIncidencias } from '../audit.js';
import { logger } from '../logger.js';

let _container = null;
let _items = [];
let _eventos = [];
let _conductores = [];
let _empresas = [];
let _filterEstado = '';
let _filterEvento = '';
let _search = '';
const KEY_PREFIX = 'mod:referencias:';

const ESTADOS = [
  { value:'', label:'Todos los estados' },
  { value:'prerregistrado', label:'Prerregistrado' },
  { value:'lista_espera', label:'Lista de espera' },
  { value:'en_camino', label:'En camino' },
  { value:'rampa_parking', label:'Rampa/Parking' },
  { value:'dentro_fira', label:'Dentro Fira' },
  { value:'salida', label:'Salida' }
];

export async function init(container){
  _container = container;
  _eventos = await list('eventos', { orderBy:'createdAt', order:'desc' });
  _conductores = await list('conductores', { orderBy:'nombre' });
  _empresas = await list('empresas', { orderBy:'nombre' });
  render();
  listLive('referencias', { key: KEY_PREFIX+'all', orderBy:'createdAt', order:'desc', limit: 500 }, (items) => {
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
    }, el('span', { html: icon('plus') }), 'Nueva Referencia'));
  }
  actions.push(...excelButtons('referencias', {
    eventoId: _filterEvento || null,
    canImport: canCreate(p),
    canExport: true
  }));

  _container.appendChild(pageHeader({
    title:'Referencias',
    sub:'Bookings y referencias de vehículos (Ingresos tipo 1)',
    actions
  }));

  const filterRow = el('div', { class:'filter-row' });
  filterRow.appendChild(searchInput({ placeholder:'Buscar matrícula, conductor, empresa…', onInput: v => { _search = v; renderTable(); } }));
  filterRow.appendChild(selectInput({
    value: _filterEstado,
    options: ESTADOS,
    onChange: v => { _filterEstado = v; renderTable(); }
  }));
  filterRow.appendChild(selectInput({
    value: _filterEvento,
    options: [{ value:'', label:'Todos los eventos' }, ..._eventos.map(e => ({ value:e.id, label:e.nombre }))],
    onChange: v => { _filterEvento = v; renderTable(); }
  }));
  _container.appendChild(filterRow);

  const tableContainer = el('div', { id:'refs-table' });
  _container.appendChild(tableContainer);
  renderTable();
}

function renderTable(){
  const t = document.getElementById('refs-table');
  if(!t) return;
  clear(t);
  const p = getCurrentProfile();

  let filtered = _items;
  if(_filterEstado) filtered = filtered.filter(r => r.estado === _filterEstado);
  if(_filterEvento) filtered = filtered.filter(r => r.eventoId === _filterEvento);
  if(_search) filtered = filtered.filter(r => matchesSearch(_search, r.matricula, r.conductor, r.empresa, r.referencia));

  if(filtered.length === 0){
    t.appendChild(emptyState({
      iconName:'referencias',
      title: _items.length === 0 ? 'Sin referencias' : 'Sin resultados',
      message: _items.length === 0 ? 'Crea la primera referencia para empezar.' : 'Cambia los filtros o el término de búsqueda.'
    }));
    return;
  }

  const wrap = el('div', { class:'table-wrap' });
  const tbl = el('table', { class:'table' });
  const thead = el('thead', {}, el('tr', {},
    el('th',{},'Pos.'),
    el('th',{},'Referencia'),
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
  for(const r of filtered){
    const ev = _eventos.find(e => e.id === r.eventoId);
    const tr = el('tr', {},
      el('td', {}, el('span', { class:`cell-pos ${r.posicionManual ? 'manual' : ''}`, title: r.posicionManual ? 'Posición manual' : 'Posición automática' }, String(r.posicion || '—'))),
      el('td', { class:'cell-mute' }, r.referencia || ev?.nombre?.slice(0,8) || '—'),
      el('td', { class:'cell-plate' }, r.matricula || '—'),
      el('td', {}, r.conductor || '—'),
      el('td', { class:'cell-mute' }, r.empresa || '—'),
      el('td', {}, r.hall || '—'),
      el('td', {}, statusBadge(r.estado || 'prerregistrado')),
      el('td', { class:'cell-mute' }, r.horaEntrada || '—'),
      el('td', { class:'cell-mute' }, r.horaSalida || '—'),
      rowActions(r, p)
    );
    tb.appendChild(tr);
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  t.appendChild(wrap);
}

function rowActions(r, p){
  const td = el('td', {}, el('div', { class:'row-actions' }));
  const wrap = td.firstChild;

  if(canEdit(p)){
    if(r.estado === 'salida'){
      // ya salió
    } else if(r.estado === 'dentro_fira'){
      wrap.appendChild(el('button', {
        class:'btn btn-secondary btn-icon',
        title:'Registrar salida',
        onclick: () => registrarSalida(r)
      }, el('span', { html: icon('exit') })));
    } else {
      wrap.appendChild(el('button', {
        class:'btn btn-secondary btn-icon',
        title:'Registrar entrada',
        onclick: () => registrarEntrada(r)
      }, el('span', { html: icon('enter') })));
    }
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => openForm(r), title:'Editar' },
      el('span', { html: icon('edit') })));
  }
  if(canEdit(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => openHistorial(r), title:'Historial / Incidencias' },
      el('span', { html: '📋' })));
  }
  if(canDelete(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => deleteItem(r), title:'Eliminar' },
      el('span', { html: icon('trash') })));
  }
  return td;
}

async function openHistorial(r){
  const [history, incidencias] = await Promise.all([
    getHistory('referencias', r.id),
    listIncidencias('referencias', r.id)
  ]);

  const body = document.createElement('div');

  // Botón nueva incidencia
  const btnNew = document.createElement('button');
  btnNew.className = 'btn btn-primary btn-sm';
  btnNew.innerHTML = '+ Nueva incidencia';
  btnNew.onclick = () => promptIncidencia(r);
  body.appendChild(btnNew);

  // Incidencias
  const h1 = document.createElement('h4');
  h1.style.cssText = 'margin:16px 0 8px;font-size:13px;text-transform:uppercase;color:var(--text-3)';
  h1.textContent = `Incidencias (${incidencias.length})`;
  body.appendChild(h1);
  if(incidencias.length === 0){
    const p = document.createElement('div');
    p.className = 'cell-mute';
    p.textContent = 'Sin incidencias registradas';
    body.appendChild(p);
  } else {
    for(const inc of incidencias){
      const fecha = inc.createdAt?.toDate ? inc.createdAt.toDate() : null;
      const card = document.createElement('div');
      card.className = 'msg-card alerta';
      card.innerHTML = `
        <div class="msg-icon">⚠️</div>
        <div class="msg-body">
          <div class="msg-title">${escapeHtml(inc.tipo || 'incidencia')}</div>
          <div class="msg-text">${escapeHtml(inc.descripcion || '')}</div>
          <div class="msg-meta"><span>${escapeHtml(inc.userName || '—')}</span><span>${fecha ? fecha.toLocaleString() : ''}</span></div>
        </div>`;
      body.appendChild(card);
    }
  }

  // Historial
  const h2 = document.createElement('h4');
  h2.style.cssText = 'margin:16px 0 8px;font-size:13px;text-transform:uppercase;color:var(--text-3)';
  h2.textContent = `Historial de cambios (${history.length})`;
  body.appendChild(h2);
  if(history.length === 0){
    const p = document.createElement('div');
    p.className = 'cell-mute';
    p.textContent = 'Sin cambios registrados';
    body.appendChild(p);
  } else {
    for(const h of history.slice(0, 30)){
      const fecha = h.createdAt?.toDate ? h.createdAt.toDate() : null;
      const row = document.createElement('div');
      row.style.cssText = 'padding:8px 12px;border-bottom:1px solid var(--border);font-size:13px';
      row.innerHTML = `
        <span class="badge badge-${h.type === 'delete' ? 'red' : h.type === 'create' ? 'green' : 'blue'}">${h.type}</span>
        <span class="cell-mute" style="margin-left:8px">${escapeHtml(h.userName || '—')}</span>
        <span class="cell-mute" style="margin-left:8px">${fecha ? fecha.toLocaleString() : ''}</span>
      `;
      body.appendChild(row);
    }
  }

  openModal({
    title:`Historial · ${r.matricula} · Pos. ${r.posicion}`,
    body, size:'lg'
  });
}

function promptIncidencia(r){
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field">
      <label class="field-label">Tipo</label>
      <select class="field-input select" id="__inc_tipo">
        <option value="cambio_camion">Cambio camión</option>
        <option value="cambio_conductor">Cambio conductor</option>
        <option value="cambio_fecha">Cambio fecha</option>
        <option value="cambio_referencia">Cambio referencia</option>
        <option value="otro">Otro</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">Descripción</label>
      <textarea class="field-input" id="__inc_desc" rows="3"></textarea>
    </div>`;
  const btn = document.createElement('button');
  btn.className = 'btn btn-primary';
  btn.textContent = 'Registrar incidencia';
  btn.onclick = async () => {
    const tipo = body.querySelector('#__inc_tipo').value;
    const desc = body.querySelector('#__inc_desc').value;
    try{
      await logIncidencia('referencias', r.id, tipo, desc);
      toast('Incidencia registrada', 'ok');
      closeModal();
    } catch(e){ toast(e.message, 'err'); }
  };
  const footer = document.createElement('div');
  footer.className = 'modal-foot';
  const cancel = document.createElement('button');
  cancel.className = 'btn btn-secondary';
  cancel.textContent = 'Cancelar';
  cancel.onclick = closeModal;
  footer.appendChild(cancel);
  footer.appendChild(btn);

  openModal({ title:`Nueva incidencia · ${r.matricula}`, body });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}

function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

async function registrarEntrada(r){
  const horaEntrada = new Date().toTimeString().slice(0,5);
  try{
    await update('referencias', r.id, { estado:'dentro_fira', horaEntrada });
    toast('Entrada registrada', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}

async function registrarSalida(r){
  const horaSalida = new Date().toTimeString().slice(0,5);
  try{
    await update('referencias', r.id, { estado:'salida', horaSalida });
    toast('Salida registrada', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}

function openForm(item){
  const isEdit = !!item;
  const data = item || {
    matricula:'', conductor:'', telefono:'', empresa:'', referencia:'',
    hall:'', stand:'', remolque:'', tipoVehiculo:'camion',
    eventoId:'', posicion:'', estado:'prerregistrado', notas:''
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
      referencia: fd.referencia || '',
      hall: fd.hall || '',
      stand: fd.stand || '',
      remolque: fd.remolque || '',
      tipoVehiculo: fd.tipoVehiculo || 'camion',
      eventoId: fd.eventoId,
      estado: fd.estado || 'prerregistrado',
      notas: fd.notas || ''
    };
    if(fd.posicion) payload.posicion = Number(fd.posicion);

    try{
      if(isEdit){
        // P-03.1: si la posición cambió, validar colisión
        if(payload.posicion && Number(item.posicion) !== Number(payload.posicion)){
          const taken = await isPosicionTaken('referencias', payload.eventoId, payload.posicion);
          if(taken){
            toast(`La posición ${payload.posicion} ya está ocupada`, 'err');
            return;
          }
          payload.posicionManual = true;
        }
        await update('referencias', item.id, payload);
      } else {
        await createReferencia(payload);
      }
      toast(isEdit ? 'Actualizado' : 'Creado', 'ok');
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
  grid.appendChild(formField({ label:'Referencia', name:'referencia', value:data.referencia, placeholder:'Ej: MWC-2026-001' }));
  grid.appendChild(formField({
    label: isEdit ? 'Posición' : 'Posición (vacío = automática)',
    name:'posicion', type:'number', value:data.posicion || '',
    hint: isEdit ? 'Editar manualmente la posición' : 'Si dejas vacío, el sistema asigna la siguiente disponible'
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
    { value:'prerregistrado', label:'Prerregistrado' },
    { value:'en_camino', label:'En camino' },
    { value:'rampa_parking', label:'Rampa/Parking' },
    { value:'dentro_fira', label:'Dentro Fira' },
    { value:'salida', label:'Salida' }
  ]}));
  grid.appendChild(formField({ label:'Notas', name:'notas', type:'textarea', value:data.notas, full:true }));
  form.appendChild(grid);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary', onclick: () => form.requestSubmit() }, 'Guardar')
  );

  openModal({
    title: isEdit ? 'Editar referencia' : 'Nueva referencia',
    body: form,
    size:'lg'
  });

  setTimeout(() => {
    form.parentElement.appendChild(footer);

    // ── Autocompletado en cascada (Bloque A) ─────────────────
    if(!isEdit){
      const inpMatricula  = form.querySelector('[name="matricula"]');
      const inpReferencia = form.querySelector('[name="referencia"]');
      const inpConductor  = form.querySelector('[name="conductor"]');
      const inpEmpresa    = form.querySelector('[name="empresa"]');

      // Variable interna para guardar el agendaId al absorber referencia
      let _agendaId = null;

      if(inpMatricula){
        attachAutocomplete(inpMatricula, 'matricula', (data) => {
          applyDataToForm(form, data);
          toast(`Matrícula encontrada (${data.matricula})`, 'ok');
        });
        // Botón OCR cámara junto al input
        const scanBtn = document.createElement('button');
        scanBtn.type = 'button';
        scanBtn.className = 'btn btn-secondary btn-sm';
        scanBtn.title = 'Escanear matrícula con cámara';
        scanBtn.innerHTML = '📸';
        scanBtn.style.cssText = 'position:absolute;right:6px;top:30px;padding:6px 10px;z-index:2';
        scanBtn.onclick = async () => {
          const res = await scanPlate();
          if(res?.plate){
            inpMatricula.value = res.plate;
            inpMatricula.dispatchEvent(new Event('input'));
          }
        };
        if(getComputedStyle(inpMatricula.parentElement).position === 'static'){
          inpMatricula.parentElement.style.position = 'relative';
        }
        inpMatricula.parentElement.appendChild(scanBtn);
      }
      if(inpReferencia){
        attachAutocomplete(inpReferencia, 'referencia', (data) => {
          _agendaId = data.agendaId;
          applyDataToForm(form, data);
          toast(`Referencia encontrada en Agenda`, 'ok');
          logger.info(`Referencia ${data.referencia} absorbida desde agenda`, { agendaId: data.agendaId });
        });
      }
      if(inpConductor){
        attachAutocomplete(inpConductor, 'conductor', (data) => {
          applyDataToForm(form, data);
          toast(`Conductor encontrado`, 'ok');
        });
      }
      if(inpEmpresa){
        attachAutocomplete(inpEmpresa, 'empresa', (data, suggestion) => {
          if(data.bloqueada){
            // bloqueo duro
            toast(`Empresa "${data.empresa}" está bloqueada — no se puede registrar`, 'err', 4000);
            return;
          }
          applyDataToForm(form, data);
          toast(`Empresa encontrada (nivel: ${data.nivel})`, 'ok');
        });
      }

      // Al enviar el form, si se absorbió referencia de agenda, marcarla como llegado
      form.addEventListener('submit', () => {
        if(_agendaId) markAgendaArrived(_agendaId);
      }, { once: false });
    }
  }, 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title: 'Eliminar referencia',
    message: `¿Eliminar la referencia de matrícula ${item.matricula}? La posición ${item.posicion} no se reutilizará.`,
    danger: true, okText: 'Eliminar'
  });
  if(!ok) return;
  try{
    await remove('referencias', item.id);
    toast('Eliminado', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}
