// ═══════════════════════════════════════════════════════════════
// autocomplete.js — Sistema de autocompletado en cascada
//
// Funciones:
// - matchMatricula(plate): busca en flota + histórico → datos
// - matchReferencia(ref): busca en agenda → datos absorbidos
// - matchConductor(nombre): busca en conductores → datos
// - matchEmpresa(nombreOCif): busca en empresas → datos + nivel
// - attachAutocomplete(input, type): liga un input a sugerencias
//
// Cuando un usuario rellena un campo, esta capa devuelve sugerencias
// y permite "absorber" todo el registro de golpe.
// ═══════════════════════════════════════════════════════════════

import { db } from './firebase-config.js';
import {
  collection, query, where, orderBy, limit, getDocs, doc, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { logger } from './logger.js';
import { normalize, el, debounce } from './utils.js';

// ── Caché eventos (sus flags se consultan en cada match) ──────
const _eventoCache = new Map();
async function getEventoFlags(eventoId){
  if(!eventoId) return null;
  if(_eventoCache.has(eventoId)){
    const e = _eventoCache.get(eventoId);
    if(Date.now() - e.t < 60000) return e.data;
  }
  try{
    const snap = await getDoc(doc(db, 'eventos', eventoId));
    if(!snap.exists()) return null;
    const d = snap.data();
    const flags = {
      tipoReferencia: d.tipoReferencia || 'unica',
      permiteHerenciaPasaporte: !!d.permiteHerenciaPasaporte,
      permiteAbsorberHistorial: !!d.permiteAbsorberHistorial
    };
    _eventoCache.set(eventoId, { data: flags, t: Date.now() });
    return flags;
  } catch(e){
    logger.warn(`getEventoFlags(${eventoId}) error`, { error: e.message });
    return null;
  }
}

// ── Cachés con TTL para no machacar Firestore ────────────────
const CACHE_TTL = 60 * 1000; // 1 minuto
const _cache = new Map(); // key → { data, t }

function cacheGet(key){
  const e = _cache.get(key);
  if(!e) return null;
  if(Date.now() - e.t > CACHE_TTL){ _cache.delete(key); return null; }
  return e.data;
}
function cacheSet(key, data){ _cache.set(key, { data, t: Date.now() }); }

// ═══════════════════════════════════════════════════════════════
// BÚSQUEDAS
// ═══════════════════════════════════════════════════════════════

/**
 * Match por matrícula.
 * Estrategia:
 *  1. Buscar en `flota` (datos maestros)
 *  2. Buscar en `referencias` (última)
 *  3. Buscar en `ingresos` (último)
 *  4. Buscar en `conductores.matriculas` array
 * Devuelve { source, data } o null.
 */
export async function matchMatricula(plate, eventoId = null){
  if(!plate || plate.length < 3) return null;
  const key = `mat:${plate}:${eventoId || 'noev'}`;
  const cached = cacheGet(key);
  if(cached !== null) return cached;

  const norm = String(plate).toUpperCase().trim();
  const flags = await getEventoFlags(eventoId);
  const absorber = flags?.permiteAbsorberHistorial !== false; // por defecto true si no hay flag
  const heredarPass = !!flags?.permiteHerenciaPasaporte;
  let result = null;

  try{
    // 1) Flota (fuente de verdad - tipo vehículo, remolque, empresa)
    const qFlota = query(collection(db, 'flota'),
      where('matricula', '==', norm), limit(1));
    const snapFlota = await getDocs(qFlota);
    if(!snapFlota.empty){
      const d = snapFlota.docs[0].data();
      result = {
        source: 'flota',
        sourceLabel: 'Flota',
        data: {
          matricula: d.matricula,
          remolque: d.remolque || '',
          empresa: d.empresa || '',
          empresaId: d.empresaId || null,
          tipoVehiculo: d.tipo || 'camion',
          marca: d.marca || '',
          modelo: d.modelo || '',
          tacografo: d.tacografo || ''
        }
      };
    }

    // 2) Última referencia (siempre trae matrícula+teléfono+idioma; resto solo si absorber=true)
    if(!result){
      const qRef = query(collection(db, 'referencias'),
        where('matricula', '==', norm),
        orderBy('createdAt', 'desc'), limit(1));
      const snapRef = await getDocs(qRef);
      if(!snapRef.empty){
        const d = snapRef.docs[0].data();
        const base = {
          matricula: d.matricula,
          telefono: d.telefono || '',
          conductorLang: d.conductorLang || d.lang || d.idioma || '',
          tipoVehiculo: d.tipoVehiculo || 'camion'
        };
        // Datos extra solo si el evento lo permite
        if(absorber){
          base.remolque = d.remolque || '';
          base.conductor = d.conductor || '';
          base.empresa = d.empresa || '';
          base.hall = d.hall || '';
          base.stand = d.stand || '';
        }
        if(heredarPass){
          base.pasaporte = d.pasaporte || '';
          base.fNacimiento = d.fNacimiento || '';
          base.pais = d.pais || '';
        }
        result = {
          source: 'referencias',
          sourceLabel: 'Última referencia',
          data: base
        };
      }
    }

    // 3) Último ingreso (mismo criterio)
    if(!result){
      const qIng = query(collection(db, 'ingresos'),
        where('matricula', '==', norm),
        orderBy('createdAt', 'desc'), limit(1));
      const snapIng = await getDocs(qIng);
      if(!snapIng.empty){
        const d = snapIng.docs[0].data();
        const base = {
          matricula: d.matricula,
          telefono: d.telefono || '',
          conductorLang: d.conductorLang || d.lang || d.idioma || '',
          tipoVehiculo: d.tipoVehiculo || 'camion'
        };
        if(absorber){
          base.remolque = d.remolque || '';
          base.conductor = d.conductor || '';
          base.empresa = d.empresa || '';
          base.hall = d.hall || '';
          base.stand = d.stand || '';
        }
        if(heredarPass){
          base.pasaporte = d.pasaporte || '';
          base.fNacimiento = d.fNacimiento || '';
          base.pais = d.pais || '';
        }
        result = {
          source: 'ingresos',
          sourceLabel: 'Último ingreso',
          data: base
        };
      }
    }

    cacheSet(key, result);
    return result;
  } catch(e){
    logger.warn(`matchMatricula(${norm}) error`, { error: e.message });
    return null;
  }
}

/**
 * Match por nº de referencia.
 * Busca en `agenda` (citas planificadas).
 * Si encuentra, devuelve los datos previstos para absorber.
 */
export async function matchReferencia(refNum, eventoId = null){
  if(!refNum || refNum.length < 2) return null;
  const key = `ref:${refNum}:${eventoId || 'noev'}`;
  const cached = cacheGet(key);
  if(cached !== null) return cached;

  const norm = String(refNum).toUpperCase().trim();
  const flags = await getEventoFlags(eventoId);
  const tipoRef = flags?.tipoReferencia || 'unica';

  // Si el evento es "sin_referencia", no se busca ni absorbe nada
  if(tipoRef === 'sin_referencia'){
    cacheSet(key, null);
    return null;
  }

  let result = null;

  try{
    const q = query(collection(db, 'agenda'),
      where('referencia', '==', norm),
      orderBy('fechaPlanificada', 'desc'), limit(1));
    const snap = await getDocs(q);
    if(!snap.empty){
      const d = snap.docs[0].data();
      // Si el evento es "dividida", solo se guarda el código corto, NO se absorben datos
      if(tipoRef === 'dividida'){
        result = {
          source: 'agenda',
          sourceLabel: 'Referencia dividida (solo código)',
          tipoRef: 'dividida',
          data: {
            referencia: norm,
            agendaId: snap.docs[0].id
          }
        };
      } else {
        // Única → absorbe todo
        result = {
          source: 'agenda',
          sourceLabel: 'Cita en agenda',
          tipoRef: 'unica',
          data: {
            referencia: norm,
            matricula: d.matricula || '',
            conductor: d.conductor || '',
            telefono: d.telefono || '',
            empresa: d.empresa || '',
            hall: d.hall || '',
            stand: d.stand || '',
            montador: d.montador || '',
            expositor: d.expositor || '',
            horaPlanificada: d.horaPlanificada || '',
            eventoId: d.eventoId || null,
            agendaId: snap.docs[0].id
          }
        };
      }
    }
    cacheSet(key, result);
    return result;
  } catch(e){
    logger.warn(`matchReferencia(${norm}) error`, { error: e.message });
    return null;
  }
}

/**
 * Match por nombre de conductor (prefijo).
 * Devuelve array de coincidencias (max 5).
 */
export async function matchConductor(nameOrDni){
  if(!nameOrDni || nameOrDni.length < 2) return [];
  const norm = normalize(nameOrDni);
  const key = `cond:${norm}`;
  const cached = cacheGet(key);
  if(cached !== null) return cached;

  try{
    // Firestore no soporta búsqueda case-insensitive directa, así que
    // cargamos los primeros 100 conductores y filtramos en cliente.
    // Para escalar (>1000 conductores) habría que añadir un campo `nombreNorm`.
    const snap = await getDocs(query(collection(db, 'conductores'),
      orderBy('nombre'), limit(200)));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const matches = all.filter(c =>
      normalize(c.nombre).includes(norm) || normalize(c.dni || '').includes(norm)
    ).slice(0, 5).map(c => ({
      source: 'conductores',
      sourceLabel: 'Conductor',
      data: {
        conductor: c.nombre,
        telefono: c.telefono || '',
        dni: c.dni || '',
        empresa: c.empresa || '',
        idiomas: c.idiomas || []
      }
    }));
    cacheSet(key, matches);
    return matches;
  } catch(e){
    logger.warn(`matchConductor(${norm}) error`, { error: e.message });
    return [];
  }
}

/**
 * Match por empresa (nombre o CIF).
 * Devuelve la primera coincidencia.
 */
export async function matchEmpresa(nameOrCif){
  if(!nameOrCif || nameOrCif.length < 2) return null;
  const norm = normalize(nameOrCif);
  const key = `emp:${norm}`;
  const cached = cacheGet(key);
  if(cached !== null) return cached;

  try{
    const snap = await getDocs(query(collection(db, 'empresas'),
      orderBy('nombre'), limit(200)));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const found = all.find(e =>
      normalize(e.nombre).includes(norm) ||
      normalize(e.cif || '').includes(norm)
    );
    const result = found ? {
      source: 'empresas',
      sourceLabel: 'Empresa',
      data: {
        empresaId: found.id,
        empresa: found.nombre,
        cif: found.cif || '',
        email: found.email || '',
        telefono: found.telefono || '',
        nivel: found.nivel || 'estandar', // estandar | verificada | bloqueada
        bloqueada: found.nivel === 'bloqueada'
      }
    } : null;
    cacheSet(key, result);
    return result;
  } catch(e){
    logger.warn(`matchEmpresa(${norm}) error`, { error: e.message });
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// UI — vincular un input a sugerencias
// ═══════════════════════════════════════════════════════════════

/**
 * Liga un input para que muestre un dropdown con sugerencias.
 *
 * @param {HTMLInputElement} input - el input a vigilar
 * @param {'matricula'|'referencia'|'conductor'|'empresa'} type
 * @param {function} onPick - callback(data) cuando el usuario elige una sugerencia
 * @param {object} opts - { minChars: 2, debounceMs: 250 }
 */
export function attachAutocomplete(input, type, onPick, opts = {}){
  const minChars = opts.minChars ?? 2;
  const debounceMs = opts.debounceMs ?? 250;

  // Wrapper para colocar el dropdown debajo
  const wrap = input.parentElement;
  if(getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';

  let dropdown = null;
  let suggestions = [];
  let activeIdx = -1;

  function closeDropdown(){
    if(dropdown){ dropdown.remove(); dropdown = null; }
    suggestions = [];
    activeIdx = -1;
  }

  function renderDropdown(){
    closeDropdown();
    if(!suggestions.length) return;
    dropdown = document.createElement('div');
    dropdown.className = 'autocomplete-dropdown';
    dropdown.style.cssText = `
      position:absolute; top:100%; left:0; right:0; z-index:7500;
      background:#fff; border:1px solid #E5E7EB; border-radius:10px;
      box-shadow:0 10px 25px rgba(15,23,41,0.12);
      max-height:280px; overflow-y:auto; margin-top:4px;
    `;
    suggestions.forEach((s, idx) => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';
      item.style.cssText = `
        padding:10px 12px; cursor:pointer; border-bottom:1px solid #F1F5F9;
        ${idx === activeIdx ? 'background:#EFF6FF' : ''}
      `;
      const main = document.createElement('div');
      main.style.cssText = 'font-weight:500;font-size:13px;color:#0F172A';
      main.textContent = s.label || s.data.matricula || s.data.conductor || s.data.empresa || s.data.referencia || '—';
      const sub = document.createElement('div');
      sub.style.cssText = 'font-size:11px;color:#64748B;margin-top:2px';
      sub.textContent = `${s.sourceLabel}${s.subLabel ? ' · ' + s.subLabel : ''}`;
      item.appendChild(main);
      item.appendChild(sub);
      if(s.warning){
        const warn = document.createElement('div');
        warn.style.cssText = 'font-size:11px;color:#991B1B;margin-top:2px;font-weight:500';
        warn.textContent = '⚠ ' + s.warning;
        item.appendChild(warn);
      }
      item.onmousedown = (e) => {
        e.preventDefault();
        pick(s);
      };
      dropdown.appendChild(item);
    });
    wrap.appendChild(dropdown);
  }

  function pick(s){
    if(s.warning){
      // Si tiene aviso (ej. empresa bloqueada), confirmar antes
      logger.warn(`Autocomplete: selección con aviso — ${s.warning}`);
    }
    closeDropdown();
    onPick(s.data, s);
  }

  const lookup = debounce(async () => {
    const v = input.value.trim();
    if(v.length < minChars){ closeDropdown(); return; }

    try{
      // eventoId puede ser valor fijo o función dinámica (para leer del form)
      const evId = typeof opts.eventoId === 'function' ? opts.eventoId() : opts.eventoId;

      if(type === 'matricula'){
        const m = await matchMatricula(v, evId);
        suggestions = m ? [{ ...m, label: m.data.matricula, subLabel: m.data.empresa || m.data.conductor }] : [];
      } else if(type === 'referencia'){
        const m = await matchReferencia(v, evId);
        suggestions = m ? [{ ...m, label: m.data.referencia, subLabel: `${m.data.matricula || ''} ${m.data.hall ? '· Hall '+m.data.hall : ''}${m.tipoRef === 'dividida' ? ' (solo código)' : ''}` }] : [];
      } else if(type === 'conductor'){
        const ms = await matchConductor(v);
        suggestions = ms.map(m => ({ ...m, label: m.data.conductor, subLabel: m.data.empresa || m.data.dni }));
      } else if(type === 'empresa'){
        const m = await matchEmpresa(v);
        if(m){
          suggestions = [{
            ...m,
            label: m.data.empresa,
            subLabel: m.data.cif || m.data.email,
            warning: m.data.bloqueada ? 'Empresa bloqueada' : null
          }];
        } else suggestions = [];
      }
      renderDropdown();
    } catch(e){
      logger.error(`Autocomplete(${type}) error`, { error: e.message });
    }
  }, debounceMs);

  input.addEventListener('input', lookup);

  input.addEventListener('keydown', (e) => {
    if(!dropdown || !suggestions.length) return;
    if(e.key === 'ArrowDown'){
      e.preventDefault();
      activeIdx = Math.min(suggestions.length - 1, activeIdx + 1);
      renderDropdown();
    } else if(e.key === 'ArrowUp'){
      e.preventDefault();
      activeIdx = Math.max(0, activeIdx - 1);
      renderDropdown();
    } else if(e.key === 'Enter' && activeIdx >= 0){
      e.preventDefault();
      pick(suggestions[activeIdx]);
    } else if(e.key === 'Escape'){
      closeDropdown();
    }
  });

  input.addEventListener('blur', () => {
    // pequeño delay para permitir click en dropdown
    setTimeout(closeDropdown, 200);
  });

  return { close: closeDropdown };
}

// ═══════════════════════════════════════════════════════════════
// HELPER — Aplicar datos absorbidos a un form
// Rellena los inputs del form con los datos del objeto data
// sin pisar lo que el usuario ya escribió (modo merge).
// ═══════════════════════════════════════════════════════════════
export function applyDataToForm(form, data, opts = {}){
  const overwrite = opts.overwrite ?? false;
  const skip = new Set(opts.skip || []);
  let applied = 0;
  for(const [key, value] of Object.entries(data)){
    if(skip.has(key)) continue;
    if(value == null || value === '') continue;
    const input = form.querySelector(`[name="${key}"]`);
    if(!input) continue;
    if(!overwrite && input.value && input.value.trim()) continue;
    if(Array.isArray(value)) input.value = value.join(', ');
    else input.value = value;
    // efecto visual breve
    input.style.background = '#DCFCE7';
    setTimeout(() => { input.style.background = ''; }, 600);
    applied++;
  }
  logger.info(`Autocomplete: ${applied} campos rellenados`);
  return applied;
}

// ═══════════════════════════════════════════════════════════════
// HELPER — Marcar cita de agenda como llegada (al absorberla)
// ═══════════════════════════════════════════════════════════════
import { doc, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function markAgendaArrived(agendaId, horaReal = null){
  if(!agendaId) return;
  try{
    const ref = doc(db, 'agenda', agendaId);
    await updateDoc(ref, {
      estado: 'llegado',
      horaReal: horaReal || new Date().toTimeString().slice(0,5),
      updatedAt: serverTimestamp()
    });
    logger.ok(`Agenda ${agendaId} marcada como llegado`);
  } catch(e){
    logger.warn(`No se pudo marcar agenda como llegado`, { agendaId, error: e.message });
  }
}
