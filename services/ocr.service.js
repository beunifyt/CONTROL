/**
 * OCR Service.
 * Dispatcher: delega al motor configurado (Tesseract / Gemini / OCR.space).
 *
 * Cada motor implementa: async recognize(file) => { text, confidence, fields }
 * Añadir motor nuevo = crear archivo + registrarlo abajo.
 */

import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

class OcrService {
  constructor() {
    this.engines = new Map();
    this.cache = new Map(); // hash -> result
  }

  register(name, engine) {
    this.engines.set(name, engine);
  }

  async recognize(file, engineName = config.ocr.defaultEngine) {
    // Cache por hash del archivo
    const hash = await this._hashFile(file);
    if (this.cache.has(hash)) {
      logger.debug('[ocr] cache hit');
      return this.cache.get(hash);
    }

    const engine = this.engines.get(engineName);
    if (!engine) throw new Error(`OCR engine "${engineName}" no registrado`);

    logger.info(`[ocr] running ${engineName}`);
    const result = await engine.recognize(file);
    this.cache.set(hash, result);
    return result;
  }

  async _hashFile(file) {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

export const ocr = new OcrService();

// === Motor Tesseract (lazy) ===
ocr.register('tesseract', {
  async recognize(file) {
    const Tesseract = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5/+esm');
    const { data } = await Tesseract.recognize(file, 'spa+eng');
    return {
      text: data.text,
      confidence: data.confidence / 100,
      fields: parseSpanishReceipt(data.text)
    };
  }
});

// === Motor Gemini (si hay API key) ===
ocr.register('gemini', {
  async recognize(file) {
    if (!config.ocr.geminiKey) throw new Error('Gemini API key no configurada');

    const base64 = await fileToBase64(file);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.ocr.geminiKey}`;
    const body = {
      contents: [{
        parts: [
          { text: 'Extrae de este recibo en JSON: nif, total, base, iva, irpf, fecha (YYYY-MM-DD), proveedor, concepto, ivaRate (4/10/21). Solo JSON, sin texto.' },
          { inline_data: { mime_type: file.type, data: base64 } }
        ]
      }]
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleaned = text.replace(/```json|```/g, '').trim();
    let fields = {};
    try { fields = JSON.parse(cleaned); } catch (e) { logger.warn('Gemini JSON parse failed'); }
    return { text: cleaned, confidence: 0.9, fields };
  }
});

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Parser básico de tickets españoles desde texto plano.
 * Detecta NIF, total, IVA, fecha.
 */
function parseSpanishReceipt(text) {
  const fields = {};

  // NIF: A12345678, 12345678X, X1234567Y
  const nifMatch = text.match(/\b([A-Z]?\d{7,8}[A-Z]?)\b/);
  if (nifMatch) fields.nif = nifMatch[1].toUpperCase();

  // Total: "TOTAL 14,94€" o "TOTAL: 14.94"
  const totalMatch = text.match(/total[\s:]*([0-9]+[.,][0-9]{2})/i);
  if (totalMatch) fields.total = parseFloat(totalMatch[1].replace(',', '.'));

  // IVA: "IVA 21%" o "I.V.A. 10%"
  const ivaMatch = text.match(/I\.?V\.?A\.?\s*\(?(\d{1,2})\s*%/i);
  if (ivaMatch) fields.ivaRate = parseInt(ivaMatch[1]);

  // Fecha: dd/mm/yyyy o yyyy-mm-dd
  const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dateMatch) {
    const [_, d, m, y] = dateMatch;
    const year = y.length === 2 ? '20' + y : y;
    fields.fecha = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return fields;
}
