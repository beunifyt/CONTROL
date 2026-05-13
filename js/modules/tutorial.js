// ═══════════════════════════════════════════════════════════════
// tutorial.js — Ayuda & Curso Interactivo (estilo Base44)
//
// 12 módulos tipo tarjeta con pasos, progreso global,
// estado Completado/Repasar, persistido en localStorage.
// ═══════════════════════════════════════════════════════════════
import { el, clear, icon, toast } from '../utils.js';
import { pageHeader } from './shared.js';

let _container = null;
let _selectedModule = null;
let _currentStep = 0;
const STORAGE_KEY = 'beunifyt_curso_v1';

const MODULOS = [
  {
    id:'intro', iconName:'truck', color:'#3B82F6', title:'Bienvenido a BeUnifyT',
    descripcion:'Plataforma integral de control de acceso vehicular para recintos feriales y eventos.',
    pasos:[
      { titulo:'¿Qué es BeUnifyT?', contenido:'BeUnifyT es un sistema de gestión operativa para el control de vehículos en recintos feriales. Permite gestionar desde el prerregistro hasta la salida final de cada vehículo, con trazabilidad completa y cumplimiento RGPD.' },
      { titulo:'Flujo principal del vehículo', contenido:'Cada vehículo pasa por estos estados:\n\n1️⃣ PRERREGISTRADO — La empresa envía sus datos antes del evento\n2️⃣ EN CAMINO — El vehículo está en ruta hacia el recinto\n3️⃣ RAMPA/PARKING — Ha llegado y espera turno de entrada\n4️⃣ DENTRO FIRA — Ha entrado al recinto ferial\n5️⃣ SALIDA — Ha completado la operación y ha salido\n\nCada cambio queda registrado con hora y usuario.' },
      { titulo:'Roles de usuario', contenido:'👑 ADMIN: Acceso total, gestión de usuarios y permisos\n🛡 SUPERVISOR: Todos los módulos excepto usuarios\n✅ OPERARIO: Referencias, ingresos, agenda, mensajes\n👤 USUARIO: Dashboard y mensajes básicos\n🏢 EMPRESA: Portal B2B con datos propios\n\nEl admin puede personalizar qué módulos ve cada rol desde el panel de Usuarios → Permisos Granulares.' }
    ]
  },
  {
    id:'dashboard', iconName:'dashboard', color:'#3B82F6', title:'Dashboard',
    descripcion:'Vista en tiempo real del estado de la operación.',
    pasos:[
      { titulo:'Panel principal', contenido:'El Dashboard muestra en tiempo real:\n• Vehículos actualmente dentro del recinto\n• Referencias y ingresos del día actual\n• Eventos activos\n• Gráfico de actividad por hora\n• Mensajes no leídos\n• Agenda del día\n\nSe actualiza automáticamente cuando hay cambios.' },
      { titulo:'Lectura de estadísticas', contenido:'Las tarjetas superiores muestran datos clave:\n\n🚛 Dentro Fira: vehículos actualmente en el recinto\n📋 Referencias hoy: prerregistros creados hoy\n🟢 Ingresos hoy: entradas directas del día\n📅 Eventos activos: ferias actualmente en curso\n\nEl gráfico muestra la distribución por horas — útil para prever picos.' }
    ]
  },
  {
    id:'referencias', iconName:'referencias', color:'#F59E0B', title:'Referencias (Prerregistros)',
    descripcion:'Gestión de vehículos prerregistrados para el evento.',
    pasos:[
      { titulo:'¿Qué es una Referencia?', contenido:'Una Referencia es el prerregistro de un vehículo para acceder al recinto. Contiene:\n• Matrícula principal y secundaria\n• Datos del conductor y empresa\n• Destino (hall, stand, expositor)\n• Estado de seguimiento\n• Posición en cola\n\nSe crea antes del evento para agilizar la entrada.' },
      { titulo:'Crear una referencia', contenido:'1. Haz clic en "Nueva Referencia"\n2. Introduce la matrícula (obligatorio)\n3. Selecciona el evento\n4. Asigna hall y stand\n5. Añade datos del conductor\n6. Guarda — el estado inicial es "prerregistrado"\n\n💡 Si el conductor ya existe, sus datos se autocompletan al introducir la matrícula.' },
      { titulo:'Cambiar estados', contenido:'Estados disponibles:\n\nPrerregistrado → En camino → Rampa/Parking → Dentro Fira → Salida\n\nCambia desde el botón en la tabla o desde la Vista Rampa. Cada cambio registra la hora automáticamente.' }
    ]
  },
  {
    id:'ingresos', iconName:'ingresos', color:'#16A34A', title:'Ingresos directos',
    descripcion:'Registro rápido de vehículos sin prerregistro previo.',
    pasos:[
      { titulo:'¿Cuándo usar Ingresos?', contenido:'Para vehículos que llegan sin prerregistro:\n\n• Vehículos de servicio inesperados\n• Reparaciones de último momento\n• Visitas no planificadas\n• Situaciones de emergencia\n\nA diferencia de Referencias, el ingreso es inmediato.' },
      { titulo:'Proceso de entrada', contenido:'1. Introduce la matrícula → el sistema busca al conductor\n2. Completa o verifica los datos\n3. Asigna destino (hall, stand)\n4. Estado inicial: "dentro"\n5. Para registrar salida: cambia a "salida"\n\nLa hora de entrada se registra automáticamente.' }
    ]
  },
  {
    id:'bookings', iconName:'agenda', color:'#6366F1', title:'Bookings & Agenda',
    descripcion:'Sistema de reservas con historial completo.',
    pasos:[
      { titulo:'¿Qué es un Booking?', contenido:'Un Booking es una reserva de acceso con trazabilidad completa:\n\n• Asociado a empresa y evento específico\n• Tiene fecha y hora planificada\n• TODA modificación queda registrada en el historial\n• Se puede convertir a Referencia con un clic\n\nIdeal para operaciones planificadas con antelación.' },
      { titulo:'Vista calendario semanal', contenido:'Cambia a vista calendario para ver:\n• Distribución horaria de citas\n• Día actual resaltado\n• Bloques coloreados por estado\n• Click en evento para editar\n\nIdeal para coordinación logística.' },
      { titulo:'Requisitos y gastos', contenido:'Cada cita puede tener:\n\n✓ Checklist de requisitos (papeles, ITV, seguro, tacógrafo, CMR)\n💰 Gastos asociados (peaje, dieta, combustible, descarga, aparcamiento)\n\nÚtil para logísticas pequeñas que necesitan control de costes operativos por viaje.' }
    ]
  },
  {
    id:'preregistro', iconName:'shield', color:'#0891B2', title:'Prerregistro Público + RGPD',
    descripcion:'Formulario público con consentimiento RGPD legalmente válido.',
    pasos:[
      { titulo:'Formulario público', contenido:'BeUnifyT genera un enlace público único por evento:\n\nURL: /preregistro?evento=ID_DEL_EVENTO\n\nLas empresas pueden prerregistrarse desde:\n• Sus dispositivos móviles\n• Ordenador de oficina\n• Sin necesidad de cuenta en el sistema' },
      { titulo:'Proceso de consentimiento RGPD', contenido:'El formulario incluye 3 pasos legalmente válidos:\n\n1️⃣ DATOS: Información del vehículo, conductor y empresa\n2️⃣ RGPD: Texto completo del tratamiento + 4 consentimientos específicos (finalidad, derechos, conservación, veracidad)\n3️⃣ FIRMA DIGITAL: Canvas de firma manuscrita\n\nEl sistema registra fecha/hora exacta, IP del dispositivo y firma digital — conforme al Art. 7 RGPD (UE) 2016/679.' },
      { titulo:'Base legal y cumplimiento', contenido:'La base legal del tratamiento es doble:\n\n📋 Art. 6.1.b RGPD: Ejecución de contrato (acceso al recinto como parte del contrato de exposición)\n📋 Art. 6.1.c RGPD: Cumplimiento de obligación legal (control de acceso exigido por normativa de seguridad)\n\nLos datos se conservan 5 años por obligaciones legales y fiscales.\n\nLa AEPD es la autoridad de control en España.' }
    ]
  },
  {
    id:'portal_empresas', iconName:'empresas', color:'#9333EA', title:'Portal de Empresas',
    descripcion:'Registro y verificación de empresas con CIF/VAT por país.',
    pasos:[
      { titulo:'Verificación de empresas', contenido:'El Portal permite verificar la autenticidad:\n\n1. La empresa se registra con su CIF/NIF/VAT\n2. El sistema verifica via VIES (UE) automáticamente\n3. El admin puede marcar como "Verificada" o "Bloqueada"\n4. Solo verificadas pueden acceder al recinto\n\nFuentes oficiales:\n• España: AEAT\n• UE: VIES (ec.europa.eu/vies)\n• UK: Companies House' },
      { titulo:'Match B2B', contenido:'Cuando se crea un usuario con role=empresa:\n\n• Se vincula a la empresa por empresaId o email\n• Solo ve sus propias referencias e ingresos\n• Estado en tiempo real de sus vehículos\n• No ve datos de otras empresas\n\nIgual que el monolito original — separación estricta.' }
    ]
  },
  {
    id:'impresion', iconName:'impresion', color:'#EC4899', title:'Motor de Impresión',
    descripcion:'Sistema de diseño y generación de pases vehiculares.',
    pasos:[
      { titulo:'Diseño de pases', contenido:'Diseña pases físicos paso a paso:\n\n1. Arrastra campos al canvas (matrícula, hall, stand, conductor)\n2. Ajusta posición, tamaño, color, formato\n3. Selecciona papel (A3/A4/A5/A6/Sticker/Troquel)\n4. Selecciona idioma del PASE (es del conductor, no del usuario)\n5. Carga imagen guía de fondo (no se imprime)\n6. Guarda la plantilla' },
      { titulo:'Funciones tipo Word', contenido:'Edición avanzada de texto en cada campo:\n• Negrita, cursiva, subrayado, tachado\n• Alineación izq/centro/der/justificado\n• Sub/super-índice\n• Interlineado y espaciado de letras\n• Color personalizado\n• Rotación 0/90/180/270\n\nAtajos: Alt+drag duplica · Ctrl+wheel escala · Shift+click selección múltiple.' },
      { titulo:'Idioma del pase', contenido:'CLAVE: El pase se imprime en el idioma del CONDUCTOR, no del usuario operario.\n\n• El usuario español ve la interfaz en español\n• Pero si el conductor es rumano, el pase imprime en rumano\n• Plantillas {tr:welcomeMsg} se traducen automáticamente\n\nVariables disponibles: {plate} {hall} {stand} {driver} {company} {event} {position} {time}' },
      { titulo:'Imagen guía + corrector trapezoidal', contenido:'En la pestaña "Guía":\n\n• Carga foto del pase real\n• Modos: Mover / Rotar / Perspectiva\n• Arrastra esquinas para corregir trapezoide\n• Sliders de precisión para ajuste fino\n\nIdeal para alinear los campos exactamente sobre el diseño físico existente.' }
    ]
  },
  {
    id:'rampa', iconName:'rampa', color:'#CA8A04', title:'Vista Rampa',
    descripcion:'Modo operario simplificado para puerta de acceso.',
    pasos:[
      { titulo:'Modo operario', contenido:'Vista diseñada para tablets/móviles en puerta:\n\n• Fondo oscuro para lectura al sol\n• Búsqueda gigante (matrícula, empresa, conductor)\n• Stats en tiempo real: rampa / dentro / en camino\n• Un solo botón para cambiar estado\n\nPuede ponerse como favorito en el tablet del operario.' }
    ]
  },
  {
    id:'analytics', iconName:'analytics', color:'#06B6D4', title:'Analytics',
    descripcion:'Informes y visualización de datos operativos.',
    pasos:[
      { titulo:'Métricas disponibles', contenido:'📊 Actividad de los últimos 7 días\n🏢 Halls más activos\n🚛 Distribución por tipo vehículo\n⏱ Estancia media en recinto\n📋 Tabla cruzada Refs vs Ingresos por evento\n📈 Tendencias 3 últimos días vs 3 anteriores\n\nFiltros por evento. Todos los gráficos interactivos.' }
    ]
  },
  {
    id:'incidencias', iconName:'warn', color:'#DC2626', title:'Incidencias',
    descripcion:'Gestión de problemas operativos con trazabilidad.',
    pasos:[
      { titulo:'Registro de incidencias', contenido:'Registra cualquier problema con:\n• Prioridad (baja/media/alta/crítica)\n• Responsable asignado\n• Progreso: Abierta → En proceso → Resuelta → Cerrada\n• Resolución adoptada\n• Historial completo de cambios\n\nTipos: bloqueo, accidente, carga incorrecta, documentación, otro.' }
    ]
  },
  {
    id:'turnos', iconName:'calendar', color:'#10B981', title:'Turnos y Fichaje',
    descripcion:'Control de presencia del personal operativo.',
    pasos:[
      { titulo:'Gestión de turnos', contenido:'• Programa turnos por día, puerta y evento\n• Fichaje entrada/salida con hora real\n• Ver quién está activo en este momento\n• Control de ausencias\n• Cálculo de horas trabajadas\n\nIdeal para saber cuánto personal hay en cada puerta y calcular costes operativos.' }
    ]
  }
];

export async function init(container){
  _container = container;
  _selectedModule = null;
  _currentStep = 0;
  render();
}

export function destroy(){ _container = null; }

function getCompleted(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch{ return []; }
}
function setCompleted(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}
function markComplete(modId){
  const arr = getCompleted();
  if(!arr.includes(modId)) arr.push(modId);
  setCompleted(arr);
}

function render(){
  if(!_container) return;
  clear(_container);

  if(_selectedModule){
    renderModuleDetail();
  } else {
    renderModuleList();
  }
}

function renderModuleList(){
  const completed = getCompleted();
  const progress = Math.round((completed.length / MODULOS.length) * 100);

  _container.appendChild(pageHeader({
    title:'📚 Curso interactivo BeUnifyT',
    sub:'Aprende a usar cada módulo de la plataforma paso a paso'
  }));

  // Barra de progreso global
  const progressCard = el('div', { class:'curso-progress' });
  progressCard.appendChild(el('div', { class:'curso-progress-head' },
    el('span', { class:'curso-progress-label' }, 'Tu progreso'),
    el('span', { class:'curso-progress-count' }, `${completed.length}/${MODULOS.length} módulos`)
  ));
  progressCard.appendChild(el('div', { class:'curso-progress-bar' },
    el('div', { class:'curso-progress-fill', style:{ width: progress + '%' } })
  ));
  progressCard.appendChild(el('div', { class:'curso-progress-pct' }, `${progress}% completado`));
  _container.appendChild(progressCard);

  // Grid de módulos
  const grid = el('div', { class:'curso-grid' });
  for(const mod of MODULOS){
    const done = completed.includes(mod.id);
    grid.appendChild(el('div', {
      class:`curso-card ${done ? 'done' : ''}`,
      onclick: () => { _selectedModule = mod; _currentStep = 0; render(); }
    },
      el('div', { class:'curso-card-head' },
        el('div', { class:'curso-card-ico', style:{ background: mod.color }, html: icon(mod.iconName) }),
        done
          ? el('span', { class:'curso-badge-done' }, '✓ Completado')
          : el('span', { class:'curso-badge-pasos' }, `${mod.pasos.length} pasos`)
      ),
      el('div', { class:'curso-card-title' }, mod.title),
      el('div', { class:'curso-card-desc' }, mod.descripcion),
      el('div', { class:'curso-card-action' },
        el('span', {}, '▶'),
        el('span', {}, done ? 'Repasar' : 'Iniciar')
      )
    ));
  }
  _container.appendChild(grid);

  if(completed.length === MODULOS.length){
    _container.appendChild(el('div', { class:'curso-finish' },
      el('div', { class:'curso-finish-ico' }, '🎉'),
      el('h3', {}, '¡Curso completado!'),
      el('p', {}, 'Has revisado todos los módulos de BeUnifyT. Ya eres un experto en la plataforma.')
    ));
  }
}

function renderModuleDetail(){
  const mod = _selectedModule;
  const paso = mod.pasos[_currentStep];
  const isLast = _currentStep === mod.pasos.length - 1;
  const isFirst = _currentStep === 0;

  // Header
  _container.appendChild(el('button', {
    class:'curso-back',
    onclick: () => { _selectedModule = null; _currentStep = 0; render(); }
  }, '← Volver al curso'));

  // Cabecera del módulo
  _container.appendChild(el('div', {
    class:'curso-mod-header',
    style:{ background: mod.color }
  },
    el('div', { class:'curso-mod-header-top' },
      el('div', { class:'curso-mod-header-ico', html: icon(mod.iconName) }),
      el('div', {},
        el('h2', {}, mod.title),
        el('p', {}, mod.descripcion)
      )
    ),
    // Barra de pasos
    el('div', { class:'curso-steps-bar' },
      ...mod.pasos.map((_, i) =>
        el('div', { class:`curso-step-dot ${i <= _currentStep ? 'on' : ''}` })
      ),
      el('span', { class:'curso-step-count' }, `${_currentStep + 1}/${mod.pasos.length}`)
    )
  ));

  // Contenido del paso
  _container.appendChild(el('div', { class:'curso-step-content' },
    el('h3', {}, paso.titulo),
    el('div', { class:'curso-step-text' }, paso.contenido)
  ));

  // Navegación
  _container.appendChild(el('div', { class:'curso-nav' },
    el('button', {
      class:'btn btn-secondary',
      disabled: isFirst ? 'disabled' : null,
      onclick: () => { if(!isFirst){ _currentStep--; render(); } }
    }, '← Anterior'),
    isLast
      ? el('button', {
          class:'btn btn-success',
          onclick: () => {
            markComplete(mod.id);
            _selectedModule = null;
            _currentStep = 0;
            toast(`✓ Módulo "${mod.title}" completado`, 'ok');
            render();
          }
        }, '✓ Completar módulo')
      : el('button', {
          class:'btn btn-primary',
          onclick: () => { _currentStep++; render(); }
        }, 'Siguiente →')
  ));
}
