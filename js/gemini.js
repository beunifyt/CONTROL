// ═══════════════════════════════════════════════════════════════
// gemini.js — Cliente Google Gemini API (gratis hasta 60 req/min)
//
// Para activar:
//   1. Ve a https://aistudio.google.com/app/apikey y crea una API key
//   2. Añade en firebase-config.js:
//        export const geminiApiKey = 'AIza...';
//   3. Listo. El asistente usará automáticamente Gemini.
//
// Si no hay API key, los asistentes muestran mensaje de configuración.
// ═══════════════════════════════════════════════════════════════
import { logger } from './logger.js';

let _apiKey = '';
try{
  const cfg = await import('./firebase-config.js');
  _apiKey = cfg.geminiApiKey || '';
} catch(_){ /* sin config, ok */ }

// Comprueba si Gemini está disponible
export function isGeminiAvailable(){
  return !!_apiKey;
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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
      const err = await resp.text();
      logger.warn('Gemini error', { status: resp.status, err });
      throw new Error(`Gemini API error: ${resp.status}`);
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
