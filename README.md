# BeUnifyT — Control Platform

Sistema de control de accesos para ferias y eventos. Web modular en HTML+JS vanilla con Firebase como backend (Auth + Firestore + Storage). Sin bundler, sin build step — se sirve directamente desde GitHub Pages.

## 🚀 Quickstart

### 1) Configurar Firebase

1. En la consola de Firebase ([console.firebase.google.com](https://console.firebase.google.com)), tu proyecto debe tener activos:
   - **Authentication**: Google + Email/Password
   - **Firestore Database** (modo producción)
   - **Storage**

2. Copia la config web del proyecto y créate `js/firebase-config.js` partiendo de `js/firebase-config.example.js`:

   ```bash
   cp js/firebase-config.example.js js/firebase-config.js
   ```

3. Edita `js/firebase-config.js`:
   - Pega los valores reales de `firebaseConfig`.
   - Pon tu email en `bootstrapAdminEmail` — la primera persona que se loguee con ese email será admin automáticamente.

4. **Authorized Domains** (CRÍTICO — D-02 del checklist): en Firebase → Authentication → Settings → Authorized domains, añade:
   - `localhost`
   - `<tu-usuario>.github.io` (o tu dominio custom)

### 2) Desplegar reglas Firestore

Necesitas Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # selecciona el proyecto, acepta los archivos existentes
firebase deploy --only firestore:rules,firestore:indexes
```

Esto despliega:
- `firestore.rules` — reglas de seguridad servidor (matriz de permisos por rol).
- `firestore.indexes.json` — índices compuestos para todas las queries.

### 3) Desplegar a GitHub Pages

```bash
git init
git add .
git commit -m "BeUnifyT initial"
git remote add origin git@github.com:<tu-usuario>/<tu-repo>.git
git push -u origin main
```

En GitHub: Settings → Pages → Source: `main` / root.

Tu app estará en: `https://<tu-usuario>.github.io/<tu-repo>/`.

### 4) Primer login

1. Abre tu URL de GitHub Pages.
2. Inicia sesión con el email que pusiste en `bootstrapAdminEmail`.
3. Quedas como administrador. Desde "Usuarios" puedes crear invitaciones para el resto del equipo.

---

## 🧱 Arquitectura

```
beunifyt/
├── index.html              ← shell
├── styles.css              ← design system
├── firestore.rules         ← seguridad
├── firestore.indexes.json  ← índices
├── js/
│   ├── firebase-config.js          ← TU configuración (gitignored)
│   ├── firebase-config.example.js  ← plantilla
│   ├── i18n.js             ← traducciones (es/en + extensible)
│   ├── utils.js            ← helpers DOM, modales, toast, iconos
│   ├── roles.js            ← matriz de permisos por rol
│   ├── db.js               ← capa Firestore + counters atómicos posición
│   ├── invites.js          ← invitaciones por código (7 días)
│   ├── auth.js             ← flujo Google + Email/Password
│   ├── router.js           ← hash router con lazy load
│   ├── app.js              ← orquestador del shell
│   └── modules/
│       ├── _shared.js      ← helpers comunes (page header, badges)
│       ├── dashboard.js
│       ├── recintos.js
│       ├── eventos.js
│       ├── referencias.js  ← con Pos. distinta (P-01)
│       ├── ingresos.js     ← con Pos. distinta y reinicio diario
│       ├── agenda.js
│       ├── conductores.js
│       ├── empresas.js
│       ├── flota.js
│       ├── analytics.js
│       ├── mensajes.js
│       ├── usuarios.js     ← matriz de permisos por rol (admin)
│       └── impresion.js    ← motor de impresión completo
├── BUGS-Y-RIESGOS.md       ← checklist anti-problemas
└── .gitignore
```

### Módulos
Cada módulo expone `init(container)` y `destroy()`. El router los carga con `import()` solo al navegar (R-01) y limpia listeners al cambiar (F-01).

### Sistema de posiciones (P-01)
- **Referencias**: contador `counters/refPos__{eventoId}`. Persiste por evento.
- **Ingresos**: contador `counters/ingPos__{eventoId}__{YYYY-MM-DD}`. Reinicia cada día.
- Atomicidad por `runTransaction` (P-02).
- Posiciones manuales validan colisión antes de guardar (P-03).

### Permisos (A-03)
Definidos en `roles.js` (cliente) y replicados en `firestore.rules` (servidor).
- `admin`: todo.
- `supervisor`: 12 módulos + crear/editar/eliminar.
- `operario`: 5 módulos + crear/editar.
- `user`: 2 módulos, solo lectura.

El admin puede editar la matriz desde **Usuarios → Permisos por rol** y se propaga en caliente a todas las pestañas (U-01).

### Plantillas de impresión (I-04)
- Por evento + módulo: `eventos/{eventoId}/templates/{tplId}` con `{ modulo, layout, isDefault }`.
- Fallback a globales: `templates_global/`.
- Coordenadas en **porcentaje** para que escalen entre A4/A5/A6 (I-01).
- Reglas `@media print` ocultan guías y troqueles (I-02, I-03).

---

## ✅ Checklist anti-problemas

Antes de cada deploy, recorre el archivo [`BUGS-Y-RIESGOS.md`](./BUGS-Y-RIESGOS.md) sección "PRE-DEPLOY CHECKLIST". Está pensado precisamente para que el primer deploy funcione sin sustos.

Para que Claude (u otro asistente) revise el código contra ese checklist en el futuro, basta con decir: *"revisa el checklist contra el código actual"*.

---

## 🔧 Modificaciones rápidas

- **Añadir un módulo**: crear `js/modules/<nombre>.js` con `init`/`destroy`, registrarlo en `roles.js` (MODULES) y `router.js` (ROUTES).
- **Añadir un idioma**: añadir entrada en `LANGS` y diccionario en `T` dentro de `js/i18n.js`.
- **Cambiar el primer admin**: editar `bootstrapAdminEmail` en `js/firebase-config.js`. Después de creado el primer admin, vacíalo (mejor práctica de seguridad).

---

## 🐛 Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| Login Google falla con `auth/unauthorized-domain` | El dominio de producción no está en Authorized Domains | Firebase → Auth → Settings → Authorized domains |
| `The query requires an index. You can create it here: [link]` | Falta un índice compuesto | Click en el link, o `firebase deploy --only firestore:indexes` |
| Tras cambiar de pantalla, se duplican lecturas Firestore | Listener no se limpia | Verificar que el módulo registra con `KEY_PREFIX` |
| Posición duplicada al crear simultáneo | Sin transacción | Verificar que `db.js` usa `runTransaction` (ya está) |
| La imagen de fondo aparece al imprimir | Falta `@media print` en CSS | Verificar `styles.css` (ya está) |

---

## 📞 Soporte

Pull requests bienvenidas. Reportes de bugs preferentemente con número del checklist (P-02, F-01, etc.).
