/**
 * Configuración centralizada.
 *
 * ⚠️ ESTE ES EL ÚNICO ARCHIVO CON SECRETS.
 *
 * Antes del primer push:
 *   git update-index --assume-unchanged core/config.js
 * para no versionar tus credenciales reales.
 *
 * Crea config.example.js con valores placeholder para el repo público.
 */

export const config = {
  // === Firebase ===
  // https://console.firebase.google.com → Project Settings → General → Your apps
  firebase: {
    apiKey: 'TU_API_KEY',
    authDomain: 'TU_PROYECTO.firebaseapp.com',
    projectId: 'TU_PROYECTO',
    storageBucket: 'TU_PROYECTO.appspot.com',
    messagingSenderId: 'XXXXX',
    appId: '1:XXXXX:web:XXXXX'
  },

  // === Cloudinary ===
  // https://cloudinary.com → Dashboard
  // Settings → Upload → Upload presets → Add → Signing Mode: Unsigned
  cloudinary: {
    cloudName: 'TU_CLOUD_NAME',
    uploadPreset: 'TU_PRESET_UNSIGNED',
    folder: 'unifyt/uploads'
  },

  // === OCR (opcional, configurable luego en Ajustes) ===
  // Por defecto usa Tesseract local (sin key). Gemini gratis: https://aistudio.google.com/apikey
  ocr: {
    defaultEngine: 'tesseract', // 'tesseract' | 'gemini' | 'ocrspace'
    geminiKey: '',
    ocrSpaceKey: ''
  },

  // === App ===
  app: {
    name: 'UnifyT',
    bootstrapAdminEmail: 'tu@email.com', // Primer usuario que se autopromociona a admin
    defaultCompany: 'Mi Empresa',
    defaultLang: 'es',
    locale: 'es-ES',
    currency: 'EUR',
    timezone: 'Europe/Madrid'
  },

  // === Reglas fiscales (España) ===
  tax: {
    ivaRates: [0, 4, 10, 21],
    irpfRates: { general: 15, newAutonomo: 7 },
    recargoEquivalencia: [0.5, 1.4, 5.2],
    kmRate: 0.26 // €/km RD 2023
  },

  // === Modo desarrollo ===
  dev: location.hostname === 'localhost' || location.hostname === '127.0.0.1',

  // === Versión ===
  version: '1.0.0'
};
