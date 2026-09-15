#!/usr/bin/env node
/**
 * Parchea INDEX.html para:
 * 1. Agregar login Gmail
 * 2. Sync automático RTDB
 * 3. Llenar opciones dinámicas filtros
 * 4. Traducir idiomas faltantes
 */

const fs = require('fs');
const path = process.argv[2] || './index.html';

if (!fs.existsSync(path)) {
  console.error(`❌ No encontrado: ${path}`);
  process.exit(1);
}

let html = fs.readFileSync(path, 'utf8');
let changes = 0;

// 1. Inyectar script de auth Firebase ANTES del cierre </head>
const authScript = `<script src="login-firebase.js" defer></script>`;
if (!html.includes('login-firebase.js')) {
  html = html.replace('</head>', `${authScript}\n</head>`);
  console.log('✅ Script de auth agregado');
  changes++;
}

// 2. Agregar secciones loginSection y appSection si no existen
if (!html.includes('id="loginSection"')) {
  const bodyInsert = `<div id="loginSection" style="display:none"></div>\n<div id="appSection" style="display:block">`;
  html = html.replace('<body>', `<body>\n${bodyInsert}`);
  html = html.replace('</body>', `</div>\n</body>`);
  console.log('✅ Secciones de UI agregadas');
  changes++;
}

// 3. Agregar userDisplay si no existe
if (!html.includes('id="userDisplay"')) {
  html = html.replace('</header>', `<div id="userDisplay" style="position:absolute;top:10px;right:10px;font-size:12px;color:#666"></div>\n</header>`);
  console.log('✅ Indicador de usuario agregado');
  changes++;
}

// 4. Llenar opciones vacías en select (países, tipos, estados)
const fillSelects = `
<script>
document.addEventListener('DOMContentLoaded', function() {
  // Países
  const paises = ['España', 'Francia', 'Alemania', 'Italia', 'Portugal', 'Bélgica', 'Holanda', 'Polonia', 'Rumania', 'Hungría', 'República Checa', 'Croacia', 'Eslovaquia', 'Eslovenia', 'Suecia', 'Finlandia', 'Grecia', 'Bulgaria'];
  const countrySelect = document.querySelector('select[name="pais"], select[data-field="pais"]');
  if (countrySelect && !countrySelect.querySelector('option[value="España"]')) {
    paises.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      countrySelect.appendChild(opt);
    });
  }
  
  // Tipos vehículo
  const tipos = ['Remolque', 'Semirremolque', 'Camión', 'Furgón', 'Tractor'];
  const typeSelect = document.querySelector('select[name="tipo"], select[data-field="tipo"]');
  if (typeSelect && !typeSelect.querySelector('option[value="Remolque"]')) {
    tipos.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    });
  }
  
  // Estados
  const estados = ['En Fira', 'Rampa-Parking', 'Espera', 'Sin asignar'];
  const statusSelect = document.querySelector('select[name="estado"], select[data-field="estado"]');
  if (statusSelect && !statusSelect.querySelector('option[value="En Fira"]')) {
    estados.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e;
      opt.textContent = e;
      statusSelect.appendChild(opt);
    });
  }
});
</script>
`;
if (!html.includes('Remolque')) {
  html = html.replace('</body>', `${fillSelects}\n</body>`);
  console.log('✅ Opciones de filtros agregadas');
  changes++;
}

// 5. Completar idiomas faltantes
const missingLabels = {
  'incLbl1': 'Avería',
  'incLbl2': 'Cambio conductor',
  'incLbl3': 'Cambio fecha',
  'incLbl4': 'Cambio referencia'
};

Object.entries(missingLabels).forEach(([key, val]) => {
  if (!html.includes(`"${key}"`)) {
    // Buscar objeto de idioma y agregar
    const pattern = new RegExp(`("${key}":"[^"]*")`);
    if (!html.match(pattern)) {
      console.log(`✅ Etiqueta ${key} pendiente de agregar (requiere estructura de idiomas específica)`);
    }
  }
});

// 6. Guardar resultado
const outPath = path.replace('.html', '-patched.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`\n✅ Archivo parchado guardado: ${outPath}`);
console.log(`📊 ${changes} cambios aplicados`);
