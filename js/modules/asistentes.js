// ═══════════════════════════════════════════════════════════════
// asistentes.js — Chat con asistentes IA (Gemini)
//
// 3 agentes especializados con prompts propios.
// Conversaciones guardadas en Firestore (asistente_chats).
// ═══════════════════════════════════════════════════════════════
import { el, clear, icon, toast } from '../utils.js';
import { pageHeader } from './shared.js';
import { getCurrentProfile } from '../auth.js';
import { isGeminiAvailable, chatWithGemini } from '../gemini.js';
import { create, list, update } from '../db.js';
import { getLang } from '../i18n.js';

let _container = null;
let _selectedAgent = null;
let _messages = [];
let _sending = false;
let _chatId = null;

const AGENTS = [
  {
    id: 'asistente_ingreso',
    name: 'Asistente de Ingresos',
    description: 'Registra entradas, consulta referencias, guía al conductor en rampa.',
    iconName: 'truck',
    color: '#16A34A',
    bg: '#F0FDF4',
    border: '#86EFAC',
    systemPrompt: `Eres "Asistente de Ingresos" de BeUnifyT, una plataforma de control de acceso vehicular para recintos feriales.

TU MISIÓN:
- Ayudar a operarios a registrar entradas y salidas de vehículos
- Consultar referencias y prerregistros existentes
- Guiar al conductor en su llegada a rampa
- Resolver dudas sobre el flujo de estados (Prerregistrado → En camino → Rampa → Dentro Fira → Salida)

ESTILO:
- Respuestas BREVES y CONCRETAS (máximo 3 párrafos)
- Si no tienes datos reales, pide al usuario que los introduzca en la app
- Usa formato Markdown moderado (negrita, listas)
- Responde en el idioma del usuario`
  },
  {
    id: 'asistente_booking',
    name: 'Asistente de Bookings',
    description: 'Crea y gestiona reservas de acceso y agenda de llegadas.',
    iconName: 'agenda',
    color: '#1D4ED8',
    bg: '#EFF6FF',
    border: '#93C5FD',
    systemPrompt: `Eres "Asistente de Bookings" de BeUnifyT.

TU MISIÓN:
- Ayudar a crear reservas (bookings) y citas en la agenda
- Sugerir horarios óptimos para llegadas
- Explicar la diferencia entre referencia/booking/ingreso directo
- Ayudar a planificar requisitos por cita (papeles, ITV, seguro, tacógrafo, CMR)
- Sugerir gestión de gastos asociados (peaje, dieta, combustible)

ESTILO:
- Respuestas BREVES y CONCRETAS
- Usa Markdown ligero
- Si necesitas datos del usuario, pídeselos`
  },
  {
    id: 'asistente_flota',
    name: 'Asistente de Flota',
    description: 'Estado en tiempo real de vehículos y conductores asignados.',
    iconName: 'flota',
    color: '#9333EA',
    bg: '#FAF5FF',
    border: '#D8B4FE',
    systemPrompt: `Eres "Asistente de Flota" de BeUnifyT.

TU MISIÓN:
- Ayudar a gestionar la base de vehículos (matrículas, tipo, marca, tacógrafo)
- Asignar conductores a vehículos
- Explicar estados de flota (almacén, en ruta)
- Sugerir importaciones desde Excel para flotas grandes

ESTILO:
- Respuestas BREVES y CONCRETAS
- Markdown ligero`
  }
];

export async function init(container){
  _container = container;
  render();
}

export function destroy(){ _container = null; }

function render(){
  if(!_container) return;
  clear(_container);

  if(!isGeminiAvailable()){
    renderNotConfigured();
    return;
  }

  renderShell();
}

function renderNotConfigured(){
  _container.appendChild(pageHeader({
    title:'🤖 Asistentes IA',
    sub:'Configuración requerida'
  }));
  _container.appendChild(el('div', { class:'asistente-empty' },
    el('div', { class:'asistente-empty-ico' }, '🔑'),
    el('h3', {}, 'Configura tu API key de Gemini'),
    el('p', {}, 'Los asistentes IA usan Google Gemini (gratis hasta 60 peticiones/min).'),
    el('ol', { class:'asistente-empty-steps' },
      el('li', {}, el('span', {}, 'Ve a '), el('a', { href:'https://aistudio.google.com/app/apikey', target:'_blank', class:'chip-link' }, 'aistudio.google.com/app/apikey'), ' y crea una API key gratis'),
      el('li', {}, 'Abre el archivo ', el('code', {}, 'firebase-config.js'), ' de tu proyecto'),
      el('li', {}, 'Añade esta línea al final:'),
    ),
    el('pre', { class:'asistente-config-code' },
      `export const geminiApiKey = 'AIzaSy... tu clave aquí ...';`
    ),
    el('p', { class:'cell-mute' }, 'Recarga la página y los asistentes estarán listos.')
  ));
}

function renderShell(){
  // Layout sidebar + chat
  const shell = el('div', { class:'asist-shell' });

  // Sidebar
  const sidebar = el('aside', { class:'asist-sidebar' });
  sidebar.appendChild(el('div', { class:'asist-sidebar-head' },
    el('h2', {}, '🤖 Asistentes IA'),
    el('p', {}, 'Responden en tu idioma')
  ));
  const agentList = el('div', { class:'asist-agent-list' });
  for(const a of AGENTS){
    const active = _selectedAgent?.id === a.id;
    agentList.appendChild(el('button', {
      class:`asist-agent-btn ${active ? 'active' : ''}`,
      style: active ? { background: a.bg, borderColor: a.border, color: a.color } : {},
      onclick: () => startConversation(a)
    },
      el('div', { class:'asist-agent-head' },
        el('div', { class:'asist-agent-ico', style:{ color: active ? a.color : '#6B7280' }, html: icon(a.iconName) }),
        el('span', { class:'asist-agent-name' }, a.name)
      ),
      el('p', { class:'asist-agent-desc' }, a.description)
    ));
  }
  sidebar.appendChild(agentList);
  sidebar.appendChild(el('div', { class:'asist-sidebar-foot' },
    '💬 WhatsApp / Telegram disponibles próximamente'
  ));
  shell.appendChild(sidebar);

  // Main chat area
  const main = el('main', { class:'asist-main' });

  if(!_selectedAgent){
    main.appendChild(el('div', { class:'asist-empty' },
      el('div', { class:'asist-empty-ico' }, '💬'),
      el('h3', {}, 'Selecciona un asistente'),
      el('p', {}, 'Elige uno de los asistentes de la izquierda para iniciar una conversación. Responden en español, inglés, francés, alemán y más.')
    ));
  } else {
    const a = _selectedAgent;
    // Header
    main.appendChild(el('div', { class:'asist-chat-head' },
      el('div', { class:'asist-chat-ico', style:{ color: a.color }, html: icon(a.iconName) }),
      el('div', { class:'asist-chat-info' },
        el('div', { class:'asist-chat-name' }, a.name),
        el('div', { class:'asist-chat-desc' }, a.description)
      ),
      el('button', { class:'btn btn-secondary btn-sm',
        onclick: () => startConversation(a)
      }, '+ Nueva conversación')
    ));

    // Mensajes
    const msgsWrap = el('div', { class:'asist-messages', id:'__asist_msgs' });
    if(_messages.length === 0){
      msgsWrap.appendChild(el('div', { class:'asist-greet' },
        el('div', { class:'asist-greet-ico', style:{ background: a.color }, html: icon(a.iconName) }),
        el('p', {}, `Hola, soy ${a.name}. ¿En qué te puedo ayudar?`)
      ));
    } else {
      for(const m of _messages){
        msgsWrap.appendChild(renderMessageBubble(m, a));
      }
      if(_sending){
        msgsWrap.appendChild(el('div', { class:'asist-typing' },
          el('span', { class:'typing-dot' }),
          el('span', { class:'typing-dot' }),
          el('span', { class:'typing-dot' })
        ));
      }
    }
    main.appendChild(msgsWrap);

    // Input
    const inputWrap = el('div', { class:'asist-input-wrap' });
    const input = el('input', {
      type:'text', class:'asist-input',
      placeholder: 'Escribe tu mensaje... (Enter para enviar)',
      disabled: _sending ? 'disabled' : null,
      onkeydown: e => {
        if(e.key === 'Enter' && !e.shiftKey){
          e.preventDefault();
          const txt = input.value.trim();
          if(txt && !_sending) sendMessage(txt);
        }
      }
    });
    const sendBtn = el('button', {
      class:'btn btn-primary asist-send',
      disabled: _sending ? 'disabled' : null,
      onclick: () => {
        const txt = input.value.trim();
        if(txt && !_sending) sendMessage(txt);
      }
    }, _sending ? '…' : '➤');
    inputWrap.appendChild(input);
    inputWrap.appendChild(sendBtn);
    main.appendChild(inputWrap);
    main.appendChild(el('p', { class:'asist-langs' },
      'Puedes escribir en cualquier idioma · English · Français · Deutsch · Italiano · Português'));

    // Auto-scroll
    setTimeout(() => {
      const m = document.getElementById('__asist_msgs');
      if(m) m.scrollTop = m.scrollHeight;
      input?.focus();
    }, 30);
  }

  shell.appendChild(main);
  _container.appendChild(shell);
}

function renderMessageBubble(msg, agent){
  const isUser = msg.role === 'user';
  const wrap = el('div', { class:`asist-msg ${isUser ? 'asist-msg-user' : 'asist-msg-bot'}` });
  if(!isUser){
    wrap.appendChild(el('div', {
      class:'asist-msg-avatar',
      style:{ background: agent.color },
      html: icon(agent.iconName)
    }));
  }
  wrap.appendChild(el('div', { class:'asist-msg-body' },
    renderMarkdown(msg.content)
  ));
  return wrap;
}

// Markdown super simple (bold, italic, code inline, listas, párrafos)
function renderMarkdown(text){
  const wrap = el('div', { class:'md' });
  const lines = (text || '').split('\n');
  let listItems = null;
  for(const ln of lines){
    if(/^\s*[\-\*]\s+/.test(ln)){
      if(!listItems){ listItems = el('ul', {}); wrap.appendChild(listItems); }
      const li = el('li', {});
      renderInline(ln.replace(/^\s*[\-\*]\s+/, ''), li);
      listItems.appendChild(li);
    } else if(/^\s*\d+\.\s+/.test(ln)){
      if(!listItems){ listItems = el('ol', {}); wrap.appendChild(listItems); }
      const li = el('li', {});
      renderInline(ln.replace(/^\s*\d+\.\s+/, ''), li);
      listItems.appendChild(li);
    } else if(ln.trim() === ''){
      listItems = null;
    } else {
      listItems = null;
      const p = el('p', {});
      renderInline(ln, p);
      wrap.appendChild(p);
    }
  }
  return wrap;
}

function renderInline(text, target){
  // Reemplazar **bold**, *italic*, `code`
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)/g;
  let last = 0;
  let m;
  while((m = re.exec(text))){
    if(m.index > last){
      target.appendChild(document.createTextNode(text.slice(last, m.index)));
    }
    if(m[1]) target.appendChild(el('strong', {}, m[2]));
    else if(m[3]) target.appendChild(el('em', {}, m[4]));
    else if(m[5]) target.appendChild(el('code', {}, m[6]));
    last = m.index + m[0].length;
  }
  if(last < text.length){
    target.appendChild(document.createTextNode(text.slice(last)));
  }
}

async function startConversation(agent){
  _selectedAgent = agent;
  _messages = [];
  _sending = false;
  _chatId = null;
  render();
}

async function sendMessage(text){
  if(_sending) return;
  _sending = true;
  _messages.push({ role:'user', content: text, ts: Date.now() });
  render();

  try{
    // Llamada a Gemini con prompt del agente
    const reply = await chatWithGemini(
      _selectedAgent.systemPrompt + `\n\nIdioma del usuario: ${getLang()}`,
      _messages.slice(0, -1).map(m => ({ role: m.role === 'user' ? 'user' : 'model', text: m.content })),
      text
    );
    _messages.push({ role:'model', content: reply, ts: Date.now() });

    // Guardar conversación en Firestore (opcional, async, no bloqueante)
    saveChat().catch(() => {});
  } catch(e){
    _messages.push({
      role:'model',
      content: `⚠️ Error al conectar con Gemini: ${e.message}. Verifica tu API key.`,
      ts: Date.now()
    });
  } finally {
    _sending = false;
    render();
  }
}

async function saveChat(){
  const profile = getCurrentProfile();
  if(!profile?.id) return;
  const payload = {
    uid: profile.id,
    agentId: _selectedAgent.id,
    messages: _messages.slice(-50), // mantener últimos 50
    updatedAt: new Date()
  };
  try{
    if(_chatId){
      await update('asistente_chats', _chatId, payload);
    } else {
      _chatId = await create('asistente_chats', { ...payload, createdAt: new Date() });
    }
  } catch(e){
    // sin permiso o sin reglas: silencio
  }
}
