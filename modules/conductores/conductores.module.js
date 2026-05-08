/**
 * Módulo Conductores — adaptado del monolito Control.
 * El código original vive en conductores.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'conductores',
  name: 'Conductores',
  icon: '👤',
  routes: ['/conductores'],
  permissions: ['conductores.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-conductores si no existe
    container.innerHTML = '<div id="tab-conductores-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderConductores === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-conductores')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-conductores');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-conductores';
        document.getElementById('tab-conductores-mount').append(tabDiv);
      }
      try {
        window.renderConductores();
      } catch (e) {
        console.error('[conductores] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Conductores: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>👤 Conductores</h3><p>Función ' + 'renderConductores' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-conductores');
    if (t) t.innerHTML = '';
  }
};
