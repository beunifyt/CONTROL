/**
 * UnifyT — Bootstrap único
 * Carga el core, los servicios, autentica y arranca el router.
 */

import { config } from './config.js';
import { eventBus } from './event-bus.js';
import { state } from './state.js';
import { router } from './router.js';
import { moduleLoader } from './module-loader.js';
import { initFirebase } from '../services/firebase.js';
import { authService } from '../services/auth.service.js';
import { i18n } from '../services/i18n.service.js';
import { logger } from './logger.js';

class App {
  async start() {
    try {
      logger.info('🚀 Booting UnifyT...');

      // 1. Validar config
      if (!config.firebase.apiKey || config.firebase.apiKey.startsWith('TU_')) {
        return this.showConfigError();
      }

      // 2. Cargar idioma
      await i18n.init(state.get('user.lang') || 'es');

      // 3. Inicializar Firebase
      await initFirebase(config.firebase);
      logger.info('✓ Firebase ready');

      // 4. Esperar al estado de autenticación
      const user = await authService.waitForAuth();
      logger.info('✓ Auth resolved:', user ? user.email : 'guest');

      // 5. Cargar tema guardado
      const theme = state.get('user.theme') || 'dark';
      document.body.dataset.theme = theme;

      // 6. Si no hay usuario, módulo auth
      if (!user) {
        await moduleLoader.load('auth');
        await router.init();
        return this.hideSplash();
      }

      // 7. Cargar perfil + permisos
      await authService.loadProfile();

      // 8. Registrar todos los módulos según permisos
      await moduleLoader.loadEnabled();

      // 9. Arrancar router
      await router.init();

      this.hideSplash();
      logger.info('✅ UnifyT ready');
    } catch (err) {
      logger.error('Boot failed', err);
      this.showError(err);
    }
  }

  hideSplash() {
    document.getElementById('splash')?.remove();
    document.getElementById('app')?.removeAttribute('hidden');
  }

  showConfigError() {
    document.getElementById('splash').innerHTML = `
      <div class="splash-error">
        <h2>⚙️ Configuración pendiente</h2>
        <p>Edita <code>core/config.js</code> con tus credenciales de Firebase y Cloudinary.</p>
        <p>Lee el README para los pasos completos.</p>
      </div>
    `;
  }

  showError(err) {
    document.getElementById('splash').innerHTML = `
      <div class="splash-error">
        <h2>❌ Error al iniciar</h2>
        <pre>${err.message}</pre>
      </div>
    `;
  }
}

// Bootstrap
new App().start();

// Exponer para debug en consola (solo en dev)
if (config.dev) {
  window.__unifyt = { eventBus, state, router, moduleLoader, authService };
}
