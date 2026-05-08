# UnifyT — Versión completa con Control integrado

Esta versión combina:
- **Tu scaffold anterior** (el que ya subiste a GitHub con Firebase + Cloudinary configurados)
- **El sistema completo de Control** (todas las pestañas, plantillas de impresión, OCR de matrículas, eventos, halls, conductores, etc.)

## Qué se ha añadido

### Módulos nuevos en `/modules/` (extraídos de Control)
- `ingresos/` — Pestaña principal de ingresos vehiculares (74 funciones)
- `ingresos2/` — Variante de ingresos
- `flota/` — Control de flota
- `conductores/` — Gestión de conductores
- `agenda/` — Citas y agenda
- `recintos/` — Recintos / facilities
- `empresas/` — Portal Empresa con RGPD + 2FA (85 funciones)
- `mensajes/` — Sistema de mensajería
- `papelera/` — Elementos eliminados
- `impresion/` — Plantillas y troquelado (79 funciones)
- `auditoria/` — Logs
- `ocr/` — Escaneo OCR de matrículas

### Núcleo extra en `/core/control/`
- `state.js` — Variables globales (DB, CU, SK, PAISES, LANGS)
- `firebase.js` — Conexión Firebase de Control (Realtime DB, distinta de la del scaffold que usa Firestore)
- `i18n.js` — Sistema de traducción
- `permissions.js` — Roles y permisos granulares
- `campos.js` — Configuración de campos visibles
- `shell.js` — Header, tabs, navegación
- `utils.js` — Helpers genéricos
- `import-export.js` — Excel import/export
- `control-body.html` — HTML completo del cuerpo de Control

### Estilos extra en `/shared/styles/`
- `control.css` — Paleta y componentes de Control (33 KB)

### Raíz
- `cam-ocr-beunifyt.js` — OCR de matrículas

## Lo que NO he cambiado
- El sistema de login que ya funciona en tu repo
- La configuración de Firebase / Cloudinary
- Las reglas de Firestore
- El index.html original

## Próximo paso
Subir todo este contenido a tu repo existente. **No necesitas reconfigurar nada.**

El login seguirá funcionando, y a mayores tendrás disponibles todos los módulos de Control para integrar progresivamente.

## Limitación honesta
Los módulos de Control están copiados como `.control.js` (no `.module.js`) porque su sistema de carga es distinto al del scaffold. Para activarlos hay que adaptarlos al patrón del scaffold (manifest + init), pero el código está ahí, listo para usar.
