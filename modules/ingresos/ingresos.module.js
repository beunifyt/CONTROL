/**
 * Módulo Ingresos — adaptado del monolito Control.
 * El código original vive en ingresos.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'ingresos',
  name: 'Ingresos',
  icon: '🚛',
  routes: ['/ingresos'],
  permissions: ['ingresos.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-ingresos si no existe
    container.innerHTML = '<div id="tab-ingresos-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderIngresos === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-ingresos')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-ingresos');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-ingresos';
        document.getElementById('tab-ingresos-mount').append(tabDiv);
      }
      try {
        window.renderIngresos();
      } catch (e) {
        console.error('[ingresos] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Ingresos: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>🚛 Ingresos</h3><p>Función ' + 'renderIngresos' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-ingresos');
    if (t) t.innerHTML = '';
  }
};
