/**
 * Módulo Impresión — adaptado del monolito Control.
 * El código original vive en impresion.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'impresion',
  name: 'Impresión',
  icon: '🖨',
  routes: ['/impresion'],
  permissions: ['impresion.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-impresion si no existe
    container.innerHTML = '<div id="tab-impresion-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderImpresion === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-impresion')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-impresion');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-impresion';
        document.getElementById('tab-impresion-mount').append(tabDiv);
      }
      try {
        window.renderImpresion();
      } catch (e) {
        console.error('[impresion] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Impresión: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>🖨 Impresión</h3><p>Función ' + 'renderImpresion' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-impresion');
    if (t) t.innerHTML = '';
  }
};
