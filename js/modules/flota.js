// flota.js — vehículos por empresa con estados
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, matchesSearch } from '../utils.js';
import { listLive, list, create, update, remove, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, searchInput, selectInput, statusBadge, excelButtons } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { smartTable, savedFiltersBar } from '../table-helpers.js';

let _container = null;
let _items = [];
let _empresas = [];
let _search = '';
let _filterEmpresa = '';
let _filterEstado = '';
const KEY_PREFIX = 'mod:flota:';

export async function init(container){
  _container = container;
  _empresas = await list('empresas', { orderBy:'nombre' });
  render();
  listLive('flota', { key: KEY_PREFIX+'all', orderBy:'matricula' }, (items) => {
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
    }, el('span', { html: icon('plus') }), 'Nuevo vehículo'));
  }
  actions.push(...excelButtons('flota', { canImport: canCreate(p), canExport: true }));

  _container.appendChild(pageHeader({
    title:'Flota',
    sub:'Vehículos asociados a empresas',
    actions
  }));

  const filterRow = el('div', { class:'filter-row' });
  filterRow.appendChild(searchInput({ placeholder:'Buscar matrícula, modelo…', onInput: v => { _search = v; renderTable(); } }));
  filterRow.appendChild(selectInput({
    value: _filterEmpresa,
    options: [{ value:'', label:'Todas las empresas' }, ..._empresas.map(e => ({ value:e.id, label:e.nombre }))],
    onChange: v => { _filterEmpresa = v; renderTable(); }
  }));
  filterRow.appendChild(selectInput({
    value: _filterEstado,
    options: [
      { value:'', label:'Todos los estados' },
      { value:'almacen', label:'En almacén' },
      { value:'en_ruta', label:'En ruta' }
    ],
    onChange: v => { _filterEstado = v; renderTable(); }
  }));
  _container.appendChild(filterRow);

  const tableContainer = el('div', { id:'flota-table' });
  _container.appendChild(tableContainer);
  renderTable();
}

function renderTable(){
  const t = document.getElementById('flota-table');
  if(!t) return;
  clear(t);
  const p = getCurrentProfile();

  let filtered = _items;
  if(_filterEmpresa) filtered = filtered.filter(v => v.empresaId === _filterEmpresa);
  if(_filterEstado)  filtered = filtered.filter(v => v.estado === _filterEstado);
  if(_search)        filtered = filtered.filter(v => matchesSearch(_search, v.matricula, v.modelo, v.marca));

  t.appendChild(savedFiltersBar({
    module:'flota',
    currentFilters: { empresaId:_filterEmpresa, estado:_filterEstado, search:_search },
    onApply: f => {
      if(f === null){ renderTable(); return; }
      _filterEmpresa = f.empresaId || '';
      _filterEstado = f.estado || '';
      _search = f.search || '';
      render();
    }
  }));

  if(filtered.length === 0){
    t.appendChild(emptyState({
      iconName:'flota',
      title: _items.length === 0 ? 'Sin vehículos' : 'Sin resultados',
      message: _items.length === 0 ? 'Registra tu primer vehículo.' : 'Cambia los filtros.',
      columns: ['Matrícula','Tipo','Marca/Modelo','Empresa','Estado','Tacógrafo','Acciones']
    }));
    return;
  }

  const columns = [
    { id:'matricula', label:'Matrícula', render: v => el('span', { class:'cell-plate' }, v.matricula || '—') },
    { id:'remolque',  label:'Remolque',  render: v => v.remolque || '—', default:false },
    { id:'tipo',      label:'Tipo',      render: v => el('span', { class:'cell-mute' }, v.tipo || '—') },
    { id:'marcaModelo', label:'Marca/Modelo', render: v => [v.marca, v.modelo].filter(Boolean).join(' ') || '—' },
    { id:'empresa',   label:'Empresa',   render: v => { const e = _empresas.find(x => x.id === v.empresaId); return el('span', { class:'cell-mute' }, e?.nombre || '—'); } },
    { id:'estado',    label:'Estado',    render: v => statusBadge(v.estado || 'almacen') },
    { id:'tacografo', label:'Tacógrafo', render: v => el('span', { class:'cell-mute' }, v.tacografo || '—') },
    { id:'notas',     label:'Notas',     render: v => el('span', { class:'cell-mute' }, (v.notas || '').slice(0,30) || '—'), default:false }
  ];

  t.appendChild(smartTable({
    module:'flota',
    columns, rows: filtered,
    detailRenderer: v => {
      const empresa = _empresas.find(e => e.id === v.empresaId);
      const dl = el('div', { style:{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'8px 24px', fontSize:'13px'} });
      const cell = (label, value) => el('div', {},
        el('span', { class:'cell-mute', style:{fontSize:'11px', textTransform:'uppercase', display:'block'} }, label),
        el('span', { style:{fontWeight:500} }, String(value || '—'))
      );
      dl.appendChild(cell('Matrícula', v.matricula));
      dl.appendChild(cell('Remolque', v.remolque));
      dl.appendChild(cell('Tipo', v.tipo));
      dl.appendChild(cell('Marca', v.marca));
      dl.appendChild(cell('Modelo', v.modelo));
      dl.appendChild(cell('Empresa', empresa?.nombre));
      dl.appendChild(cell('Estado', v.estado));
      dl.appendChild(cell('Tacógrafo', v.tacografo));
      dl.appendChild(cell('Notas', v.notas));
      return dl;
    },
    rowActions: v => rowActions(v, p)
  }));
}

function rowActions(v, p){
  const wrap = el('div', { class:'row-actions' });
  if(canEdit(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => openForm(v), title:'Editar' },
      el('span', { html: icon('edit') })));
  }
  if(canDelete(p)){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-icon', onclick: () => deleteItem(v), title:'Eliminar' },
      el('span', { html: icon('trash') })));
  }
  return wrap;
}

function openForm(item){
  const isEdit = !!item;
  const data = item || { matricula:'', remolque:'', tipo:'camion', marca:'', modelo:'', empresaId:'', estado:'almacen', tacografo:'', notas:'' };

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    const payload = {
      matricula: fd.matricula ? String(fd.matricula).toUpperCase() : '',
      remolque: fd.remolque ? String(fd.remolque).toUpperCase() : '',
      tipo: fd.tipo || 'camion',
      marca: fd.marca || '', modelo: fd.modelo || '',
      empresaId: fd.empresaId || null,
      estado: fd.estado || 'almacen',
      tacografo: fd.tacografo || '',
      tipoCarga: fd.tipoCarga || '',
      notas: fd.notas || ''
    };
    try{
      if(isEdit) await update('flota', item.id, payload);
      else await create('flota', payload);
      toast('Guardado', 'ok');
      closeModal();
    } catch(e){ toast(e.message, 'err'); }
  }});

  const empresaOpts = [{ value:'', label:'Sin empresa' }, ..._empresas.map(e => ({ value:e.id, label:e.nombre }))];

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Matrícula', name:'matricula', value:data.matricula, required:true }));
  grid.appendChild(formField({ label:'Remolque', name:'remolque', value:data.remolque }));
  grid.appendChild(formField({ label:'Tipo', name:'tipo', value:data.tipo, options:[
    { value:'camion', label:'Camión' },
    { value:'trailer', label:'Trailer' },
    { value:'furgoneta', label:'Furgoneta' },
    { value:'otro', label:'Otro' }
  ]}));
  grid.appendChild(formField({ label:'Marca', name:'marca', value:data.marca }));
  grid.appendChild(formField({ label:'Modelo', name:'modelo', value:data.modelo }));
  grid.appendChild(formField({ label:'Empresa', name:'empresaId', value:data.empresaId, options:empresaOpts, full:true }));
  grid.appendChild(formField({ label:'Estado', name:'estado', value:data.estado, options:[
    { value:'almacen', label:'En almacén' },
    { value:'en_ruta', label:'En ruta' }
  ]}));
  grid.appendChild(formField({ label:'Nº tacógrafo', name:'tacografo', value:data.tacografo }));
  grid.appendChild(formField({ label:'Tipo de carga', name:'tipoCarga', value:data.tipoCarga || '', placeholder:'Ej: refrigerada, peligrosa…' }));
  grid.appendChild(formField({ label:'Notas', name:'notas', type:'textarea', value:data.notas, full:true }));
  form.appendChild(grid);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary', onclick: () => form.requestSubmit() }, 'Guardar')
  );

  openModal({ title: isEdit ? 'Editar vehículo' : 'Nuevo vehículo', body: form, size:'lg' });
  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title:'Eliminar vehículo', message:`¿Eliminar matrícula ${item.matricula}?`,
    danger:true, okText:'Eliminar'
  });
  if(!ok) return;
  try{ await remove('flota', item.id); toast('Eliminado', 'ok'); }
  catch(e){ toast(e.message, 'err'); }
}
