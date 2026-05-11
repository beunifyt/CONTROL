// conductores.js — base de conductores con idiomas y matrículas habituales
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, matchesSearch, initials } from '../utils.js';
import { listLive, create, update, remove, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, searchInput, excelButtons } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';

let _container = null;
let _items = [];
let _search = '';
const KEY_PREFIX = 'mod:conductores:';

export async function init(container){
  _container = container;
  render();
  listLive('conductores', { key: KEY_PREFIX+'all', orderBy:'nombre' }, (items) => {
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
    }, el('span', { html: icon('plus') }), 'Nuevo conductor'));
  }
  actions.push(...excelButtons('conductores', { canImport: canCreate(p), canExport: true }));

  _container.appendChild(pageHeader({
    title:'Conductores',
    sub:'Base de conductores con idiomas y matrículas habituales',
    actions
  }));

  _container.appendChild(el('div', { class:'filter-row' },
    searchInput({ placeholder:'Buscar nombre, DNI, teléfono…', onInput: v => { _search = v; renderGrid(); } })
  ));

  const grid = el('div', { id:'conductores-grid' });
  _container.appendChild(grid);
  renderGrid();
}

function renderGrid(){
  const grid = document.getElementById('conductores-grid');
  if(!grid) return;
  clear(grid);
  const p = getCurrentProfile();

  const filtered = _items.filter(c => matchesSearch(_search, c.nombre, c.dni, c.telefono, c.empresa));

  if(filtered.length === 0){
    grid.appendChild(emptyState({
      iconName:'conductores',
      title: _items.length === 0 ? 'Sin conductores' : 'Sin resultados',
      message: _items.length === 0 ? 'Añade el primer conductor.' : 'Prueba con otro término.'
    }));
    return;
  }

  const cards = el('div', { class:'cards-grid' });
  for(const c of filtered){
    const card = el('div', { class:'entity-card' },
      el('div', { class:'entity-card-head' },
        el('div', { class:'flex gap-3 items-center' },
          el('div', { class:'user-avatar', style:{background:'var(--primary)', width:'40px', height:'40px'} }, initials(c.nombre)),
          el('div', {},
            el('h3', { class:'entity-card-title' }, c.nombre || '—'),
            el('div', { class:'entity-card-sub' }, c.empresa || '')
          )
        )
      ),
      c.dni ? el('div', { class:'cell-mute' }, `DNI: ${c.dni}`) : null,
      c.telefono ? el('div', { class:'cell-mute' },
        el('a', { href:`tel:${c.telefono}`, class:'tel-link' }, c.telefono)
      ) : null,
      c.idiomas?.length ? el('div', { class:'flex gap-2', style:{flexWrap:'wrap'} },
        ...c.idiomas.map(idi => el('span', { class:'chip' }, idi))
      ) : null,
      c.matriculas?.length ? el('div', { class:'flex gap-2', style:{flexWrap:'wrap'} },
        ...c.matriculas.map(m => el('span', { class:'chip', style:{color:'var(--primary)'} }, m))
      ) : null,
      el('div', { class:'entity-card-foot' },
        canEdit(p) ? el('button', { class:'btn btn-secondary btn-sm', onclick: () => openForm(c) },
          el('span', { html: icon('edit') }), 'Editar'
        ) : null,
        canDelete(p) ? el('button', { class:'btn btn-danger btn-sm', onclick: () => deleteItem(c) },
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
  const data = item || { nombre:'', dni:'', telefono:'', email:'', empresa:'', idiomas:[], matriculas:[], notas:'' };

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    const idiomas = String(fd.idiomas || '').split(',').map(s => s.trim()).filter(Boolean);
    const matriculas = String(fd.matriculas || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const payload = {
      nombre: fd.nombre, dni: fd.dni, telefono: fd.telefono, email: fd.email,
      empresa: fd.empresa, notas: fd.notas, idiomas, matriculas
    };
    try{
      if(isEdit) await update('conductores', item.id, payload);
      else await create('conductores', payload);
      toast('Guardado', 'ok');
      closeModal();
    } catch(e){ toast(e.message, 'err'); }
  }});

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Nombre', name:'nombre', value:data.nombre, required:true, full:true }));
  grid.appendChild(formField({ label:'DNI / NIE / Pasaporte', name:'dni', value:data.dni }));
  grid.appendChild(formField({ label:'Teléfono', name:'telefono', value:data.telefono }));
  grid.appendChild(formField({ label:'Email', name:'email', type:'email', value:data.email }));
  grid.appendChild(formField({ label:'Empresa', name:'empresa', value:data.empresa }));
  grid.appendChild(formField({ label:'Idiomas (ej: ES, EN, FR)', name:'idiomas', value:(data.idiomas||[]).join(', '), full:true }));
  grid.appendChild(formField({ label:'Matrículas habituales (separadas por comas)', name:'matriculas', value:(data.matriculas||[]).join(', '), full:true }));
  grid.appendChild(formField({ label:'Notas', name:'notas', type:'textarea', value:data.notas, full:true }));
  form.appendChild(grid);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary' }, 'Guardar')
  );

  openModal({ title: isEdit ? 'Editar conductor' : 'Nuevo conductor', body: form, size:'lg' });
  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title:'Eliminar conductor', message:`¿Eliminar a "${item.nombre}"?`,
    danger:true, okText:'Eliminar'
  });
  if(!ok) return;
  try{ await remove('conductores', item.id); toast('Eliminado', 'ok'); }
  catch(e){ toast(e.message, 'err'); }
}
