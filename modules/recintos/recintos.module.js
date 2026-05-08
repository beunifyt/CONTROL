/**
 * Módulo Recintos — adaptado del monolito Control.
 * El código original vive en recintos.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'recintos',
  name: 'Recintos',
  icon: '🏛',
  routes: ['/recintos'],
  permissions: ['recintos.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-recintos si no existe
    container.innerHTML = '<div id="tab-recintos-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderRecintos === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-recintos')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-recintos');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-recintos';
        document.getElementById('tab-recintos-mount').append(tabDiv);
      }
      try {
        window.renderRecintos();
      } catch (e) {
        console.error('[recintos] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Recintos: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>🏛 Recintos</h3><p>Función ' + 'renderRecintos' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-recintos');
    if (t) t.innerHTML = '';
  }
};
