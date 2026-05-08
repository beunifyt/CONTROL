/**
 * Módulo Dashboard.
 * KPIs y resumen general.
 */

import { el } from '../../shared/utils/dom.js';
import { fmt } from '../../shared/utils/format.js';
import { db } from '../../services/db.service.js';
import { renderHeader } from '../../shared/components/header.js';
import { renderNav } from '../../shared/components/nav.js';

export default {
  id: 'dashboard',
  name: 'Dashboard',
  icon: '📊',
  routes: ['/dashboard', '/'],
  permissions: ['dashboard.view'],

  async init(params, container) {
    renderHeader();
    renderNav();
    container.append(await render());
  }
};

async function render() {
  const wrap = el('div', { class: 'dashboard' });
  wrap.append(el('h1', { style: { marginBottom: 'var(--space-6)' } }, 'Dashboard'));

  // KPIs
  const [expenses, vehicles] = await Promise.all([
    db.list('expenses', { limit: 100 }).catch(() => []),
    db.list('vehicles', { limit: 100 }).catch(() => [])
  ]);

  const totalGastos = expenses.reduce((s, e) => s + (e.total || 0), 0);
  const pendientes = expenses.filter((e) => e.status === 'pending').length;
  const vehiculosActivos = vehicles.filter((v) => v.status === 'inside').length;

  const kpis = el('div', { class: 'kpi-grid' },
    kpi('Gastos del mes', fmt.money(totalGastos), `${expenses.length} registros`),
    kpi('Pendientes aprobar', pendientes, pendientes > 0 ? '⚠ Revisa la cola' : '✓ Todo al día'),
    kpi('Vehículos dentro', vehiculosActivos, `${vehicles.length} totales`),
    kpi('Eventos activos', '—', 'Próximamente')
  );
  wrap.append(kpis);

  // Bienvenida
  wrap.append(
    el('div', { class: 'card' },
      el('h2', { class: 'card-title' }, '👋 Bienvenido a UnifyT'),
      el('p', { style: { color: 'var(--text-muted)', marginTop: 'var(--space-3)' } },
        'Tu plataforma unificada de gestión está lista. Empieza explorando los módulos en el menú lateral.')
    )
  );

  return wrap;
}

function kpi(label, value, trend) {
  return el('div', { class: 'kpi' },
    el('div', { class: 'kpi-label' }, label),
    el('div', { class: 'kpi-value' }, value),
    el('div', { class: 'kpi-trend' }, trend)
  );
}
