// app.js — orquestador del shell
import { onAuthReady, getCurrentProfile } from './auth.js';
import { onPermsChange, visibleModules, ROLE_LABEL } from './roles.js';
import { startRouter, navigate } from './router.js';
import { $, el, clear, initials, icon, setSyncStatus } from './utils.js';
import { tr } from './i18n.js';

function renderSidebar(profile){
  const nav = $('#sidebar-nav');
  if(!nav) return;
  clear(nav);

  const mods = visibleModules(profile);
  for(const m of mods){
    const btn = el('button', {
      class:'sb-item',
      'data-route': m.id,
      onclick: () => navigate(m.id)
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

window.beunifyt = window.beunifyt || {};
window.beunifyt.toggleSidebar = toggleSidebar;

onAuthReady((profile) => {
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
