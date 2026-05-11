// ═══════════════════════════════════════════════════════════════
// ocr.js — Motor OCR de matrículas
//
// Motores soportados:
// - tesseract: local, sin internet, sin API key
// - gemini:    nube, requiere API key Google AI Studio (gratis)
// - ocrspace:  nube, requiere API key ocr.space
//
// El usuario configura motor + claves en Ajustes (módulo).
// Esta capa devuelve { plate, confidence, raw }.
// ═══════════════════════════════════════════════════════════════

import { logger } from './logger.js';
import { toast } from './utils.js';

const STORAGE_KEY = 'beunifyt_ocr_config';

// ── Configuración persistida ──────────────────────────────────
export function getOcrConfig(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  } catch(_){}
  return { engine: 'tesseract', geminiKey: '', ocrSpaceKey: '' };
}

export function setOcrConfig(cfg){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    logger.ok('Configuración OCR guardada', { engine: cfg.engine });
  } catch(e){
    logger.error('No se pudo guardar config OCR', { error: e.message });
  }
}

// ── Estadísticas ──────────────────────────────────────────────
function logOcrStat(success, engine, plate, confidence, durationMs){
  try{
    const key = 'beunifyt_ocr_stats';
    const stats = JSON.parse(localStorage.getItem(key) || '{"runs":0,"success":0,"engines":{}}');
    stats.runs++;
    if(success) stats.success++;
    stats.engines[engine] = (stats.engines[engine] || 0) + 1;
    stats.lastRun = { engine, plate, confidence, durationMs, success, t: Date.now() };
    localStorage.setItem(key, JSON.stringify(stats));
  } catch(_){}
}

export function getOcrStats(){
  try{
    return JSON.parse(localStorage.getItem('beunifyt_ocr_stats') || '{"runs":0,"success":0,"engines":{}}');
  } catch(_){
    return { runs: 0, success: 0, engines: {} };
  }
}

export function clearOcrStats(){
  localStorage.removeItem('beunifyt_ocr_stats');
}

// ═══════════════════════════════════════════════════════════════
// CARGA DE TESSERACT (lazy)
// ═══════════════════════════════════════════════════════════════
let _tesseract = null;
async function loadTesseract(){
  if(_tesseract) return _tesseract;
  return new Promise((resolve, reject) => {
    if(window.Tesseract){ _tesseract = window.Tesseract; resolve(_tesseract); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = () => {
      _tesseract = window.Tesseract;
      logger.ok('Tesseract cargado');
      resolve(_tesseract);
    };
    s.onerror = () => {
      logger.error('No se pudo cargar Tesseract');
      reject(new Error('No se pudo cargar Tesseract (¿sin conexión?)'));
    };
    document.head.appendChild(s);
  });
}

// ═══════════════════════════════════════════════════════════════
// POSTPROCESO — limpia y normaliza la salida OCR
// ═══════════════════════════════════════════════════════════════
function cleanPlate(text){
  if(!text) return '';
  // Quitar espacios, guiones, basura
  let s = String(text).toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Sustituciones típicas de OCR
  s = s.replace(/O/g, '0').replace(/I/g, '1'); // común confusión
  return s;
}

/**
 * Aplica heurísticas para detectar formatos de matrícula:
 * - ES nuevo: 1234ABC (4 dígitos + 3 letras consonantes)
 * - ES viejo: M-1234-AB
 * - UE genérico: 6-8 caracteres alfanuméricos
 */
function detectPlate(text){
  if(!text) return null;
  const candidates = String(text)
    .toUpperCase()
    .split(/[\s\n\-_,]+/)
    .map(s => s.replace(/[^A-Z0-9]/g, ''))
    .filter(s => s.length >= 5 && s.length <= 10);

  // Patrón ES nuevo: 4 dígitos + 3 letras
  const esNuevo = candidates.find(s => /^\d{4}[A-Z]{3}$/.test(s));
  if(esNuevo) return { plate: esNuevo, confidence: 0.95, format: 'ES-nuevo' };

  // 6-8 alfanuméricos con al menos un dígito y una letra
  const generic = candidates.find(s =>
    /[A-Z]/.test(s) && /\d/.test(s) && s.length >= 5 && s.length <= 9
  );
  if(generic) return { plate: generic, confidence: 0.7, format: 'genérico' };

  return null;
}

// ═══════════════════════════════════════════════════════════════
// MOTORES
// ═══════════════════════════════════════════════════════════════

async function recognizeTesseract(imageOrBlob){
  const T = await loadTesseract();
  const result = await T.recognize(imageOrBlob, 'eng', {
    // Reducir tiempo: solo letras y números mayúsculas
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  });
  const raw = result.data.text;
  const detected = detectPlate(raw);
  if(detected){
    return { plate: detected.plate, confidence: result.data.confidence / 100, raw, format: detected.format };
  }
  return { plate: cleanPlate(raw).slice(0, 8), confidence: result.data.confidence / 100, raw };
}

async function recognizeGemini(blob, apiKey){
  if(!apiKey) throw new Error('Falta API key de Gemini');

  // Convertir blob a base64
  const b64 = await blobToBase64(blob);
  const body = {
    contents: [{
      parts: [
        { text: 'Extrae la matrícula del vehículo en esta imagen. Responde SOLO con la matrícula limpia (letras y números, sin espacios ni guiones). Si no hay matrícula visible, responde "NONE".' },
        { inline_data: { mime_type: blob.type || 'image/jpeg', data: b64 } }
      ]
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 30 }
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if(/none/i.test(text)) return { plate: '', confidence: 0, raw: text };
  const detected = detectPlate(text) || { plate: cleanPlate(text), confidence: 0.85 };
  return { plate: detected.plate, confidence: detected.confidence, raw: text, format: detected.format };
}

async function recognizeOcrSpace(blob, apiKey){
  if(!apiKey) throw new Error('Falta API key de OCR.space');
  const fd = new FormData();
  fd.append('file', blob);
  fd.append('apikey', apiKey);
  fd.append('language', 'eng');
  fd.append('OCREngine', '2');

  const res = await fetch('https://api.ocr.space/parse/image', { method:'POST', body: fd });
  const json = await res.json();
  if(json.IsErroredOnProcessing){
    throw new Error(json.ErrorMessage?.join('; ') || 'Error OCR.space');
  }
  const text = json.ParsedResults?.[0]?.ParsedText || '';
  const detected = detectPlate(text) || { plate: cleanPlate(text).slice(0,8), confidence: 0.7 };
  return { plate: detected.plate, confidence: detected.confidence, raw: text, format: detected.format };
}

function blobToBase64(blob){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(new Error('No se pudo leer la imagen'));
    r.readAsDataURL(blob);
  });
}

// ═══════════════════════════════════════════════════════════════
// API PÚBLICA — recognize(image)
// ═══════════════════════════════════════════════════════════════
export async function recognizePlate(image){
  const cfg = getOcrConfig();
  const t0 = performance.now();
  let result = null;
  let err = null;

  try{
    if(cfg.engine === 'tesseract'){
      result = await recognizeTesseract(image);
    } else if(cfg.engine === 'gemini'){
      result = await recognizeGemini(image, cfg.geminiKey);
    } else if(cfg.engine === 'ocrspace'){
      result = await recognizeOcrSpace(image, cfg.ocrSpaceKey);
    } else {
      throw new Error(`Motor OCR desconocido: ${cfg.engine}`);
    }
  } catch(e){
    err = e;
    logger.error(`OCR ${cfg.engine} falló`, { error: e.message });
  }

  const duration = Math.round(performance.now() - t0);
  const success = !!(result && result.plate);
  logOcrStat(success, cfg.engine, result?.plate || '', result?.confidence || 0, duration);
  logger.info(`OCR ${cfg.engine}: ${success ? '✅' : '❌'} ${result?.plate || ''} (${duration}ms)`);

  if(err) throw err;
  return result;
}

// ═══════════════════════════════════════════════════════════════
// CÁMARA — captura desde la cámara del dispositivo
// ═══════════════════════════════════════════════════════════════
export async function captureFromCamera(){
  // Modal con preview de cámara
  return new Promise(async (resolve, reject) => {
    let stream = null;
    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // cámara trasera en móvil
        audio: false
      });
    } catch(e){
      logger.warn('Sin acceso a cámara', { error: e.message });
      reject(new Error('Sin acceso a cámara: ' + e.message));
      return;
    }

    const modal = document.createElement('div');
    modal.style.cssText = `
      position:fixed; inset:0; z-index:9000;
      background:rgba(0,0,0,0.9); display:flex; flex-direction:column;
      align-items:center; justify-content:center; padding:20px;
    `;
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true;
    video.style.cssText = 'max-width:100%; max-height:70vh; border-radius:12px;';
    video.srcObject = stream;
    modal.appendChild(video);

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex; gap:12px; margin-top:20px';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.className = 'btn btn-secondary';
    const captureBtn = document.createElement('button');
    captureBtn.textContent = '📸 Capturar';
    captureBtn.className = 'btn btn-primary';
    controls.appendChild(cancelBtn);
    controls.appendChild(captureBtn);
    modal.appendChild(controls);
    document.body.appendChild(modal);

    const cleanup = () => {
      stream.getTracks().forEach(t => t.stop());
      modal.remove();
    };

    cancelBtn.onclick = () => { cleanup(); reject(new Error('Cancelado')); };
    captureBtn.onclick = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob(blob => {
        cleanup();
        resolve(blob);
      }, 'image/jpeg', 0.9);
    };
  });
}

/**
 * Atajo: captura desde cámara → OCR → devuelve { plate, confidence }
 */
export async function scanPlate(){
  toast('📸 Abriendo cámara…', 'info');
  try{
    const blob = await captureFromCamera();
    toast('🔍 Reconociendo matrícula…', 'info', 3500);
    const result = await recognizePlate(blob);
    if(result?.plate){
      toast(`✅ Matrícula: ${result.plate}`, 'ok');
      return result;
    } else {
      toast('No se detectó matrícula. Reintenta con mejor enfoque.', 'warn');
      return null;
    }
  } catch(e){
    if(e.message !== 'Cancelado') toast(`Error OCR: ${e.message}`, 'err');
    return null;
  }
}
