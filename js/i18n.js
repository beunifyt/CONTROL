// i18n.js
export const LANGS = [
  { code:'es', name:'🇪🇸 Español' },
  { code:'en', name:'🇬🇧 English' },
  { code:'fr', name:'🇫🇷 Français' },
  { code:'de', name:'🇩🇪 Deutsch' },
  { code:'pl', name:'🇵🇱 Polski' },
  { code:'ro', name:'🇷🇴 Română' },
  { code:'ca', name:'🇪🇸 Català' },
  { code:'it', name:'🇮🇹 Italiano' },
  { code:'pt', name:'🇵🇹 Português' }
];

export const T = {
  es: {
    dashboard:'Dashboard', recintos:'Recintos', eventos:'Eventos',
    referencias:'Referencias', ingresos:'Ingresos', agenda:'Agenda',
    conductores:'Conductores', empresas:'Empresas', flota:'Flota',
    analytics:'Analytics', mensajes:'Mensajes', impresion:'Impresión',
    usuarios:'Usuarios',
    save:'Guardar', cancel:'Cancelar', delete:'Eliminar', edit:'Editar',
    confirm:'Confirmar', close:'Cerrar', search:'Buscar', add:'Añadir',
    new:'Nuevo', back:'Volver', next:'Siguiente', loading:'Cargando…',
    plate:'Matrícula', driver:'Conductor', company:'Empresa',
    hall:'Hall', stand:'Stand', position:'Posición', reference:'Referencia',
    entry:'Entrada', leave:'Salida', date:'Fecha', time:'Hora',
    notes:'Notas', email:'Email', phone:'Teléfono', name:'Nombre',
    role:'Rol', actions:'Acciones', status:'Estado', event:'Evento',
    venue:'Recinto', vehicleType:'Tipo vehículo', trailer:'Remolque',
    admin:'Administrador', supervisor:'Supervisor', operario:'Operario', user:'Usuario',
    noData:'Sin datos', noResults:'Sin resultados',
    confirmDelete:'¿Eliminar este registro?',
    saved:'Guardado', deleted:'Eliminado', error:'Error',
    login:'Iniciar sesión', signOut:'Cerrar sesión',
    loginGoogle:'Continuar con Google',
    loginEmail:'Email', loginPass:'Contraseña',
    loginNoAccount:'¿No tienes cuenta?', loginSignUp:'Crear cuenta',
    loginHaveAccount:'¿Ya tienes cuenta?', loginSignIn:'Iniciar sesión',
    inviteCode:'Código de invitación',
    inviteHint:'Si tienes un código de invitación, introdúcelo abajo'
  },
  en: {
    dashboard:'Dashboard', recintos:'Venues', eventos:'Events',
    referencias:'References', ingresos:'Entries', agenda:'Schedule',
    conductores:'Drivers', empresas:'Companies', flota:'Fleet',
    analytics:'Analytics', mensajes:'Messages', impresion:'Print',
    usuarios:'Users',
    save:'Save', cancel:'Cancel', delete:'Delete', edit:'Edit',
    confirm:'Confirm', close:'Close', search:'Search', add:'Add',
    new:'New', back:'Back', next:'Next', loading:'Loading…',
    plate:'Plate', driver:'Driver', company:'Company',
    hall:'Hall', stand:'Stand', position:'Position', reference:'Reference',
    entry:'Entry', leave:'Exit', date:'Date', time:'Time',
    notes:'Notes', email:'Email', phone:'Phone', name:'Name',
    role:'Role', actions:'Actions', status:'Status', event:'Event',
    venue:'Venue', vehicleType:'Vehicle type', trailer:'Trailer',
    admin:'Administrator', supervisor:'Supervisor', operario:'Operator', user:'User',
    noData:'No data', noResults:'No results',
    confirmDelete:'Delete this record?',
    saved:'Saved', deleted:'Deleted', error:'Error',
    login:'Sign in', signOut:'Sign out',
    loginGoogle:'Continue with Google',
    loginEmail:'Email', loginPass:'Password',
    loginNoAccount:'No account?', loginSignUp:'Create account',
    loginHaveAccount:'Have an account?', loginSignIn:'Sign in',
    inviteCode:'Invitation code',
    inviteHint:'If you have an invite code, enter it below'
  }
};

let _lang = localStorage.getItem('beunifyt_lang') || 'es';

export function getLang(){ return _lang; }

export function setLang(code){
  if(!T[code]) return;
  _lang = code;
  localStorage.setItem('beunifyt_lang', code);
  document.documentElement.lang = code;
  document.dispatchEvent(new CustomEvent('lang-changed', { detail:{ lang: code } }));
}

export function tr(key, fallback=null){
  return T[_lang]?.[key] || T.es?.[key] || fallback || key;
}

document.documentElement.lang = _lang;
