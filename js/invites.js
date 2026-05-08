// invites.js — sistema de invitaciones por código
import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { inviteTtlDays } from './firebase-config.js';
import { normalizeEmail } from './utils.js';

function genCode(){
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for(let i=0; i<6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createInvite({ email, displayName, role='user', empresa=null, createdBy, createdByUid }){
  email = normalizeEmail(email);
  if(!email) throw new Error('Email obligatorio');
  if(!['admin','supervisor','operario','user'].includes(role)) role = 'user';

  let code = '';
  for(let i=0; i<5; i++){
    code = genCode();
    const exists = await getDoc(doc(db, 'invites', code));
    if(!exists.exists()) break;
  }

  const expiresAt = Date.now() + inviteTtlDays * 24 * 60 * 60 * 1000;

  await setDoc(doc(db, 'invites', code), {
    email, displayName: displayName || '', role,
    empresa: empresa || null,
    used: false, usedBy: null, usedByUid: null, usedAt: null,
    createdBy: createdBy || null, createdByUid: createdByUid || null,
    createdAt: serverTimestamp(), expiresAt
  });

  return code;
}

export async function validateInvite(code){
  if(!code) return { valid:false, reason:'empty' };
  code = String(code).toUpperCase().trim();
  const ref = doc(db, 'invites', code);
  const snap = await getDoc(ref);
  if(!snap.exists()) return { valid:false, reason:'not_found' };
  const data = snap.data();
  if(data.used) return { valid:false, reason:'used' };
  if(data.expiresAt && data.expiresAt < Date.now()) return { valid:false, reason:'expired' };
  return { valid:true, code, data };
}

export async function consumeInvite(code, uid, email){
  if(!code) return;
  code = String(code).toUpperCase().trim();
  await updateDoc(doc(db, 'invites', code), {
    used: true,
    usedBy: normalizeEmail(email) || null,
    usedByUid: uid || null,
    usedAt: serverTimestamp()
  });
}

export async function listInvites(){
  const q = query(collection(db, 'invites'), orderBy('createdAt', 'desc'), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, code: d.id, ...d.data() }));
}

export async function deleteInvite(code){
  await deleteDoc(doc(db, 'invites', code));
}

export const INVITE_ERRORS = {
  empty: 'Código vacío',
  not_found: 'Código no encontrado',
  used: 'Esta invitación ya fue utilizada',
  expired: 'Esta invitación ha caducado'
};
