/**
 * Module Loader
 *
 * Cada módulo tiene un manifest:
 *   {
 *     id: 'expenses',
 *     name: 'Gastos',
 *     icon: '💰',
 *     routes: [{ path: '/expenses', view: 'list' }],
 *     permissions: ['expenses.view'],
 *     init: async (ctx) => { ... },
 *     destroy: () => { ... }
 *   }
 *
 * Para añadir un módulo nuevo:
 *   1. Crear modules/mi-modulo/mi-modulo.module.js
 *   2. Añadir el id al array MODULES de abajo.
 *   3. Listo.
 */

import { router } from './router.js';
import { eventBus } from './event-bus.js';
import { authService } from '../services/auth.service.js';
import { logger } from './logger.js';

// 👇 Registrar aquí los módulos disponibles
const MODULES = [
  'auth',
  'dashboard',
  'expenses',
  'vehicles',
  'events',
  'users'
];

class ModuleLoader {
  constructor() {
    this.loaded = new Map(); // id -> manifest
    this.cleanupFns = new Map(); // id -> () => void
  }

  async load(moduleId) {
    if (this.loaded.has(moduleId)) return this.loaded.get(moduleId);

    try {
      const mod = await import(`../modules/${moduleId}/${moduleId}.module.js`);
      const manifest = mod.default;

      if (!manifest || !manifest.id) {
        throw new Error(`Module "${moduleId}" missing manifest`);
      }

      // Registrar rutas
      (manifest.routes || []).forEach((r) => {
        const path = typeof r === 'string' ? r : r.path;
        const handler = typeof r === 'string' ? manifest.init : (params, container) => manifest.init(params, container, r.view);
        router.register(path, handler, manifest.id);
      });

      // Init si tiene init global
      if (manifest.bootstrap) {
        const cleanup = await manifest.bootstrap();
        if (typeof cleanup === 'function') this.cleanupFns.set(moduleId, cleanup);
      }

      this.loaded.set(moduleId, manifest);
      logger.info(`✓ Module loaded: ${moduleId}`);
      eventBus.emit('module:loaded', { id: moduleId });
      return manifest;
    } catch (err) {
      logger.error(`✗ Module "${moduleId}" failed`, err);
      throw err;
    }
  }

  async loadEnabled() {
    const user = authService.getCurrentUser();
    const role = user?.profile?.role;

    for (const id of MODULES) {
      // Auth no se carga si ya hay usuario
      if (id === 'auth' && user) continue;

      try {
        const manifest = await this.load(id);

        // Si el módulo declara permisos y el rol no los tiene, lo descargamos
        if (manifest.permissions && !this.hasPermissions(role, manifest.permissions)) {
          this.unload(id);
        }
      } catch (err) {
        // Un módulo roto NO debe matar la app
        logger.warn(`Module "${id}" skipped:`, err.message);
      }
    }
  }

  hasPermissions(role, perms) {
    // admin tiene todo
    if (role === 'admin') return true;
    // Lógica simple: viewer solo *.view, supervisor tiene todo menos admin.*
    return perms.every((p) => {
      if (role === 'viewer') return p.endsWith('.view');
      if (role === 'supervisor') return !p.startsWith('admin.');
      if (role === 'operator') return ['view', 'create', 'update'].some((a) => p.endsWith('.' + a));
      return false;
    });
  }

  unload(moduleId) {
    const cleanup = this.cleanupFns.get(moduleId);
    if (cleanup) cleanup();
    this.cleanupFns.delete(moduleId);
    eventBus.clearNamespace(moduleId);
    this.loaded.delete(moduleId);
    logger.info(`Module unloaded: ${moduleId}`);
  }

  getLoaded() {
    return Array.from(this.loaded.values());
  }
}

export const moduleLoader = new ModuleLoader();
