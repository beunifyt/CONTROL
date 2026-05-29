// ═══════════════════════════════════════════════════════════════
// dashboard.js — módulo Dashboard
// ═══════════════════════════════════════════════════════════════

import { el, clear, icon, fmtTime, fmtRelative } from '../utils.js';
import { listLive, registerListener, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, statCard, emptyState } from './shared.js';
import { tr } from '../i18n.js';
import { validarServicioCompleto } from '../audit.js';
import { renderParkingWidget } from '../parking.js';

let _container = null;
const KEY_PREFIX = 'mod:dashboard:';

export async function init(container, ctx){
  _container = container;
  render();
  attachListeners();
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  _container = null;
}

let _fDesde = '';
let _fHasta = '';

// Filtra un array por rango de fecha usando createdAt
function filtrarPorFecha(arr){
  if(!_fDesde && !_fHasta) return arr;
  const desde = _fDesde ? new Date(_fDesde + 'T00:00:00') : null;
  const hasta = _fHasta ? new Date(_fHasta + 'T23:59:59') : null;
  return arr.filter(item => {
    const ts = item.createdAt?.toDate ? item.createdAt.toDate() : (item.createdAt ? new Date(item.createdAt) : null);
    if(!ts) return false;
    if(desde && ts < desde) return false;
    if(hasta && ts > hasta) return false;
    return true;
  });
}

function render(){
  if(!_container) return;
  clear(_container);

  _container.appendChild(pageHeader({
    title: tr('dashboard'),
    sub: 'Métricas en tiempo real de tu operativa'
  }));

  // Barra de filtro por rango de fechas
  const filtroBar = el('div', { class:'filter-bar', style:{
    display:'flex', gap:'10px', alignItems:'flex-end', flexWrap:'wrap',
    padding:'12px', background:'var(--bg2)', borderRadius:'8px',
    border:'1px solid var(--border)', marginBottom:'16px'
  }});
  const inpDesde = el('input', { type:'date', class:'field-input', value:_fDesde });
  const inpHasta = el('input', { type:'date', class:'field-input', value:_fHasta });
  inpDesde.onchange = () => { _fDesde = inpDesde.value; render(); };
  inpHasta.onchange = () => { _fHasta = inpHasta.value; render(); };
  filtroBar.appendChild(el('label', { style:{display:'flex',flexDirection:'column',gap:'4px',fontSize:'12px'} },
    el('span', { class:'cell-mute' }, 'Desde'), inpDesde));
  filtroBar.appendChild(el('label', { style:{display:'flex',flexDirection:'column',gap:'4px',fontSize:'12px'} },
    el('span', { class:'cell-mute' }, 'Hasta'), inpHasta));
  if(_fDesde || _fHasta){
    filtroBar.appendChild(el('button', { class:'btn btn-ghost btn-sm',
      onclick: () => { _fDesde=''; _fHasta=''; render(); } }, '✕ Limpiar'));
  }
  _container.appendChild(filtroBar);

  // Aplicar filtro de fecha a los datos
  const referencias = filtrarPorFecha(window.__dashRefs || []);
  const ingresos    = filtrarPorFecha(window.__dashIngs || []);
  const agenda      = filtrarPorFecha(window.__dashAgenda || []);
  const mensajes    = window.__dashMsgs || [];

  const statsGrid = el('div', { class:'stats-grid' });
  const dentro = referencias.filter(r => r.estado === 'dentro_fira').length
              + ingresos.filter(i => i.estado === 'dentro' && !i.salida).length;
  const totalRefs = referencias.length;
  const totalIngs = ingresos.length;
  const noLeidos = mensajes.filter(m => !m.leido).length;

  // Validación heurística: cruzar ingresos × referencias × agenda por matrícula
  const problemas = [];
  for(const ing of ingresos){
    if(!ing.matricula) continue;
    const ref = referencias.find(r => r.matricula === ing.matricula);
    const ag  = agenda.find(a => a.matricula === ing.matricula);
    const v = validarServicioCompleto({ ingreso: ing, referencia: ref, agenda: ag });
    if(!v.ok && v.problemas.some(p => p.sev === 'alto' || p.sev === 'critico')){
      problemas.push({ ingreso: ing, validacion: v });
    }
  }

  statsGrid.appendChild(statCard({ label:'En recinto', value:dentro,    iconName:'shield',      color:'green' }));
  statsGrid.appendChild(statCard({ label:'Referencias hoy', value:totalRefs, iconName:'referencias', color:'blue' }));
  statsGrid.appendChild(statCard({ label:'Ingresos hoy',    value:totalIngs, iconName:'ingresos',    color:'amber' }));
  statsGrid.appendChild(statCard({
    label:'Servicios con alertas',
    value: problemas.length,
    iconName:'shield',
    color: problemas.length > 0 ? 'red' : 'green'
  }));
  statsGrid.appendChild(statCard({ label:'Mensajes nuevos', value:noLeidos,  iconName:'mensajes',    color:'purple' }));
  _container.appendChild(statsGrid);

  // Widget de zonas de parking + alertas (ocupación 90% + estancia prolongada)
  const parkingBox = el('div', { class:'panel', style:{padding:'16px', marginBottom:'16px'} });
  parkingBox.appendChild(renderParkingWidget(parkingBox, { ingresos, eventoId: null }));
  _container.appendChild(parkingBox);

  const grid = el('div', { class:'panel-grid-2' });

  const ultimos = el('div', { class:'panel' },
    el('div', { class:'panel-head' },
      el('h3', { class:'panel-title' }, 'Últimos ingresos del día'),
      el('a', { class:'panel-link', onclick:()=>location.hash='#/ingresos' }, 'Ver todos')
    )
  );
  const ultimosList = ingresos.slice(0, 5);
  if(ultimosList.length === 0){
    ultimos.appendChild(el('div', { class:'panel-body' }, emptyState({ title:'Sin ingresos hoy', message:'Los ingresos del día aparecerán aquí.' })));
  } else {
    const wrap = el('div', { class:'table-wrap', style:{ border:'0', boxShadow:'none', borderRadius:'0' } });
    const tbl = el('table', { class:'table' });
    const thead = el('thead', {},
      el('tr', {}, el('th',{},'Pos.'), el('th',{},'Matrícula'), el('th',{},'Conductor'), el('th',{},'Hora'))
    );
    tbl.appendChild(thead);
    const tb = el('tbody');
    for(const i of ultimosList){
      tb.appendChild(el('tr', {},
        el('td', {}, el('span', { class:`cell-pos ${i.posicionManual ? 'manual' : ''}` }, String(i.posicion || '—'))),
        el('td', { class:'cell-plate' }, i.matricula || '—'),
        el('td', {}, i.conductor || '—'),
        el('td', { class:'cell-mute' }, i.entrada || fmtTime(i.createdAt) || '—')
      ));
    }
    tbl.appendChild(tb);
    wrap.appendChild(tbl);
    ultimos.appendChild(wrap);
  }
  grid.appendChild(ultimos);

  const agendaPanel = el('div', { class:'panel' },
    el('div', { class:'panel-head' },
      el('h3', { class:'panel-title' }, 'Agenda de hoy'),
      el('a', { class:'panel-link', onclick:()=>location.hash='#/agenda' }, 'Ver completa')
    )
  );
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const agendaHoy = agenda.filter(a => {
    if(!a.fechaPlanificada) return false;
    const d = a.fechaPlanificada.toDate ? a.fechaPlanificada.toDate() : new Date(a.fechaPlanificada);
    return d.toDateString() === hoy.toDateString();
  }).sort((a,b) => (a.horaPlanificada||'').localeCompare(b.horaPlanificada||''));

  const apb = el('div', { class:'panel-body' });
  if(agendaHoy.length === 0){
    apb.appendChild(emptyState({ title:'Sin citas para hoy', message:'Las citas planificadas aparecerán aquí.' }));
  } else {
    for(const a of agendaHoy.slice(0, 6)){
      apb.appendChild(el('div', { class:'agenda-item' },
        el('div', { class:'agenda-time' }, a.horaPlanificada || '—'),
        el('div', { class:'agenda-info' },
          el('div', { class:'agenda-title' }, a.empresa || a.conductor || a.matricula || '—'),
          el('div', { class:'agenda-meta' }, [a.hall ? `Hall ${a.hall}` : '', a.matricula].filter(Boolean).join(' · '))
        )
      ));
    }
  }
  agendaPanel.appendChild(apb);
  grid.appendChild(agendaPanel);

  _container.appendChild(grid);

  const msgsPanel = el('div', { class:'panel', style:{ marginTop:'16px' } },
    el('div', { class:'panel-head' },
      el('h3', { class:'panel-title' }, 'Mensajes recientes'),
      el('a', { class:'panel-link', onclick:()=>location.hash='#/mensajes' }, 'Ver todos')
    )
  );
  const mpb = el('div', { class:'panel-body' });
  const recent = mensajes.slice(0, 5);
  if(recent.length === 0){
    mpb.appendChild(emptyState({ iconName:'mensajes', title:'Sin mensajes', message:'No hay mensajes recientes.' }));
  } else {
    for(const m of recent){
      mpb.appendChild(el('div', { class:`msg-card ${m.tipo || 'info'}` },
        el('div', { class:'msg-icon', html: icon(m.tipo === 'urgente' ? 'urgent' : m.tipo === 'alerta' ? 'alert' : 'info') }),
        el('div', { class:'msg-body' },
          el('div', { class:'msg-title' }, m.titulo || '—'),
          el('div', { class:'msg-text' }, m.texto || ''),
          el('div', { class:'msg-meta' },
            el('span', {}, m.de || 'Sistema'),
            el('span', {}, fmtRelative(m.createdAt))
          )
        )
      ));
    }
  }
  msgsPanel.appendChild(mpb);
  _container.appendChild(msgsPanel);

  // Panel de servicios con problemas (validador heurístico)
  if(problemas.length > 0){
    const alertPanel = el('div', { class:'panel', style:{marginTop:'16px'} },
      el('div', { class:'panel-head' },
        el('h3', { class:'panel-title', style:{color:'var(--red)'} }, `⚠ ${problemas.length} servicio(s) con alertas`),
      )
    );
    const ab = el('div', { class:'panel-body' });
    const tbl = el('table', { class:'table' });
    tbl.appendChild(el('thead', {}, el('tr', {},
      el('th', {}, 'Matrícula'),
      el('th', {}, 'Pos.'),
      el('th', {}, 'Score'),
      el('th', {}, 'Problemas')
    )));
    const tb = el('tbody');
    for(const p of problemas.slice(0, 10)){
      const sevColor = p.validacion.score < 50 ? 'var(--red)' : 'var(--amber)';
      tb.appendChild(el('tr', {},
        el('td', { class:'cell-plate' }, p.ingreso.matricula),
        el('td', {}, String(p.ingreso.posicion || '—')),
        el('td', { style:{color:sevColor, fontWeight:'700'} }, `${p.validacion.score}/100`),
        el('td', { class:'cell-mute', style:{fontSize:'12px'} },
          p.validacion.problemas.map(pr => pr.msg).join(' · ')
        )
      ));
    }
    tbl.appendChild(tb);
    ab.appendChild(tbl);
    alertPanel.appendChild(ab);
    _container.appendChild(alertPanel);
  }
}

function attachListeners(){
  listLive('referencias', { key: KEY_PREFIX+'refs', orderBy:'createdAt', order:'desc', limit: 500 }, (items) => {
    window.__dashRefs = items;
    render();
  });

  listLive('ingresos', { key: KEY_PREFIX+'ings', orderBy:'createdAt', order:'desc', limit: 500 }, (items) => {
    window.__dashIngs = items;
    render();
  });

  listLive('agenda', { key: KEY_PREFIX+'agenda', orderBy:'fechaPlanificada', order:'asc', limit: 500 }, (items) => {
    window.__dashAgenda = items;
    render();
  });

  listLive('mensajes', { key: KEY_PREFIX+'msgs', orderBy:'createdAt', order:'desc', limit: 10 }, (items) => {
    window.__dashMsgs = items;
    render();
  });
}
