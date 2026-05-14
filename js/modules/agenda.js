// agenda.js — citas planificadas con hora plan vs hora real
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, fmtDate, matchesSearch } from '../utils.js';
import { getDefaultEventoId } from '../utils.js';
import { listLive, list, create, update, remove, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, searchInput, selectInput, statusBadge, excelButtons, printRecord } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { smartTable, savedFiltersBar } from '../table-helpers.js';

let _container = null;
let _items = [];
let _eventos = [];
let _filterEvento = '';
let _filterEstado = '';
let _search = '';
let _view = 'list'; // list | calendar
const KEY_PREFIX = 'mod:agenda:';

export async function init(container){
  _container = container;
  _eventos = await list('eventos', { orderBy:'createdAt', order:'desc' });
  if(!_filterEvento){
    _filterEvento = getDefaultEventoId(getCurrentProfile());
  }
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

  // Switcher de vista Lista / Calendario
  const viewSwitcher = el('div', { class:'view-switcher' });
  for(const [val, ico, lab] of [['list', '☰', 'Lista'], ['calendar', '📅', 'Calendario']]){
    viewSwitcher.appendChild(el('button', {
      class:`view-switcher-btn ${_view === val ? 'active' : ''}`,
      onclick: () => { _view = val; render(); }
    }, el('span', {}, ico), el('span', {}, lab)));
  }
  _container.appendChild(viewSwitcher);

  const tableContainer = el('div', { id:'agenda-table' });
  _container.appendChild(tableContainer);
  if(_view === 'calendar') renderCalendar();
  else                      renderTable();
}

// ── Vista calendario semanal ──────────────────────────────────
function renderCalendar(){
  const t = document.getElementById('agenda-table');
  if(!t) return;
  clear(t);

  let filtered = _items;
  if(_filterEvento) filtered = filtered.filter(a => a.eventoId === _filterEvento);
  if(_filterEstado) filtered = filtered.filter(a => a.estado === _filterEstado);

  // Semana actual: lunes a domingo
  const now = new Date();
  const day = now.getDay() || 7; // 1..7 (Lun..Dom)
  const monday = new Date(now); monday.setDate(now.getDate() - (day - 1));
  monday.setHours(0,0,0,0);
  const week = [];
  for(let i = 0; i < 7; i++){
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    week.push(d);
  }

  const wrap = el('div', { class:'calendar-week' });

  // Header columnas
  const head = el('div', { class:'cal-head' });
  head.appendChild(el('div', { class:'cal-hour-col' }, '')); // celda vacía para horas
  for(const d of week){
    const isToday = d.toDateString() === new Date().toDateString();
    head.appendChild(el('div', { class:`cal-day-head ${isToday ? 'today' : ''}` },
      el('div', { class:'cal-day-name' }, ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][week.indexOf(d)]),
      el('div', { class:'cal-day-num' }, String(d.getDate()))
    ));
  }
  wrap.appendChild(head);

  // Body: filas por hora (06h a 22h)
  const body = el('div', { class:'cal-body' });
  for(let hour = 6; hour < 22; hour++){
    const row = el('div', { class:'cal-row' });
    row.appendChild(el('div', { class:'cal-hour-col' }, `${String(hour).padStart(2,'0')}:00`));
    for(const d of week){
      const cell = el('div', { class:'cal-cell' });
      // Eventos a esta hora
      const dayKey = d.toISOString().slice(0,10);
      const cellEvents = filtered.filter(a => {
        const aFecha = a.fechaPlanificada ? (a.fechaPlanificada.toDate ? a.fechaPlanificada.toDate() : new Date(a.fechaPlanificada)) : null;
        if(!aFecha) return false;
        if(aFecha.toISOString().slice(0,10) !== dayKey) return false;
        const ahour = parseInt((a.horaPlanificada || '00:00').split(':')[0], 10);
        return ahour === hour;
      });
      for(const a of cellEvents){
        cell.appendChild(el('div', {
          class:`cal-event cal-state-${a.estado || 'planificado'}`,
          title: `${a.horaPlanificada || ''} · ${a.conductor || ''} · ${a.empresa || ''}`,
          onclick: () => openForm(a)
        },
          el('span', { class:'ce-time' }, a.horaPlanificada || '—'),
          el('span', { class:'ce-plate' }, a.matricula || ''),
          a.conductor ? el('span', { class:'ce-driver' }, a.conductor) : null
        ));
      }
      row.appendChild(cell);
    }
    body.appendChild(row);
  }
  wrap.appendChild(body);

  if(filtered.length === 0){
    wrap.appendChild(el('div', { class:'cell-mute', style:{textAlign:'center', padding:'24px'} },
      'Sin citas planificadas para esta semana.'));
  }

  t.appendChild(wrap);
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

  t.appendChild(savedFiltersBar({
    module:'agenda',
    currentFilters: { eventoId:_filterEvento, estado:_filterEstado, search:_search },
    onApply: f => {
      if(f === null){ renderTable(); return; }
      _filterEvento = f.eventoId || '';
      _filterEstado = f.estado || '';
      _search = f.search || '';
      render();
    }
  }));

  if(filtered.length === 0){
    t.appendChild(emptyState({
      iconName:'agenda',
      title: _items.length === 0 ? 'Sin citas' : 'Sin resultados',
      message: _items.length === 0 ? 'Planifica tu primera cita.' : 'Cambia los filtros.',
      columns: ['Fecha','Hora plan','Hora real','Matrícula','Conductor','Empresa','Hall','Estado','Acciones']
    }));
    return;
  }

  const columns = [
    { id:'fecha',     label:'Fecha',     render: a => { const f = a.fechaPlanificada ? (a.fechaPlanificada.toDate ? a.fechaPlanificada.toDate() : new Date(a.fechaPlanificada)) : null; return el('span', { class:'cell-mute' }, f ? fmtDate(f) : '—'); } },
    { id:'horaPlanificada', label:'Hora plan', render: a => el('span', { class:'cell-strong' }, a.horaPlanificada || '—') },
    { id:'horaReal',  label:'Hora real', render: a => {
        const wrap = el('span', {});
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
        if(a.horaReal) wrap.appendChild(el('span', {}, a.horaReal));
        if(desfase) wrap.appendChild(desfase);
        if(!a.horaReal && !desfase) wrap.appendChild(el('span', { class:'cell-mute' }, '—'));
        return wrap;
      }
    },
    { id:'matricula', label:'Matrícula', render: a => el('span', { class:'cell-plate' }, a.matricula || '—') },
    { id:'conductor', label:'Conductor', render: a => a.conductor || '—' },
    { id:'empresa',   label:'Empresa',   render: a => el('span', { class:'cell-mute' }, a.empresa || '—') },
    { id:'hall',      label:'Hall',      render: a => a.hall || '—' },
    { id:'stand',     label:'Stand',     render: a => a.stand || '—', default:false },
    { id:'estado',    label:'Estado',    render: a => statusBadge(a.estado || 'planificado') },
    { id:'notas',     label:'Notas',     render: a => el('span', { class:'cell-mute' }, (a.notas || '').slice(0,30) || '—'), default:false }
  ];

  t.appendChild(smartTable({
    module:'agenda',
    columns, rows: filtered,
    detailRenderer: a => {
      const ev = _eventos.find(e => e.id === a.eventoId);
      const dl = el('div', { style:{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px 24px', fontSize:'13px'} });
      const cell = (label, value) => el('div', {},
        el('span', { class:'cell-mute', style:{fontSize:'11px', textTransform:'uppercase', display:'block'} }, label),
        el('span', { style:{fontWeight:500} }, String(value || '—'))
      );
      dl.appendChild(cell('Evento', ev?.nombre));
      dl.appendChild(cell('Matrícula', a.matricula));
      dl.appendChild(cell('Conductor', a.conductor));
      dl.appendChild(cell('Empresa', a.empresa));
      dl.appendChild(cell('Hall · Stand', `${a.hall || '—'} · ${a.stand || '—'}`));
      dl.appendChild(cell('Hora plan', a.horaPlanificada));
      dl.appendChild(cell('Hora real', a.horaReal));
      dl.appendChild(cell('Estado', a.estado));
      dl.appendChild(cell('Notas', a.notas));
      return dl;
    },
    rowActions: a => rowActions(a, p)
  }));
}

function rowActions(a, p){
  const wrap = el('div', { class:'row-actions' });
  if(canEdit(p) && a.estado === 'planificado'){
    wrap.appendChild(el('button', { class:'btn btn-secondary btn-icon', title:'Marcar llegado',
      onclick: () => marcarLlegado(a) }, el('span', { html: icon('check') })));
  }
  if(canEdit(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => openForm(a), title:'Editar' },
      el('span', { html: icon('edit') })));
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => printRecord('agenda', a), title:'Imprimir pase' },
      el('span', { html: icon('print') })));
  }
  if(canDelete(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => deleteItem(a), title:'Eliminar' },
      el('span', { html: icon('trash') })));
  }
  return wrap;
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
    estado:'planificado', notas:'',
    requisitos:[], gastos:[]
  };
  // Estado mutable interno para checklist y gastos
  let _reqs = (data.requisitos || []).map(r => typeof r === 'string' ? { text:r, done:false } : r);
  let _gastos = data.gastos || [];

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
      notas: fd.notas || '',
      requisitos: _reqs,
      gastos: _gastos,
      gastoTotal: _gastos.reduce((acc, g) => acc + (Number(g.importe) || 0), 0)
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

  // ── Sección Checklist de requisitos ──
  const reqSection = el('div', { class:'form-section' });
  reqSection.appendChild(el('div', { class:'form-section-head' }, '✓ Requisitos / Checklist'));
  const reqList = el('div', { class:'req-list' });
  const renderReqs = () => {
    clear(reqList);
    _reqs.forEach((r, idx) => {
      reqList.appendChild(el('div', { class:`req-item ${r.done ? 'done' : ''}` },
        el('input', {
          type:'checkbox', checked: r.done ? 'checked' : null,
          onchange: e => { _reqs[idx].done = e.target.checked; renderReqs(); }
        }),
        el('input', {
          type:'text', value: r.text, class:'req-text',
          oninput: e => { _reqs[idx].text = e.target.value; }
        }),
        el('button', { type:'button', class:'btn-icon btn-ghost', onclick: () => { _reqs.splice(idx, 1); renderReqs(); }, title:'Quitar' }, '✕')
      ));
    });
  };
  renderReqs();
  reqSection.appendChild(reqList);
  // Botones añadir comunes
  const addReqRow = el('div', { class:'flex gap-2', style:{flexWrap:'wrap', marginTop:'8px'} });
  for(const sugg of ['Papeles del conductor','ITV vehículo','Seguro al día','Tacógrafo','CMR firmado']){
    addReqRow.appendChild(el('button', {
      type:'button', class:'btn btn-ghost btn-sm',
      onclick: () => { _reqs.push({ text: sugg, done:false }); renderReqs(); }
    }, '+ ' + sugg));
  }
  addReqRow.appendChild(el('button', {
    type:'button', class:'btn btn-secondary btn-sm',
    onclick: () => { _reqs.push({ text:'', done:false }); renderReqs(); }
  }, '+ Personalizado'));
  reqSection.appendChild(addReqRow);
  form.appendChild(reqSection);

  // ── Sección Gastos ──
  const gastosSection = el('div', { class:'form-section' });
  gastosSection.appendChild(el('div', { class:'form-section-head' }, '💰 Gastos asociados'));
  const gastosList = el('div', { class:'gastos-list' });
  const totalSpan = el('span', { class:'gasto-total' }, '0 €');
  const renderGastos = () => {
    clear(gastosList);
    let total = 0;
    _gastos.forEach((g, idx) => {
      total += Number(g.importe) || 0;
      gastosList.appendChild(el('div', { class:'gasto-item' },
        el('select', {
          class:'select',
          onchange: e => { _gastos[idx].tipo = e.target.value; }
        },
          ...['peaje','dieta','combustible','descarga','aparcamiento','otros'].map(t =>
            el('option', { value:t, selected: g.tipo === t ? 'selected' : null }, t.charAt(0).toUpperCase() + t.slice(1))
          )
        ),
        el('input', {
          type:'text', class:'field-input', placeholder:'Concepto',
          value: g.concepto || '',
          oninput: e => { _gastos[idx].concepto = e.target.value; }
        }),
        el('input', {
          type:'number', step:'0.01', class:'field-input gasto-importe',
          placeholder:'0.00', value: g.importe || '',
          oninput: e => { _gastos[idx].importe = Number(e.target.value) || 0; renderGastos(); }
        }),
        el('span', {}, '€'),
        el('button', { type:'button', class:'btn-icon btn-ghost', onclick: () => { _gastos.splice(idx, 1); renderGastos(); } }, '✕')
      ));
    });
    totalSpan.textContent = total.toFixed(2) + ' €';
  };
  renderGastos();
  gastosSection.appendChild(gastosList);
  gastosSection.appendChild(el('div', { class:'gastos-foot' },
    el('button', {
      type:'button', class:'btn btn-secondary btn-sm',
      onclick: () => { _gastos.push({ tipo:'peaje', concepto:'', importe:0 }); renderGastos(); }
    }, '+ Añadir gasto'),
    el('span', {}, 'Total:'),
    totalSpan
  ));
  form.appendChild(gastosSection);

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
