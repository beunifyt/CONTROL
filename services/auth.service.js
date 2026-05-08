/**
 * Auth Service.
 * Login, logout, gestión de perfil y roles.
 *
 * El primer usuario con email = config.app.bootstrapAdminEmail
 * se autopromociona a admin al crear su perfil.
 */

import { getAuth, getFirestore, getMods } from './firebase.js';
import { eventBus } from '../core/event-bus.js';
import { state } from '../core/state.js';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

class AuthService {
  constructor() {
    this.user = null;
    this.profile = null;
    this._authReady = null;
  }

  /**
   * Espera a que Firebase resuelva el estado inicial.
   * Devuelve el user (o null).
   */
  waitForAuth() {
    if (this._authReady) return this._authReady;

    this._authReady = new Promise(async (resolve) => {
      const { authMod } = await getMods();
      const auth = getAuth();
      const unsub = authMod.onAuthStateChanged(auth, (user) => {
        this.user = user;
        if (user) eventBus.emit('user:login', user);
        else eventBus.emit('user:logout');
        unsub();
        resolve(user);
      });
    });

    return this._authReady;
  }

  getCurrentUser() {
    return this.user ? { ...this.user, profile: this.profile } : null;
  }

  /**
   * Carga el documento de perfil del usuario, creándolo si no existe.
   */
  async loadProfile() {
    if (!this.user) return null;

    const { firestoreMod } = await getMods();
    const db = getFirestore();
    const ref = firestoreMod.doc(db, 'users', this.user.uid);
    const snap = await firestoreMod.getDoc(ref);

    if (!snap.exists()) {
      // Crea perfil. Si el email coincide con bootstrapAdmin, role=admin.
      const isBootstrap = this.user.email === config.app.bootstrapAdminEmail;
      const profile = {
        uid: this.user.uid,
        email: this.user.email,
        name: this.user.displayName || this.user.email.split('@')[0],
        role: isBootstrap ? 'admin' : 'pending',
        active: isBootstrap,
        company: config.app.defaultCompany,
        createdAt: firestoreMod.serverTimestamp(),
        lastLogin: firestoreMod.serverTimestamp()
      };
      await firestoreMod.setDoc(ref, profile);
      this.profile = profile;
      logger.info(`✓ Profile created for ${this.user.email} (${profile.role})`);
    } else {
      this.profile = snap.data();
      // Actualiza lastLogin
      await firestoreMod.updateDoc(ref, { lastLogin: firestoreMod.serverTimestamp() });
    }

    state.set('user.profile', this.profile);
    return this.profile;
  }

  async loginEmail(email, password) {
    const { authMod } = await getMods();
    const auth = getAuth();
    const cred = await authMod.signInWithEmailAndPassword(auth, email, password);
    this.user = cred.user;
    await this.loadProfile();
    return this.user;
  }

  async signupEmail(email, password) {
    const { authMod } = await getMods();
    const auth = getAuth();
    const cred = await authMod.createUserWithEmailAndPassword(auth, email, password);
    this.user = cred.user;
    await this.loadProfile();
    return this.user;
  }

  async loginGoogle() {
    const { authMod } = await getMods();
    const auth = getAuth();
    const provider = new authMod.GoogleAuthProvider();
    const cred = await authMod.signInWithPopup(auth, provider);
    this.user = cred.user;
    await this.loadProfile();
    return this.user;
  }

  async logout() {
    const { authMod } = await getMods();
    const auth = getAuth();
    await authMod.signOut(auth);
    this.user = null;
    this.profile = null;
    eventBus.emit('user:logout');
    location.reload();
  }

  /**
   * Comprueba si el usuario actual tiene un permiso concreto.
   * Modelo simple por roles. Refínalo si necesitas granularidad.
   */
  can(permission) {
    if (!this.profile?.active) return false;
    const role = this.profile.role;
    if (role === 'admin') return true;
    if (role === 'viewer') return permission.endsWith('.view');
    if (role === 'supervisor') return !permission.startsWith('admin.');
    if (role === 'operator') {
      const action = permission.split('.').pop();
      return ['view', 'create', 'update'].includes(action);
    }
    return false;
  }

  isAdmin() { return this.profile?.role === 'admin' && this.profile?.active; }
}

export const authService = new AuthService();
