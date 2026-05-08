// impresion.js — Motor de impresión visual con drag-drop, plantillas por evento+módulo
// Cubre: I-01 (coords %), I-02/I-03 (print rules), I-04 (templates por evento), I-05 (selección persistida),
// I-06 (BASE_URL), I-08 (page-break), I-09 (clamp drag), I-10 (autosave localStorage), I-11 (print sin async)

import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData } from '../utils.js';
import { listLive, list, listTemplates, listGlobalTemplates, saveTemplate, deleteTemplate, loadDefaultTemplate, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState } from './_shared.js';
import { canCreate, canEdit } from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { appBaseUrl } from '../firebase-config.js';

let _container = null;
const KEY_PREFIX = 'mod:impresion:';

// Estado del editor
let _state = {
  modulo: 'referencias',
  eventoId: '',
  selectedRecordId: null,
  paperSize: 'A4',          // A4 / A5 / A6 / sticker
  paperOrient: 'portrait',   // portrait / landscape
  troquel: false,
  showGuide: true,
  bgImage: null,             // dataURL de la imagen de fondo
  layout: [],                // [{id, x, y, fontSize, fontWeight, highlight, source}]
  selectedFieldId: null,
  history: [],               // para undo
  zoom: 1,
  copies: 1,
  language: 'es',
  templates: [],             // plantillas del evento
  currentTemplateId: null,
  records: []
};

// Tamaños de papel en mm
const PAPER_SIZES = {
  A4:      { w: 210, h: 297 },
  A5:      { w: 148, h: 210 },
  A6:      { w: 105, h: 148 },
  sticker: { w: 100, h: 50  }
};

// Catálogo de campos disponibles
const FIELD_CATALOG = {
  'Identificación': [
    { id:'matricula', label:'Matrícula', source:'matricula', defaultSize:18, defaultBold:true },
    { id:'remolque',  label:'Remolque',  source:'remolque',  defaultSize:14 },
    { id:'conductor', label:'Conductor', source:'conductor', defaultSize:13 },
    { id:'empresa',   label:'Empresa',   source:'empresa',   defaultSize:13 }
  ],
  'Posición & Acceso': [
    { id:'posicion',  label:'Posición',  source:'posicion',  defaultSize:32, defaultBold:true, defaultHighlight:true },
    { id:'hall',      label:'Hall',      source:'hall',      defaultSize:14 },
    { id:'stand',     label:'Stand',     source:'stand',     defaultSize:14 },
    { id:'puerta',    label:'Puerta',    source:'puerta',    defaultSize:13 }
  ],
  'Referencia': [
    { id:'referencia', label:'Referencia', source:'referencia', defaultSize:13 },
    { id:'evento',     label:'Evento',     source:'evento',     defaultSize:11 },
    { id:'fecha',      label:'Fecha',      source:'fecha',      defaultSize:11 },
    { id:'horaEntrada',label:'Hora entrada',source:'horaEntrada',defaultSize:11 }
  ],
  'Otros': [
    { id:'qr',        label:'QR seguimiento', source:'qr',        defaultSize:80, defaultBold:false },
    { id:'logo',      label:'Logo',           source:'logo',      defaultSize:40 },
    { id:'notas',     label:'Notas',          source:'notas',     defaultSize:11 }
  ]
};

// ── Init ─────────────────────────────────────────────────────
export async function init(container){
  _container = container;

  // Cargar últimos valores del localStorage (I-10)
  const saved = localStorage.getItem('beunifyt_print_state');
  if(saved){
    try{
      const s = JSON.parse(saved);
      Object.assign(_state, s, { history:[], records:[], templates:[] });
    } catch(_){}
  }

  // Cargar eventos
  const eventos = await list('eventos', { orderBy:'createdAt', order:'desc' });
  _state.eventos = eventos;
  if(!_state.eventoId && eventos.length) _state.eventoId = eventos[0].id;

  await loadTemplate();
  await loadRecords();
  render();
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  saveStateToLocal();
  _container = null;
}

function saveStateToLocal(){
  const s = {
    modulo: _state.modulo,
    eventoId: _state.eventoId,
    selectedRecordId: _state.selectedRecordId,
    paperSize: _state.paperSize,
    paperOrient: _state.paperOrient,
    troquel: _state.troquel,
    showGuide: _state.showGuide,
    bgImage: _state.bgImage,
    layout: _state.layout,
    zoom: _state.zoom,
    copies: _state.copies,
    language: _state.language,
    currentTemplateId: _state.currentTemplateId
  };
  try{ localStorage.setItem('beunifyt_print_state', JSON.stringify(s)); } catch(_){}
}

async function loadTemplate(){
  if(!_state.eventoId) return;
  const tpls = await listTemplates(_state.eventoId, _state.modulo);
  _state.templates = tpls;
  if(_state.currentTemplateId){
    const t = tpls.find(x => x.id === _state.currentTemplateId);
    if(t) applyTemplate(t);
  } else {
    const def = await loadDefaultTemplate(_state.eventoId, _state.modulo);
    if(def) applyTemplate(def);
  }
}

function applyTemplate(t){
  _state.currentTemplateId = t.id;
  if(t.layout){
    _state.paperSize = t.layout.paperSize || 'A4';
    _state.paperOrient = t.layout.paperOrient || 'portrait';
    _state.troquel = !!t.layout.troquel;
    _state.bgImage = t.layout.bgImage || null;
    _state.layout = t.layout.fields || [];
  }
}

async function loadRecords(){
  if(!_state.eventoId){ _state.records = []; return; }
  const items = await list(_state.modulo, {
    where: { eventoId: _state.eventoId },
    orderBy: 'createdAt', order:'desc',
    limit: 50
  });
  _state.records = items;
  // Si no hay seleccionado, usar el primero
  if(!_state.selectedRecordId && items.length) _state.selectedRecordId = items[0].id;
}

// ── Render ───────────────────────────────────────────────────
function render(){
  if(!_container) return;
  clear(_container);
  const p = getCurrentProfile();

  _container.appendChild(pageHeader({
    title:'Motor de Impresión',
    sub:'Diseña pases, etiquetas y troqueles. Plantillas por evento y módulo.'
  }));

  if(!_state.eventoId || _state.eventos.length === 0){
    _container.appendChild(emptyState({
      iconName:'eventos',
      title:'No hay eventos',
      message:'Crea al menos un evento antes de configurar plantillas de impresión.'
    }));
    return;
  }

  // Topbar de selección de evento + módulo + plantilla
  const topRow = el('div', { class:'filter-row' });
  topRow.appendChild(el('select', {
    class:'select',
    onchange: async (e) => { _state.modulo = e.target.value; _state.currentTemplateId = null; await loadTemplate(); await loadRecords(); render(); }
  },
    el('option', { value:'referencias', selected: _state.modulo === 'referencias' ? 'selected' : null }, 'Referencias'),
    el('option', { value:'ingresos',    selected: _state.modulo === 'ingresos' ? 'selected' : null }, 'Ingresos')
  ));
  topRow.appendChild(el('select', {
    class:'select',
    onchange: async (e) => { _state.eventoId = e.target.value; _state.currentTemplateId = null; await loadTemplate(); await loadRecords(); render(); }
  },
    ..._state.eventos.map(ev => el('option', { value: ev.id, selected: ev.id === _state.eventoId ? 'selected' : null }, ev.nombre))
  ));
  topRow.appendChild(el('select', {
    class:'select',
    onchange: async (e) => {
      const id = e.target.value;
      if(!id){ _state.currentTemplateId = null; return; }
      const t = _state.templates.find(x => x.id === id);
      if(t){ applyTemplate(t); render(); }
    }
  },
    el('option', { value:'' }, '— Sin plantilla —'),
    ..._state.templates.map(t => el('option', { value: t.id, selected: t.id === _state.currentTemplateId ? 'selected' : null }, `${t.name}${t.isDefault ? ' ⭐' : ''}`))
  ));
  topRow.appendChild(el('button', { class:'btn btn-secondary btn-sm', onclick: saveTemplateAs }, el('span', { html: icon('save') }), 'Guardar plantilla'));
  if(_state.currentTemplateId){
    topRow.appendChild(el('button', { class:'btn btn-ghost btn-sm', onclick: deleteCurrentTemplate, title:'Eliminar plantilla' }, el('span', { html: icon('trash') })));
  }
  topRow.appendChild(el('div', { class:'flex-1' }));
  topRow.appendChild(el('button', { class:'btn btn-secondary btn-sm', onclick: undo, title:'Deshacer (Ctrl+Z)' }, el('span', { html: icon('undo') })));
  topRow.appendChild(el('button', { class:'btn btn-primary', onclick: doPrint }, el('span', { html: icon('print') }), 'Imprimir'));
  _container.appendChild(topRow);

  // Shell de 3 columnas
  const shell = el('div', { class:'print-shell' });

  // Col izquierda: lista de registros
  const colL = el('div', { class:'print-col' },
    el('div', { class:'print-col-head' }, 'Registros'),
    renderRecordList()
  );
  shell.appendChild(colL);

  // Col centro: canvas
  const colC = el('div', { class:'print-col' });
  colC.appendChild(renderZoomBar());
  colC.appendChild(renderCanvas());
  shell.appendChild(colC);

  // Col derecha: tabs (Campos / Edición / Configuración)
  const colR = el('div', { class:'print-col' });
  colR.appendChild(renderRightPanel());
  shell.appendChild(colR);

  _container.appendChild(shell);
  saveStateToLocal();
}

// ── Lista de registros (col izquierda) ────────────────────────
function renderRecordList(){
  const wrap = el('div', { class:'print-col-body' });
  if(_state.records.length === 0){
    wrap.appendChild(el('div', { class:'cell-mute', style:{padding:'12px'} }, 'Sin registros para este evento'));
    return wrap;
  }

  // Item demo
  wrap.appendChild(el('div', {
    class: `record-list-item ${_state.selectedRecordId === '__demo__' ? 'active' : ''}`,
    onclick: () => { _state.selectedRecordId = '__demo__'; render(); }
  },
    el('div', { class:'rli-plate' }, 'DEMO'),
    el('div', { class:'rli-meta' }, 'Datos de ejemplo')
  ));

  for(const r of _state.records){
    wrap.appendChild(el('div', {
      class: `record-list-item ${_state.selectedRecordId === r.id ? 'active' : ''}`,
      onclick: () => { _state.selectedRecordId = r.id; render(); }
    },
      el('div', { class:'rli-plate' }, r.matricula || '—'),
      el('div', { class:'rli-meta' }, [`Pos. ${r.posicion || '—'}`, r.hall ? `Hall ${r.hall}` : '', r.conductor].filter(Boolean).join(' · '))
    ));
  }
  return wrap;
}

// ── Zoom bar ──────────────────────────────────────────────────
function renderZoomBar(){
  const row = el('div', { class:'zoom-row' });
  row.appendChild(el('span', {}, 'Zoom:'));
  for(const z of [0.5, 0.75, 1, 1.25, 1.5]){
    row.appendChild(el('button', {
      class: `zoom-btn ${_state.zoom === z ? 'active' : ''}`,
      onclick: () => { _state.zoom = z; render(); }
    }, `${Math.round(z*100)}%`));
  }
  row.appendChild(el('div', { class:'flex-1' }));
  row.appendChild(el('span', { class:'cell-mute' }, `${_state.paperSize} · ${_state.paperOrient}${_state.troquel ? ' · Troquel' : ''}`));
  return row;
}

// ── Canvas (papel) ────────────────────────────────────────────
function renderCanvas(){
  const wrap = el('div', { class:'canvas-wrap' });
  const size = PAPER_SIZES[_state.paperSize];
  let mmW = size.w, mmH = size.h;
  if(_state.paperOrient === 'landscape'){ const t = mmW; mmW = mmH; mmH = t; }
  // 1mm = 3.78px, escalado por zoom
  const pxW = mmW * 3.78 * _state.zoom;
  const pxH = mmH * 3.78 * _state.zoom;

  const paper = el('div', {
    class: `canvas-paper print-area ${_state.troquel ? 'troquel' : ''} ${_state.troquel ? 'no-print-zone-on' : ''}`,
    style: { width: pxW + 'px', height: pxH + 'px' },
    ondragover: (e) => { e.preventDefault(); },
    ondrop: (e) => onCanvasDrop(e, paper)
  });

  // Imagen de fondo (guía)
  if(_state.bgImage && _state.showGuide){
    paper.appendChild(el('img', {
      class:'canvas-bg-img guide-only',
      src: _state.bgImage,
      style: { opacity: '0.3' }
    }));
  }

  // Campos colocados
  const recordData = getRecordData();
  for(const f of _state.layout){
    const fieldEl = renderField(f, recordData, paper);
    paper.appendChild(fieldEl);
  }

  wrap.appendChild(paper);
  return wrap;
}

function renderField(f, recordData, paper){
  // f.x, f.y son en porcentaje
  const fdef = findFieldDef(f.id);
  const value = resolveValue(f, recordData);
  const node = el('div', {
    class: `canvas-field ${_state.selectedFieldId === f.id ? 'selected' : ''} ${f.highlight ? 'highlight' : ''}`,
    style: {
      left: f.x + '%',
      top: f.y + '%',
      fontSize: (f.fontSize || 14) + 'px',
      fontWeight: f.fontWeight || 'normal'
    },
    onclick: (e) => { e.stopPropagation(); _state.selectedFieldId = f.id; render(); },
    draggable: 'true',
    ondragstart: (e) => {
      e.dataTransfer.setData('move-field', f.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  });
  // Label pequeño arriba
  if(fdef) node.appendChild(el('span', { class:'canvas-field-label' }, fdef.label));
  node.appendChild(document.createTextNode(value));
  return node;
}

function findFieldDef(id){
  for(const cat of Object.values(FIELD_CATALOG)){
    const f = cat.find(x => x.id === id);
    if(f) return f;
  }
  return null;
}

function getRecordData(){
  if(!_state.selectedRecordId || _state.selectedRecordId === '__demo__'){
    return {
      matricula:'1234ABC', remolque:'R-5678',
      conductor:'Juan García', empresa:'Logística Demo SL',
      posicion:'12', hall:'2', stand:'B-44', puerta:'Norte',
      referencia:'MWC-2026-001', evento:'Evento Demo',
      fecha: new Date().toLocaleDateString('es'),
      horaEntrada:'09:30',
      qr:'[QR]', logo:'[LOGO]', notas:'Acceso autorizado'
    };
  }
  const r = _state.records.find(x => x.id === _state.selectedRecordId);
  if(!r) return {};
  const evento = _state.eventos.find(e => e.id === r.eventoId);
  return {
    matricula: r.matricula || '',
    remolque: r.remolque || '',
    conductor: r.conductor || '',
    empresa: r.empresa || '',
    posicion: String(r.posicion || ''),
    hall: r.hall || '',
    stand: r.stand || '',
    puerta: r.puerta || '',
    referencia: r.referencia || '',
    evento: evento?.nombre || '',
    fecha: new Date().toLocaleDateString('es'),
    horaEntrada: r.horaEntrada || '',
    qr: r.id ? '[QR]' : '',
    logo: '[LOGO]',
    notas: r.notas || ''
  };
}

function resolveValue(f, recordData){
  const fdef = findFieldDef(f.id);
  if(!fdef) return '—';
  const v = recordData[fdef.source];
  if(fdef.id === 'qr'){
    return `[QR: ${appBaseUrl}?track=${recordData.matricula || ''}]`;
  }
  return v || '—';
}

function onCanvasDrop(e, paper){
  e.preventDefault();
  const moveId = e.dataTransfer.getData('move-field');
  const newId = e.dataTransfer.getData('new-field');
  const rect = paper.getBoundingClientRect();
  let x = ((e.clientX - rect.left) / rect.width) * 100;
  let y = ((e.clientY - rect.top) / rect.height) * 100;
  // Clamp (I-09)
  x = Math.max(0, Math.min(95, x));
  y = Math.max(0, Math.min(95, y));

  pushHistory();
  if(moveId){
    const f = _state.layout.find(x => x.id === moveId);
    if(f){ f.x = x; f.y = y; }
  } else if(newId){
    if(_state.layout.some(f => f.id === newId)){
      toast('Ese campo ya está colocado', 'warn');
      return;
    }
    const fdef = findFieldDef(newId);
    if(!fdef) return;
    _state.layout.push({
      id: newId,
      x, y,
      fontSize: fdef.defaultSize || 14,
      fontWeight: fdef.defaultBold ? 'bold' : 'normal',
      highlight: !!fdef.defaultHighlight
    });
    _state.selectedFieldId = newId;
  }
  render();
}

// ── Panel derecho ────────────────────────────────────────────
let _activeTab = 'campos';
function renderRightPanel(){
  const wrap = el('div', { class:'flex flex-col', style:{height:'100%'} });
  const tabs = el('div', { class:'tab-strip' });
  for(const t of [['campos','Campos'],['edicion','Edición'],['config','Config']]){
    tabs.appendChild(el('button', {
      class: _activeTab === t[0] ? 'active' : '',
      onclick: () => { _activeTab = t[0]; render(); }
    }, t[1]));
  }
  wrap.appendChild(tabs);
  const body = el('div', { class:'print-col-body', style:{flex:'1'} });
  if(_activeTab === 'campos') body.appendChild(renderCamposTab());
  else if(_activeTab === 'edicion') body.appendChild(renderEdicionTab());
  else body.appendChild(renderConfigTab());
  wrap.appendChild(body);
  return wrap;
}

function renderCamposTab(){
  const wrap = el('div', {});
  for(const [cat, fields] of Object.entries(FIELD_CATALOG)){
    const catWrap = el('div', { class:'field-cat' },
      el('div', { class:'field-cat-head' }, cat)
    );
    for(const f of fields){
      const placed = _state.layout.some(x => x.id === f.id);
      const chip = el('div', {
        class: `field-chip ${placed ? 'placed' : ''}`,
        draggable: 'true',
        ondragstart: (e) => {
          e.dataTransfer.setData('new-field', f.id);
          e.dataTransfer.effectAllowed = 'copy';
        }
      },
        el('span', {}, f.label)
      );
      catWrap.appendChild(chip);
    }
    wrap.appendChild(catWrap);
  }
  wrap.appendChild(el('p', { class:'cell-mute', style:{fontSize:'12px',marginTop:'12px'} }, 'Arrastra los campos al canvas. Click en un campo del canvas para editarlo.'));
  return wrap;
}

function renderEdicionTab(){
  const wrap = el('div', {});
  if(!_state.selectedFieldId){
    wrap.appendChild(el('div', { class:'cell-mute' }, 'Selecciona un campo del canvas para editarlo.'));
    return wrap;
  }
  const f = _state.layout.find(x => x.id === _state.selectedFieldId);
  if(!f){
    wrap.appendChild(el('div', { class:'cell-mute' }, 'Campo no encontrado.'));
    return wrap;
  }
  const fdef = findFieldDef(f.id);
  wrap.appendChild(el('h4', { style:{margin:'0 0 12px 0',fontSize:'14px'} }, fdef?.label || f.id));

  // Tamaño
  wrap.appendChild(el('label', { class:'field-label' }, `Tamaño: ${f.fontSize}px`));
  wrap.appendChild(el('input', {
    type:'range', min:'8', max:'80', value:String(f.fontSize),
    style:{width:'100%'},
    oninput: (e) => { f.fontSize = Number(e.target.value); render(); }
  }));

  // Negrita
  wrap.appendChild(el('div', { class:'field', style:{marginTop:'10px'} },
    el('label', { class:'flex gap-2 items-center', style:{cursor:'pointer'} },
      el('input', {
        type:'checkbox',
        checked: f.fontWeight === 'bold' ? 'checked' : null,
        onchange: (e) => { f.fontWeight = e.target.checked ? 'bold' : 'normal'; render(); }
      }),
      el('span', {}, 'Negrita')
    )
  ));

  // Resaltado
  wrap.appendChild(el('div', { class:'field' },
    el('label', { class:'flex gap-2 items-center', style:{cursor:'pointer'} },
      el('input', {
        type:'checkbox',
        checked: f.highlight ? 'checked' : null,
        onchange: (e) => { f.highlight = e.target.checked; render(); }
      }),
      el('span', {}, 'Resaltado (fondo ámbar)')
    )
  ));

  // Posición exacta
  wrap.appendChild(el('div', { class:'form-grid', style:{marginTop:'8px'} },
    el('div', { class:'field' },
      el('label', { class:'field-label' }, 'X (%)'),
      el('input', { class:'field-input', type:'number', step:'0.1', min:'0', max:'100', value: f.x.toFixed(1),
        onchange: (e) => { f.x = Math.max(0, Math.min(95, Number(e.target.value))); render(); } })
    ),
    el('div', { class:'field' },
      el('label', { class:'field-label' }, 'Y (%)'),
      el('input', { class:'field-input', type:'number', step:'0.1', min:'0', max:'100', value: f.y.toFixed(1),
        onchange: (e) => { f.y = Math.max(0, Math.min(95, Number(e.target.value))); render(); } })
    )
  ));

  wrap.appendChild(el('button', {
    class:'btn btn-danger btn-sm w-full', style:{marginTop:'12px'},
    onclick: () => {
      pushHistory();
      _state.layout = _state.layout.filter(x => x.id !== f.id);
      _state.selectedFieldId = null;
      render();
    }
  }, el('span', { html: icon('trash') }), 'Eliminar campo'));

  return wrap;
}

function renderConfigTab(){
  const wrap = el('div', {});

  // Tamaño papel
  wrap.appendChild(el('h4', { style:{margin:'0 0 8px',fontSize:'13px',textTransform:'uppercase',color:'var(--text-3)'} }, 'Papel'));
  wrap.appendChild(el('div', { class:'field' },
    el('label', { class:'field-label' }, 'Tamaño'),
    el('select', { class:'field-input', onchange:(e)=>{ _state.paperSize = e.target.value; render(); } },
      ...['A4','A5','A6','sticker'].map(s => el('option', { value:s, selected: s === _state.paperSize ? 'selected' : null }, s))
    )
  ));
  wrap.appendChild(el('div', { class:'field' },
    el('label', { class:'field-label' }, 'Orientación'),
    el('select', { class:'field-input', onchange:(e)=>{ _state.paperOrient = e.target.value; render(); } },
      el('option', { value:'portrait', selected: _state.paperOrient === 'portrait' ? 'selected' : null }, 'Vertical'),
      el('option', { value:'landscape', selected: _state.paperOrient === 'landscape' ? 'selected' : null }, 'Horizontal')
    )
  ));

  // Troquel
  wrap.appendChild(el('div', { class:'field' },
    el('label', { class:'flex gap-2 items-center', style:{cursor:'pointer'} },
      el('input', { type:'checkbox', checked: _state.troquel ? 'checked' : null,
        onchange:(e)=>{ _state.troquel = e.target.checked; render(); } }),
      el('span', {}, 'Modo troquel (línea de corte)')
    ),
    el('div', { class:'field-hint' }, 'La línea naranja no se imprime, es solo guía.')
  ));

  // Imagen guía
  wrap.appendChild(el('h4', { style:{margin:'12px 0 8px',fontSize:'13px',textTransform:'uppercase',color:'var(--text-3)'} }, 'Imagen guía'));
  wrap.appendChild(el('p', { class:'cell-mute', style:{fontSize:'12px',marginTop:0,marginBottom:'8px'} },
    'Sube una imagen de referencia. NUNCA se imprime, solo es guía visual al diseñar.'));
  wrap.appendChild(el('input', {
    type:'file', accept:'image/*',
    onchange: async (e) => {
      const file = e.target.files[0];
      if(!file) return;
      // Comprimir (R-03)
      const compressed = await compressImage(file);
      _state.bgImage = compressed;
      render();
    }
  }));
  if(_state.bgImage){
    wrap.appendChild(el('button', { class:'btn btn-ghost btn-sm', style:{marginTop:'8px'},
      onclick:()=>{ _state.bgImage = null; render(); } }, 'Quitar imagen'));
    wrap.appendChild(el('label', { class:'flex gap-2 items-center', style:{marginTop:'8px',cursor:'pointer'} },
      el('input', { type:'checkbox', checked: _state.showGuide ? 'checked' : null,
        onchange: (e) => { _state.showGuide = e.target.checked; render(); } }),
      el('span', { style:{fontSize:'13px'} }, 'Mostrar guía en pantalla')
    ));
  }

  // Copias
  wrap.appendChild(el('h4', { style:{margin:'12px 0 8px',fontSize:'13px',textTransform:'uppercase',color:'var(--text-3)'} }, 'Impresión'));
  wrap.appendChild(el('div', { class:'field' },
    el('label', { class:'field-label' }, 'Copias'),
    el('input', { class:'field-input', type:'number', min:'1', max:'10', value:String(_state.copies),
      onchange:(e)=>{ _state.copies = Math.max(1, Math.min(10, Number(e.target.value))); } })
  ));

  return wrap;
}

async function compressImage(file){
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 1200;
        let w = img.width, h = img.height;
        if(w > max || h > max){
          if(w > h){ h = h * (max/w); w = max; }
          else     { w = w * (max/h); h = max; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Acciones ─────────────────────────────────────────────────
function pushHistory(){
  _state.history.push(JSON.stringify({ layout:_state.layout, paperSize:_state.paperSize, paperOrient:_state.paperOrient, troquel:_state.troquel }));
  if(_state.history.length > 30) _state.history.shift();
}

function undo(){
  if(_state.history.length === 0){ toast('Sin acciones para deshacer', 'warn'); return; }
  const prev = JSON.parse(_state.history.pop());
  _state.layout = prev.layout;
  _state.paperSize = prev.paperSize;
  _state.paperOrient = prev.paperOrient;
  _state.troquel = prev.troquel;
  render();
}

async function saveTemplateAs(){
  const p = getCurrentProfile();
  if(!canEdit(p) && !canCreate(p)){ toast('Sin permisos', 'err'); return; }
  if(!_state.eventoId){ toast('Selecciona un evento', 'err'); return; }

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    if(!fd.name){ toast('Nombre requerido', 'err'); return; }
    try{
      const layout = {
        paperSize:_state.paperSize, paperOrient:_state.paperOrient,
        troquel:_state.troquel, bgImage:_state.bgImage,
        fields:_state.layout
      };
      const saved = await saveTemplate(_state.eventoId, _state.modulo, fd.name, layout, fd.isDefault === 'true');
      _state.currentTemplateId = saved.id;
      toast('Plantilla guardada', 'ok');
      closeModal();
      await loadTemplate();
      render();
    } catch(e){ toast(e.message, 'err'); }
  }});

  form.appendChild(formField({ label:'Nombre de la plantilla', name:'name', required:true, full:true }));
  form.appendChild(formField({ label:'Por defecto', name:'isDefault', value:'false', options:[
    { value:'false', label:'No' },
    { value:'true', label:'Sí (carga automática para este evento+módulo)' }
  ], full:true }));

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary' }, 'Guardar')
  );

  openModal({ title:'Guardar plantilla', body: form });
  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteCurrentTemplate(){
  if(!_state.currentTemplateId) return;
  const ok = await confirmModal({ title:'Eliminar plantilla', message:'¿Eliminar la plantilla actual?', danger:true });
  if(!ok) return;
  try{
    await deleteTemplate(_state.eventoId, _state.currentTemplateId);
    _state.currentTemplateId = null;
    await loadTemplate();
    toast('Plantilla eliminada', 'ok');
    render();
  } catch(e){ toast(e.message, 'err'); }
}

// I-11: window.print sin async
function doPrint(){
  if(_state.layout.length === 0){
    toast('Añade campos antes de imprimir', 'warn');
    return;
  }
  // Si hay copies > 1, clonar el papel N veces con page-break (I-08)
  if(_state.copies > 1){
    const original = document.querySelector('.canvas-paper');
    if(!original) return;
    const wrap = el('div', { class:'print-area', id:'__print-multi' });
    for(let i=0; i<_state.copies; i++){
      const clone = original.cloneNode(true);
      if(i < _state.copies - 1) clone.classList.add('page-break');
      wrap.appendChild(clone);
    }
    document.body.appendChild(wrap);
    original.classList.remove('print-area');
    window.print();
    setTimeout(() => {
      wrap.remove();
      original.classList.add('print-area');
    }, 100);
  } else {
    window.print();
  }
}

// Atajo de teclado Ctrl+Z
document.addEventListener('keydown', (e) => {
  if(_container && (e.ctrlKey || e.metaKey) && e.key === 'z'){
    e.preventDefault();
    undo();
  }
});
