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

let _container = null;
const KEY_PREFIX = 'mod:impresion:';
const STATE_KEY = 'beunifyt_print_state_v2';

// ═══════════════════════════════════════════════════════════════
// CAMPOS DEL MONOLITO (23 campos completos)
// ═══════════════════════════════════════════════════════════════
const FIELDS = {
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
  zoom:0.55,
  copies:1,
  language:'es',
  // Plantilla
  paperSize:'A4',
  paperOrient:'portrait',
  font:'Arial',
  labelMode:'valor',
  troquel:false,
  fieldLayout:{},  // { fieldId: { x, y, fontSize, bold, highlight, color, rotation, hidden } }
  // Frases monolito
  ph1On:false, phrase1:'',           // Frase ámbar
  ph2On:false, phrase2:'',           // Frase pie borde negro
  ph3On:false, puerta3:{},           // Puerta Hall
  qrTracking:false, qrBase:'',
  // Imagen guía
  bgImage:null, bgOpacity:0.35, showGuide:true,
  // Innovaciones
  snapToGrid:true, gridSize:5,
  watermark:{enabled:false,text:'',opacity:0.1},
  multiPerSheet:1,
  vehiculoAutoSelect:false,
  caducidadHoras:0,
  // Estado UI
  activeTab:'campos',
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
                    'qrTracking','qrBase','bgImage','bgOpacity','showGuide','zoom','copies','language',
                    'snapToGrid','gridSize','watermark','multiPerSheet','vehiculoAutoSelect','caducidadHoras',
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
    _state.records = await list(_state.modulo, {
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
    el('option', { value:'referencias', selected: _state.modulo === 'referencias' ? 'selected' : null }, '📄 Referencias'),
    el('option', { value:'ingresos', selected: _state.modulo === 'ingresos' ? 'selected' : null }, '🚛 Ingresos')
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

  row2.appendChild(el('button', { class:'btn btn-secondary btn-sm', onclick: openBatchPrint }, '🖨 Batch'));
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
  const pxW = mmW * 3.78 * _state.zoom;
  const pxH = mmH * 3.78 * _state.zoom;

  const paper = el('div', {
    class:`canvas-paper ${_state.troquel ? 'troquel' : ''}`,
    style:{ width: pxW + 'px', height: pxH + 'px', fontFamily: _state.font },
    ondragover: e => { e.preventDefault(); },
    ondrop: e => onCanvasDrop(e, paper),
    onclick: e => { if(e.target === paper){ _state.selectedFieldId = null; render(); } }
  });

  // Background image
  if(_state.bgImage && _state.showGuide){
    paper.appendChild(el('img', {
      class:'canvas-bg-img',
      src: _state.bgImage,
      style:{ opacity: String(_state.bgOpacity) }
    }));
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

  // Frase 1 (ámbar)
  if(_state.ph1On && _state.phrase1){
    paper.appendChild(el('div', {
      style:{
        position:'absolute', left:'10%', right:'10%', top:'8mm',
        background:'#FEF3C7', border:'1.5px solid #F59E0B',
        padding:'6px 10px', borderRadius:'4px',
        fontSize:'12px', fontWeight:'600', color:'#92400E',
        textAlign:'center', zIndex:'3'
      }
    }, _state.phrase1));
  }

  // Frase 2 (pie borde negro)
  if(_state.ph2On && _state.phrase2){
    paper.appendChild(el('div', {
      style:{
        position:'absolute', left:'10%', right:'10%', bottom:'6mm',
        border:'1.5px solid #000', padding:'5px 10px',
        fontSize:'10px', textAlign:'center', zIndex:'3'
      }
    }, _state.phrase2));
  }

  // Campos
  const data = getRecordData();
  for(const [fid, conf] of Object.entries(_state.fieldLayout)){
    if(conf.hidden) continue;
    paper.appendChild(renderField(fid, conf, data));
  }

  wrap.appendChild(paper);
  return wrap;
}

function renderField(fid, conf, data){
  const def = FIELDS[fid];
  if(!def) return el('span', {});
  const value = data[def.source] != null ? data[def.source] : '—';

  // Plantilla condicional
  if(conf.condition && !evalCondition(conf.condition, data)){
    return el('span', {});
  }

  const isSelected = _state.selectedFieldId === fid;
  const node = el('div', {
    class: `canvas-field ${isSelected ? 'selected' : ''} ${conf.highlight ? 'highlight' : ''}`,
    style: {
      left: conf.x + '%',
      top: conf.y + '%',
      fontSize: (conf.fontSize || def.defSize) + 'px',
      fontWeight: conf.bold ? 'bold' : 'normal',
      color: conf.color || '#000',
      transform: conf.rotation ? `rotate(${conf.rotation}deg)` : ''
    },
    onclick: e => { e.stopPropagation(); _state.selectedFieldId = fid; _state.activeTab = 'editar'; render(); },
    draggable:'true',
    ondragstart: e => {
      e.dataTransfer.setData('move-field', fid);
      e.dataTransfer.effectAllowed = 'move';
    }
  });

  // Renderizar según tipo
  if(fid === 'qr'){
    const size = conf.fontSize || 80;
    node.appendChild(el('div', { style:{
      width: size + 'px', height: size + 'px',
      background:'#000', display:'flex',
      alignItems:'center', justifyContent:'center',
      color:'#fff', fontSize:'10px', fontFamily:'monospace'
    }}, 'QR'));
  } else if(fid === 'barcode'){
    const w = (conf.fontSize || 60) * 2, h = (conf.fontSize || 60) / 2;
    node.appendChild(el('div', { style:{
      width: w + 'px', height: h + 'px',
      background:'repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 4px, #000 4px, #000 5px, #fff 5px, #fff 7px)'
    }}));
  } else if(fid === 'logo' || fid === 'recintoLogo'){
    const s = conf.fontSize || 40;
    node.appendChild(el('div', { style:{
      width: s + 'px', height: s + 'px',
      background:'#E5E7EB', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontSize:'10px', color:'#6B7280'
    }}, 'LOGO'));
  } else {
    // Modo etiqueta
    if(_state.labelMode === 'label'){
      node.appendChild(el('span', { style:{ color:'#666', marginRight:'8px', fontSize:'70%' } }, def.label + ':'));
    } else if(_state.labelMode === 'linea'){
      node.appendChild(el('span', { style:{ color:'#666', marginRight:'8px', fontSize:'70%' } }, def.label + ':'));
      node.appendChild(el('span', { style:{ borderBottom:'1px solid #000', minWidth:'80px', display:'inline-block' } }));
      return node;
    }
    node.appendChild(document.createTextNode(value));
  }

  return node;
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
  const moveId = e.dataTransfer.getData('move-field');
  const newId = e.dataTransfer.getData('new-field');
  const rect = paper.getBoundingClientRect();
  let x = ((e.clientX - rect.left) / rect.width) * 100;
  let y = ((e.clientY - rect.top) / rect.height) * 100;
  x = Math.max(0, Math.min(95, x));
  y = Math.max(0, Math.min(95, y));

  if(_state.snapToGrid){
    x = Math.round(x / _state.gridSize) * _state.gridSize;
    y = Math.round(y / _state.gridSize) * _state.gridSize;
  }

  pushHistory();
  if(moveId){
    if(_state.fieldLayout[moveId]){
      _state.fieldLayout[moveId].x = x;
      _state.fieldLayout[moveId].y = y;
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
      rotation:0
    };
    _state.selectedFieldId = newId;
    _state.activeTab = 'editar';
  }
  render();
}

// ── COL DERECHA: TABS ─────────────────────────────────────────
function renderRightCol(){
  const col = el('div', { class:'print-col print-col-right' });
  const tabs = el('div', { class:'tab-strip' });
  for(const t of [['campos','📋 Campos'],['editar','✎ Editar'],['config','⚙ Config']]){
    tabs.appendChild(el('button', {
      class: _state.activeTab === t[0] ? 'active' : '',
      onclick: () => { _state.activeTab = t[0]; render(); }
    }, t[1]));
  }
  col.appendChild(tabs);

  const body = el('div', { class:'print-col-body' });
  if(_state.activeTab === 'campos') body.appendChild(renderCamposTab());
  else if(_state.activeTab === 'editar') body.appendChild(renderEditarTab());
  else body.appendChild(renderConfigTab());
  col.appendChild(body);
  return col;
}

// Tab Campos
function renderCamposTab(){
  const wrap = el('div', {});

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

    const catWrap = el('div', { class:'field-category' });
    catWrap.appendChild(el('div', { class:'field-cat-head' },
      el('span', { style:{cursor:'pointer'}, onclick: e => { e.currentTarget.parentElement.parentElement.classList.toggle('collapsed'); } }, '▾'),
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

  // Tamaño fuente
  wrap.appendChild(el('label', { class:'edit-label' }, 'Tamaño fuente'));
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

  // Negrita
  wrap.appendChild(renderToggle('Negrita', !!conf.bold, v => { conf.bold = v; render(); }));
  // Resaltado ámbar
  wrap.appendChild(renderToggle('Resaltar fondo ámbar', !!conf.highlight, v => { conf.highlight = v; render(); }));

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
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'14px'} }, 'Frase 1 (ámbar)'));
  wrap.appendChild(el('input', {
    class:'field-input',
    placeholder:'Texto destacado…',
    value: _state.phrase1 || '',
    oninput: e => { _state.phrase1 = e.target.value; _state.ph1On = !!e.target.value; render(); }
  }));

  // Frase 2 borde negro
  wrap.appendChild(el('label', { class:'edit-label', style:{marginTop:'12px'} }, 'Frase 2 (borde negro)'));
  wrap.appendChild(el('input', {
    class:'field-input',
    placeholder:'Pie del pase…',
    value: _state.phrase2 || '',
    oninput: e => { _state.phrase2 = e.target.value; _state.ph2On = !!e.target.value; render(); }
  }));

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
      onclick: () => { _state.bgImage = null; render(); }
    }, '✕ Quitar imagen') : null
  ));

  // Marca de agua
  wrap.appendChild(renderToggle('Marca de agua', _state.watermark.enabled, v => { _state.watermark.enabled = v; render(); }));
  if(_state.watermark.enabled){
    wrap.appendChild(el('input', { class:'field-input', placeholder:'Texto (COPIA, ORIGINAL...)',
      value: _state.watermark.text || '',
      oninput: e => { _state.watermark.text = e.target.value; render(); }
    }));
  }

  // Snap to grid
  wrap.appendChild(renderToggle('Snap to grid', _state.snapToGrid, v => { _state.snapToGrid = v; }));

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

  if(_state.copies > 1){
    const original = document.querySelector('.canvas-paper');
    if(!original) return;
    const wrap = el('div', { class:'print-area', id:'__pmulti' });
    for(let i = 0; i < _state.copies; i++){
      const clone = original.cloneNode(true);
      if(i < _state.copies - 1) clone.classList.add('page-break');
      wrap.appendChild(clone);
    }
    document.body.appendChild(wrap);
    original.classList.remove('print-area');
    setTimeout(() => { window.print(); setTimeout(() => { wrap.remove(); original.classList.add('print-area'); }, 200); }, 100);
  } else {
    const canvas = document.querySelector('.canvas-paper');
    if(canvas) canvas.classList.add('print-area');
    setTimeout(() => { window.print(); setTimeout(() => { if(canvas) canvas.classList.remove('print-area'); }, 200); }, 100);
  }
}

function openBatchPrint(){
  if(Object.keys(_state.fieldLayout).length === 0){ toast('Configura una plantilla antes', 'warn'); return; }
  if(_state.records.length === 0){ toast('Sin registros en el evento', 'warn'); return; }

  const body = el('div', {});
  body.appendChild(el('p', {}, `Vas a imprimir ${_state.records.length} pases con la plantilla actual.`));
  body.appendChild(el('div', { class:'cell-mute', style:{fontSize:'12px', marginTop:'8px'} },
    '⚠ Las empresas bloqueadas se saltarán automáticamente.'));

  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { class:'btn btn-primary', onclick: () => batchPrint(_state.records) }, '🖨 Iniciar')
  );
  openModal({ title:`Imprimir batch (${_state.records.length})`, body });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}

function batchPrint(records){
  closeModal();
  let saltados = 0, impresos = 0;
  const wrap = el('div', { class:'print-area', id:'__pbatch' });
  const orig = _state.selectedRecordId;

  for(let i = 0; i < records.length; i++){
    const r = records[i];
    if(r._empresaNivel === 'bloqueada'){ saltados++; continue; }
    _state.selectedRecordId = r.id;
    impresos++;
    const tmp = renderCanvas();
    const paper = tmp.querySelector('.canvas-paper');
    if(paper){
      if(i < records.length - 1) paper.classList.add('page-break');
      wrap.appendChild(paper.cloneNode(true));
    }
  }

  _state.selectedRecordId = orig;
  document.body.appendChild(wrap);
  const active = document.querySelector('.print-shell .canvas-paper');
  if(active) active.classList.remove('print-area');
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      wrap.remove();
      if(active) active.classList.add('print-area');
      toast(`Batch: ${impresos} impresos, ${saltados} saltados`, 'ok', 4000);
    }, 200);
  }, 100);
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

document.addEventListener('keydown', e => {
  if(_container && (e.ctrlKey || e.metaKey) && e.key === 'z'){ e.preventDefault(); undo(); }
});
