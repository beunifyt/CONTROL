// usuarios.js — diagnóstico: identifica qué import rompe la cadena

export async function init(container){
  container.innerHTML = '<div style="padding:40px;font-family:monospace"><h2>Diagnóstico de imports</h2><div id="diag-results">Probando...</div></div>';
  const out = container.querySelector('#diag-results');
  const log = (msg, ok) => {
    const div = document.createElement('div');
    div.style.padding = '6px 0';
    div.style.color = ok ? '#15803D' : '#DC2626';
    div.textContent = (ok ? '✅ ' : '❌ ') + msg;
    out.appendChild(div);
  };

  const imports = [
    ['../utils.js', '../utils.js'],
    ['../db.js', '../db.js'],
    ['./shared.js', './shared.js'],
    ['../roles.js', '../roles.js'],
    ['../auth.js', '../auth.js'],
    ['../invites.js', '../invites.js'],
    ['../firebase-config.js', '../firebase-config.js'],
    ['../security.js', '../security.js']
  ];

  out.innerHTML = '';
  for(const [name, path] of imports){
    try{
      await import(path);
      log(name, true);
    } catch(e){
      log(`${name} → ${e.message}`, false);
      const stack = document.createElement('pre');
      stack.style.cssText = 'font-size:11px;color:#7F1D1D;background:#FEF2F2;padding:8px;margin:4px 0;white-space:pre-wrap;border-left:3px solid #DC2626';
      stack.textContent = e.stack || '(sin stack)';
      out.appendChild(stack);
    }
  }
  log('Diagnóstico completado. Revisa los ❌ arriba.', true);
}

export function destroy(){}
