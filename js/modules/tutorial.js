// ═══════════════════════════════════════════════════════════════
// tutorial.js — Curso interactivo del programa
//
// Estructura:
// - Lecciones agrupadas por módulo
// - Cada lección: texto + screenshots ASCII + botones para abrir el módulo
// - Progreso guardado en localStorage por usuario
// - Resaltado de elementos en pantalla (modo "tour")
// ═══════════════════════════════════════════════════════════════

import { el, clear, icon, toast, openModal, closeModal } from '../utils.js';
import { unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState } from './shared.js';
import { getCurrentProfile } from '../auth.js';
import { logger } from '../logger.js';
import { navigate } from '../router.js';

let _container = null;
let _activeChapter = 0;
let _activeLesson = 0;
const KEY_PREFIX = 'mod:tutorial:';
const PROGRESS_KEY = 'beunifyt_tutorial_progress';

const CURSO = [
  {
    id:'intro', title:'Bienvenido a BeUnifyT', icon:'🎓',
    lessons: [
      {
        id:'que_es', title:'¿Qué es BeUnifyT?',
        content: [
          {type:'p', text:'BeUnifyT es una plataforma de control de accesos para ferias y eventos vehiculares. Te permite registrar referencias, ingresos libres, agendar citas, gestionar conductores, empresas, flota e imprimir pases personalizados.'},
          {type:'p', text:'Está pensada para 6 roles diferentes: Administrador, Supervisor, Controlador de Rampa, Operario, Visor y Usuario. Cada rol ve solo lo que necesita.'},
          {type:'highlight', text:'💡 Datos en tiempo real: cuando un usuario crea un registro, todos los demás lo ven al instante.'}
        ]
      },
      {
        id:'primer_paso', title:'Tu primer paso',
        content: [
          {type:'p', text:'Para empezar a usar BeUnifyT necesitas tener al menos:'},
          {type:'list', items:[
            'Un recinto (ej: FIRA Barcelona)',
            'Un evento ligado a ese recinto (ej: MWC 2026)',
            'Empresas que entrarán al evento',
            'Conductores y vehículos opcionales para agilizar el registro'
          ]},
          {type:'action', label:'Abrir Recintos', target:'recintos'},
          {type:'action', label:'Abrir Eventos', target:'eventos'}
        ]
      },
      {
        id:'sidebar', title:'Navegación lateral',
        content: [
          {type:'p', text:'El menú izquierdo muestra solo los módulos a los que tienes acceso. Puedes reordenar los iconos arrastrándolos para poner tu favorito arriba.'},
          {type:'highlight', text:'🎨 Cambia el tema con el botón ⚙ arriba a la derecha (claro, oscuro, suave o alto contraste).'}
        ]
      }
    ]
  },
  {
    id:'recintos', title:'Recintos y Eventos', icon:'🏟',
    lessons: [
      {
        id:'recinto_nuevo', title:'Crear un recinto',
        content: [
          {type:'p', text:'Un recinto es el edificio físico donde se celebra el evento. Tiene halls (pabellones) y puertas de acceso.'},
          {type:'list', items:[
            'Nombre del recinto',
            'Ciudad y dirección',
            'Halls separados por comas (1, 2, 3, 4)',
            'Puertas (Norte, Sur, Este, Oeste)'
          ]},
          {type:'highlight', text:'⚠ Los halls que pongas aquí aparecerán como sugerencias al crear referencias.'},
          {type:'action', label:'Crear recinto', target:'recintos'}
        ]
      },
      {
        id:'evento_nuevo', title:'Crear un evento',
        content: [
          {type:'p', text:'Un evento es una feria concreta que ocurre en un recinto. Ej: "MWC 2026" en FIRA Barcelona Gran Via.'},
          {type:'list', items:[
            'Asocia el evento al recinto',
            'Fija fechas inicio y fin',
            'Pon previsión de vehículos esperados (para forecast)',
            'Marca como Activo para que aparezca en los filtros por defecto'
          ]},
          {type:'highlight', text:'🆕 Puedes tener varios eventos activos a la vez ahora.'},
          {type:'action', label:'Crear evento', target:'eventos'}
        ]
      }
    ]
  },
  {
    id:'referencias', title:'Referencias e Ingresos', icon:'🚛',
    lessons: [
      {
        id:'diferencia', title:'Referencias vs Ingresos',
        content: [
          {type:'h', text:'Dos módulos, dos finalidades distintas'},
          {type:'p', text:'REFERENCIAS = vehículos con booking previo (camiones grandes que deben llevar nº referencia obligatorio). Posición persiste por evento.'},
          {type:'p', text:'INGRESOS = vehículos sin reserva previa (furgonetas, autos pequeños). Posición reinicia cada día.'},
          {type:'highlight', text:'💡 Una misma matrícula puede tener varias referencias el mismo día (un camión que viene varias veces para distintos expositores).'}
        ]
      },
      {
        id:'autocompletado', title:'Autocompletado mágico',
        content: [
          {type:'p', text:'Al crear una referencia o ingreso, el sistema busca automáticamente en cascada:'},
          {type:'list', items:[
            'Matrícula → busca en Flota → autollena conductor, empresa, remolque',
            'Referencia → busca en Agenda → absorbe matrícula, hall, hora prevista',
            'Conductor → busca en Conductores → autollena teléfono, DNI, idiomas',
            'Empresa → busca en Empresas → autollena nivel + bloqueo si está bloqueada'
          ]},
          {type:'highlight', text:'🔄 Al absorber una cita de Agenda, esta queda marcada como "llegado" automáticamente.'},
          {type:'action', label:'Probar en Referencias', target:'referencias'}
        ]
      },
      {
        id:'ocr', title:'Escanear matrícula con cámara',
        content: [
          {type:'p', text:'Al lado del campo Matrícula hay un botón 📸. Pulsalo para abrir la cámara y reconocer la matrícula automáticamente.'},
          {type:'list', items:[
            'Motor por defecto: Tesseract (local, sin internet, gratis)',
            'Opcional Gemini (Google AI, gratis con API key)',
            'Opcional OCR.space (de pago)'
          ]},
          {type:'highlight', text:'⚠ El navegador pedirá permiso para usar la cámara. Si lo deniegas, deberás activarlo en ajustes del sitio.'}
        ]
      },
      {
        id:'historial', title:'Historial e Incidencias',
        content: [
          {type:'p', text:'En cada fila de Referencias hay un botón 📋. Te muestra:'},
          {type:'list', items:[
            'Historial de cambios del registro (quién y cuándo lo editó)',
            'Incidencias registradas (cambio de camión, conductor, fecha, etc.)',
            'Botón para registrar una nueva incidencia con motivo'
          ]},
          {type:'highlight', text:'📊 Todo queda en auditoría — útil para reclamaciones o investigaciones.'}
        ]
      }
    ]
  },
  {
    id:'agenda', title:'Agenda y Planificación', icon:'📅',
    lessons: [
      {
        id:'agenda_uso', title:'Planificar citas',
        content: [
          {type:'p', text:'En Agenda puedes planificar la llegada de vehículos antes de que ocurra. Cuando uno llega, marcas "Llegado" y se calcula la diferencia entre hora prevista vs real.'},
          {type:'list', items:[
            'Hora planificada vs hora real → ves desfases en minutos',
            'Filtros por estado (planificado, llegado, finalizado)',
            'Al absorber una agenda desde Referencias, queda marcada como llegado'
          ]},
          {type:'action', label:'Abrir Agenda', target:'agenda'}
        ]
      }
    ]
  },
  {
    id:'maestros', title:'Bases maestras', icon:'📚',
    lessons: [
      {
        id:'empresas', title:'Empresas y Preregistros',
        content: [
          {type:'p', text:'En Empresas tienes dos sub-pestañas:'},
          {type:'list', items:[
            'Empresas → base de empresas con CIF, contacto y nivel (estándar/verificada/bloqueada)',
            'Preregistros → empresas que se registraron por el portal público y esperan aprobación'
          ]},
          {type:'highlight', text:'⚠ Si marcas una empresa como BLOQUEADA, no podrá registrar accesos ni imprimir pases.'},
          {type:'action', label:'Abrir Empresas', target:'empresas'}
        ]
      },
      {
        id:'conductores', title:'Conductores',
        content: [
          {type:'p', text:'Base de conductores con DNI, teléfono, idiomas y matrículas habituales.'},
          {type:'highlight', text:'🌍 Los idiomas se usan para imprimir el pase en el idioma del conductor automáticamente.'},
          {type:'action', label:'Abrir Conductores', target:'conductores'}
        ]
      },
      {
        id:'flota', title:'Flota',
        content: [
          {type:'p', text:'Base de vehículos asociados a empresas. Incluye:'},
          {type:'list', items:[
            'Matrícula y remolque',
            'Marca, modelo, tipo (camión, trailer, furgoneta)',
            'Tipo de carga (refrigerada, peligrosa, etc.)',
            'Estado (almacén / en ruta)',
            'Nº tacógrafo'
          ]},
          {type:'action', label:'Abrir Flota', target:'flota'}
        ]
      }
    ]
  },
  {
    id:'impresion', title:'Motor de Impresión', icon:'🖨',
    lessons: [
      {
        id:'imp_intro', title:'Crear tu primera plantilla',
        content: [
          {type:'p', text:'El motor de impresión te permite diseñar el pase visualmente. Tres columnas:'},
          {type:'list', items:[
            'Izquierda: lista de registros (demo o reales)',
            'Centro: canvas donde arrastras los campos',
            'Derecha: tabs Campos/Editar/Config'
          ]},
          {type:'highlight', text:'🏭 Vienen 3 plantillas de fábrica para empezar: Pase básico, Pase camión grande, Etiqueta troquel.'},
          {type:'action', label:'Abrir Impresión', target:'impresion'}
        ]
      },
      {
        id:'imp_drag', title:'Diseñar el pase',
        content: [
          {type:'p', text:'Arrastra campos desde la columna derecha al canvas:'},
          {type:'list', items:[
            'Matrícula, conductor, empresa, posición, hall, stand…',
            'QR, código de barras, código de seguridad',
            'Logo empresa, datos del recinto, marca de agua'
          ]},
          {type:'highlight', text:'🎯 Snap-to-grid activado por defecto. Los campos se alinean a una rejilla de 5%.'}
        ]
      },
      {
        id:'imp_editar', title:'Editar campos',
        content: [
          {type:'p', text:'Click en un campo del canvas para editarlo. Puedes cambiar:'},
          {type:'list', items:[
            'Tamaño de fuente (8-120px)',
            'Negrita y resaltado ámbar',
            'Color de texto (selector completo)',
            'Rotación: 0°, 90°, 180°, 270°',
            'Posición X/Y exacta en porcentaje',
            'Condición: mostrar solo si... (ej: solo si nivel=verificada)'
          ]}
        ]
      },
      {
        id:'imp_config', title:'Configuración avanzada',
        content: [
          {type:'p', text:'En la pestaña Config tienes:'},
          {type:'list', items:[
            'Tamaño papel (A4/A5/A6/sticker) y orientación',
            'Múltiples pases por hoja (1/2/4) para ahorrar papel',
            'Modo troquel con línea de corte (no se imprime)',
            'Marca de agua personalizable (COPIA/ORIGINAL/etc.)',
            'Caducidad del pase en horas',
            'Auto-selección de plantilla por tipo de vehículo',
            'Imagen de fondo guía (no se imprime, solo diseño)'
          ]}
        ]
      },
      {
        id:'imp_batch', title:'Imprimir batch',
        content: [
          {type:'p', text:'Puedes imprimir TODOS los registros del evento con un solo click usando el botón "🖨 Batch":'},
          {type:'list', items:[
            'Genera N páginas, una por registro',
            'Salta automáticamente empresas bloqueadas',
            'Te muestra cuántos se imprimieron y cuántos se saltaron'
          ]}
        ]
      },
      {
        id:'imp_export', title:'Exportar/Importar plantillas',
        content: [
          {type:'p', text:'Las plantillas se pueden:'},
          {type:'list', items:[
            'Guardar en Firebase por evento (📤 Guardar)',
            'Exportar como JSON para compartir con otros (📤)',
            'Importar desde JSON de otro proyecto (📥)'
          ]},
          {type:'highlight', text:'💡 Esto te permite tener plantillas tipo y reutilizarlas entre eventos.'}
        ]
      }
    ]
  },
  {
    id:'usuarios', title:'Usuarios y Permisos', icon:'👥',
    lessons: [
      {
        id:'roles', title:'Los 6 roles',
        content: [
          {type:'p', text:'BeUnifyT tiene 6 roles preconfigurados:'},
          {type:'list', items:[
            'Administrador: acceso total + matriz permisos',
            'Supervisor: 12 módulos, puede crear/editar/eliminar',
            'Controlador Rampa: foco operativo (refs, ingresos, agenda)',
            'Operario: solo crear/editar, no eliminar',
            'Visor: solo lectura',
            'Usuario: solo dashboard + mensajes'
          ]},
          {type:'highlight', text:'⚙ Solo el admin puede cambiar roles y permisos.'}
        ]
      },
      {
        id:'invitar', title:'Invitar a un usuario nuevo',
        content: [
          {type:'p', text:'Como admin, ve a Usuarios → Crear invitación. Pones el email + rol. El sistema genera un código de 6 caracteres válido 7 días.'},
          {type:'p', text:'Compartes el link con el invitado. Cuando se registra con ese link, queda automáticamente con el rol y estado activo.'}
        ]
      }
    ]
  },
  {
    id:'avanzado', title:'Características avanzadas', icon:'⚡',
    lessons: [
      {
        id:'panel_logs', title:'Panel de logs',
        content: [
          {type:'p', text:'Pulsa Ctrl+Shift+L (Cmd+Shift+L en Mac) para abrir el panel inferior con todos los eventos del sistema.'},
          {type:'list', items:[
            'Niveles: DEBUG / INFO / OK / WARN / ERROR / FATAL',
            'Cada error trae archivo, línea y función',
            'Botón Exportar para enviar JSON al admin'
          ]},
          {type:'highlight', text:'💡 Si algo no funciona, abre este panel y exporta el JSON.'}
        ]
      },
      {
        id:'papelera', title:'Papelera con restauración',
        content: [
          {type:'p', text:'Cuando borras algo, NO se elimina permanente. Va a la Papelera. Desde allí puedes:'},
          {type:'list', items:[
            'Restaurar el registro a su estado original',
            'Eliminar permanentemente (con confirmación)',
            'Ver quién lo borró y cuándo'
          ]},
          {type:'action', label:'Abrir Papelera', target:'papelera'}
        ]
      },
      {
        id:'excel', title:'Importar/Exportar Excel',
        content: [
          {type:'p', text:'En referencias, ingresos, agenda, flota, conductores y empresas tienes 3 botones:'},
          {type:'list', items:[
            '📤 Exportar: descarga un .xlsx con todos los registros',
            '📋 Plantilla: descarga un .xlsx vacío con cabeceras + ejemplo',
            '📥 Importar: lee un .xlsx y crea registros con detección de duplicados'
          ]}
        ]
      },
      {
        id:'tutorial', title:'Has terminado el curso',
        content: [
          {type:'h', text:'🎉 ¡Felicidades!'},
          {type:'p', text:'Ya conoces todas las funciones principales de BeUnifyT. Puedes volver aquí cuando quieras para repasar.'},
          {type:'highlight', text:'💬 Si tienes dudas o necesitas ayuda, contacta al administrador.'}
        ]
      }
    ]
  }
];

export async function init(container){
  _container = container;
  // Cargar progreso
  const progress = loadProgress();
  if(progress){
    _activeChapter = progress.chapter || 0;
    _activeLesson = progress.lesson || 0;
  }
  render();
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  saveProgress();
  _container = null;
}

function loadProgress(){
  const p = getCurrentProfile();
  try{
    const raw = localStorage.getItem(PROGRESS_KEY + '_' + (p?.id || 'anon'));
    return raw ? JSON.parse(raw) : null;
  } catch(_){return null;}
}

function saveProgress(){
  const p = getCurrentProfile();
  try{
    localStorage.setItem(PROGRESS_KEY + '_' + (p?.id || 'anon'), JSON.stringify({
      chapter: _activeChapter, lesson: _activeLesson,
      completed: getCompletedLessons()
    }));
  } catch(_){}
}

function getCompletedLessons(){
  // Considera completadas todas las lecciones anteriores a la actual
  let count = 0;
  for(let c = 0; c < _activeChapter; c++){
    count += CURSO[c].lessons.length;
  }
  return count + _activeLesson;
}

function totalLessons(){
  return CURSO.reduce((sum, c) => sum + c.lessons.length, 0);
}

function render(){
  if(!_container) return;
  clear(_container);

  const total = totalLessons();
  const done = getCompletedLessons();
  const pct = total ? Math.round((done / total) * 100) : 0;

  _container.appendChild(pageHeader({
    title:'🎓 Curso interactivo BeUnifyT',
    sub: `Progreso: ${done}/${total} lecciones · ${pct}%`
  }));

  // Barra progreso
  const bar = el('div', {style:{
    height:'6px', background:'var(--surface-2)',
    borderRadius:'3px', marginBottom:'24px', overflow:'hidden'
  }},
    el('div', {style:{
      height:'100%', width: pct+'%',
      background:'var(--primary)', transition:'width 0.3s'
    }})
  );
  _container.appendChild(bar);

  // Layout 2 columnas: índice + contenido
  const layout = el('div', {style:{
    display:'grid', gridTemplateColumns:'280px 1fr', gap:'24px',
    minHeight:'500px'
  }});
  layout.appendChild(renderIndex());
  layout.appendChild(renderContent());
  _container.appendChild(layout);
}

function renderIndex(){
  const wrap = el('div', {class:'panel', style:{padding:'12px', height:'fit-content'}});
  wrap.appendChild(el('h3', {style:{margin:'0 0 12px', fontSize:'14px', textTransform:'uppercase', color:'var(--text-3)'}}, 'Capítulos'));

  CURSO.forEach((cap, ci) => {
    const isActiveCap = ci === _activeChapter;
    const capWrap = el('div', {style:{marginBottom:'8px'}});
    capWrap.appendChild(el('div', {
      class:'sb-item',
      style:{
        cursor:'pointer', padding:'8px 10px',
        background: isActiveCap ? 'var(--primary-soft)' : 'transparent',
        color: isActiveCap ? 'var(--primary)' : 'var(--text-2)',
        borderRadius:'8px', fontSize:'13px', fontWeight:'500',
        display:'flex', alignItems:'center', gap:'8px'
      },
      onclick: () => {
        _activeChapter = ci;
        _activeLesson = 0;
        render();
      }
    },
      el('span', {style:{fontSize:'16px'}}, cap.icon),
      el('span', {}, cap.title)
    ));

    if(isActiveCap){
      cap.lessons.forEach((l, li) => {
        const isActiveLesson = li === _activeLesson;
        capWrap.appendChild(el('div', {
          style:{
            padding:'6px 10px 6px 30px',
            cursor:'pointer', fontSize:'12px',
            color: isActiveLesson ? 'var(--primary)' : 'var(--text-3)',
            background: isActiveLesson ? 'var(--surface-2)' : 'transparent',
            borderRadius:'6px', marginTop:'2px'
          },
          onclick: () => {
            _activeLesson = li;
            render();
            saveProgress();
          }
        }, `${li+1}. ${l.title}`));
      });
    }
  });

  // Reiniciar progreso
  wrap.appendChild(el('button', {
    class:'btn btn-ghost btn-sm w-full',
    style:{marginTop:'12px', fontSize:'11px'},
    onclick: () => {
      _activeChapter = 0; _activeLesson = 0;
      saveProgress();
      render();
      toast('Curso reiniciado', 'ok');
    }
  }, '↻ Reiniciar curso'));

  return wrap;
}

function renderContent(){
  const wrap = el('div', {class:'panel', style:{padding:'24px', display:'flex', flexDirection:'column'}});
  const cap = CURSO[_activeChapter];
  if(!cap){return wrap;}
  const lesson = cap.lessons[_activeLesson];
  if(!lesson){return wrap;}

  // Breadcrumb
  wrap.appendChild(el('div', {class:'cell-mute', style:{fontSize:'12px', marginBottom:'8px'}},
    `${cap.icon} ${cap.title} → Lección ${_activeLesson + 1}`));

  wrap.appendChild(el('h2', {style:{margin:'0 0 18px', fontSize:'22px', fontWeight:'700'}}, lesson.title));

  // Contenido
  const body = el('div', {style:{flex:1}});
  for(const block of lesson.content){
    if(block.type === 'h'){
      body.appendChild(el('h3', {style:{fontSize:'18px', margin:'14px 0 8px'}}, block.text));
    } else if(block.type === 'p'){
      body.appendChild(el('p', {style:{fontSize:'14px', lineHeight:'1.7', color:'var(--text-2)', margin:'0 0 12px'}}, block.text));
    } else if(block.type === 'list'){
      const ul = el('ul', {style:{margin:'0 0 12px', paddingLeft:'20px'}});
      for(const item of block.items){
        ul.appendChild(el('li', {style:{fontSize:'14px', lineHeight:'1.7', color:'var(--text-2)', marginBottom:'4px'}}, item));
      }
      body.appendChild(ul);
    } else if(block.type === 'highlight'){
      body.appendChild(el('div', {
        style:{
          padding:'12px 16px',
          background:'var(--primary-soft)',
          color:'var(--primary-soft-text)',
          borderLeft:'4px solid var(--primary)',
          borderRadius:'0 8px 8px 0',
          margin:'12px 0', fontSize:'14px'
        }
      }, block.text));
    } else if(block.type === 'action'){
      body.appendChild(el('button', {
        class:'btn btn-secondary btn-sm',
        style:{margin:'8px 8px 0 0'},
        onclick: () => {
          if(block.target) navigate(block.target);
        }
      }, `→ ${block.label}`));
    }
  }
  wrap.appendChild(body);

  // Navegación lecciones
  const nav = el('div', {style:{display:'flex', gap:'8px', marginTop:'24px', paddingTop:'16px', borderTop:'1px solid var(--border)'}});

  const canPrev = !(_activeChapter === 0 && _activeLesson === 0);
  const canNext = !(_activeChapter === CURSO.length - 1 && _activeLesson === cap.lessons.length - 1);

  if(canPrev){
    nav.appendChild(el('button', {
      class:'btn btn-secondary',
      onclick: () => {
        if(_activeLesson > 0){
          _activeLesson--;
        } else {
          _activeChapter--;
          _activeLesson = CURSO[_activeChapter].lessons.length - 1;
        }
        saveProgress();
        render();
      }
    }, '← Anterior'));
  }

  nav.appendChild(el('div', {class:'flex-1'}));

  if(canNext){
    nav.appendChild(el('button', {
      class:'btn btn-primary',
      onclick: () => {
        if(_activeLesson < cap.lessons.length - 1){
          _activeLesson++;
        } else {
          _activeChapter++;
          _activeLesson = 0;
        }
        saveProgress();
        render();
      }
    }, 'Siguiente →'));
  } else {
    nav.appendChild(el('button', {
      class:'btn btn-primary',
      onclick: () => {
        toast('🎉 ¡Curso completado!', 'ok', 4000);
        saveProgress();
      }
    }, '🏆 Completar curso'));
  }

  wrap.appendChild(nav);
  return wrap;
}
