/**
 * Módulo OCR — adaptado del monolito Control.
 * El código original vive en ocr.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'ocr',
  name: 'OCR',
  icon: '📷',
  routes: ['/ocr'],
  permissions: ['ocr.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-ocr si no existe
    container.innerHTML = '<div id="tab-ocr-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.openCamModal === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-ocr')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-ocr');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-ocr';
        document.getElementById('tab-ocr-mount').append(tabDiv);
      }
      try {
        window.openCamModal();
      } catch (e) {
        console.error('[ocr] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar OCR: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>📷 OCR</h3><p>Función ' + 'openCamModal' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-ocr');
    if (t) t.innerHTML = '';
  }
};
