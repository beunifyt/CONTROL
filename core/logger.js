/**
 * Logger centralizado.
 * En producción solo errors. En dev todo.
 * Hook futuro para enviar a Sentry/similar.
 */

import { config } from './config.js';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = config.dev ? LEVELS.debug : LEVELS.warn;

class Logger {
  constructor() {
    this.buffer = []; // últimos 200 logs en memoria para descargar como diagnóstico
    this.maxBuffer = 200;
  }

  _log(level, args) {
    if (LEVELS[level] < currentLevel) return;
    const entry = { level, ts: new Date().toISOString(), msg: args };
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) this.buffer.shift();
    const fn = console[level] || console.log;
    fn(`[${level.toUpperCase()}]`, ...args);
  }

  debug(...args) { this._log('debug', args); }
  info(...args)  { this._log('info', args); }
  warn(...args)  { this._log('warn', args); }
  error(...args) { this._log('error', args); }

  /**
   * Descarga los últimos logs como JSON para diagnóstico.
   */
  download() {
    const blob = new Blob([JSON.stringify(this.buffer, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unifyt-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const logger = new Logger();
