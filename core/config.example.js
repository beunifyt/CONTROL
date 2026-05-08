/**
 * config.example.js
 *
 * Esto es lo que sí va al repo público.
 * Copia este archivo a `config.js` y rellena tus credenciales reales.
 * Después ejecuta:
 *   git update-index --assume-unchanged core/config.js
 * para que tus secrets nunca se suban.
 */

export const config = {
  firebase: {
    apiKey: 'TU_API_KEY',
    authDomain: 'TU_PROYECTO.firebaseapp.com',
    projectId: 'TU_PROYECTO',
    storageBucket: 'TU_PROYECTO.appspot.com',
    messagingSenderId: 'XXXXX',
    appId: '1:XXXXX:web:XXXXX'
  },
  cloudinary: {
    cloudName: 'TU_CLOUD_NAME',
    uploadPreset: 'TU_PRESET_UNSIGNED',
    folder: 'unifyt/uploads'
  },
  ocr: {
    defaultEngine: 'tesseract',
    geminiKey: '',
    ocrSpaceKey: ''
  },
  app: {
    name: 'UnifyT',
    bootstrapAdminEmail: 'tu@email.com',
    defaultCompany: 'Mi Empresa',
    defaultLang: 'es',
    locale: 'es-ES',
    currency: 'EUR',
    timezone: 'Europe/Madrid'
  },
  tax: {
    ivaRates: [0, 4, 10, 21],
    irpfRates: { general: 15, newAutonomo: 7 },
    recargoEquivalencia: [0.5, 1.4, 5.2],
    kmRate: 0.26
  },
  dev: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
  version: '1.0.0'
};
