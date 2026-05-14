// ═══════════════════════════════════════════════════════════════
// contact-driver.js — Modal "Contactar conductor" (v2)
//
// Cambios v2:
// - SMS quitado (cliente lo paga aparte si lo necesita)
// - Telegram con https://t.me/+<numero> (abre app en Mac/iOS si está instalada)
// - Iconos oficiales WhatsApp / Telegram (SVG logo)
// - Selector de código país (+34 / +33 / +49 / etc.)
// - Selector de idioma del mensaje (idioma conductor o forzar otro)
// - Botón Llamar usa icono teléfono outline mejorado
// ═══════════════════════════════════════════════════════════════

import { el, openModal, closeModal, toast } from './utils.js';
import { tr, trIn, getLang } from './i18n.js';

// Plantillas con placeholders {conductor} {matricula} {hall} {stand} {evento} {posicion} {hora}
const TEMPLATES = [
  { key:'welcome',  label:'Bienvenida al recinto' },
  { key:'ramp',     label:'Posición en rampa asignada' },
  { key:'wait',     label:'Lista de espera activa' },
  { key:'exit',     label:'Recordatorio de salida' },
  { key:'incident', label:'Aviso de incidencia' },
  { key:'papers',   label:'Papeles listos' },
  { key:'custom',   label:'Mensaje personalizado' }
];

const TRANS = {
  es: {
    welcome:  'Hola {conductor}, su vehículo {matricula} ha sido registrado en {evento}. Hall: {hall}. Bienvenido.',
    ramp:     'Hola {conductor}, su vehículo {matricula} tiene asignada la posición {posicion} en rampa. Diríjase al hall {hall}.',
    wait:     'Hola {conductor}, su vehículo {matricula} está en lista de espera. Le avisaremos cuando haya posición libre.',
    exit:     'Hola {conductor}, su vehículo {matricula} tiene programada la salida. Por favor diríjase a la puerta del hall {hall}.',
    incident: 'Hola {conductor}, tenemos una incidencia con su vehículo {matricula}. Contacte con nosotros lo antes posible.',
    papers:   'Hola {conductor}, sus papeles ya están listos. Pase por la oficina del hall {hall} a retirarlos.',
    custom: ''
  },
  en: {
    welcome:  'Hello {conductor}, your vehicle {matricula} has been registered at {evento}. Hall: {hall}. Welcome.',
    ramp:     'Hello {conductor}, your vehicle {matricula} has been assigned ramp position {posicion}. Please go to hall {hall}.',
    wait:     'Hello {conductor}, your vehicle {matricula} is on waiting list. We will notify you when a slot opens up.',
    exit:     'Hello {conductor}, exit is scheduled for vehicle {matricula}. Please head to the {hall} gate.',
    incident: 'Hello {conductor}, there is an incident with your vehicle {matricula}. Please contact us as soon as possible.',
    papers:   'Hello {conductor}, your documents are ready. Please come to the {hall} office to collect them.',
    custom: ''
  },
  fr: {
    welcome:  'Bonjour {conductor}, votre véhicule {matricula} a été enregistré à {evento}. Hall: {hall}. Bienvenue.',
    ramp:     'Bonjour {conductor}, votre véhicule {matricula} a la position {posicion} en rampe. Rendez-vous au hall {hall}.',
    wait:     'Bonjour {conductor}, votre véhicule {matricula} est en liste d\'attente. Nous vous préviendrons.',
    exit:     'Bonjour {conductor}, sortie programmée pour {matricula}. Présentez-vous à la porte du hall {hall}.',
    incident: 'Bonjour {conductor}, il y a un incident avec votre véhicule {matricula}. Contactez-nous rapidement.',
    papers:   'Bonjour {conductor}, vos documents sont prêts. Passez au bureau du hall {hall} pour les récupérer.',
    custom: ''
  },
  de: {
    welcome:  'Hallo {conductor}, Ihr Fahrzeug {matricula} wurde registriert in {evento}. Halle: {hall}. Willkommen.',
    ramp:     'Hallo {conductor}, Ihr Fahrzeug {matricula} hat Rampenposition {posicion}. Gehen Sie zu Halle {hall}.',
    wait:     'Hallo {conductor}, Ihr Fahrzeug {matricula} ist auf der Warteliste. Wir benachrichtigen Sie.',
    exit:     'Hallo {conductor}, Ausfahrt geplant für {matricula}. Bitte fahren Sie zum Tor von Halle {hall}.',
    incident: 'Hallo {conductor}, es gibt einen Vorfall mit Ihrem Fahrzeug {matricula}. Bitte kontaktieren Sie uns sofort.',
    papers:   'Hallo {conductor}, Ihre Dokumente sind fertig. Bitte kommen Sie ins Büro Halle {hall}.',
    custom: ''
  },
  it: {
    welcome:  'Ciao {conductor}, il tuo veicolo {matricula} è stato registrato a {evento}. Hall: {hall}. Benvenuto.',
    ramp:     'Ciao {conductor}, il veicolo {matricula} ha la posizione {posicion} in rampa. Vai al hall {hall}.',
    wait:     'Ciao {conductor}, il veicolo {matricula} è in lista d\'attesa. Ti avviseremo.',
    exit:     'Ciao {conductor}, uscita programmata per {matricula}. Vai al cancello del hall {hall}.',
    incident: 'Ciao {conductor}, abbiamo un problema col veicolo {matricula}. Contattaci appena possibile.',
    papers:   'Ciao {conductor}, i tuoi documenti sono pronti. Passa all\'ufficio del hall {hall}.',
    custom: ''
  },
  pt: {
    welcome:  'Olá {conductor}, o veículo {matricula} foi registado em {evento}. Hall: {hall}. Bem-vindo.',
    ramp:     'Olá {conductor}, o veículo {matricula} tem a posição {posicion} na rampa. Vá ao hall {hall}.',
    wait:     'Olá {conductor}, o veículo {matricula} está na lista de espera. Avisaremos.',
    exit:     'Olá {conductor}, saída programada para {matricula}. Por favor vá ao portão do hall {hall}.',
    incident: 'Olá {conductor}, temos um incidente com o veículo {matricula}. Contacte-nos o quanto antes.',
    papers:   'Olá {conductor}, os documentos estão prontos. Passe pelo escritório do hall {hall}.',
    custom: ''
  },
  pl: {
    welcome:  'Cześć {conductor}, Twój pojazd {matricula} został zarejestrowany w {evento}. Hala: {hall}. Witamy.',
    ramp:     'Cześć {conductor}, pojazd {matricula} ma pozycję {posicion} na rampie. Idź do hali {hall}.',
    wait:     'Cześć {conductor}, Twój pojazd {matricula} jest na liście oczekujących. Powiadomimy.',
    exit:     'Cześć {conductor}, zaplanowany wyjazd dla {matricula}. Proszę udać się do bramy hali {hall}.',
    incident: 'Cześć {conductor}, incydent z Twoim pojazdem {matricula}. Skontaktuj się z nami jak najszybciej.',
    papers:   'Cześć {conductor}, Twoje dokumenty są gotowe. Przyjdź do biura hali {hall}.',
    custom: ''
  },
  ro: {
    welcome:  'Bună {conductor}, vehiculul {matricula} a fost înregistrat la {evento}. Hall: {hall}. Bine ați venit.',
    ramp:     'Bună {conductor}, vehiculul {matricula} are poziția {posicion} la rampă. Mergeți la hall-ul {hall}.',
    wait:     'Bună {conductor}, vehiculul {matricula} este pe lista de așteptare. Vă vom anunța.',
    exit:     'Bună {conductor}, ieșire programată pentru {matricula}. Mergeți la poarta hall {hall}.',
    incident: 'Bună {conductor}, incident cu vehiculul {matricula}. Contactați-ne cât mai curând.',
    papers:   'Bună {conductor}, documentele sunt gata. Treceți pe la biroul hall {hall}.',
    custom: ''
  },
  nl: {
    welcome:  'Hallo {conductor}, voertuig {matricula} is geregistreerd bij {evento}. Hal: {hall}. Welkom.',
    ramp:     'Hallo {conductor}, voertuig {matricula} heeft rampositie {posicion}. Ga naar hal {hall}.',
    wait:     'Hallo {conductor}, voertuig {matricula} staat op de wachtlijst. Wij houden u op de hoogte.',
    exit:     'Hallo {conductor}, vertrek gepland voor {matricula}. Ga naar de poort van hal {hall}.',
    incident: 'Hallo {conductor}, er is een incident met voertuig {matricula}. Neem zo snel mogelijk contact op.',
    papers:   'Hallo {conductor}, uw papieren zijn klaar. Kom langs het kantoor van hal {hall}.',
    custom: ''
  },
  bg: {
    welcome:  'Здравейте {conductor}, превозното средство {matricula} е регистрирано в {evento}. Хол: {hall}. Добре дошли.',
    ramp:     'Здравейте {conductor}, {matricula} има позиция {posicion} на рампата. Идете в хол {hall}.',
    wait:     'Здравейте {conductor}, {matricula} е в списъка на чакащите. Ще ви уведомим.',
    exit:     'Здравейте {conductor}, планирано тръгване за {matricula}. Идете до изхода на хол {hall}.',
    incident: 'Здравейте {conductor}, инцидент с {matricula}. Свържете се с нас спешно.',
    papers:   'Здравейте {conductor}, документите ви са готови. Минете през офиса на хол {hall}.',
    custom: ''
  }
};

// Códigos de país habituales en transporte UE
const COUNTRY_CODES = [
  { code:'+34', flag:'🇪🇸', label:'España' },
  { code:'+33', flag:'🇫🇷', label:'Francia' },
  { code:'+49', flag:'🇩🇪', label:'Alemania' },
  { code:'+39', flag:'🇮🇹', label:'Italia' },
  { code:'+351', flag:'🇵🇹', label:'Portugal' },
  { code:'+48', flag:'🇵🇱', label:'Polonia' },
  { code:'+40', flag:'🇷🇴', label:'Rumanía' },
  { code:'+31', flag:'🇳🇱', label:'Países Bajos' },
  { code:'+32', flag:'🇧🇪', label:'Bélgica' },
  { code:'+43', flag:'🇦🇹', label:'Austria' },
  { code:'+359', flag:'🇧🇬', label:'Bulgaria' },
  { code:'+420', flag:'🇨🇿', label:'Chequia' },
  { code:'+421', flag:'🇸🇰', label:'Eslovaquia' },
  { code:'+36', flag:'🇭🇺', label:'Hungría' },
  { code:'+44', flag:'🇬🇧', label:'Reino Unido' },
  { code:'+41', flag:'🇨🇭', label:'Suiza' },
  { code:'+45', flag:'🇩🇰', label:'Dinamarca' },
  { code:'+46', flag:'🇸🇪', label:'Suecia' },
  { code:'+90', flag:'🇹🇷', label:'Turquía' },
  { code:'+30', flag:'🇬🇷', label:'Grecia' },
  { code:'+212', flag:'🇲🇦', label:'Marruecos' },
  { code:'+1', flag:'🇺🇸', label:'EEUU/CA' }
];

// Idiomas disponibles para el mensaje
const MSG_LANGS = [
  { code:'es', label:'Español' },
  { code:'en', label:'English' },
  { code:'fr', label:'Français' },
  { code:'de', label:'Deutsch' },
  { code:'it', label:'Italiano' },
  { code:'pt', label:'Português' },
  { code:'pl', label:'Polski' },
  { code:'ro', label:'Română' },
  { code:'nl', label:'Nederlands' },
  { code:'bg', label:'Български' }
];

// SVG logos oficiales (outline limpios, mono-color para hover)
const ICO_WHATSAPP = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413"/></svg>`;

const ICO_TELEGRAM = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`;

const ICO_PHONE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.84.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;

const ICO_COPY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

const ICO_EMAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>`;

function resolveTemplate(key, lang, vars){
  const langTexts = TRANS[lang] || TRANS.es;
  let txt = langTexts[key] || TRANS.es[key] || '';
  for(const [k, v] of Object.entries(vars || {})){
    txt = txt.replace(new RegExp(`\\{${k}\\}`, 'g'), v || '—');
  }
  return txt;
}

/**
 * Devuelve el código de país detectado en un número, o '+34' por defecto.
 * Acepta números con '+' o sin él.
 */
function detectCountryCode(phoneRaw){
  const p = String(phoneRaw || '').replace(/[^\d+]/g, '');
  if(!p) return '+34';
  if(p.startsWith('+')){
    // Probar prefijos de 1 a 4 dígitos contra COUNTRY_CODES
    for(const len of [4,3,2]){
      const test = p.slice(0, len + 1); // +X...
      if(COUNTRY_CODES.find(c => c.code === test)) return test;
    }
  }
  return '+34';
}

function stripCountryCode(phone, code){
  let p = String(phone || '').replace(/[^\d+]/g, '');
  if(p.startsWith(code)) return p.slice(code.length).replace(/^0+/, '');
  if(p.startsWith('+')) return p; // ya tiene otro código distinto
  return p.replace(/^0+/, '');
}

/**
 * Abre el modal "Contactar conductor" v2.
 * @param {object} registro - referencia o ingreso
 * @param {object} options - { conductorLang } idioma del conductor
 */
export function openContactDriverModal(registro, options = {}){
  if(!registro){ return; }

  const conductorLang = options.conductorLang || registro.conductorLang || 'es';
  let selectedLang = conductorLang;
  let selectedCountry = detectCountryCode(registro.telefono);
  let phoneLocal = stripCountryCode(registro.telefono, selectedCountry);
  const email = registro.email || registro.conductor_email || '';

  const vars = {
    conductor: registro.conductor || registro.conductor_nombre || 'conductor',
    matricula: registro.matricula || '',
    hall:      registro.hall || '',
    stand:     registro.stand || '',
    evento:    registro.eventoNombre || registro.evento_nombre || '',
    posicion:  registro.posicion || '',
    hora:      registro.horaEntrada || registro.hora_entrada || ''
  };

  let selectedKey = 'welcome';

  const wrap = el('div', { class:'cd-wrap' });

  // Header con datos
  wrap.appendChild(el('div', { class:'cd-header' },
    el('div', { class:'cd-name' }, vars.conductor),
    el('div', { class:'cd-meta' },
      el('span', { class:'cell-plate' }, vars.matricula),
      vars.empresa ? el('span', { class:'cell-mute' }, '· ' + (registro.empresa || '')) : null
    )
  ));

  // Fila: País + Teléfono
  const phoneRow = el('div', { class:'cd-field-row' });
  const phoneCol = el('div', { class:'cd-field-col cd-phone-col' });
  phoneCol.appendChild(el('label', { class:'cd-label' }, 'Teléfono del conductor'));
  const phoneInputRow = el('div', { class:'cd-phone-input-row' });
  const countrySel = el('select', { class:'cd-country-sel', onchange: e => {
    selectedCountry = e.target.value;
  } });
  for(const c of COUNTRY_CODES){
    countrySel.appendChild(el('option', {
      value: c.code,
      selected: c.code === selectedCountry ? 'selected' : null
    }, `${c.flag} ${c.code}`));
  }
  const phoneInput = el('input', {
    type:'tel', class:'cd-phone-input',
    placeholder:'600 123 456',
    value: phoneLocal,
    oninput: e => { phoneLocal = e.target.value.replace(/[^\d]/g, ''); }
  });
  phoneInputRow.appendChild(countrySel);
  phoneInputRow.appendChild(phoneInput);
  phoneCol.appendChild(phoneInputRow);
  phoneRow.appendChild(phoneCol);
  wrap.appendChild(phoneRow);

  // Fila: Idioma del mensaje + Plantilla
  const ctrlRow = el('div', { class:'cd-ctrl-row' });

  const langCol = el('div', {});
  langCol.appendChild(el('label', { class:'cd-label' },
    'Idioma del mensaje ',
    el('span', { class:'cd-lang-hint' }, `(conductor: ${conductorLang.toUpperCase()})`)
  ));
  const langSel = el('select', { class:'cd-sel', onchange: e => {
    selectedLang = e.target.value;
    textarea.value = resolveTemplate(selectedKey, selectedLang, vars);
  } });
  for(const l of MSG_LANGS){
    langSel.appendChild(el('option', {
      value: l.code,
      selected: l.code === selectedLang ? 'selected' : null
    }, l.label));
  }
  langCol.appendChild(langSel);
  ctrlRow.appendChild(langCol);

  const tplCol = el('div', {});
  tplCol.appendChild(el('label', { class:'cd-label' }, 'Plantilla'));
  const tplSel = el('select', { class:'cd-sel', onchange: e => {
    selectedKey = e.target.value;
    textarea.value = resolveTemplate(selectedKey, selectedLang, vars);
  } });
  for(const t of TEMPLATES){
    tplSel.appendChild(el('option', {
      value: t.key,
      selected: t.key === selectedKey ? 'selected' : null
    }, t.label));
  }
  tplCol.appendChild(tplSel);
  ctrlRow.appendChild(tplCol);

  wrap.appendChild(ctrlRow);

  // Textarea del mensaje
  wrap.appendChild(el('label', { class:'cd-label', style:{marginTop:'10px'} }, 'Mensaje'));
  const textarea = el('textarea', {
    class:'cd-textarea', rows:'4',
    value: resolveTemplate(selectedKey, selectedLang, vars)
  });
  // value en setAttribute no funciona para textarea
  textarea.value = resolveTemplate(selectedKey, selectedLang, vars);
  wrap.appendChild(textarea);

  // Acciones: WhatsApp / Telegram / Llamar / Email / Copiar
  const actions = el('div', { class:'cd-actions-v2' });

  const getPhoneIntl = () => {
    // Formato puro sin '+' para WhatsApp/Telegram; con '+' para tel
    const local = phoneLocal.replace(/[^\d]/g, '').replace(/^0+/, '');
    const intl = selectedCountry.replace(/[^\d]/g, '') + local;
    return { plus: '+' + intl, raw: intl };
  };

  // WhatsApp (logo oficial verde)
  actions.appendChild(el('button', {
    class:'cd-act cd-wa', title:'Abrir conversación en WhatsApp',
    onclick: () => {
      const { raw } = getPhoneIntl();
      if(!raw){ toast('Falta el número de teléfono', 'err'); return; }
      window.open(`https://wa.me/${raw}?text=${encodeURIComponent(textarea.value)}`, '_blank');
    }
  },
    el('span', { class:'cd-act-ico', html: ICO_WHATSAPP }),
    el('span', { class:'cd-act-lbl' }, 'WhatsApp')
  ));

  // Telegram (logo oficial azul) — usa https://t.me/+ que sí abre app en Mac
  actions.appendChild(el('button', {
    class:'cd-act cd-tg', title:'Abrir conversación en Telegram',
    onclick: () => {
      const { plus } = getPhoneIntl();
      if(plus === '+'){ toast('Falta el número de teléfono', 'err'); return; }
      // Telegram requiere el formato https://t.me/+XXXXX (con + literal en URL)
      const url = `https://t.me/${encodeURIComponent(plus)}`;
      // Copiar el mensaje al portapapeles, porque Telegram no acepta ?text= en t.me directo
      try{
        navigator.clipboard.writeText(textarea.value);
        toast('Mensaje copiado · pega en Telegram (Cmd+V)', 'ok', 3500);
      }catch(_){}
      window.open(url, '_blank');
    }
  },
    el('span', { class:'cd-act-ico', html: ICO_TELEGRAM }),
    el('span', { class:'cd-act-lbl' }, 'Telegram')
  ));

  // Llamar
  actions.appendChild(el('button', {
    class:'cd-act cd-call', title:'Llamar al teléfono',
    onclick: () => {
      const { plus } = getPhoneIntl();
      if(plus === '+'){ toast('Falta el número', 'err'); return; }
      window.location.href = `tel:${plus}`;
    }
  },
    el('span', { class:'cd-act-ico', html: ICO_PHONE }),
    el('span', { class:'cd-act-lbl' }, 'Llamar')
  ));

  // Email
  if(email){
    actions.appendChild(el('button', {
      class:'cd-act cd-email', title:'Enviar por email',
      onclick: () => {
        const subject = `Aviso · ${vars.matricula}`;
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(textarea.value)}`;
      }
    },
      el('span', { class:'cd-act-ico', html: ICO_EMAIL }),
      el('span', { class:'cd-act-lbl' }, 'Email')
    ));
  }

  // Copiar
  actions.appendChild(el('button', {
    class:'cd-act cd-copy', title:'Copiar texto al portapapeles',
    onclick: () => {
      navigator.clipboard.writeText(textarea.value).then(() => toast('Texto copiado', 'ok'));
    }
  },
    el('span', { class:'cd-act-ico', html: ICO_COPY }),
    el('span', { class:'cd-act-lbl' }, 'Copiar')
  ));

  wrap.appendChild(actions);

  openModal({ title:'💬 Contactar conductor', body: wrap, size:'sm' });
}
