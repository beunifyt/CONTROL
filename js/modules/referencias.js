// referencias.js — Referencias (Ingresos tipo 1) con campo Posición
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, matchesSearch, fmtTime, chipTel, chipEmail } from '../utils.js';
import { getDefaultEventoId } from '../utils.js';
import { listLive, list, update, remove, createReferencia, isPosicionTaken, whoHasPosicion, bulkRemoveFiltered, smartImport, applyDoubtfulUpdates, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, searchInput, selectInput, statusBadge, excelButtons, printRecord } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { attachAutocomplete, applyDataToForm, markAgendaArrived } from '../autocomplete.js';
import { scanPlate } from '../ocr.js';
import { getHistory, logIncidencia, listIncidencias } from '../audit.js';
import { logger } from '../logger.js';
import { smartTable, savedFiltersBar } from '../table-helpers.js';
import { openContactDriverModal } from '../contact-driver.js';
import { getOrderedFields, openFieldConfig } from '../field-config.js';

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

// Todos los campos del formulario de referencia.
// 'required' = no se puede ocultar desde el panel ⚙ Campos.
const ALL_FORM_FIELDS = [
  { id:'matricula',    label:'Matrícula',        required:true },
  { id:'eventoId',     label:'Evento',           required:true },
  { id:'remolque',     label:'Remolque' },
  { id:'tipoVehiculo', label:'Tipo de vehículo' },
  { id:'tacografo',    label:'Tacógrafo' },
  { id:'conductor',    label:'Conductor (nombre)' },
  { id:'apellido',     label:'Apellido' },
  { id:'telefono',     label:'Teléfono' },
  { id:'email',        label:'Email' },
  { id:'pasaporte',    label:'Pasaporte / DNI' },
  { id:'pais',         label:'País' },
  { id:'fNacimiento',  label:'Fecha de nacimiento' },
  { id:'fExpiracion',  label:'Fecha de expiración' },
  { id:'conductorLang',label:'Idioma del conductor' },
  { id:'empresa',      label:'Empresa' },
  { id:'referencia',   label:'Referencia / Booking' },
  { id:'expositor',    label:'Expositor' },
  { id:'montador',     label:'Montador' },
  { id:'llamador',     label:'Llamador' },
  { id:'posicion',     label:'Nº Posición' },
  { id:'hall',         label:'Hall' },
  { id:'puertaHall',   label:'Puerta Hall' },
  { id:'stand',        label:'Stand' },
  { id:'acceso',       label:'Acceso' },
  { id:'descarga',     label:'Descarga' },
  { id:'estado',       label:'Estado' },
  { id:'hora',         label:'Hora' },
  { id:'comentario',   label:'Comentario' },
  { id:'notas',        label:'Notas' }
];

export async function init(container){
  _container = container;
  // Esta vista tiene tablas anchas → usar todo el ancho disponible
  container.classList.add('page-wide');
  // 3 queries en paralelo (antes eran secuenciales)
  [_eventos, _conductores, _empresas] = await Promise.all([
    list('eventos',     { orderBy:'createdAt', order:'desc' }),
    list('conductores', { orderBy:'nombre', limit: 500 }),
    list('empresas',    { orderBy:'nombre', limit: 500 })
  ]);
  // Aplicar evento favorito como filtro por defecto si no hay uno seleccionado
  if(!_filterEvento){
    _filterEvento = getDefaultEventoId(getCurrentProfile());
  }
  render();
  listLive('referencias', { key: KEY_PREFIX+'all', orderBy:'createdAt', order:'desc', limit: 500 }, (items) => {
    _items = items;
    render();
  });
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  _container?.classList.remove('page-wide');
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
  // Botón importación inteligente (upsert)
  if(canCreate(p)){
    actions.push(el('button', {
      class:'btn btn-secondary btn-sm',
      title:'Importar Excel sin duplicar — actualiza los que cambien, salta los iguales',
      onclick: () => openSmartImport()
    }, el('span', { html: '🔄' }), 'Importar (sin duplicar)'));
  }
  // Botón eliminar con filtro
  if(canDelete(p)){
    actions.push(el('button', {
      class:'btn btn-danger btn-sm',
      title:'Eliminar referencias filtrando por evento y/o fecha',
      onclick: () => openBulkDelete()
    }, el('span', { html: icon('trash') }), 'Eliminar en lote'));
  }
  // Botón configurar campos del formulario
  if(canEdit(p)){
    actions.push(el('button', {
      class:'btn btn-secondary btn-sm',
      title:'Elegir y reordenar qué campos aparecen en el formulario',
      onclick: () => openFieldConfig('referencias', ALL_FORM_FIELDS, () => render())
    }, el('span', { html: '⚙' }), 'Campos'));
  }

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

  // Barra de filtros guardados
  t.appendChild(savedFiltersBar({
    module:'referencias',
    currentFilters: { estado:_filterEstado, eventoId:_filterEvento, search:_search },
    onApply: f => {
      if(f === null){ renderTable(); return; }
      _filterEstado = f.estado || '';
      _filterEvento = f.eventoId || '';
      _search = f.search || '';
      render();
    }
  }));

  if(filtered.length === 0){
    t.appendChild(emptyState({
      iconName:'referencias',
      title: _items.length === 0 ? 'Sin referencias' : 'Sin resultados',
      message: _items.length === 0 ? 'Crea la primera referencia para empezar.' : 'Cambia los filtros o el término de búsqueda.',
      columns: ['Pos.','Referencia','Matrícula','Conductor','Empresa','Hall','Estado','Entrada','Salida','Acciones']
    }));
    return;
  }

  const columns = [
    { id:'posicion',  label:'Nº Posición', inlineType:'number', render: r => el('span', { class:`cell-pos ${r.posicionManual ? 'manual' : ''}`, title: r.posicionManual ? 'Posición manual' : 'Posición automática' }, String(r.posicion || '—')) },
    { id:'referencia',label:'Referencia', render: r => { const ev = _eventos.find(e => e.id === r.eventoId); return el('span', { class:'cell-mute' }, r.referencia || ev?.nombre?.slice(0,8) || '—'); } },
    { id:'llamador',  label:'Llamador',   render: r => r.llamador || '—', default:false },
    { id:'matricula', label:'Matrícula',  inlineEditable:false, render: r => el('span', { class:'cell-plate' }, r.matricula || '—') },
    { id:'remolque',  label:'Remolque',   render: r => r.remolque || '—', default:false },
    { id:'conductor', label:'Conductor',  render: r => r.conductor || '—' },
    { id:'apellido',  label:'Apellido',   render: r => r.apellido || '—', default:false },
    { id:'pasaporte', label:'Pasaporte/DNI', render: r => r.pasaporte || r.dni || '—', default:false },
    { id:'empresa',   label:'Empresa',    render: r => el('span', { class:'cell-mute' }, r.empresa || '—') },
    { id:'hall',      label:'Hall',       render: r => r.hall || '—' },
    { id:'puertaHall',label:'Puerta Hall',render: r => r.puertaHall || '—', default:false },
    { id:'stand',     label:'Stand',      render: r => r.stand || '—' },
    { id:'expositor', label:'Expositor',  render: r => r.expositor || '—', default:false },
    { id:'montador',  label:'Montador',   render: r => r.montador || '—', default:false },
    { id:'acceso',    label:'Acceso',     render: r => r.acceso || '—', default:false },
    { id:'descarga',  label:'Descarga',   inlineType:'select', inlineOptions:[
        { value:'carga', label:'Carga' }, { value:'descarga', label:'Descarga' }, { value:'ambas', label:'Carga y descarga' }
      ], render: r => r.descarga || '—', default:false },
    { id:'tipoVehiculo', label:'Tipo Vehículo', inlineType:'select', inlineOptions:[
        { value:'camion', label:'Camión' }, { value:'trailer', label:'Trailer' },
        { value:'furgoneta', label:'Furgoneta' }, { value:'semirremolque', label:'Semirremolque' }, { value:'otro', label:'Otro' }
      ], render: r => r.tipoVehiculo || '—', default:false },
    { id:'pais',      label:'País',       render: r => r.pais || '—', default:false },
    { id:'email',     label:'Email',      render: r => r.email ? chipEmail(r.email) : '—', default:false },
    { id:'telefono',  label:'Teléfono',   render: r => r.telefono ? chipTel(r.telefono) : '—' },
    { id:'fNacimiento', label:'F. Nacimiento', inlineType:'date', render: r => r.fNacimiento || '—', default:false },
    { id:'fExpiracion', label:'F. Expiración', inlineType:'date', render: r => r.fExpiracion || '—', default:false },
    { id:'estado',    label:'Estado',     inlineEditable:false, render: r => statusBadge(r.estado || 'prerregistrado') },
    { id:'horaEntrada', label:'Entrada',  inlineType:'time', render: r => el('span', { class:'cell-mute' }, r.horaEntrada || '—') },
    { id:'horaSalida',  label:'Salida',   inlineType:'time', render: r => el('span', { class:'cell-mute' }, r.horaSalida || '—') },
    { id:'hora',      label:'Hora',       inlineType:'time', render: r => el('span', { class:'cell-mute' }, r.hora || '—'), default:false },
    { id:'comentario',label:'Comentario', render: r => el('span', { class:'cell-mute' }, (r.comentario || '').slice(0,30) || '—'), default:false },
    { id:'notas',     label:'Notas',      render: r => el('span', { class:'cell-mute' }, (r.notas || '').slice(0,30) || '—'), default:false }
  ];

  t.appendChild(smartTable({
    module:'referencias',
    columns, rows: filtered,
    inlineEdit: canEdit(p),
    detailRenderer: r => {
      const ev = _eventos.find(e => e.id === r.eventoId);
      const dl = el('div', { style:{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px 24px', fontSize:'13px'} });
      const cell = (label, value) => el('div', {},
        el('span', { class:'cell-mute', style:{fontSize:'11px', textTransform:'uppercase', display:'block'} }, label),
        el('span', { style:{fontWeight:500} }, String(value || '—'))
      );
      dl.appendChild(cell('Evento', ev?.nombre));
      dl.appendChild(cell('Posición', r.posicion));
      dl.appendChild(cell('Matrícula', r.matricula));
      dl.appendChild(cell('Conductor', r.conductor));
      dl.appendChild(cell('Empresa', r.empresa));
      dl.appendChild(cell('Teléfono', r.telefono));
      dl.appendChild(cell('Hall · Stand', `${r.hall || '—'} · ${r.stand || '—'}`));
      dl.appendChild(cell('Notas', r.notas));
      return dl;
    },
    rowActions: r => rowActions(r, p)
  }));
}

function rowActions(r, p){
  const wrap = el('div', { class:'row-actions' });
  if(canEdit(p)){
    if(r.estado === 'dentro_fira'){
      wrap.appendChild(el('button', { class:'btn btn-secondary btn-icon', title:'Registrar salida',
        onclick: () => registrarSalida(r) }, el('span', { html: icon('exit') })));
    } else if(r.estado !== 'salida'){
      wrap.appendChild(el('button', { class:'btn btn-secondary btn-icon', title:'Registrar entrada',
        onclick: () => registrarEntrada(r) }, el('span', { html: icon('enter') })));
    }
    // Botón contactar conductor (WhatsApp/SMS/Call/Email/Copy)
    if(r.telefono || r.conductor){
      wrap.appendChild(el('button', {
        class:'btn btn-ghost btn-icon', title:'Contactar conductor (WhatsApp/SMS/Llamar)',
        onclick: () => {
          // Buscar idioma del conductor en la base
          const c = _conductores.find(x =>
            (x.nombre && x.nombre === r.conductor) ||
            (x.matriculas || []).includes(r.matricula)
          );
          openContactDriverModal({
            ...r,
            eventoNombre: _eventos.find(e => e.id === r.eventoId)?.nombre,
            conductorLang: c?.lang || 'es'
          });
        }
      }, '💬'));
    }
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => openForm(r), title:'Editar' },
      el('span', { html: icon('edit') })));
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => openHistorial(r), title:'Historial / Incidencias' },
      el('span', { html: '📋' })));
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => printRecord('referencias', r), title:'Imprimir pase' },
      el('span', { html: icon('print') })));
  }
  if(canDelete(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => deleteItem(r), title:'Eliminar' },
      el('span', { html: icon('trash') })));
  }
  return wrap;
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
      remolque: fd.remolque || '',
      tipoVehiculo: fd.tipoVehiculo || 'camion',
      tacografo: fd.tacografo || '',
      conductor: fd.conductor || '',
      apellido: fd.apellido || '',
      telefono: fd.telefono || '',
      email: fd.email || '',
      pasaporte: fd.pasaporte || '',
      pais: fd.pais || '',
      fNacimiento: fd.fNacimiento || '',
      fExpiracion: fd.fExpiracion || '',
      conductorLang: fd.conductorLang || 'es',
      empresa: fd.empresa || '',
      referencia: fd.referencia || '',
      eventoId: fd.eventoId,
      expositor: fd.expositor || '',
      montador: fd.montador || '',
      llamador: fd.llamador || '',
      hall: fd.hall || '',
      puertaHall: fd.puertaHall || '',
      stand: fd.stand || '',
      acceso: fd.acceso || '',
      descarga: fd.descarga || '',
      estado: fd.estado || 'prerregistrado',
      hora: fd.hora || '',
      comentario: fd.comentario || '',
      notas: fd.notas || ''
    };
    if(fd.posicion) payload.posicion = Number(fd.posicion);

    try{
      if(isEdit){
        // Validación de posición — avisar quién la ocupa
        if(payload.posicion && Number(item.posicion) !== Number(payload.posicion)){
          const occupier = await whoHasPosicion('referencias', payload.eventoId, payload.posicion, { excludeId: item.id });
          if(occupier){
            const ok = await confirmModal({
              title: '⚠ Posición ocupada',
              message: `La posición ${payload.posicion} ya está asignada a la matrícula ${occupier.matricula} (${occupier.conductor || 'sin conductor'}).\n\n¿Quieres asignarla igualmente? Se permite duplicado, pero conviene reasignar al otro vehículo después.`,
              okText: 'Asignar igualmente',
              danger: true
            });
            if(!ok) return;
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

  // Cada campo del formulario, como función que devuelve su nodo.
  // El orden y visibilidad los decide getOrderedFields() según la
  // configuración del usuario en el panel ⚙ Campos.
  const FIELD_BUILDERS = {
    matricula: () => formField({ label:'Matrícula', name:'matricula', value:data.matricula, required:true, placeholder:'Ej: 1234ABC' }),
    eventoId: () => formField({ label:'Evento', name:'eventoId', value:data.eventoId, options:eventoOpts, required:true, full:true }),
    remolque: () => formField({ label:'Remolque', name:'remolque', value:data.remolque, placeholder:'(opcional)' }),
    tipoVehiculo: () => formField({ label:'Tipo de vehículo', name:'tipoVehiculo', value:data.tipoVehiculo, options:[
      { value:'camion', label:'Camión' }, { value:'trailer', label:'Trailer' },
      { value:'furgoneta', label:'Furgoneta' }, { value:'semirremolque', label:'Semirremolque' },
      { value:'otro', label:'Otro' }
    ]}),
    tacografo: () => formField({ label:'Tacógrafo', name:'tacografo', value:data.tacografo, options:[
      { value:'', label:'—' }, { value:'digital', label:'Digital' }, { value:'analogico', label:'Analógico' }
    ]}),
    conductor: () => formField({ label:'Conductor (nombre)', name:'conductor', value:data.conductor }),
    apellido: () => formField({ label:'Apellido', name:'apellido', value:data.apellido }),
    telefono: () => formField({ label:'Teléfono', name:'telefono', value:data.telefono }),
    email: () => formField({ label:'Email', name:'email', type:'email', value:data.email }),
    pasaporte: () => formField({ label:'Pasaporte / DNI', name:'pasaporte', value:data.pasaporte }),
    pais: () => formField({ label:'País', name:'pais', value:data.pais, placeholder:'España, Polonia…' }),
    fNacimiento: () => formField({ label:'F. Nacimiento', name:'fNacimiento', type:'date', value:data.fNacimiento }),
    fExpiracion: () => formField({ label:'F. Expiración', name:'fExpiracion', type:'date', value:data.fExpiracion }),
    conductorLang: () => formField({ label:'Idioma del conductor', name:'conductorLang', value:data.conductorLang || 'es', options:[
      { value:'es', label:'Español' }, { value:'en', label:'English' },
      { value:'fr', label:'Français' }, { value:'de', label:'Deutsch' },
      { value:'it', label:'Italiano' }, { value:'pt', label:'Português' },
      { value:'pl', label:'Polski' }, { value:'ro', label:'Română' },
      { value:'nl', label:'Nederlands' }, { value:'bg', label:'Български' }
    ]}),
    empresa: () => formField({ label:'Empresa', name:'empresa', value:data.empresa }),
    referencia: () => formField({ label:'Referencia / Booking', name:'referencia', value:data.referencia, placeholder:'Ej: MWC-2026-001' }),
    expositor: () => formField({ label:'Expositor', name:'expositor', value:data.expositor }),
    montador: () => formField({ label:'Montador', name:'montador', value:data.montador }),
    llamador: () => formField({ label:'Llamador', name:'llamador', value:data.llamador }),
    posicion: () => formField({
      label: isEdit ? 'Nº Posición' : 'Nº Posición (vacío = automática)',
      name:'posicion', type:'number', value:data.posicion || '',
      hint: isEdit ? 'Editar manualmente la posición' : 'Si dejas vacío, el sistema asigna la siguiente disponible'
    }),
    hall: () => formField({ label:'Hall', name:'hall', value:data.hall }),
    puertaHall: () => formField({ label:'Puerta Hall', name:'puertaHall', value:data.puertaHall }),
    stand: () => formField({ label:'Stand', name:'stand', value:data.stand }),
    acceso: () => formField({ label:'Acceso', name:'acceso', value:data.acceso }),
    descarga: () => formField({ label:'Descarga', name:'descarga', value:data.descarga, options:[
      { value:'', label:'—' }, { value:'carga', label:'Carga' },
      { value:'descarga', label:'Descarga' }, { value:'ambas', label:'Carga y descarga' }
    ]}),
    estado: () => formField({ label:'Estado', name:'estado', value:data.estado, options:[
      { value:'prerregistrado', label:'Prerregistrado' }, { value:'en_camino', label:'En camino' },
      { value:'rampa_parking', label:'Rampa/Parking' }, { value:'dentro_fira', label:'Dentro Fira' },
      { value:'salida', label:'Salida' }
    ]}),
    hora: () => formField({ label:'Hora', name:'hora', type:'time', value:data.hora }),
    comentario: () => formField({ label:'Comentario', name:'comentario', type:'textarea', value:data.comentario, full:true }),
    notas: () => formField({ label:'Notas', name:'notas', type:'textarea', value:data.notas, full:true })
  };

  // Pintar los campos en el orden / visibilidad que el usuario configuró
  const orderedFields = getOrderedFields('referencias', ALL_FORM_FIELDS);
  for(const f of orderedFields){
    const builder = FIELD_BUILDERS[f.id];
    if(builder) grid.appendChild(builder());
  }
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
        }, { eventoId: () => form.querySelector('[name="eventoId"]')?.value || null });
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
        }, { eventoId: () => form.querySelector('[name="eventoId"]')?.value || null });
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

// ═══════════════════════════════════════════════════════════════
// BORRADO MASIVO CON FILTRO (evento + fecha)
// ═══════════════════════════════════════════════════════════════
function openBulkDelete(){
  let selEvento = _filterEvento || '';
  let selFecha = '';

  const body = el('div', { class:'bulk-del-body' });
  body.appendChild(el('p', { class:'cell-mute', style:{marginTop:0, fontSize:'13px'} },
    'Selecciona un filtro para eliminar referencias en lote. Las eliminadas van a la Papelera, se pueden restaurar.'));

  // Selector evento
  body.appendChild(el('label', { class:'edit-label' }, 'Evento'));
  const evSel = el('select', { class:'field-input', onchange: e => { selEvento = e.target.value; updatePreview(); } });
  evSel.appendChild(el('option', { value:'' }, '— Todos los eventos —'));
  for(const ev of _eventos){
    evSel.appendChild(el('option', { value: ev.id, selected: ev.id === selEvento ? 'selected' : null }, ev.nombre));
  }
  body.appendChild(evSel);

  // Selector fecha
  body.appendChild(el('label', { class:'edit-label', style:{marginTop:'10px'} }, 'Fecha (opcional)'));
  const fechaInput = el('input', {
    type:'date', class:'field-input',
    onchange: e => { selFecha = e.target.value; updatePreview(); }
  });
  body.appendChild(fechaInput);

  // Preview
  const preview = el('div', { class:'bulk-del-preview' });
  body.appendChild(preview);

  function updatePreview(){
    clear(preview);
    // Contar coincidencias en _items (ya cargados)
    const matches = _items.filter(r => {
      if(r._deleted) return false;
      if(selEvento && r.eventoId !== selEvento) return false;
      if(selFecha && r.fechaKey !== selFecha) return false;
      return true;
    });
    if(matches.length === 0){
      preview.appendChild(el('div', { class:'bulk-del-warn empty' },
        'No hay referencias que coincidan con este filtro.'));
    } else {
      preview.appendChild(el('div', { class:'bulk-del-warn' },
        el('strong', {}, `${matches.length} referencias`),
        ` serán enviadas a la Papelera.`));
    }
    preview._count = matches.length;
  }
  updatePreview();

  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', {
      class:'btn btn-danger',
      onclick: async () => {
        const count = preview._count || 0;
        if(count === 0){ toast('No hay nada que eliminar con ese filtro', 'warn'); return; }
        const ok = await confirmModal({
          title: '⚠ Confirmar borrado en lote',
          message: `Vas a eliminar ${count} referencias` +
            (selEvento ? ` del evento seleccionado` : ' de TODOS los eventos') +
            (selFecha ? ` con fecha ${selFecha}` : '') +
            `.\n\nIrán a la Papelera. ¿Continuar?`,
          danger: true, okText: `Eliminar ${count}`
        });
        if(!ok) return;
        try{
          const filter = {};
          if(selEvento) filter.eventoId = selEvento;
          if(selFecha) filter.fecha = selFecha;
          const deleted = await bulkRemoveFiltered('referencias', filter);
          toast(`${deleted} referencias enviadas a Papelera`, 'ok', 4000);
          closeModal();
        } catch(e){
          toast(e.message || 'Error al eliminar en lote', 'err');
        }
      }
    }, 'Eliminar en lote')
  );

  openModal({ title:'🗑 Eliminar referencias en lote', body, size:'sm' });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}

// ═══════════════════════════════════════════════════════════════
// IMPORTACIÓN INTELIGENTE (upsert) — Matrícula + Referencia
// ═══════════════════════════════════════════════════════════════
async function openSmartImport(){
  const { parseExcelRows } = await import('../excel.js');

  let parsedRows = null;
  let importResult = null;
  const doubtfulAccepted = new Set(); // ids aceptados para actualizar

  const body = el('div', { class:'smart-import-body' });

  body.appendChild(el('p', { class:'cell-mute', style:{marginTop:0, fontSize:'13px'} },
    'Sube un Excel. Los registros se identifican por ',
    el('strong', {}, 'Matrícula + Referencia'), '. ',
    'Los iguales se saltan, los nuevos se crean, y los que tengan datos distintos se muestran para que decidas.'));

  // Selector de evento destino
  body.appendChild(el('label', { class:'edit-label' }, 'Evento destino'));
  const evSel = el('select', { class:'field-input' });
  evSel.appendChild(el('option', { value:'' }, '— Sin evento / mantener el del Excel —'));
  for(const ev of _eventos){
    evSel.appendChild(el('option', {
      value: ev.id,
      selected: ev.id === _filterEvento ? 'selected' : null
    }, ev.nombre));
  }
  body.appendChild(evSel);

  // Input archivo
  body.appendChild(el('label', { class:'edit-label', style:{marginTop:'10px'} }, 'Archivo Excel'));
  const fileInput = el('input', {
    type:'file', accept:'.xlsx,.xls,.csv', class:'field-input'
  });
  body.appendChild(fileInput);

  // Zona de resultado
  const resultZone = el('div', { class:'smart-import-result' });
  body.appendChild(resultZone);

  // Botón analizar
  const analyzeBtn = el('button', { class:'btn btn-secondary', style:{marginTop:'10px'},
    onclick: async () => {
      const file = fileInput.files[0];
      if(!file){ toast('Selecciona un archivo', 'warn'); return; }
      analyzeBtn.disabled = true;
      analyzeBtn.textContent = 'Analizando…';
      try{
        parsedRows = await parseExcelRows('referencias', file);
        if(parsedRows.length === 0){
          toast('El Excel no tiene filas válidas (falta matrícula)', 'warn');
          analyzeBtn.disabled = false;
          analyzeBtn.textContent = 'Analizar archivo';
          return;
        }
        importResult = await smartImport('referencias', parsedRows, {
          eventoId: evSel.value || null
        });
        renderResult();
        toast(`Análisis: ${importResult.created} nuevos · ${importResult.skipped} iguales · ${importResult.doubtful.length} dudosos`, 'ok', 4000);
      } catch(e){
        toast(e.message || 'Error al analizar el Excel', 'err');
      }
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = 'Analizar archivo';
    }
  }, 'Analizar archivo');
  body.appendChild(analyzeBtn);

  function renderResult(){
    clear(resultZone);
    if(!importResult) return;

    // Resumen con chips
    resultZone.appendChild(el('div', { class:'smart-import-summary' },
      el('span', { class:'si-chip si-created' }, `✓ ${importResult.created} creados`),
      el('span', { class:'si-chip si-skipped' }, `= ${importResult.skipped} sin cambios`),
      el('span', { class:'si-chip si-doubtful' }, `? ${importResult.doubtful.length} dudosos`)
    ));

    // Tabla de dudosos
    if(importResult.doubtful.length > 0){
      resultZone.appendChild(el('p', {
        style:{fontSize:'12px', fontWeight:'600', marginTop:'12px', marginBottom:'6px'}
      }, 'Registros con match dudoso — marca los que quieras actualizar:'));

      const tbl = el('div', { class:'doubtful-list' });
      for(const d of importResult.doubtful){
        const row = el('div', { class:'doubtful-row' });
        const cb = el('input', {
          type:'checkbox',
          onchange: e => {
            if(e.target.checked) doubtfulAccepted.add(d.id);
            else doubtfulAccepted.delete(d.id);
          }
        });
        const info = el('div', { class:'doubtful-info' });
        info.appendChild(el('div', { class:'doubtful-head' },
          el('span', { class:'cell-plate' }, d.matricula),
          el('span', { class:'cell-mute' }, ' · Ref: ' + (d.referencia || '—'))
        ));
        // Mostrar las diferencias campo por campo
        const diffs = el('div', { class:'doubtful-diffs' });
        for(const [field, diff] of Object.entries(d.diffs)){
          diffs.appendChild(el('div', { class:'doubtful-diff' },
            el('span', { class:'dd-field' }, field + ': '),
            el('span', { class:'dd-old' }, diff.actual || '(vacío)'),
            el('span', { class:'dd-arrow' }, ' → '),
            el('span', { class:'dd-new' }, diff.nuevo)
          ));
        }
        info.appendChild(diffs);
        row.appendChild(el('label', { class:'doubtful-label' }, cb, info));
        tbl.appendChild(row);
      }
      resultZone.appendChild(tbl);

      // Botones marcar todos / ninguno
      resultZone.appendChild(el('div', { class:'flex gap-2', style:{marginTop:'6px'} },
        el('button', { class:'btn btn-ghost btn-sm', onclick: () => {
          importResult.doubtful.forEach(d => doubtfulAccepted.add(d.id));
          resultZone.querySelectorAll('.doubtful-row input[type=checkbox]').forEach(c => c.checked = true);
        }}, 'Marcar todos'),
        el('button', { class:'btn btn-ghost btn-sm', onclick: () => {
          doubtfulAccepted.clear();
          resultZone.querySelectorAll('.doubtful-row input[type=checkbox]').forEach(c => c.checked = false);
        }}, 'Desmarcar todos')
      ));
    }
  }

  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cerrar'),
    el('button', {
      class:'btn btn-primary',
      onclick: async () => {
        if(!importResult){ toast('Primero analiza un archivo', 'warn'); return; }
        const accepted = importResult.doubtful.filter(d => doubtfulAccepted.has(d.id));
        try{
          let msg = [];
          if(importResult.created > 0) msg.push(`${importResult.created} ya creados`);
          if(accepted.length > 0){
            const upd = await applyDoubtfulUpdates('referencias', accepted);
            msg.push(`${upd} actualizados`);
          }
          if(msg.length === 0) msg.push('Sin cambios aplicados');
          toast(msg.join(' · '), 'ok', 4000);
          closeModal();
        } catch(e){
          toast(e.message || 'Error al aplicar cambios', 'err');
        }
      }
    }, 'Aplicar cambios seleccionados')
  );

  openModal({ title:'🔄 Importar Excel sin duplicar', body, size:'lg' });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}
