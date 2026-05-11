// ═══════════════════════════════════════════════════════════════
// tracking.js — Página pública de seguimiento (sin login)
//
// Accedida con URL ?track=MATRICULA
// Muestra estado actual del vehículo + mensajes asociados.
//
// NOTA: para que funcione sin login, necesita reglas Firestore
// que permitan lectura pública de un subset de campos.
// Por ahora usa la API normal (requiere login). Pendiente:
// crear collection `pases_publicos` con copia anonimizada.
// ═══════════════════════════════════════════════════════════════

import { el, clear, icon, toast } from '../utils.js';
import { list, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, statusBadge } from './shared.js';
import { logger } from '../logger.js';

let _container = null;
const KEY_PREFIX = 'mod:tracking:';

export async function init(container){
  _container = container;
  render();
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  _container = null;
}

async function render(){
  if(!_container) return;
  clear(_container);

  // Leer ?track= de la URL
  const params = new URLSearchParams(location.hash.includes('?') ? location.hash.split('?')[1] : location.search);
  const plate = params.get('track');

  _container.appendChild(pageHeader({
    title:'🔍 Seguimiento de vehículo',
    sub: plate ? `Matrícula: ${plate}` : 'Indica una matrícula en la URL: ?track=XXXX'
  }));

  if(!plate){
    _container.appendChild(emptyState({
      iconName:'search', title:'Indica la matrícula',
      message:'Modifica la URL añadiendo ?track=MATRICULA al final.'
    }));
    return;
  }

  try{
    const [refs, ings] = await Promise.all([
      list('referencias', {where:{matricula: plate}, orderBy:'createdAt', order:'desc', limit:5}),
      list('ingresos', {where:{matricula: plate}, orderBy:'createdAt', order:'desc', limit:5})
    ]);
    const all = [...refs, ...ings].sort((a,b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });

    if(all.length === 0){
      _container.appendChild(emptyState({
        iconName:'inbox', title:'Sin registros',
        message:`No hay registros para la matrícula ${plate}.`
      }));
      return;
    }

    const wrap = el('div', {class:'panel', style:{padding:'20px'}});
    wrap.appendChild(el('h3', {style:{margin:'0 0 16px'}}, `Historial de ${plate}`));

    for(const r of all){
      const fecha = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : '—';
      const card = el('div', {style:{
        padding:'12px 16px', marginBottom:'8px',
        background:'var(--surface-2)', borderRadius:'8px',
        borderLeft:'4px solid var(--primary)'
      }});
      card.appendChild(el('div', {class:'cell-strong'}, `${r.empresa || 'Sin empresa'} · Pos. ${r.posicion || '—'}`));
      card.appendChild(el('div', {class:'cell-mute', style:{fontSize:'12px', marginTop:'4px'}},
        `${fecha} · Hall ${r.hall || '—'} · Stand ${r.stand || '—'}`));
      card.appendChild(el('div', {style:{marginTop:'8px'}}, statusBadge(r.estado || 'dentro')));
      wrap.appendChild(card);
    }

    _container.appendChild(wrap);
  } catch(e){
    logger.error('Tracking falló', {error: e.message});
    _container.appendChild(emptyState({
      iconName:'alert', title:'Error',
      message: e.message
    }));
  }
}
