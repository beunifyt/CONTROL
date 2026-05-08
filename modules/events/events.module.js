/**
 * Módulo Events.
 * Gestión de eventos y recintos.
 */

import { el } from '../../shared/utils/dom.js';
import { fmt } from '../../shared/utils/format.js';
import { db } from '../../services/db.service.js';
import { Modal } from '../../shared/components/modal.js';
import { toast } from '../../shared/components/toast.js';
import { renderHeader } from '../../shared/components/header.js';
import { renderNav } from '../../shared/components/nav.js';
import { authService } from '../../services/auth.service.js';

export const eventSchema = {
  name: { type: 'string', required: true, minLength: 2 },
  startDate: { type: 'date', required: true },
  endDate: { type: 'date' },
  recinto: { type: 'string' },
  city: { type: 'string' },
  active: { type: 'boolean' },
  halls: { type: 'array' }
};

export default {
  id: 'events',
  name: 'Eventos',
  icon: '📅',
  routes: ['/events'],
  permissions: ['events.view'],

  async init(params, container) {
    renderHeader();
    renderNav();
    return renderList(container);
  }
};

async function renderList(container) {
  container.append(
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' } },
      el('h1', {}, 'Eventos'),
      authService.can('events.create') && el('button', { class: 'btn btn-primary', onClick: () => openEventForm() }, '+ Nuevo evento')
    )
  );

  const grid = el('div', { class: 'kpi-grid' });
  container.append(grid);

  await db.subscribe('events', { orderBy: ['startDate', 'desc'] }, (events) => {
    grid.innerHTML = '';
    if (events.length === 0) {
      grid.append(el('div', { class: 'empty-state', style: { gridColumn: '1/-1' }},
        el('div', { class: 'empty-state-icon' }, '📅'),
        el('h3', {}, 'Sin eventos'),
        el('p', {}, 'Crea tu primer evento')
      ));
      return;
    }
    events.forEach((e) => {
      grid.append(el('div', {
        class: 'card',
        onClick: () => openEventForm(e),
        style: { cursor: 'pointer' }
      },
        el('div', { class: 'card-header' },
          el('h3', { class: 'card-title' }, `${e.icon || '📅'} ${e.name}`),
          e.active && el('span', { class: 'badge badge-success' }, 'Activo')
        ),
        el('p', { style: { color: 'var(--text-muted)', fontSize: '14px' } },
          `${fmt.date(e.startDate)} → ${fmt.date(e.endDate)}`
        ),
        el('p', { style: { color: 'var(--text-muted)', fontSize: '13px' } }, e.recinto || '—')
      ));
    });
  });
}

function openEventForm(event = null) {
  const isEdit = !!event;
  const e = event || { startDate: new Date().toISOString().slice(0, 10), active: false };

  const form = el('div', { class: 'form-grid' },
    field('Nombre *', 'text', 'e-name', e.name),
    el('div', { class: 'field-row' },
      field('Fecha inicio', 'date', 'e-start', e.startDate),
      field('Fecha fin', 'date', 'e-end', e.endDate)
    ),
    el('div', { class: 'field-row' },
      field('Recinto', 'text', 'e-recinto', e.recinto),
      field('Ciudad', 'text', 'e-city', e.city)
    ),
    el('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
      el('input', { type: 'checkbox', id: 'e-active', checked: e.active }),
      'Evento activo'
    )
  );

  const modal = new Modal({
    title: isEdit ? 'Editar evento' : 'Nuevo evento',
    content: form,
    actions: [
      { label: 'Cancelar', style: 'secondary', onClick: (m) => m.close() },
      {
        label: 'Guardar', style: 'primary',
        onClick: async (m) => {
          const payload = {
            name: document.getElementById('e-name').value,
            startDate: document.getElementById('e-start').value,
            endDate: document.getElementById('e-end').value,
            recinto: document.getElementById('e-recinto').value,
            city: document.getElementById('e-city').value,
            active: document.getElementById('e-active').checked
          };
          try {
            if (isEdit) await db.update('events', event.id, payload, eventSchema);
            else        await db.create('events', payload, eventSchema);
            toast.success('Guardado');
            m.close();
          } catch (err) { toast.error(err.message); }
        }
      }
    ]
  });
  modal.open();
}

function field(label, type, id, value = '') {
  return el('div', { class: 'field' },
    el('label', { class: 'label', for: id }, label),
    el('input', { class: 'input', type, id, value: value ?? '' })
  );
}
