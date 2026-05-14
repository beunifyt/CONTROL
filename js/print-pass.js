// ═══════════════════════════════════════════════════════════════
// print-pass.js — Previsualizar e imprimir el pase de un registro
//
// Se abre como MODAL encima del módulo actual (Referencias, Ingresos,
// Agenda). NO navega a ningún sitio: el usuario imprime y se queda
// donde estaba. No requiere permiso del módulo Impresión.
// ═══════════════════════════════════════════════════════════════
import { toast } from './utils.js';
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

// ─── Imprimir: usa un iframe aislado (método robusto) ────────
function doPrintPaper(layout, record, evento, recinto, copies){
  const { w: mmW, h: mmH } = paperSizeMM(layout.paperSize || 'A4');
  const n = Math.max(1, Math.min(99, copies || 1));

  // Crear iframe oculto
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed; right:0; bottom:0; width:0; height:0; border:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow.document;

  // Construir el HTML del documento de impresión
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: ${mmW}mm ${mmH}mm; margin: 0; }
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body { width:${mmW}mm; }
    .pp-sheet {
      position: relative;
      width: ${mmW}mm;
      height: ${mmH}mm;
      background: #fff;
      overflow: hidden;
      page-break-after: always;
      font-family: ${layout.font || 'Arial, sans-serif'};
    }
    .pp-sheet:last-child { page-break-after: auto; }
    .pp-fld { position: absolute; white-space: pre; }
  </style></head><body></body></html>`);
  doc.close();

  // Generar cada hoja directamente en el iframe
  const data = buildRecordData(record, evento, recinto);
  const driverLang = getDriverLang(record);
  const fieldLayout = layout.fieldLayout || {};

  for(let i = 0; i < n; i++){
    const sheet = doc.createElement('div');
    sheet.className = 'pp-sheet';

    // Frase 1
    if(layout.ph1On && layout.phrase1){
      const f1 = doc.createElement('div');
      f1.style.cssText = 'position:absolute;left:10%;right:10%;top:8mm;background:#FEF3C7;border:1.5px solid #F59E0B;padding:6px 10px;border-radius:4px;font-size:12px;font-weight:600;color:#92400E;text-align:center;';
      f1.textContent = interpolatePhrase(layout.phrase1, record, driverLang);
      sheet.appendChild(f1);
    }
    // Frase 2
    if(layout.ph2On && layout.phrase2){
      const f2 = doc.createElement('div');
      f2.style.cssText = 'position:absolute;left:10%;right:10%;bottom:6mm;border:1.5px solid #000;padding:5px 10px;font-size:10px;text-align:center;';
      f2.textContent = interpolatePhrase(layout.phrase2, record, driverLang);
      sheet.appendChild(f2);
    }
    // Campos
    for(const [fid, conf] of Object.entries(fieldLayout)){
      if(conf.hidden) continue;
      const def = FIELDS[fid];
      if(!def) continue;
      if(conf.condition && !evalCondition(conf.condition, data)) continue;
      const value = data[def.source] != null ? data[def.source] : '';
      if(!value) continue;
      let text = value;
      if(layout.labelMode === 'label' || layout.labelMode === 'linea'){
        const labelKey = def.i18nKey || null;
        const labelTxt = labelKey ? trIn(driverLang, labelKey, def.label) : def.label;
        text = labelTxt + ': ' + value;
      }
      const fld = doc.createElement('div');
      fld.className = 'pp-fld';
      const s = buildFieldStyle(conf, def);
      // Aplicar estilos al elemento del iframe
      Object.assign(fld.style, {
        left: s.left, top: s.top, fontSize: s.fontSize,
        fontWeight: s.fontWeight, fontStyle: s.fontStyle,
        textDecoration: s.textDecoration, color: s.color,
        textAlign: s.textAlign, lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing, transform: s.transform,
        zIndex: s.zIndex, background: s.background, padding: s.padding
      });
      fld.textContent = text;
      sheet.appendChild(fld);
    }
    doc.body.appendChild(sheet);
  }

  // Esperar a que el iframe renderice y lanzar impresión
  setTimeout(() => {
    try{
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch(e){
      toast('No se pudo abrir el diálogo de impresión', 'err');
    }
    // Quitar el iframe tras un margen para que el navegador termine
    setTimeout(() => iframe.remove(), 1000);
  }, 250);
}

/**
 * Imprime el pase de un registro DIRECTAMENTE — sin modal de preview.
 * Carga la plantilla del evento y abre el diálogo de impresión de Chrome.
 * Si no hay plantilla, avisa con un toast y no hace nada más.
 * NO navega a ningún sitio, no requiere permiso del módulo Impresión.
 *
 * @param {string} modulo - 'referencias' | 'ingresos' | 'agenda'
 * @param {object} record - el registro a imprimir
 */
export async function openPrintPassModal(modulo, record){
  if(!record || !record.id){
    toast('Sin registro para imprimir', 'err');
    return;
  }
  if(record._empresaNivel === 'bloqueada'){
    toast('⛔ Empresa bloqueada — no se puede imprimir', 'err', 4000);
    return;
  }
  const eventoId = record.eventoId || record.evento_id || '';

  // Aviso de que estamos preparando (las cargas son rápidas pero por si acaso)
  toast('Preparando impresión…', 'info', 1500);

  // Cargar evento + recinto + plantilla
  let evento = null, recinto = null, layout = null;
  try{
    const eventos = await list('eventos', {});
    evento = eventos.find(e => e.id === eventoId) || null;
    if(evento?.recintoId){
      const recintos = await list('recintos', {});
      recinto = recintos.find(rc => rc.id === evento.recintoId) || null;
    }
    if(eventoId){
      const def = await loadDefaultTemplate(eventoId, modulo);
      if(def && def.layout) layout = def.layout;
      if(!layout){
        const tpls = await listTemplates(eventoId, modulo);
        if(tpls && tpls.length && tpls[0].layout) layout = tpls[0].layout;
      }
    }
  } catch(e){
    toast('No se pudo cargar la plantilla: ' + (e.message || ''), 'err', 4000);
    return;
  }

  // Sin plantilla → aviso rápido, no manda nada a Chrome
  if(!layout || !layout.fieldLayout || Object.keys(layout.fieldLayout).length === 0){
    toast(
      evento
        ? `⚠ El evento "${evento.nombre}" no tiene plantilla de impresión para ${modulo}. Configúrala en el módulo Impresión.`
        : '⚠ Este registro no tiene un evento con plantilla configurada.',
      'warn', 6000
    );
    return;
  }

  // Plantilla OK → directo al diálogo de Chrome con el pase
  doPrintPaper(layout, record, evento, recinto, 1);
}
