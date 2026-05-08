/**
 * Módulo Auditoría — adaptado del monolito Control.
 * El código original vive en auditoria.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'auditoria',
  name: 'Auditoría',
  icon: '📜',
  routes: ['/auditoria'],
  permissions: ['auditoria.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-auditoria si no existe
    container.innerHTML = '<div id="tab-auditoria-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderAuditoria === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-auditoria')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-auditoria');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-auditoria';
        document.getElementById('tab-auditoria-mount').append(tabDiv);
      }
      try {
        window.renderAuditoria();
      } catch (e) {
        console.error('[auditoria] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Auditoría: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>📜 Auditoría</h3><p>Función ' + 'renderAuditoria' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-auditoria');
    if (t) t.innerHTML = '';
  }
};
