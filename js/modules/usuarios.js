// usuarios.js — gestión de usuarios + matriz de permisos por rol
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, fmtDate } from '../utils.js';
import { listLive, list, update, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, badge } from './shared.js';
import { isAdmin, ROLE_LABEL, ROLES, MODULES, getPerms, savePerms, DEFAULT_PERMS } from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { createInvite, listInvites, deleteInvite } from '../invites.js';
import { appBaseUrl } from '../firebase-config.js';

let _container = null;
let _items = [];
const KEY_PREFIX = 'mod:usuarios:';

export async function init(container){
  _container = container;
  render();
  listLive('users', { key: KEY_PREFIX+'all', orderBy:'createdAt', order:'desc' }, (items) => {
    _items = items;
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

  if(!isAdmin(p)){
    _container.appendChild(emptyState({
      iconName:'shield', title:'Acceso restringido',
      message:'Solo los administradores pueden ver este módulo.'
    }));
    return;
  }

  const actions = [
    el('button', { class:'btn btn-secondary', onclick: openInvitesPanel },
      el('span', { html: icon('plus') }), 'Crear invitación'),
    el('button', { class:'btn btn-primary', onclick: openPermsModal },
      el('span', { html: icon('shield') }), 'Permisos por rol')
  ];

  _container.appendChild(pageHeader({
    title:'Usuarios',
    sub:'Administración de cuentas y permisos',
    actions
  }));

  if(_items.length === 0){
    _container.appendChild(emptyState({
      iconName:'usuarios', title:'Sin usuarios',
      message:'Los usuarios aparecerán aquí cuando se registren.'
    }));
    return;
  }

  const wrap = el('div', { class:'table-wrap' });
  const tbl = el('table', { class:'table' });
  tbl.appendChild(el('thead', {}, el('tr', {},
    el('th',{},'Nombre'), el('th',{},'Email'), el('th',{},'Rol'),
    el('th',{},'Empresa'), el('th',{},'Estado'), el('th',{},'Creado'), el('th',{},'Acciones')
  )));
  const tb = el('tbody');
  for(const u of _items){
    tb.appendChild(el('tr', {},
      el('td', { class:'cell-strong' }, u.displayName || '—'),
      el('td', { class:'cell-mute' }, u.email || '—'),
      el('td', {}, badge(ROLE_LABEL[u.role] || u.role || 'user', u.role === 'admin' ? 'purple' : u.role === 'supervisor' ? 'blue' : u.role === 'operario' ? 'amber' : 'gray')),
      el('td', { class:'cell-mute' }, u.empresa || '—'),
      el('td', {}, u.active ? badge('Activo', 'green') : badge('Inactivo', 'gray')),
      el('td', { class:'cell-mute' }, fmtDate(u.createdAt)),
      el('td', {}, el('div', { class:'row-actions' },
        u.id !== p.id ? el('button', { class:'btn btn-secondary btn-sm', onclick: () => openEdit(u) },
          el('span', { html: icon('edit') }), 'Editar') : el('span', { class:'cell-mute' }, '(tú)')
      ))
    ));
  }
  tbl.appendChild(tb);
  wrap.appendChild(tbl);
  _container.appendChild(wrap);
}

function openEdit(u){
  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    try{
      await update('users', u.id, {
        role: fd.role,
        active: fd.active === 'true',
        empresa: fd.empresa || ''
      });
      toast('Usuario actualizado', 'ok');
      closeModal();
    } catch(e){ toast(e.message, 'err'); }
  }});

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Email', name:'email', value:u.email, full:true }));
  grid.appendChild(formField({ label:'Rol', name:'role', value:u.role || 'user', options: ROLES.map(r => ({ value:r, label: ROLE_LABEL[r] })) }));
  grid.appendChild(formField({ label:'Estado', name:'active', value: u.active ? 'true' : 'false', options:[
    { value:'true', label:'Activo' }, { value:'false', label:'Inactivo' }
  ]}));
  grid.appendChild(formField({ label:'Empresa', name:'empresa', value:u.empresa, full:true }));

  // Email read-only
  setTimeout(() => {
    const inp = form.querySelector('[name=email]');
    if(inp) inp.disabled = true;
  }, 30);

  form.appendChild(grid);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary' }, 'Guardar')
  );

  openModal({ title:`Editar ${u.displayName || u.email}`, body: form });
  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

// ── Modal: Permisos por Rol ───────────────────────────────────
let _draftPerms = null;
let _activeRoleTab = 'supervisor';

function openPermsModal(){
  const p = getCurrentProfile();
  if(!isAdmin(p)) return;
  _draftPerms = JSON.parse(JSON.stringify(getPerms()));
  _activeRoleTab = 'supervisor';

  const body = el('div', {});
  body.appendChild(el('p', { class:'cell-mute', style:{marginTop:0,marginBottom:'12px',fontSize:'13px'} },
    'Configura qué módulos ve cada rol y qué acciones puede realizar. El admin siempre tiene acceso total.'));

  const tabs = el('div', { class:'role-tabs' });
  const editableRoles = ['supervisor','operario','user'];
  for(const r of editableRoles){
    tabs.appendChild(el('button', {
      class: `role-tab ${r === _activeRoleTab ? 'active' : ''}`,
      'data-role': r,
      onclick: () => { _activeRoleTab = r; renderPermsContent(body, container); }
    }, ROLE_LABEL[r]));
  }
  body.appendChild(tabs);

  const container = el('div', { id:'perms-content' });
  body.appendChild(container);
  renderPermsContent(body, container);

  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { class:'btn btn-secondary', onclick: () => {
      _draftPerms = JSON.parse(JSON.stringify(DEFAULT_PERMS));
      renderPermsContent(body, container);
      toast('Restablecido a valores por defecto', 'ok');
    } }, 'Por defecto'),
    el('button', { class:'btn btn-primary', onclick: async () => {
      try{
        await savePerms(_draftPerms, getCurrentProfile()?.id);
        toast('Permisos guardados', 'ok');
        closeModal();
      } catch(e){ toast(e.message, 'err'); }
    } }, 'Guardar')
  );

  openModal({ title:'Permisos de Módulos por Rol', body, size:'lg' });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}

function renderPermsContent(body, container){
  // actualizar tabs activos
  body.querySelectorAll('.role-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.role === _activeRoleTab);
  });

  clear(container);
  const role = _activeRoleTab;
  const perm = _draftPerms[role] || JSON.parse(JSON.stringify(DEFAULT_PERMS[role] || { modules:[], canCreate:false, canEdit:false, canDelete:false }));
  if(!_draftPerms[role]) _draftPerms[role] = perm;

  // Acciones
  container.appendChild(el('h4', { style:{marginTop:'12px',marginBottom:'8px',fontSize:'13px',textTransform:'uppercase',color:'var(--text-3)',letterSpacing:'0.05em'} }, 'Permisos generales'));
  const actions = el('div', { class:'perm-grid', style:{marginBottom:'16px'} });
  for(const [key, label] of [['canCreate','Crear'],['canEdit','Editar'],['canDelete','Eliminar']]){
    const cell = el('div', {
      class:`perm-cell ${perm[key] ? 'on' : ''}`,
      onclick: () => { perm[key] = !perm[key]; renderPermsContent(body, container); }
    },
      el('span', {}, label),
      el('span', { class:'perm-check', html: perm[key] ? icon('check') : icon('close') })
    );
    actions.appendChild(cell);
  }
  container.appendChild(actions);

  // Módulos
  container.appendChild(el('h4', { style:{marginTop:'12px',marginBottom:'8px',fontSize:'13px',textTransform:'uppercase',color:'var(--text-3)',letterSpacing:'0.05em'} }, 'Módulos visibles'));
  const grid = el('div', { class:'perm-grid' });
  for(const m of MODULES){
    if(m.adminOnly) continue;
    const on = perm.modules.includes(m.id);
    const cell = el('div', {
      class:`perm-cell ${on ? 'on' : ''}`,
      onclick: () => {
        const idx = perm.modules.indexOf(m.id);
        if(idx >= 0) perm.modules.splice(idx, 1);
        else perm.modules.push(m.id);
        renderPermsContent(body, container);
      }
    },
      el('span', { class:'flex gap-2 items-center' },
        el('span', { html: icon(m.icon), style:{ width:'16px', height:'16px', display:'flex' } }),
        el('span', {}, m.label)
      ),
      el('span', { class:'perm-check', html: on ? icon('check') : icon('close') })
    );
    grid.appendChild(cell);
  }
  container.appendChild(grid);
}

// ── Modal: Invitaciones ───────────────────────────────────────
async function openInvitesPanel(){
  const p = getCurrentProfile();
  if(!isAdmin(p)) return;

  const invites = await listInvites();
  const body = el('div', {});

  // Form crear
  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    try{
      const code = await createInvite({
        email: fd.email, displayName: fd.displayName,
        role: fd.role || 'user',
        empresa: fd.empresa,
        createdBy: p.email, createdByUid: p.id
      });
      const link = `${appBaseUrl}?invite=${code}`;
      toast('Invitación creada', 'ok');
      closeModal();
      // Mostrar link para copiar
      openModal({
        title: '✅ Invitación creada',
        body: el('div', {},
          el('p', {}, `Comparte este enlace con ${fd.email}:`),
          el('input', { class:'field-input', value: link, onclick: e => e.target.select(), readonly:'readonly' }),
          el('p', { class:'cell-mute', style:{marginTop:'8px',fontSize:'12px'} }, `Código: ${code} (caduca en 7 días)`),
          el('button', { class:'btn btn-primary', style:{marginTop:'12px'}, onclick: () => {
            navigator.clipboard.writeText(link).then(() => toast('Copiado', 'ok'));
          }}, 'Copiar enlace')
        )
      });
    } catch(e){ toast(e.message, 'err'); }
  }});

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Email', name:'email', type:'email', required:true, full:true }));
  grid.appendChild(formField({ label:'Nombre', name:'displayName' }));
  grid.appendChild(formField({ label:'Rol', name:'role', value:'user', options: ROLES.map(r => ({ value:r, label: ROLE_LABEL[r] })) }));
  grid.appendChild(formField({ label:'Empresa', name:'empresa', full:true }));
  form.appendChild(grid);

  body.appendChild(el('h4', { style:{marginTop:0,marginBottom:'10px',fontSize:'14px'} }, 'Crear nueva invitación'));
  body.appendChild(form);
  body.appendChild(el('button', { type:'submit', class:'btn btn-primary', style:{marginTop:'8px'}, onclick: () => form.requestSubmit() }, 'Generar código'));

  // Listar existentes
  body.appendChild(el('h4', { style:{marginTop:'24px',marginBottom:'10px',fontSize:'14px'} }, 'Invitaciones activas'));
  if(invites.length === 0){
    body.appendChild(el('div', { class:'cell-mute' }, 'Sin invitaciones'));
  } else {
    const list = el('div', {});
    for(const inv of invites){
      const expired = inv.expiresAt && inv.expiresAt < Date.now();
      list.appendChild(el('div', {
        style:{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid var(--border)' }
      },
        el('div', {},
          el('div', { class:'cell-strong' }, inv.email),
          el('div', { class:'cell-mute', style:{fontSize:'12px'} }, `Código: ${inv.code} · Rol: ${ROLE_LABEL[inv.role] || inv.role}`)
        ),
        el('div', { class:'flex gap-2' },
          inv.used ? badge('Usada','gray') : expired ? badge('Caducada','red') : badge('Activa','green'),
          el('button', { class:'btn btn-ghost btn-icon', title:'Eliminar', onclick: async () => {
            if(await confirmModal({ title:'Eliminar invitación', message:`¿Eliminar el código ${inv.code}?`, danger:true })){
              await deleteInvite(inv.code);
              toast('Eliminada', 'ok');
              closeModal();
              openInvitesPanel();
            }
          } }, el('span', { html: icon('trash') }))
        )
      ));
    }
    body.appendChild(list);
  }

  openModal({ title:'Invitaciones', body, size:'lg' });
}
