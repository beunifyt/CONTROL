/**
 * Módulo Vehicles.
 * Control de acceso vehicular (BeUnifyT).
 */

import { el } from '../../shared/utils/dom.js';
import { fmt } from '../../shared/utils/format.js';
import { db } from '../../services/db.service.js';
import { Modal } from '../../shared/components/modal.js';
import { toast } from '../../shared/components/toast.js';
import { renderHeader } from '../../shared/components/header.js';
import { renderNav } from '../../shared/components/nav.js';
import { authService } from '../../services/auth.service.js';

export const vehicleSchema = {
  matricula: { type: 'string', required: true, minLength: 4 },
  remolque: { type: 'string' },
  conductor: { type: 'string' },
  empresa: { type: 'string' },
  tipo: { type: 'string', enum: ['Camion', 'Semirremolque', 'Furgoneta', 'Trailer', 'Coche', 'Otro'] },
  hall: { type: 'string' },
  stand: { type: 'string' },
  status: { type: 'string', enum: ['waiting', 'inside', 'exited'] },
  eventId: { type: 'string' },
  cargaTipo: { type: 'string', enum: ['EF', 'SUNDAY', 'PRIORITY', 'GOODS', 'EMPTY'] },
  ref: { type: 'string' }
};

export default {
  id: 'vehicles',
  name: 'Vehículos',
  icon: '🚛',
  routes: ['/vehicles', '/vehicles/:id'],
  permissions: ['vehicles.view'],

  async init(params, container) {
    renderHeader();
    renderNav();
    return renderList(container);
  }
};

async function renderList(container) {
  container.append(
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' } },
      el('h1', {}, 'Control de vehículos'),
      authService.can('vehicles.create') && el('button', {
        class: 'btn btn-primary',
        onClick: () => openVehicleForm()
      }, '+ Registrar entrada')
    )
  );

  const tableContainer = el('div');
  container.append(tableContainer);

  await db.subscribe('vehicles', { orderBy: ['updatedAt', 'desc'], limit: 100 }, (vehicles) => {
    tableContainer.innerHTML = '';
    if (vehicles.length === 0) {
      tableContainer.append(el('div', { class: 'empty-state' },
        el('div', { class: 'empty-state-icon' }, '🚛'),
        el('h3', {}, 'Sin vehículos registrados'),
        el('p', {}, 'Empieza con "Registrar entrada"')
      ));
      return;
    }

    const table = el('table', { class: 'table' },
      el('thead', {}, el('tr', {},
        el('th', {}, 'Matrícula'),
        el('th', {}, 'Conductor'),
        el('th', {}, 'Empresa'),
        el('th', {}, 'Hall / Stand'),
        el('th', {}, 'Estado'),
        el('th', {}, 'Hora')
      )),
      el('tbody', {}, ...vehicles.map((v) => el('tr', { onClick: () => openVehicleForm(v) },
        el('td', { style: { fontFamily: 'var(--font-mono)', fontWeight: 600 } }, v.matricula || '—'),
        el('td', {}, v.conductor || '—'),
        el('td', {}, v.empresa || '—'),
        el('td', {}, [v.hall, v.stand].filter(Boolean).join(' / ') || '—'),
        el('td', {}, statusBadge(v.status)),
        el('td', {}, fmt.relative(v.updatedAt))
      )))
    );
    tableContainer.append(table);
  });
}

function statusBadge(s) {
  const map = {
    waiting: { class: 'badge-warning', label: '⏳ Esperando' },
    inside:  { class: 'badge-success', label: '🟢 Dentro' },
    exited:  { class: 'badge', label: '⚪ Salido' }
  };
  const c = map[s] || { class: 'badge', label: s };
  return el('span', { class: `badge ${c.class}` }, c.label);
}

function openVehicleForm(vehicle = null) {
  const isEdit = !!vehicle;
  const v = vehicle || { status: 'waiting' };

  const form = el('div', { class: 'form-grid' },
    el('div', { class: 'field-row' },
      field('Matrícula *', 'text', 'v-mat', v.matricula),
      field('Remolque', 'text', 'v-rem', v.remolque)
    ),
    el('div', { class: 'field-row' },
      field('Conductor', 'text', 'v-con', v.conductor),
      field('Empresa', 'text', 'v-emp', v.empresa)
    ),
    el('div', { class: 'field-row' },
      field('Hall', 'text', 'v-hall', v.hall),
      field('Stand', 'text', 'v-stand', v.stand)
    ),
    field('Referencia / Booking', 'text', 'v-ref', v.ref)
  );

  const modal = new Modal({
    title: isEdit ? 'Editar registro' : 'Nuevo ingreso',
    content: form,
    actions: [
      { label: 'Cancelar', style: 'secondary', onClick: (m) => m.close() },
      isEdit && {
        label: '🖨 Imprimir pase', style: 'secondary',
        onClick: () => printPass(v)
      },
      {
        label: isEdit ? 'Guardar' : 'Registrar entrada',
        style: 'primary',
        onClick: async (m) => {
          const payload = {
            matricula: document.getElementById('v-mat').value.toUpperCase(),
            remolque: document.getElementById('v-rem').value.toUpperCase(),
            conductor: document.getElementById('v-con').value,
            empresa: document.getElementById('v-emp').value,
            hall: document.getElementById('v-hall').value,
            stand: document.getElementById('v-stand').value,
            ref: document.getElementById('v-ref').value,
            status: isEdit ? v.status : 'inside'
          };
          try {
            if (isEdit) await db.update('vehicles', v.id, payload, vehicleSchema);
            else        await db.create('vehicles', payload, vehicleSchema);
            toast.success(isEdit ? 'Actualizado' : 'Vehículo registrado');
            m.close();
          } catch (err) { toast.error(err.message); }
        }
      }
    ].filter(Boolean)
  });
  modal.open();
}

function field(label, type, id, value = '') {
  return el('div', { class: 'field' },
    el('label', { class: 'label', for: id }, label),
    el('input', { class: 'input', type, id, value: value ?? '' })
  );
}

/**
 * Imprime un pase. Abre ventana print-friendly.
 */
function printPass(v) {
  const w = window.open('', '_blank', 'width=400,height=600');
  w.document.write(`
    <html>
      <head>
        <title>Pase ${v.matricula}</title>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; }
          .pase { border: 2px solid #000; padding: 16px; max-width: 350px; }
          .matricula { font-size: 32px; font-weight: 800; letter-spacing: 4px; text-align: center; padding: 12px; border: 2px solid #000; margin: 8px 0; }
          .info { margin: 8px 0; font-size: 14px; }
          .info strong { display: inline-block; width: 100px; }
          .qr { text-align: center; margin: 12px 0; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="pase">
          <h2 style="text-align:center; margin:0">UNIFYT · ACCESO</h2>
          <div class="matricula">${v.matricula}</div>
          <div class="info"><strong>Conductor:</strong> ${v.conductor || '—'}</div>
          <div class="info"><strong>Empresa:</strong> ${v.empresa || '—'}</div>
          <div class="info"><strong>Hall:</strong> ${v.hall || '—'} · <strong>Stand:</strong> ${v.stand || '—'}</div>
          <div class="info"><strong>Ref:</strong> ${v.ref || '—'}</div>
          <div class="info"><strong>Hora:</strong> ${new Date().toLocaleString('es-ES')}</div>
        </div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
}
