/**
 * Inicialización de Firebase.
 * Carga lazy del SDK desde CDN para no requerir bundler.
 */

import { logger } from '../core/logger.js';

let firebaseApp = null;
let firestore = null;
let auth = null;

export async function initFirebase(config) {
  if (firebaseApp) return { firebaseApp, firestore, auth };

  // Carga modular SDK v10+ desde CDN
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js');
  const firestoreMod = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
  const authMod = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js');

  firebaseApp = initializeApp(config);

  firestore = firestoreMod.getFirestore(firebaseApp);
  // Habilita caché offline
  try {
    await firestoreMod.enableIndexedDbPersistence(firestore);
    logger.info('✓ Firestore offline persistence enabled');
  } catch (err) {
    logger.warn('Firestore persistence not available:', err.code);
  }

  auth = authMod.getAuth(firebaseApp);

  // Exporta los namespaces para que los services los usen
  return {
    firebaseApp,
    firestore,
    auth,
    firestoreMod,
    authMod
  };
}

export function getFirestore() { return firestore; }
export function getAuth() { return auth; }
export function getApp() { return firebaseApp; }

/**
 * Atajo para obtener los métodos modulares cuando los necesitas.
 */
let _mods = null;
export async function getMods() {
  if (_mods) return _mods;
  const [firestoreMod, authMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js'),
    import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js')
  ]);
  _mods = { firestoreMod, authMod };
  return _mods;
}
