/**
 * Módulo Mensajes — adaptado del monolito Control.
 * El código original vive en mensajes.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'mensajes',
  name: 'Mensajes',
  icon: '💬',
  routes: ['/mensajes'],
  permissions: ['mensajes.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-mensajes si no existe
    container.innerHTML = '<div id="tab-mensajes-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderMensajesTab === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-mensajes')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-mensajes');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-mensajes';
        document.getElementById('tab-mensajes-mount').append(tabDiv);
      }
      try {
        window.renderMensajesTab();
      } catch (e) {
        console.error('[mensajes] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Mensajes: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>💬 Mensajes</h3><p>Función ' + 'renderMensajesTab' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-mensajes');
    if (t) t.innerHTML = '';
  }
};
