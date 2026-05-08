// ═══════════════════════════════════════════════════════════════
// dashboard.js — módulo Dashboard
// ═══════════════════════════════════════════════════════════════

import { el, clear, icon, fmtTime, fmtRelative } from '../utils.js';
import { listLive, registerListener, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, statCard, emptyState } from './_shared.js';
import { tr } from '../i18n.js';

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

let referencias = [];
let ingresos = [];
let agenda = [];
let mensajes = [];

function render(){
  if(!_container) return;
  clear(_container);

  _container.appendChild(pageHeader({
    title: tr('dashboard'),
    sub: 'Métricas en tiempo real de tu operativa'
  }));

  const statsGrid = el('div', { class:'stats-grid' });
  const dentro = referencias.filter(r => r.estado === 'dentro_fira').length
              + ingresos.filter(i => i.estado === 'dentro' && !i.salida).length;
  const totalRefs = referencias.length;
  const totalIngs = ingresos.length;
  const noLeidos = mensajes.filter(m => !m.leido).length;

  statsGrid.appendChild(statCard({ label:'En recinto', value:dentro,    iconName:'shield',      color:'green' }));
  statsGrid.appendChild(statCard({ label:'Referencias hoy', value:totalRefs, iconName:'referencias', color:'blue' }));
  statsGrid.appendChild(statCard({ label:'Ingresos hoy',    value:totalIngs, iconName:'ingresos',    color:'amber' }));
  statsGrid.appendChild(statCard({ label:'Mensajes nuevos', value:noLeidos,  iconName:'mensajes',    color:'purple' }));
  _container.appendChild(statsGrid);

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
}

function attachListeners(){
  listLive('referencias', { key: KEY_PREFIX+'refs', orderBy:'createdAt', order:'desc', limit: 50 }, (items) => {
    referencias = items;
    render();
  });

  listLive('ingresos', { key: KEY_PREFIX+'ings', orderBy:'createdAt', order:'desc', limit: 50 }, (items) => {
    ingresos = items;
    render();
  });

  listLive('agenda', { key: KEY_PREFIX+'agenda', orderBy:'fechaPlanificada', order:'asc', limit: 50 }, (items) => {
    agenda = items;
    render();
  });

  listLive('mensajes', { key: KEY_PREFIX+'msgs', orderBy:'createdAt', order:'desc', limit: 10 }, (items) => {
    mensajes = items;
    render();
  });
}
