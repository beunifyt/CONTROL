// mensajes.js — mensajería interna (urgente / alerta / info)
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, fmtRelative } from '../utils.js';
import { listLive, create, update, remove, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';

let _container = null;
let _items = [];
const KEY_PREFIX = 'mod:mensajes:';

// ═══════════════════════════════════════════════════════════════
// MENSAJES AUTOMÁTICOS DEL SISTEMA
// Cualquier módulo puede llamar autoMsg() para generar un aviso.
// Dedupe: no repite el mismo (clave) en una ventana de minutos.
// ═══════════════════════════════════════════════════════════════
const _autoMsgSeen = new Map(); // clave → timestamp

export async function autoMsg({ titulo, texto, tipo = 'info', linkedColl = null, linkedId = null, dedupeKey = null, dedupeMin = 30 }){
  try{
    if(dedupeKey){
      const last = _autoMsgSeen.get(dedupeKey);
      if(last && (Date.now() - last) < dedupeMin * 60000){
        return false; // ya avisado recientemente
      }
      _autoMsgSeen.set(dedupeKey, Date.now());
    }
    await create('mensajes', {
      titulo, texto, tipo,
      linkedColl, linkedId,
      de: 'Sistema',
      auto: true,
      leido: false
    });
    return true;
  } catch(e){
    return false;
  }
}

export async function init(container){
  _container = container;
  render();
  listLive('mensajes', { key: KEY_PREFIX+'all', orderBy:'createdAt', order:'desc' }, (items) => {
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
      onclick: () => openForm()
    }, el('span', { html: icon('plus') }), 'Nuevo mensaje'));
  }

  _container.appendChild(pageHeader({
    title:'Mensajes',
    sub:'Comunicación interna del equipo',
    actions
  }));

  if(_items.length === 0){
    _container.appendChild(emptyState({
      iconName:'mensajes', title:'Sin mensajes',
      message:'Los mensajes del equipo aparecerán aquí.'
    }));
    return;
  }

  const wrap = el('div', { class:'flex flex-col gap-2' });
  for(const m of _items){
    const card = el('div', { class:`msg-card ${m.tipo || 'info'}` },
      el('div', { class:'msg-icon', html: icon(m.tipo === 'urgente' ? 'urgent' : m.tipo === 'alerta' ? 'alert' : 'info') }),
      el('div', { class:'msg-body' },
        el('div', { class:'msg-title' }, m.titulo || '—'),
        el('div', { class:'msg-text' }, m.texto || ''),
        el('div', { class:'msg-meta' },
          el('span', {}, m.de || 'Sistema'),
          el('span', {}, fmtRelative(m.createdAt)),
          m.leido ? el('span', { class:'badge badge-gray' }, 'Leído') : el('span', { class:'badge badge-blue' }, 'Nuevo')
        )
      ),
      el('div', { class:'flex gap-2', style:{flexShrink:0} },
        canEdit(p) && !m.leido ? el('button', { class:'btn btn-ghost btn-icon', title:'Marcar leído', onclick: () => marcarLeido(m) },
          el('span', { html: icon('check') })) : null,
        canDelete(p) ? el('button', { class:'btn btn-ghost btn-icon', title:'Eliminar', onclick: () => deleteItem(m) },
          el('span', { html: icon('trash') })) : null
      )
    );
    wrap.appendChild(card);
  }
  _container.appendChild(wrap);
}

async function marcarLeido(m){
  try{ await update('mensajes', m.id, { leido:true }); }
  catch(e){ toast(e.message, 'err'); }
}

function openForm(){
  const p = getCurrentProfile();
  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    try{
      await create('mensajes', {
        titulo: fd.titulo, texto: fd.texto,
        tipo: fd.tipo || 'info',
        linkedColl: fd.linkedColl || null,
        linkedId: fd.linkedId || null,
        de: p?.displayName || p?.email || 'Sistema',
        leido: false
      });
      toast('Mensaje enviado', 'ok');
      closeModal();
    } catch(e){ toast(e.message, 'err'); }
  }});

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Título', name:'titulo', required:true, full:true }));
  grid.appendChild(formField({ label:'Tipo', name:'tipo', value:'info', options:[
    { value:'info', label:'Información' },
    { value:'alerta', label:'Alerta' },
    { value:'urgente', label:'Urgente' }
  ], full:true }));
  grid.appendChild(formField({ label:'Mensaje', name:'texto', type:'textarea', required:true, full:true }));
  // Anclar a registro (opcional)
  grid.appendChild(formField({ label:'Anclar a (módulo)', name:'linkedColl', value:'', options:[
    { value:'', label:'No anclado' },
    { value:'referencias', label:'Referencias' },
    { value:'ingresos', label:'Ingresos' }
  ], full:true }));
  grid.appendChild(formField({ label:'ID del registro', name:'linkedId', value:'', placeholder:'(opcional)', full:true }));
  form.appendChild(grid);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary', onclick: () => form.requestSubmit() }, 'Enviar')
  );

  openModal({ title:'Nuevo mensaje', body:form });
  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title:'Eliminar mensaje', message:'¿Eliminar este mensaje?',
    danger:true, okText:'Eliminar'
  });
  if(!ok) return;
  try{ await remove('mensajes', item.id); toast('Eliminado', 'ok'); }
  catch(e){ toast(e.message, 'err'); }
}
