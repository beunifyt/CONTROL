// router.js — router minimalista basado en hash + lazy load
import { canSeeModule } from './roles.js';
import { getCurrentProfile } from './auth.js';
import { unregisterListenersByPrefix } from './db.js';
import { $, clear, log, logErr, logger } from './utils.js';

const ROUTES = {
  dashboard:   () => import('./modules/dashboard.js'),
  recintos:    () => import('./modules/recintos.js'),
  eventos:     () => import('./modules/eventos.js'),
  referencias: () => import('./modules/referencias.js'),
  ingresos:    () => import('./modules/ingresos.js'),
  agenda:      () => import('./modules/agenda.js'),
  conductores: () => import('./modules/conductores.js'),
  empresas:    () => import('./modules/empresas.js'),
  flota:       () => import('./modules/flota.js'),
  analytics:   () => import('./modules/analytics.js'),
  mensajes:    () => import('./modules/mensajes.js'),
  impresion:   () => import('./modules/impresion.js'),
  usuarios:    () => import('./modules/usuarios.js'),
  papelera:    () => import('./modules/papelera.js')
};

let _currentModule = null;
let _currentName = null;

export function navigate(name){
  location.hash = '#/' + name;
}

function parseHash(){
  const m = location.hash.match(/^#\/(\w+)/);
  return m ? m[1] : 'dashboard';
}

async function mountRoute(){
  const profile = getCurrentProfile();
  if(!profile){ return; }

  let name = parseHash();
  if(!ROUTES[name]) name = 'dashboard';

  if(!canSeeModule(profile, name)){
    if(name !== 'dashboard'){ navigate('dashboard'); return; }
  }

  if(_currentModule && typeof _currentModule.destroy === 'function'){
    try{ _currentModule.destroy(); } catch(e){ logErr('destroy', e); }
  }
  if(_currentName){
    unregisterListenersByPrefix(`mod:${_currentName}:`);
  }

  const container = $('#page');
  clear(container);

  document.querySelectorAll('.sb-item').forEach(b => {
    b.classList.toggle('active', b.dataset.route === name);
  });

  try{
    const mod = await ROUTES[name]();
    _currentModule = mod;
    _currentName = name;
    if(typeof mod.init === 'function'){
      await mod.init(container, { profile });
    }
  } catch(e){
    logger.error(`No se pudo cargar el módulo "${name}"`, {
      module: name,
      error: e.message,
      stack: e.stack
    });
    clear(container);
    const empty = document.createElement('div');
    empty.className = 'empty';
    const title = document.createElement('div');
    title.className = 'empty-title';
    title.textContent = `Error cargando módulo: ${name}`;
    const msg = document.createElement('div');
    msg.className = 'empty-msg';
    msg.textContent = (e.message || 'Error desconocido') + ' · Pulsa Ctrl+Shift+L para ver detalles';
    empty.appendChild(title);
    empty.appendChild(msg);
    container.appendChild(empty);
  }

  document.getElementById('app')?.classList.remove('sb-open');
}

window.addEventListener('hashchange', mountRoute);

export function startRouter(){
  if(!location.hash) location.hash = '#/dashboard';
  else mountRoute();
}

window.beunifyt = window.beunifyt || {};
window.beunifyt.navigate = navigate;
