/**
 * Módulo Ingresos 2 — adaptado del monolito Control.
 * El código original vive en ingresos2.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'ingresos2',
  name: 'Ingresos 2',
  icon: '📋',
  routes: ['/ingresos2'],
  permissions: ['ingresos2.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-ingresos2 si no existe
    container.innerHTML = '<div id="tab-ingresos2-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderIngresos2 === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-ingresos2')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-ingresos2');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-ingresos2';
        document.getElementById('tab-ingresos2-mount').append(tabDiv);
      }
      try {
        window.renderIngresos2();
      } catch (e) {
        console.error('[ingresos2] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Ingresos 2: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>📋 Ingresos 2</h3><p>Función ' + 'renderIngresos2' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-ingresos2');
    if (t) t.innerHTML = '';
  }
};
