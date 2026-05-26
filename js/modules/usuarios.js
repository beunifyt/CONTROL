// usuarios.js — gestión de usuarios + permisos granulares 3 niveles + roles personalizados
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, fmtDate } from '../utils.js';
import { listLive, list, update, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState, badge } from './shared.js';
import {
  isAdmin, ROLE_LABEL, ROLE_COLOR, BUILTIN_ROLES, MODULES, MODULE_GROUPS,
  getPerms, getCustomRoles, getAllRoles, getRoleLabel,
  savePerms, DEFAULT_ROLE_PERMS, getModuleAccess
} from '../roles.js';
import { getCurrentProfile } from '../auth.js';
import { createInvite, listInvites, deleteInvite } from '../invites.js';
import { appBaseUrl } from '../firebase-config.js';
import { getUserAccessHistory, listUserDevices, revokeDevice, approveDevice } from '../security.js';

// Alias para compatibilidad con código abajo
const ROLES = BUILTIN_ROLES;
const DEFAULT_PERMS = DEFAULT_ROLE_PERMS;

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
          el('span', { html: icon('edit') }), 'Editar') : el('span', { class:'cell-mute' }, '(tú)'),
        el('button', { class:'btn btn-ghost btn-sm', onclick: () => openUserHistory(u), title:'Histórico accesos + dispositivos' }, '📋')
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
  grid.appendChild(formField({ label:'Rol', name:'role', value:u.role || 'user', options: getAllRoles().map(r => ({ value:r, label: getRoleLabel(r) })) }));
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
    el('button', { type:'submit', class:'btn btn-primary', onclick: () => form.requestSubmit() }, 'Guardar')
  );

  openModal({ title:`Editar ${u.displayName || u.email}`, body: form });
  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

// ── Histórico de accesos + dispositivos de un usuario ──────────
async function openUserHistory(u){
  const body = el('div', { style:{minWidth:'600px'} });
  body.appendChild(el('p', { class:'cell-mute', style:{margin:'0 0 12px'} },
    `Accesos y dispositivos asociados a ${u.displayName || u.email}.`));

  // Tabs internas
  let tab = 'access';
  const tabRow = el('div', { class:'role-tabs', style:{marginBottom:'10px'} });
  const render = () => {
    body.querySelectorAll('.uh-content').forEach(n => n.remove());
    const content = el('div', { class:'uh-content' });
    if(tab === 'access')      content.appendChild(renderAccessHistory(u));
    else                       content.appendChild(renderDevicesHistory(u));
    body.appendChild(content);
  };
  for(const t of [['access','📋 Accesos'],['devices','🖥 Dispositivos']]){
    tabRow.appendChild(el('button', {
      class:`role-tab ${tab === t[0] ? 'active' : ''}`,
      onclick: e => {
        tab = t[0];
        tabRow.querySelectorAll('.role-tab').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        render();
      }
    }, t[1]));
  }
  body.appendChild(tabRow);
  render();

  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-primary', onclick: closeModal }, 'Cerrar')
  );
  openModal({ title:`Histórico · ${u.displayName || u.email}`, body, size:'lg' });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}

function renderAccessHistory(u){
  const wrap = el('div', {});
  wrap.appendChild(el('div', { class:'cell-mute', style:{padding:'12px'} }, 'Cargando…'));
  getUserAccessHistory(u.id, 50).then(logs => {
    clear(wrap);
    if(logs.length === 0){
      wrap.appendChild(el('div', { class:'cell-mute', style:{padding:'20px', textAlign:'center'} },
        'Sin accesos registrados.'));
      return;
    }
    const tbl = el('table', { class:'table' });
    tbl.appendChild(el('thead', {}, el('tr', {},
      el('th',{},'Fecha'),
      el('th',{},'Dispositivo'),
      el('th',{},'Huella'),
      el('th',{},'Resultado')
    )));
    const tb = el('tbody');
    for(const a of logs){
      const fecha = a.createdAt?.toDate ? a.createdAt.toDate() : null;
      tb.appendChild(el('tr', {},
        el('td', { class:'cell-mute', style:{fontSize:'12px'} }, fecha ? fecha.toLocaleString() : '—'),
        el('td', {}, a.deviceLabel || '—'),
        el('td', { class:'cell-mute', style:{fontFamily:'monospace', fontSize:'11px'} }, a.deviceFingerprint || '—'),
        el('td', {}, el('span', { class:`badge ${a.success ? 'badge-green' : 'badge-red'}` }, a.success ? 'OK' : 'Fallo'))
      ));
    }
    tbl.appendChild(tb);
    wrap.appendChild(tbl);
  });
  return wrap;
}

function renderDevicesHistory(u){
  const wrap = el('div', {});
  wrap.appendChild(el('div', { class:'cell-mute', style:{padding:'12px'} }, 'Cargando…'));
  listUserDevices(u.id).then(devices => {
    clear(wrap);
    if(devices.length === 0){
      wrap.appendChild(el('div', { class:'cell-mute', style:{padding:'20px', textAlign:'center'} },
        'Sin dispositivos asociados.'));
      return;
    }
    const tbl = el('table', { class:'table' });
    tbl.appendChild(el('thead', {}, el('tr', {},
      el('th',{},'Dispositivo'),
      el('th',{},'Huella'),
      el('th',{},'Estado'),
      el('th',{},'Última vez'),
      el('th',{},'Acciones')
    )));
    const tb = el('tbody');
    for(const d of devices){
      const seen = d.lastSeen?.toDate ? d.lastSeen.toDate() : null;
      tb.appendChild(el('tr', {},
        el('td', {}, d.label || '—'),
        el('td', { class:'cell-mute', style:{fontFamily:'monospace', fontSize:'11px'} }, d.fingerprint || '—'),
        el('td', {}, el('span', { class:`badge ${d.approved ? 'badge-green' : 'badge-amber'}` }, d.approved ? 'Aprobado' : 'Pendiente')),
        el('td', { class:'cell-mute' }, seen ? seen.toLocaleString() : '—'),
        el('td', {}, el('div', { class:'row-actions' },
          d.approved
            ? el('button', { class:'btn btn-danger btn-sm', onclick: async () => {
                try{ await revokeDevice(d.id); toast('Revocado', 'ok'); openUserHistory(u); closeModal(); }
                catch(e){ toast(e.message, 'err'); }
              } }, 'Revocar')
            : el('button', { class:'btn btn-primary btn-sm', onclick: async () => {
                try{ await approveDevice(d.id); toast('Aprobado', 'ok'); openUserHistory(u); closeModal(); }
                catch(e){ toast(e.message, 'err'); }
              } }, 'Aprobar')
        ))
      ));
    }
    tbl.appendChild(tb);
    wrap.appendChild(tbl);
  });
  return wrap;
}

// ── Modal: Permisos Granulares 3 niveles + Roles personalizados ──
let _draftPerms = null;
let _draftCustomRoles = null;
let _activeRoleTab = 'supervisor';

function openPermsModal(){
  const p = getCurrentProfile();
  if(!isAdmin(p)) return;
  _draftPerms = JSON.parse(JSON.stringify(getPerms()));
  _draftCustomRoles = JSON.parse(JSON.stringify(getCustomRoles()));
  _activeRoleTab = 'supervisor';

  const body = el('div', {});
  body.appendChild(el('p', { class:'cell-mute', style:{marginTop:0,marginBottom:'12px',fontSize:'13px'} },
    'Cada módulo tiene 3 niveles: ',
    el('strong', {}, 'Sin acceso'), ', ',
    el('strong', { style:{color:'#1D4ED8'} }, 'Solo lectura'), ' o ',
    el('strong', { style:{color:'#15803D'} }, 'Lectura + Escritura'),
    '. El admin siempre tiene acceso total.'));

  // Tabs de rol (built-in + custom + botón crear)
  const tabs = el('div', { class:'role-tabs' });
  const tabsRef = tabs; // para refrescar
  renderRoleTabs(tabs);
  body.appendChild(tabsRef);

  // Leyenda + acciones rápidas por grupo
  body.appendChild(el('div', { class:'perm-legend' },
    el('span', { class:'flex items-center gap-2' },
      el('span', { class:'lvl-dot lvl-none' }), 'Sin acceso'),
    el('span', { class:'flex items-center gap-2' },
      el('span', { class:'lvl-dot lvl-read' }), 'Lectura'),
    el('span', { class:'flex items-center gap-2' },
      el('span', { class:'lvl-dot lvl-write' }), 'Escritura')
  ));

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
        await savePerms({ perms: _draftPerms, customRoles: _draftCustomRoles }, getCurrentProfile()?.id);
        toast('Permisos guardados', 'ok');
        closeModal();
      } catch(e){ toast(e.message, 'err'); }
    } }, 'Guardar')
  );

  openModal({ title:'🛡 Permisos Granulares por Rol', body, size:'lg' });
  setTimeout(() => body.parentElement.appendChild(footer), 60);

  function renderRoleTabs(tabsEl){
    clear(tabsEl);
    const editableBuiltin = ['supervisor','operario','user','empresa'];
    for(const r of editableBuiltin){
      tabsEl.appendChild(el('button', {
        class: `role-tab ${r === _activeRoleTab ? 'active' : ''}`,
        'data-role': r,
        onclick: () => { _activeRoleTab = r; renderPermsContent(body, container); renderRoleTabs(tabsEl); }
      }, ROLE_LABEL[r]));
    }
    // Roles personalizados
    for(const cr of _draftCustomRoles){
      tabsEl.appendChild(el('button', {
        class: `role-tab role-custom ${cr.id === _activeRoleTab ? 'active' : ''}`,
        'data-role': cr.id,
        onclick: () => { _activeRoleTab = cr.id; renderPermsContent(body, container); renderRoleTabs(tabsEl); }
      },
        el('span', {}, cr.label || cr.id),
        el('span', {
          class:'role-tab-x',
          title:'Eliminar rol personalizado',
          onclick: e => {
            e.stopPropagation();
            if(confirm(`¿Eliminar el rol "${cr.label}"?`)){
              _draftCustomRoles = _draftCustomRoles.filter(x => x.id !== cr.id);
              delete _draftPerms[cr.id];
              if(_activeRoleTab === cr.id) _activeRoleTab = 'supervisor';
              renderRoleTabs(tabsEl);
              renderPermsContent(body, container);
            }
          }
        }, '×')
      ));
    }
    // Botón "+ Nuevo rol"
    tabsEl.appendChild(el('button', {
      class:'role-tab role-add',
      onclick: () => {
        const label = prompt('Nombre del nuevo rol personalizado:');
        if(!label || !label.trim()) return;
        const cleanLabel = label.trim();
        const id = 'custom_' + cleanLabel.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24);
        if(_draftCustomRoles.some(r => r.id === id) || BUILTIN_ROLES.includes(id)){
          toast('Ya existe un rol con ese nombre', 'err');
          return;
        }
        // Copia los permisos del rol activo como punto de partida
        const basePerms = JSON.parse(JSON.stringify(_draftPerms[_activeRoleTab] || _draftPerms.user));
        _draftCustomRoles.push({ id, label: cleanLabel, perms: basePerms });
        _draftPerms[id] = basePerms;
        _activeRoleTab = id;
        renderRoleTabs(tabsEl);
        renderPermsContent(body, container);
        toast(`Rol "${cleanLabel}" creado. Configura sus permisos.`, 'ok');
      }
    }, '+ Nuevo rol'));
  }
}

function renderPermsContent(body, container){
  clear(container);
  const role = _activeRoleTab;

  // Asegurar que _draftPerms[role] exista en formato granular
  if(!_draftPerms[role] || typeof _draftPerms[role] !== 'object' || Array.isArray(_draftPerms[role].modules)){
    const init = {};
    for(const m of MODULES) init[m.id] = 'none';
    _draftPerms[role] = init;
  }
  const perm = _draftPerms[role];

  // Header del rol con resumen
  const writeCount = MODULES.filter(m => perm[m.id] === 'write').length;
  const readCount  = MODULES.filter(m => perm[m.id] === 'read').length;
  const noneCount  = MODULES.filter(m => perm[m.id] === 'none' || !perm[m.id]).length;

  container.appendChild(el('div', { class:'perm-summary' },
    el('span', { class:'lvl-chip lvl-write' }, `${writeCount} escritura`),
    el('span', { class:'lvl-chip lvl-read'  }, `${readCount} lectura`),
    el('span', { class:'lvl-chip lvl-none'  }, `${noneCount} sin acceso`)
  ));

  // Acciones rápidas por grupo
  const quickRow = el('div', { class:'perm-quick-row' });
  quickRow.appendChild(el('span', { class:'cell-mute', style:{fontSize:'11px',marginRight:'4px'} }, 'Acciones por grupo:'));
  for(const g of MODULE_GROUPS){
    quickRow.appendChild(el('div', { class:'perm-group-chip' },
      el('span', { class:'pg-label' }, g.label),
      el('button', { class:'pg-btn pg-w', title:`Dar escritura a todo ${g.label}`,
        onclick: () => { g.ids.forEach(id => perm[id] = 'write'); renderPermsContent(body, container); }
      }, 'W'),
      el('button', { class:'pg-btn pg-r', title:`Dar solo lectura a todo ${g.label}`,
        onclick: () => { g.ids.forEach(id => perm[id] = 'read'); renderPermsContent(body, container); }
      }, 'R'),
      el('button', { class:'pg-btn pg-x', title:`Sin acceso a ${g.label}`,
        onclick: () => { g.ids.forEach(id => perm[id] = 'none'); renderPermsContent(body, container); }
      }, '×')
    ));
  }
  container.appendChild(quickRow);

  container.appendChild(el('p', { class:'cell-mute', style:{fontSize:'12px',marginTop:'10px'} },
    'Haz clic en cada módulo para ciclar entre: Sin acceso → Lectura → Escritura'));

  // Grid de módulos agrupados por categoría
  for(const group of MODULE_GROUPS){
    container.appendChild(el('div', { class:'perm-group-head' }, group.label));
    const grid = el('div', { class:'perm-mod-grid' });
    for(const modId of group.ids){
      const m = MODULES.find(x => x.id === modId);
      if(!m) continue;
      if(m.adminOnly) continue;
      // empresa solo aplica al rol empresa
      if(m.empresaOnly && role !== 'empresa') continue;
      const level = perm[modId] || 'none';
      const cell = el('div', {
        class:`perm-mod-cell lvl-${level}`,
        title:`Nivel actual: ${level === 'none' ? 'Sin acceso' : level === 'read' ? 'Solo lectura' : 'Lectura + Escritura'}\nClic para cambiar`,
        onclick: () => {
          perm[modId] = level === 'none' ? 'read' : level === 'read' ? 'write' : 'none';
          renderPermsContent(body, container);
        }
      },
        el('span', { class:'pmod-ico', html: icon(m.icon) }),
        el('div', { class:'pmod-body' },
          el('div', { class:'pmod-label' }, m.label),
          el('div', { class:'pmod-desc' }, m.desc || '')
        ),
        el('span', { class:'pmod-level' },
          level === 'write' ? '✎' : level === 'read' ? '👁' : '🔒')
      );
      grid.appendChild(cell);
    }
    container.appendChild(grid);
  }
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
  grid.appendChild(formField({ label:'Rol', name:'role', value:'user', options: getAllRoles().map(r => ({ value:r, label: getRoleLabel(r) })) }));
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
