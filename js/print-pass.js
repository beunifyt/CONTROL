// ═══════════════════════════════════════════════════════════════
// print-pass.js — Previsualizar e imprimir el pase de un registro
//
// Se abre como MODAL encima del módulo actual (Referencias, Ingresos,
// Agenda). NO navega a ningún sitio: el usuario imprime y se queda
// donde estaba. No requiere permiso del módulo Impresión.
// ═══════════════════════════════════════════════════════════════
import { el, openModal, closeModal, toast } from './utils.js';
import { list, listTemplates, loadDefaultTemplate } from './db.js';
import { trIn } from './i18n.js';
import { FIELDS } from './modules/impresion.js';

// ─── Datos del registro → fuentes de los campos ──────────────
function buildRecordData(record, evento, recinto){
  const r = record || {};
  const codSeg = (r.id || '').slice(-4).toUpperCase().replace(/[^A-Z0-9]/g, 'X').padEnd(4, 'X');
  const TV = { trailer:'Trailer', semiremolque:'Semirremolque', semirremolque:'Semirremolque', camion:'Camión', furgoneta:'Furgoneta' };
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
    descargaTipo: r.descargaTipo || r.descarga || '',
    pasaporte: r.pasaporte || r.dni || '',
    fechaNacimiento: r.fNacimiento || r.fechaNacimiento || '',
    pais: r.pais || '',
    email: r.email || '',
    evento: evento?.nombre || '',
    fecha: new Date().toLocaleDateString('es'),
    horario: r.horaEntrada || r.hora || r.horario || '',
    comentario: r.comentario || r.notas || '',
    mensajeRampa: r.mensajeRampa || '',
    estado: r.estado || '',
    codSeguridad: codSeg,
    recintoLogo: '',
    recintoDir: recinto?.direccion || '',
    _empresaNivel: r._empresaNivel || 'estandar',
    _tipoVehiculo: r.tipoVehiculo || ''
  };
}

// ─── Idioma del conductor para traducir frases del pase ──────
function getDriverLang(record){
  return record?.conductorLang || record?.lang || 'es';
}

function interpolatePhrase(text, record, driverLang){
  if(!text) return '';
  let out = text;
  out = out.replace(/\{tr:([\w_]+)\}/g, (_, key) => {
    try { return trIn(driverLang, key, key); } catch(_){ return key; }
  });
  const vars = {
    plate: record?.matricula || '', hall: record?.hall || '',
    stand: record?.stand || '', driver: record?.conductor || '',
    company: record?.empresa || '', event: record?.eventoNombre || '',
    position: record?.posicion || '', time: record?.horaEntrada || ''
  };
  for(const [k, v] of Object.entries(vars)){
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
  }
  return out;
}

// ─── Estilo de un campo (réplica de buildFieldStyle) ─────────
function buildFieldStyle(conf, def){
  const decorations = [];
  if(conf.underline) decorations.push('underline');
  if(conf.strike)    decorations.push('line-through');
  const vAlign = conf.vAlign === 'super' ? 'super' : conf.vAlign === 'sub' ? 'sub' : 'baseline';
  return {
    position: 'absolute',
    left: conf.x + '%',
    top: conf.y + '%',
    fontSize: (conf.fontSize || def.defSize || 14) + 'px',
    fontWeight: conf.bold ? 'bold' : 'normal',
    fontStyle: conf.italic ? 'italic' : 'normal',
    textDecoration: decorations.length ? decorations.join(' ') : 'none',
    color: conf.color || '#000',
    textAlign: conf.textAlign || 'left',
    lineHeight: String(conf.lineHeight ?? 1.2),
    letterSpacing: (conf.letterSpacing ?? 0) + 'px',
    verticalAlign: vAlign,
    transform: conf.rotation ? `rotate(${conf.rotation}deg)` : '',
    zIndex: String(conf.zIndex != null ? conf.zIndex : 10),
    background: conf.highlight ? '#FEF3C7' : 'transparent',
    padding: conf.highlight ? '1px 4px' : '0',
    whiteSpace: 'pre'
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

// ─── Tamaño del papel en mm ──────────────────────────────────
function paperSizeMM(paperSize){
  const sizes = {
    'A3': { w:297, h:420 }, 'A4': { w:210, h:297 },
    'A5': { w:148, h:210 }, 'A6': { w:105, h:148 },
    'etiqueta': { w:100, h:60 }, 'sticker': { w:100, h:60 },
    'troquel': { w:100, h:65 },
    'troquel-pequeno': { w:70, h:45 }, 'troquel-mediano': { w:100, h:65 }
  };
  return sizes[paperSize] || sizes['A4'];
}

// ─── Render del pase (paper con campos posicionados) ─────────
function renderPaper(layout, record, evento, recinto, scale){
  const { w: mmW, h: mmH } = paperSizeMM(layout.paperSize || 'A4');
  const PX_PER_MM = 3.7795275591;
  const pxW = mmW * PX_PER_MM;
  const pxH = mmH * PX_PER_MM;

  const paper = el('div', {
    class: 'pp-paper',
    style: {
      position: 'relative',
      width: pxW + 'px',
      height: pxH + 'px',
      background: '#fff',
      fontFamily: layout.font || 'Arial, sans-serif',
      transform: `scale(${scale})`,
      transformOrigin: 'top center',
      flexShrink: '0'
    }
  });

  const data = buildRecordData(record, evento, recinto);
  const driverLang = getDriverLang(record);

  // Frase 1 (ámbar)
  if(layout.ph1On && layout.phrase1){
    paper.appendChild(el('div', {
      style: {
        position:'absolute', left:'10%', right:'10%', top:'8mm',
        background:'#FEF3C7', border:'1.5px solid #F59E0B',
        padding:'6px 10px', borderRadius:'4px',
        fontSize:'12px', fontWeight:'600', color:'#92400E',
        textAlign:'center', zIndex:'3'
      }
    }, interpolatePhrase(layout.phrase1, record, driverLang)));
  }

  // Frase 2 (pie)
  if(layout.ph2On && layout.phrase2){
    paper.appendChild(el('div', {
      style: {
        position:'absolute', left:'10%', right:'10%', bottom:'6mm',
        border:'1.5px solid #000', padding:'5px 10px',
        fontSize:'10px', textAlign:'center', zIndex:'3'
      }
    }, interpolatePhrase(layout.phrase2, record, driverLang)));
  }

  // Campos
  const fieldLayout = layout.fieldLayout || {};
  for(const [fid, conf] of Object.entries(fieldLayout)){
    if(conf.hidden) continue;
    const def = FIELDS[fid];
    if(!def) continue;
    if(conf.condition && !evalCondition(conf.condition, data)) continue;
    const value = data[def.source] != null && data[def.source] !== ''
      ? data[def.source] : '';
    if(!value && fid !== 'qr' && fid !== 'barcode') continue;
    // Modo etiqueta: añade el label traducido
    let text = value;
    if(layout.labelMode === 'label' || layout.labelMode === 'linea'){
      const labelKey = def.i18nKey || null;
      const labelTxt = labelKey ? trIn(driverLang, labelKey, def.label) : def.label;
      text = labelTxt + ': ' + value;
    }
    paper.appendChild(el('div', {
      class: 'pp-field',
      style: buildFieldStyle(conf, def)
    }, text));
  }

  return paper;
}

// ─── Imprimir: clona el paper a tamaño real y window.print() ──
function doPrintPaper(layout, record, evento, recinto, copies){
  const wrap = document.createElement('div');
  wrap.id = '__pp_print';
  wrap.className = 'pp-print-area';
  wrap.style.cssText = 'position:absolute; top:0; left:0; margin:0; padding:0;';

  const n = Math.max(1, Math.min(99, copies || 1));
  for(let i = 0; i < n; i++){
    const paper = renderPaper(layout, record, evento, recinto, 1); // scale 1 = tamaño real
    paper.style.transform = 'none';
    if(i < n - 1) paper.classList.add('pp-page-break');
    wrap.appendChild(paper);
  }
  document.body.appendChild(wrap);
  document.body.classList.add('pp-printing');

  setTimeout(() => {
    window.print();
    setTimeout(() => {
      wrap.remove();
      document.body.classList.remove('pp-printing');
    }, 300);
  }, 80);
}

/**
 * Abre el modal de previsualización + impresión del pase.
 * NO navega a ningún sitio.
 *
 * @param {string} modulo - 'referencias' | 'ingresos' | 'agenda'
 * @param {object} record - el registro a imprimir
 */
export async function openPrintPassModal(modulo, record){
  if(!record || !record.id){
    toast('Sin registro para imprimir', 'err');
    return;
  }
  const eventoId = record.eventoId || record.evento_id || '';

  // Cuerpo del modal con estado "cargando"
  const body = el('div', { class:'pp-modal-body' },
    el('div', { class:'pp-loading' }, 'Cargando plantilla del evento…')
  );
  openModal({ title:'🖨 Imprimir pase', body, size:'lg' });

  // Cargar evento + recinto + plantilla
  let evento = null, recinto = null, layout = null;
  try{
    const eventos = await list('eventos', {});
    evento = eventos.find(e => e.id === eventoId) || null;
    if(evento?.recintoId){
      const recintos = await list('recintos', {});
      recinto = recintos.find(rc => rc.id === evento.recintoId) || null;
    }
    // Plantilla por defecto del evento+módulo
    if(eventoId){
      const def = await loadDefaultTemplate(eventoId, modulo);
      if(def && def.layout) layout = def.layout;
      if(!layout){
        // Probar cualquier plantilla del evento
        const tpls = await listTemplates(eventoId, modulo);
        if(tpls && tpls.length && tpls[0].layout) layout = tpls[0].layout;
      }
    }
  } catch(e){
    body.innerHTML = '';
    body.appendChild(el('div', { class:'pp-error' },
      el('p', {}, 'No se pudo cargar la plantilla.'),
      el('p', { class:'cell-mute' }, e.message || '')
    ));
    return;
  }

  // Sin plantilla configurada para este evento
  if(!layout || !layout.fieldLayout || Object.keys(layout.fieldLayout).length === 0){
    body.innerHTML = '';
    body.appendChild(el('div', { class:'pp-no-template' },
      el('div', { class:'pp-no-template-ico' }, '🖨'),
      el('h3', {}, 'Sin plantilla configurada'),
      el('p', {}, evento
        ? `El evento "${evento.nombre}" no tiene una plantilla de impresión para ${modulo}.`
        : 'Este registro no tiene un evento asociado con plantilla.'),
      el('p', { class:'cell-mute' },
        'Pide a un administrador que configure la plantilla en el módulo Impresión.')
    ));
    // Footer solo con Cerrar
    const footer = el('div', { class:'modal-foot' },
      el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cerrar')
    );
    setTimeout(() => body.parentElement.appendChild(footer), 30);
    return;
  }

  // ── Render del preview ──
  let copies = 1;
  body.innerHTML = '';

  // Info del registro
  body.appendChild(el('div', { class:'pp-info' },
    el('span', { class:'cell-plate' }, record.matricula || '—'),
    el('span', { class:'cell-mute' }, ' · ' + (record.conductor || 'sin conductor')),
    evento ? el('span', { class:'cell-mute' }, ' · ' + evento.nombre) : null
  ));

  // Preview escalado para caber en el modal
  const previewWrap = el('div', { class:'pp-preview-wrap' });
  const { w: mmW } = paperSizeMM(layout.paperSize || 'A4');
  // Escala para que quepa en ~640px de ancho del modal
  const scale = Math.min(1, 600 / (mmW * 3.78));
  const paper = renderPaper(layout, record, evento, recinto, scale);
  // El wrapper necesita altura porque el paper está escalado con transform
  const { h: mmH } = paperSizeMM(layout.paperSize || 'A4');
  previewWrap.style.height = (mmH * 3.78 * scale + 20) + 'px';
  previewWrap.appendChild(paper);
  body.appendChild(previewWrap);

  // Control de copias
  const copiesRow = el('div', { class:'pp-copies-row' });
  copiesRow.appendChild(el('label', { class:'edit-label' }, 'Copias:'));
  copiesRow.appendChild(el('input', {
    type:'number', min:'1', max:'99', value:'1',
    class:'field-input', style:{ width:'70px' },
    oninput: e => { copies = Math.max(1, Math.min(99, Number(e.target.value) || 1)); }
  }));
  body.appendChild(copiesRow);

  // Footer: Cerrar + Imprimir
  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cerrar'),
    el('button', {
      class:'btn btn-primary',
      onclick: () => {
        if(record._empresaNivel === 'bloqueada'){
          toast('⛔ Empresa bloqueada — no se puede imprimir', 'err', 4000);
          return;
        }
        doPrintPaper(layout, record, evento, recinto, copies);
      }
    }, '🖨 Imprimir')
  );
  setTimeout(() => body.parentElement.appendChild(footer), 30);
}
