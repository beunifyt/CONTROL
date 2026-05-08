
// Runtime de Control — se carga una sola vez para todos los módulos
let _controlLoaded = false;
async function loadControlRuntime() {
  if (_controlLoaded) return;
  _controlLoaded = true;

  // Inyectar CSS de Control
  if (!document.getElementById('control-css')) {
    const link = document.createElement('link');
    link.id = 'control-css';
    link.rel = 'stylesheet';
    link.href = 'shared/styles/control.css';
    document.head.append(link);
  }

  // Cargar scripts de Control en orden (state primero, luego utils, luego módulos)
  const scripts = [
    'core/control/state.js',
    'core/control/utils.js',
    'core/control/i18n.js',
    'core/control/firebase.js',
    'core/control/permissions.js',
    'core/control/campos.js',
    'core/control/shell.js',
    'core/control/import-export.js',
    'modules/auth/auth.control.js',
    'modules/dashboard/dashboard.control.js',
    'modules/ingresos/ingresos.control.js',
    'modules/ingresos2/ingresos2.control.js',
    'modules/flota/flota.control.js',
    'modules/conductores/conductores.control.js',
    'modules/agenda/agenda.control.js',
    'modules/vehicles/vehicles.control.js',
    'modules/events/events.control.js',
    'modules/recintos/recintos.control.js',
    'modules/users/users.control.js',
    'modules/empresas/empresas.control.js',
    'modules/mensajes/mensajes.control.js',
    'modules/auditoria/auditoria.control.js',
    'modules/papelera/papelera.control.js',
    'modules/impresion/impresion.control.js',
    'modules/ocr/ocr.control.js',
    'cam-ocr-beunifyt.js'
  ];

  for (const src of scripts) {
    try {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = res;
        s.onerror = () => res();
        document.head.append(s);
      });
    } catch (e) {}
  }
}

export { loadControlRuntime };
