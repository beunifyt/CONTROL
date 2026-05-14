// ═══════════════════════════════════════════════════════════════
// table-helpers.js — Tabla avanzada
//
// - Columnas reordenables drag-drop
// - Configuración de columnas (visible/oculta, orden) guardada por usuario
// - Detalle expandible al click en fila
// - Filtros guardados con nombre
// ═══════════════════════════════════════════════════════════════

import { el, icon } from './utils.js';
import { Prefs } from './prefs.js';
import { getCurrentProfile } from './auth.js';
import { logger } from './logger.js';

/**
 * Renderiza una tabla con columnas configurables.
 *
 * @param {object} opts
 * @param {string} opts.module - id del módulo (para guardar config)
 * @param {Array} opts.columns - definición: [{ id, label, width, render(row), default }]
 * @param {Array} opts.rows - filas a renderizar
 * @param {function} opts.detailRenderer - función(row) que devuelve nodo para detalle expandible
 * @param {function} opts.rowActions - función(row) que devuelve nodo con botones
 * @returns {HTMLElement}
 */
export function smartTable(opts){
  const {module, columns, rows, detailRenderer, rowActions, inlineEdit} = opts;
  const profile = getCurrentProfile();
  const uid = profile?.id;

  // Cargar config columnas
  const savedConfig = Prefs.getColumns(uid, module);
  let activeColumns = savedConfig || columns.filter(c => c.default !== false).map(c => c.id);

  const wrap = el('div', {class:'table-wrap'});

  // Botón configuración columnas
  const configBar = el('div', {style:{
    padding:'8px 12px', borderBottom:'1px solid var(--border)',
    background:'var(--surface-2)', display:'flex', gap:'8px',
    alignItems:'center', fontSize:'12px'
  }});
  configBar.appendChild(el('span', {class:'cell-mute'}, `${rows.length} resultados`));
  configBar.appendChild(el('div', {class:'flex-1'}));
  if(inlineEdit){
    configBar.appendChild(el('span', { class:'inline-edit-hint' },
      '✎ Haz clic en los campos vacíos (—) para rellenarlos sin abrir el registro'));
  }
  configBar.appendChild(el('button', {
    class:'btn btn-ghost btn-sm',
    onclick: () => openColumnConfig(module, columns, activeColumns, (newConfig) => {
      activeColumns = newConfig;
      Prefs.setColumns(uid, module, newConfig);
      // Re-renderizar tabla
      wrap.replaceWith(smartTable({...opts}));
    })
  }, '⚙ Columnas'));
  wrap.appendChild(configBar);

  const tbl = el('table', {class:'table'});

  // Header con drag-drop
  const thead = el('thead');
  const trHead = el('tr');
  for(const colId of activeColumns){
    const col = columns.find(c => c.id === colId);
    if(!col) continue;
    trHead.appendChild(el('th', {
      style: col.width ? {width: col.width} : {},
      draggable: 'true',
      ondragstart: e => {
        e.dataTransfer.setData('col-id', colId);
        e.dataTransfer.effectAllowed = 'move';
      },
      ondragover: e => {e.preventDefault();},
      ondrop: e => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('col-id');
        if(draggedId === colId) return;
        const newOrder = activeColumns.filter(x => x !== draggedId);
        const idx = newOrder.indexOf(colId);
        newOrder.splice(idx, 0, draggedId);
        Prefs.setColumns(uid, module, newOrder);
        wrap.replaceWith(smartTable({...opts}));
      }
    }, col.label));
  }
  if(rowActions) trHead.appendChild(el('th', {}, 'Acciones'));
  // Columna espaciadora: absorbe el ancho sobrante para que la tabla
  // ocupe todo el contenedor en lugar de quedarse estrecha
  trHead.appendChild(el('th', { class:'col-spacer' }));
  thead.appendChild(trHead);
  tbl.appendChild(thead);

  // Body
  const tbody = el('tbody');
  for(const row of rows){
    const tr = el('tr', {
      style: detailRenderer ? {cursor:'pointer'} : {},
      onclick: detailRenderer ? (e) => {
        if(e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.tagName === 'A') return;
        if(e.target.closest('.inline-edit-cell')) return; // no abrir detalle si edito inline
        toggleDetail(tr, row, detailRenderer, activeColumns.length + (rowActions ? 1 : 0) + 1);
      } : null
    });
    for(const colId of activeColumns){
      const col = columns.find(c => c.id === colId);
      if(!col) continue;
      const td = el('td');

      // ── Edición inline de campos vacíos ──
      // Solo si el módulo lo activa, el campo es editable inline, y está vacío
      const rawValue = row[col.id];
      const isEmpty = rawValue == null || rawValue === '' || rawValue === undefined;

      if(inlineEdit && col.inlineEditable !== false && isEmpty){
        td.classList.add('inline-edit-cell');
        td.appendChild(buildInlineEditCell(module, row, col, () => {
          wrap.replaceWith(smartTable({...opts}));
        }));
      } else {
        const content = col.render ? col.render(row) : (row[col.id] != null ? String(row[col.id]) : '—');
        if(content instanceof Node) td.appendChild(content);
        else td.appendChild(document.createTextNode(content));
      }
      tr.appendChild(td);
    }
    if(rowActions){
      const td = el('td');
      const actions = rowActions(row);
      if(actions instanceof Node) td.appendChild(actions);
      tr.appendChild(td);
    }
    // Celda espaciadora (par del th.col-spacer)
    tr.appendChild(el('td', { class:'col-spacer' }));
    tbody.appendChild(tr);
  }
  tbl.appendChild(tbody);
  wrap.appendChild(tbl);
  return wrap;
}

// ─── Celda de edición inline ──────────────────────────────────
// Muestra "—" como botón; al hacer clic se convierte en input;
// Enter guarda, Escape cancela, blur guarda.
function buildInlineEditCell(module, row, col, onSaved){
  const span = el('span', {
    class:'inline-edit-empty',
    title:'Clic para rellenar'
  }, '—');

  span.onclick = (e) => {
    e.stopPropagation();
    const cell = span.parentElement;
    cell.innerHTML = '';

    // Tipo de input según el campo
    let input;
    const fieldType = col.inlineType || 'text';
    if(fieldType === 'select' && Array.isArray(col.inlineOptions)){
      input = el('select', { class:'inline-edit-input' });
      input.appendChild(el('option', { value:'' }, '—'));
      for(const opt of col.inlineOptions){
        input.appendChild(el('option', { value: opt.value }, opt.label));
      }
    } else {
      input = el('input', {
        type: fieldType === 'number' ? 'number' : fieldType === 'time' ? 'time' : 'text',
        class:'inline-edit-input',
        placeholder: col.label
      });
    }

    let saved = false;
    const save = async () => {
      if(saved) return;
      saved = true;
      const val = input.value.trim();
      if(!val){
        // vacío → restaurar el "—"
        cell.innerHTML = '';
        cell.appendChild(buildInlineEditCell(module, row, col, onSaved));
        return;
      }
      try{
        const { update } = await import('./db.js');
        const payload = {};
        payload[col.id] = col.inlineType === 'number' ? Number(val) : val;
        await update(module, row.id, payload);
        const { toast } = await import('./utils.js');
        toast(`${col.label} guardado`, 'ok', 1500);
        if(onSaved) onSaved();
      } catch(err){
        const { toast } = await import('./utils.js');
        toast('Error al guardar: ' + (err.message || ''), 'err');
        cell.innerHTML = '';
        cell.appendChild(buildInlineEditCell(module, row, col, onSaved));
      }
    };
    const cancel = () => {
      if(saved) return;
      saved = true;
      cell.innerHTML = '';
      cell.appendChild(buildInlineEditCell(module, row, col, onSaved));
    };

    input.onkeydown = (ev) => {
      ev.stopPropagation();
      if(ev.key === 'Enter'){ ev.preventDefault(); save(); }
      if(ev.key === 'Escape'){ ev.preventDefault(); cancel(); }
    };
    input.onblur = save;
    input.onclick = ev => ev.stopPropagation();

    cell.appendChild(input);
    input.focus();
  };

  return span;
}

function toggleDetail(tr, row, renderer, colspan){
  const next = tr.nextElementSibling;
  if(next && next.classList.contains('detail-row')){
    next.remove();
    return;
  }
  const detailTr = el('tr', {class:'detail-row'});
  const detailTd = el('td', {colspan: String(colspan), style:{
    background:'var(--surface-2)', padding:'16px 20px',
    borderBottom:'2px solid var(--primary)'
  }});
  detailTd.appendChild(renderer(row));
  detailTr.appendChild(detailTd);
  tr.insertAdjacentElement('afterend', detailTr);
}

function openColumnConfig(module, allColumns, activeColumns, onSave){
  import('./utils.js').then(({openModal, closeModal, el}) => {
    const body = el('div', {});
    body.appendChild(el('p', {class:'cell-mute', style:{fontSize:'12px', marginTop:0}},
      'Marca las columnas visibles y arrástralas para reordenar.'));

    const list = el('div', {});
    const current = [...activeColumns];

    function renderList(){
      list.innerHTML = '';
      // Primero las activas, luego las inactivas
      const ordered = [...current.map(id => allColumns.find(c => c.id === id)).filter(Boolean),
                      ...allColumns.filter(c => !current.includes(c.id))];

      for(const col of ordered){
        const isActive = current.includes(col.id);
        list.appendChild(el('div', {
          class:'perm-cell',
          style:{cursor:'pointer', marginBottom:'4px'},
          draggable: 'true',
          ondragstart: e => {
            e.dataTransfer.setData('col-config', col.id);
          },
          ondragover: e => {e.preventDefault();},
          ondrop: e => {
            e.preventDefault();
            const draggedId = e.dataTransfer.getData('col-config');
            if(draggedId === col.id) return;
            const filtered = current.filter(x => x !== draggedId);
            const idx = filtered.indexOf(col.id);
            if(idx >= 0){
              filtered.splice(idx, 0, draggedId);
            } else {
              filtered.push(draggedId);
            }
            current.length = 0;
            current.push(...filtered);
            renderList();
          },
          onclick: () => {
            if(isActive){
              const i = current.indexOf(col.id);
              if(i >= 0) current.splice(i, 1);
            } else {
              current.push(col.id);
            }
            renderList();
          }
        },
          el('span', {}, col.label),
          el('span', {style:{color: isActive ? 'var(--green)' : 'var(--text-mute)'}}, isActive ? '✓ visible' : '○')
        ));
      }
    }
    renderList();
    body.appendChild(list);

    const footer = el('div', {class:'modal-foot'},
      el('button', {class:'btn btn-secondary', onclick: closeModal}, 'Cancelar'),
      el('button', {class:'btn btn-primary', onclick: () => {
        onSave(current);
        closeModal();
      }}, 'Guardar')
    );
    openModal({title:'Configurar columnas', body});
    setTimeout(() => body.parentElement.appendChild(footer), 60);
  });
}

// ═══════════════════════════════════════════════════════════════
// FILTROS GUARDADOS UI
// Permite guardar combinaciones de filtros con nombre y reactivarlas.
// ═══════════════════════════════════════════════════════════════

/**
 * Renderiza la UI de filtros guardados.
 *
 * @param {string} module - id del módulo (referencias, ingresos, etc.)
 * @param {object} currentFilters - filtros actuales {key: value}
 * @param {function} onApply - callback({filters}) cuando se aplica un filtro guardado
 */
export function savedFiltersBar({module, currentFilters, onApply}){
  const profile = getCurrentProfile();
  const uid = profile?.id;
  const saved = Prefs.getFilters(uid, module);

  const wrap = el('div', { class:'saved-filters-bar' });

  // Botón guardar filtro actual
  wrap.appendChild(el('button', {
    class:'btn btn-ghost btn-sm', title:'Guardar filtros actuales',
    onclick: () => promptSaveFilter(uid, module, currentFilters)
  }, '⭐ Guardar filtro'));

  // Chips de filtros guardados
  for(const f of saved){
    const chip = el('div', { class:'saved-filter-chip' },
      el('span', {
        class:'sfc-label',
        onclick: () => onApply(f.filters)
      }, f.name),
      el('button', {
        class:'sfc-remove',
        title:'Eliminar',
        onclick: e => {
          e.stopPropagation();
          Prefs.removeFilter(uid, module, f.id);
          if(onApply) onApply(null); // refresca
        }
      }, '×')
    );
    wrap.appendChild(chip);
  }

  return wrap;
}

function promptSaveFilter(uid, module, currentFilters){
  // No usar openModal aquí por circular import; usar prompt nativo
  const name = window.prompt('Nombre del filtro:');
  if(!name || !name.trim()) return;
  Prefs.addFilter(uid, module, {
    name: name.trim(),
    filters: JSON.parse(JSON.stringify(currentFilters || {}))
  });
  // Trigger un repintado disparando evento
  document.dispatchEvent(new CustomEvent('saved-filters-changed', { detail: { module } }));
  if(window.__beunifyt_toast) window.__beunifyt_toast('Filtro guardado', 'ok');
}
