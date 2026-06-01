// ═══════════════════════════════════════════════════════════════
// ocr.js — OCR de matrículas (v3: ANPR neuronal en navegador)
//
// Pipeline profesional, 100% local, sin Google/nube:
//   cámara → detector ONNX (YOLO-v9 placa) → recorte ROI
//          → OCR ONNX (MobileViT-v2 europeo) → corrección posicional
//
// Modelos (en js/models/, ~13MB, se cachean tras 1ª carga):
//   - plate_detector.onnx       YOLO-v9-t 384  in[1,3,384,384] out[N,7]
//   - european_ocr.onnx         MobileViT-v2   in[N,70,140,1] out[N,333]
//
// Runtime: onnxruntime-web (WASM). Fallback a Tesseract si no cargan.
// Tap-to-focus: el usuario toca la placa → prioriza esa región.
// Consenso multi-frame + auto-captura por acuerdo.
// ═══════════════════════════════════════════════════════════════

import { logger } from './logger.js';
import { toast } from './utils.js';

const STORAGE_KEY = 'beunifyt_ocr_config';
const MODEL_BASE  = './js/models';
const ORT_CDN     = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.min.js';
const TESS_CDN    = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

// OCR model config (european_ocr_config.yaml)
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_';
const PAD_CHAR = '_';
const SLOTS = 9, OCR_H = 70, OCR_W = 140;
const DET_SIZE = 384;

// ── Config ────────────────────────────────────────────────────
export function getOcrConfig(){
  try{ const r = localStorage.getItem(STORAGE_KEY); if(r) return JSON.parse(r); }catch(_){}
  return { engine:'onnx', geminiKey:'', ocrSpaceKey:'', realtime:true };
}
export function setOcrConfig(cfg){
  try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }catch(_){}
}

// ── Stats ─────────────────────────────────────────────────────
function logOcrStat(success, engine, plate, confidence, ms){
  try{
    const k='beunifyt_ocr_stats';
    const s=JSON.parse(localStorage.getItem(k)||'{"runs":0,"success":0,"engines":{}}');
    s.runs++; if(success) s.success++;
    s.engines[engine]=(s.engines[engine]||0)+1;
    s.lastRun={engine,plate,confidence,ms,success,t:Date.now()};
    localStorage.setItem(k, JSON.stringify(s));
  }catch(_){}
}
export function getOcrStats(){
  try{ return JSON.parse(localStorage.getItem('beunifyt_ocr_stats')||'{"runs":0,"success":0,"engines":{}}'); }
  catch(_){ return {runs:0,success:0,engines:{}}; }
}
export function clearOcrStats(){ localStorage.removeItem('beunifyt_ocr_stats'); }

// ═══════════════════════════════════════════════════════════════
// CARGA DE RUNTIME Y MODELOS (lazy, cacheado)
// ═══════════════════════════════════════════════════════════════
let _ort = null, _detSession = null, _ocrSession = null, _loadPromise = null;

function loadScript(src){
  return new Promise((res, rej) => {
    if([...document.scripts].some(s => s.src === src)) return res();
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar '+src));
    document.head.appendChild(s);
  });
}

async function loadOnnx(){
  if(_detSession && _ocrSession) return true;
  if(_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    await loadScript(ORT_CDN);
    _ort = window.ort;
    try{ _ort.env.wasm.numThreads = Math.min(4, navigator.hardwareConcurrency || 2); }catch(_){}
    _ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/';
    const opts = { executionProviders:['wasm'], graphOptimizationLevel:'all' };
    [_detSession, _ocrSession] = await Promise.all([
      _ort.InferenceSession.create(`${MODEL_BASE}/plate_detector.onnx`, opts),
      _ort.InferenceSession.create(`${MODEL_BASE}/european_ocr.onnx`, opts)
    ]);
    logger.ok('Modelos ANPR ONNX cargados');
    return true;
  })().catch(e => {
    logger.error('Fallo cargando modelos ONNX', { error:e.message });
    _loadPromise = null;
    throw e;
  });
  return _loadPromise;
}

// ═══════════════════════════════════════════════════════════════
// PREPROCESADO PARA CADA MODELO
// ═══════════════════════════════════════════════════════════════
// Detector: redimensiona a 384x384, RGB, normaliza /255, NCHW float32
function preprocessDetector(source, sx, sy, sw, sh){
  const c = document.createElement('canvas');
  c.width = DET_SIZE; c.height = DET_SIZE;
  const ctx = c.getContext('2d', { willReadFrequently:true });
  const W = sw ?? (source.videoWidth || source.naturalWidth || source.width);
  const H = sh ?? (source.videoHeight || source.naturalHeight || source.height);
  ctx.drawImage(source, sx??0, sy??0, W, H, 0, 0, DET_SIZE, DET_SIZE);
  const { data } = ctx.getImageData(0, 0, DET_SIZE, DET_SIZE);
  const f = new Float32Array(3 * DET_SIZE * DET_SIZE);
  const plane = DET_SIZE * DET_SIZE;
  for(let i = 0, p = 0; i < data.length; i += 4, p++){
    f[p]           = data[i]   / 255;
    f[plane + p]   = data[i+1] / 255;
    f[2*plane + p] = data[i+2] / 255;
  }
  return { tensor: new _ort.Tensor('float32', f, [1,3,DET_SIZE,DET_SIZE]), scaleX: W/DET_SIZE, scaleY: H/DET_SIZE, offX: sx??0, offY: sy??0 };
}

// OCR: recorta caja, redimensiona 140x70 grises, uint8 NHWC
function preprocessOcr(source, box){
  const c = document.createElement('canvas');
  c.width = OCR_W; c.height = OCR_H;
  const ctx = c.getContext('2d', { willReadFrequently:true });
  ctx.drawImage(source, box.x, box.y, box.w, box.h, 0, 0, OCR_W, OCR_H);
  const { data } = ctx.getImageData(0, 0, OCR_W, OCR_H);
  const u = new Uint8Array(OCR_H * OCR_W);
  for(let i = 0, p = 0; i < data.length; i += 4, p++){
    u[p] = (data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114) | 0;
  }
  return new _ort.Tensor('uint8', u, [1, OCR_H, OCR_W, 1]);
}

function softmaxRow(arr){
  let mx = -Infinity; for(const v of arr) if(v > mx) mx = v;
  let sum = 0; const e = arr.map(v => { const x = Math.exp(v - mx); sum += x; return x; });
  return e.map(x => x / sum);
}

// Decodifica salida OCR [333] → { plate, conf }
function decodeOcr(out){
  const A = ALPHABET.length; // 37
  let plate = '', minConf = 1;
  for(let s = 0; s < SLOTS; s++){
    const row = []; for(let k = 0; k < A; k++) row.push(out[s*A + k]);
    const p = softmaxRow(row);
    let bi = 0, bv = -1;
    for(let k = 0; k < A; k++) if(p[k] > bv){ bv = p[k]; bi = k; }
    const ch = ALPHABET[bi];
    if(ch !== PAD_CHAR){ plate += ch; if(bv < minConf) minConf = bv; }
  }
  return { plate, conf: plate ? minConf : 0 };
}

// ── Corrección posicional por formato EU (no destructiva) ──────
const TO_DIGIT = {'O':'0','Q':'0','D':'0','I':'1','L':'1','Z':'2','S':'5','B':'8','G':'6','T':'7'};
const TO_LETTER = {'0':'O','1':'I','2':'Z','5':'S','8':'B','6':'G'};
const FORMATS = [
  { mask:'DDDDLLL', re:/^\d{4}[A-Z]{3}$/ },        // ES nuevo
  { mask:'LDDDDLL', re:/^[A-Z]\d{4}[A-Z]{2}$/ },   // ES viejo
  { mask:'LLDDDLL', re:/^[A-Z]{2}\d{3}[A-Z]{2}$/ },// IT/FR
];
function applyMask(s, mask){
  if(s.length !== mask.length) return null;
  let o = '';
  for(let i = 0; i < s.length; i++){
    const c = s[i];
    o += mask[i]==='D' ? (/\d/.test(c)?c:(TO_DIGIT[c]||c)) : (/[A-Z]/.test(c)?c:(TO_LETTER[c]||c));
  }
  return o;
}
function fixPlate(raw){
  const s = String(raw).toUpperCase().replace(/[^A-Z0-9]/g,'');
  for(const f of FORMATS){
    if(s.length === f.mask.length){
      const fixed = applyMask(s, f.mask);
      if(fixed && f.re.test(fixed)) return fixed;
    }
  }
  return s;
}

// ═══════════════════════════════════════════════════════════════
// INFERENCIA ONNX — detecta placa(s) y lee la de mayor score
// roiHint: {x,y,w,h} opcional (tap-to-focus) en coords del source
// ═══════════════════════════════════════════════════════════════
async function inferOnnx(source, roiHint){
  await loadOnnx();
  // 1) Detección (sobre toda la imagen o sobre la región tocada)
  const pre = roiHint
    ? preprocessDetector(source, roiHint.x, roiHint.y, roiHint.w, roiHint.h)
    : preprocessDetector(source);
  const detOut = await _detSession.run({ images: pre.tensor });
  const arr = detOut[Object.keys(detOut)[0]].data; // [N*7]
  const rows = arr.length / 7;
  let best = null;
  for(let i = 0; i < rows; i++){
    const o = i*7;
    const score = arr[o+4];
    if(score < 0.3) continue;
    if(!best || score > best.score){
      best = {
        x1: arr[o], y1: arr[o+1], x2: arr[o+2], y2: arr[o+3], score
      };
    }
  }
  if(!best) return null;
  // Reproyectar caja a coords del source original
  const box = {
    x: pre.offX + best.x1 * pre.scaleX,
    y: pre.offY + best.y1 * pre.scaleY,
    w: (best.x2 - best.x1) * pre.scaleX,
    h: (best.y2 - best.y1) * pre.scaleY
  };
  if(box.w < 8 || box.h < 6) return null;
  // 2) OCR sobre la caja
  const ocrIn = preprocessOcr(source, box);
  const ocrOut = await _ocrSession.run({ input: ocrIn });
  const data = ocrOut[Object.keys(ocrOut)[0]].data;
  const { plate, conf } = decodeOcr(data);
  if(!plate) return null;
  return { plate: fixPlate(plate), confidence: Math.min(0.99, conf * 0.8 + best.score * 0.2), box, raw: plate };
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK TESSERACT (si los modelos ONNX no cargan)
// ═══════════════════════════════════════════════════════════════
let _tessWorker = null;
async function getTess(){
  if(_tessWorker) return _tessWorker;
  await loadScript(TESS_CDN);
  _tessWorker = await window.Tesseract.createWorker('eng', 1, { logger:()=>{} });
  await _tessWorker.setParameters({
    tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    tessedit_pageseg_mode:'7'
  });
  return _tessWorker;
}
async function inferTesseract(source, roiHint){
  const w = roiHint?.w || source.videoWidth || source.naturalWidth || source.width;
  const h = roiHint?.h || source.videoHeight || source.naturalHeight || source.height;
  const c = document.createElement('canvas'); c.width = w*2; c.height = h*2;
  const ctx = c.getContext('2d', { willReadFrequently:true });
  ctx.drawImage(source, roiHint?.x||0, roiHint?.y||0, w, h, 0, 0, w*2, h*2);
  // binarizar
  const im = ctx.getImageData(0,0,c.width,c.height); const d = im.data;
  for(let i=0;i<d.length;i+=4){ const g=(d[i]*.299+d[i+1]*.587+d[i+2]*.114); const v=g>128?255:0; d[i]=d[i+1]=d[i+2]=v; }
  ctx.putImageData(im,0,0);
  const worker = await getTess();
  const r = await worker.recognize(c);
  const plate = fixPlate(r.data.text);
  return plate.length>=5 ? { plate, confidence:(r.data.confidence||0)/100*0.6, raw:r.data.text } : null;
}

// ═══════════════════════════════════════════════════════════════
// API: recognizePlate(image, roiHint)
// ═══════════════════════════════════════════════════════════════
export async function recognizePlate(image, roiHint){
  const cfg = getOcrConfig();
  const t0 = performance.now();
  let res = null, engine = cfg.engine;
  try{
    if(cfg.engine === 'onnx'){
      try{ res = await inferOnnx(image, roiHint); }
      catch(e){
        logger.warn('ONNX falló, fallback a Tesseract', { error:e.message });
        engine = 'tesseract-fallback';
        res = await inferTesseract(image, roiHint);
      }
    } else {
      res = await inferTesseract(image, roiHint);
    }
  }catch(e){ logger.error('OCR error', { error:e.message }); }
  logOcrStat(!!(res&&res.plate), engine, res?.plate||'', res?.confidence||0, Math.round(performance.now()-t0));
  return res;
}

// ═══════════════════════════════════════════════════════════════
// ESCÁNER TIEMPO REAL — tap-to-focus + recuadro que sigue la placa
// ═══════════════════════════════════════════════════════════════
export async function scanPlateRealtime(){
  const cfg = getOcrConfig();
  return new Promise(async (resolve, reject) => {
    let stream;
    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video:{ facingMode:'environment', width:{ideal:1280}, height:{ideal:720} }, audio:false
      });
    }catch(e){ reject(new Error('Sin acceso a cámara: '+e.message)); return; }

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px;';
    const stage = document.createElement('div');
    stage.style.cssText = 'position:relative;max-width:100%;max-height:64vh;border-radius:12px;overflow:hidden;cursor:crosshair;';
    const video = document.createElement('video');
    video.autoplay=true; video.playsInline=true; video.muted=true;
    video.style.cssText='display:block;max-width:100%;max-height:64vh;';
    video.srcObject = stream;
    stage.appendChild(video);

    // Caja de detección (se mueve sola sobre la placa hallada)
    const detBox = document.createElement('div');
    detBox.style.cssText='position:absolute;border:3px solid #22c55e;border-radius:6px;display:none;pointer-events:none;box-shadow:0 0 12px rgba(34,197,94,.6);transition:all .12s;';
    stage.appendChild(detBox);

    const liveBadge = document.createElement('div');
    liveBadge.style.cssText='position:absolute;left:50%;bottom:10px;transform:translateX(-50%);background:rgba(0,0,0,.75);color:#fff;padding:6px 14px;border-radius:20px;font-family:ui-monospace,monospace;font-size:18px;font-weight:700;letter-spacing:2px;';
    liveBadge.textContent='— — —';
    stage.appendChild(liveBadge);
    modal.appendChild(stage);

    const confWrap=document.createElement('div');
    confWrap.style.cssText='width:min(420px,90%);height:8px;background:#374151;border-radius:6px;margin-top:14px;overflow:hidden;';
    const confBar=document.createElement('div');
    confBar.style.cssText='height:100%;width:0;background:#fbbf24;transition:width .25s,background .25s;';
    confWrap.appendChild(confBar); modal.appendChild(confWrap);

    const hint=document.createElement('div');
    hint.style.cssText='color:#cbd5e1;font-size:13px;margin-top:10px;text-align:center;max-width:420px;';
    hint.textContent='Toca la matrícula para enfocar. Captura automática al detectarla.';
    modal.appendChild(hint);

    const controls=document.createElement('div');
    controls.style.cssText='display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;justify-content:center;';
    const cancelBtn=document.createElement('button'); cancelBtn.textContent='Cancelar'; cancelBtn.className='btn btn-secondary';
    const manualBtn=document.createElement('button'); manualBtn.textContent='📸 Capturar ahora'; manualBtn.className='btn btn-primary';
    controls.appendChild(cancelBtn); controls.appendChild(manualBtn);
    modal.appendChild(controls);
    document.body.appendChild(modal);

    let running=true, busy=false, roiHint=null;
    const votes=new Map(); let bestPlate=null, bestScore=0;

    const cleanup=()=>{ running=false; stream.getTracks().forEach(t=>t.stop()); modal.remove(); };
    const finish=(r)=>{ if(!running)return; cleanup(); resolve(r); };
    cancelBtn.onclick=()=>{ cleanup(); reject(new Error('Cancelado')); };
    manualBtn.onclick=async()=>{
      if(bestPlate){ finish({plate:bestPlate,confidence:Math.min(0.99,bestScore),raw:'manual'}); return; }
      try{ const r=await recognizePlate(video, roiHint); finish(r||{plate:'',confidence:0}); }
      catch(_){ finish({plate:'',confidence:0}); }
    };

    // Tap-to-focus: traducir clic a coords del vídeo, definir ROI alrededor
    stage.onclick=(ev)=>{
      const rect=video.getBoundingClientRect();
      const rx=(ev.clientX-rect.left)/rect.width, ry=(ev.clientY-rect.top)/rect.height;
      const vw=video.videoWidth, vh=video.videoHeight;
      const rw=vw*0.5, rh=vh*0.25; // ventana alrededor del toque
      roiHint={ x:Math.max(0,rx*vw-rw/2), y:Math.max(0,ry*vh-rh/2), w:rw, h:rh };
      hint.textContent='Región enfocada. Buscando matrícula…';
    };

    function showBox(box){
      if(!box){ detBox.style.display='none'; return; }
      const rect=video.getBoundingClientRect();
      const sx=rect.width/video.videoWidth, sy=rect.height/video.videoHeight;
      detBox.style.display='block';
      detBox.style.left=(box.x*sx)+'px'; detBox.style.top=(box.y*sy)+'px';
      detBox.style.width=(box.w*sx)+'px'; detBox.style.height=(box.h*sy)+'px';
    }

    async function tick(){
      if(!running) return;
      if(busy){ setTimeout(tick,200); return; }
      busy=true;
      try{
        const r=await recognizePlate(video, roiHint);
        if(r && r.plate && r.plate.length>=5){
          showBox(r.box);
          const v=votes.get(r.plate)||{count:0,confSum:0};
          v.count++; v.confSum+=r.confidence||0.5; votes.set(r.plate,v);
          const score=v.count*(v.confSum/v.count);
          if(score>bestScore){ bestScore=score; bestPlate=r.plate; }
          liveBadge.textContent=bestPlate;
          const sc=Math.min(0.99,v.confSum/v.count);
          confBar.style.width=Math.round(sc*100)+'%';
          const good=v.count>=2&&sc>=0.7;
          confBar.style.background=good?'#22c55e':'#fbbf24';
          if((v.count>=3)||(v.count>=2&&sc>=0.85)){ finish({plate:bestPlate,confidence:sc,raw:'auto',box:r.box}); return; }
        } else {
          showBox(null);
        }
      }catch(e){
        if(/limit|quota|429/i.test(e.message||'')){ cleanup(); reject(new Error('Límite OCR nube. Usa modelo local o manual.')); return; }
      }finally{
        busy=false;
        if(running) setTimeout(tick, 300);
      }
    }
    video.onloadedmetadata=()=>{ video.play(); tick(); };
  });
}

// ── Captura simple (foto única) ───────────────────────────────
export async function captureFromCamera(){
  return new Promise(async (resolve, reject) => {
    let stream;
    try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false}); }
    catch(e){ reject(new Error('Sin acceso a cámara: '+e.message)); return; }
    const modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.9);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';
    const video=document.createElement('video'); video.autoplay=true; video.playsInline=true;
    video.style.cssText='max-width:100%;max-height:70vh;border-radius:12px;'; video.srcObject=stream;
    modal.appendChild(video);
    const controls=document.createElement('div'); controls.style.cssText='display:flex;gap:12px;margin-top:20px;';
    const cancelBtn=document.createElement('button'); cancelBtn.textContent='Cancelar'; cancelBtn.className='btn btn-secondary';
    const captureBtn=document.createElement('button'); captureBtn.textContent='📸 Capturar'; captureBtn.className='btn btn-primary';
    controls.appendChild(cancelBtn); controls.appendChild(captureBtn); modal.appendChild(controls);
    document.body.appendChild(modal);
    const cleanup=()=>{ stream.getTracks().forEach(t=>t.stop()); modal.remove(); };
    cancelBtn.onclick=()=>{ cleanup(); reject(new Error('Cancelado')); };
    captureBtn.onclick=()=>{
      const c=document.createElement('canvas'); c.width=video.videoWidth; c.height=video.videoHeight;
      c.getContext('2d').drawImage(video,0,0); cleanup(); resolve(c);
    };
  });
}

// ── Atajo principal ───────────────────────────────────────────
export async function scanPlate(){
  const cfg=getOcrConfig();
  try{
    if(cfg.realtime!==false){
      const r=await scanPlateRealtime();
      if(r?.plate){ toast(`✅ Matrícula: ${r.plate}`,'ok'); return r; }
      toast('No se detectó matrícula. Introdúcela manualmente.','warn'); return null;
    } else {
      const canvas=await captureFromCamera();
      toast('🔍 Reconociendo…','info',2500);
      const r=await recognizePlate(canvas);
      if(r?.plate){ toast(`✅ Matrícula: ${r.plate}`,'ok'); return r; }
      toast('No se detectó matrícula. Reintenta.','warn'); return null;
    }
  }catch(e){
    if(e.message!=='Cancelado') toast(`Error OCR: ${e.message}`,'err');
    return null;
  }
}

export async function terminateWorker(){
  if(_tessWorker){ try{ await _tessWorker.terminate(); }catch(_){} _tessWorker=null; }
}
