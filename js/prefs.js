// ═══════════════════════════════════════════════════════════════
// prefs.js — Preferencias de usuario persistidas en localStorage
//
// Cubre:
// - Evento favorito (Bloque D)
// - Configuración de columnas por módulo (Bloque E)
// - Filtros guardados por usuario (Bloque E)
// - Tema visual (Bloque E)
// - Idioma (Bloque E)
// - Pestañas reordenadas (Bloque E)
//
// Datos por uid → cada usuario tiene sus propias preferencias
// en el mismo navegador. Si se loguea en otro, son nuevas.
// ═══════════════════════════════════════════════════════════════

import { logger } from './logger.js';

const PREFIX = 'beunifyt_prefs_';

function key(uid){ return PREFIX + (uid || 'anon'); }

function load(uid){
  try{
    const raw = localStorage.getItem(key(uid));
    return raw ? JSON.parse(raw) : {};
  } catch(_){ return {}; }
}

function save(uid, data){
  try{
    localStorage.setItem(key(uid), JSON.stringify(data));
  } catch(e){
    logger.warn('No se pudieron guardar prefs', { error: e.message });
  }
}

// ── Generic getter/setter ─────────────────────────────────────
export function getPref(uid, path, defaultValue = null){
  const data = load(uid);
  const parts = path.split('.');
  let cur = data;
  for(const p of parts){
    if(cur == null) return defaultValue;
    cur = cur[p];
  }
  return cur ?? defaultValue;
}

export function setPref(uid, path, value){
  const data = load(uid);
  const parts = path.split('.');
  let cur = data;
  for(let i = 0; i < parts.length - 1; i++){
    if(!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
  save(uid, data);
  document.dispatchEvent(new CustomEvent('prefs-changed', { detail: { path, value } }));
}

// ── Atajos típicos ────────────────────────────────────────────
export const Prefs = {
  // Evento favorito
  getFavEvent: (uid) => getPref(uid, 'favEventId', null),
  setFavEvent: (uid, id) => setPref(uid, 'favEventId', id),

  // Tema
  getTheme: (uid) => getPref(uid, 'theme', 'light'),
  setTheme: (uid, theme) => { setPref(uid, 'theme', theme); applyTheme(theme); },

  // Columnas de un módulo
  getColumns: (uid, modulo) => getPref(uid, `cols.${modulo}`, null),
  setColumns: (uid, modulo, cols) => setPref(uid, `cols.${modulo}`, cols),

  // Filtros guardados
  getFilters: (uid, modulo) => getPref(uid, `filters.${modulo}`, []),
  setFilters: (uid, modulo, filters) => setPref(uid, `filters.${modulo}`, filters),
  addFilter: (uid, modulo, filter) => {
    const list = Prefs.getFilters(uid, modulo);
    list.push({ id: Date.now().toString(36), ...filter });
    Prefs.setFilters(uid, modulo, list);
  },
  removeFilter: (uid, modulo, filterId) => {
    const list = Prefs.getFilters(uid, modulo).filter(f => f.id !== filterId);
    Prefs.setFilters(uid, modulo, list);
  },

  // Orden de módulos en sidebar
  getSidebarOrder: (uid) => getPref(uid, 'sidebarOrder', null),
  setSidebarOrder: (uid, order) => setPref(uid, 'sidebarOrder', order),
};

// ── Temas (Bloque E) ──────────────────────────────────────────
export function applyTheme(theme){
  document.body.dataset.theme = theme || 'light';
  logger.info(`Tema aplicado: ${theme}`);
}

// Aplicar tema al arrancar (antes de que cargue el usuario)
const startupTheme = (() => {
  // Buscar el primer pref guardado
  for(const k of Object.keys(localStorage)){
    if(k.startsWith(PREFIX)){
      try{
        const d = JSON.parse(localStorage.getItem(k));
        if(d.theme) return d.theme;
      } catch(_){}
    }
  }
  return 'light';
})();
applyTheme(startupTheme);
