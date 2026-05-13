// utils.js
export const $  = (sel, ctx=document) => ctx.querySelector(sel);
export const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

export function el(tag, attrs={}, ...children){
  const node = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(v == null || v === false) continue;
    if(k === 'class') node.className = v;
    else if(k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if(k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if(k === 'html') node.innerHTML = v;
    else if(v === true) node.setAttribute(k, '');
    else node.setAttribute(k, v);
  }
  for(const child of children.flat()){
    if(child == null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

export function setText(node, value){ node.textContent = value == null ? '' : String(value); }

export function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }

export function normalize(s){
  return (s == null ? '' : String(s)).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function matchesSearch(query, ...fields){
  const q = normalize(query).trim();
  if(!q) return true;
  return fields.some(f => normalize(f).includes(q));
}

export function normalizeEmail(e){ return (e || '').trim().toLowerCase(); }

export function initials(name){
  if(!name) return '·';
  const parts = String(name).trim().split(/\s+/);
  if(parts.length === 1) return parts[0].slice(0,2).toUpperCase();
  return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
}

export function fmtDate(d, lang='es'){
  if(!d) return '';
  const date = d.toDate ? d.toDate() : (d instanceof Date ? d : new Date(d));
  if(isNaN(date)) return '';
  return new Intl.DateTimeFormat(lang, { day:'2-digit', month:'2-digit', year:'numeric' }).format(date);
}

export function fmtTime(d){
  if(!d) return '';
  const date = d.toDate ? d.toDate() : (d instanceof Date ? d : new Date(d));
  if(isNaN(date)) return '';
  return date.toTimeString().slice(0,5);
}

export function fmtDateTime(d, lang='es'){
  if(!d) return '';
  const date = d.toDate ? d.toDate() : (d instanceof Date ? d : new Date(d));
  if(isNaN(date)) return '';
  return new Intl.DateTimeFormat(lang, {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  }).format(date);
}

export function fmtRelative(d, lang='es'){
  if(!d) return '';
  const date = d.toDate ? d.toDate() : (d instanceof Date ? d : new Date(d));
  if(isNaN(date)) return '';
  const diff = (Date.now() - date.getTime()) / 1000;
  if(diff < 60) return 'hace un momento';
  if(diff < 3600) return `hace ${Math.floor(diff/60)} min`;
  if(diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
  if(diff < 86400*7) return `hace ${Math.floor(diff/86400)} d`;
  return fmtDate(date, lang);
}

export function startOfDay(d=new Date()){
  const x = new Date(d);
  x.setHours(0,0,0,0);
  return x;
}

export function todayKey(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function genId(prefix=''){
  const r = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return prefix ? `${prefix}_${t}${r}` : `${t}${r}`;
}

export function debounce(fn, ms=200){
  let t;
  return function(...a){
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, a), ms);
  };
}

export function toast(msg, kind='', ms=2500){
  // Log automático según severidad del toast
  try{
    if(kind === 'err')      logger.error(`Toast: ${msg}`);
    else if(kind === 'warn') logger.warn(`Toast: ${msg}`);
    else if(kind === 'ok')   logger.ok(`Toast: ${msg}`);
    // info no se loguea para no llenar el panel
  } catch(_){}

  const root = document.getElementById('toast-root');
  if(!root) return;
  const t = el('div', { class:`toast ${kind ? 'toast-'+kind : ''}` }, String(msg));
  root.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity 0.2s';
    setTimeout(() => t.remove(), 200);
  }, ms);
}

let _activeModal = null;

export function openModal({ title='', body, footer=null, size='', onClose=null, locked=false }={}){
  closeModal();
  const root = document.getElementById('modal-root');

  const closeFn = () => {
    if(locked) return;
    closeModal();
    if(onClose) onClose();
  };

  const backdrop = el('div', {
    class:'modal-backdrop',
    onclick: (e) => { if(e.target === backdrop) closeFn(); }
  });

  const modal = el('div', { class:`modal ${size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : ''}` });
  if(title){
    modal.appendChild(el('div', { class:'modal-head' },
      el('h3', { class:'modal-title' }, title),
      el('button', { class:'modal-close', onclick: closeFn, 'aria-label':'Cerrar' },
        el('span', { html:'&times;', style:{fontSize:'20px', lineHeight:1} })
      )
    ));
  }
  const bodyEl = el('div', { class:'modal-body' });
  if(typeof body === 'string') bodyEl.innerHTML = body;
  else if(body instanceof Node) bodyEl.appendChild(body);
  modal.appendChild(bodyEl);

  if(footer){
    const footEl = el('div', { class:'modal-foot' });
    if(footer instanceof Node) footEl.appendChild(footer);
    else footEl.innerHTML = footer;
    modal.appendChild(footEl);
  }

  backdrop.appendChild(modal);
  root.appendChild(backdrop);
  _activeModal = backdrop;

  setTimeout(() => {
    const focusable = modal.querySelectorAll('input,select,textarea,button,[tabindex]:not([tabindex="-1"])');
    if(focusable.length){
      focusable[0].focus();
      const first = focusable[0], last = focusable[focusable.length-1];
      modal.addEventListener('keydown', (e) => {
        if(e.key === 'Escape') closeFn();
        if(e.key !== 'Tab') return;
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      });
    }
  }, 50);

  return { close: closeFn, body: bodyEl };
}

export function closeModal(){
  if(_activeModal){
    _activeModal.remove();
    _activeModal = null;
  }
}

export function confirmModal({ title='Confirmar', message='¿Estás seguro?', okText='Confirmar', cancelText='Cancelar', danger=false }={}){
  return new Promise((resolve) => {
    const cancelBtn = el('button', { class:'btn btn-secondary', onclick:()=>{ closeModal(); resolve(false); } }, cancelText);
    const okBtn = el('button', { class:`btn ${danger ? 'btn-danger' : 'btn-primary'}`, onclick:()=>{ closeModal(); resolve(true); } }, okText);
    openModal({
      title,
      body: el('p', { style:{margin:'0', color:'var(--text-2)', fontSize:'14px', lineHeight:'1.5'} }, message),
      footer: el('div', { class:'flex gap-2' }, cancelBtn, okBtn),
      onClose: () => resolve(false)
    });
  });
}

export function formField({ label, name, type='text', value='', placeholder='', required=false, options=null, hint='', full=false }){
  const wrap = el('div', { class:`field ${full ? 'field-full' : ''}` });
  if(label) wrap.appendChild(el('label', { class:'field-label' }, required ? `${label} *` : label));

  let input;
  if(options && Array.isArray(options)){
    input = el('select', { class:'field-input select', name, required: required ? 'required' : null });
    for(const opt of options){
      const o = el('option', { value: opt.value }, opt.label);
      if(String(value) === String(opt.value)) o.selected = true;
      input.appendChild(o);
    }
  } else if(type === 'textarea'){
    input = el('textarea', { class:'field-input', name, placeholder, required: required ? 'required' : null, rows:'3' });
    input.value = value || '';
  } else {
    input = el('input', { class:'field-input', name, type, placeholder, required: required ? 'required' : null });
    input.value = value || '';
  }
  wrap.appendChild(input);

  if(hint) wrap.appendChild(el('div', { class:'field-hint' }, hint));
  return wrap;
}

export function getFormData(form){
  const data = {};
  for(const el of form.querySelectorAll('input,select,textarea')){
    if(!el.name) continue;
    if(el.type === 'checkbox') data[el.name] = el.checked;
    else if(el.type === 'number') data[el.name] = el.value === '' ? null : Number(el.value);
    else data[el.name] = el.value;
  }
  return data;
}

export function setSyncStatus(state){
  const ind = document.getElementById('sync-indicator');
  const txt = document.getElementById('sync-text');
  if(!ind || !txt) return;
  ind.classList.remove('sync-ok','sync-warn','sync-err');
  if(state === 'ok'){ ind.classList.add('sync-ok'); txt.textContent = 'Sincronizado'; }
  else if(state === 'warn'){ ind.classList.add('sync-warn'); txt.textContent = 'Pendiente…'; }
  else if(state === 'err'){ ind.classList.add('sync-err'); txt.textContent = 'Sin conexión'; }
}

window.addEventListener('online',  () => setSyncStatus('ok'));
window.addEventListener('offline', () => setSyncStatus('err'));

export const ICONS = {
  dashboard:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  recintos:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  eventos:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  referencias:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  ingresos:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
  agenda:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  conductores:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  empresas:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>',
  flota:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/></svg>',
  analytics:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  mensajes:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  impresion:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  usuarios:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11h-6"/><path d="M19 8v6"/></svg>',
  plus:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  edit:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  search:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
  exit:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  enter:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
  shield:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z"/></svg>',
  print:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
  save:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  undo:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.7 2.99L3 13"/></svg>',
  alert:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  urgent:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-5v12L3 13v-2z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>',
  inbox:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  check:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
  close:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  upload:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  lock:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  phone:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  whatsapp:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  message:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  eye:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  copy:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  download:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  star:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  starFill:   '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  calendar:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  list:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  history:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>',
  filter:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  settings:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  refresh:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  device:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  qr:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx="0.5"/><rect x="18" y="18" width="3" height="3" rx="0.5"/><rect x="18" y="14" width="3" height="2" rx="0.5"/><rect x="14" y="18" width="2" height="3" rx="0.5"/></svg>',
  mapPin:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  truck:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>',
  warn:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  rampa:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20l18-8H7L3 20z"/><line x1="3" y1="20" x2="21" y2="20"/></svg>'
};

export function icon(name){ return ICONS[name] || ''; }

// ── Logger profesional (delega a js/logger.js) ───────────────
import { logger } from './logger.js';
export function log(...args){ logger.info(args.length === 1 ? args[0] : args.join(' ')); }
export function logErr(...args){ logger.error(args.length === 1 ? args[0] : args.join(' ')); }
export { logger };

// ═══════════════════════════════════════════════════════════════
// Chips de contacto clicables (tel / WhatsApp / Telegram / email)
// ═══════════════════════════════════════════════════════════════

/**
 * Renderiza un chip de teléfono con icono de llamada + WhatsApp.
 * Click en el número = tel: directo
 * Click en icono WA = abre WhatsApp web/app
 */
export function chipTel(phone, opts = {}){
  if(!phone) return el('span', { class:'cell-mute' }, '—');
  const clean = String(phone).replace(/[^\d+]/g, '');
  const intl = clean.startsWith('+') ? clean : ('+34' + clean.replace(/^0+/, ''));
  const wrap = el('span', { class:'chip-contact' });
  wrap.appendChild(el('a', {
    href: `tel:${intl}`, class:'chip-link chip-tel', title:'Llamar',
    onclick: e => e.stopPropagation()
  }, el('span', {}, '📞'), el('span', {}, phone)));
  if(!opts.noActions){
    wrap.appendChild(el('a', {
      href: `https://wa.me/${intl.replace('+','')}`,
      target:'_blank', rel:'noopener',
      class:'chip-icon-btn', title:'WhatsApp',
      onclick: e => e.stopPropagation()
    }, '🟢'));
    wrap.appendChild(el('a', {
      href: `https://t.me/${intl.replace('+','')}`,
      target:'_blank', rel:'noopener',
      class:'chip-icon-btn', title:'Telegram',
      onclick: e => e.stopPropagation()
    }, '✈'));
  }
  return wrap;
}

export function chipEmail(email){
  if(!email) return el('span', { class:'cell-mute' }, '—');
  return el('a', {
    href: `mailto:${email}`, class:'chip-link chip-email', title:'Enviar email',
    onclick: e => e.stopPropagation()
  }, el('span', {}, '✉'), el('span', {}, email));
}

// Devuelve el ID de evento por defecto del usuario actual.
// Útil para inicializar filtros de módulos.
export function getDefaultEventoId(profile){
  return profile?.favEventoId || '';
}
