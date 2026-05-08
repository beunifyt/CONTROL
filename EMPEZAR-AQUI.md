# 🚀 EMPEZAR EN 10 MINUTOS

Sigue estos pasos en orden. No te saltes ninguno.

## Paso 1 — Probar en local (2 min)

Abre el ZIP, entra en la carpeta `unifyt/` y arranca un servidor local:

```bash
# Opción A: Python
python3 -m http.server 8000

# Opción B: Node
npx serve

# Opción C: VS Code → instala "Live Server" → click derecho en index.html
```

Abre `http://localhost:8000`. Verás "⚙️ Configuración pendiente" — perfecto, eso significa que el core arranca bien.

## Paso 2 — Firebase (5 min)

1. Ve a https://console.firebase.google.com → **Crear proyecto**.
2. Una vez creado:
   - **Authentication** → Get started → activar **Email/Password** y **Google**.
   - **Firestore Database** → Create → modo **producción** → región `eur3` (o la que prefieras).
   - **Project Settings** (⚙️) → **Your apps** → **Web** (`</>`) → registrar app → copiar el bloque `firebaseConfig`.
3. Reemplazar en `core/config.js` los valores `TU_API_KEY`, etc., con los reales.
4. Aplicar reglas de seguridad: Firebase Console → Firestore → **Rules** → pegar todo el contenido de `firestore.rules` → **Publish**.

## Paso 3 — Cloudinary (2 min)

1. Crear cuenta gratis en https://cloudinary.com.
2. Dashboard → copiar tu **Cloud Name**.
3. **Settings** (⚙️) → **Upload** → **Upload presets** → **Add upload preset**:
   - Signing Mode: **Unsigned** ⚠ (importantísimo).
   - Folder: `unifyt/uploads`
   - Save.
4. Pegar el `cloudName` y nombre del preset en `core/config.js`.

## Paso 4 — Tu email de admin (30 seg)

En `core/config.js`:
```js
app: {
  bootstrapAdminEmail: 'tu@email.com'  // ← tu email real
}
```
El primer usuario que se registre con ESE email se autopromociona a `admin`.

## Paso 5 — Probar (1 min)

1. Recarga la app (`localhost:8000`).
2. Click "Crear cuenta" → ingresa el email que pusiste en `bootstrapAdminEmail`.
3. ¡Estás dentro como admin!

## Paso 6 — Subir a GitHub Pages (cuando quieras)

```bash
git init
git add .
git commit -m "Initial UnifyT"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/unifyt.git
git push -u origin main

# Para que tu config.js no se suba con secrets:
git update-index --assume-unchanged core/config.js
```

En GitHub: **Settings → Pages → Source: main / root → Save**.

⚠ **CRÍTICO:** Después en Firebase: **Authentication → Settings → Authorized domains → Add** → `tu-usuario.github.io`.

---

## 🧩 Cómo añadir un módulo nuevo

1. Crear carpeta: `modules/mi-modulo/`
2. Crear `mi-modulo.module.js`:

```js
import { el } from '../../shared/utils/dom.js';
import { renderHeader } from '../../shared/components/header.js';
import { renderNav } from '../../shared/components/nav.js';

export default {
  id: 'mi-modulo',
  name: 'Mi Módulo',
  icon: '🚀',
  routes: ['/mi-modulo'],
  permissions: ['miModulo.view'],

  async init(params, container) {
    renderHeader();
    renderNav();
    container.append(el('h1', {}, 'Hola desde mi módulo'));
  }
};
```

3. Editar `core/module-loader.js`, añadir `'mi-modulo'` al array `MODULES`.
4. Listo. Cero tocar el resto.

---

## 🐛 Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| Spinner infinito | Firebase sin configurar | Revisa `core/config.js` |
| `auth/unauthorized-domain` | Dominio no autorizado | Firebase → Auth → Authorized domains → añadir |
| `permission-denied` | Reglas o usuario no activo | Aplica `firestore.rules` y verifica que tu usuario tenga `active: true` |
| Cloudinary 401 | Preset signed | Cambiar a **Unsigned** |
| OCR no funciona | Tesseract pesa, primera vez tarda | Espera 10s la primera vez |

---

## 📁 ¿Qué hay en cada carpeta?

```
core/        ← Cerebro. NO tocar cuando funcione.
services/    ← Conexión con Firebase, Cloudinary, OCR.
modules/     ← UNA carpeta por funcionalidad. Independientes.
shared/      ← Componentes y utils reutilizables.
assets/      ← Idiomas, iconos.
```

**Regla de oro:** un módulo NUNCA importa de otro módulo. Solo de `services/` y `shared/`. Si dos módulos necesitan hablar, lo hacen vía `eventBus.emit()`.

---

## ✅ Checklist antes de compartir con usuarios

- [ ] `core/config.js` con valores reales
- [ ] `firestore.rules` aplicadas en Firebase Console
- [ ] Cloudinary preset = Unsigned
- [ ] Dominio añadido a Authorized domains
- [ ] Probado: registro, login, crear gasto, registrar vehículo
- [ ] Iconos PWA reemplazados por los tuyos (assets/icons/)

Cuando tengas dudas: léelo en `README.md` o pregunta.
