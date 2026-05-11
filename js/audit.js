// ═══════════════════════════════════════════════════════════════
// audit.js — Auditoría e historial de cambios
//
// - logChange(coll, docId, type, before, after, user) → guarda en `audit`
// - getHistory(coll, docId) → lee historial de un registro
// - Trash: soft-delete con campo `_deleted` + restauración
// ═══════════════════════════════════════════════════════════════

import { db } from './firebase-config.js';
import {
  collection, addDoc, getDocs, query, where, orderBy, limit,
  doc, updateDoc, serverTimestamp, deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { logger } from './logger.js';
import { getCurrentProfile } from './auth.js';

// ── Registrar evento de auditoría ─────────────────────────────
export async function logChange(coll, docId, type, before, after, extra = {}){
  const profile = getCurrentProfile();
  try{
    await addDoc(collection(db, 'audit'), {
      coll, docId, type, // 'create' | 'update' | 'delete' | 'restore' | 'incidencia'
      before: before ? JSON.stringify(before).slice(0, 5000) : null,
      after:  after  ? JSON.stringify(after).slice(0, 5000)  : null,
      userId: profile?.id || null,
      userEmail: profile?.email || null,
      userName: profile?.displayName || profile?.email || 'Sistema',
      extra,
      createdAt: serverTimestamp()
    });
  } catch(e){
    logger.warn('audit.logChange falló', { error: e.message });
  }
}

export async function getHistory(coll, docId, max = 50){
  try{
    const q = query(
      collection(db, 'audit'),
      where('coll', '==', coll),
      where('docId', '==', docId),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e){
    logger.warn('getHistory falló', { error: e.message });
    return [];
  }
}

// ── Soft delete (papelera) ────────────────────────────────────
export async function softDelete(coll, docId, before = null){
  try{
    await updateDoc(doc(db, coll, docId), {
      _deleted: true,
      _deletedAt: serverTimestamp(),
      _deletedBy: getCurrentProfile()?.id || null
    });
    await logChange(coll, docId, 'delete', before, null);
    logger.ok(`Movido a papelera: ${coll}/${docId}`);
  } catch(e){
    logger.error('softDelete falló', { error: e.message });
    throw e;
  }
}

export async function restore(coll, docId){
  try{
    await updateDoc(doc(db, coll, docId), {
      _deleted: false,
      _deletedAt: null,
      _deletedBy: null,
      _restoredAt: serverTimestamp()
    });
    await logChange(coll, docId, 'restore', null, null);
    logger.ok(`Restaurado: ${coll}/${docId}`);
  } catch(e){
    logger.error('restore falló', { error: e.message });
    throw e;
  }
}

export async function purge(coll, docId){
  try{
    await deleteDoc(doc(db, coll, docId));
    logger.ok(`Eliminado permanente: ${coll}/${docId}`);
  } catch(e){
    logger.error('purge falló', { error: e.message });
    throw e;
  }
}

// ── Incidencia (cambio significativo registrado a mano) ──────
export async function logIncidencia(coll, docId, tipo, descripcion){
  const profile = getCurrentProfile();
  try{
    await addDoc(collection(db, 'incidencias'), {
      coll, docId, tipo, // 'cambio_camion' | 'cambio_conductor' | 'cambio_fecha' | 'otro'
      descripcion: descripcion || '',
      userId: profile?.id || null,
      userName: profile?.displayName || profile?.email,
      createdAt: serverTimestamp()
    });
    await logChange(coll, docId, 'incidencia', null, null, { tipo, descripcion });
    logger.ok(`Incidencia registrada: ${tipo}`);
  } catch(e){
    logger.error('logIncidencia falló', { error: e.message });
    throw e;
  }
}

export async function listIncidencias(coll, docId){
  try{
    const q = query(
      collection(db, 'incidencias'),
      where('coll', '==', coll),
      where('docId', '==', docId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(_){
    return [];
  }
}
