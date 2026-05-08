/**
 * Módulo Auth.
 * Login con email/Google + sistema de invitaciones por código.
 *
 * Sin permisos requeridos: cualquiera puede llegar aquí.
 */

import { el, html } from '../../shared/utils/dom.js';
import { authService } from '../../services/auth.service.js';
import { db } from '../../services/db.service.js';
import { toast } from '../../shared/components/toast.js';
import { renderHeader } from '../../shared/components/header.js';

export default {
  id: 'auth',
  name: 'Acceder',
  routes: ['/login', '/signup', '/invite/:code'],
  permissions: [], // público

  async init(params, container, view) {
    container.innerHTML = '';
    renderHeader();

    const route = location.hash.slice(1);

    if (route.startsWith('/invite/')) {
      return renderInvite(container, params.code);
    }
    if (route === '/signup') {
      return renderSignup(container);
    }
    return renderLogin(container);
  }
};

function renderLogin(container) {
  container.append(
    el('div', { class: 'auth-wrapper' },
      el('div', { class: 'auth-card card' },
        el('h1', { style: { textAlign: 'center', marginBottom: '24px' } }, 'UnifyT'),
        el('p', { style: { textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px' } }, 'Inicia sesión para continuar'),

        el('div', { class: 'form-grid' },
          field('Email', 'email', 'login-email'),
          field('Contraseña', 'password', 'login-pass'),
          el('button', {
            class: 'btn btn-primary',
            onClick: async () => {
              const email = document.getElementById('login-email').value;
              const pass  = document.getElementById('login-pass').value;
              try {
                await authService.loginEmail(email, pass);
                location.reload();
              } catch (err) {
                toast.error(err.message);
              }
            }
          }, 'Acceder'),
          el('div', { style: { textAlign: 'center', margin: '8px 0', color: 'var(--text-muted)', fontSize: '12px' } }, '— o —'),
          el('button', {
            class: 'btn btn-secondary',
            onClick: async () => {
              try {
                await authService.loginGoogle();
                location.reload();
              } catch (err) { toast.error(err.message); }
            }
          }, 'Continuar con Google'),
          el('p', { style: { textAlign: 'center', fontSize: '13px', marginTop: '16px' } },
            '¿No tienes cuenta? ',
            el('a', { href: '#/signup' }, 'Crear cuenta')
          )
        )
      )
    )
  );

  applyAuthStyles();
}

function renderSignup(container) {
  container.append(
    el('div', { class: 'auth-wrapper' },
      el('div', { class: 'auth-card card' },
        el('h1', { style: { textAlign: 'center' } }, 'Crear cuenta'),
        el('p', { style: { textAlign: 'center', color: 'var(--text-muted)', marginBottom: '24px' } },
          'Necesitas un código de invitación para registrarte. Si tienes el link de invitación úsalo directamente.'),

        el('div', { class: 'form-grid' },
          field('Código de invitación', 'text', 'signup-code'),
          field('Email', 'email', 'signup-email'),
          field('Contraseña (mín. 6)', 'password', 'signup-pass'),
          el('button', {
            class: 'btn btn-primary',
            onClick: async () => {
              const code = document.getElementById('signup-code').value.toUpperCase();
              const email = document.getElementById('signup-email').value;
              const pass  = document.getElementById('signup-pass').value;
              try {
                const invite = await db.get('invites', code);
                if (!invite) throw new Error('Código inválido');
                if (invite.used) throw new Error('Código ya usado');
                if (invite.expiresAt && Date.now() > invite.expiresAt.toMillis()) throw new Error('Código expirado');
                if (invite.email !== email) throw new Error('Email no coincide con la invitación');

                await authService.signupEmail(email, pass);
                await db.update('invites', code, { used: true });
                location.hash = '/dashboard';
                location.reload();
              } catch (err) { toast.error(err.message); }
            }
          }, 'Crear cuenta'),
          el('p', { style: { textAlign: 'center', fontSize: '13px' } },
            '¿Ya tienes cuenta? ',
            el('a', { href: '#/login' }, 'Acceder')
          )
        )
      )
    )
  );

  applyAuthStyles();
}

async function renderInvite(container, code) {
  container.append(
    el('div', { class: 'auth-wrapper' },
      el('div', { class: 'auth-card card' },
        el('h2', {}, '🎟 Invitación'),
        el('p', {}, `Código: ${code}`),
        el('p', { style: { color: 'var(--text-muted)' } }, 'Cargando…')
      )
    )
  );
  applyAuthStyles();

  try {
    const invite = await db.get('invites', code);
    const card = container.querySelector('.auth-card');
    card.innerHTML = '';

    if (!invite) {
      card.append(el('h2', {}, '❌ Código inválido'));
      return;
    }
    if (invite.used) {
      card.append(el('h2', {}, '⚠️ Código ya utilizado'));
      return;
    }

    card.append(
      el('h2', {}, '🎟 Bienvenido'),
      el('p', { style: { marginBottom: '16px' } }, `Te han invitado a UnifyT como ${invite.role}`),
      field('Email', 'email', 'inv-email', invite.email),
      field('Contraseña (mín. 6)', 'password', 'inv-pass'),
      el('button', {
        class: 'btn btn-primary',
        style: { marginTop: '16px' },
        onClick: async () => {
          const email = document.getElementById('inv-email').value;
          const pass  = document.getElementById('inv-pass').value;
          try {
            await authService.signupEmail(email, pass);
            await db.update('invites', code, { used: true });
            location.hash = '/dashboard';
            location.reload();
          } catch (err) { toast.error(err.message); }
        }
      }, 'Activar cuenta')
    );
  } catch (err) {
    toast.error(err.message);
  }
}

function field(label, type, id, value = '') {
  return el('div', { class: 'field' },
    el('label', { class: 'label', for: id }, label),
    el('input', { class: 'input', type, id, value })
  );
}

function applyAuthStyles() {
  if (document.getElementById('auth-styles')) return;
  const style = document.createElement('style');
  style.id = 'auth-styles';
  style.textContent = `
    .auth-wrapper {
      min-height: calc(100vh - var(--header-height));
      display: grid;
      place-items: center;
      padding: var(--space-6);
    }
    .auth-card { max-width: 400px; width: 100%; }
  `;
  document.head.append(style);
}
