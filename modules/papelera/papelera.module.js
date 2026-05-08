/**
 * Módulo Papelera — adaptado del monolito Control.
 * El código original vive en papelera.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'papelera',
  name: 'Papelera',
  icon: '🗑',
  routes: ['/papelera'],
  permissions: ['papelera.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-papelera si no existe
    container.innerHTML = '<div id="tab-papelera-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderPapelera === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-papelera')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-papelera');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-papelera';
        document.getElementById('tab-papelera-mount').append(tabDiv);
      }
      try {
        window.renderPapelera();
      } catch (e) {
        console.error('[papelera] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Papelera: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>🗑 Papelera</h3><p>Función ' + 'renderPapelera' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-papelera');
    if (t) t.innerHTML = '';
  }
};
