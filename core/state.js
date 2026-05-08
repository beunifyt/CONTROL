/**
 * Store global reactivo.
 *
 * Uso:
 *   state.set('user.theme', 'dark');
 *   state.get('user.theme');
 *   state.subscribe('user.theme', (val) => { ... });
 *
 * Persistencia en localStorage para claves marcadas como persistentes.
 */

import { eventBus } from './event-bus.js';

const STORAGE_KEY = 'unifyt:state';

const PERSIST_KEYS = [
  'user.theme',
  'user.lang',
  'user.preferences',
  'app.lastRoute'
];

class State {
  constructor() {
    this.data = this.load();
    this.subscribers = new Map();
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  persist() {
    const toSave = {};
    PERSIST_KEYS.forEach((key) => {
      const val = this.get(key);
      if (val !== undefined) this.setNested(toSave, key, val);
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
      console.warn('[State] persist failed', err);
    }
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.data);
  }

  set(path, value) {
    const oldValue = this.get(path);
    if (oldValue === value) return;

    this.setNested(this.data, path, value);

    // Notifica suscriptores exactos
    this.subscribers.get(path)?.forEach((cb) => cb(value, oldValue));

    // Notifica vía eventBus
    eventBus.emit('state:changed', { path, value, oldValue });

    // Persiste si aplica
    if (PERSIST_KEYS.some((k) => path === k || path.startsWith(k + '.'))) {
      this.persist();
    }
  }

  setNested(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] = o[k] || {}), obj);
    target[last] = value;
  }

  subscribe(path, cb) {
    if (!this.subscribers.has(path)) this.subscribers.set(path, new Set());
    this.subscribers.get(path).add(cb);
    return () => this.subscribers.get(path)?.delete(cb);
  }

  reset() {
    this.data = {};
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const state = new State();
