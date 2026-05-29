// ═══════════════════════════════════════════════════════════════
// field-config.js — Panel "Campos del formulario"
//
// Permite al usuario elegir QUÉ campos aparecen en el formulario de
// edición de un módulo y en QUÉ ORDEN, para rellenar más rápido
// (pone arriba los que más usa, oculta los que no necesita).
//
// Se guarda por usuario en Prefs: { hidden:[], order:[] }
// ═══════════════════════════════════════════════════════════════
import { el, openModal, closeModal, toast } from './utils.js';
import { Prefs } from './prefs.js';
import { getCurrentProfile } from './auth.js';

/**
 * Devuelve la lista de campos ordenada y filtrada según la config del usuario.
 *
 * @param {string} modulo - id del módulo ('referencias', etc.)
 * @param {Array} allFields - definición completa: [{ id, label, required }]
 * @returns {Array} campos visibles en el orden configurado
 */
export function getOrderedFields(modulo, allFields){
  const uid = getCurrentProfile()?.id;
  const cfg = Prefs.getFormFields(uid, modulo);
  if(!cfg) return allFields; // sin config → orden por defecto

  const hidden = new Set(cfg.hidden || []);
  const order = cfg.order || [];

  // Primero los del orden guardado, luego los nuevos que no estén en él
  const ordered = [];
  for(const id of order){
    const f = allFields.find(x => x.id === id);
    if(f) ordered.push(f);
  }
  for(const f of allFields){
    if(!order.includes(f.id)) ordered.push(f);
  }
  // Filtrar ocultos — pero NUNCA ocultar los required
  return ordered.filter(f => f.required || !hidden.has(f.id));
}

/**
 * Abre el modal de configuración de campos del formulario.
 *
 * @param {string} modulo
 * @param {Array} allFields - [{ id, label, required }]
 * @param {Function} onSave - callback tras guardar (para re-render)
 */
export function openFieldConfig(modulo, allFields, onSave){
  const uid = getCurrentProfile()?.id;
  const cfg = Prefs.getFormFields(uid, modulo) || { hidden: [], order: [] };

  const hidden = new Set(cfg.hidden || []);
  // Orden de trabajo: guardado + nuevos al final
  let workOrder = [];
  for(const id of (cfg.order || [])){
    if(allFields.find(f => f.id === id)) workOrder.push(id);
  }
  for(const f of allFields){
    if(!workOrder.includes(f.id)) workOrder.push(f.id);
  }

  const body = el('div', { class:'fc-body' });
  body.appendChild(el('p', { class:'cell-mute', style:{marginTop:0, fontSize:'13px'} },
    'Marca qué campos quieres ver en el formulario y arrástralos para reordenar. ',
    'Pon arriba los que más usas. Los campos obligatorios no se pueden ocultar.'));

  const list = el('div', { class:'fc-list' });
  body.appendChild(list);

  let dragId = null;

  function renderList(){
    list.innerHTML = '';
    for(const fid of workOrder){
      const f = allFields.find(x => x.id === fid);
      if(!f) continue;
      const isVisible = f.required || !hidden.has(fid);

      const item = el('div', {
        class:`fc-item ${isVisible ? 'visible' : 'hidden'} ${f.required ? 'required' : ''}`,
        draggable:'true',
        ondragstart: e => {
          dragId = fid;
          e.dataTransfer.effectAllowed = 'move';
        },
        ondragover: e => { e.preventDefault(); item.classList.add('drag-over'); },
        ondragleave: () => item.classList.remove('drag-over'),
        ondrop: e => {
          e.preventDefault();
          item.classList.remove('drag-over');
          if(!dragId || dragId === fid) return;
          const filtered = workOrder.filter(x => x !== dragId);
          const idx = filtered.indexOf(fid);
          filtered.splice(idx, 0, dragId);
          workOrder = filtered;
          dragId = null;
          renderList();
        }
      });

      // Asa de arrastre
      item.appendChild(el('span', { class:'fc-grip', title:'Arrastra para reordenar' }, '⠿'));

      // Nombre del campo
      item.appendChild(el('span', { class:'fc-label' },
        f.label,
        f.required ? el('span', { class:'fc-req' }, ' obligatorio') : null
      ));

      // Toggle visible/oculto
      if(f.required){
        item.appendChild(el('span', { class:'fc-badge fc-badge-req' }, '✓ siempre visible'));
      } else {
        item.appendChild(el('button', {
          class:`fc-toggle ${isVisible ? 'on' : 'off'}`,
          onclick: () => {
            if(hidden.has(fid)) hidden.delete(fid);
            else hidden.add(fid);
            renderList();
          }
        }, isVisible ? '✓ Visible' : '○ Oculto'));
      }

      list.appendChild(item);
    }
  }
  renderList();

  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { class:'btn btn-secondary', onclick: () => {
      // Restaurar: sin orden custom, sin ocultos
      Prefs.setFormFields(uid, modulo, { hidden: [], order: [] });
      toast('Campos restaurados al orden por defecto', 'ok');
      closeModal();
      if(onSave) onSave();
    }}, 'Por defecto'),
    el('button', { class:'btn btn-primary', onclick: () => {
      Prefs.setFormFields(uid, modulo, {
        hidden: Array.from(hidden),
        order: workOrder
      });
      toast('Configuración de campos guardada', 'ok');
      closeModal();
      if(onSave) onSave();
    }}, 'Guardar')
  );

  openModal({ title:'⚙ Campos del formulario', body, size:'md' });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}

// ═══════════════════════════════════════════════════════════════
// CAMPOS EXTRA PERSONALIZABLES (5 por módulo)
// El admin define el nombre visible de extra1..extra5.
// Se guarda global del módulo (no por usuario) en localStorage.
// ═══════════════════════════════════════════════════════════════
const EXTRA_KEY = (modulo) => `beunifyt_extra_labels_${modulo}`;

export function getExtraFieldLabels(modulo){
  try{
    const raw = localStorage.getItem(EXTRA_KEY(modulo));
    return raw ? JSON.parse(raw) : {};
  } catch(_){ return {}; }
}

export function setExtraFieldLabels(modulo, labels){
  try{
    localStorage.setItem(EXTRA_KEY(modulo), JSON.stringify(labels || {}));
  } catch(_){}
}

/**
 * Modal para que el admin renombre los 5 campos extra de un módulo.
 */
export function openExtraFieldsConfig(modulo, onSave){
  const current = getExtraFieldLabels(modulo);
  const body = el('div', { class:'fc-body' });
  body.appendChild(el('p', { class:'cell-mute', style:{marginTop:0, fontSize:'13px'} },
    'Define el nombre de los 5 campos extra. Déjalo vacío para no usarlo. ',
    'Estos nombres se aplican a todos los usuarios del módulo.'));

  const inputs = {};
  for(let i = 1; i <= 5; i++){
    const key = `extra${i}`;
    const inp = el('input', { class:'field-input', value: current[key] || '', placeholder:`Nombre del campo extra ${i}` });
    inputs[key] = inp;
    body.appendChild(el('div', { class:'field', style:{marginBottom:'8px'} },
      el('label', { class:'field-label' }, `Campo extra ${i}`), inp
    ));
  }

  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { class:'btn btn-primary', onclick: () => {
      const labels = {};
      for(let i = 1; i <= 5; i++){
        const v = inputs[`extra${i}`].value.trim();
        if(v) labels[`extra${i}`] = v;
      }
      setExtraFieldLabels(modulo, labels);
      toast('Nombres de campos extra guardados', 'ok');
      closeModal();
      if(onSave) onSave();
    }}, 'Guardar')
  );

  openModal({ title:'⚙ Nombres de campos extra', body, size:'sm' });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}
