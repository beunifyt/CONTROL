// _shared.js — helpers comunes a todos los módulos
import { el, icon } from '../utils.js';

export function pageHeader({ title, sub, actions=[] }){
  return el('div', { class:'page-header' },
    el('div', {},
      el('h1', { class:'page-title' }, title),
      sub ? el('p', { class:'page-sub' }, sub) : null
    ),
    el('div', { class:'page-actions' }, ...actions)
  );
}

export function emptyState({ iconName='inbox', title='Sin datos', message='', action=null }){
  return el('div', { class:'empty' },
    el('div', { class:'empty-icon' }, el('span', { html: icon(iconName) })),
    el('div', { class:'empty-title' }, title),
    message ? el('div', { class:'empty-msg' }, message) : null,
    action
  );
}

export function statCard({ label, value, iconName='dashboard', color='blue' }){
  return el('div', { class:'stat-card' },
    el('div', { class:`stat-icon ${color}` }, el('span', { html: icon(iconName) })),
    el('div', { class:'stat-content' },
      el('div', { class:'stat-label' }, label),
      el('div', { class:'stat-value' }, String(value))
    )
  );
}

export function searchInput({ placeholder='Buscar…', onInput }){
  const wrap = el('div', { class:'search-box' },
    el('span', { html: icon('search') })
  );
  const input = el('input', { type:'search', placeholder, oninput:(e)=> onInput(e.target.value) });
  wrap.appendChild(input);
  return wrap;
}

export function selectInput({ value, options=[], onChange }){
  const sel = el('select', { class:'select', onchange:(e)=> onChange(e.target.value) });
  for(const o of options){
    const op = el('option', { value: o.value }, o.label);
    if(String(value) === String(o.value)) op.selected = true;
    sel.appendChild(op);
  }
  return sel;
}

export function badge(text, kind='gray'){
  return el('span', { class:`badge badge-${kind}` }, text);
}

export function statusBadge(status){
  const map = {
    'dentro_fira':    { label:'Dentro Fira',    kind:'green' },
    'rampa_parking':  { label:'Rampa/Parking',  kind:'amber' },
    'en_camino':      { label:'En camino',      kind:'blue' },
    'prerregistrado': { label:'Prerregistrado', kind:'purple' },
    'salida':         { label:'Salida',         kind:'gray' },
    'pendiente':      { label:'Pendiente',      kind:'amber' },
    'llegado':        { label:'Llegado',        kind:'green' },
    'planificado':    { label:'Planificado',    kind:'blue' },
    'activo':         { label:'Activo',         kind:'green' },
    'finalizado':     { label:'Finalizado',     kind:'gray' },
    'cancelado':      { label:'Cancelado',      kind:'red' },
    'dentro':         { label:'Dentro',         kind:'green' },
    'almacen':        { label:'Almacén',        kind:'gray' },
    'en_ruta':        { label:'En ruta',        kind:'blue' }
  };
  const m = map[status] || { label: status || '—', kind:'gray' };
  return badge(m.label, m.kind);
}
