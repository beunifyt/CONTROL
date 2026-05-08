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
    apiKey: 'AIzaSyB02UpKF-NfciRvNyLSO3ZXouU-RkqeaK8',
    authDomain: 'control-f84ee.firebaseapp.com',
    projectId: 'control-f84ee',
    storageBucket: 'control-f84ee.firebasestorage.app',
    messagingSenderId: '491029219146',
    appId: '1:491029219146:web:a8a0daa67abba7950923b3'
  },

  // === Cloudinary ===
  // https://cloudinary.com → Dashboard
  // Settings → Upload → Upload presets → Add → Signing Mode: Unsigned
  cloudinary: {
    cloudName: 'ddb35rfoc',
    uploadPreset: 'x7piz5m2',
    folder: 'control/uploads'
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
    bootstrapAdminEmail: 'carlosreyesrivera12@gmail.com', // Primer usuario que se autopromociona a admin
    defaultCompany: 'BeUnifyT',
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
