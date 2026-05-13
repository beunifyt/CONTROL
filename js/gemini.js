// ═══════════════════════════════════════════════════════════════
// gemini.js — Cliente Google Gemini API (Free tier)
//
// Modelos Free tier:
//   - gemini-2.0-flash:     200 req/día,  15 req/min  (calidad alta)
//   - gemini-1.5-flash-8b:  1500 req/día, 15 req/min  ← RECOMENDADO
//   - gemini-1.5-flash:     1500 req/día, 15 req/min
//
// Para activar:
//   1. Ve a https://aistudio.google.com/app/apikey y crea una API key
//   2. Añade en firebase-config.js:
//        export const geminiApiKey = 'AIza...';
// ═══════════════════════════════════════════════════════════════
import { logger } from './logger.js';

const GEMINI_MODEL = 'gemini-2.5-flash-lite'; // 1500 req/día gratis

let _apiKey = '';
try{
  const cfg = await import('./firebase-config.js');
  _apiKey = cfg.geminiApiKey || '';
} catch(_){ /* sin config, ok */ }

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
    throw new Error('Gemini API key no configurada. Añade geminiApiKey en firebase-config.js');
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
