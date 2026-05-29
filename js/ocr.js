// ═══════════════════════════════════════════════════════════════
// ocr.js — Motor OCR de matrículas (v2: tiempo real + preprocesado)
//
// Mejoras v2:
// - Preprocesado de imagen (grises + contraste + binarización + upscale)
// - Escaneo en tiempo real con recuadro guía y recorte ROI
// - Consenso multi-frame (voting) → auto-captura por acuerdo
// - cleanPlate POSICIONAL no destructivo (corrige O↔0 por posición)
// - Confianza real (Tesseract + match de formato + consenso)
//
// Motores: tesseract (local), gemini (nube), ocrspace (nube)
// API pública estable: recognizePlate, scanPlate, captureFromCamera,
//   getOcrConfig, setOcrConfig, getOcrStats, clearOcrStats
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
  return { engine: 'tesseract', geminiKey: '', ocrSpaceKey: '', realtime: true };
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
let _worker = null;
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

// Worker reutilizable (mucho más rápido en escaneo continuo que recognize() suelto)
async function getWorker(){
  if(_worker) return _worker;
  const T = await loadTesseract();
  _worker = await T.createWorker('eng', 1, { logger: () => {} });
  await _worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    tessedit_pageseg_mode: '7' // PSM 7: tratar como una sola línea de texto
  });
  return _worker;
}

export async function terminateWorker(){
  if(_worker){ try{ await _worker.terminate(); } catch(_){} _worker = null; }
}

// ═══════════════════════════════════════════════════════════════
// PREPROCESADO DE IMAGEN — lo que más sube la precisión
// Convierte a grises, sube contraste, binariza (Otsu) y escala x2.
// Devuelve un canvas listo para OCR.
// ═══════════════════════════════════════════════════════════════
function preprocessToCanvas(source, sx, sy, sw, sh){
  // source puede ser <video>, <img> o canvas. sx/sy/sw/sh = ROI opcional.
  const srcW = source.videoWidth || source.naturalWidth || source.width;
  const srcH = source.videoHeight || source.naturalHeight || source.height;
  sx = sx ?? 0; sy = sy ?? 0; sw = sw ?? srcW; sh = sh ?? srcH;

  // Escalar x2 para que el texto sea más grande (Tesseract lo agradece)
  const scale = 2;
  const cw = Math.round(sw * scale);
  const ch = Math.round(sh * scale);

  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, cw, ch);

  const img = ctx.getImageData(0, 0, cw, ch);
  const px = img.data;

  // 1) Escala de grises + histograma para Otsu
  const hist = new Array(256).fill(0);
  const gray = new Uint8ClampedArray(cw * ch);
  for(let i = 0, j = 0; i < px.length; i += 4, j++){
    // luminancia perceptual
    const g = (px[i] * 0.299 + px[i+1] * 0.587 + px[i+2] * 0.114) | 0;
    gray[j] = g;
    hist[g]++;
  }

  // 2) Umbral de Otsu (binarización automática)
  const total = cw * ch;
  let sum = 0;
  for(let t = 0; t < 256; t++) sum += t * hist[t];
  let sumB = 0, wB = 0, varMax = 0, threshold = 128;
  for(let t = 0; t < 256; t++){
    wB += hist[t];
    if(wB === 0) continue;
    const wF = total - wB;
    if(wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if(between > varMax){ varMax = between; threshold = t; }
  }

  // 3) Aplicar binarización (texto negro sobre blanco)
  for(let i = 0, j = 0; i < px.length; i += 4, j++){
    const v = gray[j] > threshold ? 255 : 0;
    px[i] = px[i+1] = px[i+2] = v;
    px[i+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ═══════════════════════════════════════════════════════════════
// POSTPROCESO POSICIONAL — corrige O↔0, I↔1 SEGÚN la posición
// Nunca destruye: usa el formato detectado para decidir.
// ═══════════════════════════════════════════════════════════════
const TO_DIGIT = { 'O':'0','Q':'0','D':'0','I':'1','L':'1','Z':'2','S':'5','B':'8','G':'6','T':'7' };
const TO_LETTER = { '0':'O','1':'I','2':'Z','5':'S','8':'B','6':'G' };

function rawClean(text){
  if(!text) return '';
  return String(text).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Aplica una máscara: 'D'=dígito, 'L'=letra. Corrige por posición.
function applyMask(s, mask){
  if(s.length !== mask.length) return null;
  let out = '';
  for(let i = 0; i < s.length; i++){
    const c = s[i];
    if(mask[i] === 'D'){
      out += /\d/.test(c) ? c : (TO_DIGIT[c] || c);
    } else {
      out += /[A-Z]/.test(c) ? c : (TO_LETTER[c] || c);
    }
  }
  return out;
}

// Formatos europeos comunes con su máscara posicional.
const PLATE_FORMATS = [
  { id:'ES-nuevo',  mask:'DDDDLLL',  re:/^\d{4}[A-Z]{3}$/,        conf:0.97 }, // 1234BCD
  { id:'ES-viejo',  mask:'LDDDDLL',  re:/^[A-Z]\d{4}[A-Z]{2}$/,   conf:0.9  }, // M1234AB
  { id:'IT',        mask:'LLDDDLL',  re:/^[A-Z]{2}\d{3}[A-Z]{2}$/,conf:0.9  }, // AB123CD
  { id:'FR',        mask:'LLDDDLL',  re:/^[A-Z]{2}\d{3}[A-Z]{2}$/,conf:0.9  }, // AA123AA
  { id:'DE',        mask:null,       re:/^[A-Z]{1,3}[A-Z]{1,2}\d{1,4}$/, conf:0.8 },
  { id:'NL',        mask:null,       re:/^[A-Z0-9]{6}$/,          conf:0.75 },
  { id:'PL',        mask:null,       re:/^[A-Z]{2,3}[A-Z0-9]{4,5}$/, conf:0.75 }
];

/**
 * Detecta y normaliza una matrícula a partir de texto OCR.
 * Prueba cada formato aplicando corrección posicional.
 */
function detectPlate(text){
  if(!text) return null;
  // Trocear en candidatos
  const candidates = String(text)
    .toUpperCase()
    .split(/[\s\n\-_,.;:]+/)
    .map(rawClean)
    .filter(s => s.length >= 5 && s.length <= 9);
  // Añadir también el texto entero limpio (a veces viene pegado)
  const whole = rawClean(text);
  if(whole.length >= 5 && whole.length <= 9) candidates.unshift(whole);

  // 1) Probar formatos con máscara posicional
  for(const fmt of PLATE_FORMATS){
    for(const cand of candidates){
      if(fmt.mask && cand.length === fmt.mask.length){
        const fixed = applyMask(cand, fmt.mask);
        if(fixed && fmt.re.test(fixed)){
          return { plate: fixed, confidence: fmt.conf, format: fmt.id };
        }
      } else if(!fmt.mask && fmt.re.test(cand)){
        return { plate: cand, confidence: fmt.conf, format: fmt.id };
      }
    }
  }
  // 2) Genérico: 6-8 alfanuméricos con al menos 1 letra y 1 dígito
  const generic = candidates.find(s =>
    /[A-Z]/.test(s) && /\d/.test(s) && s.length >= 6 && s.length <= 8
  );
  if(generic) return { plate: generic, confidence: 0.6, format: 'genérico' };

  return null;
}

// ═══════════════════════════════════════════════════════════════
// MOTORES
// ═══════════════════════════════════════════════════════════════
async function recognizeTesseract(canvasOrBlob){
  const worker = await getWorker();
  const result = await worker.recognize(canvasOrBlob);
  const raw = result.data.text;
  const tessConf = (result.data.confidence || 0) / 100;
  const detected = detectPlate(raw);
  if(detected){
    // Confianza final = mezcla formato + tesseract
    const conf = Math.min(0.99, detected.confidence * 0.6 + tessConf * 0.4);
    return { plate: detected.plate, confidence: conf, raw, format: detected.format };
  }
  return { plate: rawClean(raw).slice(0, 8), confidence: tessConf * 0.5, raw };
}

async function recognizeGemini(blob, apiKey){
  if(!apiKey) throw new Error('Falta API key de Gemini');
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
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if(/none/i.test(text)) return { plate: '', confidence: 0, raw: text };
  const detected = detectPlate(text) || { plate: rawClean(text), confidence: 0.85 };
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
  const detected = detectPlate(text) || { plate: rawClean(text).slice(0,8), confidence: 0.7 };
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
// API PÚBLICA — recognizePlate(image)
// Acepta blob/canvas/img. Para tesseract aplica preprocesado.
// ═══════════════════════════════════════════════════════════════
export async function recognizePlate(image){
  const cfg = getOcrConfig();
  const t0 = performance.now();
  let result = null, err = null;
  try{
    if(cfg.engine === 'tesseract'){
      // Preprocesar si es img/canvas; si es blob, pintarlo primero
      let canvas;
      if(image instanceof Blob){
        const bmp = await createImageBitmap(image);
        canvas = preprocessToCanvas(bmp);
      } else {
        canvas = preprocessToCanvas(image);
      }
      result = await recognizeTesseract(canvas);
    } else if(cfg.engine === 'gemini'){
      const blob = image instanceof Blob ? image : await canvasToBlob(image);
      result = await recognizeGemini(blob, cfg.geminiKey);
    } else if(cfg.engine === 'ocrspace'){
      const blob = image instanceof Blob ? image : await canvasToBlob(image);
      result = await recognizeOcrSpace(blob, cfg.ocrSpaceKey);
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
  if(err) throw err;
  return result;
}

function canvasToBlob(canvas){
  return new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', 0.9));
}

// ═══════════════════════════════════════════════════════════════
// ESCÁNER EN TIEMPO REAL — cámara abierta, recuadro guía, ROI,
// consenso multi-frame, auto-captura por acuerdo.
// ═══════════════════════════════════════════════════════════════
export async function scanPlateRealtime(){
  const cfg = getOcrConfig();
  return new Promise(async (resolve, reject) => {
    let stream = null;
    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width:{ideal:1280}, height:{ideal:720} },
        audio: false
      });
    } catch(e){
      logger.warn('Sin acceso a cámara', { error: e.message });
      reject(new Error('Sin acceso a cámara: ' + e.message));
      return;
    }

    // ── UI ──
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.92);
      display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;`;

    const stage = document.createElement('div');
    stage.style.cssText = 'position:relative;max-width:100%;max-height:64vh;border-radius:12px;overflow:hidden;';
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true; video.muted = true;
    video.style.cssText = 'display:block;max-width:100%;max-height:64vh;';
    video.srcObject = stream;
    stage.appendChild(video);

    // Recuadro guía (ROI) centrado
    const guide = document.createElement('div');
    guide.style.cssText = `position:absolute;left:12%;top:38%;width:76%;height:24%;
      border:3px solid #fbbf24;border-radius:10px;box-shadow:0 0 0 9999px rgba(0,0,0,0.35);
      transition:border-color .2s;`;
    stage.appendChild(guide);

    // Línea de barrido
    const scanline = document.createElement('div');
    scanline.style.cssText = `position:absolute;left:12%;width:76%;height:2px;background:#fbbf24;
      top:38%;opacity:.8;animation:ocrscan 1.6s ease-in-out infinite;`;
    stage.appendChild(scanline);

    // Badge lectura en vivo
    const liveBadge = document.createElement('div');
    liveBadge.style.cssText = `position:absolute;left:50%;top:64%;transform:translateX(-50%);
      background:rgba(0,0,0,.7);color:#fff;padding:6px 12px;border-radius:20px;
      font-family:ui-monospace,monospace;font-size:16px;font-weight:700;letter-spacing:1px;min-width:90px;text-align:center;`;
    liveBadge.textContent = '— — —';
    stage.appendChild(liveBadge);

    modal.appendChild(stage);

    // Barra de confianza
    const confWrap = document.createElement('div');
    confWrap.style.cssText = 'width:min(420px,90%);height:8px;background:#374151;border-radius:6px;margin-top:14px;overflow:hidden;';
    const confBar = document.createElement('div');
    confBar.style.cssText = 'height:100%;width:0%;background:#fbbf24;transition:width .25s,background .25s;';
    confWrap.appendChild(confBar);
    modal.appendChild(confWrap);

    const hint = document.createElement('div');
    hint.style.cssText = 'color:#cbd5e1;font-size:13px;margin-top:10px;text-align:center;max-width:420px;';
    hint.textContent = 'Encuadra la matrícula dentro del recuadro. Se capturará automáticamente.';
    modal.appendChild(hint);

    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;justify-content:center;';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar'; cancelBtn.className = 'btn btn-secondary';
    const manualBtn = document.createElement('button');
    manualBtn.textContent = '📸 Capturar ahora'; manualBtn.className = 'btn btn-primary';
    controls.appendChild(cancelBtn); controls.appendChild(manualBtn);
    modal.appendChild(controls);

    // Animación scanline (inyectar una vez)
    if(!document.getElementById('ocr-scan-style')){
      const st = document.createElement('style');
      st.id = 'ocr-scan-style';
      st.textContent = '@keyframes ocrscan{0%{top:38%}50%{top:60%}100%{top:38%}}';
      document.head.appendChild(st);
    }

    document.body.appendChild(modal);

    // ── Lógica de escaneo ──
    let running = true;
    let busy = false;
    const votes = new Map();       // plate → {count, confSum}
    let bestPlate = null, bestScore = 0;

    const cleanup = () => {
      running = false;
      stream.getTracks().forEach(t => t.stop());
      modal.remove();
    };

    const finish = (result) => {
      if(!running) return;
      cleanup();
      resolve(result);
    };

    cancelBtn.onclick = () => { cleanup(); reject(new Error('Cancelado')); };

    manualBtn.onclick = async () => {
      // Captura manual: usa el mejor voto o procesa un frame ya
      if(bestPlate){ finish({ plate: bestPlate, confidence: Math.min(0.99, bestScore), raw:'manual' }); return; }
      const c = grabROI();
      try{
        const r = await recognizePlate(c);
        finish(r || { plate:'', confidence:0, raw:'manual' });
      } catch(e){ finish({ plate:'', confidence:0, raw:'manual' }); }
    };

    // Recorta el ROI (recuadro guía) del frame actual del vídeo
    function grabROI(){
      const vw = video.videoWidth, vh = video.videoHeight;
      const rx = 0.12 * vw, ry = 0.38 * vh, rw = 0.76 * vw, rh = 0.24 * vh;
      if(cfg.engine === 'tesseract'){
        return preprocessToCanvas(video, rx, ry, rw, rh);
      }
      // Para nube: canvas sin binarizar (la IA prefiere la imagen normal)
      const c = document.createElement('canvas');
      c.width = rw; c.height = rh;
      c.getContext('2d').drawImage(video, rx, ry, rw, rh, 0, 0, rw, rh);
      return c;
    }

    async function tick(){
      if(!running) return;
      if(busy){ setTimeout(tick, 250); return; }
      busy = true;
      try{
        const roi = grabROI();
        let r = null;
        if(cfg.engine === 'tesseract'){
          r = await recognizeTesseract(roi);
        } else {
          // Nube: limitar frecuencia para no gastar cuota (cada ~1.8s)
          const blob = await canvasToBlob(roi);
          r = cfg.engine === 'gemini'
            ? await recognizeGemini(blob, cfg.geminiKey)
            : await recognizeOcrSpace(blob, cfg.ocrSpaceKey);
        }
        if(r && r.plate && r.plate.length >= 5){
          const v = votes.get(r.plate) || { count:0, confSum:0 };
          v.count++; v.confSum += r.confidence || 0.5;
          votes.set(r.plate, v);
          // score = votos * confianza media
          const score = v.count * (v.confSum / v.count);
          if(score > bestScore){ bestScore = score; bestPlate = r.plate; }

          // UI en vivo
          liveBadge.textContent = bestPlate;
          const shownConf = Math.min(0.99, v.confSum / v.count);
          confBar.style.width = Math.round(shownConf * 100) + '%';
          const good = v.count >= 2 && shownConf >= 0.7;
          guide.style.borderColor = good ? '#22c55e' : '#fbbf24';
          confBar.style.background = good ? '#22c55e' : '#fbbf24';

          // Auto-captura: 3 lecturas iguales, o 2 con confianza alta
          if((v.count >= 3) || (v.count >= 2 && shownConf >= 0.85)){
            finish({ plate: bestPlate, confidence: shownConf, raw:'auto', format:r.format });
            return;
          }
        } else {
          guide.style.borderColor = '#ef4444';
        }
      } catch(e){
        // Si es error de cuota en nube, abortar con mensaje claro
        if(/limit|quota|429/i.test(e.message || '')){
          cleanup();
          reject(new Error('Límite de OCR en la nube alcanzado. Usa Tesseract o introduce la matrícula manualmente.'));
          return;
        }
        logger.warn('Frame OCR falló', { error: e.message });
      } finally {
        busy = false;
        if(running) setTimeout(tick, cfg.engine === 'tesseract' ? 350 : 1800);
      }
    }

    video.onloadedmetadata = () => { video.play(); tick(); };
  });
}

// ═══════════════════════════════════════════════════════════════
// CÁMARA — captura simple (foto única) — se mantiene por compat.
// ═══════════════════════════════════════════════════════════════
export async function captureFromCamera(){
  return new Promise(async (resolve, reject) => {
    let stream = null;
    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, audio: false
      });
    } catch(e){
      reject(new Error('Sin acceso a cámara: ' + e.message));
      return;
    }
    const modal = document.createElement('div');
    modal.style.cssText = `position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,0.9);
      display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;`;
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true;
    video.style.cssText = 'max-width:100%;max-height:70vh;border-radius:12px;';
    video.srcObject = stream;
    modal.appendChild(video);
    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;gap:12px;margin-top:20px';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar'; cancelBtn.className = 'btn btn-secondary';
    const captureBtn = document.createElement('button');
    captureBtn.textContent = '📸 Capturar'; captureBtn.className = 'btn btn-primary';
    controls.appendChild(cancelBtn); controls.appendChild(captureBtn);
    modal.appendChild(controls);
    document.body.appendChild(modal);
    const cleanup = () => { stream.getTracks().forEach(t => t.stop()); modal.remove(); };
    cancelBtn.onclick = () => { cleanup(); reject(new Error('Cancelado')); };
    captureBtn.onclick = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      canvas.toBlob(blob => { cleanup(); resolve(blob); }, 'image/jpeg', 0.9);
    };
  });
}

/**
 * Atajo principal usado por ingresos/referencias.
 * Si realtime está activo → escaneo en vivo; si no → foto única.
 */
export async function scanPlate(){
  const cfg = getOcrConfig();
  try{
    if(cfg.realtime !== false){
      toast('📸 Apunta a la matrícula…', 'info', 2000);
      const result = await scanPlateRealtime();
      if(result?.plate){
        toast(`✅ Matrícula: ${result.plate}`, 'ok');
        return result;
      }
      toast('No se detectó matrícula. Introdúcela manualmente.', 'warn');
      return null;
    } else {
      toast('📸 Abriendo cámara…', 'info');
      const blob = await captureFromCamera();
      toast('🔍 Reconociendo matrícula…', 'info', 3500);
      const result = await recognizePlate(blob);
      if(result?.plate){
        toast(`✅ Matrícula: ${result.plate}`, 'ok');
        return result;
      }
      toast('No se detectó matrícula. Reintenta con mejor enfoque.', 'warn');
      return null;
    }
  } catch(e){
    if(e.message !== 'Cancelado') toast(`Error OCR: ${e.message}`, 'err');
    return null;
  }
}
