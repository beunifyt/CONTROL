// ═══════════════════════════════════════════════════════════════
// gemini.js — Cliente Google Gemini API (Free tier verificado mayo 2026)
//
// Modelos Free tier ACTIVOS:
//   - gemini-2.5-flash-lite: 1000 req/día, 15 req/min  ← RECOMENDADO
//   - gemini-2.5-flash:       250 req/día, 10 req/min  (más calidad)
//   - gemini-2.5-pro:         100 req/día,  5 req/min  (máxima calidad)
//
// DEPRECADOS (no usar):
//   - gemini-1.5-flash-8b (deprecado)
//   - gemini-2.0-flash    (retirado 3 marzo 2026)
//   - gemini-1.5-flash    (deprecado)
//
// Para activar:
//   1. Ve a https://aistudio.google.com/app/apikey y crea una API key
//   2. Guárdala en Firestore (consola de Firebase): colección config,
//      documento ai, campo geminiKey (texto). Nunca en el código: el repo es público.
//   3. En Google Cloud → Credenciales, restringe la clave a la API
//      «Generative Language» y a los dominios de la app.
// ═══════════════════════════════════════════════════════════════
import { logger } from './logger.js';
import { db } from './firebase-config.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const GEMINI_MODEL = 'gemini-2.5-flash-lite'; // 1000 req/día gratis

let _apiKey = '';
let _keyLoaded = null;

// Lee la clave de config/ai (reglas: solo personal activo). Una lectura por sesión.
export function loadGeminiKey(){
  if(_keyLoaded) return _keyLoaded;
  _keyLoaded = getDoc(doc(db, 'config', 'ai'))
    .then(snap => { _apiKey = (snap.exists() && snap.data().geminiKey) || ''; return !!_apiKey; })
    .catch(e => { logger.warn('Gemini: no se pudo leer config/ai', { error: e.message }); _keyLoaded = null; return false; });
  return _keyLoaded;
}

// Comprueba si Gemini está disponible
export function isGeminiAvailable(){
  return !!_apiKey;
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Envía un prompt al asistente Gemini.
 * @param {string} systemPrompt - instrucción del agente
 * @param {array} history - [{role:'user'|'model', text:'...'}]
 * @param {string} userMessage - último mensaje del usuario
 * @returns {Promise<string>} respuesta del modelo
 */
export async function chatWithGemini(systemPrompt, history, userMessage){
  if(!_apiKey){
    throw new Error('Gemini API key no configurada. Guárdala en Firestore: config/ai → geminiKey');
  }

  // Construir el array contents en formato Gemini
  const contents = [];
  for(const msg of history){
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text || msg.content || '' }]
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  const body = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024
    }
  };

  try{
    const resp = await fetch(`${GEMINI_URL}?key=${_apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if(!resp.ok){
      let detail = '';
      try{
        const errJson = await resp.json();
        detail = errJson?.error?.message || JSON.stringify(errJson);
      } catch(_){
        detail = await resp.text();
      }
      logger.warn('Gemini error', { status: resp.status, detail });

      // Mensajes amigables según código
      if(resp.status === 429){
        throw new Error('Has superado el límite de Gemini Free (15 req/min · 1500 req/día). Espera 1 min o cambia de modelo. Detalle: ' + detail);
      }
      if(resp.status === 400){
        throw new Error('Petición incorrecta. ' + detail);
      }
      if(resp.status === 403){
        throw new Error('API key inválida o sin permisos. ' + detail);
      }
      throw new Error(`Gemini ${resp.status}: ${detail}`);
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!text) throw new Error('Respuesta vacía de Gemini');
    return text;
  } catch(e){
    logger.error('Gemini fail', { error: e.message });
    throw e;
  }
}
