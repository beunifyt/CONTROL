// ═══════════════════════════════════════════════════════════════
// firebase-config.js — Configuración real del proyecto BeUnifyT
//
// ⚠️ ESTE ARCHIVO CONTIENE LAS CLAVES DE FIREBASE.
//
// Las claves apiKey/appId de Firebase Web SDK son públicas por diseño
// (las protege el dominio autorizado + las reglas Firestore), pero como
// buena práctica este archivo está en .gitignore.
//
// Antes del primer push, ejecuta:
//   git update-index --assume-unchanged js/firebase-config.js
// para que git ignore cambios futuros.
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// ── 1) Configuración del proyecto Firebase ─────────────────────
export const firebaseConfig = {
  apiKey: 'AIzaSyB02UpKF----------',
  authDomain: 'control-f84ee.firebaseapp.com',
  projectId: 'control-f84ee',
  storageBucket: 'control-f84ee.firebasestorage.app',
  messagingSenderId: '491029219146',
  appId: '1:491029219146:web:a8a0daa67abba7950923b3'
};

// ── 2) Configuración de la app ─────────────────────────────────

// Email del primer admin. La primera persona que se loguee con este
// email queda como administrador automáticamente.
// Después de crear el primer admin, vacíalo en producción para evitar reescalado.
export const bootstrapAdminEmail = 'carlosreyesrivera12@gmail.com';

// Nombre de empresa por defecto para perfiles nuevos
export const defaultCompanyName = 'BeUnifyT';

// URL base de la app (para QR de seguimiento, links de invitación)
export const appBaseUrl = window.location.origin + window.location.pathname;

// Días que dura una invitación antes de caducar
export const inviteTtlDays = 7;

// Idioma por defecto
export const defaultLang = 'es';

// Modo desarrollo (afecta a logging)
export const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

// Versión
export const appVersion = '1.0.0';

// ── 3) Inicialización Firebase (no tocar) ──────────────────────
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Persistencia local: el usuario sigue logueado tras cerrar pestaña
setPersistence(auth, browserLocalPersistence).catch(() => {});

// Firestore con cache offline activado (F-04)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const storage = getStorage(app);

// Bandera global accesible desde DevTools para depurar
window.__beunifyt_app = { app, auth, db, storage, version: appVersion };
