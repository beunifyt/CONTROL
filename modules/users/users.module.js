/**
 * Módulo Users.
 * Admin: gestión de usuarios + invitaciones por código.
 */

import { el } from '../../shared/utils/dom.js';
import { fmt } from '../../shared/utils/format.js';
import { db } from '../../services/db.service.js';
import { Modal } from '../../shared/components/modal.js';
import { toast } from '../../shared/components/toast.js';
import { renderHeader } from '../../shared/components/header.js';
import { renderNav } from '../../shared/components/nav.js';
import { authService } from '../../services/auth.service.js';
import { getMods, getFirestore } from '../../services/firebase.js';

export default {
  id: 'users',
  name: 'Usuarios',
  icon: '👥',
  routes: ['/users'],
  permissions: ['admin.users'],

  async init(params, container) {
    renderHeader();
    renderNav();

    if (!authService.isAdmin()) {
      container.append(el('div', { class: 'error-panel' }, '🚫 Acceso restringido a administradores'));
      return;
    }

    return renderList(container);
  }
};

async function renderList(container) {
  container.append(
    el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' } },
      el('h1', {}, 'Usuarios'),
      el('div', { style: { display: 'flex', gap: '8px' } },
        el('button', { class: 'btn btn-primary', onClick: () => openInviteForm() }, '🎟 Invitar por código')
      )
    )
  );

  // Invitaciones activas
  const invitesContainer = el('div', { id: 'invites-active', style: { marginBottom: 'var(--space-6)' } });
  container.append(invitesContainer);

  await db.subscribe('invites', {}, (invites) => {
    const active = invites.filter((i) => !i.used);
    invitesContainer.innerHTML = '';
    if (active.length === 0) return;

    invitesContainer.append(
      el('h3', { style: { marginBottom: 'var(--space-3)' } }, '🎟 Invitaciones activas'),
      el('div', { class: 'kpi-grid' },
        ...active.map((inv) => el('div', { class: 'card' },
          el('div', { style: { fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, marginBottom: '8px' } }, inv.id),
          el('p', { style: { fontSize: '13px', color: 'var(--text-muted)' } }, inv.email),
          el('p', { style: { fontSize: '12px', color: 'var(--text-muted)' } }, `Rol: ${inv.role}`),
          el('button', {
            class: 'btn btn-secondary',
            style: { marginTop: '8px', width: '100%' },
            onClick: () => {
              const link = `${location.origin}${location.pathname}#/invite/${inv.id}`;
              navigator.clipboard.writeText(link);
              toast.success('Link copiado');
            }
          }, '📋 Copiar link')
        ))
      )
    );
  });

  // Lista de usuarios
  const usersContainer = el('div');
  container.append(el('h3', { style: { marginBottom: 'var(--space-3)' } }, 'Usuarios registrados'));
  container.append(usersContainer);

  await db.subscribe('users', { orderBy: ['createdAt', 'desc'] }, (users) => {
    usersContainer.innerHTML = '';
    const table = el('table', { class: 'table' },
      el('thead', {}, el('tr', {},
        el('th', {}, 'Usuario'),
        el('th', {}, 'Rol'),
        el('th', {}, 'Estado'),
        el('th', {}, 'Último acceso'),
        el('th', {}, '')
      )),
      el('tbody', {}, ...users.map((u) => el('tr', {},
        el('td', {},
          el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
            el('div', { class: 'avatar', style: { background: fmt.colorFromString(u.email) } }, fmt.initials(u.name)),
            el('div', {},
              el('div', { style: { fontWeight: 600 } }, u.name || '—'),
              el('div', { style: { fontSize: '12px', color: 'var(--text-muted)' } }, u.email)
            )
          )
        ),
        el('td', {}, el('span', { class: 'badge badge-accent' }, u.role || 'pending')),
        el('td', {}, el('span', { class: `badge ${u.active ? 'badge-success' : 'badge-warning'}` }, u.active ? '✓ Activo' : '⏳ Pendiente')),
        el('td', {}, fmt.relative(u.lastLogin)),
        el('td', {}, el('button', {
          class: 'btn btn-ghost btn-icon',
          onClick: () => openUserForm(u)
        }, '✎'))
      )))
    );
    usersContainer.append(table);
  });
}

function openUserForm(user) {
  const form = el('div', { class: 'form-grid' },
    el('p', { style: { color: 'var(--text-muted)' } }, user.email),
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'Rol'),
      el('select', { class: 'select', id: 'u-role' },
        ...['admin', 'supervisor', 'operator', 'viewer', 'pending'].map((r) =>
          el('option', { value: r, ...(r === user.role ? { selected: true } : {}) }, r)
        )
      )
    ),
    el('label', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
      el('input', { type: 'checkbox', id: 'u-active', checked: user.active }),
      'Usuario activo'
    )
  );

  const modal = new Modal({
    title: user.name || user.email,
    content: form,
    actions: [
      { label: 'Cancelar', style: 'secondary', onClick: (m) => m.close() },
      {
        label: 'Guardar', style: 'primary',
        onClick: async (m) => {
          await db.update('users', user.uid, {
            role: document.getElementById('u-role').value,
            active: document.getElementById('u-active').checked
          });
          toast.success('Actualizado');
          m.close();
        }
      }
    ]
  });
  modal.open();
}

function openInviteForm() {
  const form = el('div', { class: 'form-grid' },
    el('p', { style: { color: 'var(--text-muted)', fontSize: '13px' } },
      'Genera un código de un solo uso. Comparte el link con el invitado por email/WhatsApp.'),
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'Email del invitado'),
      el('input', { class: 'input', type: 'email', id: 'inv-email' })
    ),
    el('div', { class: 'field' },
      el('label', { class: 'label' }, 'Rol'),
      el('select', { class: 'select', id: 'inv-role' },
        ...['operator', 'supervisor', 'viewer', 'admin'].map((r) =>
          el('option', { value: r }, r)
        )
      )
    )
  );

  const modal = new Modal({
    title: '🎟 Nueva invitación',
    content: form,
    actions: [
      { label: 'Cancelar', style: 'secondary', onClick: (m) => m.close() },
      {
        label: 'Generar código', style: 'primary',
        onClick: async (m) => {
          const email = document.getElementById('inv-email').value;
          const role = document.getElementById('inv-role').value;
          if (!email) return toast.error('Email obligatorio');

          const code = generateCode();
          const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

          try {
            const { firestoreMod } = await getMods();
            const dbf = getFirestore();
            await firestoreMod.setDoc(firestoreMod.doc(dbf, 'invites', code), {
              email, role, used: false, expiresAt, createdAt: firestoreMod.serverTimestamp()
            });
            toast.success(`Código creado: ${code}`);
            m.close();
          } catch (err) { toast.error(err.message); }
        }
      }
    ]
  });
  modal.open();
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
