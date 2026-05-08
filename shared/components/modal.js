/**
 * Modal reutilizable.
 *
 * Uso:
 *   const m = new Modal({ title: '...', content: el(...) });
 *   m.open();
 *   m.close();
 */

import { el } from '../utils/dom.js';

export class Modal {
  constructor({ title, content, actions, onClose }) {
    this.title = title;
    this.content = content;
    this.actions = actions || [];
    this.onClose = onClose;
    this.element = null;
  }

  open() {
    const overlay = el('div', { class: 'modal-overlay', onClick: (e) => {
      if (e.target === overlay) this.close();
    }});

    const closeBtn = el('button', { class: 'modal-close', onClick: () => this.close() }, '✕');

    const header = el('div', { class: 'modal-header' },
      el('h2', { class: 'card-title' }, this.title),
      closeBtn
    );

    const body = el('div', { class: 'modal-body' });
    if (typeof this.content === 'string') body.innerHTML = this.content;
    else body.append(this.content);

    const footer = el('div', { class: 'modal-actions' });
    this.actions.forEach((a) => {
      const btn = el('button', {
        class: `btn btn-${a.style || 'secondary'}`,
        onClick: () => a.onClick?.(this)
      }, a.label);
      footer.append(btn);
    });

    const modal = el('div', { class: 'modal' }, header, body, this.actions.length ? footer : null);
    overlay.append(modal);

    document.getElementById('app-modals').append(overlay);
    this.element = overlay;

    // Esc para cerrar
    this._escHandler = (e) => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._escHandler);

    return this;
  }

  close() {
    document.removeEventListener('keydown', this._escHandler);
    this.element?.remove();
    this.element = null;
    this.onClose?.();
  }

  static confirm({ title, message, onConfirm, danger = false }) {
    return new Promise((resolve) => {
      const m = new Modal({
        title,
        content: el('p', {}, message),
        actions: [
          { label: 'Cancelar', style: 'secondary', onClick: (m) => { m.close(); resolve(false); } },
          { label: danger ? 'Eliminar' : 'Confirmar', style: danger ? 'danger' : 'primary', onClick: (m) => { m.close(); onConfirm?.(); resolve(true); } }
        ]
      });
      m.open();
    });
  }
}
