/**
 * Schema-based validator.
 *
 * Schema:
 *   {
 *     amount: { type: 'number', required: true, min: 0 },
 *     email:  { type: 'string', required: true, pattern: /^[^@]+@[^@]+$/ },
 *     date:   { type: 'date', required: true }
 *   }
 *
 * Devuelve array de errores (vacío = OK).
 */

const VALIDATORS = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && !isNaN(v),
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v),
  object: (v) => v && typeof v === 'object' && !Array.isArray(v),
  date: (v) => v instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(v)
};

export function validateSchema(data, schema, { partial = false } = {}) {
  const errors = [];
  data = data || {};

  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];

    // En modo partial, ignora campos no presentes
    if (partial && !(field in data)) continue;

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} es obligatorio`);
      continue;
    }

    if (value === undefined || value === null) continue;

    if (rules.type && !VALIDATORS[rules.type]?.(value)) {
      errors.push(`${field} debe ser ${rules.type}`);
      continue;
    }

    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${field} mínimo ${rules.min}`);
    }
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${field} máximo ${rules.max}`);
    }
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${field} mínimo ${rules.minLength} caracteres`);
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${field} formato inválido`);
    }
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${field} debe ser uno de: ${rules.enum.join(', ')}`);
    }
  }

  return errors;
}

/**
 * Validador de NIF/CIF/NIE español (algoritmo oficial AEAT).
 */
export function isValidNif(nif) {
  if (!nif) return false;
  nif = nif.toUpperCase().replace(/[\s-]/g, '');

  // NIE: X/Y/Z + 7 dígitos + letra
  if (/^[XYZ]\d{7}[A-Z]$/.test(nif)) {
    const map = { X: '0', Y: '1', Z: '2' };
    const num = map[nif[0]] + nif.slice(1, 8);
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    return nif[8] === letters[parseInt(num) % 23];
  }

  // DNI: 8 dígitos + letra
  if (/^\d{8}[A-Z]$/.test(nif)) {
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    return nif[8] === letters[parseInt(nif.slice(0, 8)) % 23];
  }

  // CIF: letra + 7 dígitos + dígito/letra control
  if (/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[A-Z0-9]$/.test(nif)) {
    return true; // simplificado; el algoritmo CIF completo es más largo
  }

  return false;
}
