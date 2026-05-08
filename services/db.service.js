/**
 * DB Service.
 *
 * NUNCA llames Firestore directamente desde un módulo.
 * SIEMPRE pasa por aquí. Esto te da:
 *   - Validación con schema
 *   - Audit log automático
 *   - Caché en memoria
 *   - Punto único para migrar de proveedor en el futuro
 */

import { getFirestore, getMods } from './firebase.js';
import { authService } from './auth.service.js';
import { eventBus } from '../core/event-bus.js';
import { logger } from '../core/logger.js';
import { validateSchema } from '../shared/utils/validate.js';

class DbService {
  /**
   * Lee un documento.
   */
  async get(collection, id) {
    const { firestoreMod } = await getMods();
    const db = getFirestore();
    const snap = await firestoreMod.getDoc(firestoreMod.doc(db, collection, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  /**
   * Lista una colección con filtros opcionales.
   * filters: [['campo', '==', valor], ...]
   * orderBy: ['campo', 'desc']
   * limit: 50
   */
  async list(collection, { filters = [], orderBy, limit, startAfter } = {}) {
    const { firestoreMod } = await getMods();
    const db = getFirestore();
    const constraints = filters.map((f) => firestoreMod.where(...f));
    if (orderBy) constraints.push(firestoreMod.orderBy(...orderBy));
    if (startAfter) constraints.push(firestoreMod.startAfter(startAfter));
    if (limit) constraints.push(firestoreMod.limit(limit));

    const q = firestoreMod.query(firestoreMod.collection(db, collection), ...constraints);
    const snap = await firestoreMod.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /**
   * Suscripción en tiempo real.
   * Devuelve función para desuscribirse.
   */
  async subscribe(collection, { filters = [], orderBy, limit } = {}, callback) {
    const { firestoreMod } = await getMods();
    const db = getFirestore();
    const constraints = filters.map((f) => firestoreMod.where(...f));
    if (orderBy) constraints.push(firestoreMod.orderBy(...orderBy));
    if (limit) constraints.push(firestoreMod.limit(limit));

    const q = firestoreMod.query(firestoreMod.collection(db, collection), ...constraints);
    return firestoreMod.onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(docs);
    }, (err) => {
      logger.error(`[db] subscribe ${collection} failed`, err);
    });
  }

  /**
   * Crea un documento. Valida con schema si se proporciona.
   */
  async create(collection, data, schema) {
    if (schema) {
      const errors = validateSchema(data, schema);
      if (errors.length) throw new Error(`Validación: ${errors.join(', ')}`);
    }

    const { firestoreMod } = await getMods();
    const db = getFirestore();
    const user = authService.getCurrentUser();

    const enriched = {
      ...data,
      createdAt: firestoreMod.serverTimestamp(),
      createdBy: user?.uid || 'system',
      createdByName: user?.profile?.name || user?.email || 'system',
      updatedAt: firestoreMod.serverTimestamp()
    };

    const ref = await firestoreMod.addDoc(firestoreMod.collection(db, collection), enriched);
    await this._audit('create', collection, ref.id, enriched);
    eventBus.emit(`${collection}:created`, { id: ref.id, ...enriched });
    return ref.id;
  }

  /**
   * Actualiza un documento.
   */
  async update(collection, id, data, schema) {
    if (schema) {
      const errors = validateSchema(data, schema, { partial: true });
      if (errors.length) throw new Error(`Validación: ${errors.join(', ')}`);
    }

    const { firestoreMod } = await getMods();
    const db = getFirestore();
    const user = authService.getCurrentUser();

    const before = await this.get(collection, id);
    const enriched = {
      ...data,
      updatedAt: firestoreMod.serverTimestamp(),
      updatedBy: user?.uid || 'system'
    };

    await firestoreMod.updateDoc(firestoreMod.doc(db, collection, id), enriched);
    await this._audit('update', collection, id, enriched, before);
    eventBus.emit(`${collection}:updated`, { id, ...enriched });
    return id;
  }

  /**
   * Borra un documento (soft-delete: lo mueve a trash).
   */
  async softDelete(collection, id) {
    const { firestoreMod } = await getMods();
    const db = getFirestore();
    const user = authService.getCurrentUser();

    const doc = await this.get(collection, id);
    if (!doc) throw new Error('No existe');

    // Mover a trash
    await firestoreMod.setDoc(firestoreMod.doc(db, 'trash', id), {
      ...doc,
      _originalCollection: collection,
      _deletedAt: firestoreMod.serverTimestamp(),
      _deletedBy: user?.uid || 'system'
    });

    // Borrar del original
    await firestoreMod.deleteDoc(firestoreMod.doc(db, collection, id));
    await this._audit('delete', collection, id, doc);
    eventBus.emit(`${collection}:deleted`, { id });
    return id;
  }

  /**
   * Audit log automático. NO falla la operación si esto falla.
   */
  async _audit(action, collection, docId, data, before) {
    try {
      const { firestoreMod } = await getMods();
      const db = getFirestore();
      const user = authService.getCurrentUser();
      await firestoreMod.addDoc(firestoreMod.collection(db, 'audit'), {
        action,
        collection,
        docId,
        userId: user?.uid || 'system',
        userEmail: user?.email || 'system',
        timestamp: firestoreMod.serverTimestamp(),
        // Solo guardamos el diff para no inflar la colección
        diff: this._diff(before, data)
      });
    } catch (err) {
      logger.warn('[audit] failed', err);
    }
  }

  _diff(before, after) {
    if (!before) return { type: 'created' };
    const changes = {};
    for (const key of Object.keys(after || {})) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes[key] = { from: before[key], to: after[key] };
      }
    }
    return changes;
  }
}

export const db = new DbService();
