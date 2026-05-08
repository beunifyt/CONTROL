// recintos.js — gestión de recintos
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, matchesSearch } from '../utils.js';
import { listLive, create, update, remove, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, searchInput } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';

let _container = null;
let _items = [];
let _search = '';
const KEY_PREFIX = 'mod:recintos:';

export async function init(container){
  _container = container;
  render();
  listLive('recintos', { key: KEY_PREFIX+'all', orderBy:'createdAt', order:'desc' }, (items) => {
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
    }, el('span', { html: icon('plus') }), 'Nuevo Recinto'));
  }

  _container.appendChild(pageHeader({
    title:'Recintos',
    sub:'Gestión de recintos y sus halls',
    actions
  }));

  _container.appendChild(el('div', { class:'filter-row' },
    searchInput({ placeholder:'Buscar recinto, ciudad…', onInput: v => { _search = v; renderGrid(); } })
  ));

  const grid = el('div', { id:'recintos-grid' });
  _container.appendChild(grid);
  renderGrid();
}

function renderGrid(){
  const grid = document.getElementById('recintos-grid');
  if(!grid) return;
  clear(grid);
  const p = getCurrentProfile();

  const filtered = _items.filter(r => matchesSearch(_search, r.nombre, r.ciudad, r.direccion));

  if(filtered.length === 0){
    grid.appendChild(emptyState({
      iconName:'recintos',
      title: _items.length === 0 ? 'Sin recintos' : 'Sin resultados',
      message: _items.length === 0 ? 'Crea tu primer recinto para empezar.' : 'Prueba con otro término.'
    }));
    return;
  }

  const cards = el('div', { class:'cards-grid' });
  for(const r of filtered){
    const halls = (r.halls || []).join(', ') || '—';
    const card = el('div', { class:'entity-card' },
      el('div', { class:'entity-card-head' },
        el('div', {},
          el('h3', { class:'entity-card-title' }, r.nombre || '—'),
          el('div', { class:'entity-card-sub' }, r.ciudad || '')
        ),
        el('span', { class:'badge badge-blue' }, `${(r.halls||[]).length} halls`)
      ),
      r.direccion ? el('div', { class:'cell-mute' }, r.direccion) : null,
      el('div', { class:'cell-mute', style:{fontSize:'12px'} }, `Halls: ${halls}`),
      el('div', { class:'entity-card-foot' },
        canEdit(p) ? el('button', { class:'btn btn-secondary btn-sm', onclick: () => openForm(r) },
          el('span', { html: icon('edit') }), 'Editar'
        ) : null,
        canDelete(p) ? el('button', { class:'btn btn-danger btn-sm', onclick: () => deleteItem(r) },
          el('span', { html: icon('trash') })
        ) : null
      )
    );
    cards.appendChild(card);
  }
  grid.appendChild(cards);
}

function openForm(item){
  const isEdit = !!item;
  const data = item || { nombre:'', ciudad:'', direccion:'', halls:[], puertas:[], email:'', notas:'' };

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    const halls = String(fd.halls || '').split(',').map(s => s.trim()).filter(Boolean);
    const puertas = String(fd.puertas || '').split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      nombre: fd.nombre, ciudad: fd.ciudad, direccion: fd.direccion,
      email: fd.email, notas: fd.notas,
      halls, puertas
    };
    try{
      if(isEdit) await update('recintos', item.id, payload);
      else await create('recintos', payload);
      toast('Guardado', 'ok');
      closeModal();
    } catch(e){
      toast(e.message || 'Error al guardar', 'err');
    }
  }});

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Nombre', name:'nombre', value:data.nombre, required:true, full:true, placeholder:'Ej: FIRA BARCELONA GRAN VIA' }));
  grid.appendChild(formField({ label:'Ciudad', name:'ciudad', value:data.ciudad, placeholder:'Barcelona' }));
  grid.appendChild(formField({ label:'Email', name:'email', value:data.email, type:'email', placeholder:'info@recinto.com' }));
  grid.appendChild(formField({ label:'Dirección', name:'direccion', value:data.direccion, full:true }));
  grid.appendChild(formField({ label:'Halls (separados por comas)', name:'halls', value:(data.halls||[]).join(', '), placeholder:'1, 2, 3, 4', full:true }));
  grid.appendChild(formField({ label:'Puertas (separadas por comas)', name:'puertas', value:(data.puertas||[]).join(', '), placeholder:'Norte, Sur, Este', full:true }));
  grid.appendChild(formField({ label:'Notas', name:'notas', value:data.notas, type:'textarea', full:true }));
  form.appendChild(grid);

  const footer = el('div', { class:'flex gap-2' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary' }, 'Guardar')
  );
  form.appendChild(footer);

  openModal({
    title: isEdit ? 'Editar recinto' : 'Nuevo recinto',
    body: form,
    size:'lg'
  });

  // Mover el footer fuera del form para que respete los estilos del modal
  setTimeout(() => {
    const f = form.querySelector('.flex.gap-2');
    if(f){
      const modalFoot = el('div', { class:'modal-foot' });
      modalFoot.appendChild(f);
      form.parentElement.appendChild(modalFoot);
    }
  }, 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title: 'Eliminar recinto',
    message: `¿Seguro que quieres eliminar "${item.nombre}"? Esta acción no se puede deshacer.`,
    danger: true,
    okText: 'Eliminar'
  });
  if(!ok) return;
  try{
    await remove('recintos', item.id);
    toast('Eliminado', 'ok');
  } catch(e){
    toast(e.message || 'Error al eliminar', 'err');
  }
}
