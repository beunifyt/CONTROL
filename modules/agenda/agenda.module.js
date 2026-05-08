/**
 * Módulo Agenda — adaptado del monolito Control.
 * El código original vive en agenda.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'agenda',
  name: 'Agenda',
  icon: '📅',
  routes: ['/agenda'],
  permissions: ['agenda.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-agenda si no existe
    container.innerHTML = '<div id="tab-agenda-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderAgenda === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-agenda')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-agenda');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-agenda';
        document.getElementById('tab-agenda-mount').append(tabDiv);
      }
      try {
        window.renderAgenda();
      } catch (e) {
        console.error('[agenda] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Agenda: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>📅 Agenda</h3><p>Función ' + 'renderAgenda' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-agenda');
    if (t) t.innerHTML = '';
  }
};
