// ═══════════════════════════════════════════════════════════════
// contact-driver.js — Modal "Contactar conductor" estilo Base44
//
// Plantillas de mensaje en el idioma del conductor.
// Envío vía: WhatsApp, SMS, Llamada, Copiar texto, Email.
// ═══════════════════════════════════════════════════════════════

import { el, openModal, closeModal, toast } from './utils.js';
import { tr, trIn } from './i18n.js';

// Plantillas (clave → texto en cada idioma)
// El texto puede contener {conductor}, {matricula}, {hall}, {stand}, {evento}, {posicion}, {hora}
const TEMPLATES = [
  { key:'welcome',  label:'Bienvenida al recinto',
    body: 'Hola {conductor}, su vehículo {matricula} ha sido registrado en {evento}. Hall: {hall}. Bienvenido.' },
  { key:'ramp',     label:'Posición en rampa asignada',
    body: 'Hola {conductor}, su vehículo {matricula} tiene asignada la posición {posicion} en rampa. Diríjase al hall {hall}.' },
  { key:'wait',     label:'Lista de espera activa',
    body: 'Hola {conductor}, su vehículo {matricula} está en lista de espera. Le avisaremos cuando haya posición libre.' },
  { key:'exit',     label:'Recordatorio de salida',
    body: 'Hola {conductor}, su vehículo {matricula} tiene programada la salida. Por favor diríjase a la puerta del hall {hall}.' },
  { key:'incident', label:'Aviso de incidencia',
    body: 'Hola {conductor}, tenemos una incidencia con su vehículo {matricula}. Contacte con nosotros lo antes posible.' },
  { key:'papers',   label:'Papeles listos',
    body: 'Hola {conductor}, sus papeles ya están listos. Pase por la oficina del hall {hall} a retirarlos.' },
  { key:'custom',   label:'Mensaje personalizado', body: '' }
];

// Traducciones de las plantillas a múltiples idiomas
const TRANS = {
  es: TEMPLATES.reduce((acc, t) => ({ ...acc, [t.key]: t.body }), {}),
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
    welcome:  'Hallo {conductor}, Ihr Fahrzeug {matricula} wurde bei {evento} registriert. Halle: {hall}. Willkommen.',
    ramp:     'Hallo {conductor}, Ihr Fahrzeug {matricula} hat die Position {posicion} an der Rampe. Bitte zur Halle {hall}.',
    wait:     'Hallo {conductor}, Ihr Fahrzeug {matricula} ist auf der Warteliste. Wir benachrichtigen Sie.',
    exit:     'Hallo {conductor}, Ausfahrt für {matricula} geplant. Bitte zum Tor von Halle {hall}.',
    incident: 'Hallo {conductor}, Vorfall mit Ihrem Fahrzeug {matricula}. Bitte kontaktieren Sie uns schnellstmöglich.',
    papers:   'Hallo {conductor}, Ihre Dokumente sind bereit. Bitte im Büro von Halle {hall} abholen.',
    custom: ''
  },
  it: {
    welcome:  'Ciao {conductor}, il suo veicolo {matricula} è stato registrato a {evento}. Hall: {hall}. Benvenuto.',
    ramp:     'Ciao {conductor}, al suo veicolo {matricula} è assegnata la posizione {posicion} in rampa. Diretto al hall {hall}.',
    wait:     'Ciao {conductor}, il suo veicolo {matricula} è in lista d\'attesa. La avviseremo.',
    exit:     'Ciao {conductor}, uscita programmata per {matricula}. Si diriga al cancello hall {hall}.',
    incident: 'Ciao {conductor}, incidente con il suo veicolo {matricula}. Ci contatti il prima possibile.',
    papers:   'Ciao {conductor}, i suoi documenti sono pronti. Passi all\'ufficio del hall {hall}.',
    custom: ''
  },
  pt: {
    welcome:  'Olá {conductor}, o seu veículo {matricula} foi registado em {evento}. Hall: {hall}. Bem-vindo.',
    ramp:     'Olá {conductor}, o seu veículo {matricula} tem a posição {posicion} na rampa. Dirija-se ao hall {hall}.',
    wait:     'Olá {conductor}, o seu veículo {matricula} está em lista de espera. Avisaremos.',
    exit:     'Olá {conductor}, saída programada para {matricula}. Dirija-se à porta do hall {hall}.',
    incident: 'Olá {conductor}, incidente com o seu veículo {matricula}. Contacte-nos o mais rápido possível.',
    papers:   'Olá {conductor}, os seus documentos estão prontos. Passe pelo escritório do hall {hall}.',
    custom: ''
  },
  pl: {
    welcome:  'Cześć {conductor}, Twój pojazd {matricula} został zarejestrowany w {evento}. Hala: {hall}. Witamy.',
    ramp:     'Cześć {conductor}, Twój pojazd {matricula} ma przypisaną pozycję {posicion} na rampie. Hala {hall}.',
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
  }
};

function resolveTemplate(key, lang, vars){
  const langTexts = TRANS[lang] || TRANS.es;
  let txt = langTexts[key] || TRANS.es[key] || '';
  for(const [k, v] of Object.entries(vars || {})){
    txt = txt.replace(new RegExp(`\\{${k}\\}`, 'g'), v || '—');
  }
  return txt;
}

/**
 * Abre el modal "Contactar conductor".
 * @param {object} registro - referencia o ingreso (debe tener: conductor, telefono, matricula, hall, evento, posicion)
 * @param {object} options - { conductorLang } idioma del conductor (de la base de conductores)
 */
export function openContactDriverModal(registro, options = {}){
  if(!registro){ return; }
  const lang = options.conductorLang || registro.conductorLang || 'es';
  const phoneRaw = registro.telefono || registro.conductor_telefono || '';
  const phone = String(phoneRaw).replace(/[^\d+]/g, '');
  const phoneIntl = phone.startsWith('+') ? phone : ('+34' + phone.replace(/^0+/, ''));
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
  let body = resolveTemplate(selectedKey, lang, vars);

  const wrap = el('div', { style:{ minWidth:'480px' } });

  // Header info
  wrap.appendChild(el('div', { class:'cd-header' },
    el('div', { class:'cd-name' }, vars.conductor),
    el('div', { class:'cd-meta' },
      el('span', {}, phoneRaw || '—'),
      el('span', { class:'cell-mute' }, '·'),
      el('span', { class:'cell-plate' }, vars.matricula),
      lang !== 'es' ? el('span', { class:'cell-mute' }, `· ${lang.toUpperCase()}`) : null
    )
  ));

  // Selector plantilla
  wrap.appendChild(el('label', { class:'edit-label' }, 'Plantilla de mensaje'));
  const select = el('select', { class:'select w-full', style:{marginBottom:'10px'} });
  for(const t of TEMPLATES){
    select.appendChild(el('option', { value: t.key, selected: t.key === selectedKey ? 'selected' : null }, t.label));
  }
  select.onchange = e => {
    selectedKey = e.target.value;
    body = resolveTemplate(selectedKey, lang, vars);
    textarea.value = body;
  };
  wrap.appendChild(select);

  // Textarea
  wrap.appendChild(el('label', { class:'edit-label' }, 'Mensaje'));
  const textarea = el('textarea', {
    class:'field-input', rows:'5',
    style:{ width:'100%', minHeight:'100px', resize:'vertical', fontFamily:'inherit' },
    oninput: e => { body = e.target.value; }
  });
  textarea.value = body;
  wrap.appendChild(textarea);

  // Botones de acción
  const actions = el('div', { class:'cd-actions' });
  const btn = (cls, ico, lab, click) => actions.appendChild(el('button', {
    class: `cd-action-btn ${cls}`, onclick: click
  }, el('span', { class:'cd-ico' }, ico), el('span', {}, lab)));

  if(phone){
    btn('cd-wa',    '💬',  'WhatsApp', () => {
      window.open(`https://wa.me/${phoneIntl.replace('+','')}?text=${encodeURIComponent(body)}`, '_blank');
    });
    btn('cd-sms',   '✉️',  'SMS', () => {
      window.location.href = `sms:${phoneIntl}?body=${encodeURIComponent(body)}`;
    });
    btn('cd-call',  '📞',  'Llamar', () => {
      window.location.href = `tel:${phoneIntl}`;
    });
  }
  btn('cd-copy',  '📋',  'Copiar texto', () => {
    navigator.clipboard.writeText(body).then(() => toast('Texto copiado', 'ok'));
  });
  if(email){
    btn('cd-email', '📨',  'Enviar por Email', () => {
      const subject = `Aviso · ${vars.matricula}`;
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
  wrap.appendChild(actions);

  openModal({ title:'💬 Contactar conductor', body: wrap, size:'sm' });
}
