/**
 * Router SPA hash-based.
 * Funciona en GitHub Pages sin configuración de servidor.
 *
 * Cada módulo registra sus rutas vía moduleLoader.
 * Las rutas soportan parámetros: '/expenses/:id'
 */

import { eventBus } from './event-bus.js';
import { state } from './state.js';
import { logger } from './logger.js';

class Router {
  constructor() {
    this.routes = []; // [{ pattern, regex, params, handler, module }]
    this.currentRoute = null;
    this.currentModule = null;
  }

  /**
   * Registra una ruta. Lo hace el moduleLoader, no llames esto directo.
   */
  register(pattern, handler, moduleId) {
    const { regex, params } = this.compilePattern(pattern);
    this.routes.push({ pattern, regex, params, handler, moduleId });
  }

  compilePattern(pattern) {
    const params = [];
    const regexStr = pattern.replace(/:([\w]+)/g, (_, name) => {
      params.push(name);
      return '([^/]+)';
    });
    return { regex: new RegExp(`^${regexStr}$`), params };
  }

  async init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    await this.handleRoute();
  }

  async handleRoute() {
    const hash = location.hash.slice(1) || this.defaultRoute();
    const match = this.findMatch(hash);

    if (!match) {
      logger.warn(`[Router] No match for "${hash}"`);
      return this.notFound(hash);
    }

    // Cleanup módulo anterior si cambia
    if (this.currentModule && this.currentModule !== match.moduleId) {
      eventBus.emit('route:leaving', { from: this.currentRoute });
    }

    this.currentRoute = hash;
    this.currentModule = match.moduleId;
    state.set('app.lastRoute', hash);

    const container = document.getElementById('app-main');
    container.innerHTML = ''; // limpia contenido previo

    try {
      await match.handler(match.params, container);
      eventBus.emit('route:changed', { route: hash, module: match.moduleId });
    } catch (err) {
      logger.error(`[Router] Handler failed for "${hash}"`, err);
      container.innerHTML = `<div class="error-panel">Error: ${err.message}</div>`;
    }
  }

  findMatch(hash) {
    for (const route of this.routes) {
      const m = hash.match(route.regex);
      if (m) {
        const params = {};
        route.params.forEach((name, i) => (params[name] = m[i + 1]));
        return { ...route, params };
      }
    }
    return null;
  }

  defaultRoute() {
    return state.get('app.lastRoute') || '/dashboard';
  }

  navigate(path) {
    location.hash = path;
  }

  notFound(hash) {
    const container = document.getElementById('app-main');
    container.innerHTML = `
      <div class="error-panel">
        <h2>🔍 Ruta no encontrada</h2>
        <p><code>${hash}</code></p>
        <button onclick="location.hash='/dashboard'">Ir al dashboard</button>
      </div>
    `;
  }
}

export const router = new Router();
