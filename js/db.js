// db.js — capa de acceso a Firestore
import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot,
  runTransaction, serverTimestamp, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { genId, log, logErr, todayKey } from './utils.js';

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
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    try{ cb(items, snap); } catch(e){ logErr('listLive cb', e); }
  }, (err) => {
    logErr('listLive', coll, err);
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
  await setDoc(ref, {
    ...data,
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
  const ref = doc(db, coll, id);
  await deleteDoc(ref);
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
  const q = query(collection(db, coll), ...constraints, limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function createReferencia(data){
  if(!data.eventoId) throw new Error('eventoId requerido');
  let posicion = data.posicion ? Number(data.posicion) : null;
  let posicionManual = false;

  if(posicion){
    const taken = await isPosicionTaken('referencias', data.eventoId, posicion);
    if(taken) throw new Error(`La posición ${posicion} ya está ocupada en este evento`);
    posicionManual = true;
  } else {
    posicion = await nextRefPosicion(data.eventoId);
  }

  const id = genId('ref');
  const ref = doc(db, 'referencias', id);
  await setDoc(ref, {
    ...data,
    posicion,
    posicionManual,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { id, ...data, posicion, posicionManual };
}

export async function createIngreso(data){
  if(!data.eventoId) throw new Error('eventoId requerido');
  const dayKey = todayKey();
  let posicion = data.posicion ? Number(data.posicion) : null;
  let posicionManual = false;

  if(posicion){
    const taken = await isPosicionTaken('ingresos', data.eventoId, posicion, { day: dayKey });
    if(taken) throw new Error(`La posición ${posicion} ya está ocupada hoy`);
    posicionManual = true;
  } else {
    posicion = await nextIngPosicion(data.eventoId);
  }

  const id = genId('ing');
  const ref = doc(db, 'ingresos', id);
  await setDoc(ref, {
    ...data,
    posicion,
    posicionManual,
    fechaKey: dayKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return { id, ...data, posicion, posicionManual, fechaKey: dayKey };
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
