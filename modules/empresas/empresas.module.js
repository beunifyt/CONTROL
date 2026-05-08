/**
 * Módulo Empresas — adaptado del monolito Control.
 * El código original vive en empresas.control.js y se carga via runtime.
 */

import { loadControlRuntime } from '../../core/control-runtime.js';

export default {
  id: 'empresas',
  name: 'Empresas',
  icon: '🏢',
  routes: ['/empresas'],
  permissions: ['empresas.view'],

  async init(params, container) {
    // Cargar runtime de Control (idempotente)
    await loadControlRuntime();

    // Limpiar contenedor y montar el div tab-empresas si no existe
    container.innerHTML = '<div id="tab-empresas-mount"></div>';

    // Llamar al render original de Control
    if (typeof window.renderEmpresasTab === 'function') {
      // Algunos render() escriben directamente en document.getElementById('tab-empresas')
      // Aseguramos que ese div exista
      let tabDiv = document.getElementById('tab-empresas');
      if (!tabDiv) {
        tabDiv = document.createElement('div');
        tabDiv.id = 'tab-empresas';
        document.getElementById('tab-empresas-mount').append(tabDiv);
      }
      try {
        window.renderEmpresasTab();
      } catch (e) {
        console.error('[empresas] render falló:', e);
        container.innerHTML = '<div class="error-panel">Error al renderizar Empresas: ' + e.message + '</div>';
      }
    } else {
      container.innerHTML = '<div class="empty-state"><h3>🏢 Empresas</h3><p>Función ' + 'renderEmpresasTab' + '() no disponible aún. Verifica que el runtime de Control se haya cargado.</p></div>';
    }
  },

  destroy() {
    const t = document.getElementById('tab-empresas');
    if (t) t.innerHTML = '';
  }
};
