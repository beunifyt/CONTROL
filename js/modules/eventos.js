// eventos.js — gestión de eventos
import { el, clear, icon, toast, openModal, closeModal, confirmModal, formField, getFormData, fmtDate } from '../utils.js';
import { listLive, list, create, update, remove, unregisterListenersByPrefix } from '../db.js';
import { pageHeader, emptyState } from './shared.js';
import { canCreate, canEdit, canDelete } from '../roles.js';
import { getCurrentProfile } from '../auth.js';

let _container = null;
let _items = [];
let _recintos = [];
const KEY_PREFIX = 'mod:eventos:';

export async function init(container){
  _container = container;
  _recintos = await list('recintos', { orderBy:'nombre' });
  render();
  listLive('eventos', { key: KEY_PREFIX+'all', orderBy:'createdAt', order:'desc' }, (items) => {
    _items = items;
    render();
  });
}

export function destroy(){
  unregisterListenersByPrefix(KEY_PREFIX);
  _container = null;
}

function render(){
  if(!_container) return;
  clear(_container);
  const p = getCurrentProfile();

  const actions = [];
  if(canCreate(p)){
    actions.push(el('button', {
      class:'btn btn-primary',
      onclick: () => openForm(null)
    }, el('span', { html: icon('plus') }), 'Nuevo Evento'));
  }

  _container.appendChild(pageHeader({
    title:'Eventos',
    sub:'Ferias y eventos vinculados a recintos',
    actions
  }));

  if(_items.length === 0){
    _container.appendChild(emptyState({
      iconName:'eventos',
      title:'Sin eventos',
      message:'Crea tu primer evento para empezar a registrar referencias e ingresos.'
    }));
    return;
  }

  const cards = el('div', { class:'cards-grid' });
  const profile = getCurrentProfile();
  const favEventoId = profile?.favEventoId || null;
  for(const ev of _items){
    const recinto = _recintos.find(r => r.id === ev.recintoId);
    const isActive = ev.estado === 'activo';
    const isFav = ev.id === favEventoId;
    const card = el('div', { class:`entity-card ${isFav ? 'is-fav' : ''}` },
      el('div', { class:'entity-card-head' },
        el('div', {},
          el('h3', { class:'entity-card-title' },
            isFav ? el('span', { title:'Evento favorito', style:{color:'#F59E0B', marginRight:'6px'} }, '★') : null,
            ev.nombre || '—'
          ),
          el('div', { class:'entity-card-sub' }, recinto?.nombre || '—')
        ),
        // Toggle Activo/Inactivo clicable directo en la card
        canEdit(p) ? el('span', {
          class:`event-card-toggle ${isActive ? 'active' : 'inactive'}`,
          title: isActive ? 'Click para desactivar' : 'Click para activar',
          onclick: e => { e.stopPropagation(); toggleActivo(ev); }
        },
          el('span', {}, isActive ? '●' : '○'),
          el('span', {}, isActive ? 'Activo' : ev.estado === 'finalizado' ? 'Finalizado' : ev.estado === 'cancelado' ? 'Cancelado' : 'Inactivo')
        ) : el('span', { class:`badge badge-${isActive ? 'green' : 'gray'}` },
          isActive ? 'Activo' : 'Inactivo')
      ),
      el('div', { class:'cell-mute' },
        ev.fechaInicio ? `${fmtDate(ev.fechaInicio)} → ${fmtDate(ev.fechaFin) || '—'}` : 'Sin fechas'),
      ev.previsionVehiculos ? el('div', { class:'cell-mute' }, `Previsión: ${ev.previsionVehiculos} vehículos`) : null,
      el('div', { class:'entity-card-foot' },
        // Botón favorito
        el('button', {
          class: `btn btn-sm ${isFav ? 'btn-primary' : 'btn-ghost'}`,
          title: isFav ? 'Quitar de favorito' : 'Marcar como favorito (filtra por este evento por defecto)',
          onclick: () => toggleFav(ev)
        }, isFav ? '★ Favorito' : '☆ Marcar'),
        canEdit(p) ? el('button', { class:'btn btn-secondary btn-sm', onclick: () => openForm(ev) },
          el('span', { html: icon('edit') })
        ) : null,
        canDelete(p) ? el('button', { class:'btn btn-danger btn-sm', onclick: () => deleteItem(ev) },
          el('span', { html: icon('trash') })
        ) : null
      )
    );
    cards.appendChild(card);
  }
  _container.appendChild(cards);
}

async function toggleFav(ev){
  const profile = getCurrentProfile();
  if(!profile) return;
  try{
    const newFav = profile.favEventoId === ev.id ? null : ev.id;
    await update('users', profile.id, { favEventoId: newFav });
    profile.favEventoId = newFav; // actualiza local
    toast(newFav ? `★ ${ev.nombre} marcado como favorito` : 'Favorito quitado', 'ok');
    render();
  } catch(e){
    toast('No se pudo actualizar favorito', 'err');
  }
}

async function toggleActivo(ev){
  try{
    // Bloque D: múltiples eventos activos a la vez permitidos
    await update('eventos', ev.id, {
      estado: ev.estado === 'activo' ? 'planificado' : 'activo'
    });
  } catch(e){ toast(e.message, 'err'); }
}

function openForm(item){
  const isEdit = !!item;
  const data = item || { nombre:'', recintoId:'', fechaInicio:'', fechaFin:'', estado:'planificado', previsionVehiculos:0, descripcion:'', camposActivos:{} };

  // Catálogo de campos opcionales por evento
  const FIELDS_CATALOG = [
    {id:'remolque', label:'Remolque'},
    {id:'tipoVehiculo', label:'Tipo vehículo'},
    {id:'tipoCarga', label:'Tipo carga'},
    {id:'puerta', label:'Puerta'},
    {id:'horaPlanificada', label:'Hora planificada'},
    {id:'horaEntrada', label:'Hora entrada'},
    {id:'horaSalida', label:'Hora salida'},
    {id:'tacografo', label:'Tacógrafo'},
    {id:'pesoCarga', label:'Peso carga'},
    {id:'volumen', label:'Volumen'},
    {id:'codigoSeguridad', label:'Cód. seguridad'},
    {id:'idiomaConductor', label:'Idioma conductor'},
    {id:'observaciones', label:'Observaciones'},
    {id:'origenCiudad', label:'Origen (ciudad)'},
    {id:'destinoStand', label:'Destino stand'},
    {id:'numAcompanantes', label:'Nº acompañantes'},
    {id:'rampaAsignada', label:'Rampa asignada'},
    {id:'documentacion', label:'Documentación'},
    {id:'seguro', label:'Nº póliza seguro'},
    {id:'placaTrailer', label:'Placa tráiler'},
    {id:'kmRecorridos', label:'Km recorridos'},
    {id:'horasViaje', label:'Horas de viaje'}
  ];

  const camposActivos = {...(data.camposActivos || {})};

  const form = el('form', { onsubmit: async (e) => {
    e.preventDefault();
    const fd = getFormData(e.target);
    try{
      const payload = {
        nombre: fd.nombre,
        recintoId: fd.recintoId || null,
        fechaInicio: fd.fechaInicio ? new Date(fd.fechaInicio) : null,
        fechaFin: fd.fechaFin ? new Date(fd.fechaFin) : null,
        estado: fd.estado || 'planificado',
        previsionVehiculos: Number(fd.previsionVehiculos) || 0,
        descripcion: fd.descripcion || '',
        tipoReferencia: fd.tipoReferencia || 'unica',
        permiteHerenciaPasaporte: !!fd.permiteHerenciaPasaporte,
        permiteAbsorberHistorial: !!fd.permiteAbsorberHistorial,
        camposActivos
      };
      if(isEdit) await update('eventos', item.id, payload);
      else await create('eventos', payload);
      toast('Guardado', 'ok');
      closeModal();
    } catch(e){
      toast(e.message || 'Error', 'err');
    }
  }});

  const recintoOpts = [{ value:'', label:'Seleccionar recinto' }, ..._recintos.map(r => ({ value:r.id, label:r.nombre }))];
  const fechaInicioStr = data.fechaInicio ? (data.fechaInicio.toDate ? data.fechaInicio.toDate() : new Date(data.fechaInicio)).toISOString().slice(0,10) : '';
  const fechaFinStr = data.fechaFin ? (data.fechaFin.toDate ? data.fechaFin.toDate() : new Date(data.fechaFin)).toISOString().slice(0,10) : '';

  const grid = el('div', { class:'form-grid' });
  grid.appendChild(formField({ label:'Nombre', name:'nombre', value:data.nombre, required:true, full:true }));
  grid.appendChild(formField({ label:'Recinto', name:'recintoId', value:data.recintoId, options: recintoOpts, full:true }));
  grid.appendChild(formField({ label:'Fecha inicio', name:'fechaInicio', type:'date', value: fechaInicioStr }));
  grid.appendChild(formField({ label:'Fecha fin', name:'fechaFin', type:'date', value: fechaFinStr }));
  grid.appendChild(formField({ label:'Estado', name:'estado', value:data.estado, options:[
    { value:'planificado', label:'Planificado' },
    { value:'activo', label:'Activo' },
    { value:'finalizado', label:'Finalizado' },
    { value:'cancelado', label:'Cancelado' }
  ]}));
  grid.appendChild(formField({ label:'Previsión vehículos', name:'previsionVehiculos', type:'number', value:data.previsionVehiculos }));
  grid.appendChild(formField({ label:'Tipo de referencia', name:'tipoReferencia', value:data.tipoReferencia || 'unica', options:[
    { value:'unica', label:'Única (absorbe datos desde agenda)' },
    { value:'dividida', label:'Dividida (no absorbe, solo guarda código corto)' },
    { value:'sin_referencia', label:'Sin referencia (ingresos libres)' }
  ], full:true }));
  // Checkboxes flags
  const chkPasaporte = el('div', { class:'field field-full' },
    el('label', { class:'field-label', style:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'} },
      el('input', { type:'checkbox', name:'permiteHerenciaPasaporte', checked: data.permiteHerenciaPasaporte ? 'checked' : null }),
      el('span', {}, 'Permite heredar pasaporte/DNI del histórico')
    )
  );
  const chkHistorial = el('div', { class:'field field-full' },
    el('label', { class:'field-label', style:{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer'} },
      el('input', { type:'checkbox', name:'permiteAbsorberHistorial', checked: data.permiteAbsorberHistorial ? 'checked' : null }),
      el('span', {}, 'Permite absorber datos extra del histórico (hall, stand, remolque)')
    )
  );
  grid.appendChild(chkPasaporte);
  grid.appendChild(chkHistorial);
  grid.appendChild(formField({ label:'Descripción', name:'descripcion', value:data.descripcion, type:'textarea', full:true }));
  form.appendChild(grid);

  // Campos opcionales por evento (20+)
  form.appendChild(el('h4', {style:{margin:'18px 0 8px', fontSize:'13px', textTransform:'uppercase', color:'var(--text-3)'}},
    'Campos opcionales activos en este evento'));
  form.appendChild(el('p', {class:'cell-mute', style:{fontSize:'12px', marginTop:0}},
    'Marca qué campos extra aparecerán en los formularios de referencias/ingresos.'));
  const camposGrid = el('div', {style:{
    display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',
    gap:'6px', marginTop:'8px'
  }});
  for(const f of FIELDS_CATALOG){
    const isActive = camposActivos[f.id];
    const chip = el('label', {
      style:{
        display:'flex', alignItems:'center', gap:'8px',
        padding:'6px 10px', cursor:'pointer',
        background: isActive ? 'var(--primary-soft)' : 'var(--surface-2)',
        color: isActive ? 'var(--primary)' : 'var(--text-2)',
        borderRadius:'6px', fontSize:'12px'
      }
    },
      el('input', {
        type:'checkbox',
        checked: isActive ? 'checked' : null,
        onchange: e => {
          camposActivos[f.id] = e.target.checked;
          chip.style.background = e.target.checked ? 'var(--primary-soft)' : 'var(--surface-2)';
          chip.style.color = e.target.checked ? 'var(--primary)' : 'var(--text-2)';
        }
      }),
      el('span', {}, f.label)
    );
    camposGrid.appendChild(chip);
  }
  form.appendChild(camposGrid);

  const footer = el('div', { class:'modal-foot' },
    el('button', { type:'button', class:'btn btn-secondary', onclick: closeModal }, 'Cancelar'),
    el('button', { type:'submit', class:'btn btn-primary', onclick: () => form.requestSubmit() }, 'Guardar')
  );

  openModal({
    title: isEdit ? 'Editar evento' : 'Nuevo evento',
    body: form,
    size:'lg'
  });

  setTimeout(() => form.parentElement.appendChild(footer), 60);
}

async function deleteItem(item){
  const ok = await confirmModal({
    title: 'Eliminar evento',
    message: `¿Eliminar "${item.nombre}"? Las referencias y ingresos asociados quedarán sin evento.`,
    danger: true, okText: 'Eliminar'
  });
  if(!ok) return;
  try{
    await remove('eventos', item.id);
    toast('Eliminado', 'ok');
  } catch(e){ toast(e.message, 'err'); }
}
