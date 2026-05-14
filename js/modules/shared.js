// shared.js — helpers comunes a todos los módulos
import { el, icon } from '../utils.js';

/**
 * Renderiza un teléfono como enlace dual: llamar + WhatsApp.
 * Si no hay teléfono, devuelve un guion.
 */
export function telActions(phone){
  if(!phone) return el('span', { class:'cell-mute' }, '—');
  const clean = String(phone).replace(/[\s\-().]/g, '');
  const wa = clean.startsWith('+') ? clean.slice(1) : clean;
  return el('div', { class:'tel-actions' },
    el('a', { href:`tel:${clean}`, title:`Llamar a ${phone}`, onclick:(e)=>e.stopPropagation() },
      el('span', { html: '📞' })
    ),
    el('a', {
      class:'tel-wa',
      href:`https://wa.me/${wa}`,
      target:'_blank', rel:'noopener',
      title:`WhatsApp a ${phone}`,
      onclick:(e)=>e.stopPropagation()
    },
      el('span', { html: '💬' })
    ),
    el('span', { class:'cell-mute', style:{marginLeft:'4px',fontSize:'12px'} }, phone)
  );
}

export function pageHeader({ title, sub, actions=[] }){
  return el('div', { class:'page-header' },
    el('div', {},
      el('h1', { class:'page-title' }, title),
      sub ? el('p', { class:'page-sub' }, sub) : null
    ),
    el('div', { class:'page-actions' }, ...actions)
  );
}

export function emptyState({ iconName='inbox', title='Sin datos', message='', action=null, columns=null, rowsCount=3 }){
  const wrap = el('div', { class:'empty-with-skeleton' });

  // Si hay columnas, mostramos la tabla con esqueleto encima del mensaje
  if(columns && columns.length){
    const tableWrap = el('div', { class:'table-wrap empty-skeleton-table' });
    const tbl = el('table', { class:'table' });
    tbl.appendChild(el('thead', {},
      el('tr', {}, ...columns.map(c => el('th', {}, c)))
    ));
    const tb = el('tbody');
    for(let i = 0; i < rowsCount; i++){
      const tr = el('tr', { class:'empty-skeleton-row' });
      for(const c of columns) tr.appendChild(el('td', {}, el('span', { class:'skel-bar' })));
      tb.appendChild(tr);
    }
    tbl.appendChild(tb);
    tableWrap.appendChild(tbl);
    wrap.appendChild(tableWrap);
  }

  wrap.appendChild(el('div', { class:'empty empty-floating' },
    el('div', { class:'empty-icon' }, el('span', { html: icon(iconName) })),
    el('div', { class:'empty-title' }, title),
    message ? el('div', { class:'empty-msg' }, message) : null,
    action
  ));
  return wrap;
}

export function statCard({ label, value, iconName='dashboard', color='blue' }){
  return el('div', { class:'stat-card' },
    el('div', { class:`stat-icon ${color}` }, el('span', { html: icon(iconName) })),
    el('div', { class:'stat-content' },
      el('div', { class:'stat-label' }, label),
      el('div', { class:'stat-value' }, String(value))
    )
  );
}

export function searchInput({ placeholder='Buscar…', onInput }){
  const wrap = el('div', { class:'search-box' },
    el('span', { html: icon('search') })
  );
  const input = el('input', { type:'search', placeholder, oninput:(e)=> onInput(e.target.value) });
  wrap.appendChild(input);
  return wrap;
}

export function selectInput({ value, options=[], onChange }){
  const sel = el('select', { class:'select', onchange:(e)=> onChange(e.target.value) });
  for(const o of options){
    const op = el('option', { value: o.value }, o.label);
    if(String(value) === String(o.value)) op.selected = true;
    sel.appendChild(op);
  }
  return sel;
}

export function badge(text, kind='gray'){
  return el('span', { class:`badge badge-${kind}` }, text);
}

export function statusBadge(status){
  const map = {
    'dentro_fira':    { label:'Dentro Fira',    kind:'green' },
    'rampa_parking':  { label:'Rampa/Parking',  kind:'amber' },
    'en_camino':      { label:'En camino',      kind:'blue' },
    'prerregistrado': { label:'Prerregistrado', kind:'purple' },
    'salida':         { label:'Salida',         kind:'gray' },
    'pendiente':      { label:'Pendiente',      kind:'amber' },
    'llegado':        { label:'Llegado',        kind:'green' },
    'planificado':    { label:'Planificado',    kind:'blue' },
    'activo':         { label:'Activo',         kind:'green' },
    'finalizado':     { label:'Finalizado',     kind:'gray' },
    'cancelado':      { label:'Cancelado',      kind:'red' },
    'dentro':         { label:'Dentro',         kind:'green' },
    'almacen':        { label:'Almacén',        kind:'gray' },
    'en_ruta':        { label:'En ruta',        kind:'blue' }
  };
  const m = map[status] || { label: status || '—', kind:'gray' };
  return badge(m.label, m.kind);
}

// ── Botones Import/Export/Plantilla Excel ────────────────────
import { exportToExcel, downloadTemplate, importFromExcel, getSchema } from '../excel.js';
import { logger } from '../logger.js';
import { toast, openModal, closeModal, el as _el } from '../utils.js';

/**
 * Devuelve un array de botones Excel para meter en pageHeader actions.
 * @param {string} modulo - nombre de la colección (referencias, ingresos, etc.)
 * @param {object} opts - { eventoId, canImport, canExport }
 */
export function excelButtons(modulo, opts = {}){
  const buttons = [];
  if(opts.canExport !== false){
    buttons.push(el('button', {
      class:'btn btn-secondary btn-sm', title:'Exportar a Excel',
      onclick: () => exportToExcel(modulo, { eventoId: opts.eventoId })
    }, el('span', { html: '📤' }), 'Exportar'));
  }
  if(opts.canImport){
    buttons.push(el('button', {
      class:'btn btn-secondary btn-sm', title:'Descargar plantilla',
      onclick: () => downloadTemplate(modulo)
    }, el('span', { html: '📋' }), 'Plantilla'));

    buttons.push(el('button', {
      class:'btn btn-secondary btn-sm', title:'Importar desde Excel',
      onclick: () => openImportDialog(modulo, opts)
    }, el('span', { html: '📥' }), 'Importar'));
  }
  return buttons;
}

function openImportDialog(modulo, opts){
  const body = el('div', {});
  body.appendChild(el('p', { style:{ marginTop:0, color:'var(--text-2)', fontSize:'13px' } },
    `Selecciona un archivo Excel con la estructura de la plantilla. Las filas duplicadas se omitirán.`));

  const input = el('input', {
    type:'file',
    accept:'.xlsx,.xls,.csv',
    class:'field-input',
    style:{ marginTop:'8px' }
  });
  body.appendChild(input);

  const summaryDiv = el('div', { style:{ marginTop:'12px', fontSize:'13px' } });
  body.appendChild(summaryDiv);

  const btnImport = el('button', { class:'btn btn-primary' }, 'Importar');
  btnImport.onclick = async () => {
    const file = input.files[0];
    if(!file){ toast('Selecciona un archivo', 'warn'); return; }
    btnImport.disabled = true;
    btnImport.textContent = 'Importando…';
    try{
      const res = await importFromExcel(modulo, file, opts);
      summaryDiv.innerHTML = '';
      summaryDiv.appendChild(el('div', { class:'badge badge-green' }, `${res.created} creados`));
      summaryDiv.appendChild(el('span', {}, ' '));
      summaryDiv.appendChild(el('div', { class:'badge badge-amber' }, `${res.duplicates} duplicados`));
      summaryDiv.appendChild(el('span', {}, ' '));
      summaryDiv.appendChild(el('div', { class:'badge badge-red' }, `${res.errors} errores`));
      if(res.errorRows && res.errorRows.length){
        const list = el('ul', { style:{ marginTop:'8px', paddingLeft:'18px', fontSize:'12px', color:'var(--text-3)' } });
        for(const er of res.errorRows.slice(0, 10)){
          list.appendChild(el('li', {}, `Fila ${er.row}: ${er.msg}`));
        }
        summaryDiv.appendChild(list);
      }
      btnImport.textContent = 'Cerrar';
      btnImport.onclick = closeModal;
    } catch(e){
      btnImport.disabled = false;
      btnImport.textContent = 'Reintentar';
    }
  };

  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    btnImport
  );

  openModal({ title:`Importar ${modulo} desde Excel`, body });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}

/**
 * Lanza la impresión de un registro abriendo el módulo de impresión
 * con el registro pre-seleccionado y disparando print automáticamente.
 *
 * @param {string} modulo - 'referencias' | 'ingresos' | 'agenda'
 * @param {object} record - registro con id (al menos) y opcionalmente eventoId
 */
export function printRecord(modulo, record){
  if(!record || !record.id){
    import('../utils.js').then(({ toast }) => toast('Sin registro para imprimir', 'err'));
    return;
  }
  try{
    sessionStorage.setItem('beunifyt_print_target', JSON.stringify({
      modulo,
      eventoId: record.eventoId || record.evento_id || '',
      recordId: record.id
    }));
  } catch(_){}
  // Navegar al módulo de impresión
  window.location.hash = '#impresion';
}
