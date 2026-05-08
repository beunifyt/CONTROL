# UnifyT — Plataforma Unificada

> Gestión de gastos fiscal (España) + Control de acceso vehicular para eventos.
> Arquitectura modular, 100% gratuita, sin frameworks pesados.

## 🎯 Filosofía

- **Un solo HTML.** Todo lo demás es modular y se carga dinámicamente.
- **Módulos independientes.** Añadir uno nuevo = crear carpeta, registrar en `module-loader.js`. Cero modificación en el resto.
- **Servicios aislados.** Firebase, Cloudinary, OCR — cada uno en su archivo. Cambiar proveedor toca UN sitio.
- **Event Bus.** Los módulos no se llaman entre sí. Se comunican por eventos.
- **Schema first.** Validación antes de escribir en DB. Cero datos corruptos.
- **Audit automático.** Todo cambio queda registrado sin código extra.

## 📁 Estructura

```
/core/              ← Núcleo. NO TOCAR cuando esté estable.
/services/          ← Capa de datos. Aislamiento total de proveedores.
/modules/           ← Una carpeta = una funcionalidad independiente.
/shared/            ← Componentes y utilidades reutilizables.
/assets/            ← Iconos, traducciones.
```

## 🚀 Setup inicial

### 1. Firebase (gratis)
- Crear proyecto: https://console.firebase.google.com
- Activar **Authentication** (Email + Google)
- Crear **Firestore** en región `eur3`, modo producción
- Settings → Add web app → copiar config

### 2. Cloudinary (gratis, 25 GB)
- Crear cuenta: https://cloudinary.com
- Settings → Upload → Upload preset → Unsigned
- Folder: `unifyt/uploads`

### 3. Configurar la app
Editar `core/config.js` con tus credenciales (NO subir a Git).

```js
git update-index --assume-unchanged core/config.js
```

### 4. Deploy en GitHub Pages
```bash
git add .
git commit -m "Initial setup"
git push
```
Settings → Pages → Source: `main` / root.
**Importante:** añadir tu dominio `tu-usuario.github.io` a Firebase → Authentication → Settings → Authorized domains.

## 🧩 Crear un módulo nuevo

1. Crear carpeta `modules/mi-modulo/`
2. Añadir `mi-modulo.module.js` con el manifest
3. Registrar en `core/module-loader.js`
4. Listo.

```js
// modules/mi-modulo/mi-modulo.module.js
export default {
  id: 'mi-modulo',
  name: 'Mi Módulo',
  icon: '🚀',
  routes: ['/mi-modulo'],
  permissions: ['miModulo.view'],
  init: async (container) => { /* renderiza UI */ },
  destroy: () => { /* limpia listeners */ }
};
```

## 👥 Roles

| Rol | Permisos |
|-----|----------|
| **admin** | Todo |
| **supervisor** | Aprueba gastos, gestiona vehículos |
| **operator** | Carga gastos / registra entrada vehículos |
| **viewer** | Solo lectura |

## 🔐 Reglas de seguridad

Las reglas de Firestore están en `firestore.rules`. Aplícalas desde la consola.

## 📦 Módulos incluidos

- ✅ **auth** — Login + invitaciones por código (7 días, un uso)
- ✅ **dashboard** — KPIs y gráficos
- ✅ **expenses** — Gastos con OCR, IVA, IRPF, modelo 303
- ✅ **vehicles** — Control de acceso vehicular
- ✅ **events** — Gestión de eventos y recintos
- ✅ **users** — Admin de usuarios y roles

## 🛠 Stack

- Vanilla JS (ES6 modules) — sin bundler
- Firebase (Firestore + Auth)
- Cloudinary (imágenes)
- Tesseract.js / Gemini Vision (OCR)
- GitHub Pages (hosting)

## 📋 Convenciones

- Archivos: `kebab-case.js`
- Funciones: `camelCase`
- Constantes: `UPPER_SNAKE`
- Eventos: `module:action` → `expense:created`, `vehicle:checkin`

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| Spinner infinito | Revisa consola. Suele ser Firestore mal configurado o reglas |
| auth/unauthorized-domain | Añadir dominio a Firebase Authorized domains |
| Cloudinary 401 | Preset debe ser **Unsigned** |
| Permission denied | Reglas + usuario con `active: true` y `role` correcto |

---

Licencia: uso propio.
