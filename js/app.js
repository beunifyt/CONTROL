// app.js — orquestador del shell
import { onAuthReady, getCurrentProfile } from './auth.js';
import { onPermsChange, visibleModules, ROLE_LABEL } from './roles.js';
import { startRouter, navigate } from './router.js';
import { $, el, clear, initials, icon, setSyncStatus, openModal, closeModal } from './utils.js';
import { tr, LANGS, getLang, setLang } from './i18n.js';
import { Prefs, applyTheme } from './prefs.js';
import { logger } from './logger.js';

function renderSidebar(profile){
  const nav = $('#sidebar-nav');
  if(!nav) return;
  clear(nav);

  let mods = visibleModules(profile);

  // Aplicar orden personalizado si existe (Bloque E)
  const customOrder = Prefs.getSidebarOrder(profile.id);
  if(customOrder && Array.isArray(customOrder)){
    const ordered = [];
    for(const id of customOrder){
      const m = mods.find(x => x.id === id);
      if(m) ordered.push(m);
    }
    // añadir los nuevos no listados
    for(const m of mods){
      if(!customOrder.includes(m.id)) ordered.push(m);
    }
    mods = ordered;
  }

  for(const m of mods){
    const btn = el('button', {
      class:'sb-item',
      'data-route': m.id,
      draggable: 'true',
      onclick: () => navigate(m.id),
      ondragstart: (e) => {
        e.dataTransfer.setData('sb-item', m.id);
        e.dataTransfer.effectAllowed = 'move';
      },
      ondragover: (e) => { e.preventDefault(); },
      ondrop: (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('sb-item');
        if(draggedId && draggedId !== m.id) reorderSidebar(profile, draggedId, m.id);
      }
    },
      el('span', { html: icon(m.icon) }),
      el('span', {}, tr(m.id, m.label))
    );
    nav.appendChild(btn);
  }

  const current = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'dashboard';
  document.querySelectorAll('.sb-item').forEach(b => {
    b.classList.toggle('active', b.dataset.route === current);
  });
}

function reorderSidebar(profile, draggedId, targetId){
  const mods = visibleModules(profile);
  const ids = mods.map(m => m.id);
  const order = Prefs.getSidebarOrder(profile.id) || ids;
  const filtered = order.filter(id => id !== draggedId);
  const idx = filtered.indexOf(targetId);
  filtered.splice(idx, 0, draggedId);
  Prefs.setSidebarOrder(profile.id, filtered);
  logger.ok('Sidebar reordenado');
  renderSidebar(profile);
}

function renderUser(profile){
  const av = $('#user-avatar');
  const nm = $('#user-name');
  const rl = $('#user-role');
  if(av) av.textContent = initials(profile.displayName || profile.email);
  if(nm) nm.textContent = profile.displayName || profile.email || '—';
  if(rl) rl.textContent = ROLE_LABEL[profile.role] || profile.role;
}

function toggleSidebar(force){
  const app = document.getElementById('app');
  if(!app) return;
  if(force === true)  app.classList.add('sb-open');
  else if(force === false) app.classList.remove('sb-open');
  else app.classList.toggle('sb-open');
}

// Modal de preferencias usuario (tema + idioma)
function openUserPrefs(){
  const profile = getCurrentProfile();
  if(!profile) return;

  const body = el('div', {});
  body.appendChild(el('h4', { style:{marginTop:0,marginBottom:'10px',fontSize:'14px'} }, 'Tema visual'));
  const themes = [
    { value:'light', label:'☀️ Claro' },
    { value:'dark', label:'🌙 Oscuro' },
    { value:'soft', label:'🍂 Suave' },
    { value:'contrast', label:'⚫ Alto contraste' }
  ];
  const currentTheme = Prefs.getTheme(profile.id);
  const themeWrap = el('div', { class:'flex gap-2', style:{flexWrap:'wrap'} });
  for(const t of themes){
    themeWrap.appendChild(el('button', {
      class:`btn btn-sm ${currentTheme === t.value ? 'btn-primary' : 'btn-secondary'}`,
      onclick: (e) => {
        Prefs.setTheme(profile.id, t.value);
        closeModal();
        setTimeout(openUserPrefs, 50);
      }
    }, t.label));
  }
  body.appendChild(themeWrap);

  body.appendChild(el('h4', { style:{marginTop:'16px',marginBottom:'10px',fontSize:'14px'} }, 'Idioma'));
  const langSel = el('select', { class:'select w-full',
    onchange: (e) => { setLang(e.target.value); location.reload(); }
  });
  for(const l of LANGS){
    const op = el('option', { value: l.code }, l.name);
    if(l.code === getLang()) op.selected = true;
    langSel.appendChild(op);
  }
  body.appendChild(langSel);

  body.appendChild(el('p', { class:'cell-mute', style:{marginTop:'16px',fontSize:'12px'} },
    'Atajo: Ctrl+Shift+L abre el panel de logs.'));

  const footer = el('div', { class:'modal-foot' },
    el('button', { class:'btn btn-primary', onclick: closeModal }, 'Cerrar')
  );
  openModal({ title:'Preferencias', body });
  setTimeout(() => body.parentElement.appendChild(footer), 60);
}

window.beunifyt = window.beunifyt || {};
window.beunifyt.toggleSidebar = toggleSidebar;
window.beunifyt.openUserPrefs = openUserPrefs;

onAuthReady((profile) => {
  // Aplicar tema personal del usuario
  applyTheme(Prefs.getTheme(profile.id));

  renderUser(profile);
  renderSidebar(profile);
  startRouter();
  setSyncStatus(navigator.onLine ? 'ok' : 'err');
});

onPermsChange(() => {
  const p = getCurrentProfile();
  if(p) renderSidebar(p);
});

document.addEventListener('profile-changed', (e) => {
  renderUser(e.detail);
  renderSidebar(e.detail);
});
