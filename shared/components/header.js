/**
 * App Header.
 * Logo, búsqueda, theme toggle, perfil.
 */

import { el } from '../utils/dom.js';
import { fmt } from '../utils/format.js';
import { state } from '../../core/state.js';
import { authService } from '../../services/auth.service.js';
import { eventBus } from '../../core/event-bus.js';

export function renderHeader() {
  const header = document.getElementById('app-header');
  if (!header) return;

  const user = authService.getCurrentUser();
  const profile = user?.profile;
  const theme = document.body.dataset.theme;

  header.className = 'app-header';
  header.innerHTML = '';

  // Logo
  const logo = el('div', { class: 'app-logo' }, 'UnifyT');

  // Acciones
  const actions = el('div', { class: 'app-header-actions' });

  // Theme toggle
  const themeBtn = el('button', {
    class: 'btn btn-ghost btn-icon',
    title: 'Cambiar tema',
    onClick: () => {
      const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
      document.body.dataset.theme = next;
      state.set('user.theme', next);
      renderHeader();
    }
  }, theme === 'dark' ? '☀️' : '🌙');

  actions.append(themeBtn);

  // Avatar
  if (profile) {
    const avatar = el('div', {
      class: 'avatar',
      style: { background: fmt.colorFromString(profile.email) },
      title: profile.name,
      onClick: () => {
        eventBus.emit('user:menu-click');
        // TODO: menú perfil
      }
    }, fmt.initials(profile.name));
    actions.append(avatar);

    // Logout
    const logoutBtn = el('button', {
      class: 'btn btn-ghost btn-icon',
      title: 'Cerrar sesión',
      onClick: () => authService.logout()
    }, '↗');
    actions.append(logoutBtn);
  }

  header.append(logo, actions);
}

// Re-render automático cuando cambia el tema
eventBus.on('state:changed', ({ path }) => {
  if (path === 'user.theme' || path === 'user.profile') renderHeader();
});
