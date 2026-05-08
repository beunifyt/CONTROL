/**
 * Toast notifications.
 *
 * Uso:
 *   toast.success('Guardado');
 *   toast.error('Falló');
 */

import { el } from '../utils/dom.js';

class ToastManager {
  _show(message, type = 'info', duration = 3500) {
    const container = this._container();
    const t = el('div', { class: `toast toast-${type}` }, message);
    container.append(t);

    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(20px)';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  _container() {
    let c = document.querySelector('.toast-container');
    if (!c) {
      c = el('div', { class: 'toast-container' });
      document.getElementById('app-toasts').append(c);
    }
    return c;
  }

  info(msg)    { this._show(msg, 'info'); }
  success(msg) { this._show(msg, 'success'); }
  warning(msg) { this._show(msg, 'warning'); }
  error(msg)   { this._show(msg, 'danger', 5000); }
}

export const toast = new ToastManager();
