/**
 * Cálculos fiscales españoles.
 * IVA, IRPF, recargo de equivalencia, kilometraje.
 *
 * Centralizar aquí evita inconsistencias entre módulos.
 */

import { config } from '../../core/config.js';

export const tax = {
  /**
   * Calcula desglose desde base e IVA%.
   *   { base: 100, ivaRate: 21 } → { base: 100, ivaAmount: 21, total: 121 }
   */
  fromBase(base, ivaRate) {
    base = Number(base) || 0;
    const ivaAmount = +(base * ivaRate / 100).toFixed(2);
    const total = +(base + ivaAmount).toFixed(2);
    return { base, ivaRate, ivaAmount, total };
  },

  /**
   * Calcula desglose desde el total y el IVA%.
   *   { total: 121, ivaRate: 21 } → { base: 100, ivaAmount: 21, total: 121 }
   */
  fromTotal(total, ivaRate) {
    total = Number(total) || 0;
    const base = +(total / (1 + ivaRate / 100)).toFixed(2);
    const ivaAmount = +(total - base).toFixed(2);
    return { base, ivaRate, ivaAmount, total };
  },

  /**
   * IRPF: aplica retención sobre la base.
   */
  withIrpf({ base, ivaRate, irpfRate }) {
    const ivaAmount = +(base * ivaRate / 100).toFixed(2);
    const irpfAmount = +(base * irpfRate / 100).toFixed(2);
    const total = +(base + ivaAmount - irpfAmount).toFixed(2);
    return { base, ivaRate, ivaAmount, irpfRate, irpfAmount, total };
  },

  /**
   * Recargo de equivalencia (autónomos minoristas).
   * 0.5% para 4% IVA, 1.4% para 10%, 5.2% para 21%.
   */
  recargoEquivalencia(ivaRate) {
    const map = { 4: 0.5, 10: 1.4, 21: 5.2 };
    return map[ivaRate] || 0;
  },

  /**
   * Kilometraje. Por defecto 0,26 €/km (RD 2023).
   */
  kilometraje(km, rate = config.tax.kmRate) {
    return +(km * rate).toFixed(2);
  },

  /**
   * Validación de coherencia: base + iva - irpf = total.
   * Tolerancia ±0,02 € (errores de redondeo).
   */
  isCoherent({ base, ivaAmount, irpfAmount = 0, total }, tolerance = 0.02) {
    const expected = base + ivaAmount - irpfAmount;
    return Math.abs(expected - total) <= tolerance;
  },

  /**
   * Genera el desglose para el modelo 303 trimestral.
   * gastos: array de gastos con { base, ivaRate, ivaAmount, claveOperacion }
   */
  generate303(gastos) {
    const breakdown = { 4: { base: 0, iva: 0 }, 10: { base: 0, iva: 0 }, 21: { base: 0, iva: 0 } };

    gastos.forEach((g) => {
      if (breakdown[g.ivaRate]) {
        breakdown[g.ivaRate].base += g.base || 0;
        breakdown[g.ivaRate].iva  += g.ivaAmount || 0;
      }
    });

    const totalBase = Object.values(breakdown).reduce((s, b) => s + b.base, 0);
    const totalIva  = Object.values(breakdown).reduce((s, b) => s + b.iva, 0);

    return {
      breakdown,
      totalBase: +totalBase.toFixed(2),
      totalIva:  +totalIva.toFixed(2),
      total:     +(totalBase + totalIva).toFixed(2)
    };
  },

  /**
   * Sugiere IRPF según tipo de NIF y categoría.
   */
  suggestIrpf({ nif, categoria, esNuevoAutonomo }) {
    if (!nif || categoria !== 'Servicios profesionales') return 0;
    // Personas físicas (DNI/NIE) → aplica IRPF
    const isPersonaFisica = /^[XYZ]?\d{7,8}[A-Z]$/.test(nif.toUpperCase());
    if (!isPersonaFisica) return 0;
    return esNuevoAutonomo ? config.tax.irpfRates.newAutonomo : config.tax.irpfRates.general;
  }
};
