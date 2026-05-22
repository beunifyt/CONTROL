// ═══════════════════════════════════════════════════════════════
// impresion.js — Motor de Impresión
// Estética Base44 + funciones del monolito + innovaciones
// ═══════════════════════════════════════════════════════════════

import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData } from '../utils.js';
import { list, listTemplates, listGlobalTemplates, saveTemplate, deleteTemplate, loadDefaultTemplate, unregisterListenersByPrefix } from '../db.js';
import { pageHeader } from './shared.js';
import { canCreate, canEdit } from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { appBaseUrl } from '../firebase-config.js';
import { logger } from '../logger.js';
import { tr, trIn, getLang } from '../i18n.js';

let _container = null;
const KEY_PREFIX = 'mod:impresion:';
const STATE_KEY = 'beunifyt_print_state_v2';

// ═══════════════════════════════════════════════════════════════
// CAMPOS DEL MONOLITO (23 campos completos)
// ═══════════════════════════════════════════════════════════════
export const FIELDS = {
  // Vehículo
  matricula:      { cat:'Vehículo',  ico:'🚛', label:'Matrícula',      source:'matricula',      defSize:32, defBold:true, defHighlight:true },
  matricula2:     { cat:'Vehículo',  ico:'🚚', label:'Matrícula 2',    source:'matricula2',     defSize:18 },
  tipoVehiculo:   { cat:'Vehículo',  ico:'🚗', label:'Tipo vehículo',  source:'tipoVehiculo',   defSize:13 },
  remolque:       { cat:'Vehículo',  ico:'🚚', label:'Remolque',       source:'remolque',       defSize:14 },
  paisMatricula:  { cat:'Vehículo',  ico:'🌍', label:'País matrícula', source:'paisMatricula',  defSize:11 },
  // Conductor
  conductor:      { cat:'Conductor', ico:'👤', label:'Conductor',      source:'conductor',      defSize:16 },
  telefono:       { cat:'Conductor', ico:'📱', label:'Teléfono',       source:'telefono',       defSize:12 },
  empresa:        { cat:'Conductor', ico:'🏢', label:'Empresa',        source:'empresa',        defSize:13 },
  // Destino
  hall:           { cat:'Destino',   ico:'🏭', label:'Hall',           source:'hall',           defSize:22, defBold:true },
  stand:          { cat:'Destino',   ico:'📍', label:'Stand',          source:'stand',          defSize:22, defBold:true },
  expositor:      { cat:'Destino',   ico:'🎪', label:'Expositor',      source:'expositor',      defSize:13 },
  referencia:     { cat:'Destino',   ico:'🔖', label:'Referencia',     source:'referencia',     defSize:13 },
  posicion:       { cat:'Destino',   ico:'🔢', label:'Posición',       source:'posicion',       defSize:36, defBold:true },
  puertaHall:     { cat:'Destino',   ico:'🚪', label:'Puerta Hall',    source:'puertaHall',     defSize:13 },
  llamador:       { cat:'Destino',   ico:'📞', label:'Llamador',       source:'llamador',       defSize:12 },
  montador:       { cat:'Destino',   ico:'🔧', label:'Montador',       source:'montador',       defSize:12 },
  descargaTipo:   { cat:'Destino',   ico:'📦', label:'Tipo descarga',  source:'descargaTipo',   defSize:12 },
  // Identificación extra
  pasaporte:      { cat:'Conductor', ico:'🪪', label:'Pasaporte/DNI',  source:'pasaporte',      defSize:12 },
  fechaNacimiento:{ cat:'Conductor', ico:'🎂', label:'F. Nacimiento',  source:'fechaNacimiento',defSize:11 },
  pais:           { cat:'Conductor', ico:'🌍', label:'País',           source:'pais',           defSize:11 },
  email:          { cat:'Conductor', ico:'✉️', label:'Email',          source:'email',          defSize:11 },
  // Evento
  evento:         { cat:'Evento',    ico:'🎫', label:'Evento',         source:'evento',         defSize:11 },
  fecha:          { cat:'Evento',    ico:'📅', label:'Fecha',          source:'fecha',          defSize:11 },
  horario:        { cat:'Evento',    ico:'🕐', label:'Hora entrada',   source:'horario',        defSize:11 },
  // Extra
  comentario:     { cat:'Extra',     ico:'📝', label:'Comentario',     source:'comentario',     defSize:11 },
  mensajeRampa:   { cat:'Extra',     ico:'💬', label:'Mensaje rampa',  source:'mensajeRampa',   defSize:11 },
  estado:         { cat:'Extra',     ico:'🏷️', label:'Estado',         source:'estado',         defSize:11 },
  qr:             { cat:'Códigos',   ico:'📲', label:'QR seguimiento', source:'qr',             defSize:80 },
  qrDireccion:    { cat:'Códigos',   ico:'🗺️', label:'QR dirección',   source:'qrDireccion',    defSize:80 },
  barcode:        { cat:'Códigos',   ico:'📊', label:'Código barras',  source:'barcode',        defSize:60 },
  codSeguridad:   { cat:'Códigos',   ico:'🔐', label:'Cód. seguridad', source:'codSeguridad',   defSize:16 },
  logo:           { cat:'Marca',     ico:'🏷', label:'Logo empresa',   source:'logo',           defSize:40 },
  recintoLogo:    { cat:'Marca',     ico:'🏢', label:'Recinto logo',   source:'recintoLogo',    defSize:40 },
  recintoDir:     { cat:'Marca',     ico:'📍', label:'Recinto dirección', source:'recintoDir',  defSize:10 }
};

// Agrupar campos por categoría con orden
const CAT_ORDER = ['Vehículo', 'Conductor', 'Destino', 'Evento', 'Códigos', 'Marca', 'Extra'];
const CAT_ICONS = { 'Vehículo':'🚛', 'Conductor':'👤', 'Destino':'📍', 'Evento':'🎫', 'Códigos':'📲', 'Marca':'🏷', 'Extra':'📝' };

// 25 idiomas (del monolito)
const LANGS = [
  {code:'es', flag:'🇪🇸', name:'Español'}, {code:'en', flag:'🇬🇧', name:'English'},
  {code:'fr', flag:'🇫🇷', name:'Français'}, {code:'de', flag:'🇩🇪', name:'Deutsch'},
  {code:'it', flag:'🇮🇹', name:'Italiano'}, {code:'pt', flag:'🇵🇹', name:'Português'},
  {code:'pl', flag:'🇵🇱', name:'Polski'},  {code:'nl', flag:'🇳🇱', name:'Nederlands'},
  {code:'ro', flag:'🇷🇴', name:'Română'},  {code:'hu', flag:'🇭🇺', name:'Magyar'},
  {code:'cs', flag:'🇨🇿', name:'Čeština'}, {code:'sk', flag:'🇸🇰', name:'Slovenčina'},
  {code:'hr', flag:'🇭🇷', name:'Hrvatski'},{code:'sl', flag:'🇸🇮', name:'Slovenščina'},
  {code:'sv', flag:'🇸🇪', name:'Svenska'}, {code:'fi', flag:'🇫🇮', name:'Suomi'},
  {code:'el', flag:'🇬🇷', name:'Ελληνικά'},{code:'bg', flag:'🇧🇬', name:'Български'},
  {code:'uk', flag:'🇺🇦', name:'Українська'},{code:'ru', flag:'🇷🇺', name:'Русский'},
  {code:'ca', flag:'🇪🇸', name:'Català'},  {code:'eu', flag:'🇪🇸', name:'Euskara'},
  {code:'gl', flag:'🇪🇸', name:'Galego'},  {code:'ar', flag:'🇸🇦', name:'العربية'},
  {code:'tr', flag:'🇹🇷', name:'Türkçe'}
];

const PAPER_SIZES = {
  A3:      { w:297, h:420 },
  A4:      { w:210, h:297 },
  A5:      { w:148, h:210 },
  A6:      { w:105, h:148 },
  sticker: { w:100, h:50 }
};

const FONTS = ['Arial','Helvetica','Georgia','Courier New','Verdana','Times New Roman'];

const LABEL_MODES = [
  { value:'valor',  label:'Solo valor' },
  { value:'label',  label:'Etiqueta + Valor' },
  { value:'linea',  label:'Etiqueta + Línea (rellenar)' }
];

const DEMO_RECORDS = [
  { id:'__demo1__', matricula:'7829-BCN', remolque:'R-1234', conductor:'Josep Puig',  empresa:'Samsung Electronics Ibérica', referencia:'MWC-2026-001', hall:'1', stand:'1A-15', tipoVehiculo:'camion',    posicion:'12', horaEntrada:'09:30', pais:'ES', telefono:'+34 666 123 456', lang:'es', expositor:'Samsung', montador:'Vips SL' },
  { id:'__demo2__', matricula:'WA-1234C',  conductor:'Anna Bauer',  empresa:'LG Electronics España',       referencia:'MWC-2026-014', hall:'2', stand:'2B-08', tipoVehiculo:'trailer',   posicion:'8',  horaEntrada:'10:45', pais:'PL', telefono:'+48 605 123 456', lang:'pl', expositor:'LG' },
  { id:'__demo3__', matricula:'M-AB-1234', conductor:'Wei Zhang',   empresa:'Huawei Technologies Spain',   referencia:'MWC-2026-022', hall:'1', stand:'1C-22', tipoVehiculo:'camion',    posicion:'15', horaEntrada:'08:15', pais:'CN', telefono:'+86 138 0011 2222', lang:'en', expositor:'Huawei' },
  { id:'__demo4__', matricula:'B-12-ABC',  conductor:'Pere Martí',  empresa:'Transportes Rápidos SL',      referencia:'MWC-2026-031', hall:'3', stand:'3A-01', tipoVehiculo:'furgoneta', posicion:'3',  horaEntrada:'11:20', pais:'ES', telefono:'+34 666 789 012', lang:'ca', expositor:'Cisco' },
  { id:'__demo5__', matricula:'3456-MDR',  conductor:'Sofia García',empresa:'Samsung Electronics Ibérica', referencia:'MWC-2026-007', hall:'2', stand:'2A-11', tipoVehiculo:'camion',    posicion:'21', horaEntrada:'07:50', pais:'ES', telefono:'+34 666 234 567', lang:'es', expositor:'Samsung' }
];

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════
let _state = {
  modulo:'referencias',
  eventoId:'',
  eventos:[],
  recintos:[],
  records:[],
  templates:[],
  currentTemplateId:null,
  selectedRecordId:null,
  selectedFieldId:null,
  selectedFieldIds:[],  // selección múltiple (Shift+click)
  zoom:0.55,
  copies:1,
  language:'es',
  // Plantilla
  paperSize:'A4',
  paperOrient:'portrait',
  font:'Arial',
  labelMode:'valor',
  troquel:false,
  fieldLayout:{},  // { fieldId: { x, y, fontSize, bold, highlight, color, rotation, zIndex, hidden } }
  fieldOrder:[],   // orden Z (último = más arriba)
  // Frases monolito
  ph1On:false, phrase1:'',
  ph2On:false, phrase2:'',
  ph3On:false, puerta3:{},
  qrTracking:false, qrBase:'',
  // Imagen guía + trapezoide
  bgImage:null, bgOpacity:0.35, showGuide:true,
  bgTransform:{ tx:0, ty:0, rot:0, scale:1, skewX:0, skewY:0, persp:1000 },
  bgEditMode:'off',  // off|move|rotate|warp — manipulación directa
  // Innovaciones
  snapToGrid:true,
  gridSize:1,         // 1 / 2 / 5 / 10 / 0(off)
  showGrid:false,     // mostrar grid en canvas
  showRuler:true,     // regla en mm
  alignGuides:{ x:null, y:null },
  clipboardStyle:null, // para copiar formato
  watermark:{enabled:false,text:'',opacity:0.1},
  multiPerSheet:1,
  vehiculoAutoSelect:false,
  caducidadHoras:0,
  // Estado UI
  activeTab:'campos',
  clientMode:false,    // Vista cliente: sin handlers, sin outlines, solo preview
  history:[]
};

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
export async function init(container){
  _container = container;
  loadStateFromLocal();
  _state.eventos = await list('eventos', {orderBy:'createdAt', order:'desc'});
  _state.recintos = await list('recintos', {orderBy:'nombre'});

  if(!_state.eventoId && _state.eventos.length){
    _state.eventoId = _state.eventos[0].id;
  }
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
  try{
    const s = {};
    for(const k of ['modulo','eventoId','selectedRecordId','paperSize','paperOrient','font','labelMode',
                    'troquel','fieldLayout','ph1On','phrase1','ph2On','phrase2','ph3On','puerta3',
                    'qrTracking','qrBase','bgImage','bgOpacity','showGuide','bgTransform','bgEditMode','zoom','copies','language',
                    'snapToGrid','gridSize','showGrid','showRuler','watermark','multiPerSheet','vehiculoAutoSelect','caducidadHoras',
                    'currentTemplateId']){
      s[k] = _state[k];
    }
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch(_){}
}

function loadStateFromLocal(){
  try{
    const raw = localStorage.getItem(STATE_KEY);
    if(raw){
      const s = JSON.parse(raw);
      Object.assign(_state, s);
    }
  } catch(_){}
}

async function loadTemplate(){
  if(!_state.eventoId){
    _state.templates = [];
    return;
  }
  try{
    _state.templates = await listTemplates(_state.eventoId, _state.modulo);
    if(_state.currentTemplateId){
      const t = _state.templates.find(x => x.id === _state.currentTemplateId);
      if(t) applyTemplate(t);
    } else {
      const def = await loadDefaultTemplate(_state.eventoId, _state.modulo);
      if(def) applyTemplate(def);
    }
  } catch(e){
    logger.warn('No se pudieron cargar plantillas', {error: e.message});
    _state.templates = [];
  }
}

function applyTemplate(t){
  _state.currentTemplateId = t.id;
  if(t.layout){
    _state.paperSize = t.layout.paperSize || 'A4';
    _state.paperOrient = t.layout.paperOrient || 'portrait';
    _state.font = t.layout.font || 'Arial';
    _state.labelMode = t.layout.labelMode || 'valor';
    _state.troquel = !!t.layout.troquel;
    _state.fieldLayout = t.layout.fieldLayout ? JSON.parse(JSON.stringify(t.layout.fieldLayout)) : {};
    _state.ph1On = !!t.layout.ph1On;
    _state.phrase1 = t.layout.phrase1 || '';
    _state.ph2On = !!t.layout.ph2On;
    _state.phrase2 = t.layout.phrase2 || '';
    _state.ph3On = !!t.layout.ph3On;
    _state.puerta3 = t.layout.puerta3 || {};
    _state.qrTracking = !!t.layout.qrTracking;
    _state.qrBase = t.layout.qrBase || '';
    _state.bgImage = t.layout.bgImage || null;
    _state.bgOpacity = t.layout.bgOpacity || 0.35;
    _state.bgTransform = t.layout.bgTransform || { tx:0, ty:0, rot:0, scale:1, skewX:0, skewY:0, persp:1000 };
    _state.watermark = t.layout.watermark || {enabled:false, text:'', opacity:0.1};
  }
}

async function loadRecords(){
  if(!_state.eventoId){
    _state.records = [];
    if(!_state.selectedRecordId) _state.selectedRecordId = '__demo1__';
    return;
  }
  try{
    // 'rampa' es una plantilla especial: usa registros de ingresos
    // (es el pase que se imprime al registrar un ingreso nuevo).
    const sourceCol = _state.modulo === 'rampa' ? 'ingresos' : _state.modulo;
    _state.records = await list(sourceCol, {
      where:{eventoId:_state.eventoId},
      orderBy:'createdAt', order:'desc', limit:50
    });
    if(!_state.selectedRecordId){
      _state.selectedRecordId = _state.records.length ? _state.records[0].id : '__demo1__';
    }
  } catch(e){
    logger.warn('No se pudieron cargar registros', {error: e.message});
    _state.records = [];
  }
}

function getAllRecords(){
  if(_state.records.length === 0) return DEMO_RECORDS;
  return [DEMO_RECORDS[0], ..._state.records];
}

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════
function render(){
  if(!_container) return;
  clear(_container);

  _container.appendChild(renderTopbar());

  const shell = el('div', { class:'print-shell' });
  shell.appendChild(renderLeftCol());
  shell.appendChild(renderCenterCol());
  shell.appendChild(renderRightCol());
  _container.appendChild(shell);

  saveStateToLocal();
}

// ── TOPBAR ────────────────────────────────────────────────────
function renderTopbar(){
  const wrap = el('div', { class:'print-topbar' });

  // Línea 1: selectores
  const row1 = el('div', { class:'print-topbar-row' });

  // Módulo
  const moduloSel = el('select', { class:'select select-pill',
    onchange: async e => { _state.modulo = e.target.value; _state.currentTemplateId = null; await loadTemplate(); await loadRecords(); render(); }
  },
    el('option', { value:'referencias', selected: _state.modulo === 'referencias' ? 'selected' : null }, '🔖 Referencias'),
    el('option', { value:'ingresos',    selected: _state.modulo === 'ingresos'    ? 'selected' : null }, '🚛 Ingresos'),
    el('option', { value:'agenda',      selected: _state.modulo === 'agenda'      ? 'selected' : null }, '📅 Agenda'),
    el('option', { value:'rampa',       selected: _state.modulo === 'rampa'       ? 'selected' : null }, '🏗 Rampa')
  );
  row1.appendChild(el('div', { class:'topbar-chip' },
    el('span', { html: icon('print'), class:'topbar-chip-ico' }),
    el('span', { class:'topbar-chip-label' }, 'Motor de Impresión')
  ));
  row1.appendChild(moduloSel);

  // Evento
  const evtSel = el('select', { class:'select select-pill',
    onchange: async e => { _state.eventoId = e.target.value; _state.currentTemplateId = null; await loadTemplate(); await loadRecords(); render(); }
  });
  evtSel.appendChild(el('option', { value:'' }, _state.eventos.length === 0 ? '⚠ Sin eventos (demo)' : 'Todos los eventos'));
  for(const ev of _state.eventos){
    evtSel.appendChild(el('option', { value: ev.id, selected: ev.id === _state.eventoId ? 'selected' : null }, ev.nombre));
  }
  row1.appendChild(evtSel);

  // Tamaño papel
  const paperSel = el('select', { class:'select select-pill',
    onchange: e => { _state.paperSize = e.target.value; render(); }
  });
  for(const p of Object.keys(PAPER_SIZES)){
    paperSel.appendChild(el('option', { value:p, selected: p === _state.paperSize ? 'selected' : null }, p));
  }
  row1.appendChild(paperSel);

  // Idioma
  const langSel = el('select', { class:'select select-pill',
    onchange: e => { _state.language = e.target.value; }
  });
  for(const l of LANGS){
    langSel.appendChild(el('option', { value: l.code, selected: l.code === _state.language ? 'selected' : null }, `${l.flag} ${l.name}`));
  }
  row1.appendChild(langSel);

  // Copias
  const copiesWrap = el('div', { class:'topbar-copies' }, el('span', {}, '×'));
  for(const c of [1, 2, 3, 5]){
    copiesWrap.appendChild(el('button', {
      class:`copies-btn ${_state.copies === c ? 'active' : ''}`,
      onclick: () => { _state.copies = c; render(); }
    }, String(c)));
  }
  row1.appendChild(copiesWrap);

  wrap.appendChild(row1);

  // Línea 2: acciones
  const row2 = el('div', { class:'print-topbar-row' });
  row2.appendChild(el('button', {
    class:'btn btn-secondary btn-sm',
    onclick: undo,
    disabled: _state.history.length === 0 ? 'disabled' : null
  }, '↺ Deshacer'));
  row2.appendChild(el('button', { class:'btn btn-secondary btn-sm', onclick: saveTemplateAs }, '💾 Guardar plantilla'));
  if(_state.currentTemplateId){
    row2.appendChild(el('button', { class:'btn btn-ghost btn-sm', onclick: deleteCurrentTemplate, title:'Eliminar plantilla' },
      el('span', { html: icon('trash') })
    ));
  }
  row2.appendChild(el('button', { class:'btn btn-ghost btn-sm', onclick: exportJson, title:'Exportar JSON' }, '📤'));
  row2.appendChild(el('button', { class:'btn btn-ghost btn-sm', onclick: importJson, title:'Importar JSON' }, '📥'));

  // Plantillas guardadas dropdown
  if(_state.templates.length > 0){
    const tplSel = el('select', { class:'select select-pill', style:{minWidth:'140px'},
      onchange: e => {
        const t = _state.templates.find(x => x.id === e.target.value);
        if(t){ applyTemplate(t); render(); }
      }
    });
    tplSel.appendChild(el('option', { value:'' }, '— Plantilla —'));
    for(const t of _state.templates){
      tplSel.appendChild(el('option', { value:t.id, selected: t.id === _state.currentTemplateId ? 'selected' : null },
        `${t.name}${t.isDefault ? ' ⭐' : ''}`));
    }
    row2.appendChild(tplSel);
  }

  row2.appendChild(el('div', { class:'flex-1' }));

  // Modo vista cliente
  row2.appendChild(el('button', {
    class:`btn btn-sm ${_state.clientMode ? 'btn-primary' : 'btn-secondary'}`,
    title: 'Vista cliente: oculta selección y guías para ver el pase tal cual lo verá el conductor',
    onclick: () => { _state.clientMode = !_state.clientMode; _state.selectedFieldId = null; _state.selectedFieldIds = []; render(); }
  }, _state.clientMode ? '✓ Vista cliente' : '👁 Vista cliente'));

  // Vista previa real al imprimir
  row2.appendChild(el('button', {
    class:'btn btn-secondary btn-sm',
    title:'Vista previa exacta como saldrá impreso',
    onclick: openPrintPreview
  }, '🔍 Previa'));

  row2.appendChild(el('button', { class:'btn btn-primary', onclick: doPrint }, '🖨 Imprimir'));

  wrap.appendChild(row2);
  return wrap;
}

// ── COL IZQUIERDA: REGISTROS ──────────────────────────────────
function renderLeftCol(){
  const col = el('div', { class:'print-col print-col-left' });
  const records = getAllRecords();
  col.appendChild(el('div', { class:'print-col-head' }, `REGISTROS (${records.length})`));

  const body = el('div', { class:'print-col-body' });
  for(const r of records){
    const isDemo = r.id?.startsWith('__demo');
    const isActive = _state.selectedRecordId === r.id;
    const empresa = r.empresa || '—';
    const sub = [r.hall ? `HH${r.hall}` : '', r.stand].filter(Boolean).join(' · ');

    body.appendChild(el('div', {
      class: `record-card ${isActive ? 'active' : ''}`,
      onclick: () => {
        _state.selectedRecordId = r.id;
        if(_state.vehiculoAutoSelect && r.tipoVehiculo) autoSelectByVehicle(r.tipoVehiculo);
        render();
      }
    },
      el('div', { class:'record-card-title' }, isDemo ? `✏️ Demo` : (r.matricula || '—')),
      el('div', { class:'record-card-sub' }, isDemo ? 'Datos de prueba' : `${empresa}${sub ? '<br>' + sub : ''}`)
    ));
  }
  col.appendChild(body);
  return col;
}

function autoSelectByVehicle(tipo){
  const match = _state.templates.find(t => t.tipoVehiculo === tipo);
  if(match) applyTemplate(match);
}

// ── COL CENTRO: CANVAS ────────────────────────────────────────
function renderCenterCol(){
  const col = el('div', { class:'print-col print-col-center' });

  // Zoom
  const zoomRow = el('div', { class:'zoom-row' });
  zoomRow.appendChild(el('span', {}, 'Zoom:'));
  for(const z of [0.4, 0.55, 0.7, 0.85, 1]){
    zoomRow.appendChild(el('button', {
      class: `zoom-btn ${_state.zoom === z ? 'active' : ''}`,
      onclick: () => { _state.zoom = z; render(); }
    }, `${Math.round(z*100)}%`));
  }
  col.appendChild(zoomRow);

  col.appendChild(renderCanvas());
  return col;
}

function renderCanvas(){
  const wrap = el('div', { class:'canvas-wrap' });
  const size = PAPER_SIZES[_state.paperSize];
  let mmW = size.w, mmH = size.h;
  if(_state.paperOrient === 'landscape'){ const t = mmW; mmW = mmH; mmH = t; }
  // Tamaño REAL del papel (sin zoom). El zoom se aplica con
  // transform:scale() sobre el canvas-paper, así fuentes (px),
  // posiciones (%) y papel escalan TODOS juntos.
  const pxWreal = mmW * 3.78;
  const pxHreal = mmH * 3.78;
  // Tamaño visual ya escalado (para reglas y reservar espacio).
  const pxW = pxWreal * _state.zoom;
  const pxH = pxHreal * _state.zoom;

  // ── Regla milimétrica (top + left) ───────────────────────
  if(_state.showRuler){
    const rulerH = el('div', { class:'ruler ruler-h', style:{ width: pxW + 'px' } });
    for(let mm = 0; mm <= mmW; mm += 5){
      const isLabel = mm % 10 === 0;
      rulerH.appendChild(el('div', {
        class: `ruler-tick ${isLabel ? 'major' : ''}`,
        style:{ left: (mm * 3.78 * _state.zoom) + 'px' }
      }, isLabel ? String(mm) : ''));
    }
    wrap.appendChild(rulerH);
  }

  const inner = el('div', { class:'canvas-inner' });

  if(_state.showRuler){
    const rulerV = el('div', { class:'ruler ruler-v', style:{ height: pxH + 'px' } });
    for(let mm = 0; mm <= mmH; mm += 5){
      const isLabel = mm % 10 === 0;
      rulerV.appendChild(el('div', {
        class: `ruler-tick-v ${isLabel ? 'major' : ''}`,
        style:{ top: (mm * 3.78 * _state.zoom) + 'px' }
      }, isLabel ? String(mm) : ''));
    }
    inner.appendChild(rulerV);
  }

  const paper = el('div', {
    class:`canvas-paper ${_state.troquel ? 'troquel' : ''} ${_state.showGrid ? 'has-grid' : ''}`,
    style:{
      width: pxWreal + 'px',
      height: pxHreal + 'px',
      fontFamily: _state.font,
      transform: `scale(${_state.zoom})`,
      transformOrigin: 'top center',
      '--grid-size': (_state.gridSize > 0 ? (_state.gridSize * 3.78) : 0) + 'px'
    },
    ondragover: e => {
      e.preventDefault();
      handleAlignGuides(e, paper);
    },
    ondragleave: () => { _state.alignGuides = {x:null, y:null}; },
    ondrop: e => onCanvasDrop(e, paper),
    onmousedown: e => {
      if(e.target === paper){
        _state.selectedFieldId = null;
        _state.selectedFieldIds = [];
        render();
      }
    }
  });

  // Background image con TRANSFORMACIÓN TRAPEZOIDAL/PERSPECTIVA + manipulación directa
  if(_state.bgImage && _state.showGuide){
    const tr = _state.bgTransform;
    const editing = _state.bgEditMode && _state.bgEditMode !== 'off';

    const bgLayer = el('div', {
      class: editing ? 'bg-edit-layer' : '',
      style:{
        position:'absolute', inset:0, zIndex: editing ? '8' : '1',
        pointerEvents: editing ? 'auto' : 'none',
        perspective: tr.persp + 'px'
      }
    });

    const img = el('img', {
      class:'canvas-bg-img',
      src: _state.bgImage,
      style:{
        opacity: String(_state.bgOpacity),
        transform: `translate(${tr.tx}%, ${tr.ty}%) rotate(${tr.rot}deg) scale(${tr.scale}) skew(${tr.skewX}deg, ${tr.skewY}deg)`,
        transformOrigin:'center',
        cursor: editing ? (_state.bgEditMode === 'move' ? 'move' : _state.bgEditMode === 'rotate' ? 'grab' : 'default') : 'default',
        touchAction:'none'
      }
    });

    if(editing){
      img.addEventListener('pointerdown', e => startBgManipulation(e, paper));
    }
    bgLayer.appendChild(img);

    // Marca esquinas si modo warp (perspective)
    if(_state.bgEditMode === 'warp'){
      for(const corner of ['tl', 'tr', 'bl', 'br']){
        const pos = {
          tl:{ left:'10%',  top:'10%'    },
          tr:{ right:'10%', top:'10%'    },
          bl:{ left:'10%',  bottom:'10%' },
          br:{ right:'10%', bottom:'10%' }
        }[corner];
        const handle = el('div', {
          class:'bg-corner-handle',
          'data-corner': corner,
          style: { ...pos, position:'absolute', touchAction:'none' }
        });
        handle.addEventListener('pointerdown', e => startBgCornerDrag(e, corner, paper));
        bgLayer.appendChild(handle);
      }
    }

    paper.appendChild(bgLayer);
  }

  // Watermark
  if(_state.watermark?.enabled && _state.watermark.text){
    paper.appendChild(el('div', {
      style:{
        position:'absolute', inset:0,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'72px', fontWeight:'900',
        color:`rgba(220,38,38,${_state.watermark.opacity})`,
        transform:'rotate(-30deg)', pointerEvents:'none', zIndex:'2',
        textTransform:'uppercase', letterSpacing:'8px'
      }
    }, _state.watermark.text));
  }

  // Idioma del pase = idioma del conductor del registro actual
  const recordsAll = getAllRecords();
  const currentRecord = recordsAll.find(x => x.id === _state.selectedRecordId) || recordsAll[0];
  const driverLang = getDriverLang(currentRecord);

  // Frase 1 (ámbar)
  if(_state.ph1On && _state.phrase1){
    const txt = interpolatePhrase(_state.phrase1, currentRecord, driverLang);
    paper.appendChild(el('div', {
      style:{
        position:'absolute', left:'10%', right:'10%', top:'8mm',
        background:'#FEF3C7', border:'1.5px solid #F59E0B',
        padding:'6px 10px', borderRadius:'4px',
        fontSize:'12px', fontWeight:'600', color:'#92400E',
        textAlign:'center', zIndex:'3'
      }
    }, txt));
  }

  // Frase 2 (pie borde negro)
  if(_state.ph2On && _state.phrase2){
    const txt = interpolatePhrase(_state.phrase2, currentRecord, driverLang);
    paper.appendChild(el('div', {
      style:{
        position:'absolute', left:'10%', right:'10%', bottom:'6mm',
        border:'1.5px solid #000', padding:'5px 10px',
        fontSize:'10px', textAlign:'center', zIndex:'3'
      }
    }, txt));
  }

  // Guías de alineación al arrastrar
  if(_state.alignGuides.x !== null){
    paper.appendChild(el('div', { class:'align-guide guide-v', style:{ left: _state.alignGuides.x + '%' } }));
  }
  if(_state.alignGuides.y !== null){
    paper.appendChild(el('div', { class:'align-guide guide-h', style:{ top: _state.alignGuides.y + '%' } }));
  }

  // Campos
  const data = getRecordData();
  for(const [fid, conf] of Object.entries(_state.fieldLayout)){
    if(conf.hidden) continue;
    paper.appendChild(renderField(fid, conf, data));
  }

  // El paper usa transform:scale(), que NO afecta al flujo de layout:
  // el navegador seguiría reservando el tamaño REAL. Lo envolvemos en
  // un contenedor con las dimensiones VISUALES (ya escaladas) para que
  // el scroll y el centrado sean correctos.
  const paperBox = el('div', {
    class:'canvas-paper-box',
    style:{ width: pxW + 'px', height: pxH + 'px', position:'relative', flexShrink:'0' }
  });
  paperBox.appendChild(paper);
  inner.appendChild(paperBox);
  wrap.appendChild(inner);
  return wrap;
}

// Actualiza la posición de un campo en el DOM SIN re-render completo.
// Esto da arrastre fluido píxel-por-píxel sin trabajo extra de React-like.
function updateFieldNodeFast(fid){
  const conf = _state.fieldLayout[fid];
  if(!conf) return;
  const node = document.querySelector(`.canvas-field[data-fid="${fid}"]`);
  if(!node) return;
  node.style.left = conf.x + '%';
  node.style.top = conf.y + '%';
  node.setAttribute('data-pos', `${conf.x.toFixed(1)}, ${conf.y.toFixed(1)}`);
}

// Pinta o quita las guías de alineación rojas SIN re-render.
function updateAlignGuidesFast(paper, gx, gy){
  paper.querySelectorAll('.align-guide').forEach(n => n.remove());
  if(gx !== null){
    const g = document.createElement('div');
    g.className = 'align-guide guide-v';
    g.style.left = gx + '%';
    paper.appendChild(g);
  }
  if(gy !== null){
    const g = document.createElement('div');
    g.className = 'align-guide guide-h';
    g.style.top = gy + '%';
    paper.appendChild(g);
  }
}

// Calcula guías de alineación: cuando arrastras, si te acercas
// a la misma X o Y de otro campo, aparece una línea roja.
function handleAlignGuides(e, paper){
  if(!_state.snapToGrid) return; // Solo si snap activo
  const rect = paper.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  const TOL = 1.5; // % tolerancia
  let snapX = null, snapY = null;
  const draggingId = _state.selectedFieldId;
  for(const [fid, conf] of Object.entries(_state.fieldLayout)){
    if(fid === draggingId || conf.hidden) continue;
    if(Math.abs(conf.x - x) < TOL) snapX = conf.x;
    if(Math.abs(conf.y - y) < TOL) snapY = conf.y;
  }
  // Bordes y centro del papel
  for(const ref of [0, 50, 95]){
    if(Math.abs(ref - x) < TOL) snapX = ref;
    if(Math.abs(ref - y) < TOL) snapY = ref;
  }
  if(snapX !== _state.alignGuides.x || snapY !== _state.alignGuides.y){
    _state.alignGuides = { x: snapX, y: snapY };
    // Re-render solo si hay cambio (evita parpadeo)
    const existing = paper.querySelectorAll('.align-guide');
    existing.forEach(n => n.remove());
    if(snapX !== null){
      const g = document.createElement('div');
      g.className = 'align-guide guide-v';
      g.style.left = snapX + '%';
      paper.appendChild(g);
    }
    if(snapY !== null){
      const g = document.createElement('div');
      g.className = 'align-guide guide-h';
      g.style.top = snapY + '%';
      paper.appendChild(g);
    }
  }
}

// Construye el objeto de estilo de un campo combinando todas las
// propiedades tipo Word (bold/italic/underline/strike/align/spacing/etc).
function buildFieldStyle(conf, def, extra = {}){
  const decorations = [];
  if(conf.underline) decorations.push('underline');
  if(conf.strike)    decorations.push('line-through');
  const vAlign = conf.vAlign === 'super' ? 'super' : conf.vAlign === 'sub' ? 'sub' : 'baseline';
  return {
    left: conf.x + '%',
    top: conf.y + '%',
    fontSize: (conf.fontSize || def.defSize) + 'px',
    fontWeight: conf.bold ? 'bold' : 'normal',
    fontStyle: conf.italic ? 'italic' : 'normal',
    textDecoration: decorations.length ? decorations.join(' ') : 'none',
    color: conf.color || '#000',
    textAlign: conf.textAlign || 'left',
    lineHeight: String(conf.lineHeight ?? 1.2),
    letterSpacing: (conf.letterSpacing ?? 0) + 'px',
    verticalAlign: vAlign,
    transform: conf.rotation ? `rotate(${conf.rotation}deg)` : '',
    ...extra
  };
}

// Construye el contenido visual de los campos "especiales"
// (QR, código de barras, logos). Devuelve un nodo o null si fid
// no es un campo especial. Se usa tanto en el render editable como
// en la vista cliente / impresión, para que el QR SÍ se imprima
// (antes la rama clientMode los dejaba vacíos).
function buildSpecialContent(fid, conf, data){
  if(fid === 'qr' || fid === 'qrDireccion'){
    const size = conf.fontSize || 80;
    let qrData = '';
    if(fid === 'qr'){
      const base = (_state.qrBase || '').trim();
      const rid = data._recordId || '';
      qrData = base
        ? (base.replace(/\/+$/, '') + '/' + rid)
        : ('BeUnifyT:' + (rid || 'demo'));
    } else {
      const dir = (data.recintoDir || '').trim();
      qrData = dir
        ? ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(dir))
        : '';
    }
    if(qrData){
      const px = Math.round(size * 4);
      const apiUrl = 'https://api.qrserver.com/v1/create-qr-code/?size='
        + px + 'x' + px + '&margin=0&data=' + encodeURIComponent(qrData);
      return el('img', {
        src: apiUrl, alt: 'QR',
        style:{ width: size + 'px', height: size + 'px', display:'block' }
      });
    }
    return el('div', { style:{
      width: size + 'px', height: size + 'px',
      border:'1px dashed #b45309', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontSize: Math.max(size/7, 7) + 'px', color:'#b45309',
      textAlign:'center', lineHeight:'1.1', padding:'2px', boxSizing:'border-box'
    }}, fid === 'qrDireccion' ? 'Sin dirección de recinto' : 'Sin URL de seguimiento');
  }
  if(fid === 'barcode'){
    const w = (conf.fontSize || 60) * 2, h = (conf.fontSize || 60) / 2;
    return el('div', { style:{
      width: w + 'px', height: h + 'px',
      background:'repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 5px, #fff 5px, #fff 7px)'
    }});
  }
  if(fid === 'logo' || fid === 'recintoLogo'){
    const s = conf.fontSize || 40;
    return el('div', { style:{
      width: s + 'px', height: s + 'px',
      background:'#E5E7EB', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontSize:'10px', color:'#6B7280'
    }}, 'LOGO');
  }
  return null;
}

function renderField(fid, conf, data){
  const def = FIELDS[fid];
  if(!def) return el('span', {});
  const rawValue = data[def.source];
  // Un campo sin dato en el registro llega como '' (cadena vacía).
  // Antes eso producía un nodo de texto vacío => invisible en el canvas
  // aunque el campo estuviera colocado. Ahora detectamos el vacío y
  // mostramos un placeholder con el nombre del campo en modo edición.
  const isEmpty = rawValue == null || String(rawValue).trim() === '';
  const value = isEmpty ? (def.label || def.source) : rawValue;

  // Plantilla condicional
  if(conf.condition && !evalCondition(conf.condition, data)){
    return el('span', {});
  }

  const isSelected = _state.selectedFieldId === fid;
  const isMultiSelected = _state.selectedFieldIds.includes(fid);
  const zIdx = conf.zIndex != null ? conf.zIndex : 10;

  // Modo "vista cliente": no editable, sin outline, sin handlers
  if(_state.clientMode){
    const view = el('div', {
      class: `canvas-field ${conf.highlight ? 'highlight' : ''}`,
      style: buildFieldStyle(conf, def, { zIndex: String(zIdx), pointerEvents:'none', cursor:'default' })
    });
    const special = buildSpecialContent(fid, conf, data);
    if(special){
      view.appendChild(special);
    } else {
      // En vista cliente / impresión un campo sin dato queda vacío,
      // nunca muestra el nombre del campo como placeholder.
      view.appendChild(document.createTextNode(isEmpty ? '' : value));
    }
    return view;
  }

  const node = el('div', {
    class: `canvas-field ${isSelected ? 'selected' : ''} ${isMultiSelected ? 'multi-selected' : ''} ${conf.highlight ? 'highlight' : ''}`,
    'data-pos': `${conf.x.toFixed(1)}, ${conf.y.toFixed(1)}`,
    'data-fid': fid,
    style: buildFieldStyle(conf, def, { zIndex: String(zIdx), touchAction:'none' }),
    // Ctrl+wheel: escalar
    onwheel: e => {
      if(!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 2 : -2;
      conf.fontSize = Math.max(8, Math.min(120, (conf.fontSize || def.defSize) + delta));
      render();
    },
    onpointerdown: e => {
      e.stopPropagation();
      e.preventDefault();
      const paper = node.closest('.canvas-paper');
      if(!paper) return;

      // Selección
      if(e.shiftKey && e.button === 0){
        const i = _state.selectedFieldIds.indexOf(fid);
        if(i >= 0) _state.selectedFieldIds.splice(i, 1);
        else _state.selectedFieldIds.push(fid);
        _state.selectedFieldId = fid;
        _state.activeTab = 'editar';
        render();
        return;
      } else if(!_state.selectedFieldIds.includes(fid)){
        _state.selectedFieldId = fid;
        _state.selectedFieldIds = [fid];
        _state.activeTab = 'editar';
        render();
      } else {
        _state.selectedFieldId = fid;
      }

      // Alt-drag duplica AL INICIAR
      let workingId = fid;
      let workingConf = conf;
      let isClone = false;
      if(e.altKey){
        let n = 2;
        let newKey = `${fid}_copy_${n}`;
        while(_state.fieldLayout[newKey]){ n++; newKey = `${fid}_copy_${n}`; }
        _state.fieldLayout[newKey] = JSON.parse(JSON.stringify(conf));
        workingId = newKey;
        workingConf = _state.fieldLayout[newKey];
        _state.selectedFieldId = newKey;
        _state.selectedFieldIds = [newKey];
        isClone = true;
      }

      // Arrastre fluido pointer-based (sin HTML5 drag)
      pushHistory();
      paper.classList.add('dragging');
      const rect = paper.getBoundingClientRect();
      const startX = e.clientX, startY = e.clientY;
      const startConfX = workingConf.x, startConfY = workingConf.y;

      // Cache otras posiciones para snap (cuando Shift)
      const otherConfs = Object.entries(_state.fieldLayout)
        .filter(([k, c]) => k !== workingId && !c.hidden)
        .map(([k, c]) => c);

      // Si es selección múltiple, guardamos snapshot de todas
      const multiSnap = _state.selectedFieldIds.length > 1 && _state.selectedFieldIds.includes(workingId)
        ? _state.selectedFieldIds.map(id => ({ id, conf: _state.fieldLayout[id], x0: _state.fieldLayout[id]?.x, y0: _state.fieldLayout[id]?.y })).filter(s => s.conf)
        : null;

      const onMove = (ev) => {
        let dx = ((ev.clientX - startX) / rect.width)  * 100;
        let dy = ((ev.clientY - startY) / rect.height) * 100;

        // SHIFT pulsado: activa snap (Word/Figma style invertido)
        if(ev.shiftKey){
          if(_state.gridSize > 0){
            const nx = Math.round((startConfX + dx) / _state.gridSize) * _state.gridSize;
            const ny = Math.round((startConfY + dy) / _state.gridSize) * _state.gridSize;
            dx = nx - startConfX;
            dy = ny - startConfY;
          }
        }

        const newX = Math.max(0, Math.min(95, startConfX + dx));
        const newY = Math.max(0, Math.min(95, startConfY + dy));

        // Guías de alineación visuales (solo con Shift)
        let guideX = null, guideY = null;
        if(ev.shiftKey){
          const TOL = 1.5;
          for(const oc of otherConfs){
            if(Math.abs(oc.x - newX) < TOL){ guideX = oc.x; }
            if(Math.abs(oc.y - newY) < TOL){ guideY = oc.y; }
          }
          for(const ref of [0, 50, 95]){
            if(Math.abs(ref - newX) < TOL) guideX = ref;
            if(Math.abs(ref - newY) < TOL) guideY = ref;
          }
        }

        // Aplicar
        if(multiSnap){
          const ddx = newX - startConfX, ddy = newY - startConfY;
          for(const s of multiSnap){
            s.conf.x = Math.max(0, Math.min(95, s.x0 + ddx));
            s.conf.y = Math.max(0, Math.min(95, s.y0 + ddy));
          }
        } else {
          workingConf.x = guideX !== null ? guideX : newX;
          workingConf.y = guideY !== null ? guideY : newY;
        }

        // Actualizar SOLO el nodo afectado y guías (sin re-render completo) → fluido
        updateFieldNodeFast(workingId);
        if(multiSnap){
          for(const s of multiSnap){ if(s.id !== workingId) updateFieldNodeFast(s.id); }
        }
        updateAlignGuidesFast(paper, guideX, guideY);
      };

      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        paper.classList.remove('dragging');
        // Limpiar guías y forzar render normal una vez
        updateAlignGuidesFast(paper, null, null);
        render();
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    }
  });

  // Renderizar según tipo
  const special = buildSpecialContent(fid, conf, data);
  if(special){
    node.appendChild(special);
  } else {
    // Modo etiqueta — el LABEL se traduce al idioma del conductor
    const recordsAll2 = getAllRecords();
    const r2 = recordsAll2.find(x => x.id === _state.selectedRecordId) || recordsAll2[0];
    const dl = getDriverLang(r2);
    const labelKey = def.i18nKey || null;
    const labelText = labelKey ? trIn(dl, labelKey, def.label) : def.label;
    if(_state.labelMode === 'label'){
      node.appendChild(el('span', { style:{ color:'#666', marginRight:'8px', fontSize:'70%' } }, labelText + ':'));
    } else if(_state.labelMode === 'linea'){
      node.appendChild(el('span', { style:{ color:'#666', marginRight:'8px', fontSize:'70%' } }, labelText + ':'));
      node.appendChild(el('span', { style:{ borderBottom:'1px solid #000', minWidth:'80px', display:'inline-block' } }));
      return node;
    }
    if(isEmpty){
      // Campo colocado pero sin dato en este registro: mostramos el
      // nombre como placeholder atenuado para que sea visible y
      // arrastrable. NO se imprime (ver rama clientMode arriba).
      node.appendChild(el('span', {
        class:'field-placeholder',
        style:{ opacity:'0.4', fontStyle:'italic' }
      }, value));
    } else {
      node.appendChild(document.createTextNode(value));
    }
  }

  return node;
}

// Devuelve el idioma del conductor del registro actual (para frases del pase).
// Si no hay conductor o no tiene idioma, usa el idioma del usuario operario.
function getDriverLang(record){
  if(record?.conductorLang) return record.conductorLang;
  if(record?.lang) return record.lang;
  // Buscar en la base de conductores
  const conds = _state.conductores || [];
  const c = conds.find(x =>
    (x.nombre && record?.conductor && x.nombre === record.conductor) ||
    (x.matriculas || []).includes(record?.matricula)
  );
  return c?.lang || getLang();
}

// Interpola placeholders dinámicos en una frase del pase:
//   {tr:welcomeMsg}     → traducido al idioma del conductor
//   {plate}, {hall}, {driver}, {company}, {event}, {position}
function interpolatePhrase(text, record, driverLang){
  if(!text) return '';
  let out = text;
  // {tr:key} → traducción al idioma del conductor
  out = out.replace(/\{tr:([\w_]+)\}/g, (_, key) => {
    try { return trIn(driverLang, key, key); }
    catch(_){ return key; }
  });
  // Variables de datos
  const vars = {
    plate:    record?.matricula || '',
    hall:     record?.hall || '',
    stand:    record?.stand || '',
    driver:   record?.conductor || '',
    company:  record?.empresa || '',
    event:    record?.eventoNombre || '',
    position: record?.posicion || '',
    time:     record?.horaEntrada || ''
  };
  for(const [k, v] of Object.entries(vars)){
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return out;
}

function getRecordData(){
  const records = getAllRecords();
  const r = records.find(x => x.id === _state.selectedRecordId) || records[0];
  if(!r) return {};
  const evento = _state.eventos.find(e => e.id === r.eventoId);
  const recinto = evento ? _state.recintos.find(rc => rc.id === evento.recintoId) : null;
  const codSeg = (r.id || '').slice(-4).toUpperCase().replace(/[^A-Z0-9]/g, 'X').padEnd(4, 'X');
  const TV = { trailer:'Trailer', semiremolque:'Semiremolque', camion:'Camión', furgoneta:'Furgoneta' };
  return {
    matricula: r.matricula || '',
    matricula2: r.matricula2 || '',
    remolque: r.remolque || '',
    tipoVehiculo: TV[r.tipoVehiculo] || r.tipoVehiculo || '',
    paisMatricula: r.paisMatricula || '',
    conductor: r.conductor || ((r.nombre || '') + ' ' + (r.apellido || '')).trim() || '',
    telefono: r.telefono || '',
    empresa: r.empresa || '',
    hall: r.hall || '',
    stand: r.stand || '',
    expositor: r.expositor || '',
    referencia: r.referencia || '',
    posicion: String(r.posicion || ''),
    puertaHall: r.puertaHall || '',
    llamador: r.llamador || '',
    montador: r.montador || '',
    descargaTipo: r.descargaTipo || '',
    pasaporte: r.pasaporte || '',
    fechaNacimiento: r.fechaNacimiento || '',
    pais: r.pais || '',
    email: r.email || '',
    evento: evento?.nombre || '— Evento Demo —',
    fecha: new Date().toLocaleDateString('es'),
    horario: r.horaEntrada || r.horario || '',
    comentario: r.comentario || r.notas || '',
    mensajeRampa: r.mensajeRampa || '',
    estado: r.estado || '',
    codSeguridad: codSeg,
    recintoLogo: '[LOGO]',
    recintoDir: recinto?.direccion || '',
    _recordId: r.id || '',
    _empresaNivel: r._empresaNivel || 'estandar',
    _tipoVehiculo: r.tipoVehiculo || ''
  };
}

function evalCondition(cond, data){
  if(!cond || !cond.field) return true;
  const v = data[cond.field];
  if(cond.op === '==') return String(v) === String(cond.value);
  if(cond.op === '!=') return String(v) !== String(cond.value);
  if(cond.op === 'contains') return String(v || '').includes(String(cond.value));
  return true;
}

function onCanvasDrop(e, paper){
  e.preventDefault();
  _state.alignGuides = { x:null, y:null };
  const moveId  = e.dataTransfer.getData('move-field');
  const newId   = e.dataTransfer.getData('new-field');
  const cloneId = e.dataTransfer.getData('clone-field');
  const rect = paper.getBoundingClientRect();
  let x = ((e.clientX - rect.left) / rect.width) * 100;
  let y = ((e.clientY - rect.top) / rect.height) * 100;
  x = Math.max(0, Math.min(95, x));
  y = Math.max(0, Math.min(95, y));

  if(_state.snapToGrid && _state.gridSize > 0){
    x = Math.round(x / _state.gridSize) * _state.gridSize;
    y = Math.round(y / _state.gridSize) * _state.gridSize;
  }
  if(_state.snapToGrid){
    const TOL = 1.5;
    for(const [fid, conf] of Object.entries(_state.fieldLayout)){
      if(fid === moveId || conf.hidden) continue;
      if(Math.abs(conf.x - x) < TOL) x = conf.x;
      if(Math.abs(conf.y - y) < TOL) y = conf.y;
    }
    for(const ref of [0, 50, 95]){
      if(Math.abs(ref - x) < TOL) x = ref;
      if(Math.abs(ref - y) < TOL) y = ref;
    }
  }

  pushHistory();
  if(cloneId){
    // Alt-drag: duplicar — busca un id libre tipo "<original>_copy_N"
    const orig = _state.fieldLayout[cloneId];
    if(orig){
      let n = 2;
      let newKey = `${cloneId}_copy_${n}`;
      while(_state.fieldLayout[newKey]){ n++; newKey = `${cloneId}_copy_${n}`; }
      _state.fieldLayout[newKey] = { ...JSON.parse(JSON.stringify(orig)), x, y };
      _state.selectedFieldId = newKey;
      toast('Campo duplicado', 'ok');
    }
  } else if(moveId){
    if(_state.fieldLayout[moveId]){
      const oldX = _state.fieldLayout[moveId].x;
      const oldY = _state.fieldLayout[moveId].y;
      const dx = x - oldX, dy = y - oldY;
      // Si hay selección múltiple, mover todos los seleccionados juntos
      if(_state.selectedFieldIds.length > 1 && _state.selectedFieldIds.includes(moveId)){
        for(const sid of _state.selectedFieldIds){
          const c = _state.fieldLayout[sid];
          if(!c) continue;
          c.x = Math.max(0, Math.min(95, c.x + dx));
          c.y = Math.max(0, Math.min(95, c.y + dy));
        }
      } else {
        _state.fieldLayout[moveId].x = x;
        _state.fieldLayout[moveId].y = y;
      }
    }
  } else if(newId){
    const def = FIELDS[newId];
    if(!def) return;
    _state.fieldLayout[newId] = {
      x, y,
      fontSize: def.defSize,
      bold: !!def.defBold,
      highlight: !!def.defHighlight,
      color:'#000',
      rotation:0,
      zIndex: 10
    };
    _state.selectedFieldId = newId;
    _state.selectedFieldIds = [newId];
    _state.activeTab = 'editar';
  }
  render();
}

// ── COL DERECHA: TABS ─────────────────────────────────────────
function renderRightCol(){
  const col = el('div', { class:'print-col print-col-right' });
  const tabs = el('div', { class:'tab-strip' });
  for(const t of [['campos','📋 Campos'],['editar','✎ Editar'],['config','⚙ Config'],['guia','🖼 Guía']]){
    tabs.appendChild(el('button', {
      class: _state.activeTab === t[0] ? 'active' : '',
      onclick: () => { _state.activeTab = t[0]; render(); }
    }, t[1]));
  }
  col.appendChild(tabs);

  const body = el('div', { class:'print-col-body' });
  if(_state.activeTab === 'campos') body.appendChild(renderCamposTab());
  else if(_state.activeTab === 'editar') body.appendChild(renderEditarTab());
  else if(_state.activeTab === 'guia') body.appendChild(renderGuiaTab());
  else body.appendChild(renderConfigTab());
  col.appendChild(body);
  return col;
}

// Tab Guía — manipulación directa de la imagen de fondo + sliders complementarios
function renderGuiaTab(){
  const wrap = el('div', {});

  if(!_state.bgImage){
    wrap.appendChild(el('div', { class:'config-card' },
      el('div', { class:'config-card-head' }, '🖼 Imagen guía'),
      el('p', { class:'config-card-desc' }, 'Sube una foto del pase real para alinear los campos. Podrás moverla, escalarla, rotarla e incluso corregir la perspectiva trapezoidal arrastrando directamente sobre la imagen.'),
      el('input', {
        type:'file', accept:'image/*', id:'__bg_file_guia',
        style:{ display:'none' },
        onchange: async e => {
          const file = e.target.files[0]; if(!file) return;
          _state.bgImage = await compressImage(file);
          render();
        }
      }),
      el('button', { class:'btn btn-secondary btn-sm w-full',
        onclick: () => document.getElementById('__bg_file_guia').click()
      }, '🖼 Cargar imagen guía')
    ));
    return wrap;
  }

  // Hay imagen. Mostramos info + sliders + controles de manipulación directa
  wrap.appendChild(el('div', { class:'edit-field-title' },
    el('span', {}, '🖼 Editar imagen guía')
  ));

  // Modo de manipulación directa
  wrap.appendChild(el('label', { class:'edit-label' }, 'Modo manipulación directa sobre la imagen'));
  const modeRow = el('div', { style:{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'4px', marginBottom:'10px' } });
  const modes = [
    ['off',   '🚫', 'Desactivado'],
    ['move',  '✥',  'Mover'],
    ['rotate','↻',  'Rotar'],
    ['warp',  '◇',  'Perspectiva (4 esquinas)']
  ];
  for(const [val, ico, title] of modes){
    modeRow.appendChild(el('button', {
      class:`btn btn-sm ${_state.bgEditMode === val ? 'btn-primary' : 'btn-secondary'}`,
      title,
      style:{ padding:'8px 4px', fontSize:'16px' },
      onclick: () => { _state.bgEditMode = val; render(); }
    }, ico));
  }
  wrap.appendChild(modeRow);

  if(_state.bgEditMode && _state.bgEditMode !== 'off'){
    const labels = {
      move:   '✥ Arrastra la imagen sobre el papel para moverla.',
      rotate: '↻ Arrastra circularmente sobre la imagen para rotar.',
      warp:   '◇ Arrastra cada esquina de la imagen para deformarla en trapezoide.'
    };
    wrap.appendChild(el('p', { class:'cell-mute', style:{fontSize:'12px', marginBottom:'12px', padding:'8px', background:'var(--surface-2)', borderRadius:'6px'} },
      labels[_state.bgEditMode] || ''));
  }

  // Opacidad
  const tr = _state.bgTransform;
  wrap.appendChild(el('label', { class:'edit-label' }, `Opacidad: ${Math.round(_state.bgOpacity * 100)}%`));
  wrap.appendChild(el('input', {
    type:'range', min:'5', max:'100', step:'5',
    value: String(Math.round(_state.bgOpacity * 100)),
    style:{ width:'100%' },
    oninput: e => { _state.bgOpacity = Number(e.target.value)/100; updateBgImageFast(); }
  }));

  // Slider helper — actualiza imagen sin re-renderizar el panel (fix bug "salta")
  const sliderRow = (label, key, min, max, step, unit) => {
    const valSpan = el('span', { style:{fontFamily:'monospace', fontSize:'11px', color:'var(--text-3)'} }, tr[key] + unit);
    const lbl = el('label', { class:'edit-label', style:{marginTop:'10px', display:'flex', justifyContent:'space-between', alignItems:'center'} },
      el('span', {}, label),
      valSpan
    );
    const input = el('input', {
      type:'range', min:String(min), max:String(max), step:String(step),
      value: String(tr[key]),
      style:{ width:'100%' },
      oninput: e => {
        tr[key] = Number(e.target.value);
        valSpan.textContent = tr[key] + unit;
        updateBgImageFast();
      }
    });
    wrap.appendChild(lbl);
    wrap.appendChild(input);
  };

  wrap.appendChild(el('div', { class:'config-section-head', style:{marginTop:'14px'} }, 'AJUSTE FINO (sliders)'));
  sliderRow('Rotación', 'rot',   -180, 180, 0.5, '°');
  sliderRow('Escala',   'scale', 0.3,  3,   0.05, 'x');
  sliderRow('Mover X',  'tx',    -50,  50,  0.5, '%');
  sliderRow('Mover Y',  'ty',    -50,  50,  0.5, '%');
  sliderRow('Inclinar X (trapezoide)', 'skewX', -45, 45, 0.5, '°');
  sliderRow('Inclinar Y (trapezoide)', 'skewY', -45, 45, 0.5, '°');

  wrap.appendChild(el('button', { class:'btn btn-ghost btn-sm w-full', style:{marginTop:'12px'},
    onclick: () => {
      _state.bgTransform = { tx:0, ty:0, rot:0, scale:1, skewX:0, skewY:0, persp:1000 };
      render();
    }
  }, '↻ Restablecer ajustes'));

  wrap.appendChild(el('button', { class:'btn btn-danger btn-sm w-full', style:{marginTop:'4px'},
    onclick: () => {
      _state.bgImage = null;
      _state.bgTransform = { tx:0, ty:0, rot:0, scale:1, skewX:0, skewY:0, persp:1000 };
      _state.bgEditMode = 'off';
      render();
    }
  }, '✕ Quitar imagen'));

  return wrap;
}

// Actualiza la imagen de fondo en el DOM sin re-render del panel
// (esto era el bug que hacía "saltar" los sliders al inicio).
function updateBgImageFast(){
  const img = document.querySelector('.canvas-bg-img');
  if(!img) return;
  const tr = _state.bgTransform;
  img.style.opacity = String(_state.bgOpacity);
  img.style.transform = `translate(${tr.tx}%, ${tr.ty}%) rotate(${tr.rot}deg) scale(${tr.scale}) skew(${tr.skewX}deg, ${tr.skewY}deg)`;
}

// Manipulación directa: mover / rotar imagen de fondo arrastrándola
function startBgManipulation(e, paper){
  e.stopPropagation();
  e.preventDefault();
  const tr = _state.bgTransform;
  const rect = paper.getBoundingClientRect();
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;

  const startTX = tr.tx, startTY = tr.ty;
  const startRot = tr.rot;
  const startX = e.clientX, startY = e.clientY;
  const startAngle = Math.atan2(startY - cy, startX - cx) * 180 / Math.PI;
  const mode = _state.bgEditMode;

  const onMove = (ev) => {
    if(mode === 'move'){
      const dx = ((ev.clientX - startX) / rect.width)  * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      tr.tx = +(startTX + dx).toFixed(1);
      tr.ty = +(startTY + dy).toFixed(1);
    } else if(mode === 'rotate'){
      const ang = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
      tr.rot = +(startRot + (ang - startAngle)).toFixed(1);
    }
    updateBgImageFast();
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    render(); // sync sliders del panel
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

// Arrastrar esquinas → modificar skewX / skewY (efecto trapezoidal)
function startBgCornerDrag(e, corner, paper){
  e.stopPropagation();
  e.preventDefault();
  const tr = _state.bgTransform;
  const rect = paper.getBoundingClientRect();
  const startX = e.clientX, startY = e.clientY;
  const startSkewX = tr.skewX, startSkewY = tr.skewY;
  const startScale = tr.scale;

  const onMove = (ev) => {
    const dx = ((ev.clientX - startX) / rect.width)  * 100;
    const dy = ((ev.clientY - startY) / rect.height) * 100;
    // Mapeo: cada esquina afecta skew según su orientación
    let sx = startSkewX, sy = startSkewY, sc = startScale;
    if(corner === 'tl'){ sx = startSkewX + dx * 0.5; sy = startSkewY + dy * 0.5; sc = startScale - (dx + dy) * 0.005; }
    if(corner === 'tr'){ sx = startSkewX - dx * 0.5; sy = startSkewY + dy * 0.5; sc = startScale + (dx - dy) * 0.005; }
    if(corner === 'bl'){ sx = startSkewX + dx * 0.5; sy = startSkewY - dy * 0.5; sc = startScale - (dx - dy) * 0.005; }
    if(corner === 'br'){ sx = startSkewX - dx * 0.5; sy = startSkewY - dy * 0.5; sc = startScale + (dx + dy) * 0.005; }
    tr.skewX = +Math.max(-45, Math.min(45, sx)).toFixed(1);
    tr.skewY = +Math.max(-45, Math.min(45, sy)).toFixed(1);
    tr.scale = +Math.max(0.3, Math.min(3, sc)).toFixed(2);
    updateBgImageFast();
  };
  const onUp = () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    render();
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
}

// Tab Campos
function renderCamposTab(){
  const wrap = el('div', {});
  if(!_state.collapsedCats) _state.collapsedCats = {};

  const placedCount = Object.keys(_state.fieldLayout).filter(k => !_state.fieldLayout[k].hidden).length;
  wrap.appendChild(el('div', { class:'tab-head-row' },
    el('span', { class:'cell-mute' }, 'ARRASTRA AL PASE'),
    el('span', { class:'cell-mute', style:{fontSize:'11px'} }, placedCount === 0 ? 'Ninguno' : `${placedCount} colocados`)
  ));

  // Agrupar campos por categoría
  const byCat = {};
  for(const [id, def] of Object.entries(FIELDS)){
    if(!byCat[def.cat]) byCat[def.cat] = [];
    byCat[def.cat].push({ id, ...def });
  }

  for(const cat of CAT_ORDER){
    if(!byCat[cat]) continue;
    const fields = byCat[cat];
    const placed = fields.filter(f => _state.fieldLayout[f.id] && !_state.fieldLayout[f.id].hidden).length;
    const isCollapsed = !!_state.collapsedCats[cat];

    const catWrap = el('div', { class:`field-category ${isCollapsed ? 'collapsed' : ''}` });
    catWrap.appendChild(el('div', { class:'field-cat-head', style:{cursor:'pointer'},
      onclick: () => {
        _state.collapsedCats[cat] = !_state.collapsedCats[cat];
        render();
      }
    },
      el('span', {}, isCollapsed ? '▸' : '▾'),
      el('span', { class:'field-cat-ico' }, CAT_ICONS[cat] || ''),
      el('span', { class:'field-cat-name' }, cat),
      el('span', { class:'field-cat-count' }, `${placed}/${fields.length}`)
    ));

    const catBody = el('div', { class:'field-cat-body' });
    for(const f of fields){
      const isPlaced = !!_state.fieldLayout[f.id] && !_state.fieldLayout[f.id].hidden;
      catBody.appendChild(el('div', {
        class:`field-chip ${isPlaced ? 'placed' : ''}`,
        draggable:'true',
        ondragstart: e => {
          e.dataTransfer.setData('new-field', f.id);
          e.dataTransfer.effectAllowed = 'copy';
        },
        onclick: () => {
          if(isPlaced){
            _state.selectedFieldId = f.id;
            _state.activeTab = 'editar';
            render();
          }
        }
      },
        el('span', { class:'chip-check' }, isPlaced ? '☑' : '☐'),
        el('span', { class:'chip-label' }, f.label),
        isPlaced ? el('span', { class:'chip-placed' }, '✓') : el('span', { class:'chip-drag' }, '⋮⋮')
      ));
    }
    catWrap.appendChild(catBody);
    wrap.appendChild(catWrap);
  }

  return wrap;
}

// Tab Editar
function renderEditarTab(){
  const wrap = el('div', {});

  // ── Acciones de selección múltiple ──
  if(_state.selectedFieldIds.length > 1){
    wrap.appendChild(el('div', { class:'edit-multi-bar' },
      el('span', { class:'edit-multi-count' }, `${_state.selectedFieldIds.length} campos seleccionados`),
      el('button', { class:'btn btn-ghost btn-sm', onclick: () => { _state.selectedFieldIds = [_state.selectedFieldId]; render(); }, title:'Limpiar selección' }, '✕')
    ));

    // Alinear
    wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'8px'} }, 'Alinear'));
    const alignRow = el('div', { style:{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:'4px' } });
    const alignBtn = (sym, title, fn) => alignRow.appendChild(el('button', { class:'btn btn-secondary btn-sm', title, onclick: fn, style:{padding:'6px 4px'} }, sym));
    alignBtn('⫷', 'Izquierda',     () => alignSelected('left'));
    alignBtn('═', 'Centro H',       () => alignSelected('centerH'));
    alignBtn('⫸', 'Derecha',       () => alignSelected('right'));
    alignBtn('⫶', 'Arriba',         () => alignSelected('top'));
    alignBtn('—', 'Centro V',       () => alignSelected('centerV'));
    alignBtn('⫶', 'Abajo',          () => alignSelected('bottom'));
    wrap.appendChild(alignRow);

    // Distribuir (necesita ≥3)
    if(_state.selectedFieldIds.length >= 3){
      wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'8px'} }, 'Distribuir uniformemente'));
      const distRow = el('div', { style:{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px' } });
      distRow.appendChild(el('button', { class:'btn btn-secondary btn-sm', onclick: () => distributeSelected('horizontal') }, '↔ Horizontal'));
      distRow.appendChild(el('button', { class:'btn btn-secondary btn-sm', onclick: () => distributeSelected('vertical')   }, '↕ Vertical'));
      wrap.appendChild(distRow);
    }

    wrap.appendChild(el('div', { class:'edit-multi-divider' }));
  }

  if(!_state.selectedFieldId){
    wrap.appendChild(el('div', { class:'empty-mini' }, 'Selecciona un campo del canvas para editarlo.'));
    return wrap;
  }
  const fid = _state.selectedFieldId;
  const conf = _state.fieldLayout[fid];
  if(!conf){ wrap.appendChild(el('div', { class:'empty-mini' }, 'Campo no encontrado.')); return wrap; }
  const def = FIELDS[fid];

  wrap.appendChild(el('div', { class:'edit-field-title' },
    el('span', {}, def.ico + ' ' + def.label)
  ));

  // ── Acciones rápidas: copiar formato + capas Z ──
  const quickRow = el('div', { class:'edit-quick-row' });

  quickRow.appendChild(el('button', {
    class:`btn btn-sm ${_state.clipboardStyle ? 'btn-primary' : 'btn-secondary'}`,
    title: _state.clipboardStyle ? 'Pegar formato copiado' : 'Copiar formato de este campo',
    onclick: () => {
      if(_state.clipboardStyle){
        // pegar
        Object.assign(conf, _state.clipboardStyle, { x: conf.x, y: conf.y });
        toast('Formato pegado', 'ok');
      } else {
        // copiar
        const { x, y, ...style } = conf;
        _state.clipboardStyle = JSON.parse(JSON.stringify(style));
        toast('Formato copiado · selecciona otro campo y pega', 'info');
      }
      render();
    }
  }, _state.clipboardStyle ? '📋 Pegar formato' : '🎨 Copiar formato'));

  if(_state.clipboardStyle){
    quickRow.appendChild(el('button', { class:'btn btn-ghost btn-sm', title:'Limpiar formato copiado',
      onclick: () => { _state.clipboardStyle = null; render(); }
    }, '✕'));
  }

  wrap.appendChild(quickRow);

  // Capas Z
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'8px'} }, `Capa Z: ${conf.zIndex != null ? conf.zIndex : 10}`));
  const zRow = el('div', { style:{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'4px' } });
  zRow.appendChild(el('button', { class:'btn btn-secondary btn-sm', title:'Al fondo',  onclick: () => { setZ(fid, 'bottom'); render(); } }, '⤓ Fondo'));
  zRow.appendChild(el('button', { class:'btn btn-secondary btn-sm', title:'Atrás',     onclick: () => { setZ(fid, 'back');   render(); } }, '↓'));
  zRow.appendChild(el('button', { class:'btn btn-secondary btn-sm', title:'Adelante',  onclick: () => { setZ(fid, 'front');  render(); } }, '↑'));
  zRow.appendChild(el('button', { class:'btn btn-secondary btn-sm', title:'Al frente', onclick: () => { setZ(fid, 'top');    render(); } }, '⤒ Frente'));
  wrap.appendChild(zRow);

  // Tamaño fuente
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'12px'} }, 'Tamaño fuente'));
  const sizeRow = el('div', { class:'edit-size-row' });
  sizeRow.appendChild(el('button', { class:'btn-size', onclick: () => { conf.fontSize = Math.max(8, (conf.fontSize || def.defSize) - 2); render(); } }, '−'));
  sizeRow.appendChild(el('span', { class:'edit-size-val' }, (conf.fontSize || def.defSize) + 'px'));
  sizeRow.appendChild(el('button', { class:'btn-size', onclick: () => { conf.fontSize = Math.min(120, (conf.fontSize || def.defSize) + 2); render(); } }, '+'));
  wrap.appendChild(sizeRow);
  wrap.appendChild(el('input', { type:'range', min:'8', max:'120',
    value: String(conf.fontSize || def.defSize),
    style:{ width:'100%', marginTop:'6px' },
    oninput: e => { conf.fontSize = Number(e.target.value); render(); }
  }));

  // Posición
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'14px'} }, 'Posición X / Y (px)'));
  const posRow = el('div', { class:'edit-pos-row' });
  posRow.appendChild(el('input', { class:'edit-input', type:'number', step:'0.5', min:'0', max:'100',
    value: conf.x.toFixed(0),
    onchange: e => { conf.x = Math.max(0, Math.min(95, Number(e.target.value))); render(); }
  }));
  posRow.appendChild(el('input', { class:'edit-input', type:'number', step:'0.5', min:'0', max:'100',
    value: conf.y.toFixed(0),
    onchange: e => { conf.y = Math.max(0, Math.min(95, Number(e.target.value))); render(); }
  }));
  wrap.appendChild(posRow);

  // Color texto
  wrap.appendChild(el('div', { class:'edit-row' },
    el('label', { class:'edit-label' }, 'Color texto'),
    el('input', { type:'color', class:'edit-color', value: conf.color || '#000000',
      onchange: e => { conf.color = e.target.value; render(); } })
  ));

  // ── Formato de texto (estilo Word real) ─────────────────────
  // SVGs minimalistas estilo Word/Office
  const SVG_B = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M15.6 11.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 7.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>';
  const SVG_I = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>';
  const SVG_U = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg>';
  const SVG_S = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7.24 8.75c-.26-.48-.39-1.03-.39-1.67 0-.61.13-1.16.4-1.67.26-.5.63-.93 1.11-1.29.48-.35 1.05-.63 1.7-.83.66-.19 1.39-.29 2.18-.29.81 0 1.54.11 2.21.34.66.22 1.23.54 1.69.94.47.4.83.88 1.08 1.43.25.55.38 1.15.38 1.81h-3.01c0-.31-.05-.59-.15-.85-.09-.27-.24-.49-.44-.68-.2-.19-.45-.33-.75-.44-.3-.1-.66-.16-1.06-.16-.39 0-.74.04-1.03.13-.29.09-.53.21-.72.36-.19.16-.34.34-.44.55-.1.21-.15.43-.15.66 0 .48.25.88.74 1.21.38.25.77.48 1.41.7H7.39c-.05-.08-.11-.17-.15-.25zM21 12v-2H3v2h9.62c.18.07.4.14.55.2.37.17.66.34.87.51.21.17.35.36.43.57.07.2.11.43.11.69 0 .23-.05.45-.14.66-.09.2-.23.38-.42.53-.19.15-.42.26-.71.35-.29.08-.63.13-1.01.13-.43 0-.83-.04-1.18-.13s-.66-.23-.91-.42c-.25-.19-.45-.44-.59-.75-.14-.31-.25-.76-.25-1.21H6.4c0 .55.08 1.13.24 1.58.16.45.37.85.65 1.21.28.35.6.66.98.92.37.26.78.48 1.22.65.44.17.9.3 1.38.39.48.08.96.13 1.44.13.8 0 1.53-.09 2.18-.28s1.21-.45 1.67-.79c.46-.34.82-.77 1.07-1.27s.38-1.07.38-1.71c0-.6-.1-1.14-.31-1.61-.05-.11-.11-.23-.17-.33H21z"/></svg>';
  const SVG_HL = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 14l3 3v5h6v-5l3-3V9H6zm5-12h2v3h-2zM3.5 5.88l1.41-1.41 2.12 2.12L5.62 8z"/></svg>';
  const SVG_AL = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M15 15H3v2h12zm0-8H3v2h12zM3 13h18v-2H3zm0 8h18v-2H3zM3 3v2h18V3z"/></svg>';
  const SVG_AC = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg>';
  const SVG_AR = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg>';
  const SVG_AJ = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z"/></svg>';
  const SVG_SUP = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M22 7h-2V4h-2v3h-2v2h2v3h2V9h2zM5.88 20h2.66l3.4-5.42h.12L15.46 20h2.66l-4.65-7.27L17.81 6h-2.68l-3.07 4.99h-.12L8.85 6H6.19l4.32 6.73z"/></svg>';
  const SVG_SUB = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M22 18h-2v-3h-2v3h-2v2h2v3h2v-3h2zM5.88 18h2.66l3.4-5.42h.12l3.4 5.42h2.66l-4.65-7.27L17.81 4h-2.68l-3.07 4.99h-.12L8.85 4H6.19l4.32 6.73z"/></svg>';
  const SVG_NORM = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>';

  // Sección Formato
  wrap.appendChild(el('div', { class:'word-section' },
    el('div', { class:'word-section-title' }, 'Formato'),
    (() => {
      const row = el('div', { class:'word-toolbar' });
      const fmt = (key, svg, title) => {
        const active = !!conf[key];
        row.appendChild(el('button', {
          class:`word-btn ${active ? 'active' : ''}`,
          title,
          onclick: () => { conf[key] = !active; render(); }
        }, el('span', { html: svg })));
      };
      fmt('bold',      SVG_B,  'Negrita (Ctrl+B)');
      fmt('italic',    SVG_I,  'Cursiva (Ctrl+I)');
      fmt('underline', SVG_U,  'Subrayado (Ctrl+U)');
      fmt('strike',    SVG_S,  'Tachado');
      fmt('highlight', SVG_HL, 'Resaltar fondo ámbar');
      return row;
    })()
  ));

  // Sección Alineación
  wrap.appendChild(el('div', { class:'word-section' },
    el('div', { class:'word-section-title' }, 'Alineación'),
    (() => {
      const row = el('div', { class:'word-toolbar' });
      for(const [val, svg, title] of [
        ['left',    SVG_AL, 'Izquierda'],
        ['center',  SVG_AC, 'Centro'],
        ['right',   SVG_AR, 'Derecha'],
        ['justify', SVG_AJ, 'Justificado']
      ]){
        const isActive = (conf.textAlign || 'left') === val;
        row.appendChild(el('button', {
          class:`word-btn ${isActive ? 'active' : ''}`,
          title,
          onclick: () => { conf.textAlign = val; render(); }
        }, el('span', { html: svg })));
      }
      return row;
    })()
  ));

  // Sección Posición vertical
  wrap.appendChild(el('div', { class:'word-section' },
    el('div', { class:'word-section-title' }, 'Posición vertical'),
    (() => {
      const row = el('div', { class:'word-toolbar' });
      for(const [val, svg, title] of [
        ['normal', SVG_NORM, 'Normal'],
        ['super',  SVG_SUP,  'Superíndice (x²)'],
        ['sub',    SVG_SUB,  'Subíndice (x₂)']
      ]){
        const isActive = (conf.vAlign || 'normal') === val;
        row.appendChild(el('button', {
          class:`word-btn ${isActive ? 'active' : ''}`,
          title,
          onclick: () => { conf.vAlign = val; render(); }
        }, el('span', { html: svg })));
      }
      return row;
    })()
  ));

  // Espaciado entre líneas
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'10px'} },
    `Interlineado: ${conf.lineHeight ?? 1.2}`));
  wrap.appendChild(el('input', { type:'range', min:'1', max:'3', step:'0.1',
    value: String(conf.lineHeight ?? 1.2), style:{width:'100%'},
    oninput: e => { conf.lineHeight = Number(e.target.value); render(); }
  }));

  // Letter-spacing
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'8px'} },
    `Espaciado letras: ${conf.letterSpacing ?? 0}px`));
  wrap.appendChild(el('input', { type:'range', min:'-2', max:'15', step:'0.5',
    value: String(conf.letterSpacing ?? 0), style:{width:'100%'},
    oninput: e => { conf.letterSpacing = Number(e.target.value); render(); }
  }));

  // Rotación
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'14px'} }, `Rotación: ${conf.rotation || 0}°`));
  const rotRow = el('div', { class:'rot-row' });
  for(const deg of [0, 90, 180, 270]){
    rotRow.appendChild(el('button', {
      class: `rot-btn ${(conf.rotation || 0) === deg ? 'active' : ''}`,
      onclick: () => { conf.rotation = deg; render(); }
    }, deg + '°'));
  }
  wrap.appendChild(rotRow);

  // Condición
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'14px'} }, 'Mostrar solo si'));
  const condSel = el('select', { class:'select w-full', style:{marginBottom:'6px'},
    onchange: e => {
      if(!e.target.value) delete conf.condition;
      else conf.condition = { field: e.target.value, op:'==', value:'' };
      render();
    }
  });
  condSel.appendChild(el('option', { value:'' }, 'Siempre'));
  condSel.appendChild(el('option', { value:'_empresaNivel', selected: conf.condition?.field === '_empresaNivel' ? 'selected' : null }, 'Empresa nivel'));
  condSel.appendChild(el('option', { value:'_tipoVehiculo', selected: conf.condition?.field === '_tipoVehiculo' ? 'selected' : null }, 'Tipo vehículo'));
  condSel.appendChild(el('option', { value:'hall', selected: conf.condition?.field === 'hall' ? 'selected' : null }, 'Hall'));
  wrap.appendChild(condSel);
  if(conf.condition){
    wrap.appendChild(el('input', { class:'field-input', placeholder:'Valor (ej: verificada)',
      value: conf.condition.value || '',
      oninput: e => { conf.condition.value = e.target.value; render(); } }));
  }

  // Eliminar
  wrap.appendChild(el('button', { class:'btn btn-danger btn-sm', style:{marginTop:'18px', width:'100%'},
    onclick: () => {
      pushHistory();
      delete _state.fieldLayout[fid];
      _state.selectedFieldId = null;
      _state.activeTab = 'campos';
      render();
    }
  }, '🗑 Eliminar del pase'));

  // Lista "EN EL PASE"
  const placed = Object.keys(_state.fieldLayout).filter(k => !_state.fieldLayout[k].hidden);
  wrap.appendChild(el('div', { class:'placed-list-head' }, `EN EL PASE (${placed.length})`));
  for(const pid of placed){
    const pdef = FIELDS[pid];
    if(!pdef) continue;
    const isActive = pid === fid;
    wrap.appendChild(el('div', {
      class:`placed-item ${isActive ? 'active' : ''}`,
      onclick: () => { _state.selectedFieldId = pid; render(); }
    },
      el('span', { class:'placed-dot' }, '●'),
      el('span', {}, pdef.label),
      el('span', { class:'placed-size' }, (_state.fieldLayout[pid].fontSize || pdef.defSize) + 'px')
    ));
  }

  return wrap;
}

function renderToggle(label, value, onChange){
  return el('div', { class:'edit-row' },
    el('label', { class:'edit-label' }, label),
    el('button', {
      class:`toggle-switch ${value ? 'on' : 'off'}`,
      onclick: () => onChange(!value)
    }, el('span', { class:'toggle-slider' }))
  );
}

// Tab Config
function renderConfigTab(){
  const wrap = el('div', {});

  // Modo etiqueta
  wrap.appendChild(el('label', { class:'edit-label' }, 'Modo etiqueta'));
  const lmSel = el('select', { class:'select w-full',
    onchange: e => { _state.labelMode = e.target.value; render(); }
  });
  for(const m of LABEL_MODES){
    lmSel.appendChild(el('option', { value: m.value, selected: m.value === _state.labelMode ? 'selected' : null }, m.label));
  }
  wrap.appendChild(lmSel);

  // Orientación
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'14px'} }, 'Orientación'));
  const ortRow = el('div', { class:'flex gap-2' });
  ortRow.appendChild(el('button', {
    class:`btn btn-sm ${_state.paperOrient === 'portrait' ? 'btn-primary' : 'btn-secondary'}`,
    onclick: () => { _state.paperOrient = 'portrait'; render(); }
  }, '↕ Vertical'));
  ortRow.appendChild(el('button', {
    class:`btn btn-sm ${_state.paperOrient === 'landscape' ? 'btn-primary' : 'btn-secondary'}`,
    onclick: () => { _state.paperOrient = 'landscape'; render(); }
  }, '↔ Horizontal'));
  wrap.appendChild(ortRow);

  // Fuente
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'14px'} }, 'Fuente del pase'));
  const fontSel = el('select', { class:'select w-full',
    onchange: e => { _state.font = e.target.value; render(); }
  });
  for(const f of FONTS){
    fontSel.appendChild(el('option', { value:f, selected: f === _state.font ? 'selected' : null }, f));
  }
  wrap.appendChild(fontSel);

  // Modo troquel
  wrap.appendChild(renderToggle('Modo troquel (sticker)', _state.troquel, v => { _state.troquel = v; render(); }));

  // QR seguimiento
  wrap.appendChild(renderToggle('QR de seguimiento', _state.qrTracking, v => { _state.qrTracking = v; }));
  if(_state.qrTracking){
    wrap.appendChild(el('input', { class:'field-input', placeholder:'URL base QR (opcional)',
      value: _state.qrBase || '',
      oninput: e => { _state.qrBase = e.target.value; }
    }));
  }

  // Frase 1 ámbar
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'14px'} },
    'Frase 1 (ámbar) — se traduce al idioma del conductor'));
  wrap.appendChild(el('input', {
    class:'field-input',
    placeholder:'Ej: Bienvenido a {event}, Hall {hall}',
    value: _state.phrase1 || '',
    oninput: e => { _state.phrase1 = e.target.value; _state.ph1On = !!e.target.value; render(); }
  }));
  // Plantillas rápidas multiidioma
  const ph1Row = el('div', { class:'flex gap-2', style:{flexWrap:'wrap', marginTop:'4px'} });
  for(const [lab, txt] of [
    ['Bienvenida',      '{tr:welcomeMsg} {driver}'],
    ['Hall + Stand',    '{tr:hall}: {hall} · {tr:stand}: {stand}'],
    ['Posición rampa',  '{tr:rampPosition}: {position}']
  ]){
    ph1Row.appendChild(el('button', {
      type:'button', class:'btn btn-ghost btn-sm',
      onclick: () => { _state.phrase1 = txt; _state.ph1On = true; render(); }
    }, '+ ' + lab));
  }
  wrap.appendChild(ph1Row);

  // Frase 2 borde negro
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'12px'} },
    'Frase 2 (borde negro) — pie del pase'));
  wrap.appendChild(el('input', {
    class:'field-input',
    placeholder:'Pie del pase…',
    value: _state.phrase2 || '',
    oninput: e => { _state.phrase2 = e.target.value; _state.ph2On = !!e.target.value; render(); }
  }));
  wrap.appendChild(el('p', { class:'cell-mute', style:{fontSize:'11px', marginTop:'2px'} },
    'Variables disponibles: {plate} {hall} {stand} {driver} {company} {event} {position} {time}. ' +
    'Para texto traducido al idioma del conductor: {tr:welcomeMsg}, {tr:hall}, etc.'));

  // Imagen guía
  wrap.appendChild(el('div', { class:'config-card', style:{marginTop:'14px'} },
    el('div', { class:'config-card-head' }, '📷 Imagen guía (no se imprime)'),
    el('p', { class:'config-card-desc' }, 'Carga una imagen como fondo del canvas para alinear los campos.'),
    el('input', {
      type:'file', accept:'image/*', id:'__bg_file',
      style:{ display:'none' },
      onchange: async e => {
        const file = e.target.files[0]; if(!file) return;
        _state.bgImage = await compressImage(file);
        render();
      }
    }),
    el('button', { class:'btn btn-secondary btn-sm w-full',
      onclick: () => document.getElementById('__bg_file').click()
    }, '🖼 Cargar imagen guía'),
    _state.bgImage ? el('button', { class:'btn btn-ghost btn-sm', style:{marginTop:'6px'},
      onclick: () => { _state.bgImage = null; _state.bgTransform = { tx:0,ty:0,rot:0,scale:1,skewX:0,skewY:0,persp:1000 }; render(); }
    }, '✕ Quitar imagen') : null
  ));

  // (El editor de imagen guía / trapezoide vive en su propia pestaña "Guía")

  // Marca de agua
  wrap.appendChild(renderToggle('Marca de agua', _state.watermark.enabled, v => { _state.watermark.enabled = v; render(); }));
  if(_state.watermark.enabled){
    wrap.appendChild(el('input', { class:'field-input', placeholder:'Texto (COPIA, ORIGINAL...)',
      value: _state.watermark.text || '',
      oninput: e => { _state.watermark.text = e.target.value; render(); }
    }));
  }

  // ── Editor: regla, grid, snap granular ──
  wrap.appendChild(el('div', { class:'config-section-head', style:{marginTop:'14px'} }, 'EDITOR'));
  wrap.appendChild(renderToggle('Regla milimétrica', _state.showRuler, v => { _state.showRuler = v; render(); }));
  wrap.appendChild(renderToggle('Cuadrícula visible', _state.showGrid, v => { _state.showGrid = v; render(); }));
  wrap.appendChild(renderToggle('Ajustar a guías', _state.snapToGrid, v => { _state.snapToGrid = v; }));

  // Granularidad del snap (1/2/5/10/off)
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'10px'} }, 'Precisión movimiento'));
  const snapRow = el('div', { style:{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'4px' } });
  for(const sz of [0, 1, 2, 5, 10]){
    snapRow.appendChild(el('button', {
      class:`btn btn-sm ${_state.gridSize === sz ? 'btn-primary' : 'btn-secondary'}`,
      style:{ padding:'6px 4px', fontSize:'11px' },
      onclick: () => { _state.gridSize = sz; render(); }
    }, sz === 0 ? 'Libre' : `${sz}%`));
  }
  wrap.appendChild(snapRow);
  wrap.appendChild(el('p', { class:'cell-mute', style:{fontSize:'11px', marginTop:'4px'} },
    _state.gridSize === 0 ? 'Movimiento totalmente libre · Píxel a píxel'
    : `Pasos de ${_state.gridSize}% · Flechas: ${_state.gridSize}% · Shift+flecha: ${_state.gridSize*5}%`));

  // Auto-selección por vehículo
  wrap.appendChild(renderToggle('Plantilla por tipo vehículo', _state.vehiculoAutoSelect, v => { _state.vehiculoAutoSelect = v; }));

  // Caducidad
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'14px'} }, `Caducidad: ${_state.caducidadHoras}h (0=sin)`));
  wrap.appendChild(el('input', {
    type:'range', min:'0', max:'72', value: String(_state.caducidadHoras),
    style:{ width:'100%' },
    oninput: e => { _state.caducidadHoras = Number(e.target.value); render(); }
  }));

  // PLANTILLAS
  wrap.appendChild(el('div', { class:'config-section-head', style:{marginTop:'18px'} }, 'PLANTILLAS'));
  wrap.appendChild(el('button', { class:'btn btn-secondary btn-sm w-full', onclick: saveTemplateAs },
    '💾 Guardar plantilla actual'));
  if(_state.templates.length === 0){
    wrap.appendChild(el('div', { class:'cell-mute', style:{fontSize:'11px', marginTop:'6px', textAlign:'center'} }, 'Sin plantillas guardadas'));
  } else {
    for(const t of _state.templates){
      wrap.appendChild(el('div', {
        class:`saved-tpl-row ${t.id === _state.currentTemplateId ? 'active' : ''}`,
        onclick: () => { applyTemplate(t); render(); }
      },
        el('span', {}, t.name),
        t.isDefault ? el('span', { class:'tpl-default' }, '⭐') : null
      ));
    }
  }
  wrap.appendChild(el('button', { class:'btn btn-ghost btn-sm w-full', style:{marginTop:'6px'},
    onclick: () => {
      _state.fieldLayout = {};
      _state.currentTemplateId = null;
      render();
    }
  }, '↻ Reiniciar layout'));

  return wrap;
}

async function compressImage(file){
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = ev => {
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
    r.readAsDataURL(file);
  });
}

// ═══════════════════════════════════════════════════════════════
// ACCIONES
// ═══════════════════════════════════════════════════════════════
function pushHistory(){
  _state.history.push(JSON.stringify({
    fieldLayout: _state.fieldLayout,
    paperSize: _state.paperSize,
    paperOrient: _state.paperOrient
  }));
  if(_state.history.length > 30) _state.history.shift();
}

function undo(){
  if(_state.history.length === 0){ toast('Sin acciones para deshacer', 'warn'); return; }
  const prev = JSON.parse(_state.history.pop());
  Object.assign(_state, prev);
  render();
}

function buildLayoutPayload(){
  return {
    paperSize: _state.paperSize,
    paperOrient: _state.paperOrient,
    font: _state.font,
    labelMode: _state.labelMode,
    troquel: _state.troquel,
    fieldLayout: _state.fieldLayout,
    ph1On: _state.ph1On, phrase1: _state.phrase1,
    ph2On: _state.ph2On, phrase2: _state.phrase2,
    ph3On: _state.ph3On, puerta3: _state.puerta3,
    qrTracking: _state.qrTracking, qrBase: _state.qrBase,
    bgImage: _state.bgImage, bgOpacity: _state.bgOpacity,
    bgTransform: _state.bgTransform,
    watermark: _state.watermark
  };
}

async function saveTemplateAs(){
  const p = getCurrentProfile();
  if(!canEdit(p) && !canCreate(p)){ toast('Sin permisos', 'err'); return; }
  if(!_state.eventoId){ toast('Selecciona un evento primero', 'err'); return; }
  if(Object.keys(_state.fieldLayout).length === 0){ toast('Añade campos al pase antes de guardar', 'warn'); return; }

  const form = el('form', { onsubmit: async e => {
    e.preventDefault();
    const fd = getFormData(e.target);
    if(!fd.name){ toast('Nombre requerido', 'err'); return; }
    try{
      const saved = await saveTemplate(_state.eventoId, _state.modulo, fd.name, buildLayoutPayload(), fd.isDefault === 'true');
      _state.currentTemplateId = saved.id;
      await loadTemplate();
      toast('Plantilla guardada', 'ok');
      closeModal();
      render();
    } catch(e){ toast(e.message, 'err'); }
  }});
  form.appendChild(formField({ label:'Nombre', name:'name', required:true, full:true }));
  form.appendChild(formField({ label:'Por defecto', name:'isDefault', value:'false', options:[
    { value:'false', label:'No' },
    { value:'true', label:'Sí (carga automática)' }
  ], full:true }));
  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary', onclick: () => form.requestSubmit() }, 'Guardar')
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
    toast('Eliminada', 'ok');
    render();
  } catch(e){ toast(e.message, 'err'); }
}

function exportJson(){
  const data = { name: 'plantilla_' + Date.now(), ...buildLayoutPayload() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `plantilla_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Plantilla exportada', 'ok');
}

function importJson(){
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = async e => {
    const file = e.target.files[0]; if(!file) return;
    try{
      const data = JSON.parse(await file.text());
      pushHistory();
      Object.assign(_state, {
        paperSize: data.paperSize || 'A4',
        paperOrient: data.paperOrient || 'portrait',
        font: data.font || 'Arial',
        labelMode: data.labelMode || 'valor',
        troquel: !!data.troquel,
        fieldLayout: data.fieldLayout || {},
        ph1On: !!data.ph1On, phrase1: data.phrase1 || '',
        ph2On: !!data.ph2On, phrase2: data.phrase2 || '',
        ph3On: !!data.ph3On, puerta3: data.puerta3 || {},
        qrTracking: !!data.qrTracking, qrBase: data.qrBase || '',
        bgImage: data.bgImage || null, bgOpacity: data.bgOpacity || 0.35,
        bgTransform: data.bgTransform || { tx:0,ty:0,rot:0,scale:1,skewX:0,skewY:0,persp:1000 },
        watermark: data.watermark || {enabled:false,text:'',opacity:0.1}
      });
      render();
      toast('Plantilla importada', 'ok');
    } catch(err){ toast('Archivo inválido', 'err'); }
  };
  input.click();
}

function doPrint(){
  if(Object.keys(_state.fieldLayout).length === 0){ toast('Añade campos antes de imprimir', 'warn'); return; }
  const r = getAllRecords().find(x => x.id === _state.selectedRecordId);
  if(r && r._empresaNivel === 'bloqueada'){
    toast('⛔ Empresa bloqueada — no se puede imprimir', 'err', 4000);
    return;
  }
  recordPrintStat(_state.currentTemplateId);

  const original = document.querySelector('.canvas-paper');
  if(!original) return;

  // Tamaño REAL del papel en milímetros (sin aplicar zoom de pantalla)
  const { mmW, mmH } = currentPaperSize();
  // 1mm = 3.7795275591 px exactos (96 DPI estándar para impresión)
  const pxW = mmW * 3.7795275591;
  const pxH = mmH * 3.7795275591;

  // Construir wrapper de impresión fuera de cualquier scroll/transform parent
  const wrap = document.createElement('div');
  wrap.id = '__pwrap';
  wrap.className = 'print-area';
  wrap.style.cssText = `position:absolute; top:0; left:0; margin:0; padding:0;`;

  const copies = Math.max(1, Math.min(99, _state.copies || 1));
  for(let i = 0; i < copies; i++){
    const clone = original.cloneNode(true);
    // Limpiar elementos no imprimibles del clon
    clone.querySelectorAll('.ruler, .ruler-h, .ruler-v, .canvas-bg-img, .bg-edit-layer, .align-guide').forEach(n => n.remove());
    clone.querySelectorAll('.canvas-field').forEach(n => {
      n.classList.remove('selected', 'multi-selected');
      n.removeAttribute('data-pos');
    });
    clone.classList.remove('has-grid');
    // Forzar tamaño real del papel sin zoom
    clone.style.cssText = `
      width: ${pxW}px !important;
      height: ${pxH}px !important;
      max-width: ${pxW}px !important;
      max-height: ${pxH}px !important;
      margin: 0 !important;
      padding: 0 !important;
      transform: none !important;
      box-shadow: none !important;
      border: 0 !important;
      background: #fff !important;
      background-image: none !important;
      page-break-inside: avoid;
    `;
    if(i < copies - 1) clone.classList.add('page-break');
    wrap.appendChild(clone);
  }
  document.body.appendChild(wrap);

  setTimeout(() => {
    window.print();
    setTimeout(() => { wrap.remove(); }, 300);
  }, 80);
}

// Devuelve el tamaño en mm del papel actual según _state.paper
function currentPaperSize(){
  const sizes = {
    'a3':       { mmW: 297, mmH: 420 },
    'a4':       { mmW: 210, mmH: 297 },
    'a5':       { mmW: 148, mmH: 210 },
    'a6':       { mmW: 105, mmH: 148 },
    'etiqueta': { mmW: 100, mmH: 60 },
    'sticker':  { mmW: 100, mmH: 60 },
    'troquel':  { mmW: 100, mmH: 65 },
    'troquel-pequeno': { mmW: 70, mmH: 45 },
    'troquel-mediano': { mmW: 100, mmH: 65 }
  };
  return sizes[_state.paper] || sizes['a4'];
}

function recordPrintStat(templateId){
  try{
    const k = 'beunifyt_print_stats';
    const s = JSON.parse(localStorage.getItem(k) || '{"total":0,"reprints":0}');
    s.total++;
    if(s.lastRecord === _state.selectedRecordId) s.reprints++;
    s.lastRecord = _state.selectedRecordId;
    localStorage.setItem(k, JSON.stringify(s));
  } catch(_){}
}

// ═══════════════════════════════════════════════════════════════
// ACCIONES MULTI-SELECCIÓN (Word-like)
// ═══════════════════════════════════════════════════════════════

function alignSelected(mode){
  const ids = _state.selectedFieldIds.filter(id => _state.fieldLayout[id]);
  if(ids.length < 2) return;
  pushHistory();
  const confs = ids.map(id => _state.fieldLayout[id]);

  if(mode === 'left'){
    const minX = Math.min(...confs.map(c => c.x));
    confs.forEach(c => c.x = minX);
  } else if(mode === 'right'){
    const maxX = Math.max(...confs.map(c => c.x));
    confs.forEach(c => c.x = maxX);
  } else if(mode === 'centerH'){
    const avg = confs.reduce((a,c) => a + c.x, 0) / confs.length;
    confs.forEach(c => c.x = avg);
  } else if(mode === 'top'){
    const minY = Math.min(...confs.map(c => c.y));
    confs.forEach(c => c.y = minY);
  } else if(mode === 'bottom'){
    const maxY = Math.max(...confs.map(c => c.y));
    confs.forEach(c => c.y = maxY);
  } else if(mode === 'centerV'){
    const avg = confs.reduce((a,c) => a + c.y, 0) / confs.length;
    confs.forEach(c => c.y = avg);
  }
  render();
}

function distributeSelected(axis){
  const ids = _state.selectedFieldIds.filter(id => _state.fieldLayout[id]);
  if(ids.length < 3) return;
  pushHistory();
  const items = ids.map(id => ({ id, conf: _state.fieldLayout[id] }));
  items.sort((a, b) => axis === 'horizontal' ? a.conf.x - b.conf.x : a.conf.y - b.conf.y);

  const first = items[0].conf;
  const last  = items[items.length - 1].conf;
  const range = axis === 'horizontal' ? (last.x - first.x) : (last.y - first.y);
  const step = range / (items.length - 1);

  items.forEach((it, i) => {
    if(i === 0 || i === items.length - 1) return; // no tocar extremos
    if(axis === 'horizontal') it.conf.x = first.x + step * i;
    else it.conf.y = first.y + step * i;
  });
  render();
}

function setZ(fid, mode){
  const conf = _state.fieldLayout[fid];
  if(!conf) return;
  pushHistory();
  const all = Object.values(_state.fieldLayout).filter(c => !c.hidden);
  const zs = all.map(c => c.zIndex != null ? c.zIndex : 10);
  const maxZ = Math.max(...zs, 10);
  const minZ = Math.min(...zs, 10);

  const current = conf.zIndex != null ? conf.zIndex : 10;
  if(mode === 'top')    conf.zIndex = maxZ + 1;
  else if(mode === 'bottom') conf.zIndex = minZ - 1;
  else if(mode === 'front')  conf.zIndex = current + 1;
  else if(mode === 'back')   conf.zIndex = current - 1;
}

// ═══════════════════════════════════════════════════════════════
// VISTA PREVIA REAL (cómo saldrá impreso)
// ═══════════════════════════════════════════════════════════════
function openPrintPreview(){
  if(Object.keys(_state.fieldLayout).length === 0){
    toast('Añade campos al pase antes de previsualizar', 'warn');
    return;
  }
  // Renderizar canvas pero SIN guías, sin selección, sin grid, sin bg-image,
  // sin reglas, exactamente como saldrá impreso
  const origGuide = _state.showGuide;
  const origGrid = _state.showGrid;
  const origRuler = _state.showRuler;
  const origSel = _state.selectedFieldId;
  const origSelMulti = _state.selectedFieldIds;
  const origClient = _state.clientMode;
  _state.showGuide = false;
  _state.showGrid = false;
  _state.showRuler = false;
  _state.selectedFieldId = null;
  _state.selectedFieldIds = [];
  _state.clientMode = true;

  const previewCanvas = renderCanvas();
  const paper = previewCanvas.querySelector('.canvas-paper');
  if(paper){
    paper.style.boxShadow = '0 20px 60px rgba(0,0,0,0.4)';
  }

  // Restaurar estado
  _state.showGuide = origGuide;
  _state.showGrid = origGrid;
  _state.showRuler = origRuler;
  _state.selectedFieldId = origSel;
  _state.selectedFieldIds = origSelMulti;
  _state.clientMode = origClient;

  const body = el('div', { style:{display:'flex', flexDirection:'column', alignItems:'center', gap:'12px'} },
    el('p', { class:'cell-mute', style:{fontSize:'13px', margin:0} },
      `Vista previa exacta del pase como saldrá impreso (${_state.paperSize} · ${_state.paperOrient}).`),
    previewCanvas
  );
  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cerrar'),
    el('button', { class:'btn btn-primary', onclick: () => { closeModal(); doPrint(); } }, '🖨 Imprimir ahora')
  );
  openModal({ title:'Vista previa de impresión', body, size:'lg' });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}

document.addEventListener('keydown', e => {
  if(!_container) return;
  // No interceptar si el foco está en un input
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

  // Undo
  if((e.ctrlKey || e.metaKey) && e.key === 'z'){ e.preventDefault(); undo(); return; }

  // Arrow keys: mueven el campo seleccionado
  if(_state.selectedFieldId && /^Arrow/.test(e.key)){
    const conf = _state.fieldLayout[_state.selectedFieldId];
    if(!conf) return;
    e.preventDefault();
    // Por defecto: paso fino 0.1%
    // Shift: 1% (un paso normal)
    // Alt: gridSize completo (saltar a la cuadrícula)
    let delta = 0.1;
    if(e.shiftKey) delta = 1;
    else if(e.altKey && _state.gridSize > 0) delta = _state.gridSize;
    if(e.key === 'ArrowLeft')  conf.x = Math.max(0,  +(conf.x - delta).toFixed(2));
    if(e.key === 'ArrowRight') conf.x = Math.min(95, +(conf.x + delta).toFixed(2));
    if(e.key === 'ArrowUp')    conf.y = Math.max(0,  +(conf.y - delta).toFixed(2));
    if(e.key === 'ArrowDown')  conf.y = Math.min(95, +(conf.y + delta).toFixed(2));
    render();
    return;
  }

  // Delete: eliminar campo seleccionado
  if(_state.selectedFieldId && (e.key === 'Delete' || e.key === 'Backspace')){
    e.preventDefault();
    pushHistory();
    delete _state.fieldLayout[_state.selectedFieldId];
    _state.selectedFieldId = null;
    render();
    return;
  }
});
