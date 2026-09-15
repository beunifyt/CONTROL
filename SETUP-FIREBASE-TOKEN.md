# Setup Firebase Token for GitHub Actions

## Paso 1: Generar Firebase Token

Ejecuta en tu terminal local (donde tengas Firebase CLI instalado):

```bash
firebase login:ci --project devolucioncontrol-v5
```

Esto abrirá una ventana del navegador para autenticar. Después, copiarás el token.

## Paso 2: Agregar Secret a GitHub

1. Ve a: `https://github.com/beunifyt/CONTROL/settings/secrets/actions`
2. Click "New repository secret"
3. Name: `FIREBASE_TOKEN`
4. Value: Pega el token que acabas de generar
5. Click "Add secret"

## Paso 3: Agregar Firebase Credentials Secret

1. Click nuevamente "New repository secret"
2. Name: `FIREBASE_CREDENTIALS`
3. Value: Pega el contenido del archivo `firebase-creds.json` (completo en JSON)
4. Click "Add secret"

## Paso 4: Verificar

Una vez agregados los secrets, cualquier push a `main` o `master` disparará automáticamente:
- Deploy de reglas RTDB
- Deploy de reglas Firestore
- Deploy de Hosting

---

**Nota:** Los secrets solo son visibles para GitHub Actions, no en el repositorio público.
