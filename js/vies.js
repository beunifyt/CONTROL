// ═══════════════════════════════════════════════════════════════
// vies.js — Verificación CIF/VAT contra VIES (UE)
//
// La API oficial de VIES (ec.europa.eu/taxation_customs/vies) tiene
// CORS bloqueado. Soluciones:
//
// OPCIÓN A (recomendada): Configurar un Cloudflare Worker como proxy
//    Ver instrucciones en: docs/CLOUDFLARE-WORKER-VIES.md
//    Apuntar VIES_PROXY_URL a tu worker
//
// OPCIÓN B (sin proxy): usar vatcomply.com (gratis pero con rate limit)
// ═══════════════════════════════════════════════════════════════

import { logger } from './logger.js';

// CONFIGURACIÓN: cambiar por tu propio worker o dejar fallback público
const VIES_PROXY_URL = ''; // p.ej. 'https://vies-proxy.tuusuario.workers.dev'
const VATCOMPLY_URL  = 'https://api.vatcomply.com/vat?vat_number=';

/**
 * @param {string} cif - CIF/VAT con o sin prefijo país (ej: "ESB12345678" o "B12345678")
 * @param {string} country - código país ISO 2 letras (opcional si el CIF lo incluye)
 * @returns {object} { valid, name, address, country, source, error? }
 */
export async function verifyVAT(cif, country = ''){
  const cleaned = (cif || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if(!cleaned) return { valid:false, error:'CIF vacío' };

  // Extraer país si está al inicio
  const COUNTRIES = ['AT','BE','BG','CY','CZ','DE','DK','EE','EL','ES','FI','FR','HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK','XI'];
  let cc = country.toUpperCase();
  let num = cleaned;
  if(!cc && COUNTRIES.includes(cleaned.slice(0, 2))){
    cc = cleaned.slice(0, 2);
    num = cleaned.slice(2);
  }
  if(!cc) cc = 'ES'; // default España

  // Intento 1: Cloudflare Worker propio
  if(VIES_PROXY_URL){
    try{
      const r = await fetch(`${VIES_PROXY_URL}/?country=${cc}&vat=${num}`, { mode:'cors' });
      if(r.ok){
        const d = await r.json();
        return {
          valid: !!d.valid,
          name: d.name || '',
          address: d.address || '',
          country: cc,
          source: 'VIES (proxy)'
        };
      }
    } catch(e){
      logger.warn('VIES proxy falló', { error: e.message });
    }
  }

  // Intento 2: vatcomply.com
  try{
    const r = await fetch(VATCOMPLY_URL + cc + num);
    if(r.ok){
      const d = await r.json();
      return {
        valid: !!d.valid,
        name: d.name || '',
        address: d.address || '',
        country: d.country_code || cc,
        source: 'vatcomply.com',
        format: d.format_valid
      };
    }
  } catch(e){
    logger.warn('vatcomply falló', { error: e.message });
  }

  return {
    valid: false,
    error: 'No se pudo verificar (servicio no disponible). Configura un Cloudflare Worker en docs/CLOUDFLARE-WORKER-VIES.md',
    source: 'offline'
  };
}

/** Validación local del formato del CIF español */
export function validateSpanishCIF(cif){
  const clean = (cif || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if(clean.length !== 9) return false;
  const letters = 'ABCDEFGHJKLMNPQRSUVW';
  if(!letters.includes(clean[0])) return false;
  return true;
}
