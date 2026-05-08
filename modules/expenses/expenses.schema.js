/**
 * Schema de Gastos.
 * Validación al crear/editar.
 */

export const expenseSchema = {
  date:        { type: 'date', required: true },
  proveedor:   { type: 'string', required: true, minLength: 2 },
  nif:         { type: 'string' },
  concepto:    { type: 'string', required: true, minLength: 3 },
  categoria:   { type: 'string', required: true,
                 enum: ['Combustible', 'Restauración', 'Alojamiento', 'Material',
                        'Suministros', 'Servicios profesionales', 'Transporte', 'Otros'] },
  base:        { type: 'number', required: true, min: 0 },
  ivaRate:     { type: 'number', enum: [0, 4, 10, 21] },
  ivaAmount:   { type: 'number', min: 0 },
  irpfRate:    { type: 'number', min: 0, max: 50 },
  irpfAmount:  { type: 'number', min: 0 },
  total:       { type: 'number', required: true, min: 0 },
  formaPago:   { type: 'string', enum: ['Efectivo', 'Tarjeta', 'Transferencia', 'Bizum', 'Otro'] },
  status:      { type: 'string', enum: ['pending', 'approved', 'rejected'] },
  esAbono:     { type: 'boolean' },
  recargoEquivalencia: { type: 'number', min: 0 },
  matricula:   { type: 'string' },
  km:          { type: 'number', min: 0 },
  fotos:       { type: 'array' },
  tags:        { type: 'array' },
  notas:       { type: 'string' }
};

export const CATEGORIAS = expenseSchema.categoria.enum;
export const IVA_RATES = expenseSchema.ivaRate.enum;
export const FORMAS_PAGO = expenseSchema.formaPago.enum;
