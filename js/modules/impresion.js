// ═══════════════════════════════════════════════════════════════
// impresion.js — Motor de impresión COMPLETO
// Incluye todas las innovaciones aplicadas (excepto pendientes)
// ═══════════════════════════════════════════════════════════════

import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData } from '../utils.js';
import { listLive, list, get, listTemplates, listGlobalTemplates, saveTemplate, deleteTemplate, loadDefaultTemplate, unregisterListenersByPrefix, create, update } from '../db.js';
import { pageHeader, emptyState } from './shared.js';
import { canCreate, canEdit } from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { appBaseUrl } from '../firebase-config.js';
import { logger } from '../logger.js';

let _container = null;
const KEY_PREFIX = 'mod:impresion:';

let _state = {
  modulo:'referencias', eventoId:'', eventos:[], recintos:[],
  selectedRecordId:null, paperSize:'A4', paperOrient:'portrait',
  troquel:false, troquelZones:[], showGuide:true, bgImage:null,
  layout:[], selectedFieldId:null, history:[], zoom:1, copies:1,
  language:'es', templates:[], currentTemplateId:null, records:[],
  snapToGrid:true, gridSize:5, guides:{x:null,y:null},
  watermark:{enabled:false,text:'',opacity:0.1},
  multiPerSheet:1, vehiculoAutoSelect:false, caducidadHoras:0, versions:[]
};

const PAPER_SIZES = { A4:{w:210,h:297}, A5:{w:148,h:210}, A6:{w:105,h:148}, sticker:{w:100,h:50} };

const FIELD_CATALOG = {
  'Identificación':[
    {id:'matricula',label:'Matrícula',source:'matricula',defaultSize:18,defaultBold:true},
    {id:'remolque',label:'Remolque',source:'remolque',defaultSize:14},
    {id:'conductor',label:'Conductor',source:'conductor',defaultSize:13},
    {id:'empresa',label:'Empresa',source:'empresa',defaultSize:13}
  ],
  'Posición':[
    {id:'posicion',label:'Posición',source:'posicion',defaultSize:32,defaultBold:true,defaultHighlight:true},
    {id:'hall',label:'Hall',source:'hall',defaultSize:14},
    {id:'stand',label:'Stand',source:'stand',defaultSize:14},
    {id:'puerta',label:'Puerta',source:'puerta',defaultSize:13}
  ],
  'Referencia':[
    {id:'referencia',label:'Referencia',source:'referencia',defaultSize:13},
    {id:'evento',label:'Evento',source:'evento',defaultSize:11},
    {id:'fecha',label:'Fecha',source:'fecha',defaultSize:11},
    {id:'horaEntrada',label:'Hora entrada',source:'horaEntrada',defaultSize:11}
  ],
  'Recinto':[
    {id:'recintoNombre',label:'Recinto nombre',source:'recintoNombre',defaultSize:12},
    {id:'recintoDir',label:'Recinto dirección',source:'recintoDir',defaultSize:10},
    {id:'recintoLogo',label:'Recinto logo',source:'recintoLogo',defaultSize:40}
  ],
  'Códigos':[
    {id:'qr',label:'QR seguimiento',source:'qr',defaultSize:80},
    {id:'barcode',label:'Código barras',source:'barcode',defaultSize:60},
    {id:'codSeguridad',label:'Código seguridad',source:'codSeguridad',defaultSize:16,defaultBold:true}
  ],
  'Marca':[
    {id:'logo',label:'Logo empresa',source:'logo',defaultSize:40},
    {id:'notas',label:'Notas',source:'notas',defaultSize:11}
  ]
};

const FACTORY_TEMPLATES = [
  {id:'factory_basico',name:'Pase básico',icon:'📋',
    layout:{paperSize:'A6',paperOrient:'portrait',troquel:false,fields:[
      {id:'matricula',x:10,y:8,fontSize:24,fontWeight:'bold'},
      {id:'conductor',x:10,y:30,fontSize:13},
      {id:'empresa',x:10,y:42,fontSize:11},
      {id:'hall',x:10,y:60,fontSize:14,fontWeight:'bold'},
      {id:'posicion',x:55,y:60,fontSize:32,fontWeight:'bold',highlight:true}
    ]}
  },
  {id:'factory_pase_camion',name:'Pase camión',icon:'🚛',
    layout:{paperSize:'A4',paperOrient:'portrait',troquel:false,fields:[
      {id:'matricula',x:10,y:10,fontSize:48,fontWeight:'bold'},
      {id:'remolque',x:10,y:25,fontSize:24},
      {id:'conductor',x:10,y:38,fontSize:18},
      {id:'empresa',x:10,y:48,fontSize:16},
      {id:'hall',x:10,y:65,fontSize:22,fontWeight:'bold'},
      {id:'stand',x:35,y:65,fontSize:22},
      {id:'posicion',x:60,y:60,fontSize:80,fontWeight:'bold',highlight:true}
    ]}
  },
  {id:'factory_sticker',name:'Etiqueta troquel',icon:'🏷',
    layout:{paperSize:'sticker',paperOrient:'landscape',troquel:true,fields:[
      {id:'matricula',x:5,y:15,fontSize:22,fontWeight:'bold'},
      {id:'posicion',x:65,y:10,fontSize:36,fontWeight:'bold',highlight:true},
      {id:'hall',x:5,y:55,fontSize:14},
      {id:'stand',x:35,y:55,fontSize:14}
    ]}
  }
];

const DEMO_RECORDS = [
  {id:'__demo1__',matricula:'7829-BCN',remolque:'R-1234',conductor:'Josep Puig',empresa:'Samsung Electronics Ibérica',referencia:'MWC-2026-001',hall:'1',stand:'1A-15',tipoVehiculo:'camion',posicion:'12',horaEntrada:'09:30'},
  {id:'__demo2__',matricula:'WA-1234C',conductor:'Anna Bauer',empresa:'LG Electronics España',referencia:'MWC-2026-014',hall:'2',stand:'2B-08',tipoVehiculo:'trailer',posicion:'8',horaEntrada:'10:45'},
  {id:'__demo3__',matricula:'M-AB-1234',conductor:'Wei Zhang',empresa:'Huawei Technologies Spain',referencia:'MWC-2026-022',hall:'1',stand:'1C-22',tipoVehiculo:'camion',posicion:'15',horaEntrada:'08:15'},
  {id:'__demo4__',matricula:'B-12-ABC',conductor:'Pere Martí',empresa:'Transportes Rápidos SL',referencia:'MWC-2026-031',hall:'3',stand:'3A-01',tipoVehiculo:'furgoneta',posicion:'3',horaEntrada:'11:20'},
  {id:'__demo5__',matricula:'3456-MDR',conductor:'Sofia García',empresa:'Samsung Electronics Ibérica',referencia:'MWC-2026-007',hall:'2',stand:'2A-11',tipoVehiculo:'camion',posicion:'21',horaEntrada:'07:50'}
];

export async function init(container){
  _container = container;
  const saved = localStorage.getItem('beunifyt_print_state');
  if(saved){
    try{
      const s = JSON.parse(saved);
      Object.assign(_state, s, {history:[],records:[],templates:[],guides:{x:null,y:null}});
    } catch(_){}
  }
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
    ['modulo','eventoId','selectedRecordId','paperSize','paperOrient','troquel','troquelZones',
     'showGuide','bgImage','layout','zoom','copies','language','currentTemplateId',
     'snapToGrid','gridSize','watermark','multiPerSheet','vehiculoAutoSelect','caducidadHoras']
     .forEach(k => s[k] = _state[k]);
    localStorage.setItem('beunifyt_print_state', JSON.stringify(s));
  } catch(_){}
}

async function loadTemplate(){
  if(!_state.eventoId){
    _state.templates = [];
    if(!_state.currentTemplateId && _state.layout.length === 0){
      applyTemplate(FACTORY_TEMPLATES[0]);
    }
    return;
  }
  const tpls = await listTemplates(_state.eventoId, _state.modulo);
  _state.templates = tpls;
  if(_state.currentTemplateId && !_state.currentTemplateId.startsWith('factory_')){
    const t = tpls.find(x => x.id === _state.currentTemplateId);
    if(t) applyTemplate(t);
  } else if(!_state.currentTemplateId){
    const def = await loadDefaultTemplate(_state.eventoId, _state.modulo);
    if(def) applyTemplate(def);
    else if(_state.layout.length === 0) applyTemplate(FACTORY_TEMPLATES[0]);
  }
}

function applyTemplate(t){
  _state.currentTemplateId = t.id;
  if(t.layout){
    _state.paperSize = t.layout.paperSize || 'A4';
    _state.paperOrient = t.layout.paperOrient || 'portrait';
    _state.troquel = !!t.layout.troquel;
    _state.troquelZones = t.layout.troquelZones || [];
    _state.bgImage = t.layout.bgImage || null;
    _state.layout = t.layout.fields ? JSON.parse(JSON.stringify(t.layout.fields)) : [];
    _state.watermark = t.layout.watermark || {enabled:false,text:'',opacity:0.1};
  }
}

async function loadRecords(){
  if(!_state.eventoId){ _state.records = []; if(!_state.selectedRecordId) _state.selectedRecordId = '__demo1__'; return; }
  const items = await list(_state.modulo, {where:{eventoId:_state.eventoId}, orderBy:'createdAt', order:'desc', limit:50});
  _state.records = items;
  if(!_state.selectedRecordId){
    _state.selectedRecordId = items.length ? items[0].id : '__demo1__';
  }
}

function render(){
  if(!_container) return;
  clear(_container);
  const sub = _state.eventos.length === 0
    ? '🎭 Modo demo · Crea un evento para guardar plantillas reales'
    : 'Diseña pases drag-drop · plantillas por evento';
  _container.appendChild(pageHeader({title:'Motor de Impresión', sub}));

  const topRow = el('div', {class:'filter-row'});
  topRow.appendChild(el('select', {class:'select',
    onchange: async e => {_state.modulo = e.target.value; _state.currentTemplateId=null; await loadTemplate(); await loadRecords(); render();}
  },
    el('option', {value:'referencias', selected: _state.modulo==='referencias'?'selected':null}, '📄 Referencias'),
    el('option', {value:'ingresos', selected: _state.modulo==='ingresos'?'selected':null}, '🚛 Ingresos')
  ));

  const evtSel = el('select', {class:'select',
    onchange: async e => {_state.eventoId = e.target.value; _state.currentTemplateId=null; await loadTemplate(); await loadRecords(); render();}
  });
  evtSel.appendChild(el('option', {value:''}, _state.eventos.length===0 ? '⚠ Sin eventos (demo)' : 'Sin evento'));
  for(const ev of _state.eventos){
    evtSel.appendChild(el('option', {value:ev.id, selected: ev.id===_state.eventoId?'selected':null}, ev.nombre));
  }
  topRow.appendChild(evtSel);

  const tplSel = el('select', {class:'select',
    onchange: e => {
      const id = e.target.value;
      if(!id){_state.currentTemplateId=null; return;}
      if(id.startsWith('factory_')){applyTemplate(FACTORY_TEMPLATES.find(t=>t.id===id)); render(); return;}
      const t = _state.templates.find(x=>x.id===id);
      if(t){applyTemplate(t); render();}
    }
  });
  tplSel.appendChild(el('option', {value:''}, '— Sin plantilla —'));
  const grpFac = el('optgroup', {label:'🏭 De fábrica'});
  for(const f of FACTORY_TEMPLATES){
    grpFac.appendChild(el('option', {value:f.id, selected: f.id===_state.currentTemplateId?'selected':null}, `${f.icon} ${f.name}`));
  }
  tplSel.appendChild(grpFac);
  if(_state.templates.length){
    const grpEv = el('optgroup', {label:'📂 Tus plantillas'});
    for(const t of _state.templates){
      grpEv.appendChild(el('option', {value:t.id, selected: t.id===_state.currentTemplateId?'selected':null}, `${t.name}${t.isDefault?' ⭐':''}`));
    }
    tplSel.appendChild(grpEv);
  }
  topRow.appendChild(tplSel);

  topRow.appendChild(el('button', {class:'btn btn-secondary btn-sm', onclick: saveTemplateAs}, '💾 Guardar'));
  if(_state.currentTemplateId && !_state.currentTemplateId.startsWith('factory_')){
    topRow.appendChild(el('button', {class:'btn btn-ghost btn-icon', onclick: deleteCurrentTemplate, title:'Eliminar'}, el('span',{html:icon('trash')})));
  }
  topRow.appendChild(el('button', {class:'btn btn-ghost btn-sm', onclick: exportTemplateJson, title:'Exportar JSON'}, '📤'));
  topRow.appendChild(el('button', {class:'btn btn-ghost btn-sm', onclick: importTemplateJson, title:'Importar JSON'}, '📥'));
  topRow.appendChild(el('div', {class:'flex-1'}));
  topRow.appendChild(el('button', {class:'btn btn-secondary btn-sm', onclick: undo, title:'Deshacer (Ctrl+Z)'}, '↩'));
  topRow.appendChild(el('button', {class:'btn btn-secondary btn-sm', onclick: openBatchPrintModal}, '🖨 Batch'));
  topRow.appendChild(el('button', {class:'btn btn-primary', onclick: doPrint}, '🖨 Imprimir'));
  _container.appendChild(topRow);

  const shell = el('div', {class:'print-shell'});
  shell.appendChild(el('div', {class:'print-col'},
    el('div', {class:'print-col-head'}, `Registros (${getAllRecords().length})`),
    renderRecordList()
  ));
  const colC = el('div', {class:'print-col'});
  colC.appendChild(renderZoomBar());
  colC.appendChild(renderCanvas());
  shell.appendChild(colC);
  shell.appendChild(renderRightPanel());
  _container.appendChild(shell);
  saveStateToLocal();
}

function getAllRecords(){
  if(_state.records.length === 0) return DEMO_RECORDS;
  return [DEMO_RECORDS[0], ..._state.records];
}

function renderRecordList(){
  const wrap = el('div', {class:'print-col-body'});
  const records = getAllRecords();
  for(const r of records){
    const isDemo = r.id.startsWith('__demo');
    const isActive = _state.selectedRecordId === r.id;
    const empresa = r.empresa || '—';
    const subInfo = [r.hall ? `H${r.hall}` : '', r.stand].filter(Boolean).join(' · ');
    wrap.appendChild(el('div', {
      class: `record-list-item ${isActive ? 'active' : ''}`,
      onclick: () => {
        _state.selectedRecordId = r.id;
        if(_state.vehiculoAutoSelect && r.tipoVehiculo) autoSelectTemplateForVehicle(r.tipoVehiculo);
        render();
      }
    },
      el('div', {class:'rli-plate'}, (isDemo?'✏️ ':'') + (r.matricula || '—')),
      el('div', {class:'rli-meta'}, [empresa, subInfo].filter(Boolean).join(' · '))
    ));
  }
  return wrap;
}

function autoSelectTemplateForVehicle(tipo){
  const match = _state.templates.find(t => t.tipoVehiculo === tipo);
  if(match) applyTemplate(match);
}

function renderZoomBar(){
  const row = el('div', {class:'zoom-row'});
  row.appendChild(el('span', {}, 'Zoom:'));
  for(const z of [0.4, 0.55, 0.7, 1, 1.25]){
    row.appendChild(el('button', {
      class: `zoom-btn ${_state.zoom===z?'active':''}`,
      onclick: () => {_state.zoom=z; render();}
    }, `${Math.round(z*100)}%`));
  }
  row.appendChild(el('div', {class:'flex-1'}));
  row.appendChild(el('label', {class:'flex gap-2 items-center', style:{fontSize:'12px',cursor:'pointer'}},
    el('input', {type:'checkbox', checked: _state.snapToGrid?'checked':null,
      onchange: e => {_state.snapToGrid = e.target.checked;}
    }),
    el('span', {class:'cell-mute'}, 'Snap')
  ));
  row.appendChild(el('span', {class:'cell-mute'}, `${_state.paperSize}·${_state.paperOrient}${_state.troquel?' troquel':''}`));
  return row;
}

function renderCanvas(){
  const wrap = el('div', {class:'canvas-wrap'});
  const size = PAPER_SIZES[_state.paperSize];
  let mmW = size.w, mmH = size.h;
  if(_state.paperOrient === 'landscape'){const t=mmW; mmW=mmH; mmH=t;}
  const pxW = mmW*3.78*_state.zoom;
  const pxH = mmH*3.78*_state.zoom;

  const paper = el('div', {
    class: `canvas-paper print-area ${_state.troquel?'troquel':''} ${_state.troquel?'no-print-zone-on':''}`,
    style: {width: pxW+'px', height: pxH+'px'},
    ondragover: e => {e.preventDefault();},
    ondrop: e => onCanvasDrop(e, paper),
    onclick: e => {if(e.target===paper){_state.selectedFieldId=null; render();}}
  });

  if(_state.bgImage && _state.showGuide){
    paper.appendChild(el('img', {class:'canvas-bg-img guide-only', src:_state.bgImage, style:{opacity:'0.3'}}));
  }

  if(_state.watermark?.enabled && _state.watermark.text){
    paper.appendChild(el('div', {
      style:{
        position:'absolute', inset:'0', display:'flex',
        alignItems:'center', justifyContent:'center',
        fontSize:'48px', fontWeight:'bold',
        color: `rgba(0,0,0,${_state.watermark.opacity})`,
        transform:'rotate(-30deg)', pointerEvents:'none', zIndex:'3'
      }
    }, _state.watermark.text));
  }

  for(const z of _state.troquelZones){
    paper.appendChild(el('div', {class:'guide-only', style:{
      position:'absolute', left:z.x+'%', top:z.y+'%', width:z.w+'%', height:z.h+'%',
      border:'2px dashed #F59E0B', zIndex:'5', pointerEvents:'none'
    }}));
  }

  const recordData = getRecordData();
  for(const f of _state.layout){
    paper.appendChild(renderField(f, recordData));
  }

  wrap.appendChild(paper);
  return wrap;
}

function renderField(f, recordData){
  const fdef = findFieldDef(f.id);
  const value = resolveValue(f, recordData);

  if(f.condition && !evalCondition(f.condition, recordData)) return el('span', {});

  const node = el('div', {
    class: `canvas-field ${_state.selectedFieldId===f.id?'selected':''} ${f.highlight?'highlight':''}`,
    style: {
      left: f.x+'%', top: f.y+'%',
      fontSize: (f.fontSize||14)+'px',
      fontWeight: f.fontWeight||'normal',
      color: f.color || '#000',
      transform: f.rotation ? `rotate(${f.rotation}deg)` : ''
    },
    onclick: e => {e.stopPropagation(); _state.selectedFieldId=f.id; render();},
    draggable:'true',
    ondragstart: e => {
      e.dataTransfer.setData('move-field', f.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  });

  if(fdef) node.appendChild(el('span', {class:'canvas-field-label'}, fdef.label));

  if(f.id === 'qr'){
    const size = (f.fontSize || 80);
    node.appendChild(el('div', {style:{
      width:size+'px', height:size+'px', background:'#000',
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontSize:'10px', fontFamily:'monospace'
    }}, 'QR'));
  } else if(f.id === 'barcode'){
    const w = (f.fontSize||60)*2, h = (f.fontSize||60)/2;
    node.appendChild(el('div', {style:{
      width:w+'px', height:h+'px',
      background:'repeating-linear-gradient(90deg,#000 0,#000 2px,#fff 2px,#fff 4px,#000 4px,#000 5px,#fff 5px,#fff 7px)'
    }}));
  } else if(f.id === 'logo' || f.id === 'recintoLogo'){
    const size = f.fontSize || 40;
    node.appendChild(el('div', {style:{
      width:size+'px', height:size+'px',
      background:'#E5E7EB', display:'flex',
      alignItems:'center', justifyContent:'center',
      fontSize:'10px', color:'#6B7280'
    }}, 'LOGO'));
  } else {
    node.appendChild(document.createTextNode(value));
  }

  return node;
}

function findFieldDef(id){
  for(const cat of Object.values(FIELD_CATALOG)){
    const f = cat.find(x => x.id===id);
    if(f) return f;
  }
  return null;
}

function getRecordData(){
  const records = getAllRecords();
  const r = records.find(x => x.id === _state.selectedRecordId) || records[0];
  if(!r) return {};
  const evento = _state.eventos.find(e => e.id === r.eventoId);
  const recinto = evento ? _state.recintos.find(rc => rc.id === evento.recintoId) : null;
  const codSeg = (r.id || '').slice(-4).toUpperCase().replace(/[^A-Z0-9]/g,'X').padEnd(4,'X');
  return {
    matricula:r.matricula||'', remolque:r.remolque||'',
    conductor:r.conductor||'', empresa:r.empresa||'',
    posicion:String(r.posicion||''), hall:r.hall||'',
    stand:r.stand||'', puerta:r.puerta||'',
    referencia:r.referencia||'',
    evento: evento?.nombre || '— Demo —',
    fecha: new Date().toLocaleDateString('es'),
    horaEntrada:r.horaEntrada||'',
    qr:'[QR]', barcode:'[BAR]', logo:'[LOGO]',
    notas:r.notas||'', codSeguridad:codSeg,
    recintoNombre: recinto?.nombre || '',
    recintoDir: recinto?.direccion || '',
    recintoLogo:'[LOGO]',
    _empresaNivel: r._empresaNivel || 'estandar',
    _tipoVehiculo: r.tipoVehiculo || ''
  };
}

function resolveValue(f, recordData){
  const fdef = findFieldDef(f.id);
  if(!fdef) return '—';
  if(fdef.id === 'qr') return `[QR: ${appBaseUrl}?track=${recordData.matricula||''}]`;
  return recordData[fdef.source] || '—';
}

function evalCondition(cond, data){
  if(!cond || !cond.field) return true;
  const v = data[cond.field];
  if(cond.op === '==') return String(v) === String(cond.value);
  if(cond.op === '!=') return String(v) !== String(cond.value);
  if(cond.op === 'contains') return String(v||'').includes(String(cond.value));
  return true;
}

function onCanvasDrop(e, paper){
  e.preventDefault();
  const moveId = e.dataTransfer.getData('move-field');
  const newId = e.dataTransfer.getData('new-field');
  const rect = paper.getBoundingClientRect();
  let x = ((e.clientX-rect.left)/rect.width)*100;
  let y = ((e.clientY-rect.top)/rect.height)*100;
  x = Math.max(0, Math.min(95, x));
  y = Math.max(0, Math.min(95, y));

  if(_state.snapToGrid){
    x = Math.round(x/_state.gridSize)*_state.gridSize;
    y = Math.round(y/_state.gridSize)*_state.gridSize;
  }

  pushHistory();
  if(moveId){
    const f = _state.layout.find(x => x.id === moveId);
    if(f){f.x = x; f.y = y;}
  } else if(newId){
    if(_state.layout.some(f => f.id === newId)){
      toast('Ese campo ya está colocado', 'warn');
      return;
    }
    const fdef = findFieldDef(newId);
    if(!fdef) return;
    _state.layout.push({
      id:newId, x, y,
      fontSize: fdef.defaultSize || 14,
      fontWeight: fdef.defaultBold ? 'bold' : 'normal',
      highlight: !!fdef.defaultHighlight,
      color:'#000', rotation:0
    });
    _state.selectedFieldId = newId;
  }
  render();
}

let _activeTab = 'campos';
function renderRightPanel(){
  const wrap = el('div', {class:'print-col', style:{display:'flex', flexDirection:'column'}});
  const tabs = el('div', {class:'tab-strip'});
  for(const t of [['campos','Campos'],['edicion','Editar'],['config','Config']]){
    tabs.appendChild(el('button', {
      class: _activeTab === t[0] ? 'active' : '',
      onclick: () => {_activeTab = t[0]; render();}
    }, t[1]));
  }
  wrap.appendChild(tabs);
  const body = el('div', {class:'print-col-body', style:{flex:'1'}});
  if(_activeTab === 'campos') body.appendChild(renderCamposTab());
  else if(_activeTab === 'edicion') body.appendChild(renderEdicionTab());
  else body.appendChild(renderConfigTab());
  wrap.appendChild(body);
  return wrap;
}

function renderCamposTab(){
  const wrap = el('div', {});
  for(const [cat, fields] of Object.entries(FIELD_CATALOG)){
    const catWrap = el('div', {class:'field-cat'},
      el('div', {class:'field-cat-head'}, cat)
    );
    for(const f of fields){
      const placed = _state.layout.some(x => x.id === f.id);
      const chip = el('div', {
        class: `field-chip ${placed?'placed':''}`,
        draggable:'true',
        ondragstart: e => {
          e.dataTransfer.setData('new-field', f.id);
          e.dataTransfer.effectAllowed = 'copy';
        }
      }, el('span', {}, f.label));
      catWrap.appendChild(chip);
    }
    wrap.appendChild(catWrap);
  }
  wrap.appendChild(el('p', {class:'cell-mute', style:{fontSize:'12px', marginTop:'12px'}},
    'Arrastra al canvas. Click en un campo del canvas para editarlo.'));
  return wrap;
}

function renderEdicionTab(){
  const wrap = el('div', {});
  if(!_state.selectedFieldId){
    wrap.appendChild(el('div', {class:'cell-mute'}, 'Selecciona un campo del canvas.'));
    return wrap;
  }
  const f = _state.layout.find(x => x.id === _state.selectedFieldId);
  if(!f){wrap.appendChild(el('div',{class:'cell-mute'},'Campo no encontrado.')); return wrap;}
  const fdef = findFieldDef(f.id);
  wrap.appendChild(el('h4', {style:{margin:'0 0 12px', fontSize:'14px'}}, fdef?.label || f.id));

  wrap.appendChild(el('label', {class:'field-label'}, `Tamaño: ${f.fontSize}px`));
  wrap.appendChild(el('input', {
    type:'range', min:'8', max:'120', value:String(f.fontSize),
    style:{width:'100%'},
    oninput: e => {f.fontSize = Number(e.target.value); render();}
  }));

  wrap.appendChild(el('div', {class:'field'},
    el('label', {class:'flex gap-2 items-center', style:{cursor:'pointer'}},
      el('input', {type:'checkbox', checked: f.fontWeight==='bold'?'checked':null,
        onchange: e => {f.fontWeight = e.target.checked?'bold':'normal'; render();}}),
      el('span', {}, 'Negrita')
    )
  ));
  wrap.appendChild(el('div', {class:'field'},
    el('label', {class:'flex gap-2 items-center', style:{cursor:'pointer'}},
      el('input', {type:'checkbox', checked: f.highlight?'checked':null,
        onchange: e => {f.highlight = e.target.checked; render();}}),
      el('span', {}, 'Resaltado ámbar')
    )
  ));

  wrap.appendChild(el('div', {class:'field'},
    el('label', {class:'field-label'}, 'Color texto'),
    el('input', {type:'color', value: f.color || '#000000',
      style:{width:'60px', height:'34px', padding:'2px'},
      onchange: e => {f.color = e.target.value; render();}})
  ));

  wrap.appendChild(el('div', {class:'field'},
    el('label', {class:'field-label'}, `Rotación: ${f.rotation||0}°`),
    el('div', {class:'flex gap-2'},
      ...[0,90,180,270].map(deg =>
        el('button', {
          class:`btn btn-sm ${(f.rotation||0)===deg?'btn-primary':'btn-secondary'}`,
          onclick: () => {f.rotation = deg; render();}
        }, deg+'°')
      )
    )
  ));

  wrap.appendChild(el('div', {class:'form-grid', style:{marginTop:'8px'}},
    el('div', {class:'field'},
      el('label', {class:'field-label'}, 'X %'),
      el('input', {class:'field-input', type:'number', step:'0.5', min:'0', max:'100',
        value: f.x.toFixed(1),
        onchange: e => {f.x = Math.max(0, Math.min(95, Number(e.target.value))); render();}})
    ),
    el('div', {class:'field'},
      el('label', {class:'field-label'}, 'Y %'),
      el('input', {class:'field-input', type:'number', step:'0.5', min:'0', max:'100',
        value: f.y.toFixed(1),
        onchange: e => {f.y = Math.max(0, Math.min(95, Number(e.target.value))); render();}})
    )
  ));

  wrap.appendChild(el('h5', {style:{margin:'16px 0 6px', fontSize:'12px', textTransform:'uppercase', color:'var(--text-3)'}}, 'Mostrar solo si'));
  const condSel = el('select', {class:'select w-full', style:{marginBottom:'4px'},
    onchange: e => {
      if(!e.target.value){delete f.condition;}
      else {f.condition = {field:e.target.value, op:'==', value:''};}
      render();
    }
  });
  condSel.appendChild(el('option', {value:''}, 'Siempre'));
  condSel.appendChild(el('option', {value:'_empresaNivel', selected: f.condition?.field==='_empresaNivel'?'selected':null}, 'Empresa.nivel'));
  condSel.appendChild(el('option', {value:'_tipoVehiculo', selected: f.condition?.field==='_tipoVehiculo'?'selected':null}, 'Tipo vehículo'));
  condSel.appendChild(el('option', {value:'hall', selected: f.condition?.field==='hall'?'selected':null}, 'Hall'));
  wrap.appendChild(condSel);

  if(f.condition){
    wrap.appendChild(el('input', {class:'field-input',
      placeholder:'igual a…', value: f.condition.value || '',
      oninput: e => {f.condition.value = e.target.value; render();}}));
  }

  wrap.appendChild(el('button', {class:'btn btn-danger btn-sm w-full',
    style:{marginTop:'14px'},
    onclick: () => {
      pushHistory();
      _state.layout = _state.layout.filter(x => x.id !== f.id);
      _state.selectedFieldId = null;
      render();
    }
  }, '🗑 Eliminar campo'));

  return wrap;
}

function renderConfigTab(){
  const wrap = el('div', {});

  wrap.appendChild(el('h4', {style:{margin:'0 0 8px', fontSize:'13px', textTransform:'uppercase', color:'var(--text-3)'}}, 'Papel'));
  wrap.appendChild(el('div', {class:'field'},
    el('label', {class:'field-label'}, 'Tamaño'),
    el('select', {class:'field-input', onchange: e => {_state.paperSize = e.target.value; render();}},
      ...['A4','A5','A6','sticker'].map(s => el('option', {value:s, selected: s===_state.paperSize?'selected':null}, s))
    )
  ));
  wrap.appendChild(el('div', {class:'field'},
    el('label', {class:'field-label'}, 'Orientación'),
    el('select', {class:'field-input', onchange: e => {_state.paperOrient = e.target.value; render();}},
      el('option', {value:'portrait', selected: _state.paperOrient==='portrait'?'selected':null}, 'Vertical'),
      el('option', {value:'landscape', selected: _state.paperOrient==='landscape'?'selected':null}, 'Horizontal')
    )
  ));

  wrap.appendChild(el('div', {class:'field'},
    el('label', {class:'field-label'}, 'Pases por hoja'),
    el('select', {class:'field-input', onchange: e => {_state.multiPerSheet = Number(e.target.value);}},
      el('option', {value:'1', selected: _state.multiPerSheet===1?'selected':null}, '1 (normal)'),
      el('option', {value:'2', selected: _state.multiPerSheet===2?'selected':null}, '2 por hoja'),
      el('option', {value:'4', selected: _state.multiPerSheet===4?'selected':null}, '4 por hoja')
    )
  ));

  wrap.appendChild(el('div', {class:'field'},
    el('label', {class:'flex gap-2 items-center', style:{cursor:'pointer'}},
      el('input', {type:'checkbox', checked: _state.troquel?'checked':null,
        onchange: e => {_state.troquel = e.target.checked; render();}}),
      el('span', {}, 'Modo troquel')
    )
  ));

  wrap.appendChild(el('h4', {style:{margin:'12px 0 8px', fontSize:'13px', textTransform:'uppercase', color:'var(--text-3)'}}, 'Marca de agua'));
  wrap.appendChild(el('label', {class:'flex gap-2 items-center', style:{cursor:'pointer', marginBottom:'6px'}},
    el('input', {type:'checkbox', checked: _state.watermark.enabled?'checked':null,
      onchange: e => {_state.watermark.enabled = e.target.checked; render();}}),
    el('span', {}, 'Activar')
  ));
  if(_state.watermark.enabled){
    wrap.appendChild(el('input', {class:'field-input',
      placeholder:'Texto (COPIA, ORIGINAL...)', value: _state.watermark.text,
      oninput: e => {_state.watermark.text = e.target.value; render();}}));
    wrap.appendChild(el('div', {class:'field'},
      el('label', {class:'field-label'}, `Opacidad: ${Math.round(_state.watermark.opacity*100)}%`),
      el('input', {type:'range', min:'5', max:'40',
        value:String(Math.round(_state.watermark.opacity*100)), style:{width:'100%'},
        oninput: e => {_state.watermark.opacity = Number(e.target.value)/100; render();}})
    ));
  }

  wrap.appendChild(el('h4', {style:{margin:'12px 0 8px', fontSize:'13px', textTransform:'uppercase', color:'var(--text-3)'}}, 'Caducidad'));
  wrap.appendChild(el('div', {class:'field'},
    el('label', {class:'field-label'}, 'Válido por horas (0=sin)'),
    el('input', {class:'field-input', type:'number', min:'0', max:'168',
      value: String(_state.caducidadHoras),
      onchange: e => {_state.caducidadHoras = Number(e.target.value);}})
  ));

  wrap.appendChild(el('h4', {style:{margin:'12px 0 8px', fontSize:'13px', textTransform:'uppercase', color:'var(--text-3)'}}, 'Auto-selección'));
  wrap.appendChild(el('label', {class:'flex gap-2 items-center', style:{cursor:'pointer'}},
    el('input', {type:'checkbox', checked: _state.vehiculoAutoSelect?'checked':null,
      onchange: e => {_state.vehiculoAutoSelect = e.target.checked;}}),
    el('span', {}, 'Plantilla por tipo vehículo')
  ));

  wrap.appendChild(el('h4', {style:{margin:'12px 0 8px', fontSize:'13px', textTransform:'uppercase', color:'var(--text-3)'}}, 'Imagen guía'));
  wrap.appendChild(el('input', {type:'file', accept:'image/*',
    onchange: async e => {
      const file = e.target.files[0]; if(!file) return;
      _state.bgImage = await compressImage(file); render();
    }}));
  if(_state.bgImage){
    wrap.appendChild(el('button', {class:'btn btn-ghost btn-sm', style:{marginTop:'8px'},
      onclick: () => {_state.bgImage = null; render();}
    }, 'Quitar imagen'));
  }

  wrap.appendChild(el('h4', {style:{margin:'12px 0 8px', fontSize:'13px', textTransform:'uppercase', color:'var(--text-3)'}}, 'Copias'));
  wrap.appendChild(el('input', {class:'field-input', type:'number', min:'1', max:'20',
    value: String(_state.copies),
    onchange: e => {_state.copies = Math.max(1, Math.min(20, Number(e.target.value)));}}));

  wrap.appendChild(el('h4', {style:{margin:'12px 0 8px', fontSize:'13px', textTransform:'uppercase', color:'var(--text-3)'}}, 'Estadísticas'));
  const stats = getPrintStats();
  const statsBox = el('div', {class:'cell-mute', style:{fontSize:'12px'}});
  statsBox.innerHTML = `Total impresiones: <strong>${stats.total}</strong><br>Reimpresiones: <strong>${stats.reprints}</strong>`;
  wrap.appendChild(statsBox);

  return wrap;
}

async function compressImage(file){
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 1200;
        let w = img.width, h = img.height;
        if(w > max || h > max){
          if(w > h){h = h*(max/w); w = max;}
          else {w = w*(max/h); h = max;}
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

function pushHistory(){
  _state.history.push(JSON.stringify({
    layout: _state.layout, paperSize: _state.paperSize,
    paperOrient: _state.paperOrient, troquel: _state.troquel,
    troquelZones: _state.troquelZones, watermark: _state.watermark
  }));
  if(_state.history.length > 30) _state.history.shift();
}

function undo(){
  if(_state.history.length === 0){toast('Sin acciones para deshacer', 'warn'); return;}
  const prev = JSON.parse(_state.history.pop());
  Object.assign(_state, prev);
  render();
}

async function saveTemplateAs(){
  const p = getCurrentProfile();
  if(!canEdit(p) && !canCreate(p)){toast('Sin permisos', 'err'); return;}
  if(!_state.eventoId){toast('Selecciona un evento para guardar la plantilla', 'err'); return;}

  const form = el('form', {onsubmit: async e => {
    e.preventDefault();
    const fd = getFormData(e.target);
    if(!fd.name){toast('Nombre requerido', 'err'); return;}
    try{
      const layout = {
        paperSize:_state.paperSize, paperOrient:_state.paperOrient,
        troquel:_state.troquel, troquelZones:_state.troquelZones,
        bgImage:_state.bgImage, fields:_state.layout,
        watermark:_state.watermark
      };
      const saved = await saveTemplate(_state.eventoId, _state.modulo, fd.name, layout, fd.isDefault === 'true');
      _state.currentTemplateId = saved.id;
      toast('Plantilla guardada', 'ok');
      closeModal();
      await loadTemplate();
      render();
    } catch(e){toast(e.message, 'err');}
  }});
  form.appendChild(formField({label:'Nombre', name:'name', required:true, full:true}));
  form.appendChild(formField({label:'Por defecto', name:'isDefault', value:'false', options:[
    {value:'false', label:'No'},
    {value:'true', label:'Sí (carga automática)'}
  ], full:true}));

  const footer = el('div', {class:'modal-foot'},
    el('button', {type:'button', class:'btn btn-secondary', onclick: closeModal}, 'Cancelar'),
    el('button', {type:'submit', class:'btn btn-primary', onclick: () => form.requestSubmit()}, 'Guardar')
  );
  openModal({title:'Guardar plantilla', body: form});
  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteCurrentTemplate(){
  if(!_state.currentTemplateId) return;
  const ok = await confirmModal({title:'Eliminar plantilla', message:'¿Eliminar?', danger:true});
  if(!ok) return;
  try{
    await deleteTemplate(_state.eventoId, _state.currentTemplateId);
    _state.currentTemplateId = null;
    await loadTemplate();
    toast('Eliminada', 'ok');
    render();
  } catch(e){toast(e.message, 'err');}
}

function exportTemplateJson(){
  const data = {
    name: 'plantilla_'+Date.now(),
    paperSize: _state.paperSize, paperOrient: _state.paperOrient,
    troquel: _state.troquel, fields: _state.layout,
    watermark: _state.watermark
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `plantilla_beunifyt_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Plantilla exportada', 'ok');
}

function importTemplateJson(){
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = async e => {
    const file = e.target.files[0]; if(!file) return;
    try{
      const data = JSON.parse(await file.text());
      pushHistory();
      _state.paperSize = data.paperSize || 'A4';
      _state.paperOrient = data.paperOrient || 'portrait';
      _state.troquel = !!data.troquel;
      _state.layout = data.fields || [];
      _state.watermark = data.watermark || {enabled:false,text:'',opacity:0.1};
      render();
      toast('Plantilla importada', 'ok');
    } catch(err){toast('Archivo inválido: ' + err.message, 'err');}
  };
  input.click();
}

function doPrint(){
  if(_state.layout.length === 0){toast('Añade campos antes de imprimir', 'warn'); return;}
  const r = getAllRecords().find(x => x.id === _state.selectedRecordId);
  if(r && r._empresaNivel === 'bloqueada'){
    toast('⛔ Empresa bloqueada — no se puede imprimir', 'err', 4000);
    return;
  }
  recordPrintStat(_state.currentTemplateId);

  if(_state.copies > 1){
    const original = document.querySelector('.canvas-paper');
    if(!original) return;
    const wrap = el('div', {class:'print-area', id:'__print-multi'});
    for(let i = 0; i < _state.copies; i++){
      const clone = original.cloneNode(true);
      if(i < _state.copies - 1) clone.classList.add('page-break');
      wrap.appendChild(clone);
    }
    document.body.appendChild(wrap);
    original.classList.remove('print-area');
    window.print();
    setTimeout(() => {wrap.remove(); original.classList.add('print-area');}, 100);
  } else {
    window.print();
  }
}

function openBatchPrintModal(){
  if(_state.layout.length === 0){toast('Configura una plantilla antes', 'warn'); return;}
  if(_state.records.length === 0){toast('Sin registros en el evento', 'warn'); return;}

  const body = el('div', {});
  body.appendChild(el('p', {}, `Vas a imprimir ${_state.records.length} pases con la plantilla actual.`));
  body.appendChild(el('div', {class:'cell-mute', style:{fontSize:'12px', marginTop:'8px'}},
    `⚠ Las empresas bloqueadas se saltarán automáticamente.`));

  const btn = el('button', {class:'btn btn-primary',
    onclick: () => batchPrint(_state.records)
  }, '🖨 Iniciar batch');

  const footer = el('div', {class:'modal-foot'},
    el('button', {class:'btn btn-secondary', onclick: closeModal}, 'Cancelar'),
    btn
  );
  openModal({title:`Imprimir batch (${_state.records.length})`, body});
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}

function batchPrint(records){
  closeModal();
  let saltados = 0, impresos = 0;
  const wrap = el('div', {class:'print-area', id:'__batch_print'});
  const origRecord = _state.selectedRecordId;

  records.forEach((r, idx) => {
    if(r._empresaNivel === 'bloqueada'){saltados++; return;}
    _state.selectedRecordId = r.id;
    impresos++;
    const tempNode = renderCanvas();
    const paper = tempNode.querySelector('.canvas-paper');
    if(paper){
      if(idx < records.length-1) paper.classList.add('page-break');
      wrap.appendChild(paper.cloneNode(true));
    }
  });

  _state.selectedRecordId = origRecord;
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
    const s = JSON.parse(localStorage.getItem(k) || '{"total":0,"byTemplate":{},"reprints":0}');
    s.total++;
    const key = templateId || 'sin_plantilla';
    s.byTemplate[key] = (s.byTemplate[key] || 0) + 1;
    if(s.lastRecord === _state.selectedRecordId) s.reprints++;
    s.lastRecord = _state.selectedRecordId;
    localStorage.setItem(k, JSON.stringify(s));
  } catch(_){}
}

function getPrintStats(){
  try{
    const s = JSON.parse(localStorage.getItem('beunifyt_print_stats') || '{"total":0,"byTemplate":{},"reprints":0}');
    return {total: s.total || 0, reprints: s.reprints || 0};
  } catch(_){return {total:0, reprints:0};}
}

document.addEventListener('keydown', e => {
  if(_container && (e.ctrlKey || e.metaKey) && e.key === 'z'){e.preventDefault(); undo();}
});
