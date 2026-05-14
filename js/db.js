// db.js — capa de acceso a Firestore
import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot, writeBatch,
  runTransaction, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { genId, log, logErr, logger, todayKey } from './utils.js';

const _listeners = new Map();

export function registerListener(key, unsub){
  if(_listeners.has(key)){
    try{ _listeners.get(key)(); } catch(e){ logErr('cleanup', e); }
  }
  _listeners.set(key, unsub);
}

export function unregisterListener(key){
  if(_listeners.has(key)){
    try{ _listeners.get(key)(); } catch(e){ logErr('cleanup', e); }
    _listeners.delete(key);
  }
}

export function unregisterListenersByPrefix(prefix){
  for(const k of Array.from(_listeners.keys())){
    if(k.startsWith(prefix)) unregisterListener(k);
  }
}

export function cleanupAllListeners(){
  for(const k of Array.from(_listeners.keys())) unregisterListener(k);
}

export async function list(coll, opts={}){
  let q = collection(db, coll);
  const constraints = [];
  for(const [field, value] of Object.entries(opts.where || {})){
    if(value !== undefined && value !== null) constraints.push(where(field, '==', value));
  }
  if(opts.orderBy) constraints.push(orderBy(opts.orderBy, opts.order || 'asc'));
  if(opts.limit)  constraints.push(limit(opts.limit));
  if(constraints.length) q = query(q, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function listLive(coll, opts={}, cb){
  const key = opts.key || `${coll}:${JSON.stringify(opts.where || {})}:${opts.orderBy || ''}`;
  let q = collection(db, coll);
  const constraints = [];
  for(const [field, value] of Object.entries(opts.where || {})){
    if(value !== undefined && value !== null) constraints.push(where(field, '==', value));
  }
  if(opts.orderBy) constraints.push(orderBy(opts.orderBy, opts.order || 'asc'));
  if(opts.limit)  constraints.push(limit(opts.limit));
  if(constraints.length) q = query(q, ...constraints);

  const unsub = onSnapshot(q, (snap) => {
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Filtrar borrados a menos que se pida explícitamente
    if(!opts.includeDeleted){
      items = items.filter(i => !i._deleted);
    }
    try{ cb(items, snap); } catch(e){
      logger.error(`listLive callback falló para ${coll}`, { error: e.message, stack: e.stack });
    }
  }, (err) => {
    logger.error(`listLive(${coll}) error: ${err.code || err.message}`, {
      coll, where: opts.where, orderBy: opts.orderBy
    });
    if(opts.onError) opts.onError(err);
  });

  registerListener(key, unsub);
  return () => unregisterListener(key);
}

export async function get(coll, id){
  const ref = doc(db, coll, id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function create(coll, data, customId=null){
  const id = customId || genId();
  const ref = doc(db, coll, id);
  // Añadir creadoPor automáticamente
  const profile = window.__beunifyt_app?.auth?.currentUser;
  await setDoc(ref, {
    ...data,
    _deleted: false,
    creadoPor: profile?.email || null,
    creadoPorUid: profile?.uid || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { id, ...data };
}

export async function update(coll, id, data){
  const ref = doc(db, coll, id);
  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return { id, ...data };
}

export async function remove(coll, id){
  // Soft-delete por defecto (papelera)
  const ref = doc(db, coll, id);
  const u = window.__beunifyt_app?.auth?.currentUser;
  await setDoc(ref, {
    _deleted: true,
    _deletedAt: serverTimestamp(),
    _deletedBy: u?.email || null,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function removeHard(coll, id){
  // Eliminación permanente (solo desde papelera)
  const ref = doc(db, coll, id);
  await deleteDoc(ref);
}

/**
 * Borrado masivo con filtro. Hace soft-delete (papelera) de todos los
 * registros de una colección que cumplan eventoId y/o fecha.
 *
 * @param {string} coll - colección ('referencias', 'ingresos', etc.)
 * @param {object} filter - { eventoId, fecha } — campos opcionales
 * @returns {Promise<number>} cantidad de registros borrados
 */
export async function bulkRemoveFiltered(coll, filter = {}){
  const constraints = [];
  if(filter.eventoId) constraints.push(where('eventoId', '==', filter.eventoId));
  if(filter.fecha){
    // Permitir filtrar por fechaKey o fecha_entrada
    constraints.push(where('fechaKey', '==', filter.fecha));
  }
  const q = constraints.length
    ? query(collection(db, coll), ...constraints)
    : query(collection(db, coll));
  const snap = await getDocs(q);
  if(snap.empty) return 0;

  const u = window.__beunifyt_app?.auth?.currentUser;
  // writeBatch admite máx 500 ops; trocear si hace falta
  const docs = snap.docs.filter(d => !d.data()._deleted);
  let done = 0;
  for(let i = 0; i < docs.length; i += 450){
    const chunk = docs.slice(i, i + 450);
    const batch = writeBatch(db);
    for(const d of chunk){
      batch.set(d.ref, {
        _deleted: true,
        _deletedAt: serverTimestamp(),
        _deletedBy: u?.email || null,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    await batch.commit();
    done += chunk.length;
  }
  return done;
}

/**
 * Importación inteligente (upsert) por clave Matrícula + Referencia.
 *
 * @param {string} coll - colección
 * @param {Array<object>} rows - filas del Excel ya parseadas
 * @param {object} opts - { eventoId }
 * @returns {Promise<{created:number, updated:number, skipped:number, doubtful:Array}>}
 *   doubtful = registros con misma clave pero datos distintos (para revisión)
 */
export async function smartImport(coll, rows, opts = {}){
  const result = { created: 0, updated: 0, skipped: 0, doubtful: [] };
  if(!Array.isArray(rows) || rows.length === 0) return result;

  // Cargar registros existentes del evento (o todos)
  const constraints = [];
  if(opts.eventoId) constraints.push(where('eventoId', '==', opts.eventoId));
  const q = constraints.length
    ? query(collection(db, coll), ...constraints)
    : query(collection(db, coll));
  const snap = await getDocs(q);
  const existing = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => !r._deleted);

  // Indexar por clave matricula|referencia (normalizada)
  const keyOf = (r) => {
    const mat = String(r.matricula || '').toUpperCase().replace(/[\s-]/g, '').trim();
    const ref = String(r.referencia || r.ref || '').toUpperCase().trim();
    return mat + '|' + ref;
  };
  const index = new Map();
  for(const r of existing) index.set(keyOf(r), r);

  // Campos que comparamos para detectar "match dudoso"
  const COMPARE_FIELDS = ['conductor', 'telefono', 'empresa', 'hall', 'stand', 'tipoVehiculo', 'remolque'];

  const toCreate = [];
  const toUpdate = [];

  for(const row of rows){
    const key = keyOf(row);
    const found = index.get(key);
    if(!found){
      toCreate.push(row);
      continue;
    }
    // Comparar campos: ¿son iguales?
    let identical = true;
    const diffs = {};
    for(const f of COMPARE_FIELDS){
      const a = String(found[f] ?? '').trim();
      const b = String(row[f] ?? '').trim();
      if(a !== b && b !== ''){ // solo cuenta si el Excel trae un valor distinto no vacío
        identical = false;
        diffs[f] = { actual: a, nuevo: b };
      }
    }
    if(identical){
      result.skipped++;
    } else {
      // Match dudoso: misma clave, datos distintos → para revisión
      result.doubtful.push({
        id: found.id,
        matricula: row.matricula,
        referencia: row.referencia || row.ref || '',
        diffs,
        rowData: row
      });
    }
  }

  // Crear nuevos
  for(const row of toCreate){
    const payload = {
      matricula: String(row.matricula || '').toUpperCase().trim(),
      conductor: row.conductor || '',
      telefono: row.telefono || '',
      empresa: row.empresa || '',
      referencia: row.referencia || row.ref || '',
      hall: row.hall || '',
      stand: row.stand || '',
      remolque: row.remolque || '',
      tipoVehiculo: row.tipoVehiculo || 'camion',
      eventoId: opts.eventoId || row.eventoId || '',
      estado: row.estado || 'prerregistrado',
      notas: row.notas || ''
    };
    try{
      await addDoc(collection(db, coll), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      result.created++;
    } catch(e){
      logErr('smartImport create', e);
    }
  }

  return result;
}

/**
 * Aplica las actualizaciones de los registros "dudosos" que el usuario
 * confirmó tras revisar smartImport.
 *
 * @param {string} coll
 * @param {Array<object>} confirmedItems - items de result.doubtful que el usuario aceptó
 * @returns {Promise<number>} cantidad actualizada
 */
export async function applyDoubtfulUpdates(coll, confirmedItems){
  let count = 0;
  for(const item of confirmedItems){
    try{
      const payload = {};
      for(const [field, diff] of Object.entries(item.diffs)){
        payload[field] = diff.nuevo;
      }
      payload.updatedAt = serverTimestamp();
      await updateDoc(doc(db, coll, item.id), payload);
      count++;
    } catch(e){
      logErr('applyDoubtfulUpdates', e);
    }
  }
  return count;
}

async function _nextCounter(counterId){
  const counterRef = doc(db, 'counters', counterId);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().value || 0) : 0;
    const next = current + 1;
    tx.set(counterRef, {
      value: next,
      updatedAt: serverTimestamp()
    }, { merge: true });
    return next;
  });
}

export async function nextRefPosicion(eventoId){
  if(!eventoId) throw new Error('eventoId requerido para posición de referencia');
  return _nextCounter(`refPos__${eventoId}`);
}

export async function nextIngPosicion(eventoId){
  if(!eventoId) throw new Error('eventoId requerido para posición de ingreso');
  const dayKey = todayKey();
  return _nextCounter(`ingPos__${eventoId}__${dayKey}`);
}

export async function isPosicionTaken(coll, eventoId, posicion, options={}){
  if(!eventoId || !posicion) return false;
  const constraints = [
    where('eventoId', '==', eventoId),
    where('posicion', '==', Number(posicion))
  ];
  if(options.day){
    constraints.push(where('fechaKey', '==', options.day));
  }
  const q = query(collection(db, coll), ...constraints, limit(5));
  const snap = await getDocs(q);
  if(snap.empty) return false;
  // Excluir el propio registro (al editar)
  const docs = snap.docs.filter(d => d.id !== options.excludeId);
  return docs.length > 0;
}

/**
 * Devuelve la referencia/ingreso que tiene una posición ocupada en un evento.
 * Útil para mostrar al usuario quién la tiene antes de reasignar.
 */
export async function whoHasPosicion(coll, eventoId, posicion, options={}){
  if(!eventoId || !posicion) return null;
  const constraints = [
    where('eventoId', '==', eventoId),
    where('posicion', '==', Number(posicion))
  ];
  if(options.day){
    constraints.push(where('fechaKey', '==', options.day));
  }
  const q = query(collection(db, coll), ...constraints, limit(5));
  const snap = await getDocs(q);
  if(snap.empty) return null;
  const docs = snap.docs.filter(d => d.id !== options.excludeId);
  if(docs.length === 0) return null;
  return { id: docs[0].id, ...docs[0].data() };
}

export async function createReferencia(data, opts = {}){
  if(!data.eventoId) throw new Error('eventoId requerido');
  let posicion = data.posicion ? Number(data.posicion) : null;
  let posicionManual = false;
  let skipPos = false;

  if(posicion){
    const taken = await isPosicionTaken('referencias', data.eventoId, posicion);
    if(taken) throw new Error(`La posición ${posicion} ya está ocupada en este evento`);
    posicionManual = true;
  } else if(opts.skipAutoPosicion){
    // Importación masiva desde Excel: la referencia se crea SIN posición.
    // La posición se asignará cuando el vehículo llegue físicamente.
    // NO escribimos el campo 'posicion' en el documento (igual que el
    // alta manual sin posición) para no chocar con las reglas de
    // Firestore que esperan posicion como número.
    skipPos = true;
  } else {
    posicion = await nextRefPosicion(data.eventoId);
  }

  const id = genId('ref');
  const ref = doc(db, 'referencias', id);
  const u = window.__beunifyt_app?.auth?.currentUser;
  // 'data' puede traer un posicion:null residual del Excel: lo quitamos
  // y sólo añadimos 'posicion' si realmente hay un valor.
  const { posicion: _ignore, ...dataClean } = data;
  const docData = {
    ...dataClean,
    posicionManual,
    _deleted: false,
    creadoPor: u?.email || null,
    creadoPorUid: u?.uid || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if(!skipPos) docData.posicion = posicion;
  await setDoc(ref, docData);
  return { id, ...dataClean, posicion: skipPos ? null : posicion, posicionManual };
}

export async function createIngreso(data, opts = {}){
  if(!data.eventoId) throw new Error('eventoId requerido');
  const dayKey = todayKey();
  let posicion = data.posicion ? Number(data.posicion) : null;
  let posicionManual = false;
  let skipPos = false;

  if(posicion){
    const taken = await isPosicionTaken('ingresos', data.eventoId, posicion, { day: dayKey });
    if(taken) throw new Error(`La posición ${posicion} ya está ocupada hoy`);
    posicionManual = true;
  } else if(opts.skipAutoPosicion){
    // Importación masiva desde Excel: ingreso creado sin posición.
    skipPos = true;
  } else {
    posicion = await nextIngPosicion(data.eventoId);
  }

  const id = genId('ing');
  const ref = doc(db, 'ingresos', id);
  const u = window.__beunifyt_app?.auth?.currentUser;
  const { posicion: _ignoreIng, ...dataCleanIng } = data;
  const docDataIng = {
    ...dataCleanIng,
    posicionManual,
    fechaKey: dayKey,
    _deleted: false,
    creadoPor: u?.email || null,
    creadoPorUid: u?.uid || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if(!skipPos) docDataIng.posicion = posicion;
  await setDoc(ref, docDataIng);
  return { id, ...dataCleanIng, posicion: skipPos ? null : posicion, posicionManual, fechaKey: dayKey };
}

export async function getActiveEvent(){
  const q = query(collection(db,'eventos'), where('estado','==','activo'), limit(1));
  const snap = await getDocs(q);
  if(snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function listTemplates(eventoId, modulo){
  if(!eventoId) return [];
  const q = query(
    collection(db, 'eventos', eventoId, 'templates'),
    where('modulo', '==', modulo),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listGlobalTemplates(modulo){
  const q = query(
    collection(db, 'templates_global'),
    where('modulo', '==', modulo),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function saveTemplate(eventoId, modulo, name, layout, isDefault=false){
  const data = {
    modulo, name, layout, isDefault,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  if(eventoId){
    if(isDefault){
      const existing = await listTemplates(eventoId, modulo);
      for(const t of existing){
        if(t.isDefault){
          await updateDoc(doc(db, 'eventos', eventoId, 'templates', t.id), { isDefault: false });
        }
      }
    }
    const ref = doc(collection(db, 'eventos', eventoId, 'templates'));
    await setDoc(ref, data);
    return { id: ref.id, eventoId, ...data };
  } else {
    const ref = doc(collection(db, 'templates_global'));
    await setDoc(ref, data);
    return { id: ref.id, ...data };
  }
}

export async function deleteTemplate(eventoId, tplId){
  if(eventoId){
    await deleteDoc(doc(db, 'eventos', eventoId, 'templates', tplId));
  } else {
    await deleteDoc(doc(db, 'templates_global', tplId));
  }
}

export async function loadDefaultTemplate(eventoId, modulo){
  if(eventoId){
    const tpls = await listTemplates(eventoId, modulo);
    const def = tpls.find(t => t.isDefault);
    if(def) return def;
  }
  const globals = await listGlobalTemplates(modulo);
  return globals.find(t => t.isDefault) || globals[0] || null;
}

export { serverTimestamp, Timestamp };
