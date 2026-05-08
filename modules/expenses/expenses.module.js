/**
 * Módulo Gastos.
 * Lista, formulario, OCR, aprobaciones.
 */

import { el } from '../../shared/utils/dom.js';
import { fmt } from '../../shared/utils/format.js';
import { tax } from '../../shared/utils/tax.js';
import { db } from '../../services/db.service.js';
import { ocr } from '../../services/ocr.service.js';
import { storage } from '../../services/storage.service.js';
import { Modal } from '../../shared/components/modal.js';
import { toast } from '../../shared/components/toast.js';
import { renderHeader } from '../../shared/components/header.js';
import { renderNav } from '../../shared/components/nav.js';
import { authService } from '../../services/auth.service.js';
import { expenseSchema, CATEGORIAS, IVA_RATES, FORMAS_PAGO } from './expenses.schema.js';

export default {
  id: 'expenses',
  name: 'Gastos',
  icon: '💰',
  routes: ['/expenses', '/expenses/:id'],
  permissions: ['expenses.view'],

  async init(params, container) {
    renderHeader();
    renderNav();
    if (params.id) return renderDetail(container, params.id);
    return renderList(container);
  }
};

async function renderList(container) {
  container.append(
    el('div', { class: 'expenses-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' } },
      el('h1', {}, 'Gastos'),
      authService.can('expenses.create') && el('button', {
        class: 'btn btn-primary',
        onClick: () => openExpenseForm()
      }, '+ Nuevo gasto')
    )
  );

  const tableContainer = el('div', { id: 'expenses-table' });
  container.append(tableContainer);

  // Suscripción en tiempo real
  await db.subscribe('expenses', { orderBy: ['date', 'desc'], limit: 50 }, (expenses) => {
    tableContainer.innerHTML = '';
    if (expenses.length === 0) {
      tableContainer.append(emptyState('💰', 'Sin gastos registrados', 'Pulsa "Nuevo gasto" para empezar'));
      return;
    }

    const table = el('table', { class: 'table' },
      el('thead', {},
        el('tr', {},
          el('th', {}, 'Fecha'),
          el('th', {}, 'Proveedor'),
          el('th', {}, 'Categoría'),
          el('th', {}, 'Total'),
          el('th', {}, 'Estado'),
          el('th', {}, '')
        )
      ),
      el('tbody', {}, ...expenses.map(rowFor))
    );
    tableContainer.append(table);
  });
}

function rowFor(expense) {
  return el('tr', { onClick: () => openExpenseForm(expense) },
    el('td', {}, fmt.date(expense.date)),
    el('td', {}, expense.proveedor || '—'),
    el('td', {}, el('span', { class: 'badge' }, expense.categoria || '—')),
    el('td', { style: { fontWeight: 600 } }, fmt.money(expense.total)),
    el('td', {}, statusBadge(expense.status)),
    el('td', {}, '›')
  );
}

function statusBadge(status) {
  const map = {
    pending:  { class: 'badge-warning', label: '⏳ Pendiente' },
    approved: { class: 'badge-success', label: '✓ Aprobado' },
    rejected: { class: 'badge-danger',  label: '✗ Rechazado' }
  };
  const cfg = map[status] || { class: 'badge', label: status };
  return el('span', { class: `badge ${cfg.class}` }, cfg.label);
}

function openExpenseForm(expense = null) {
  const isEdit = !!expense;
  const data = expense || { date: new Date().toISOString().slice(0, 10), ivaRate: 21 };

  const form = el('div', { class: 'form-grid' });

  // Fecha + Proveedor
  form.append(
    formRow(
      formField('Fecha', 'date', 'exp-date', data.date),
      formField('Proveedor', 'text', 'exp-prov', data.proveedor)
    )
  );

  // NIF + Categoría
  form.append(
    formRow(
      formField('NIF / CIF', 'text', 'exp-nif', data.nif),
      formSelect('Categoría', 'exp-cat', CATEGORIAS, data.categoria)
    )
  );

  // Concepto
  form.append(formField('Concepto', 'text', 'exp-concepto', data.concepto));

  // Base + IVA
  form.append(
    formRow(
      formField('Base imponible (€)', 'number', 'exp-base', data.base, '0.01'),
      formSelect('IVA %', 'exp-iva', IVA_RATES.map(String), String(data.ivaRate))
    )
  );

  // Total auto-calculado
  const totalEl = formField('Total (€)', 'number', 'exp-total', data.total, '0.01');
  form.append(totalEl);

  // Forma de pago
  form.append(formSelect('Forma de pago', 'exp-pago', FORMAS_PAGO, data.formaPago));

  // OCR upload
  const ocrBtn = el('button', {
    class: 'btn btn-secondary',
    style: { width: '100%' },
    onClick: async () => {
      const input = el('input', { type: 'file', accept: 'image/*', style: { display: 'none' }});
      input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        toast.info('Procesando OCR...');
        try {
          const result = await ocr.recognize(file);
          if (result.fields.proveedor) document.getElementById('exp-prov').value = result.fields.proveedor;
          if (result.fields.nif) document.getElementById('exp-nif').value = result.fields.nif;
          if (result.fields.total) document.getElementById('exp-total').value = result.fields.total;
          if (result.fields.fecha) document.getElementById('exp-date').value = result.fields.fecha;
          if (result.fields.ivaRate) document.getElementById('exp-iva').value = result.fields.ivaRate;
          toast.success('OCR completado');
        } catch (err) { toast.error(err.message); }
      };
      input.click();
    }
  }, '📷 Escanear ticket (OCR)');
  form.append(ocrBtn);

  // Auto-cálculo
  const recompute = () => {
    const base = parseFloat(document.getElementById('exp-base').value) || 0;
    const iva = parseFloat(document.getElementById('exp-iva').value) || 0;
    const result = tax.fromBase(base, iva);
    document.getElementById('exp-total').value = result.total;
  };
  setTimeout(() => {
    document.getElementById('exp-base').addEventListener('input', recompute);
    document.getElementById('exp-iva').addEventListener('change', recompute);
  }, 0);

  const modal = new Modal({
    title: isEdit ? `Editar gasto` : 'Nuevo gasto',
    content: form,
    actions: [
      { label: 'Cancelar', style: 'secondary', onClick: (m) => m.close() },
      isEdit && authService.can('expenses.delete') && {
        label: 'Eliminar', style: 'danger',
        onClick: async (m) => {
          if (await Modal.confirm({ title: '¿Eliminar?', message: 'Va a la papelera.', danger: true })) {
            await db.softDelete('expenses', expense.id);
            toast.success('Eliminado');
            m.close();
          }
        }
      },
      {
        label: isEdit ? 'Guardar cambios' : 'Crear',
        style: 'primary',
        onClick: async (m) => {
          const payload = collectForm();
          try {
            if (isEdit) await db.update('expenses', expense.id, payload, expenseSchema);
            else        await db.create('expenses', payload, expenseSchema);
            toast.success(isEdit ? 'Actualizado' : 'Creado');
            m.close();
          } catch (err) { toast.error(err.message); }
        }
      }
    ].filter(Boolean)
  });
  modal.open();
}

function collectForm() {
  const base = parseFloat(document.getElementById('exp-base').value) || 0;
  const ivaRate = parseFloat(document.getElementById('exp-iva').value) || 0;
  const total = parseFloat(document.getElementById('exp-total').value) || 0;
  const ivaAmount = +(base * ivaRate / 100).toFixed(2);

  return {
    date: document.getElementById('exp-date').value,
    proveedor: document.getElementById('exp-prov').value,
    nif: document.getElementById('exp-nif').value.toUpperCase(),
    concepto: document.getElementById('exp-concepto').value,
    categoria: document.getElementById('exp-cat').value,
    base, ivaRate, ivaAmount, total,
    formaPago: document.getElementById('exp-pago').value,
    status: 'pending'
  };
}

// === Helpers UI ===
function formRow(...children) {
  const row = el('div', { class: 'field-row' });
  children.forEach((c) => row.append(c));
  return row;
}

function formField(label, type, id, value = '', step) {
  const attrs = { class: 'input', type, id, value: value ?? '' };
  if (step) attrs.step = step;
  return el('div', { class: 'field' },
    el('label', { class: 'label', for: id }, label),
    el('input', attrs)
  );
}

function formSelect(label, id, options, value = '') {
  const select = el('select', { class: 'select', id });
  select.append(el('option', { value: '' }, '—'));
  options.forEach((o) => {
    const opt = el('option', { value: o }, o);
    if (String(o) === String(value)) opt.selected = true;
    select.append(opt);
  });
  return el('div', { class: 'field' },
    el('label', { class: 'label', for: id }, label),
    select
  );
}

function emptyState(icon, title, description) {
  return el('div', { class: 'empty-state' },
    el('div', { class: 'empty-state-icon' }, icon),
    el('h3', {}, title),
    el('p', {}, description)
  );
}

async function renderDetail(container, id) {
  const expense = await db.get('expenses', id);
  if (!expense) {
    container.append(el('div', { class: 'error-panel' }, 'Gasto no encontrado'));
    return;
  }
  openExpenseForm(expense);
  // Volver al listado en background
  await renderList(container);
}
