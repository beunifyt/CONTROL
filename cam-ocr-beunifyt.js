/**
 * cam-ocr-beunifyt.js — BeUnifyT OCR Engine v1.0
 *
 * INTEGRACIÓN:
 *   Añadir al final del INDEX.html, antes del </body>:
 *   <script src="cam-ocr-beunifyt.js"></script>
 *
 * FUNCIONALIDADES:
 *   - Toggle Vision API / OCR Local (solo SA)
 *   - OCR Local con Tesseract.js (offline, 0€)
 *   - Detección de movimiento + captura automática
 *   - Volcado directo en #fiMat + checkMatOnInput()
 *   - Estadísticas en DB.ocrStats (compatibles con Analytics)
 *   - Sección SA en tab-usuarios con contadores y tabla 7 días
 *   - Badge de servicio activo en modal cámara
 */

(function () {
  'use strict';

  // ─── CONSTANTES ───────────────────────────────────────────────────────────
  const TESS_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
  const MOTION_THRESHOLD = 16;   // diferencia media px para detectar movimiento
  const STABILITY_MS     = 1800; // ms quieto → capturar
  const SCAN_INTERVAL_MS = 120;  // ms entre frames de análisis
  const MIN_CONF         = 52;   // confianza mínima Tesseract

  // ─── PATRONES 53 PAÍSES ───────────────────────────────────────────────────
  const PAT = {
    ES:/^\d{4}[BCDFGHJKLMNPRSTUVWXYZ]{3}$|^[A-Z]{1,2}\d{4}[A-Z]$|^[A-Z]\d{4}[A-Z]{2}$/,
    FR:/^[A-Z]{2}\d{3}[A-Z]{2}$/,
    DE:/^[A-Z]{1,3}[A-Z]{1,2}\d{1,4}[A-Z]?$/,
    IT:/^[A-Z]{2}\d{3}[A-Z]{2}$/,
    GB:/^[A-Z]{2}\d{2}[A-Z]{3}$/,
    PL:/^[A-Z]{2,3}\d{3,5}$|^[A-Z]{2,3}\d{3,5}[A-Z]{1,2}$|^[A-Z]{2,3}[A-Z]{1,2}\d{3,4}$|^[A-Z]{2}\d{4,5}[A-Z]?$/,
    PT:/^[A-Z]{2}\d{2}[A-Z]{2}$|^\d{2}[A-Z]{2}\d{2}$/,
    NL:/^[A-Z]{2}\d{2}[A-Z]{2}$|^\d{2}[A-Z]{3}\d$/,
    BE:/^[1-9][A-Z]{3}\d{3}$/,
    AT:/^[A-Z]{1,3}[A-Z]{1,2}\d{1,4}[A-Z]?$/,
    CH:/^[A-Z]{2}\d{1,6}[A-Z]?$/,
    SE:/^[A-Z]{3}\d{2}[A-Z0-9]$/,
    NO:/^[A-Z]{2}\d{5}$/,
    DK:/^[A-Z]{2}\d{5}$/,
    FI:/^[A-Z]{2,3}\d{1,4}$/,
    CZ:/^\d[A-Z]{2}\d{4}$/,
    SK:/^[A-Z]{2}\d{3}[A-Z]{2}$/,
    HU:/^[A-Z]{3}\d{3}$/,
    RO:/^[A-Z]{1,2}\d{2,3}[A-Z]{3}$/,
    BG:/^[A-Z]{1,2}\d{4}[A-Z]{2}$/,
    HR:/^[A-Z]{2}\d{3,4}[A-Z]{2}$/,
    SI:/^[A-Z]{2}[A-Z]{1,2}[0-9]{2}$|^[A-Z]{2}[0-9][A-Z]{2}[0-9]{2}$/,
    GR:/^[A-Z]{3}\d{4}$/,
    EE:/^\d{3}[A-Z]{3}$/,
    LV:/^[A-Z]{2}\d{4}$/,
    LT:/^[A-Z]{3}\d{3}$/,
    LU:/^[A-Z]{2}\d{4}$/,
    IE:/^\d{2,3}[A-Z]{1,2}\d{1,6}$/,
    CY:/^[A-Z]{3}\d{3}$/,
    MT:/^[A-Z]{3}\d{3}$/,
    RS:/^[A-Z]{2}\d{3,4}[A-Z]{2}$/,
    TR:/^\d{2}[A-Z]{1,3}\d{2,5}$/,
    UA:/^[A-Z]{2}\d{4}[A-Z]{2}$/,
    BY:/^\d{4}[A-Z]{2}\d$/,
    RU:/^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{2,3}$|^[ABEHKMOPCTYХ][0-9]{3}[ABEHKMOPCTYХ]{2}[0-9]{2,3}$/,
    MD:/^[A-Z]{3}\d{3}$/,
    GE:/^[A-Z]{2}\d{3}[A-Z]{2}$/,
    AM:/^\d{2}[A-Z]{2}\d{3}$/,
    AZ:/^\d{2}[A-Z]{2}\d{3}$/,
    BA:/^[A-Z]\d{2}[A-Z]\d{3}$/,
    ME:/^[A-Z]{2,4}\d{3,4}$/,
    MK:/^[A-Z]{2}\d{4}[A-Z]{2}$/,
    AL:/^[A-Z]{2}\d{3}[A-Z]{2}$/,
    XK:/^\d{2}[A-Z]{3}\d{3}$/,
    IS:/^[A-Z]{1,3}\d{1,3}$/,
    LI:/^FL\d{1,5}$/,
    AD:/^[A-Z]{1,2}\d{4}$/,
    MC:/^\d{3}[A-Z]{3}$/,
    GI:/^[A-Z]{3}\d{4}$/,
    SM:/^\d{4,5}$/,
    VA:/^SCV\d{1,5}$/,
    MA:/^\d{1,5}[A-Z]\d{1,2}$/,
    DZ:/^\d{7}\d{4}$/,
    TN:/^\d{3}[A-Z]{3}\d{4}$/,
    LY:/^\d{6,7}$/,
  }

  const BLACKLIST = new Set(['TIR','PL','EU','DE','FR','ES','GB','IT','PT','NL','BE',
    'SCANIA','VOLVO','SCHMITZ','MERCEDES','RENAULT','MAN','DAF','IVECO','FORD',
    'RANGE','ROVER','BMW','AUDI','FIAT','SEAT','OPEL','PEUGEOT','CITROEN',
    'TRAILER','TRUCK','TRUCKS','CARGO','TRANS','LOG','GROUP','SRL','SPA','GMBH','LTD',
    // Palabras de eventos/lugares que nunca son matrículas
    'SEAFOOD','BARCELONA','MADRID','FIRA','HALL','STAND','EXPO','FAIR','SALON',
    'ENTER','EXIT','SALIDA','ENTRADA','ACCESO','CONTROL','RAMPA','PARKING',
    // Años comunes
    '2023','2024','2025','2026','2027','2028']);

  const FIX_D = {'O':'0','I':'1','Z':'2','S':'5','B':'8','G':'6'};
  const FIX_L = {'0':'O','1':'I','2':'Z','5':'S','8':'B','6':'G'};

  // ─── ESTADO MÓDULO ────────────────────────────────────────────────────────
  let _tessWorker   = null;
  let _tessReady    = false;
  let _tessLoading  = false;
  let _camStream    = null;
  let _scanLoop     = null;
  let _prevFrame    = null;
  let _stableStart  = null;
  let _scanning     = false;
  let _lastPlate    = null;
  let _autoMode     = false;
  let _camResultMat = '';

  // ─── DB.ocrStats INIT ─────────────────────────────────────────────────────
  function ensureOcrStats() {
    if (!window.DB) return;
    if (!DB.ocrStats) DB.ocrStats = [];
    if (!DB.ocrService) DB.ocrService = 'vision'; // 'vision' | 'local'
  }

  // ─── REGISTRO ESTADÍSTICA ─────────────────────────────────────────────────
  function logOcrStat(servicio, exito, matricula, duracionMs) {
    ensureOcrStats();
    if (!window.DB) return;
    const now = new Date();
    DB.ocrStats.push({
      ts:          now.toISOString(),
      fecha:       now.toISOString().slice(0, 10),
      hora:        now.toISOString().slice(11, 16),
      servicio,                    // 'vision' | 'local'
      exito,                       // true | false
      matricula:   matricula || '',
      duracionMs:  duracionMs || 0,
      usuario:     window.CU?.nombre || '?',
    });
    // Limitar a 2000 registros
    if (DB.ocrStats.length > 2000) DB.ocrStats = DB.ocrStats.slice(-2000);
    if (typeof saveDB === 'function') saveDB();
  }

  // ─── SERVICIO ACTIVO ──────────────────────────────────────────────────────
  function getService() {
    ensureOcrStats();
    return (window.DB && DB.ocrService) || 'vision';
  }

  function setService(svc) {
    ensureOcrStats();
    if (!window.DB) return;
    DB.ocrService = svc;
    if (typeof saveDB === 'function') saveDB();
    _updateCamBadge();
    renderOcrStatsSection();
    if (typeof toast === 'function')
      toast(svc === 'local' ? '🔌 OCR Local activado' : '☁️ Google Vision activado', '#4a5568', 2500);
  }

  // ─── TESSERACT INIT ───────────────────────────────────────────────────────
  async function initTesseract() {
    if (_tessReady) return true;
    if (_tessLoading) {
      // Esperar a que cargue
      for (let i = 0; i < 60; i++) {
        await _sleep(500);
        if (_tessReady) return true;
      }
      return false;
    }
    _tessLoading = true;
    _setStatus('⏳ Cargando OCR local (primera vez)...');
    try {
      if (!window.Tesseract) await _loadScript(TESS_CDN);
      _tessWorker = await Tesseract.createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/worker.min.js',
        langPath:   'https://cdn.jsdelivr.net/npm/tesseract.js-data@4',
        corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract-core.wasm.js',
        logger:     () => {},
      });
      await _tessWorker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        tessedit_pageseg_mode:   '7',
        preserve_interword_spaces: '0',
      });
      _tessReady   = true;
      _tessLoading = false;
      return true;
    } catch (e) {
      _tessLoading = false;
      console.error('[OCR] Tesseract init error:', e);
      return false;
    }
  }

  // ─── PREPROCESADO ─────────────────────────────────────────────────────────
  function _preprocess(src) {
    const W = src.width || src.videoWidth;
    const H = src.height || src.videoHeight;
    const scale = Math.max(1, Math.min(4, 420 / W));
    const c = document.createElement('canvas');
    c.width  = Math.round(W * scale);
    c.height = Math.round(H * scale);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, c.width, c.height);
    // Binarización adaptativa simplificada
    const id = ctx.getImageData(0, 0, c.width, c.height);
    const d  = id.data;
    let sum  = 0;
    for (let i = 0; i < d.length; i += 4)
      sum += (d[i]*77 + d[i+1]*150 + d[i+2]*29) >> 8;
    const mean = sum / (d.length / 4);
    for (let i = 0; i < d.length; i += 4) {
      const g = (d[i]*77 + d[i+1]*150 + d[i+2]*29) >> 8;
      const v = g > mean * 0.85 ? 255 : 0;
      d[i] = d[i+1] = d[i+2] = v;
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  function _invert(src) {
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0);
    const id = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < id.data.length; i += 4) {
      id.data[i]   = 255 - id.data[i];
      id.data[i+1] = 255 - id.data[i+1];
      id.data[i+2] = 255 - id.data[i+2];
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }

  // ─── SCORING & EXTRACCIÓN ─────────────────────────────────────────────────
  // _scorePlate global para callClaudeOCR del INDEX
  window._scorePlate = _score;

  function _score(txt) {
    const t = txt.replace(/[^A-Z0-9]/g, '');
    if (t.length < 3 || t.length > 12) return 0;
    if (BLACKLIST.has(t)) return -20;
    if (/^[A-Z]{5,}$/.test(t)) return -8; // marcas: SCHMITZ, SCANIA, VOLVO...
    let s = t.length;
    let _bestBonus = 0;
    for (const [_cc, _r] of Object.entries(PAT)) {
      if (_r.test(t)) { const _alts=(_r.source.match(/\|/g)||[]).length; const _b = 15 + Math.min(5, Math.floor(_r.source.length/10/(_alts+1))); if(_b>_bestBonus)_bestBonus=_b; }
    }
    s += _bestBonus;
    const hasL = /[A-Z]/.test(t), hasD = /[0-9]/.test(t);
    if (hasL && hasD) s += 10;
    if (!hasD) s -= 8; // penalizar sin dígitos
    return s;
  }

  const SCHEMAS = {
    ES:'DDDDLLL',FR:'LLDDDLL',DE:'LLLDDD',IT:'LLDDDLL',GB:'LLDDLLL',
    PL:'LLLAAAAA',PT:'LLDDLL',NL:'LLDDLL',BE:'DLLLDDD',AT:'LLLDDD',
    CH:'LLDDDDDD',SE:'LLLDDA',NO:'LLDDDDD',DK:'LLDDDDD',CZ:'DLLDDDD',
    SK:'LLDDDLL',HU:'LLLDDD',RO:'LLDDDLLL',BG:'LLDDDDLL',HR:'LLDDDLL',
    TR:'DDLLLDDDD',UA:'LLDDDDLL',BY:'DDDDLLD',
    RS:'LLDDDLL',GE:'LLDDDLL',AL:'LLDDDLL',MK:'LLDDDDLL',
    AM:'DDLLDDD',AZ:'DDLLDDD',XK:'DDLLLDDD',
  };

  function _matchCountry(plate) {
    for (const [cc, r] of Object.entries(PAT)) {
      if (r.test(plate)) return { cc, schema: SCHEMAS[cc] || '' };
    }
    return null;
  }

  function _applySchema(plate, schema) {
    if (!schema) return plate;
    let out = '';
    for (let i = 0; i < plate.length; i++) {
      const c = plate[i], s = schema[i];
      if (s === 'D' && isNaN(parseInt(c)) && FIX_D[c]) out += FIX_D[c];
      else if (s === 'L' && !isNaN(parseInt(c)) && FIX_L[c]) out += FIX_L[c];
      else out += c;
    }
    return out;
  }

  // Mapa cirílico→latino para matrículas rusas/ucranianas leídas por OCR
  const CYR2LAT = {'А':'A','В':'B','Е':'E','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','У':'Y','Х':'X'};

  function _extractPlate(rawText) {
    // 1. Normalizar: cirílico→latino, mayúsculas
    let norm = rawText.toUpperCase();
    Object.entries(CYR2LAT).forEach(([c,l]) => { norm = norm.split(c).join(l); });

    // 2. Tokenizar
    const tokens = norm
      .replace(/[^A-Z0-9\s\-·\.]/g, ' ')
      .split(/[\s\-·\.]+/)
      .map(t => t.trim())
      .filter(t => t.length >= 1 && (t.length >= 2 || /^[A-Z0-9]$/.test(t)));

    // 3. Generar candidatos: tokens simples + combinaciones 2, 3 y 4
    const cands = [];
    for (let i = 0; i < tokens.length; i++) {
      cands.push({ text: tokens[i], score: _score(tokens[i]) });

      // Combinación 2 tokens (no blacklisteados)
      if (i + 1 < tokens.length) {
        const bl1 = BLACKLIST.has(tokens[i]), bl2 = BLACKLIST.has(tokens[i+1]);
        if (!bl1 && !bl2) {
          const c2 = tokens[i] + tokens[i+1];
          cands.push({ text: c2, score: _score(c2) + 2 });
        }
      }

      // Combinación 3 tokens
      if (i + 2 < tokens.length) {
        const bl1=BLACKLIST.has(tokens[i]),bl2=BLACKLIST.has(tokens[i+1]),bl3=BLACKLIST.has(tokens[i+2]);
        // FIX-D: no incluir token de 1 char LETRA al final si el anterior ya es numérico
        // FIX-D: evitar añadir letra suelta al final solo si el resultado sería >8 chars
        const c3preview = tokens[i]+tokens[i+1]+tokens[i+2];
        const lastIsTrailingChar = tokens[i+2].length === 1 && /^[A-Z]$/.test(tokens[i+2]) && /^\d+$/.test(tokens[i+1]) && c3preview.length > 8;
        if (!bl1 && !bl2 && !bl3 && !lastIsTrailingChar) {
          const c3 = tokens[i] + tokens[i+1] + tokens[i+2];
          cands.push({ text: c3, score: _score(c3) + 3 });
        }
      }

      // FIX-B: Combinación 4 tokens (para matrículas fragmentadas en 4 partes)
      if (i + 3 < tokens.length) {
        const bl1=BLACKLIST.has(tokens[i]),bl2=BLACKLIST.has(tokens[i+1]);
        const bl3=BLACKLIST.has(tokens[i+2]),bl4=BLACKLIST.has(tokens[i+3]);
        if (!bl1 && !bl2 && !bl3 && !bl4) {
          const c4 = tokens[i] + tokens[i+1] + tokens[i+2] + tokens[i+3];
          // Solo si la combinación tiene sentido como matrícula (5-10 chars)
          if (c4.length >= 5 && c4.length <= 10) {
            cands.push({ text: c4, score: _score(c4) + 4 });
          }
        }
      }
    }

    // Ordenar por score desc, desempatar por longitud desc (más chars = más info)
    cands.sort((a, b) => b.score !== a.score ? b.score - a.score : b.text.length - a.text.length);
    const best = cands[0];

    // Preferir candidato alfanumérico con longitud mínima de matrícula real (5 chars)
    const bestAlpha = cands.find(c =>
      /[A-Z]/.test(c.text) && /[0-9]/.test(c.text) &&
      c.score >= 6 &&
      c.text.replace(/[^A-Z0-9]/g,'').length >= 5
    );
    const winner = bestAlpha || (best && best.score >= 8 ? best : null);
    if (!winner) return null;

    let plate = winner.text.replace(/[^A-Z0-9]/g, '');

    // FIX-A: validar que el resultado casa con algún patrón conocido
    // Si no casa directo, intentar schema correction con países candidatos
    let matched = _matchCountry(plate);

    // Si no casa directo, intentar schema correction con países candidatos
    // Precorrección: si el primer char es confusor letra-dígito y el resultado casa con país
    // Precorrección: corregir confusor en pos-0 si la versión corregida tiene score >= original
    if (plate.length >= 5 && FIX_D[plate[0]] && /^[0-9]{2}/.test(plate.slice(1))) {
      const _pre = FIX_D[plate[0]] + plate.slice(1);
      if (_matchCountry(_pre) && _score(_pre) >= _score(plate)) plate = _pre;
    }
    let matched = _matchCountry(plate);
    const matchedScore = matched ? _score(plate) : -1;

    // FIX-C: precorrección de confusores OCR
    // Si ya hay match: solo probar variantes FIX_D (letra→dígito), no FIX_L que rompería
    // Si no hay match: probar ambos FIX_D y FIX_L
    if (plate.length >= 4) {
      const variants = new Set();
      for (let i = 0; i < plate.length; i++) {
        const c = plate[i];
        if (FIX_D[c]) variants.add(plate.slice(0,i) + FIX_D[c] + plate.slice(i+1));
        // FIX_L solo para chars internos (no pos 0) para evitar 1→I al inicio
        if (!matched && i > 0 && FIX_L[c]) variants.add(plate.slice(0,i) + FIX_L[c] + plate.slice(i+1));
      }
      let bestV = null, bestVScore = matchedScore, bestVM = null;
      for (const v of variants) {
        const m2 = _matchCountry(v);
        if (m2) { const vs = _score(v); if (vs > bestVScore) { bestVScore = vs; bestV = v; bestVM = m2; } }
      }
      if (bestV) { plate = bestV; matched = bestVM; }
    }

    // FIX-E: schema correction multi-pass con todos los países candidatos
    if (!matched) {
      const tryCCs = ['ES','FR','GB','DE','IT','PT','NL','BE','AT','CH','UA','TR','RO','BY','PL','HU','SE','NO','DK','BG','HR','SK','CZ','LV','LT','LU','EE','IE','CY','MT','MD','GE','AM','AZ','RS','BA','ME','MK','AL','XK'];
      for (const tryCC of tryCCs) {
        const trySchema = SCHEMAS[tryCC];
        if (!trySchema) continue;
        const schemaLen = trySchema.replace(/[^DLA]/g,'').length;
        if (schemaLen !== plate.length) continue;
        const corrected = _applySchema(plate, trySchema);
        if (corrected !== plate) {
          const m2 = _matchCountry(corrected);
          if (m2 && m2.cc === tryCC) { plate = corrected; matched = m2; break; }
        }
      }
    }

    // Validación final: sin match de país, criterios más estrictos
    if (!matched) {
      if (_score(plate) < 15) return null;
      if (!(/[A-Z]/.test(plate) && /[0-9]/.test(plate))) return null;
      // Sin match de país conocido, el string NO es una matrícula reconocible
      return null;
    }

    return { plate, country: matched?.cc || null, score: winner.score };
  }

  // ─── OCR LOCAL (TESSERACT) ────────────────────────────────────────────────
  async function _runLocalOCR(source) {
    if (!_tessReady) {
      const ok = await initTesseract();
      if (!ok) return null;
    }

    // Construir canvas desde source
    const base = document.createElement('canvas');
    const bCtx = base.getContext('2d');
    if (source instanceof HTMLVideoElement) {
      base.width = source.videoWidth; base.height = source.videoHeight;
      bCtx.drawImage(source, 0, 0);
    } else if (source instanceof HTMLCanvasElement) {
      base.width = source.width; base.height = source.height;
      bCtx.drawImage(source, 0, 0);
    } else if (source instanceof Blob || source instanceof File) {
      const bmp = await createImageBitmap(source);
      base.width = bmp.width; base.height = bmp.height;
      bCtx.drawImage(bmp, 0, 0);
    }

    // 3 variantes: binarizado, original, invertido
    const variants = [_preprocess(base), base, _invert(_preprocess(base))];
    // También probar con pageseg_mode=6 (bloque uniforme) en el binarizado
    const modes = ['7', '7', '7', '6'];
    variants.push(_preprocess(base));

    let bestResult = null;

    for (let i = 0; i < variants.length; i++) {
      try {
        if (modes[i] !== '7') {
          await _tessWorker.setParameters({ tessedit_pageseg_mode: modes[i] });
        }
        const { data } = await _tessWorker.recognize(variants[i]);
        if (modes[i] !== '7') {
          await _tessWorker.setParameters({ tessedit_pageseg_mode: '7' });
        }
        const result = _extractPlate(data.text || '');
        if (result && (!bestResult || result.score > bestResult.score)) {
          bestResult = { ...result, confidence: data.confidence };
        }
        // Resultado bueno con patrón conocido → parar
        if (bestResult?.country && (bestResult.confidence || 0) > 65) break;
      } catch (e) { /* continuar con la siguiente variante */ }
    }

    // Si no hay resultado bueno, intentar con rotaciones (matrículas fotografiadas de lado)
    if (!bestResult || bestResult.score < 10) {
      const rotResult = await _tryRotations(source);
      if (rotResult && rotResult.score > (bestResult?.score || 0)) return rotResult;
    }
    return bestResult && bestResult.score >= 5 ? bestResult : null;
  }

  // ─── OCR VISION (reusar lógica existente en INDEX) ────────────────────────
  // Wrapeamos callClaudeOCR original conservándola intacta
  function _runVisionOCR(blob) {
    return new Promise(resolve => {
      // Reusar el flujo existente de Google Vision
      // Al terminar, leer camResultMat
      const _orig = window.camResultMat || '';
      const _origStatus = document.getElementById('camStatus')?.textContent || '';

      // Llamar al callClaudeOCR original (ya existe en INDEX)
      if (typeof window._origCallClaudeOCR === 'function') {
        window._origCallClaudeOCR(blob, false).then(() => {
          const mat = window.camResultMat || '';
          resolve(mat ? { plate: mat, country: null, score: 10 } : null);
        }).catch(() => resolve(null));
      } else {
        // fallback: no hay Vision disponible
        resolve(null);
      }
    });
  }

  // ─── OCR UNIFICADO ────────────────────────────────────────────────────────
  async function runOCR(source) {
    const t0 = Date.now();
    const svc = getService();

    try {
      let result = null;

      if (svc === 'local') {
        result = await _runLocalOCR(source);
      } else {
        // Vision — convertir a blob si hace falta
        let blob = source;
        if (source instanceof HTMLVideoElement || source instanceof HTMLCanvasElement) {
          blob = await new Promise(res => {
            const c = document.createElement('canvas');
            c.width = source.videoWidth || source.width;
            c.height = source.videoHeight || source.height;
            c.getContext('2d').drawImage(source, 0, 0);
            c.toBlob(res, 'image/jpeg', 0.92);
          });
        }
        result = await _runVisionOCR(blob);
      }

      const dur = Date.now() - t0;
      logOcrStat(svc, !!result, result?.plate || '', dur);
      return result;

    } catch (e) {
      logOcrStat(svc, false, '', Date.now() - t0);
      return null;
    }
  }

  // ─── DETECCIÓN DE MOVIMIENTO ──────────────────────────────────────────────
  function _getFrame(video) {
    const scale = Math.min(1, 320 / video.videoWidth);
    const c = document.createElement('canvas');
    c.width  = Math.round(video.videoWidth * scale);
    c.height = Math.round(video.videoHeight * scale);
    c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
    return c.getContext('2d').getImageData(0, 0, c.width, c.height);
  }

  function _frameDiff(a, b) {
    let diff = 0;
    const step = 16;
    for (let i = 0; i < a.data.length; i += step) diff += Math.abs(a.data[i] - b.data[i]);
    return diff / (a.data.length / step);
  }

  function _startMotionLoop(video) {
    if (_scanLoop) clearInterval(_scanLoop);
    _prevFrame = null; _stableStart = null;

    _scanLoop = setInterval(async () => {
      if (!video.srcObject || _scanning || video.readyState < 2) return;

      const frame = _getFrame(video);
      if (!_prevFrame) { _prevFrame = frame; return; }

      const diff = _frameDiff(_prevFrame, frame);
      _prevFrame = frame;

      if (diff > MOTION_THRESHOLD) {
        _stableStart = null;
        _setStatus('🚛 Detectando vehículo...');
        return;
      }

      if (!_stableStart) { _stableStart = Date.now(); return; }

      const elapsed = Date.now() - _stableStart;
      const pct = Math.min(100, Math.round(elapsed / STABILITY_MS * 100));
      _setStatus('📸 Estabilizando... ' + pct + '%');

      if (elapsed >= STABILITY_MS && _autoMode && !_scanning) {
        _stableStart = null;
        await _captureAndProcess(video);
      }

    }, SCAN_INTERVAL_MS);
  }

  // ─── CAPTURA & PROCESO ────────────────────────────────────────────────────
  async function _captureAndProcess(source) {
    if (_scanning) return;
    _scanning = true;
    _setStatus('🔍 Analizando...');
    _setResult('');

    try {
      const result = await runOCR(source);

      if (result?.plate) {
        const plate = result.plate;
        if (plate === _lastPlate && _autoMode) {
          _setStatus('✅ En espera de nuevo vehículo...');
          _scanning = false;
          return;
        }
        _lastPlate = plate;
        _camResultMat = plate;
        window.camResultMat = plate;
        _setResult(plate, result.country);
        _setStatus('✅ Detectada' + (result.country ? ' · ' + result.country : ''));

        const btnUse = document.getElementById('btnCamUse');
        if (btnUse) { btnUse.style.display = 'inline-flex'; btnUse.onclick = () => _fillForm(plate, result.country); }

        if (_autoMode) {
          await _sleep(500);
          _fillForm(plate, result.country);
          await _sleep(4000);
          _lastPlate = null;
        }
      } else {
        _setStatus(_autoMode ? '🔍 Esperando matrícula...' : '❌ No detectada. Intenta de nuevo.');
      }
    } catch (e) {
      _setStatus('❌ Error: ' + e.message);
    } finally {
      _scanning = false;
    }
  }

  // ─── FILL FORM ────────────────────────────────────────────────────────────
  function _fillForm(plate, country) {
    const el = document.getElementById('fiMat');
    if (!el) return;
    el.value = plate;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (typeof checkMatOnInput === 'function') checkMatOnInput(plate);
    if (typeof searchMatUnified === 'function') searchMatUnified(plate);
    if (country) {
      const pEl = document.getElementById('fiPais');
      if (pEl && !pEl.value) pEl.value = country;
    }
    _closeCam();
    // Abrir modal ingreso si no está abierto
    const mIng = document.getElementById('mIng');
    if (mIng && !mIng.classList.contains('open') && typeof openIngModal === 'function') {
      openIngModal(null);
      setTimeout(() => {
        const el2 = document.getElementById('fiMat');
        if (el2 && !el2.value) {
          el2.value = plate;
          if (typeof checkMatOnInput === 'function') checkMatOnInput(plate);
        }
      }, 80);
    }
    if (typeof toast === 'function') toast('✅ Matrícula: ' + plate, 'var(--text2)', 3000);
  }

  // ─── UI HELPERS ───────────────────────────────────────────────────────────
  function _setStatus(msg) { const el = document.getElementById('camStatus'); if (el) el.textContent = msg; }
  function _setResult(plate, country) {
    const el = document.getElementById('camResult');
    if (!el) return;
    el.textContent = plate ? plate + (country ? '  [' + country + ']' : '') : '';
    if (plate) el.style.color = '#059669';
  }
  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function _loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function _closeCam() {
    if (window._camStream || _camStream) {
      const s = window._camStream || _camStream;
      s.getTracks().forEach(t => t.stop());
      window._camStream = null; _camStream = null;
    }
    if (_scanLoop) { clearInterval(_scanLoop); _scanLoop = null; }
    if (typeof closeOv === 'function') closeOv('mCam');
  }

  // ─── BADGE SERVICIO EN MODAL CÁMARA ──────────────────────────────────────
  function _updateCamBadge() {
    const existing = document.getElementById('_ocrSvcBadge');
    const modal = document.querySelector('#mCam .modal');
    if (!modal) return;

    const svc = getService();
    const label = svc === 'local' ? '🔌 OCR Local' : '☁️ Vision';
    const color = svc === 'local' ? '#059669' : '#2563eb';

    if (existing) {
      existing.textContent = label;
      existing.style.background = color;
    } else {
      const badge = document.createElement('div');
      badge.id = '_ocrSvcBadge';
      badge.textContent = label;
      badge.style.cssText = `position:absolute;top:8px;right:8px;background:${color};color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;pointer-events:none;z-index:10`;
      const videoWrap = modal.querySelector('div[style*="position:relative"]');
      if (videoWrap) { videoWrap.style.position = 'relative'; videoWrap.appendChild(badge); }
      else modal.insertBefore(badge, modal.firstChild);
    }
  }

  // ─── OVERRIDE openCamModal ────────────────────────────────────────────────
  // Guardamos el original de Vision para no perderlo
  if (typeof window.callClaudeOCR === 'function' && !window._origCallClaudeOCR) {
    window._origCallClaudeOCR = window.callClaudeOCR;
  }

  const _origOpenCamModal = window.openCamModal;
  window.openCamModal = function () {
    // Reset UI
    _setResult('');
    _setStatus('');
    _lastPlate = null;
    _scanning  = false;
    _camResultMat = '';
    window.camResultMat = '';
    _autoMode = false;
    const btnUse = document.getElementById('btnCamUse');
    if (btnUse) btnUse.style.display = 'none';

    const svc = getService();

    if (svc === 'local') {
      // Flujo local
      const modal = document.getElementById('mCam');
      if (!modal) return;
      _ensureLocalUI();

      navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      }).then(stream => {
        _camStream = stream;
        window._camStream = stream;
        const v = document.getElementById('camFeed');
        if (v) { v.srcObject = stream; v.style.display = 'block'; }
        modal.classList.add('open');
        setTimeout(_updateCamBadge, 100);
        initTesseract().then(ok => {
          _setStatus(ok ? '📷 Listo — apunta a la matrícula' : '⚠️ Error iniciando OCR local');
        });
        if (v) v.onloadedmetadata = () => _startMotionLoop(v);
      }).catch(() => {
        document.getElementById('cameraInput')?.click();
      });
    } else {
      // Flujo Vision original
      if (typeof _origOpenCamModal === 'function') _origOpenCamModal();
      setTimeout(() => {
        _updateCamBadge();
        _ensureCamToggle();
        const v = document.getElementById('camFeed');
        if (v && _autoMode) v.onloadedmetadata = () => _startVisionMotionLoop(v);
        if (v && v.readyState >= 2 && _autoMode) _startVisionMotionLoop(v);
      }, 400);
    }
  };

  // Override captureOCR para el servicio activo
  const _origCaptureOCR = window.captureOCR;
  window.captureOCR = async function () {
    const svc = getService();
    if (svc === 'local') {
      const v = document.getElementById('camFeed');
      if (!v?.srcObject) { _setStatus('Sin cámara activa'); return; }
      await _captureAndProcess(v);
    } else {
      if (typeof _origCaptureOCR === 'function') _origCaptureOCR();
    }
  };

  // Override useCamResult
  window.useCamResult = function () {
    const mat = window.camResultMat || _camResultMat;
    if (!mat) return;
    _fillForm(mat, null);
  };

  // Override closeCam
  const _origCloseCam = window.closeCam;
  window.closeCam = function () {
    if (_scanLoop) { clearInterval(_scanLoop); _scanLoop = null; }
    if (typeof _origCloseCam === 'function') _origCloseCam();
    else _closeCam();
  };

  // ─── UI LOCAL EN MODAL ────────────────────────────────────────────────────
  function _ensureLocalUI() {
    const modal = document.querySelector('#mCam .modal');
    if (!modal || document.getElementById('_autoBtn')) return;

    // Añadir botón AUTO debajo de los botones existentes
    const btnRow = modal.querySelector('div[style*="display:flex"][style*="gap:8px"]');
    if (!btnRow) return;

    const autoBtn = document.createElement('button');
    autoBtn.id = '_autoBtn';
    autoBtn.className = 'btn btn-gh btn-sm';
    autoBtn.style.cssText = 'flex:1;font-size:11px';
    autoBtn.textContent = '🔄 AUTO OFF';
    autoBtn.onclick = function () {
      _autoMode = !_autoMode;
      autoBtn.textContent = _autoMode ? '🔄 AUTO ON' : '🔄 AUTO OFF';
      autoBtn.style.background = _autoMode ? '#059669' : '';
      autoBtn.style.color = _autoMode ? '#fff' : '';
      _setStatus(_autoMode ? '🚛 Detectando vehículo...' : '📷 Modo manual');
      if (_autoMode) {
        const v = document.getElementById('camFeed');
        if (v) _startMotionLoop(v);
      } else {
        if (_scanLoop) { clearInterval(_scanLoop); _scanLoop = null; }
      }
    };
    btnRow.appendChild(autoBtn);
  }

  // ─── SECCIÓN SA EN TAB-USUARIOS ───────────────────────────────────────────
  function renderOcrStatsSection() {
    const container = document.getElementById('_ocrStatsSection');
    if (!container) return;
    if (!window.DB) return;
    ensureOcrStats();
    const svc = getService();
    const stats = DB.ocrStats || [];

    const byService = { vision:{intentos:0,exitosos:0}, local:{intentos:0,exitosos:0} };
    stats.forEach(s => {
      const sv = s.servicio || 'vision';
      if (!byService[sv]) byService[sv] = {intentos:0,exitosos:0};
      byService[sv].intentos++;
      if (s.exito) byService[sv].exitosos++;
    });
    const vI=byService.vision.intentos, vE=byService.vision.exitosos, vF=vI-vE;
    const lI=byService.local.intentos,  lE=byService.local.exitosos,  lF=lI-lE;
    const tI=vI+lI, tE=vE+lE, tF=tI-tE;
    const vTasa=vI?Math.round(vE/vI*100):0;
    const lTasa=lI?Math.round(lE/lI*100):0;
    const tTasa=tI?Math.round(tE/tI*100):0;

    const days=[];
    for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d.toISOString().slice(0,10));}
    const byDay=days.map(fecha=>{
      const ds=stats.filter(s=>s.fecha===fecha);
      const vD=ds.filter(s=>s.servicio==='vision'), lD=ds.filter(s=>s.servicio==='local');
      return {fecha,vI:vD.length,vE:vD.filter(s=>s.exito).length,lI:lD.length,lE:lD.filter(s=>s.exito).length,tI:ds.length,tE:ds.filter(s=>s.exito).length};
    });
    const maxDay=Math.max(1,...byDay.map(d=>d.tI));

    const recientes=[...stats].reverse().slice(0,10);
    const today=new Date().toISOString().slice(0,10);

    const tasaBadge=(n,t)=>{
      const cls=n>=70?`background:var(--gll);color:var(--green)`:n>=40?`background:var(--all);color:var(--amber)`:`background:var(--rll);color:var(--red)`;
      return `<span style="display:inline-block;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:800;margin-top:4px;${cls}">${t?n+'%':'–'}</span>`;
    };

    container.innerHTML = `<div style="padding:14px;background:var(--bg3);border:1.5px solid var(--border);border-radius:var(--r2)">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
<div style="font-size:12px;font-weight:800">📷 OCR — Servicio activo</div>
<div style="display:flex;gap:6px">
<button onclick="window._OCR.setService('vision');window._OCR.renderStats();if(window._updateOcrSvcToggleUI)window._updateOcrSvcToggleUI()" style="padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${svc==='vision'?'#2563eb':'var(--border)'};background:${svc==='vision'?'#2563eb':'var(--bg2)'};color:${svc==='vision'?'#fff':'var(--text3)'}">☁️ Google Vision</button>
<button onclick="window._OCR.setService('local');window._OCR.renderStats();if(window._updateOcrSvcToggleUI)window._updateOcrSvcToggleUI()" style="padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;border:1.5px solid ${svc==='local'?'var(--green)':'var(--border)'};background:${svc==='local'?'var(--green)':'var(--bg2)'};color:${svc==='local'?'#fff':'var(--text3)'}">🔌 OCR Local</button>
</div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:14px">
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px">
<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;color:#2563eb">☁️ Vision</div>
<div style="font-size:22px;font-weight:900;line-height:1;color:#2563eb">${vI}</div>
<div style="font-size:10px;color:var(--text3);margin-top:4px">intentos</div>
<div style="font-size:10px;color:var(--text3);margin-top:4px">${vE} ok · ${vF} fail</div>
${tasaBadge(vTasa,vI)}
</div>
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px">
<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;color:var(--green)">🔌 Local</div>
<div style="font-size:22px;font-weight:900;line-height:1;color:var(--green)">${lI}</div>
<div style="font-size:10px;color:var(--text3);margin-top:4px">intentos</div>
<div style="font-size:10px;color:var(--text3);margin-top:4px">${lE} ok · ${lF} fail</div>
${tasaBadge(lTasa,lI)}
</div>
<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px">
<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;color:var(--text3)">📊 Total</div>
<div style="font-size:22px;font-weight:900;line-height:1">${tI}</div>
<div style="font-size:10px;color:var(--text3);margin-top:4px">intentos</div>
<div style="font-size:10px;color:var(--text3);margin-top:4px">${tE} ok · ${tF} fail</div>
${tasaBadge(tTasa,tI)}
</div>
</div>
<div style="font-size:10px;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Últimos 7 días</div>
<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:10px">
<thead><tr style="color:var(--text3)">
<th style="text-align:left;padding:3px 6px;font-weight:700">Fecha</th>
<th style="text-align:right;padding:3px 6px;color:#2563eb">☁️ Int</th>
<th style="text-align:right;padding:3px 6px;color:#2563eb">☁️ ✓</th>
<th style="text-align:right;padding:3px 6px;color:var(--green)">🔌 Int</th>
<th style="text-align:right;padding:3px 6px;color:var(--green)">🔌 ✓</th>
<th style="text-align:right;padding:3px 6px;font-weight:800">Total</th>
<th style="text-align:right;padding:3px 6px;font-weight:800">✓%</th>
<th style="padding:3px 6px;min-width:60px"></th>
</tr></thead>
<tbody>${byDay.map(d=>{
  const tasa=d.tI?Math.round(d.tE/d.tI*100):0;
  const barW=Math.round(d.tI/maxDay*100);
  const isHoy=d.fecha===today;
  const tc=tasa>=70?'var(--green)':tasa>=40?'var(--amber)':'var(--red)';
  return `<tr style="border-top:1px solid var(--border);${isHoy?'background:var(--bll);font-weight:700':''}">
<td style="padding:4px 6px">${d.fecha.slice(5)}${isHoy?' ◀':''}</td>
<td style="text-align:right;padding:4px 6px;color:#2563eb">${d.vI||'–'}</td>
<td style="text-align:right;padding:4px 6px;color:#2563eb">${d.vE||'–'}</td>
<td style="text-align:right;padding:4px 6px;color:var(--green)">${d.lI||'–'}</td>
<td style="text-align:right;padding:4px 6px;color:var(--green)">${d.lE||'–'}</td>
<td style="text-align:right;padding:4px 6px;font-weight:700">${d.tI||0}</td>
<td style="text-align:right;padding:4px 6px;font-weight:700;color:${tc}">${d.tI?tasa+'%':'–'}</td>
<td style="padding:4px 6px"><div style="height:6px;border-radius:3px;background:var(--border);overflow:hidden;min-width:60px"><div style="height:100%;width:${barW}%;border-radius:3px;background:${isHoy?'#4a5568':'#c8cdd9'}"></div></div></td>
</tr>`;}).join('')}</tbody>
</table></div>
<div onclick="var p=this.nextElementSibling;var o=p.style.display==='none';p.style.display=o?'flex':'none';this.querySelector('span').textContent=o?'▲':'▼'" style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text3);cursor:pointer;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
<span>▼</span><span>Últimos escaneos</span>
</div>
<div style="display:none;flex-direction:column;gap:4px;margin-top:8px">
${recientes.length?recientes.map(s=>{
  const hora=s.ts?new Date(s.ts).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):'–';
  const isHoy=(s.fecha||'')===today;
  const isV=s.servicio==='vision';
  return `<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;background:var(--bg2);border-radius:var(--r);border:1px solid var(--border)">
<span style="color:${s.exito?'var(--green)':'var(--red)'};font-size:11px">${s.exito?'✓':'✗'}</span>
<span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;min-width:70px">${s.matricula||'—'}</span>
<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:10px;background:${isV?'#eff6ff':'var(--gll)'};color:${isV?'#2563eb':'var(--green)'}">${isV?'Vision':'Local'}</span>
<span style="font-size:10px;color:var(--text3);margin-left:auto">${isHoy?'Hoy':s.fecha||'–'} ${hora}</span>
</div>`;}).join(''):'<div style="font-size:11px;color:var(--text3);padding:8px 0">Sin escaneos registrados</div>'}
</div>
<div style="display:flex;justify-content:flex-end;margin-top:12px">
<button onmouseover="this.style.borderColor='var(--red)';this.style.color='var(--red)'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text3)'" style="background:none;border:1px solid var(--border);color:var(--text3);border-radius:20px;padding:4px 12px;font-size:10px;cursor:pointer;font-weight:600" onclick="window._OCR.resetStats()">🗑 Resetear contadores</button>
</div>
</div>`;
  }


