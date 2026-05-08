// firebase-config.example.js
// COPIA este archivo a `firebase-config.js` y rellena los valores reales.
// `firebase-config.js` está en .gitignore — nunca lo subas a git.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};

export const bootstrapAdminEmail = "tu@email.com";
export const defaultCompanyName = "Mi Empresa";
export const appBaseUrl = window.location.origin + window.location.pathname;
export const inviteTtlDays = 7;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
setPersistence(auth, browserLocalPersistence).catch(()=>{});
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});
export const storage = getStorage(app);
window.__beunifyt_app = { app, auth, db, storage };
