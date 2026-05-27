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

// ═══════════════════════════════════════════════════════════════
// VALIDADOR HEURÍSTICO DE SERVICIOS (AI básica sin LLM)
// Revisa que un servicio completo tenga:
//   - Ingreso rampa  → con horaEntrada
//   - Referencia oficina → matrícula + posición + referencia
//   - Agenda llegado → estado = 'llegado'
//   - Salida → con horaSalida en ingreso
// Devuelve { ok, problemas[], score (0-100) }
// ═══════════════════════════════════════════════════════════════
export function validarServicioCompleto({ ingreso, referencia, agenda }){
  const problemas = [];
  let score = 100;

  // 1) Debe existir ingreso
  if(!ingreso){
    problemas.push({ tipo:'falta_ingreso', sev:'alto', msg:'No se registró el ingreso en rampa' });
    score -= 40;
  } else {
    if(!ingreso.horaEntrada){ problemas.push({ tipo:'falta_hora_entrada', sev:'medio', msg:'Ingreso sin hora de entrada' }); score -= 15; }
    if(!ingreso.matricula){ problemas.push({ tipo:'falta_matricula', sev:'alto', msg:'Ingreso sin matrícula' }); score -= 20; }
    if(!ingreso.posicion){ problemas.push({ tipo:'falta_posicion', sev:'medio', msg:'Ingreso sin posición' }); score -= 10; }
  }

  // 2) Si hay referencia esperada, comprobar
  if(referencia){
    if(!referencia.matricula){ problemas.push({ tipo:'ref_sin_mat', sev:'alto', msg:'Referencia sin matrícula' }); score -= 15; }
    if(ingreso && referencia.matricula && ingreso.matricula && referencia.matricula !== ingreso.matricula){
      problemas.push({ tipo:'mat_distinta', sev:'critico', msg:`Matrícula ingreso (${ingreso.matricula}) ≠ referencia (${referencia.matricula})` });
      score -= 35;
    }
    if(ingreso && referencia.posicion && ingreso.posicion && Number(referencia.posicion) !== Number(ingreso.posicion)){
      problemas.push({ tipo:'pos_distinta', sev:'alto', msg:`Posición ingreso (${ingreso.posicion}) ≠ referencia (${referencia.posicion})` });
      score -= 20;
    }
  }

  // 3) Si hay agenda asociada, verificar estado
  if(agenda){
    if(agenda.estado === 'planificado'){
      problemas.push({ tipo:'agenda_no_llegada', sev:'medio', msg:'Cita marcada como planificada pero el vehículo ya está dentro' });
      score -= 10;
    }
    if(agenda.matricula && ingreso?.matricula && agenda.matricula !== ingreso.matricula){
      problemas.push({ tipo:'agenda_mat_distinta', sev:'alto', msg:`Agenda tiene ${agenda.matricula}, ingresó ${ingreso.matricula}` });
      score -= 20;
    }
  }

  // 4) Si salió, validar horaSalida
  if(ingreso?.estado === 'salida' && !ingreso.horaSalida){
    problemas.push({ tipo:'salida_sin_hora', sev:'medio', msg:'Marcado salida sin hora de salida' });
    score -= 10;
  }

  return {
    ok: problemas.length === 0,
    score: Math.max(0, score),
    problemas
  };
}
