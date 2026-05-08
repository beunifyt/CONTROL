/**
 * i18n Service.
 * Carga lazy de paquetes de idioma desde /assets/langs/{lang}.json
 *
 * Uso:
 *   t('expense.create.title')
 *   t('expense.amount.label', { count: 3 })
 */

import { state } from '../core/state.js';
import { eventBus } from '../core/event-bus.js';
import { logger } from '../core/logger.js';

class I18n {
  constructor() {
    this.lang = 'es';
    this.translations = {};
    this.fallbackTranslations = {};
  }

  async init(lang = 'es') {
    await this.load('es'); // siempre como fallback
    this.fallbackTranslations = { ...this.translations };
    if (lang !== 'es') await this.load(lang);
    this.lang = lang;
  }

  async load(lang) {
    try {
      const res = await fetch(`assets/langs/${lang}.json`);
      this.translations = await res.json();
      this.lang = lang;
      state.set('user.lang', lang);
      eventBus.emit('i18n:changed', { lang });
    } catch (err) {
      logger.warn(`[i18n] No se pudo cargar ${lang}, fallback a es`);
    }
  }

  /**
   * Traduce una clave. Soporta interpolación: t('foo', { name: 'Pepe' })
   */
  t(key, vars = {}) {
    const val = this.getNested(this.translations, key)
            || this.getNested(this.fallbackTranslations, key)
            || key;
    return Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replace(new RegExp(`{${k}}`, 'g'), v),
      val
    );
  }

  getNested(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }
}

export const i18n = new I18n();
export const t = (key, vars) => i18n.t(key, vars);
