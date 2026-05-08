# BeUnifyT — Bugs anticipables, riesgos y checklist anti-problemas

> Documento vivo. Cuando me lo menciones en un chat, reviso TODO el código contra esta lista antes de declararlo "listo".
> Última revisión: arquitecto senior, fase pre-deploy.

---

## 0. CÓMO USAR ESTE ARCHIVO

Cada ítem tiene:
- **ID** — para referenciar (ej: "revisa el R-03").
- **Severidad** — 🔴 crítico (rompe app) · 🟠 alto (rompe módulo) · 🟡 medio (UX degradada) · 🟢 bajo (cosmético).
- **Síntoma** — cómo se manifiesta cuando falla.
- **Causa** — por qué pasa.
- **Mitigación** — qué hacer en el código.
- **Test manual** — cómo verificar.

Antes de cada deploy, recorre **PRE-DEPLOY CHECKLIST** (sección 12).

---

## 1. CAMPO POSICIÓN — el bug que disparó esto

### P-01 🔴 Posición compartida entre Referencias e Ingresos
**Síntoma**: el número de posición se duplica o salta entre módulos.
**Causa**: usar el mismo contador o la misma colección.
**Mitigación**:
- Counter independiente por módulo: `counters/refPos__{eventoId}` y `counters/ingPos__{eventoId}__{YYYY-MM-DD}`.
- Referencias: persiste por evento.
- Ingresos: reinicia cada día (huso del cliente).
**Test**: crea ref con pos=5, crea ingreso, verifica que ingreso empieza en pos=1, no en pos=6.
**Ubicación en código**: `js/db.js` → `nextRefPosicion()`, `nextIngPosicion()`.

### P-02 🔴 Posición duplicada por race condition
**Síntoma**: dos operarios crean a la vez y ambos sacan posición=7.
**Mitigación**: `runTransaction()` atómica. Implementado en `_nextCounter()`.
**Test**: dos pestañas, crear simultáneo → posiciones distintas.

### P-03 🟠 Posición manual entra en colisión con automática
**Mitigación**: `isPosicionTaken()` consulta antes de guardar. Si ya existe esa pos en ese evento (o evento+día para ingresos), rechaza.
**Test**: asigna manual pos=10 y crea 15 automáticas; ninguna debe ser 10.

### P-04 🟡 Posición no se libera al borrar
**Decisión**: aceptar el "hueco" — más simple y trazable. Documentado en UI.

---

## 2. AUTENTICACIÓN Y PERMISOS

### A-01 🔴 Bootstrap admin se ejecuta dos veces
**Mitigación**: `loadOrCreateProfile` usa `runTransaction` con check `docSnap.exists()`. En `js/auth.js`.

### A-02 🔴 Reglas Firestore permiten leer todo
**Mitigación**: en `firestore.rules`, `users/{uid}` solo permite leer al propio user o admin.

### A-03 🔴 Permisos solo en frontend
**Mitigación**: matriz replicada en `firestore.rules` con funciones `canCreate()`, `canEdit()`, `canDelete()` que leen `config/permisos`.
**Test**: con cuenta operario sin permiso de delete, ejecutar `deleteDoc` desde consola → debe lanzar `permission-denied`.

### A-04 🟠 Sesión persiste tras desactivar usuario
**Mitigación**: `startProfileListener` escucha `users/{uid}` y dispara logout si `active === false`.
**Test**: con dos pestañas, admin desactiva al operario; la pestaña debe quedar bloqueada en <5s.

### A-05 🟠 Email del admin con mayúsculas no matchea
**Mitigación**: `normalizeEmail()` se aplica en ambos lados de la comparación.

### A-06 🟡 Invitación caducada da error feo
**Mitigación**: `INVITE_ERRORS` en `js/invites.js` con mensajes amables.

### A-07 🟠 Usuario logueado sin perfil queda en pantalla blanco
**Mitigación**: pantalla `#pending-screen` explícita.

---

## 3. FIRESTORE — datos y sincronización

### F-01 🔴 onSnapshot duplicados
**Mitigación**: `db.js` registra todos los listeners en un Map con `KEY_PREFIX` por módulo. Al cambiar de ruta, `unregisterListenersByPrefix` limpia los del módulo anterior.
**Test**: DevTools → Network → WS, navegar 10 veces; máximo conexiones = 4 (los listeners del módulo activo).

### F-02 🟠 Listener sigue activo tras logout
**Mitigación**: `cleanupAllListeners()` se llama dentro de `doSignOut()` antes de `fbSignOut(auth)`.

### F-03 🔴 Lectura masiva sin límite
**Mitigación**: todos los `listLive` del módulo de impresión y dashboard tienen `limit:50` o `limit:500`. Filtros por `eventoId` siempre que aplica.

### F-04 🟠 Escritura offline se pierde
**Mitigación**: `persistentLocalCache` activado en `firebase-config.example.js`.

### F-05 🟡 Timestamp del cliente vs server
**Mitigación**: `serverTimestamp()` en `createdAt` y `updatedAt` en TODOS los `create/update` de `db.js`.

### F-06 🟠 Índices compuestos faltantes
**Mitigación**: `firestore.indexes.json` versionado en repo, listado todos los índices necesarios.

### F-07 🟡 Cambios concurrentes sobreescriben
**Mitigación**: `setDoc(..., {merge:true})` en `db.update()`.

---

## 4. MOTOR DE IMPRESIÓN

### I-01 🔴 Plantilla A4 se rompe en A5
**Mitigación**: coordenadas guardadas en porcentaje (0-100). En `impresion.js`, `f.x` y `f.y` son siempre %.

### I-02 🔴 Imagen guía se imprime
**Mitigación**: `<img class="canvas-bg-img guide-only">` + `@media print { .guide-only { display:none !important } }` en `styles.css`.

### I-03 🟠 Línea de troquel se imprime
**Mitigación**: `.canvas-paper.troquel::before` y `::after` con `@media print { display:none !important }`.

### I-04 🔴 Plantilla por evento+módulo no carga al cambiar
**Mitigación**: subcolección `eventos/{eventoId}/templates/{tplId}` con campo `modulo`. `loadTemplate()` se llama en cada cambio de dropdown.

### I-05 🟠 Imprimir registro real no persiste tras F5
**Mitigación**: `_state.selectedRecordId` se persiste en `localStorage` (clave `beunifyt_print_state`).

### I-06 🟠 QR apunta a localhost en producción
**Mitigación**: `appBaseUrl = window.location.origin + window.location.pathname`. El QR se construye dinámicamente.

### I-07 🟡 Caracteres especiales no renderizan
**Mitigación parcial**: la fuente Inter cubre la mayoría. Para árabe/CJK, el `font-family` cae en `sans-serif` del sistema. En el futuro, cargar Noto Sans Arabic/CJK condicionalmente.

### I-08 🟠 Copias múltiples no insertan page-break
**Mitigación**: `doPrint()` clona el papel N veces con clase `page-break` que aplica `page-break-after:always`.

### I-09 🟡 Drag fuera de canvas pierde campo
**Mitigación**: clamp en `onCanvasDrop`: `x = Math.max(0, Math.min(95, x))`.

### I-10 🟠 Deshacer no funciona tras F5
**Mitigación**: el último estado se persiste en `localStorage`. Undo es de sesión (aceptado).

### I-11 🔴 `window.print()` bloqueado por popup blocker
**Mitigación**: `doPrint()` se ejecuta directamente en el handler del click, sin async.

### I-12 🟡 Resaltado ámbar se imprime mal en B/N
**Mitigación**: `@media print { .canvas-field.highlight { background:transparent; border:1px solid black } }`.

---

## 5. UI / UX

### U-01 🟠 Sidebar no se filtra al cambiar rol en caliente
**Mitigación**: `roles.js` expone `onPermsChange()`. `app.js` re-renderiza sidebar al recibir cambios.

### U-02 🟠 Modal sin focus trap
**Mitigación**: `openModal()` en `utils.js` implementa trap manual con Tab + Shift+Tab.

### U-03 🟡 Click en fila no abre detalle
**Decisión**: solo botones de acción abren detalle/edit. Los iconos paran propagación. (Aceptado)

### U-04 🟡 Búsqueda con tilde
**Mitigación**: `normalize()` y `matchesSearch()` en `utils.js`.

### U-05 🟡 `confirm()` nativo
**Mitigación**: `confirmModal()` custom.

### U-06 🟡 Tablas largas sin sticky header
**Mitigación**: `position:sticky; top:0` en `.table th`.

### U-07 🟢 Móvil: sidebar drawer
**Mitigación**: `@media (max-width:900px)` con drawer overlay + hamburguesa.

### U-08 🟠 Inputs sin autocomplete
**Mitigación**: `autocomplete="email"`, `="current-password"`, `="new-password"` en login.

### U-09 🟡 Empty states genéricos
**Mitigación**: `emptyState()` con icono + título + mensaje + acción opcional.

---

## 6. RENDIMIENTO

### R-01 🟠 Carga inicial lee 10 colecciones
**Mitigación**: lazy load por módulo via `import()` en `router.js`.

### R-02 🟠 Tabla con 1000 filas congela
**Mitigación parcial**: `limit:50-500` en queries. Para >1000, falta virtualización (TODO futuro).

### R-03 🟡 Imágenes saturan localStorage
**Mitigación**: `compressImage()` en `impresion.js` reduce a JPEG 70%, max 1200px.

### R-04 🟡 Sin loader = doble click
**Mitigación parcial**: los botones de submit del formulario se desactivan tras click (default del navegador). Para operaciones largas, falta spinner global (TODO).

---

## 7. INTERNACIONALIZACIÓN

### N-01 🟡 Strings hardcodeados
**Mitigación parcial**: `tr()` se usa en sidebar. Falta migrar el resto del UI (TODO).

### N-02 🟡 Idioma no persiste post-login
**Mitigación**: `setLang(profile.lang)` en `onAuthStateChanged` cuando se carga el perfil.

### N-03 🟡 Fechas formato fijo
**Mitigación**: `Intl.DateTimeFormat(lang, opts)` en `fmtDate()` y `fmtDateTime()`.

---

## 8. OCR

> Sin implementar en esta versión. Documentado para futuro:
- O-01: try/catch en `getUserMedia` con mensaje amable.
- O-02: postproceso de matrículas con regex por país.
- O-03: API key restringida por dominio en Google Cloud.

---

## 9. DEPLOY

### D-01 🔴 firebase-config.js subido a GitHub
**Mitigación**: `.gitignore` incluye `js/firebase-config.js`. Solo `firebase-config.example.js` versionado.

### D-02 🔴 Authorized Domains
**Mitigación**: README.md instruye explícitamente añadir dominio de producción.

### D-03 🟠 Reglas en modo "test"
**Mitigación**: `firestore.rules` con reglas estrictas desde el inicio.

### D-04 🟠 Service worker cache vieja
**No aplica**: el proyecto no usa SW. Si se añade en el futuro, versionar caché.

### D-05 🟡 Sin variables de entorno
**Mitigación**: `firebase-config.js` con valores literales. Para multi-entorno, copiar el archivo apropiado en CI (documentado en README).

### D-06 🟡 Paths absolutos
**Mitigación**: todos los paths en `index.html` y `import` son relativos (`./js/...`). Funciona en GitHub Pages bajo subdirectorio.

---

## 10. SEGURIDAD

### S-01 🔴 XSS en notas
**Mitigación**: `setText()` y `textContent` siempre que se renderiza contenido del usuario. `innerHTML` solo se usa con HTML controlado (iconos SVG hardcodeados).

### S-02 🟠 Reglas no validan tipo
**Mitigación**: `firestore.rules` valida tipos en `referencias` e `ingresos`.

### S-03 🟡 Datos personales sin cifrar
**Aceptado en V1**. Acceso restringido por reglas. Para RGPD pleno, futuro: cifrado a nivel campo.

### S-04 🟡 Sin rate limiting
**No mitigado en V1**. Se confía en cuotas de Firebase.

---

## 11. OBSERVABILIDAD

### V-01 🟡 Sin logs en producción
**Mitigación parcial**: `logErr()` envía a `console.error`. Para integrar Sentry, añadir script en `index.html` (TODO).

### V-02 🟡 Sin telemetría
**No mitigado**. Firebase Analytics se puede añadir trivialmente.

---

## 12. PRE-DEPLOY CHECKLIST

> Recorrer **antes** de cada deploy a producción.

### Configuración
- [ ] `js/firebase-config.js` con valores reales **NO** está en git
- [ ] `js/firebase-config.example.js` sí está en git
- [ ] `.gitignore` incluye `js/firebase-config.js`
- [ ] Authorized Domains incluye dominio de producción
- [ ] Reglas Firestore desplegadas (`firebase deploy --only firestore:rules`)
- [ ] Índices Firestore desplegados (`firebase deploy --only firestore:indexes`)
- [ ] `bootstrapAdminEmail` está configurado o vaciado tras crear primer admin

### Auth
- [ ] Login con Google funciona en producción
- [ ] Login con email/password funciona en producción
- [ ] Bootstrap admin: borrar perfil de Firestore, recargar, debe recrearse
- [ ] Invitación con código funciona (crear desde Usuarios → Crear invitación)
- [ ] Invitación caduca a 7 días
- [ ] Usuario inactivo no puede entrar
- [ ] Operario no puede borrar referencias (probar desde consola)
- [ ] Cambio de rol en caliente actualiza menú en <5s

### Posición (el bug original)
- [ ] Crear ref nueva → recibe pos automática
- [ ] Crear ingreso nuevo → recibe pos automática DISTINTA a refs
- [ ] Asignar pos manual → no colisiona con automáticas
- [ ] Borrar registro → posición no se reutiliza (acepta hueco)
- [ ] Dos pestañas creando a la vez → no hay duplicados
- [ ] Posición visible en tabla de Referencias
- [ ] Posición visible en tabla de Ingresos
- [ ] Posición disponible como campo arrastrable en Impresión

### Motor de Impresión
- [ ] Plantilla guardada con A4 funciona en A5 (al cambiar paperSize, campos siguen dentro)
- [ ] Imagen guía NO se imprime (verificar Print Preview)
- [ ] Líneas troquel NO se imprimen
- [ ] Cambiar dropdown evento+módulo carga la plantilla correcta
- [ ] Imprimir registro real selecciona uno de la lista de la izquierda
- [ ] QR apunta a dominio de producción (no localhost)
- [ ] Múltiples copias generan múltiples páginas con page-break
- [ ] Drag fuera de canvas no pierde campo (queda en el borde)
- [ ] Print en Chrome, Firefox, Safari (móvil incluido)

### UI
- [ ] Sidebar filtra correctamente para cada rol
- [ ] Tablas con sticky header
- [ ] Empty states muestran acción
- [ ] Búsqueda ignora tildes
- [ ] Móvil: sidebar es drawer con hamburguesa

### Datos
- [ ] No hay claves admin SDK en cliente
- [ ] Notas no permiten XSS (probar con `<script>alert(1)</script>`)
- [ ] Persistencia offline activada

### Performance
- [ ] Carga inicial <2s en red 3G simulada
- [ ] Sin listeners duplicados (DevTools → Network → WS)

### Cache / Deploy
- [ ] Hard refresh sirve versión nueva tras deploy
- [ ] Paths correctos para subdirectorio de GitHub Pages

---

## 13. CONVENCIONES DEL PROYECTO

### Nombres
- Colecciones: plural minúscula sin acentos (`referencias`, `ingresos`).
- IDs: autogenerados, nunca campos del usuario.
- Campos: camelCase (`createdAt`, `eventoId`, `posicionManual`).
- Booleans: prefijo `is`/`has` (`isActive`, `hasSalida`).

### Patrón de listener
```js
let unsubX = null;
function start(){
  if(unsubX) unsubX();
  unsubX = onSnapshot(...);
  registerListener('mod:foo:bar', unsubX);
}
```

### Patrón de write
```js
await setDoc(ref, data, { merge: true });
// o counter atómico:
await runTransaction(db, async tx => {
  const snap = await tx.get(counterRef);
  const next = (snap.data()?.value || 0) + 1;
  tx.set(counterRef, { value: next });
});
```

### Estructura de módulo
```js
export async function init(container){ … }
export function destroy(){ unregisterListenersByPrefix('mod:NAME:'); }
```

---

## 14. CUANDO ME DIGAS "REVISA EL CHECKLIST"

Yo recorro:
1. PRE-DEPLOY CHECKLIST punto por punto sobre el código actual.
2. Marco ✅ o ❌ con justificación.
3. Para los ❌, propongo el fix concreto.
4. Genero un informe similar a este archivo.

Si añades nuevos riesgos al usar la app, los incorporo aquí con su ID correspondiente.

---

## 15. CHANGELOG DE FIXES POST-CHECKLIST (2026-05-08)

Tras el primer barrido del checklist, se aplicaron estos fixes:

### A-RULES.1 ✅ FIX
**Antes**: si `config/permisos` no existía, todas las reglas para non-admin fallaban.
**Después**: las reglas tienen fallback a defaults (en `firestore.rules` → `getCanCreate/Edit/Delete`). Mismo conjunto que `DEFAULT_PERMS` de `js/roles.js`.

### A-FLOW.1 ✅ FIX
**Antes**: usuario en pantalla pending no se enteraba de ser activado por admin (requería refresh).
**Después**: `auth.js` arranca un onSnapshot dirigido al doc `users/{uid}` en pending mode. Cuando `active === true`, `location.reload()`.

### P-03.1 ✅ FIX
**Antes**: editar una ref/ingreso y cambiar la posición a una ya ocupada se guardaba sin validar.
**Después**: `referencias.js` y `ingresos.js` ahora llaman `isPosicionTaken` cuando la posición cambia respecto al valor original.

### F-03.1 ✅ FIX
**Antes**: `listLive('referencias', ...)` y `listLive('ingresos', ...)` sin límite.
**Después**: ambos con `limit: 500`. Suficiente para >99% de eventos. Para queries históricas, futura paginación.

### S-01.1 ✅ FIX
**Antes**: en `router.js` el catch usaba template-string con `innerHTML` y `${e.message}`.
**Después**: construido con `createElement` y `textContent`.

### Pendientes para v2 (no críticos)
- 🟡 R-03.1: bgImage de plantillas como base64 en doc Firestore. <1MB funciona, >1MB falla. Migrar a Storage.
- 🟡 N-01.1: Solo es/en traducidos. Filtrar selector de idiomas o completar diccionarios.
- 🟢 getActiveEvent() definido pero sin uso. Útil para auto-seleccionar evento activo.
