// ═══════════════════════════════════════════════════════════════
// parking.js — Zonas de parking + alertas de ocupación y estancia
//
// - Zonas con rango de posiciones (Zona A = pos 1-50, etc.)
// - Detecta zona automáticamente por la posición asignada al ingreso
// - Alerta cuando una zona o el total supera el umbral (90% por defecto)
// - Alerta de estancia prolongada: vehículos dentro que superan
//   N × la media real del evento (vehículos ya salidos)
// - Config persistida en localStorage por evento
//
// API:
//   getZonesConfig(eventoId) / setZonesConfig(eventoId, zones)
//   getAlertConfig() / setAlertConfig(cfg)
//   computeOccupancy(ingresos, zones) → { zones[], totalOcup, totalCap, pct }
//   computeLongStays(ingresos, alertCfg) → [{ ingreso, minutos, factor }]
//   renderParkingWidget(container, { ingresos, eventoId }) → HTMLElement
// ═══════════════════════════════════════════════════════════════

import { el } from './utils.js';
import { logger } from './logger.js';
import { autoMsg } from './modules/mensajes.js';

const ZONES_KEY = (ev) => `beunifyt_parking_zones_${ev || 'global'}`;
const ALERT_KEY = 'beunifyt_parking_alerts';

const DEFAULT_ZONES = [
  { id:'A', nombre:'Zona A', capacidad:50, desde:1,   hasta:50 },
  { id:'B', nombre:'Zona B', capacidad:50, desde:51,  hasta:100 },
  { id:'C', nombre:'Zona C', capacidad:50, desde:101, hasta:150 }
];

const DEFAULT_ALERTS = {
  umbralPct: 90,        // % de ocupación que dispara alerta
  factorEstancia: 2,    // N × media para marcar estancia prolongada
  minutosMinimo: 120,   // mínimo absoluto en minutos para alertar
  refrescoSeg: 30,      // auto-refresh
  alertaOcupacion: true,
  alertaEstancia: true
};

export function getZonesConfig(eventoId){
  try{
    const raw = localStorage.getItem(ZONES_KEY(eventoId));
    if(raw) return JSON.parse(raw);
  } catch(_){}
  return DEFAULT_ZONES.slice();
}

export function setZonesConfig(eventoId, zones){
  try{ localStorage.setItem(ZONES_KEY(eventoId), JSON.stringify(zones || [])); }
  catch(e){ logger.warn('No se pudo guardar zonas', { error:e.message }); }
}

export function getAlertConfig(){
  try{
    const raw = localStorage.getItem(ALERT_KEY);
    if(raw) return { ...DEFAULT_ALERTS, ...JSON.parse(raw) };
  } catch(_){}
  return { ...DEFAULT_ALERTS };
}

export function setAlertConfig(cfg){
  try{ localStorage.setItem(ALERT_KEY, JSON.stringify(cfg || {})); }
  catch(e){ logger.warn('No se pudo guardar alertas', { error:e.message }); }
}

// Un vehículo está "dentro" si no tiene salida registrada
function estaDentro(i){
  if(i.estado === 'salida' || i.horaSalida || i.salida) return false;
  return i.estado === 'dentro' || i.estado === 'dentro_fira' || i.estado === 'rampa_parking' || !i.estado;
}

function zonaDePosicion(pos, zones){
  const p = Number(pos);
  if(!p) return null;
  return zones.find(z => p >= Number(z.desde) && p <= Number(z.hasta)) || null;
}

/**
 * Calcula ocupación por zona y total.
 */
export function computeOccupancy(ingresos, zones){
  const dentro = (ingresos || []).filter(estaDentro);
  const zMap = new Map(zones.map(z => [z.id, { ...z, ocupados:0, vehiculos:[] }]));
  let sinZona = 0;
  for(const i of dentro){
    const z = zonaDePosicion(i.posicion, zones);
    if(z && zMap.has(z.id)){
      const e = zMap.get(z.id);
      e.ocupados++; e.vehiculos.push(i);
    } else {
      sinZona++;
    }
  }
  const zonesArr = Array.from(zMap.values()).map(z => ({
    ...z,
    pct: z.capacidad > 0 ? Math.round((z.ocupados / z.capacidad) * 100) : 0
  }));
  const totalCap = zones.reduce((a, z) => a + Number(z.capacidad || 0), 0);
  const totalOcup = dentro.length;
  return {
    zones: zonesArr,
    sinZona,
    totalOcup,
    totalCap,
    pct: totalCap > 0 ? Math.round((totalOcup / totalCap) * 100) : 0
  };
}

// Convierte "HH:MM" + fechaKey a Date aproximada (hoy si no hay fecha)
function entradaToDate(i){
  if(i.createdAt?.toDate) return i.createdAt.toDate();
  if(i.createdAt) return new Date(i.createdAt);
  if(i.horaEntrada){
    const [h, m] = String(i.horaEntrada).split(':').map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  }
  return null;
}

function duracionMin(i){
  const ent = entradaToDate(i);
  if(!ent) return null;
  let fin;
  if(i.horaSalida){
    const [h, m] = String(i.horaSalida).split(':').map(Number);
    fin = new Date(ent); fin.setHours(h || 0, m || 0, 0, 0);
    if(fin < ent) fin.setDate(fin.getDate() + 1);
  } else {
    fin = new Date();
  }
  return Math.round((fin - ent) / 60000);
}

/**
 * Detecta vehículos con estancia prolongada.
 * Media calculada con vehículos ya salidos del mismo conjunto.
 */
export function computeLongStays(ingresos, alertCfg){
  const cfg = alertCfg || getAlertConfig();
  const salidos = (ingresos || []).filter(i => i.horaSalida || i.estado === 'salida');
  const durs = salidos.map(duracionMin).filter(d => d != null && d > 0);
  const media = durs.length ? durs.reduce((a, b) => a + b, 0) / durs.length : 0;
  const umbral = Math.max(cfg.minutosMinimo, media * cfg.factorEstancia);

  const dentro = (ingresos || []).filter(estaDentro);
  const alertas = [];
  for(const i of dentro){
    const min = duracionMin(i);
    if(min == null) continue;
    if(min >= umbral){
      alertas.push({
        ingreso: i,
        minutos: min,
        factor: media ? +(min / media).toFixed(1) : null,
        sinReferencia: !i.referencia
      });
    }
  }
  // Orden: primero sin referencia, luego por más tiempo
  alertas.sort((a, b) => (b.sinReferencia - a.sinReferencia) || (b.minutos - a.minutos));
  return { alertas, mediaMin: Math.round(media), umbralMin: Math.round(umbral) };
}

function fmtDur(min){
  if(min == null) return '—';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Renderiza el widget completo (ocupación + alertas) en un contenedor.
 * onRefresh opcional: callback para pedir datos frescos.
 */
export function renderParkingWidget(container, { ingresos, eventoId }){
  const zones = getZonesConfig(eventoId);
  const alertCfg = getAlertConfig();
  const occ = computeOccupancy(ingresos, zones);
  const longStays = computeLongStays(ingresos, alertCfg);

  const wrap = el('div', { class:'parking-widget' });

  // ── Banner alerta ocupación total ──
  if(alertCfg.alertaOcupacion && occ.pct >= alertCfg.umbralPct){
    autoMsg({
      titulo:`Parking al ${occ.pct}%`,
      texto:`Ocupación ${occ.totalOcup}/${occ.totalCap}. Prioriza salidas para liberar plazas.`,
      tipo:'alerta', dedupeKey:`ocup90:${eventoId||'g'}`, dedupeMin:20
    });
    wrap.appendChild(el('div', { class:'parking-alert-banner', style:{
      background:'#fef2f2', border:'2px solid #ef4444', color:'#b91c1c',
      padding:'12px 16px', borderRadius:'10px', marginBottom:'12px',
      fontWeight:'700', display:'flex', alignItems:'center', gap:'10px'
    }},
      el('span', { style:{fontSize:'20px'} }, '🚨'),
      el('span', {}, `Parking al ${occ.pct}% (${occ.totalOcup}/${occ.totalCap}). Prioriza salidas para liberar plazas.`)
    );
  }

  // ── Cabecera ──
  const head = el('div', { style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'} },
    el('h3', { class:'panel-title' }, `Ocupación de parking · ${occ.totalOcup}/${occ.totalCap} (${occ.pct}%)`),
    el('button', { class:'btn btn-ghost btn-sm', onclick: () => openZonesConfig(eventoId, () => renderInto()) }, '⚙ Zonas')
  );
  wrap.appendChild(head);

  // ── Tarjetas por zona ──
  const grid = el('div', { style:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:'10px'} });
  for(const z of occ.zones){
    const color = z.pct >= 90 ? '#ef4444' : z.pct >= 75 ? '#f59e0b' : '#22c55e';
    grid.appendChild(el('div', { style:{
      border:'1px solid var(--border)', borderRadius:'10px', padding:'12px', background:'var(--bg2)'
    }},
      el('div', { style:{display:'flex',justifyContent:'space-between',marginBottom:'6px'} },
        el('strong', {}, z.nombre),
        el('span', { style:{color, fontWeight:'700'} }, `${z.pct}%`)
      ),
      el('div', { class:'cell-mute', style:{fontSize:'12px',marginBottom:'8px'} }, `${z.ocupados}/${z.capacidad} · pos ${z.desde}-${z.hasta}`),
      el('div', { style:{height:'8px',background:'var(--bg3)',borderRadius:'5px',overflow:'hidden'} },
        el('div', { style:{height:'100%',width:Math.min(100,z.pct)+'%',background:color,transition:'width .3s'} })
      )
    ));
  }
  if(occ.sinZona > 0){
    grid.appendChild(el('div', { style:{
      border:'1px dashed var(--border2)', borderRadius:'10px', padding:'12px', background:'var(--bg3)'
    }},
      el('strong', {}, '⚠ Sin zona'),
      el('div', { class:'cell-mute', style:{fontSize:'12px',marginTop:'4px'} }, `${occ.sinZona} vehículo(s) con posición fuera de rangos o sin posición`)
    ));
  }
  wrap.appendChild(grid);

  // ── Alertas de estancia prolongada ──
  if(alertCfg.alertaEstancia && longStays.alertas.length){
    const panel = el('div', { style:{marginTop:'16px'} },
      el('h3', { class:'panel-title', style:{color:'#b45309'} },
        `⏱ Estancia prolongada (${longStays.alertas.length}) · media ${fmtDur(longStays.mediaMin)}, umbral ${fmtDur(longStays.umbralMin)}`)
    );
    const tbl = el('table', { class:'table' });
    tbl.appendChild(el('thead', {}, el('tr', {},
      el('th', {}, 'Matrícula'), el('th', {}, 'Pos.'), el('th', {}, 'Tiempo'),
      el('th', {}, 'x media'), el('th', {}, 'Referencia')
    )));
    const tb = el('tbody');
    for(const a of longStays.alertas.slice(0, 15)){
      tb.appendChild(el('tr', { style: a.sinReferencia ? {background:'#fff7ed'} : {} },
        el('td', { class:'cell-plate' }, a.ingreso.matricula || '—'),
        el('td', {}, String(a.ingreso.posicion || '—')),
        el('td', { style:{fontWeight:'600'} }, fmtDur(a.minutos)),
        el('td', {}, a.factor ? `${a.factor}×` : '—'),
        el('td', {}, a.sinReferencia
          ? el('span', { style:{color:'#b91c1c',fontWeight:'600'} }, '🚩 SIN referencia')
          : (a.ingreso.referencia || '—'))
      ));
    }
    tbl.appendChild(tb);
    panel.appendChild(tbl);
    wrap.appendChild(panel);
  }

  // Montaje
  function renderInto(){
    container.innerHTML = '';
    const fresh = renderParkingWidget(container, { ingresos, eventoId });
    container.appendChild(fresh);
  }

  return wrap;
}

// ── Modal config de zonas ──
function openZonesConfig(eventoId, onSave){
  import('./utils.js').then(({ openModal, closeModal, el, toast }) => {
    let zones = getZonesConfig(eventoId).map(z => ({ ...z }));
    const body = el('div', {});
    const list = el('div', {});

    function renderList(){
      list.innerHTML = '';
      zones.forEach((z, idx) => {
        const row = el('div', { style:{display:'grid',gridTemplateColumns:'1fr 70px 70px 70px 32px',gap:'6px',marginBottom:'6px',alignItems:'center'} });
        const inpNombre = el('input', { class:'field-input', value:z.nombre, placeholder:'Nombre' });
        const inpCap = el('input', { class:'field-input', type:'number', value:z.capacidad, placeholder:'Cap.' });
        const inpDesde = el('input', { class:'field-input', type:'number', value:z.desde, placeholder:'Desde' });
        const inpHasta = el('input', { class:'field-input', type:'number', value:z.hasta, placeholder:'Hasta' });
        inpNombre.oninput = () => z.nombre = inpNombre.value;
        inpCap.oninput = () => z.capacidad = Number(inpCap.value) || 0;
        inpDesde.oninput = () => z.desde = Number(inpDesde.value) || 0;
        inpHasta.oninput = () => z.hasta = Number(inpHasta.value) || 0;
        const del = el('button', { class:'btn btn-ghost btn-sm', onclick: () => { zones.splice(idx,1); renderList(); } }, '✕');
        row.appendChild(inpNombre); row.appendChild(inpCap); row.appendChild(inpDesde); row.appendChild(inpHasta); row.appendChild(del);
        list.appendChild(row);
      });
    }
    renderList();

    body.appendChild(el('div', { style:{display:'grid',gridTemplateColumns:'1fr 70px 70px 70px 32px',gap:'6px',marginBottom:'6px',fontSize:'11px',color:'var(--text-3)',textTransform:'uppercase'} },
      el('span', {}, 'Zona'), el('span', {}, 'Cap.'), el('span', {}, 'Desde'), el('span', {}, 'Hasta'), el('span', {}, '')
    ));
    body.appendChild(list);
    body.appendChild(el('button', { class:'btn btn-ghost btn-sm', style:{marginTop:'8px'},
      onclick: () => { const n = zones.length; zones.push({ id:'Z'+(n+1), nombre:'Zona '+(n+1), capacidad:50, desde:(n*50)+1, hasta:(n+1)*50 }); renderList(); }
    }, '+ Añadir zona'));

    const footer = el('div', { class:'modal-foot' },
      el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
      el('button', { class:'btn btn-primary', onclick: () => {
        setZonesConfig(eventoId, zones);
        toast('Zonas guardadas', 'ok');
        closeModal();
        if(onSave) onSave();
      }}, 'Guardar')
    );
    openModal({ title:'⚙ Configurar zonas de parking', body, size:'md' });
    setTimeout(() => body.parentElement.appendChild(footer), 60);
  });
}
