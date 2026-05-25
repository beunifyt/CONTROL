// ═══════════════════════════════════════════════════════════════
// firebase-config.js — Configuración real del proyecto BeUnifyT
// ═══════════════════════════════════════════════════════════════
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

export const firebaseConfig = {
  apiKey: "AIzaSy-",
  authDomain: 'control-f84ee.firebaseapp.com',
  projectId: 'control-f84ee',
  storageBucket: 'control-f84ee.firebasestorage.app',
  messagingSenderId: '491029219146',
  appId: '1:491029219146:web:a8a0daa67abba7950923b3'
};

export const bootstrapAdminEmail = 'carlosreyesrivera12@gmail.com';
export const defaultCompanyName = 'BeUnifyT';
export const appBaseUrl = window.location.origin + window.location.pathname;
export const inviteTtlDays = 7;
export const defaultLang = 'es';
export const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
export const appVersion = '1.0.0';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
setPersistence(auth, browserLocalPersistence).catch(() => {});

// Firestore SIN caché persistente. El caché en IndexedDB se corrompía
// y producía "INTERNAL ASSERTION FAILED: Unexpected state" + errores
// engañosos como "Unexpected token ')'" al cargar módulos.
export const db = getFirestore(app);

export const storage = getStorage(app);
window.__beunifyt_app = { app, auth, db, storage, version: appVersion };
export const geminiApiKey = 'AIzaSyB3UXxzt9UpIhRgVRQGdJKClEqsgSY3pzw';
