// empresas.js — portal B2B
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, matchesSearch } from '../utils.js';
import { listLive, create, update, remove, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, searchInput, badge, excelButtons } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';

let _container = null;
let _items = [];
let _preregs = [];
let _search = '';
let _subtab = 'empresas'; // 'empresas' | 'preregistros'
const KEY_PREFIX = 'mod:empresas:';

export async function init(container){
  _container = container;
  render();
  listLive('empresas', { key: KEY_PREFIX+'all', orderBy:'nombre' }, (items) => {
    _items = items;
    render();
  });
  listLive('preregistros', { key: KEY_PREFIX+'pre', orderBy:'createdAt', order:'desc' }, (items) => {
    _preregs = items;
    render();
  });
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  _container = null;
}

function render(){
  if(!_container) return;
  clear(_container);
  const p = getCurrentProfile();

  const actions = [];
  if(canCreate(p)){
    actions.push(el('button', {
      class:'btn btn-primary',
      onclick: () => openForm(null)
    }, el('span', { html: icon('plus') }), 'Nueva empresa'));
  }
  actions.push(...excelButtons('empresas', { canImport: canCreate(p), canExport: true }));

  _container.appendChild(pageHeader({
    title:'Empresas',
    sub:'Portal B2B con CIF, nivel y preregistros pendientes',
    actions
  }));

  // Sub-tabs
  const bloqueadasCount = _items.filter(e => e.nivel === 'bloqueada').length;
  const tabs = el('div', { class:'role-tabs', style:{marginBottom:'12px'} });
  tabs.appendChild(el('button', {
    class:`role-tab ${_subtab === 'empresas' ? 'active' : ''}`,
    onclick: () => { _subtab = 'empresas'; render(); }
  }, `🏢 Empresas (${_items.length})`));
  tabs.appendChild(el('button', {
    class:`role-tab ${_subtab === 'preregistros' ? 'active' : ''}`,
    onclick: () => { _subtab = 'preregistros'; render(); }
  }, `📋 Preregistros (${_preregs.length})`));
  tabs.appendChild(el('button', {
    class:`role-tab ${_subtab === 'bloqueadas' ? 'active' : ''}`,
    onclick: () => { _subtab = 'bloqueadas'; render(); }
  }, `🚫 Blacklist (${bloqueadasCount})`));
  _container.appendChild(tabs);

  if(_subtab === 'preregistros'){
    renderPreregistros();
    return;
  }

  _container.appendChild(el('div', { class:'filter-row' },
    searchInput({ placeholder:'Buscar nombre, CIF…', onInput: v => { _search = v; renderGrid(); } })
  ));

  const grid = el('div', { id:'empresas-grid' });
  _container.appendChild(grid);
  renderGrid();
}

function renderPreregistros(){
  if(_preregs.length === 0){
    _container.appendChild(emptyState({
      iconName:'empresas', title:'Sin preregistros',
      message:'Las empresas que se registren desde el portal público aparecerán aquí.'
    }));
    return;
  }
  const wrap = el('div', { class:'table-wrap' });
  const tbl = el('table', { class:'table' });
  tbl.appendChild(el('thead', {}, el('tr', {},
    el('th',{},'Empresa'), el('th',{},'CIF'), el('th',{},'Contacto'),
    el('th',{},'Fecha'), el('th',{},'Acciones')
  )));
  const tb = el('tbody');
  for(const pr of _preregs){
    const fecha = pr.createdAt ? (pr.createdAt.toDate ? pr.createdAt.toDate() : new Date(pr.createdAt)) : null;
    tb.appendChild(el('tr', {},
      el('td', { class:'cell-strong' }, pr.nombre || '—'),
      el('td', { class:'cell-mute' }, pr.cif || '—'),
      el('td', { class:'cell-mute' }, [pr.email, pr.telefono].filter(Boolean).join(' · ')),
      el('td', { class:'cell-mute' }, fecha ? fecha.toLocaleDateString() : '—'),
      el('td', {}, el('div', { class:'row-actions' },
        el('button', { class:'btn btn-primary btn-sm', onclick: () => aprobarPrereg(pr) }, '✓ Aprobar'),
        el('button', { class:'btn btn-secondary btn-sm', onclick: () => rechazarPrereg(pr) }, '✕ Rechazar')
      ))
    ));
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  _container.appendChild(wrap);
}

async function aprobarPrereg(pr){
  try{
    await create('empresas', {
      nombre: pr.nombre, cif: pr.cif, email: pr.email,
      telefono: pr.telefono, direccion: pr.direccion || '',
      nivel: 'estandar'
    });
    await remove('preregistros', pr.id);
    toast(`Empresa "${pr.nombre}" aprobada`, 'ok');
  } catch(e){ toast(e.message, 'err'); }
}

async function rechazarPrereg(pr){
  const ok = await confirmModal({
    title:'Rechazar preregistro',
    message:`¿Rechazar a "${pr.nombre}"?`, danger:true, okText:'Rechazar'
  });
  if(!ok) return;
  try{
    await remove('preregistros', pr.id);
    toast('Rechazado', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}

function renderGrid(){
  const grid = document.getElementById('empresas-grid');
  if(!grid) return;
  clear(grid);
  const p = getCurrentProfile();

  let base = _items;
  if(_subtab === 'bloqueadas') base = _items.filter(e => e.nivel === 'bloqueada');
  const filtered = base.filter(e => matchesSearch(_search, e.nombre, e.cif, e.email));

  if(filtered.length === 0){
    grid.appendChild(emptyState({
      iconName:'empresas',
      title: _items.length === 0 ? 'Sin empresas' : 'Sin resultados',
      message: _items.length === 0 ? 'Añade la primera empresa.' : 'Prueba con otro término.'
    }));
    return;
  }

  const cards = el('div', { class:'cards-grid' });
  for(const e of filtered){
    const nivelKind = e.nivel === 'verificada' ? 'green' : e.nivel === 'bloqueada' ? 'red' : 'gray';
    const nivelLabel = e.nivel === 'verificada' ? 'Verificada' : e.nivel === 'bloqueada' ? 'Bloqueada' : 'Estándar';
    const card = el('div', { class:'entity-card' },
      el('div', { class:'entity-card-head' },
        el('div', {},
          el('h3', { class:'entity-card-title' }, e.nombre || '—'),
          el('div', { class:'entity-card-sub' }, e.cif || '')
        ),
        badge(nivelLabel, nivelKind)
      ),
      e.email ? el('div', { class:'cell-mute' }, e.email) : null,
      e.telefono ? el('div', { class:'cell-mute' }, e.telefono) : null,
      e.direccion ? el('div', { class:'cell-mute', style:{fontSize:'12px'} }, e.direccion) : null,
      el('div', { class:'entity-card-foot' },
        canEdit(p) ? el('button', { class:'btn btn-secondary btn-sm', onclick: () => openForm(e) },
          el('span', { html: icon('edit') }), 'Editar'
        ) : null,
        canDelete(p) ? el('button', { class:'btn btn-danger btn-sm', onclick: () => deleteItem(e) },
          el('span', { html: icon('trash') })
        ) : null
      )
    );
    cards.appendChild(card);
  }
  grid.appendChild(cards);
}

function openForm(item){
  const isEdit = !!item;
  const data = item || {
    nombre:'', cif:'', email:'', telefono:'', direccion:'', ciudad:'', contacto:'',
    nivel:'estandar', notas:'',
    rgpdAceptado:false, rgpdFecha:'', viesVerificado:false, viesFecha:''
  };
  let _rgpd = !!data.rgpdAceptado;
  let _viesData = null; // { valid, name, address }

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    const payload = {
      nombre: fd.nombre, cif: fd.cif ? String(fd.cif).toUpperCase() : '',
      email: fd.email, telefono: fd.telefono, direccion: fd.direccion,
      ciudad: fd.ciudad || '', contacto: fd.contacto || '',
      nivel: fd.nivel || 'estandar', notas: fd.notas,
      rgpdAceptado: _rgpd,
      rgpdFecha: _rgpd ? (data.rgpdFecha || new Date().toISOString().slice(0,10)) : '',
      viesVerificado: !!(_viesData && _viesData.valid),
      viesFecha: _viesData && _viesData.valid ? new Date().toISOString().slice(0,10) : (data.viesFecha || '')
    };
    if(!_rgpd && payload.nivel !== 'bloqueada'){
      if(!confirm('La empresa no tiene RGPD aceptado. ¿Guardar igualmente?')) return;
    }
    try{
      if(isEdit) await update('empresas', item.id, payload);
      else await create('empresas', payload);
      toast('Guardado', 'ok');
      closeModal();
    } catch(e){ toast(e.message, 'err'); }
  }});

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Nombre', name:'nombre', value:data.nombre, required:true }));

  // CIF con verificación VIES
  const cifWrap = el('div', { class:'field-wrap' });
  cifWrap.appendChild(el('label', { class:'field-label' }, 'CIF / VAT'));
  const cifInputRow = el('div', { class:'flex gap-2', style:{ alignItems:'stretch' } });
  const cifInput = el('input', {
    type:'text', name:'cif', class:'field-input', value:data.cif || '',
    style:{ textTransform:'uppercase' }
  });
  const viesBtn = el('button', {
    type:'button', class:'btn btn-secondary btn-sm',
    style:{ whiteSpace:'nowrap' },
    onclick: async () => {
      const cif = cifInput.value.trim();
      if(!cif){ toast('Introduce un CIF primero', 'warn'); return; }
      viesBtn.disabled = true;
      viesBtn.textContent = 'Verificando…';
      try{
        const { verifyVAT } = await import('../vies.js');
        const r = await verifyVAT(cif);
        _viesData = r;
        if(r.valid){
          viesStatus.innerHTML = `<span style="color:#15803D;font-weight:600">✓ Verificada VIES</span> · ${r.name || ''} <span class="cell-mute">(${r.source})</span>`;
          // Si VIES nos da el nombre y el formulario está vacío, lo rellenamos
          if(r.name){
            const nombreInput = form.querySelector('input[name="nombre"]');
            if(nombreInput && !nombreInput.value) nombreInput.value = r.name;
          }
        } else {
          viesStatus.innerHTML = `<span style="color:#DC2626">✕ No verificado</span> ${r.error ? '· ' + r.error : ''}`;
        }
      } catch(e){
        viesStatus.innerHTML = `<span style="color:#DC2626">Error: ${e.message}</span>`;
      } finally {
        viesBtn.disabled = false;
        viesBtn.textContent = '✓ Verificar VIES';
      }
    }
  }, '✓ Verificar VIES');
  cifInputRow.appendChild(cifInput);
  cifInputRow.appendChild(viesBtn);
  cifWrap.appendChild(cifInputRow);
  const viesStatus = el('div', { class:'cell-mute', style:{ fontSize:'12px', marginTop:'4px', minHeight:'18px' } });
  if(data.viesVerificado) viesStatus.innerHTML = `<span style="color:#15803D">✓ Verificada VIES</span> · ${data.viesFecha || ''}`;
  cifWrap.appendChild(viesStatus);
  grid.appendChild(cifWrap);

  grid.appendChild(formField({ label:'Email', name:'email', type:'email', value:data.email }));
  grid.appendChild(formField({ label:'Teléfono', name:'telefono', value:data.telefono }));
  grid.appendChild(formField({ label:'Contacto', name:'contacto', value:data.contacto }));
  grid.appendChild(formField({ label:'Dirección', name:'direccion', value:data.direccion, full:true }));
  grid.appendChild(formField({ label:'Ciudad', name:'ciudad', value:data.ciudad }));
  grid.appendChild(formField({ label:'Nivel', name:'nivel', value:data.nivel, options:[
    { value:'estandar', label:'Estándar' },
    { value:'verificada', label:'Verificada' },
    { value:'bloqueada', label:'Bloqueada' }
  ]}));
  grid.appendChild(formField({ label:'Notas', name:'notas', type:'textarea', value:data.notas, full:true }));
  form.appendChild(grid);

  // ── Sección RGPD ──
  const rgpdSection = el('div', { class:'form-section' });
  rgpdSection.appendChild(el('div', { class:'form-section-head' }, '📋 RGPD'));
  const rgpdLabel = el('label', { class:'rgpd-check' },
    el('input', {
      type:'checkbox', checked: _rgpd ? 'checked' : null,
      onchange: e => { _rgpd = e.target.checked; rgpdInfo.style.display = _rgpd ? '' : 'none'; }
    }),
    el('span', {}, 'La empresa ha aceptado el tratamiento de datos según RGPD'),
  );
  rgpdSection.appendChild(rgpdLabel);
  const rgpdInfo = el('div', { class:'cell-mute', style:{ marginTop:'6px', fontSize:'11px', display: _rgpd ? '' : 'none' } },
    data.rgpdFecha ? `Aceptado el ${data.rgpdFecha}` : 'Se registrará la fecha al guardar.'
  );
  rgpdSection.appendChild(rgpdInfo);
  form.appendChild(rgpdSection);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary', onclick: () => form.requestSubmit() }, 'Guardar')
  );

  openModal({ title: isEdit ? 'Editar empresa' : 'Nueva empresa', body: form, size:'lg' });
  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title:'Eliminar empresa', message:`¿Eliminar "${item.nombre}"?`,
    danger:true, okText:'Eliminar'
  });
  if(!ok) return;
  try{ await remove('empresas', item.id); toast('Eliminado', 'ok'); }
  catch(e){ toast(e.message, 'err'); }
}
