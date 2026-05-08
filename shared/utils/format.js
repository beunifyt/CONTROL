/**
 * Helpers de formato.
 * Locale por defecto: es-ES, EUR.
 */

import { config } from '../../core/config.js';

const locale = config.app.locale;
const currency = config.app.currency;

export const fmt = {
  /**
   * Formatea cantidad como moneda.
   *   fmt.money(1234.5) → "1.234,50 €"
   */
  money(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  },

  /**
   * Número con N decimales.
   */
  number(n, decimals = 2) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  },

  /**
   * Porcentaje.
   */
  percent(n, decimals = 1) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(n);
  },

  /**
   * Fecha corta: 08/05/2026
   */
  date(d) {
    if (!d) return '—';
    const date = d.toDate ? d.toDate() : new Date(d);
    if (isNaN(date)) return '—';
    return new Intl.DateTimeFormat(locale).format(date);
  },

  /**
   * Fecha y hora: 08/05/2026 14:30
   */
  datetime(d) {
    if (!d) return '—';
    const date = d.toDate ? d.toDate() : new Date(d);
    if (isNaN(date)) return '—';
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  },

  /**
   * Tiempo relativo: "hace 3 horas"
   */
  relative(d) {
    if (!d) return '—';
    const date = d.toDate ? d.toDate() : new Date(d);
    const diff = (date - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const units = [
      [60, 'second'],
      [3600, 'minute'],
      [86400, 'hour'],
      [604800, 'day'],
      [2592000, 'week'],
      [31536000, 'month']
    ];
    for (const [secs, unit] of units) {
      if (Math.abs(diff) < secs) return rtf.format(Math.round(diff / (secs / 60 || 1)), unit);
    }
    return rtf.format(Math.round(diff / 31536000), 'year');
  },

  /**
   * Iniciales para avatar: "Carlos Reyes" → "CR"
   */
  initials(name) {
    if (!name) return '?';
    return name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  },

  /**
   * Color estable a partir de un string (avatares).
   */
  colorFromString(str) {
    if (!str) return '#888';
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 60%, 50%)`;
  },

  /**
   * Trunca texto.
   */
  truncate(s, n = 50) {
    if (!s) return '';
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
};
