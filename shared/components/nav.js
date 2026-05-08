/**
 * Side Navigation.
 * Pinta los módulos cargados como pestañas.
 */

import { el } from '../utils/dom.js';
import { router } from '../../core/router.js';
import { moduleLoader } from '../../core/module-loader.js';
import { eventBus } from '../../core/event-bus.js';

export function renderNav() {
  const nav = document.getElementById('app-nav');
  if (!nav) return;

  nav.className = 'app-nav';
  nav.innerHTML = '';

  const modules = moduleLoader.getLoaded()
    .filter((m) => m.icon && m.id !== 'auth') // auth no se muestra en nav
    .filter((m) => (m.routes || []).length > 0);

  const currentRoute = location.hash.slice(1);

  modules.forEach((mod) => {
    const firstRoute = typeof mod.routes[0] === 'string' ? mod.routes[0] : mod.routes[0].path;
    const isActive = currentRoute.startsWith(firstRoute.replace(/\/:.+$/, ''));

    const item = el('div', {
      class: `nav-item ${isActive ? 'active' : ''}`,
      onClick: () => router.navigate(firstRoute)
    },
      el('span', { class: 'nav-icon' }, mod.icon),
      el('span', { class: 'nav-label' }, mod.name)
    );
    nav.append(item);
  });
}

// Re-render cuando cambia la ruta o se carga un módulo
eventBus.on('route:changed', renderNav);
eventBus.on('module:loaded', renderNav);
