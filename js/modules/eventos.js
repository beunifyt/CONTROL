// eventos.js — gestión de eventos
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, fmtDate } from '../utils.js';
import { listLive, list, create, update, remove, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';

let _container = null;
let _items = [];
let _recintos = [];
const KEY_PREFIX = 'mod:eventos:';

export async function init(container){
  _container = container;
  _recintos = await list('recintos', { orderBy:'nombre' });
  render();
  listLive('eventos', { key: KEY_PREFIX+'all', orderBy:'createdAt', order:'desc' }, (items) => {
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
    }, el('span', { html: icon('plus') }), 'Nuevo Evento'));
  }

  _container.appendChild(pageHeader({
    title:'Eventos',
    sub:'Ferias y eventos vinculados a recintos',
    actions
  }));

  if(_items.length === 0){
    _container.appendChild(emptyState({
      iconName:'eventos',
      title:'Sin eventos',
      message:'Crea tu primer evento para empezar a registrar referencias e ingresos.'
    }));
    return;
  }

  const cards = el('div', { class:'cards-grid' });
  for(const ev of _items){
    const recinto = _recintos.find(r => r.id === ev.recintoId);
    const card = el('div', { class:'entity-card' },
      el('div', { class:'entity-card-head' },
        el('div', {},
          el('h3', { class:'entity-card-title' }, ev.nombre || '—'),
          el('div', { class:'entity-card-sub' }, recinto?.nombre || '—')
        ),
        el('span', { class:`badge badge-${ev.estado === 'activo' ? 'green' : ev.estado === 'planificado' ? 'blue' : ev.estado === 'finalizado' ? 'gray' : 'red'}` },
          ev.estado === 'activo' ? 'Activo' :
          ev.estado === 'planificado' ? 'Planificado' :
          ev.estado === 'finalizado' ? 'Finalizado' : 'Cancelado')
      ),
      el('div', { class:'cell-mute' },
        ev.fechaInicio ? `${fmtDate(ev.fechaInicio)} → ${fmtDate(ev.fechaFin) || '—'}` : 'Sin fechas'),
      ev.previsionVehiculos ? el('div', { class:'cell-mute' }, `Previsión: ${ev.previsionVehiculos} vehículos`) : null,
      el('div', { class:'entity-card-foot' },
        canEdit(p) ? el('button', { class:'btn btn-secondary btn-sm', onclick: () => toggleActivo(ev) }, ev.estado === 'activo' ? 'Desactivar' : 'Activar') : null,
        canEdit(p) ? el('button', { class:'btn btn-secondary btn-sm', onclick: () => openForm(ev) },
          el('span', { html: icon('edit') })
        ) : null,
        canDelete(p) ? el('button', { class:'btn btn-danger btn-sm', onclick: () => deleteItem(ev) },
          el('span', { html: icon('trash') })
        ) : null
      )
    );
    cards.appendChild(card);
  }
  _container.appendChild(cards);
}

async function toggleActivo(ev){
  try{
    if(ev.estado === 'activo'){
      await update('eventos', ev.id, { estado: 'planificado' });
    } else {
      // Sólo un activo a la vez
      for(const otro of _items){
        if(otro.id !== ev.id && otro.estado === 'activo'){
          await update('eventos', otro.id, { estado: 'planificado' });
        }
      }
      await update('eventos', ev.id, { estado: 'activo' });
    }
  } catch(e){ toast(e.message, 'err'); }
}

function openForm(item){
  const isEdit = !!item;
  const data = item || { nombre:'', recintoId:'', fechaInicio:'', fechaFin:'', estado:'planificado', previsionVehiculos:0, descripcion:'' };

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    try{
      const payload = {
        nombre: fd.nombre,
        recintoId: fd.recintoId || null,
        fechaInicio: fd.fechaInicio ? new Date(fd.fechaInicio) : null,
        fechaFin: fd.fechaFin ? new Date(fd.fechaFin) : null,
        estado: fd.estado || 'planificado',
        previsionVehiculos: Number(fd.previsionVehiculos) || 0,
        descripcion: fd.descripcion || ''
      };
      if(isEdit) await update('eventos', item.id, payload);
      else await create('eventos', payload);
      toast('Guardado', 'ok');
      closeModal();
    } catch(e){
      toast(e.message || 'Error', 'err');
    }
  }});

  const recintoOpts = [{ value:'', label:'Seleccionar recinto' }, ..._recintos.map(r => ({ value:r.id, label:r.nombre }))];
  const fechaInicioStr = data.fechaInicio ? (data.fechaInicio.toDate ? data.fechaInicio.toDate() : new Date(data.fechaInicio)).toISOString().slice(0,10) : '';
  const fechaFinStr = data.fechaFin ? (data.fechaFin.toDate ? data.fechaFin.toDate() : new Date(data.fechaFin)).toISOString().slice(0,10) : '';

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Nombre', name:'nombre', value:data.nombre, required:true, full:true }));
  grid.appendChild(formField({ label:'Recinto', name:'recintoId', value:data.recintoId, options: recintoOpts, full:true }));
  grid.appendChild(formField({ label:'Fecha inicio', name:'fechaInicio', type:'date', value: fechaInicioStr }));
  grid.appendChild(formField({ label:'Fecha fin', name:'fechaFin', type:'date', value: fechaFinStr }));
  grid.appendChild(formField({ label:'Estado', name:'estado', value:data.estado, options:[
    { value:'planificado', label:'Planificado' },
    { value:'activo', label:'Activo' },
    { value:'finalizado', label:'Finalizado' },
    { value:'cancelado', label:'Cancelado' }
  ]}));
  grid.appendChild(formField({ label:'Previsión vehículos', name:'previsionVehiculos', type:'number', value:data.previsionVehiculos }));
  grid.appendChild(formField({ label:'Descripción', name:'descripcion', value:data.descripcion, type:'textarea', full:true }));
  form.appendChild(grid);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary' }, 'Guardar')
  );

  openModal({
    title: isEdit ? 'Editar evento' : 'Nuevo evento',
    body: form,
    size:'lg'
  });

  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title: 'Eliminar evento',
    message: `¿Eliminar "${item.nombre}"? Las referencias y ingresos asociados quedarán sin evento.`,
    danger: true, okText: 'Eliminar'
  });
  if(!ok) return;
  try{
    await remove('eventos', item.id);
    toast('Eliminado', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}
