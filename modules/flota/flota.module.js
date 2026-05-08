/**
 * Módulo Flota — adaptado del monolito Control.
 * El código original vive en flota.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'flota',
  name: 'Flota',
  icon: '🚐',
  routes: ['/flota'],
  permissions: ['flota.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-flota si no existe
    container.innerHTML = '<div id="tab-flota-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderFlota === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-flota')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-flota');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-flota';
        document.getElementById('tab-flota-mount').append(tabDiv);
      }
      try {
        window.renderFlota();
      } catch (e) {
        console.error('[flota] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Flota: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>🚐 Flota</h3><p>Función ' + 'renderFlota' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-flota');
    if (t) t.innerHTML = '';
  }
};
