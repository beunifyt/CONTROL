// ingresos.js — Ingresos libres (tipo 2) con campo Posición separado
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, matchesSearch, fmtTime, todayKey, chipTel } from '../utils.js';
import { getDefaultEventoId } from '../utils.js';
import { listLive, list, update, remove, createIngreso, isPosicionTaken, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, searchInput, selectInput, statusBadge, excelButtons, printRecord } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { attachAutocomplete, applyDataToForm, checkBlacklist } from '../autocomplete.js';
import { scanPlate } from '../ocr.js';
import { logger } from '../logger.js';
import { smartTable, savedFiltersBar } from '../table-helpers.js';
import { openContactDriverModal } from '../contact-driver.js';
import { autoMsg } from './mensajes.js';
import { getOrderedFields, openFieldConfig, getExtraFieldLabels, openExtraFieldsConfig } from '../field-config.js';

// Catálogo completo de campos del formulario de ingresos.
// El usuario puede ocultar/reordenar (excepto required) desde "⚙ Campos".
const ALL_FORM_FIELDS = [
  { id:'matricula',    label:'Matrícula',          required:true },
  { id:'eventoId',     label:'Evento',             required:true },
  { id:'posicion',     label:'Nº Posición' },
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
  { id:'hall',         label:'Hall' },
  { id:'puertaHall',   label:'Puerta Hall' },
  { id:'stand',        label:'Stand' },
  { id:'servicio',     label:'Servicio' },
  { id:'estado',       label:'Estado' },
  { id:'horaEntrada',  label:'Hora entrada' },
  { id:'horaSalida',   label:'Hora salida' },
  { id:'extra1',       label:'Extra 1' },
  { id:'extra2',       label:'Extra 2' },
  { id:'extra3',       label:'Extra 3' },
  { id:'extra4',       label:'Extra 4' },
  { id:'extra5',       label:'Extra 5' },
  { id:'notas',        label:'Notas' }
];

let _container = null;
let _items = [];
let _eventos = [];
let _filterEvento = '';
let _search = '';
let _filterToday = true;
const KEY_PREFIX = 'mod:ingresos:';

// Búsqueda inteligente: prioriza posición si es número
function filterBySearch(items, searchTerm){
  if(!searchTerm) return items;
  const term = searchTerm.trim().toLowerCase();
  // Si es principalmente números, prioriza búsqueda por posición
  const isNum = /^\d+$/.test(term);
  if(isNum){
    const byPos = items.filter(i => (i.posicion||'').toString().includes(term));
    if(byPos.length > 0) return byPos;
  }
  // Fallback: busca en matrícula, conductor, empresa, posición
  return items.filter(i => 
    matchesSearch(term, i.matricula, i.conductor, i.empresa, (i.posicion||'').toString())
  );
}

export async function init(container){
  _container = container;
  _eventos = await list('eventos', { orderBy:'createdAt', order:'desc' });
  if(!_filterEvento){
    _filterEvento = getDefaultEventoId(getCurrentProfile());
  }
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
  if(canEdit(p)){
    actions.push(el('button', {
      class:'btn btn-ghost',
      onclick: () => openFieldConfig('ingresos', ALL_FORM_FIELDS, () => {})
    }, '⚙ Campos'));
    actions.push(el('button', {
      class:'btn btn-ghost',
      onclick: () => openExtraFieldsConfig('ingresos', () => {})
    }, '⚙ Nombres extra'));
  }
  actions.push(...excelButtons('ingresos', {
    eventoId: _filterEvento || null,
    canImport: canCreate(p),
    canExport: true
  }));

  _container.appendChild(pageHeader({
    title:'Ingresos',
    sub:'Entradas libres sin reserva previa (Ingresos tipo 2). Posición se reinicia cada día.',
    actions
  }));

  const filterRow = el('div', { class:'filter-row' });
  filterRow.appendChild(searchInput({ placeholder:'Buscar: posición (ej: 42), matrícula, conductor, empresa…', onInput: v => { _search = v; renderTable(); } }));
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
  if(_search) filtered = filterBySearch(filtered, _search);

  t.appendChild(savedFiltersBar({
    module:'ingresos',
    currentFilters: { today:_filterToday, eventoId:_filterEvento, search:_search },
    onApply: f => {
      if(f === null){ renderTable(); return; }
      _filterToday = !!f.today;
      _filterEvento = f.eventoId || '';
      _search = f.search || '';
      render();
    }
  }));

  if(filtered.length === 0){
    t.appendChild(emptyState({
      iconName:'ingresos',
      title: _items.length === 0 ? 'Sin ingresos' : 'Sin resultados',
      message: _items.length === 0 ? 'Registra el primer ingreso libre.' : 'Cambia los filtros o el término de búsqueda.',
      columns: ['Pos.','Día','Matrícula','Conductor','Empresa','Hall','Estado','Entrada','Salida','Acciones']
    }));
    return;
  }

  const extraLbl = getExtraFieldLabels('ingresos');
  const columns = [
    { id:'posicion',  label:'Pos.',      render: i => el('span', { class:`cell-pos ${i.posicionManual ? 'manual' : ''}` }, String(i.posicion || '—')) },
    { id:'fechaKey',  label:'Día',       render: i => el('span', { class:'cell-mute' }, i.fechaKey || '—') },
    { id:'matricula', label:'Matrícula', render: i => el('span', { class:'cell-plate' }, i.matricula || '—') },
    { id:'conductor', label:'Conductor', render: i => i.conductor || '—' },
    { id:'apellido',  label:'Apellido',  render: i => i.apellido || '—', default:false },
    { id:'empresa',   label:'Empresa',   render: i => el('span', { class:'cell-mute' }, i.empresa || '—') },
    { id:'referencia',label:'Referencia',render: i => i.referencia || '—', default:false },
    { id:'expositor', label:'Expositor', render: i => i.expositor || '—', default:false },
    { id:'montador',  label:'Montador',  render: i => i.montador || '—', default:false },
    { id:'llamador',  label:'Llamador',  render: i => i.llamador || '—', default:false },
    { id:'hall',      label:'Hall',      render: i => i.hall || '—' },
    { id:'puertaHall',label:'Puerta Hall',render: i => i.puertaHall || '—', default:false },
    { id:'stand',     label:'Stand',     render: i => i.stand || '—', default:false },
    { id:'servicio',  label:'Servicio',  render: i => i.servicio || '—', default:false },
    { id:'tipoVehiculo',label:'Tipo veh.',render: i => i.tipoVehiculo || '—', default:false },
    { id:'remolque',  label:'Remolque',  render: i => i.remolque || '—', default:false },
    { id:'tacografo', label:'Tacógrafo', render: i => i.tacografo || '—', default:false },
    { id:'pasaporte', label:'Pasaporte', render: i => i.pasaporte || '—', default:false },
    { id:'pais',      label:'País',      render: i => i.pais || '—', default:false },
    { id:'conductorLang',label:'Idioma', render: i => i.conductorLang || '—', default:false },
    { id:'estado',    label:'Estado',    render: i => statusBadge(i.estado || 'dentro') },
    { id:'horaEntrada', label:'Entrada', render: i => el('span', { class:'cell-mute' }, i.horaEntrada || '—') },
    { id:'horaSalida',  label:'Salida',  render: i => el('span', { class:'cell-mute' }, i.horaSalida || '—') },
    { id:'telefono',  label:'Teléfono',  render: i => i.telefono ? chipTel(i.telefono) : '—', default:false },
    { id:'email',     label:'Email',     render: i => i.email || '—', default:false },
    { id:'extra1',    label:extraLbl.extra1 || 'Extra 1', render: i => i.extra1 || '—', default: !!extraLbl.extra1 },
    { id:'extra2',    label:extraLbl.extra2 || 'Extra 2', render: i => i.extra2 || '—', default: !!extraLbl.extra2 },
    { id:'extra3',    label:extraLbl.extra3 || 'Extra 3', render: i => i.extra3 || '—', default: !!extraLbl.extra3 },
    { id:'extra4',    label:extraLbl.extra4 || 'Extra 4', render: i => i.extra4 || '—', default: !!extraLbl.extra4 },
    { id:'extra5',    label:extraLbl.extra5 || 'Extra 5', render: i => i.extra5 || '—', default: !!extraLbl.extra5 },
    { id:'notas',     label:'Notas',     render: i => el('span', { class:'cell-mute' }, (i.notas || '').slice(0,30) || '—'), default:false }
  ];

  t.appendChild(smartTable({
    module:'ingresos',
    columns, rows: filtered,
    detailRenderer: i => {
      const ev = _eventos.find(e => e.id === i.eventoId);
      const dl = el('div', { style:{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px 24px', fontSize:'13px'} });
      const cell = (label, value) => el('div', {},
        el('span', { class:'cell-mute', style:{fontSize:'11px', textTransform:'uppercase', display:'block'} }, label),
        el('span', { style:{fontWeight:500} }, String(value || '—'))
      );
      dl.appendChild(cell('Evento', ev?.nombre));
      dl.appendChild(cell('Día', i.fechaKey));
      dl.appendChild(cell('Posición', i.posicion));
      dl.appendChild(cell('Matrícula', i.matricula));
      dl.appendChild(cell('Conductor', i.conductor));
      dl.appendChild(cell('Empresa', i.empresa));
      dl.appendChild(cell('Hall · Stand', `${i.hall || '—'} · ${i.stand || '—'}`));
      dl.appendChild(cell('Teléfono', i.telefono));
      dl.appendChild(cell('Notas', i.notas));
      return dl;
    },
    rowActions: i => rowActions(i, p)
  }));
}

function rowActions(i, p){
  const wrap = el('div', { class:'row-actions' });
  if(canEdit(p)){
    if(i.estado !== 'salida'){
      wrap.appendChild(el('button', { class:'btn btn-secondary btn-icon', title:'Registrar salida',
        onclick: () => registrarSalida(i) }, el('span', { html: icon('exit') })));
    }
    if(i.telefono || i.conductor){
      wrap.appendChild(el('button', {
        class:'btn btn-ghost btn-icon', title:'Contactar conductor',
        onclick: () => openContactDriverModal({
          ...i,
          eventoNombre: _eventos.find(e => e.id === i.eventoId)?.nombre
        })
      }, '💬'));
    }
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => openForm(i), title:'Editar' },
      el('span', { html: icon('edit') })));
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => printRecord('ingresos', i), title:'Imprimir pase' },
      el('span', { html: icon('print') })));
  }
  if(canDelete(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => deleteItem(i), title:'Eliminar' },
      el('span', { html: icon('trash') })));
  }
  return wrap;
}

async function registrarSalida(i){
  const horaSalida = new Date().toTimeString().slice(0,5);
  try{
    await update('ingresos', i.id, { estado:'salida', horaSalida });
    toast('Salida registrada', 'ok');
    autoMsg({
      titulo:'Salida de parking',
      texto:`${i.matricula} (pos ${i.posicion || '—'}) salió. Plaza liberada.`,
      tipo:'info', linkedColl:'ingresos', linkedId:i.id,
      dedupeKey:`salida:${i.id}`
    });
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

    // Bloqueo duro: empresa o matrícula en lista negra
    const bl = await checkBlacklist({ empresa: fd.empresa, matricula: fd.matricula });
    if(bl.blocked){
      toast(`🚫 Bloqueado — ${bl.reason}`, 'err', 5000);
      autoMsg({
        titulo:'Intento de acceso bloqueado',
        texto: `${bl.reason}. Matrícula ${String(fd.matricula).toUpperCase()}.`,
        tipo:'alerta',
        dedupeKey:`bl:${fd.matricula}`, dedupeMin:10
      });
      return;
    }

    const payload = {
      matricula: String(fd.matricula).toUpperCase().trim(),
      conductor: fd.conductor || '',
      apellido: fd.apellido || '',
      telefono: fd.telefono || '',
      email: fd.email || '',
      pasaporte: fd.pasaporte || '',
      pais: fd.pais || '',
      fNacimiento: fd.fNacimiento || '',
      fExpiracion: fd.fExpiracion || '',
      conductorLang: fd.conductorLang || '',
      empresa: fd.empresa || '',
      referencia: fd.referencia || '',
      expositor: fd.expositor || '',
      montador: fd.montador || '',
      llamador: fd.llamador || '',
      hall: fd.hall || '',
      puertaHall: fd.puertaHall || '',
      stand: fd.stand || '',
      servicio: fd.servicio || '',
      remolque: fd.remolque || '',
      tacografo: fd.tacografo || '',
      tipoVehiculo: fd.tipoVehiculo || 'camion',
      eventoId: fd.eventoId,
      estado: fd.estado || 'dentro',
      horaEntrada: fd.horaEntrada || '',
      horaSalida: fd.horaSalida || '',
      extra1: fd.extra1 || '',
      extra2: fd.extra2 || '',
      extra3: fd.extra3 || '',
      extra4: fd.extra4 || '',
      extra5: fd.extra5 || '',
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

  // Nombres personalizados de los 5 campos extra (de config del módulo)
  const extraLabels = getExtraFieldLabels('ingresos');

  const grid = el('div', { class:'form-grid' });
  const FIELD_BUILDERS = {
    matricula: () => formField({ label:'Matrícula', name:'matricula', value:data.matricula, required:true, placeholder:'Ej: 1234ABC' }),
    eventoId: () => formField({ label:'Evento', name:'eventoId', value:data.eventoId, options:eventoOpts, required:true, full:true }),
    remolque: () => formField({ label:'Remolque', name:'remolque', value:data.remolque, placeholder:'(opcional)' }),
    tipoVehiculo: () => formField({ label:'Tipo vehículo', name:'tipoVehiculo', value:data.tipoVehiculo, options:[
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
    empresa: () => formField({ label:'Empresa', name:'empresa', value:data.empresa, full:true }),
    referencia: () => formField({ label:'Referencia / Booking', name:'referencia', value:data.referencia, placeholder:'Ej: MWC-2026-001' }),
    expositor: () => formField({ label:'Expositor', name:'expositor', value:data.expositor }),
    montador: () => formField({ label:'Montador', name:'montador', value:data.montador }),
    llamador: () => formField({ label:'Llamador', name:'llamador', value:data.llamador }),
    posicion: () => formField({
      label: isEdit ? 'Posición' : 'Posición (vacío = automática)',
      name:'posicion', type:'number', value:data.posicion || '',
      hint: isEdit ? 'Editar manualmente la posición' : 'Si dejas vacío, el sistema asigna la siguiente disponible (reinicia cada día)'
    }),
    hall: () => formField({ label:'Hall', name:'hall', value:data.hall }),
    puertaHall: () => formField({ label:'Puerta Hall', name:'puertaHall', value:data.puertaHall }),
    stand: () => formField({ label:'Stand', name:'stand', value:data.stand }),
    servicio: () => formField({ label:'Servicio', name:'servicio', value:data.servicio }),
    estado: () => formField({ label:'Estado', name:'estado', value:data.estado, options:[
      { value:'lista_espera', label:'Lista de espera' },
      { value:'dentro', label:'Dentro' },
      { value:'salida', label:'Salida' }
    ]}),
    horaEntrada: () => formField({ label:'Hora entrada', name:'horaEntrada', type:'time', value:data.horaEntrada }),
    horaSalida: () => formField({ label:'Hora salida', name:'horaSalida', type:'time', value:data.horaSalida }),
    extra1: () => formField({ label:extraLabels.extra1 || 'Extra 1', name:'extra1', value:data.extra1 }),
    extra2: () => formField({ label:extraLabels.extra2 || 'Extra 2', name:'extra2', value:data.extra2 }),
    extra3: () => formField({ label:extraLabels.extra3 || 'Extra 3', name:'extra3', value:data.extra3 }),
    extra4: () => formField({ label:extraLabels.extra4 || 'Extra 4', name:'extra4', value:data.extra4 }),
    extra5: () => formField({ label:extraLabels.extra5 || 'Extra 5', name:'extra5', value:data.extra5 }),
    notas: () => formField({ label:'Notas', name:'notas', type:'textarea', value:data.notas, full:true })
  };

  // Pintar los campos en orden / visibilidad configurados por el usuario
  const orderedFields = getOrderedFields('ingresos', ALL_FORM_FIELDS);
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
    title: isEdit ? 'Editar ingreso' : 'Nuevo ingreso libre',
    body: form,
    size:'lg'
  });

  setTimeout(() => {
    form.parentElement.appendChild(footer);

    if(!isEdit){
      const inpMatricula = form.querySelector('[name="matricula"]');
      const inpConductor = form.querySelector('[name="conductor"]');
      const inpEmpresa   = form.querySelector('[name="empresa"]');

      if(inpMatricula){
        attachAutocomplete(inpMatricula, 'matricula', (data) => {
          applyDataToForm(form, data);
          toast(`Matrícula encontrada (${data.matricula})`, 'ok');
        }, { eventoId: () => form.querySelector('[name="eventoId"]')?.value || null });
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
      if(inpConductor){
        attachAutocomplete(inpConductor, 'conductor', (data) => {
          applyDataToForm(form, data);
          toast(`Conductor encontrado`, 'ok');
        });
      }
      if(inpEmpresa){
        attachAutocomplete(inpEmpresa, 'empresa', (data) => {
          if(data.bloqueada){
            toast(`Empresa "${data.empresa}" está bloqueada — no se puede registrar`, 'err', 4000);
            return;
          }
          applyDataToForm(form, data);
          toast(`Empresa encontrada (nivel: ${data.nivel})`, 'ok');
        });
      }
    }
  }, 60);
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
