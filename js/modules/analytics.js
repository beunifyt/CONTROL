// analytics.js — métricas y gráficos básicos (sin librerías externas)
import { el, clear, icon, fmtDate } from '../utils.js';
import { listLive, list, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, statCard } from './shared.js';

let _container = null;
let _refs = [];
let _ings = [];
let _eventos = [];
const KEY_PREFIX = 'mod:analytics:';

export async function init(container){
  _container = container;
  _eventos = await list('eventos');
  render();
  listLive('referencias', { key:KEY_PREFIX+'refs', orderBy:'createdAt', order:'desc', limit:500 }, items => { _refs = items; render(); });
  listLive('ingresos',    { key:KEY_PREFIX+'ings', orderBy:'createdAt', order:'desc', limit:500 }, items => { _ings = items; render(); });
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  _container = null;
}

function render(){
  if(!_container) return;
  clear(_container);

  _container.appendChild(pageHeader({
    title:'Analytics',
    sub:'Métricas y resumen del último periodo'
  }));

  // Stats
  const stats = el('div', { class:'stats-grid' });
  const dentro = _refs.filter(r => r.estado === 'dentro_fira').length
              + _ings.filter(i => i.estado === 'dentro').length;
  stats.appendChild(statCard({ label:'En recinto ahora', value:dentro, iconName:'shield', color:'green' }));
  stats.appendChild(statCard({ label:'Total Referencias', value:_refs.length, iconName:'referencias', color:'blue' }));
  stats.appendChild(statCard({ label:'Total Ingresos', value:_ings.length, iconName:'ingresos', color:'amber' }));
  stats.appendChild(statCard({ label:'Eventos activos', value:_eventos.filter(e => e.estado === 'activo').length, iconName:'eventos', color:'purple' }));
  _container.appendChild(stats);

  // Últimos 7 días — gráfico de barras simple
  const last7 = chartLast7Days();

  // Distribución vehículos
  const vehDist = chartVehiculos();

  // Estados de referencias
  const estDist = chartEstados();

  // Halls activos
  const hallsDist = chartHalls();

  const grid = el('div', { class:'panel-grid-2' });
  grid.appendChild(panel('Últimos 7 días (referencias + ingresos)', last7));
  grid.appendChild(panel('Distribución por tipo de vehículo', vehDist));
  grid.appendChild(panel('Estados de referencias', estDist));
  grid.appendChild(panel('Halls más activos', hallsDist));
  _container.appendChild(grid);

  // Resumen por evento
  _container.appendChild(panelResumenEventos());
}

function panel(title, body){
  return el('div', { class:'panel' },
    el('div', { class:'panel-head' }, el('h3', { class:'panel-title' }, title)),
    el('div', { class:'panel-body' }, body)
  );
}

function chartLast7Days(){
  const days = [];
  for(let i=6; i>=0; i--){
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    days.push({ key, date:d, count:0 });
  }
  function bucket(item){
    const d = item.createdAt?.toDate ? item.createdAt.toDate() : null;
    if(!d) return;
    d.setHours(0,0,0,0);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const x = days.find(x => x.key === key);
    if(x) x.count++;
  }
  _refs.forEach(bucket);
  _ings.forEach(bucket);

  const max = Math.max(1, ...days.map(x => x.count));
  const wrap = el('div', { style:{ display:'flex', alignItems:'flex-end', gap:'8px', height:'160px' } });
  for(const d of days){
    const h = (d.count / max) * 140;
    const bar = el('div', { style:{ flex:'1', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' } },
      el('div', { style:{ fontSize:'11px', color:'var(--text-3)', fontWeight:'600' } }, String(d.count)),
      el('div', { style:{ width:'100%', height: h+'px', background:'var(--primary)', borderRadius:'4px 4px 0 0', minHeight:'2px' } }),
      el('div', { style:{ fontSize:'11px', color:'var(--text-3)' } }, d.date.toLocaleDateString('es', { weekday:'short' }))
    );
    wrap.appendChild(bar);
  }
  return wrap;
}

function chartVehiculos(){
  const tipos = {};
  for(const r of [..._refs, ..._ings]){
    const t = r.tipoVehiculo || 'otro';
    tipos[t] = (tipos[t] || 0) + 1;
  }
  return horizontalBarsFrom(tipos, ['camion','trailer','furgoneta','otro']);
}

function chartEstados(){
  const est = {};
  for(const r of _refs){
    const e = r.estado || 'prerregistrado';
    est[e] = (est[e] || 0) + 1;
  }
  const labels = {
    'prerregistrado':'Prerregistrado','en_camino':'En camino','rampa_parking':'Rampa/Parking',
    'dentro_fira':'Dentro Fira','salida':'Salida'
  };
  return horizontalBarsFrom(est, Object.keys(labels), labels);
}

function chartHalls(){
  const halls = {};
  for(const r of [..._refs, ..._ings]){
    const h = r.hall || '—';
    halls[h] = (halls[h] || 0) + 1;
  }
  const sorted = Object.entries(halls).sort((a,b) => b[1]-a[1]).slice(0,8);
  const obj = Object.fromEntries(sorted);
  return horizontalBarsFrom(obj, sorted.map(s => s[0]));
}

function horizontalBarsFrom(obj, order, labelMap=null){
  const max = Math.max(1, ...Object.values(obj));
  const wrap = el('div', { style:{ display:'flex', flexDirection:'column', gap:'8px' } });
  for(const k of order){
    const v = obj[k] || 0;
    const w = (v / max) * 100;
    const label = labelMap ? (labelMap[k] || k) : k;
    wrap.appendChild(el('div', {},
      el('div', { style:{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'3px' } },
        el('span', {}, label),
        el('span', { class:'cell-mute' }, String(v))
      ),
      el('div', { style:{ height:'8px', background:'var(--surface-2)', borderRadius:'4px', overflow:'hidden' } },
        el('div', { style:{ width:w+'%', height:'100%', background:'var(--primary)' } })
      )
    ));
  }
  return wrap;
}

function panelResumenEventos(){
  const panel = el('div', { class:'panel', style:{ marginTop:'16px' } },
    el('div', { class:'panel-head' }, el('h3', { class:'panel-title' }, 'Resumen por evento (forecast vs real)'))
  );
  const wrap = el('div', { class:'table-wrap', style:{ border:'0', boxShadow:'none', borderRadius:'0' } });
  if(_eventos.length === 0){
    panel.appendChild(el('div', { class:'panel-body cell-mute' }, 'Sin eventos'));
    return panel;
  }
  const tbl = el('table', { class:'table' });
  tbl.appendChild(el('thead', {}, el('tr', {},
    el('th',{},'Evento'), el('th',{},'Estado'),
    el('th',{},'Previsión'), el('th',{},'Refs'), el('th',{},'Ingresos'),
    el('th',{},'Total'), el('th',{},'Cumplimiento'), el('th',{},'Dentro')
  )));
  const tb = el('tbody');
  for(const ev of _eventos){
    const refs = _refs.filter(r => r.eventoId === ev.id);
    const ings = _ings.filter(i => i.eventoId === ev.id);
    const dentro = refs.filter(r => r.estado === 'dentro_fira').length + ings.filter(i => i.estado === 'dentro').length;
    const total = refs.length + ings.length;
    const forecast = ev.previsionVehiculos || 0;
    const pct = forecast ? Math.round((total / forecast) * 100) : 0;
    let pctKind = 'gray';
    if(forecast){
      if(pct < 50) pctKind = 'amber';
      else if(pct < 90) pctKind = 'blue';
      else if(pct <= 110) pctKind = 'green';
      else pctKind = 'red';
    }
    tb.appendChild(el('tr', {},
      el('td', { class:'cell-strong' }, ev.nombre || '—'),
      el('td', {}, el('span', { class:`badge badge-${ev.estado === 'activo' ? 'green' : 'gray'}` }, ev.estado || '—')),
      el('td', { class:'cell-mute' }, String(forecast || '—')),
      el('td', {}, String(refs.length)),
      el('td', {}, String(ings.length)),
      el('td', { class:'cell-strong' }, String(total)),
      el('td', {}, forecast ? el('span', { class:`badge badge-${pctKind}` }, `${pct}%`) : el('span', { class:'cell-mute' }, '—')),
      el('td', {}, el('span', { class:'cell-pos' }, String(dentro)))
    ));
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  panel.appendChild(wrap);
  return panel;
}
