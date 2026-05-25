// usuarios.js MINIMAL — versión de diagnóstico
// Si esto carga sin "Unexpected token ')'", el bug está en un import.
// Si esto también falla, el problema no es código.

export async function init(container){
  const div = document.createElement('div');
  div.style.padding = '40px';
  div.style.textAlign = 'center';
  div.innerHTML = '<h1 style="color:#15803D">✅ Módulo Usuarios cargado correctamente</h1>' +
    '<p style="color:#64748B;margin-top:12px">Versión diagnóstico. Si ves esto, el bug estaba en un import.</p>';
  container.appendChild(div);
}

export function destroy(){}
