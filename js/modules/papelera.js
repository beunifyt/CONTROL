// papelera.js — Gestión de soft-deleted (papelera con restauración)
import { el, clear, icon, toast, confirmModal } from '../utils.js';
import { listLive, unregisterListenersByPrefix } from '../db.js';
import { restore, purge } from '../audit.js';
import { pageHeader, emptyState, selectInput } from './shared.js';
import { canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { logger } from '../logger.js';

let _container = null;
let _items = {};
let _modulo = 'referencias';
const COLECCIONES = ['referencias','ingresos','agenda','recintos','eventos','conductores','empresas','flota','mensajes'];
const KEY_PREFIX = 'mod:papelera:';

export async function init(container){
  _container = container;
  render();
  loadAll();
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  _container = null;
}

function loadAll(){
  for(const coll of COLECCIONES){
    listLive(coll, {
      key: KEY_PREFIX + coll,
      includeDeleted: true,
      orderBy: '_deletedAt', order: 'desc', limit: 200
    }, (items) => {
      _items[coll] = items.filter(i => i._deleted);
      render();
    });
  }
}

function render(){
  if(!_container) return;
  clear(_container);
  const p = getCurrentProfile();
  if(!canDelete(p)){
    _container.appendChild(emptyState({
      iconName:'trash', title:'Sin acceso',
      message:'Solo usuarios con permiso de borrado pueden ver la papelera.'
    }));
    return;
  }

  _container.appendChild(pageHeader({
    title:'Papelera',
    sub:'Registros eliminados — restaurar o borrar permanentemente'
  }));

  // Tabs por colección con contador
  const tabs = el('div', { class:'role-tabs', style:{marginBottom:'12px',flexWrap:'wrap'} });
  for(const c of COLECCIONES){
    const count = (_items[c] || []).length;
    tabs.appendChild(el('button', {
      class:`role-tab ${_modulo === c ? 'active' : ''}`,
      onclick: () => { _modulo = c; render(); }
    }, `${c} (${count})`));
  }
  _container.appendChild(tabs);

  const items = _items[_modulo] || [];
  if(items.length === 0){
    _container.appendChild(emptyState({
      iconName:'inbox', title:`Sin elementos eliminados en ${_modulo}`,
      message:'Los elementos borrados aparecerán aquí.'
    }));
    return;
  }

  const wrap = el('div', { class:'table-wrap' });
  const tbl = el('table', { class:'table' });
  tbl.appendChild(el('thead', {}, el('tr', {},
    el('th',{},'Resumen'), el('th',{},'Eliminado por'),
    el('th',{},'Fecha'), el('th',{},'Acciones')
  )));
  const tb = el('tbody');
  for(const it of items){
    const fecha = it._deletedAt?.toDate ? it._deletedAt.toDate() : null;
    const resumen = it.matricula || it.nombre || it.titulo || it.referencia || it.id;
    const sub = [it.empresa, it.hall ? `Hall ${it.hall}` : '', it.posicion ? `Pos. ${it.posicion}` : ''].filter(Boolean).join(' · ');
    tb.appendChild(el('tr', {},
      el('td', {},
        el('div', { class:'cell-strong' }, resumen),
        sub ? el('div', { class:'cell-mute' }, sub) : null
      ),
      el('td', { class:'cell-mute' }, it._deletedBy || '—'),
      el('td', { class:'cell-mute' }, fecha ? fecha.toLocaleString() : '—'),
      el('td', {}, el('div', { class:'row-actions' },
        el('button', {
          class:'btn btn-secondary btn-sm',
          onclick: () => doRestore(_modulo, it.id),
          title:'Restaurar'
        }, '↩'),
        el('button', {
          class:'btn btn-danger btn-sm',
          onclick: () => doPurge(_modulo, it.id, resumen),
          title:'Eliminar permanente'
        }, el('span', { html: icon('trash') }))
      ))
    ));
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  _container.appendChild(wrap);
}

async function doRestore(coll, id){
  try{ await restore(coll, id); toast('Restaurado', 'ok'); }
  catch(e){ toast(e.message, 'err'); }
}

async function doPurge(coll, id, label){
  const ok = await confirmModal({
    title:'Eliminar permanente',
    message:`¿Eliminar permanentemente "${label}"? Esta acción NO se puede deshacer.`,
    danger:true, okText:'Eliminar permanente'
  });
  if(!ok) return;
  try{ await purge(coll, id); toast('Eliminado permanente', 'ok'); }
  catch(e){ toast(e.message, 'err'); }
}
