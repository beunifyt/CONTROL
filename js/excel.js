// ═══════════════════════════════════════════════════════════════
// excel.js — Importación/Exportación Excel
//
// Usa SheetJS (xlsx) cargado vía CDN.
// - Exportar cualquier módulo a .xlsx
// - Importar con detección de duplicados (por matrícula+referencia+evento)
// - Plantillas descargables con campos dinámicos por evento
// - Log de exportaciones (auditoría)
// ═══════════════════════════════════════════════════════════════

import { db } from './firebase-config.js';
import {
  collection, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { logger } from './logger.js';
import { toast } from './utils.js';
import { createReferencia, createIngreso, create } from './db.js';
import { getCurrentProfile } from './auth.js';

// ── Carga perezosa de SheetJS ─────────────────────────────────
let _XLSX = null;
async function loadXLSX(){
  if(_XLSX) return _XLSX;
  return new Promise((resolve, reject) => {
    if(window.XLSX){ _XLSX = window.XLSX; resolve(_XLSX); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = () => {
      _XLSX = window.XLSX;
      logger.ok('SheetJS cargado');
      resolve(_XLSX);
    };
    s.onerror = () => {
      logger.error('No se pudo cargar SheetJS');
      reject(new Error('No se pudo cargar SheetJS (¿sin conexión?)'));
    };
    document.head.appendChild(s);
  });
}

// ═══════════════════════════════════════════════════════════════
// SCHEMAS — definen columnas por módulo
// ═══════════════════════════════════════════════════════════════
const SCHEMAS = {
  referencias: [
    { col:'Referencia',   field:'referencia',    desc:'Nº de booking/referencia',  example:'MWC-2026-001' },
    { col:'Matricula',    field:'matricula',     desc:'Matrícula vehículo',         example:'1234ABC' },
    { col:'Remolque',     field:'remolque',      desc:'Matrícula remolque',         example:'R-5678' },
    { col:'TipoVehiculo', field:'tipoVehiculo',  desc:'camion|trailer|furgoneta|semirremolque', example:'camion' },
    { col:'Tacografo',    field:'tacografo',     desc:'digital|analogico',           example:'digital' },
    { col:'Conductor',    field:'conductor',     desc:'Nombre del conductor',       example:'Juan García' },
    { col:'Apellido',     field:'apellido',      desc:'Apellido del conductor',     example:'García' },
    { col:'Telefono',     field:'telefono',      desc:'Teléfono del conductor',     example:'+34 666 123 456' },
    { col:'Email',        field:'email',         desc:'Email del conductor',        example:'juan@empresa.com' },
    { col:'Pasaporte',    field:'pasaporte',     desc:'Pasaporte o DNI',             example:'12345678X' },
    { col:'Pais',         field:'pais',          desc:'País del conductor',          example:'España' },
    { col:'FNacimiento',  field:'fNacimiento',   desc:'Fecha nacimiento YYYY-MM-DD', example:'1985-03-12' },
    { col:'FExpiracion',  field:'fExpiracion',   desc:'Fecha expiración doc',        example:'2030-01-01' },
    { col:'ConductorLang',field:'conductorLang', desc:'Idioma conductor (es,en,fr…)', example:'es' },
    { col:'Empresa',      field:'empresa',       desc:'Empresa transportista',      example:'Logística Demo SL' },
    { col:'Expositor',    field:'expositor',     desc:'Expositor',                   example:'Stand Acme' },
    { col:'Montador',     field:'montador',      desc:'Empresa montadora',           example:'Montajes SL' },
    { col:'Llamador',     field:'llamador',      desc:'Persona que llama',           example:'' },
    { col:'Hall',         field:'hall',          desc:'Hall destino',                example:'2' },
    { col:'PuertaHall',   field:'puertaHall',    desc:'Puerta del hall',             example:'P2' },
    { col:'Stand',        field:'stand',         desc:'Stand',                       example:'B-44' },
    { col:'Acceso',       field:'acceso',        desc:'Acceso',                      example:'' },
    { col:'Descarga',     field:'descarga',      desc:'carga|descarga|ambas',        example:'descarga' },
    { col:'Posicion',     field:'posicion',      desc:'Pos. (vacío = automática)',   example:'' },
    { col:'Estado',       field:'estado',        desc:'prerregistrado|en_camino|rampa_parking|dentro_fira|salida', example:'prerregistrado' },
    { col:'Hora',         field:'hora',          desc:'Hora HH:MM',                  example:'09:30' },
    { col:'Comentario',   field:'comentario',    desc:'Comentario',                  example:'' },
    { col:'Notas',        field:'notas',         desc:'Notas adicionales',           example:'' },
    { col:'Evento',       field:'eventoNombre',  desc:'Nombre del evento (autocompletado en la plantilla)', example:'' }
  ],
  ingresos: [
    { col:'Matricula',    field:'matricula',     desc:'Matrícula vehículo',         example:'1234ABC' },
    { col:'Remolque',     field:'remolque',      desc:'Matrícula remolque',         example:'R-5678' },
    { col:'Conductor',    field:'conductor',     desc:'Nombre del conductor',       example:'Juan García' },
    { col:'Telefono',     field:'telefono',      desc:'Teléfono del conductor',     example:'+34 666 123 456' },
    { col:'Empresa',      field:'empresa',       desc:'Empresa transportista',      example:'Logística Demo SL' },
    { col:'Hall',         field:'hall',          desc:'Hall destino',                example:'2' },
    { col:'Stand',        field:'stand',         desc:'Stand',                       example:'B-44' },
    { col:'TipoVehiculo', field:'tipoVehiculo',  desc:'camion|trailer|furgoneta',   example:'furgoneta' },
    { col:'HoraEntrada',  field:'horaEntrada',   desc:'HH:MM',                       example:'09:30' },
    { col:'Posicion',     field:'posicion',      desc:'Pos. (vacío = automática)',   example:'' },
    { col:'Estado',       field:'estado',        desc:'dentro|salida',               example:'dentro' },
    { col:'Notas',        field:'notas',         desc:'',                            example:'' },
    { col:'Evento',       field:'eventoNombre',  desc:'Nombre del evento (autocompletado en la plantilla)', example:'' }
  ],
  agenda: [
    { col:'Referencia',      field:'referencia',      desc:'Nº booking',          example:'MWC-2026-001' },
    { col:'Matricula',       field:'matricula',       desc:'Matrícula',           example:'1234ABC' },
    { col:'Conductor',       field:'conductor',       desc:'Nombre conductor',    example:'Juan García' },
    { col:'Empresa',         field:'empresa',         desc:'Empresa',             example:'Logística Demo SL' },
    { col:'Hall',            field:'hall',            desc:'Hall',                example:'2' },
    { col:'Stand',           field:'stand',           desc:'Stand',               example:'B-44' },
    { col:'FechaPlanificada',field:'fechaPlanificada',desc:'YYYY-MM-DD',          example:'2026-05-15' },
    { col:'HoraPlanificada', field:'horaPlanificada', desc:'HH:MM',               example:'09:30' },
    { col:'Estado',          field:'estado',          desc:'planificado|llegado|finalizado|cancelado', example:'planificado' },
    { col:'Notas',           field:'notas',           desc:'',                    example:'' },
    { col:'Evento',          field:'eventoNombre',    desc:'Nombre del evento (autocompletado en la plantilla)', example:'' }
  ],
  flota: [
    { col:'Matricula', field:'matricula', desc:'Matrícula', example:'1234ABC' },
    { col:'Remolque',  field:'remolque',  desc:'Matrícula remolque', example:'R-5678' },
    { col:'Tipo',      field:'tipo',      desc:'camion|trailer|furgoneta', example:'camion' },
    { col:'Marca',     field:'marca',     desc:'',          example:'MAN' },
    { col:'Modelo',    field:'modelo',    desc:'',          example:'TGX' },
    { col:'Empresa',   field:'empresa',   desc:'Empresa',   example:'Logística Demo SL' },
    { col:'Estado',    field:'estado',    desc:'almacen|en_ruta', example:'almacen' },
    { col:'Tacografo', field:'tacografo', desc:'Nº tacógrafo', example:'TG-12345' },
    { col:'Notas',     field:'notas',     desc:'',          example:'' }
  ],
  conductores: [
    { col:'Nombre',    field:'nombre',    desc:'Nombre completo', example:'Juan García López' },
    { col:'DNI',       field:'dni',       desc:'DNI/NIE/Pasaporte', example:'12345678A' },
    { col:'Telefono',  field:'telefono',  desc:'',          example:'+34 666 123 456' },
    { col:'Email',     field:'email',     desc:'',          example:'juan@email.com' },
    { col:'Empresa',   field:'empresa',   desc:'Empresa habitual', example:'Logística Demo SL' },
    { col:'Idiomas',   field:'idiomas',   desc:'Separados por coma', example:'ES, EN, FR' },
    { col:'Matriculas',field:'matriculas',desc:'Separadas por coma', example:'1234ABC, 5678DEF' },
    { col:'Notas',     field:'notas',     desc:'',          example:'' }
  ],
  empresas: [
    { col:'Nombre',    field:'nombre',    desc:'',          example:'Logística Demo SL' },
    { col:'CIF',       field:'cif',       desc:'',          example:'B12345678' },
    { col:'Email',     field:'email',     desc:'',          example:'info@empresa.com' },
    { col:'Telefono',  field:'telefono',  desc:'',          example:'+34 91 123 45 67' },
    { col:'Direccion', field:'direccion', desc:'',          example:'Calle Mayor 1, Madrid' },
    { col:'Nivel',     field:'nivel',     desc:'estandar|verificada|bloqueada', example:'estandar' },
    { col:'Notas',     field:'notas',     desc:'',          example:'' }
  ]
};

export function getSchema(modulo){ return SCHEMAS[modulo] || null; }
export function listModulos(){ return Object.keys(SCHEMAS); }

// ── Resolución de eventos por nombre ──────────────────────────
// La plantilla descargada lleva el NOMBRE del evento activo escrito
// en la columna "Evento". Al importar resolvemos ese nombre al
// eventoId real. Cacheamos la lista de eventos para no consultar
// Firestore en cada fila.
let _eventosCache = null;
async function loadEventos(){
  if(_eventosCache) return _eventosCache;
  const snap = await getDocs(collection(db, 'eventos'));
  _eventosCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return _eventosCache;
}
function _normEv(s){ return String(s || '').trim().toLowerCase(); }
// Devuelve el eventoId a partir de un nombre de evento (o '' si no se halla).
function resolveEventoId(nombre, eventos){
  const n = _normEv(nombre);
  if(!n) return '';
  const hit = eventos.find(e => _normEv(e.nombre) === n);
  return hit ? hit.id : '';
}

// ═══════════════════════════════════════════════════════════════
// EXPORTAR
// ═══════════════════════════════════════════════════════════════

/**
 * Exporta una colección a Excel.
 */
export async function exportToExcel(modulo, opts = {}){
  const schema = SCHEMAS[modulo];
  if(!schema) throw new Error(`Módulo desconocido: ${modulo}`);

  try{
    const XLSX = await loadXLSX();

    // Cargar datos
    let q = collection(db, modulo);
    if(opts.eventoId) q = query(q, where('eventoId','==', opts.eventoId));
    if(opts.orderBy) q = query(q, orderBy(opts.orderBy, opts.order || 'desc'));
    const snap = await getDocs(q);
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Construir matriz
    const header = schema.map(c => c.col);
    const data = [header];
    for(const r of rows){
      const row = schema.map(c => {
        const v = r[c.field];
        if(v == null) return '';
        if(Array.isArray(v)) return v.join(', ');
        if(typeof v === 'object' && v.toDate) return v.toDate().toISOString().slice(0,10);
        return v;
      });
      data.push(row);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Anchos de columna automáticos
    ws['!cols'] = schema.map((c, i) => {
      const lengths = [c.col.length, ...data.slice(1).map(r => String(r[i] || '').length)];
      return { wch: Math.min(40, Math.max(8, Math.max(...lengths) + 2)) };
    });

    XLSX.utils.book_append_sheet(wb, ws, modulo);
    const filename = `${modulo}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, filename);

    logger.ok(`Exportado: ${modulo} (${rows.length} filas) → ${filename}`);
    toast(`✅ ${rows.length} ${modulo} exportados`, 'ok');

    // Log auditoría
    try{
      const profile = getCurrentProfile();
      await addDoc(collection(db, 'audit_exports'), {
        modulo, rows: rows.length, filename,
        userId: profile?.id || null,
        userEmail: profile?.email || null,
        eventoId: opts.eventoId || null,
        createdAt: serverTimestamp()
      });
    } catch(e){ logger.warn('No se pudo registrar audit_exports', { error: e.message }); }

    return rows.length;
  } catch(e){
    logger.error(`Exportar ${modulo} falló`, { error: e.message, stack: e.stack });
    toast(`Error al exportar: ${e.message}`, 'err');
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════════
// PLANTILLA — descarga vacía con cabecera + descripción + ejemplo
// ═══════════════════════════════════════════════════════════════
export async function downloadTemplate(modulo, opts = {}){
  const schema = SCHEMAS[modulo];
  if(!schema) throw new Error(`Módulo desconocido: ${modulo}`);

  try{
    const XLSX = await loadXLSX();
    const header = schema.map(c => c.col);
    const desc   = schema.map(c => c.desc || '');
    const ex     = schema.map(c => c.example || '');

    // Si la pantalla pasó el nombre del evento activo, lo escribimos
    // en la columna "Evento" de la fila de ejemplo, así el operario
    // descarga la plantilla ya lista para rellenar y subir.
    const evNombre = opts.eventoNombre || '';
    if(evNombre){
      const evColIdx = schema.findIndex(c => c.field === 'eventoNombre');
      if(evColIdx >= 0){
        ex[evColIdx] = evNombre;
        desc[evColIdx] = `Evento activo: ${evNombre} — no modificar`;
      }
    }

    const aoa = [header, desc, ex];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Estilos (negrita cabecera) — solo afecta a XLSX, no a CSV
    ws['!cols'] = schema.map(c => ({ wch: Math.max(c.col.length + 4, c.desc.length + 2, 14) }));

    XLSX.utils.book_append_sheet(wb, ws, modulo);
    const evSuffix = evNombre ? '_' + evNombre.replace(/[^\w\-]+/g, '_').slice(0, 24) : '';
    const filename = `plantilla_${modulo}${evSuffix}.xlsx`;
    XLSX.writeFile(wb, filename);

    logger.ok(`Plantilla descargada: ${modulo}${evNombre ? ' · ' + evNombre : ''}`);
    toast(`✅ Plantilla ${modulo}.xlsx descargada`, 'ok');
  } catch(e){
    logger.error(`Plantilla ${modulo} falló`, { error: e.message });
    toast(`Error: ${e.message}`, 'err');
  }
}

// ═══════════════════════════════════════════════════════════════
// IMPORTAR — lee Excel y crea registros
// Detección de duplicados:
//  - referencias: por (referencia, eventoId) — y matrícula si está presente
//  - ingresos:    por (matricula, fechaKey)
//  - flota:       por matricula
//  - conductores: por dni
//  - empresas:    por cif
// ═══════════════════════════════════════════════════════════════

/**
 * Lee un Excel y devuelve las filas mapeadas al schema del módulo,
 * SIN guardar nada en la base. Útil para previsualizar o para
 * pasarlas a smartImport().
 *
 * @param {string} modulo
 * @param {File} file
 * @returns {Promise<Array<object>>} filas con los campos del schema
 */
export async function parseExcelRows(modulo, file){
  const schema = SCHEMAS[modulo];
  if(!schema) throw new Error(`Módulo desconocido: ${modulo}`);

  const XLSX = await loadXLSX();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

  const out = [];
  for(const row of rows){
    // Saltar filas totalmente vacías
    if(!Object.values(row).some(v => String(v).trim() !== '')) continue;

    const payload = {};
    for(const c of schema){
      let v = row[c.col];
      if(v == null) v = '';
      v = String(v).trim();
      if(c.field === 'matricula' || c.field === 'remolque' || c.field === 'cif'){
        v = v.toUpperCase();
      }
      if(c.field === 'idiomas' || c.field === 'matriculas'){
        v = v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
      }
      if(c.field === 'posicion'){
        v = v ? Number(v) : null;
      }
      payload[c.field] = v;
    }
    // Saltar fila sin campo clave
    const keyField = keyFieldFor(modulo);
    if(!payload[keyField]) continue;
    out.push(payload);
  }
  return out;
}

export async function importFromExcel(modulo, file, opts = {}){
  const schema = SCHEMAS[modulo];
  if(!schema) throw new Error(`Módulo desconocido: ${modulo}`);

  try{
    const XLSX = await loadXLSX();

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

    if(rows.length === 0) throw new Error('Archivo vacío');

    // Saltar filas de descripción/ejemplo si existen (de la plantilla)
    const realRows = rows.filter((r, idx) => {
      // Asumimos que las filas 0 y 1 (desc, ejemplo) NO van — solo si headers coinciden
      // En realidad sheet_to_json ya usa la primera fila como header, así que solo
      // descartamos la primera fila si parece descripción/ejemplo
      return Object.values(r).some(v => String(v).trim() !== '');
    });

    // Cargar existentes para detectar duplicados
    const existing = await loadExistingForDedup(modulo, opts);

    // Cargar eventos para resolver la columna "Evento" (nombre → id)
    const moduloUsaEvento = ['referencias','ingresos','agenda'].includes(modulo);
    const eventos = moduloUsaEvento ? await loadEventos() : [];

    let created = 0, duplicates = 0, errors = 0, skipped = 0;
    const errorRows = [];

    for(let i = 0; i < realRows.length; i++){
      const row = realRows[i];
      try{
        const payload = {};
        for(const c of schema){
          let v = row[c.col];
          if(v == null) v = '';
          v = String(v).trim();

          // Conversiones especiales
          if(c.field === 'matricula' || c.field === 'remolque' || c.field === 'cif'){
            v = v.toUpperCase();
          }
          if(c.field === 'idiomas' || c.field === 'matriculas'){
            v = v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];
          }
          if(c.field === 'posicion'){
            v = v ? Number(v) : null;
          }
          if(c.field === 'fechaPlanificada' && v){
            v = new Date(v);
          }
          payload[c.field] = v;
        }

        // Saltar fila si no tiene campo clave.
        // Antes esto era silencioso (0/0/0). Ahora lo contamos y lo
        // reportamos como error para que el usuario sepa qué pasó.
        const keyField = keyFieldFor(modulo);
        if(!payload[keyField]){
          skipped++;
          errorRows.push({ row: i + 2, msg: `Falta campo obligatorio "${keyField}"` });
          continue;
        }

        // Asignar eventoId si aplica.
        // Prioridad: 1) columna "Evento" del Excel (nombre → id)
        //            2) evento activo de la pantalla (opts.eventoId)
        if(moduloUsaEvento){
          const nombreEnFila = payload.eventoNombre || '';
          if(nombreEnFila){
            const resolvedId = resolveEventoId(nombreEnFila, eventos);
            if(!resolvedId){
              throw new Error(`Evento "${nombreEnFila}" no existe en el sistema`);
            }
            payload.eventoId = resolvedId;
          } else if(opts.eventoId){
            payload.eventoId = opts.eventoId;
          }
          // eventoNombre era solo para resolver; no se guarda en el registro.
          delete payload.eventoNombre;
        }

        // Detectar duplicado
        if(isDuplicate(modulo, payload, existing)){
          duplicates++;
          continue;
        }

        // Crear según módulo.
        // En importación masiva NO se asigna posición automática:
        // la posición se asigna cuando el vehículo llega físicamente.
        // Si el Excel trae la columna "Posicion" rellena, esa sí se respeta.
        let createdDoc = null;
        if(modulo === 'referencias'){
          if(!payload.eventoId) throw new Error('Sin evento: rellena la columna "Evento" o selecciona un evento antes de importar');
          createdDoc = await createReferencia(payload, { skipAutoPosicion: true });
        } else if(modulo === 'ingresos'){
          if(!payload.eventoId) throw new Error('Sin evento: rellena la columna "Evento" o selecciona un evento antes de importar');
          createdDoc = await createIngreso(payload, { skipAutoPosicion: true });
        } else {
          createdDoc = await create(modulo, payload);
        }
        created++;

        // Añadir a "existing" en memoria para que duplicados DENTRO
        // del mismo archivo también se detecten.
        existing.push({ ...payload, id: createdDoc?.id || `_new_${i}` });
      } catch(e){
        errors++;
        errorRows.push({ row: i + 2, msg: e.message }); // +2 por header
        logger.warn(`Importar ${modulo} fila ${i+2} falló`, { error: e.message });
      }
    }

    const totalErrors = errors + skipped;
    const summary = `✅ ${created} creados · ${duplicates} duplicados · ${totalErrors} errores`;
    logger.ok(`Importar ${modulo} completado: ${summary}`);
    toast(summary, totalErrors > 0 ? 'warn' : 'ok', 4000);

    return { created, duplicates, errors: totalErrors, skipped, errorRows };
  } catch(e){
    logger.error(`Importar ${modulo} falló`, { error: e.message, stack: e.stack });
    toast(`Error: ${e.message}`, 'err');
    throw e;
  }
}

function keyFieldFor(modulo){
  return {
    // referencias: la clave es la referencia/booking, NO la matrícula.
    // La plantilla de referencias se carga antes de conocer las matrículas
    // (asignación de stands/expositores). Una matrícula puede tener varias
    // referencias el mismo día, y la matrícula puede venir vacía.
    referencias:'referencia', ingresos:'matricula', agenda:'referencia',
    flota:'matricula', conductores:'nombre', empresas:'nombre'
  }[modulo] || 'nombre';
}

async function loadExistingForDedup(modulo, opts){
  const constraints = [];
  if(['referencias','ingresos'].includes(modulo) && opts.eventoId){
    constraints.push(where('eventoId','==', opts.eventoId));
  }
  const q = constraints.length
    ? query(collection(db, modulo), ...constraints, limit(2000))
    : query(collection(db, modulo), limit(2000));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function isDuplicate(modulo, payload, existing){
  if(modulo === 'referencias'){
    // Clave principal: referencia + evento.
    // Si AMBOS registros tienen matrícula, la matrícula también debe
    // coincidir para considerarlo duplicado (misma referencia + distinta
    // matrícula = registro legítimamente distinto). Si la matrícula falta
    // en cualquiera de los dos, basta con referencia + evento.
    return existing.some(e => {
      if(e.referencia !== payload.referencia) return false;
      if(e.eventoId !== payload.eventoId) return false;
      const bothHaveMat = e.matricula && payload.matricula;
      if(bothHaveMat) return e.matricula === payload.matricula;
      return true;
    });
  }
  if(modulo === 'ingresos'){
    const today = new Date().toISOString().slice(0,10);
    return existing.some(e =>
      e.matricula === payload.matricula &&
      e.fechaKey === today
    );
  }
  if(modulo === 'agenda'){
    return existing.some(e =>
      e.referencia === payload.referencia &&
      e.eventoId === payload.eventoId
    );
  }
  if(modulo === 'flota'){
    return existing.some(e => e.matricula === payload.matricula);
  }
  if(modulo === 'conductores'){
    return payload.dni && existing.some(e => e.dni === payload.dni);
  }
  if(modulo === 'empresas'){
    return payload.cif && existing.some(e => e.cif === payload.cif);
  }
  return false;
}
