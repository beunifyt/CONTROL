// ═══════════════════════════════════════════════════════════════
// logger.js — Sistema de logging y errores estructurado
//
// Diseño:
// - Cada log incluye: módulo, función, línea, severidad, mensaje
// - Buffer circular en memoria (últimos 200 eventos)
// - Persistencia en localStorage de los últimos 50 (sobrevive a refresh)
// - Panel visual oculto activable con Ctrl+Shift+L (o Cmd+Shift+L en Mac)
// - Captura automática de:
//     · errores JS no manejados (window.onerror)
//     · promesas rechazadas (unhandledrejection)
//     · errores de carga de recursos
// - Exportable a JSON para enviar al admin
// - Sin dependencias externas
// ═══════════════════════════════════════════════════════════════

const MAX_BUFFER = 200;
const MAX_STORAGE = 50;
const STORAGE_KEY = 'beunifyt_logs';

const SEVERITY = {
  DEBUG: { level: 0, icon: '🔍', color: '#94A3B8', label: 'DEBUG' },
  INFO:  { level: 1, icon: 'ℹ️', color: '#3B82F6', label: 'INFO'  },
  OK:    { level: 2, icon: '✅', color: '#10B981', label: 'OK'    },
  WARN:  { level: 3, icon: '⚠️', color: '#F59E0B', label: 'WARN'  },
  ERROR: { level: 4, icon: '❌', color: '#EF4444', label: 'ERROR' },
  FATAL: { level: 5, icon: '💥', color: '#991B1B', label: 'FATAL' }
};

const buffer = [];
let _panelOpen = false;
let _minLevel = 0; // muestra todo por defecto

// ── Persistencia ──────────────────────────────────────────────
function loadFromStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const items = JSON.parse(raw);
      if(Array.isArray(items)) buffer.push(...items);
    }
  } catch(_){}
}

function saveToStorage(){
  try{
    const slice = buffer.slice(-MAX_STORAGE);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slice));
  } catch(_){}
}

loadFromStorage();

// ── Extraer ubicación desde stack trace ───────────────────────
function extractLocation(stack){
  if(!stack) return { file: '?', line: '?', fn: '?' };
  const lines = stack.split('\n');
  // saltar las primeras líneas (que son del propio logger)
  for(let i = 2; i < lines.length; i++){
    const line = lines[i];
    if(!line) continue;
    // Patrón Chrome: "at funcName (https://.../file.js:123:45)"
    let m = line.match(/at\s+(\S+)\s+\((.+?):(\d+):(\d+)\)/);
    if(m){
      const file = m[2].split('/').pop().split('?')[0];
      return { file, line: m[3], fn: m[1] };
    }
    // Patrón Firefox/Safari: "funcName@https://.../file.js:123:45"
    m = line.match(/(.+?)@(.+?):(\d+):(\d+)/);
    if(m){
      const file = m[2].split('/').pop().split('?')[0];
      return { file, line: m[3], fn: m[1] || '?' };
    }
    // Patrón anónimo: "at https://.../file.js:123:45"
    m = line.match(/at\s+(.+?):(\d+):(\d+)/);
    if(m){
      const file = m[1].split('/').pop().split('?')[0];
      return { file, line: m[2], fn: '<anon>' };
    }
  }
  return { file: '?', line: '?', fn: '?' };
}

// ── Núcleo: emit log ──────────────────────────────────────────
function emit(severity, msg, extra = null){
  const sev = SEVERITY[severity] || SEVERITY.INFO;
  const loc = extractLocation(new Error().stack);
  const entry = {
    t: Date.now(),
    sev: severity,
    msg: typeof msg === 'string' ? msg : safeStringify(msg),
    file: loc.file,
    line: loc.line,
    fn: loc.fn,
    extra: extra ? safeStringify(extra) : null
  };

  buffer.push(entry);
  if(buffer.length > MAX_BUFFER) buffer.shift();

  // Persistir solo a partir de WARN (los DEBUG/INFO son ruido)
  if(sev.level >= SEVERITY.WARN.level) saveToStorage();

  // Imprimir en consola con formato
  if(sev.level >= _minLevel){
    const ctx = `[BeUnifyT][${entry.file}:${entry.line} ${entry.fn}]`;
    const css = `color:${sev.color};font-weight:600`;
    if(sev.level >= SEVERITY.ERROR.level){
      console.error(`%c${sev.icon} ${ctx}`, css, entry.msg, extra || '');
    } else if(sev.level >= SEVERITY.WARN.level){
      console.warn(`%c${sev.icon} ${ctx}`, css, entry.msg, extra || '');
    } else {
      console.log(`%c${sev.icon} ${ctx}`, css, entry.msg, extra || '');
    }
  }

  // Actualizar panel si está abierto
  if(_panelOpen) refreshPanel();

  return entry;
}

function safeStringify(v){
  if(v == null) return String(v);
  if(typeof v === 'string') return v;
  if(v instanceof Error) return `${v.name}: ${v.message}${v.stack ? '\n' + v.stack.split('\n').slice(0,3).join('\n') : ''}`;
  try{ return JSON.stringify(v); } catch(_){ return String(v); }
}

// ── API pública ───────────────────────────────────────────────
export const logger = {
  debug: (msg, extra) => emit('DEBUG', msg, extra),
  info:  (msg, extra) => emit('INFO',  msg, extra),
  ok:    (msg, extra) => emit('OK',    msg, extra),
  warn:  (msg, extra) => emit('WARN',  msg, extra),
  error: (msg, extra) => emit('ERROR', msg, extra),
  fatal: (msg, extra) => emit('FATAL', msg, extra),

  // Wrapper para funciones críticas: captura cualquier error
  // y lo loguea con contexto del módulo
  wrap(moduleName, fnName, fn){
    return async function(...args){
      try{
        return await fn.apply(this, args);
      } catch(e){
        emit('ERROR', `${moduleName}.${fnName} falló: ${e.message}`, {
          args: args.map(a => safeStringify(a)).join(', '),
          stack: e.stack
        });
        throw e;
      }
    };
  },

  // Acceso a logs almacenados
  getLogs: () => [...buffer],
  clear: () => {
    buffer.length = 0;
    try{ localStorage.removeItem(STORAGE_KEY); } catch(_){}
  },
  setMinLevel: (level) => { _minLevel = SEVERITY[level]?.level ?? 0; },

  // Exportar para enviar al admin
  export: () => {
    const data = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: location.href,
      logs: buffer
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beunifyt-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// ── Captura automática de errores globales ────────────────────
window.addEventListener('error', (e) => {
  // Error de recurso (img, script, etc.)
  if(e.target && e.target !== window){
    emit('ERROR', `Recurso no cargó: ${e.target.src || e.target.href || 'desconocido'}`, {
      tag: e.target.tagName
    });
    return;
  }
  // Error JS
  const file = (e.filename || '?').split('/').pop();
  emit('FATAL', `Error JS no manejado: ${e.message}`, {
    file, line: e.lineno, col: e.colno,
    stack: e.error?.stack
  });
}, true);

window.addEventListener('unhandledrejection', (e) => {
  emit('ERROR', `Promesa rechazada sin catch: ${e.reason?.message || e.reason}`, {
    stack: e.reason?.stack
  });
});

// ── Panel visual (Ctrl+Shift+L) ───────────────────────────────
document.addEventListener('keydown', (e) => {
  const trigger = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l');
  if(trigger){
    e.preventDefault();
    togglePanel();
  }
});

function togglePanel(){
  if(_panelOpen) closePanel();
  else openPanel();
}

function openPanel(){
  let panel = document.getElementById('__bu_log_panel');
  if(panel){ panel.remove(); }
  panel = document.createElement('div');
  panel.id = '__bu_log_panel';
  panel.style.cssText = `
    position:fixed; bottom:0; left:0; right:0; height:50vh;
    background:#0F1729; color:#E2E8F0;
    border-top:2px solid #2563EB;
    z-index:99999; display:flex; flex-direction:column;
    font-family:ui-monospace,Menlo,Consolas,monospace; font-size:12px;
    box-shadow:0 -10px 40px rgba(0,0,0,0.4);
  `;
  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#1E293B;border-bottom:1px solid #334155;flex-shrink:0">
      <strong style="color:#fff">📋 BeUnifyT Logs</strong>
      <span id="__bu_log_count" style="color:#94A3B8;font-size:11px"></span>
      <div style="flex:1"></div>
      <select id="__bu_log_filter" style="background:#0F1729;color:#fff;border:1px solid #334155;border-radius:4px;padding:3px 6px;font-size:11px;font-family:inherit">
        <option value="0">Todo</option>
        <option value="1">INFO+</option>
        <option value="2">OK+</option>
        <option value="3">WARN+</option>
        <option value="4">ERROR+</option>
      </select>
      <button id="__bu_log_export" style="background:#2563EB;color:#fff;border:0;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-family:inherit">💾 Exportar</button>
      <button id="__bu_log_clear" style="background:transparent;color:#94A3B8;border:1px solid #334155;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-family:inherit">Limpiar</button>
      <button id="__bu_log_close" style="background:transparent;color:#fff;border:0;padding:4px 8px;cursor:pointer;font-size:18px;line-height:1">×</button>
    </div>
    <div id="__bu_log_body" style="flex:1;overflow-y:auto;padding:8px 12px"></div>
    <div style="padding:6px 12px;background:#1E293B;border-top:1px solid #334155;font-size:10px;color:#64748B">
      Ctrl/Cmd + Shift + L para abrir/cerrar
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('#__bu_log_close').onclick = closePanel;
  panel.querySelector('#__bu_log_clear').onclick = () => { logger.clear(); refreshPanel(); };
  panel.querySelector('#__bu_log_export').onclick = () => logger.export();
  panel.querySelector('#__bu_log_filter').onchange = (e) => {
    panel.dataset.filter = e.target.value;
    refreshPanel();
  };

  _panelOpen = true;
  refreshPanel();
}

function closePanel(){
  const p = document.getElementById('__bu_log_panel');
  if(p) p.remove();
  _panelOpen = false;
}

function refreshPanel(){
  const panel = document.getElementById('__bu_log_panel');
  if(!panel) return;
  const body = panel.querySelector('#__bu_log_body');
  const counter = panel.querySelector('#__bu_log_count');
  const filter = Number(panel.dataset.filter || 0);

  const filtered = buffer.filter(e => (SEVERITY[e.sev]?.level || 0) >= filter);
  counter.textContent = `${filtered.length} entradas` + (filtered.length !== buffer.length ? ` (de ${buffer.length})` : '');

  body.innerHTML = '';
  // Mostrar las más recientes primero
  for(let i = filtered.length - 1; i >= 0; i--){
    const e = filtered[i];
    const sev = SEVERITY[e.sev] || SEVERITY.INFO;
    const time = new Date(e.t).toTimeString().slice(0,8);
    const row = document.createElement('div');
    row.style.cssText = `padding:4px 0; border-bottom:1px solid #1E293B; display:flex; gap:8px; align-items:flex-start`;
    row.innerHTML = `
      <span style="color:#64748B;flex-shrink:0">${time}</span>
      <span style="color:${sev.color};font-weight:600;min-width:50px;flex-shrink:0">${sev.icon} ${sev.label}</span>
      <span style="color:#94A3B8;flex-shrink:0">[${escapeHtml(e.file)}:${e.line} ${escapeHtml(e.fn)}]</span>
      <span style="flex:1;color:#E2E8F0;word-break:break-word">${escapeHtml(e.msg)}</span>
    `;
    if(e.extra){
      const det = document.createElement('details');
      det.style.cssText = 'margin-left:auto;color:#64748B;cursor:pointer';
      det.innerHTML = `<summary style="cursor:pointer">+</summary><pre style="margin:4px 0;color:#94A3B8;font-size:11px;white-space:pre-wrap">${escapeHtml(e.extra)}</pre>`;
      row.appendChild(det);
    }
    body.appendChild(row);
  }
}

function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// ── Exposición global para depurar desde consola ──────────────
window.__beunifyt_logger = logger;

// Marcar arranque
logger.info('Sistema de logging iniciado', { url: location.href });
