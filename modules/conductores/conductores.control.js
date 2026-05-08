/* conductores — 10 funciones */

function renderConductores(){
  const tabEv=getTabEvent('conductores');
  if(!window._subRestored_conductores){window._subRestored_conductores=true;const _ls=_loadSubTab('conductores','lista');if(_ls)window._condSub=_ls;}const _cSub=window._condSub||'lista';
  const q=(cF.q||'').toLowerCase();
  let items=DB.conductores.filter(c=>!q||`${c.nombre||''} ${c.apellido||''} ${c.empresa||''} ${c.matricula||''} ${c.remolque||''} ${c.telefono||''} ${c.email||''} ${c.tipoVehiculo||''} ${c.hall||''} ${c.idioma||''}`.toLowerCase().includes(q));
  const sc=getSort('conductores');items=sortArr(items,sc.col||'nombre',sc.dir||'asc');
  document.getElementById('tab-conductores').innerHTML=`
    <div class="subtab-bar" style="display:flex;align-items:center;gap:3px;padding:4px 0;flex-wrap:nowrap;min-height:34px;border-bottom:1px solid var(--border);margin-bottom:4px;overflow-x:auto;scrollbar-width:none">
      <span data-zone="L" style="display:inline-flex;gap:3px;flex-shrink:0">
      ${[['lista',tr('tabLista')],['historial',tr('tabEdiciones')]].map(([s,l])=>`<button data-draggable data-zone="L" class="btn btn-sm ${_cSub===s?'btn-p':'btn-gh'}" style="flex-shrink:0" onclick="window._condSub='${s}';_saveSubTab('conductores','${s}');renderConductores()">${l}</button>`).join('')}
      </span>
      <span data-zone="M" style="display:inline-flex;gap:3px;flex-shrink:0">
      ${_cSub==='lista'&&canAdd()?`<button data-draggable data-zone="M" class="btn btn-sm btn-p" style="font-weight:700;flex-shrink:0" onclick="openCondModal()">${tr('btnNewDriver')}</button>`:''}
      </span>
      <div style="width:1px;height:20px;background:var(--border);flex-shrink:0;margin:0 4px"></div>
      <span data-zone="R" style="display:inline-flex;gap:3px;align-items:center;flex-shrink:0">
      ${[['columnas',tr('tabColumnas')],...(canCampos()?[['campos',tr('camposDise')]]:[])].map(([s,l])=>`<button data-draggable data-zone="R" class="btn btn-sm ${_cSub===s?'btn-p':'btn-gh'}" style="flex-shrink:0" onclick="window._condSub='${s}';_saveSubTab('conductores','${s}');renderConductores()">${l}</button>`).join('')}
      </span>
      <span style="flex:1"></span>
      ${_cSub==='lista'?`<button class="btn btn-s btn-sm" onclick="document.getElementById('xlsxCond').click()" title="Importar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button><button class="btn btn-gh btn-sm" onclick="downloadPlantillaCond()">📋 Plantilla</button>`:''}
      ${_cSub==='lista'&&canExport()?`<button class="btn btn-gh btn-sm" onclick="exportConductores()" title="Excel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>`:''}
      ${_cSub==='lista'&&canClean()?`<button class="btn btn-sm" style="color:var(--red)" title=tr('limpiar') onclick="if(!confirm('¿Limpiar conductores?'))return;cleanTab('conductores')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>`:''}
    </div>
    ${_cSub==='lista'?`<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none">
      <div class="sbox" style="flex:2;min-width:140px"><span class="sico">🔍</span><input type="search" placeholder="${tr('searchDriver')}" value="${cF.q||''}" oninput="cF.q=this.value;debounceSearch('conductores',renderConductores)"></div>
      ${cF.q?`<span class="pill pill-r" style="flex-shrink:0" onclick="cF={q:''};renderConductores()">✕</span>`:''}
    </div>`:''}
    ${_cSub==='campos'?renderCamposSubtab('conductores'):_cSub==='columnas'?renderColVisSub('conductores'):_cSub==='historial'?_ingHistorial('conductores'):items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr>${thSort('conductores','matricula','Matrícula')}${thSort('conductores','nombre','Nombre')}${_isColVisible('conductores','empresa')?thSort('conductores','empresa','Empresa'):''}${_isColVisible('conductores','telefono')?'<th>'+tr('telefono')+'</th>':''}${_isColVisible('conductores','hall')?thSort('conductores','hall','Hall'):''}${_isColVisible('conductores','idioma')?'<th>'+tr('thLanguage')+'</th>':''}${_isColVisible('conductores','eventos')?'<th>'+tr('eventos')+'</th>':''}${_isColVisible('conductores','ingresos')?'<th>'+tr('ingresos2')+'</th>':''}<th>${tr('acciones')}</th></tr></thead><tbody>
      ${items.map(c=>{const l=LANGS_UI.find(x=>x.code===(c.idioma||''));return`<tr>
        <td>${c.matricula?`<span class="mchip" style="cursor:pointer" onclick="showCondDetalle('${c.id}')">${c.matricula}</span>`:'-'}${c.remolque?`<br><span class="mchip-sm">${c.remolque}</span>`:''}</td>
        <td><b style="font-size:12px">${c.nombre} ${c.apellido}</b>${c.tipoVehiculo?`<br><span style="font-size:10px;color:var(--text3)">${TV[c.tipoVehiculo]||c.tipoVehiculo}</span>`:''}</td>
        ${_isColVisible('conductores','empresa')?`<td style="font-size:11px">${c.empresa||'–'}</td>`:''}
        ${_isColVisible('conductores','telefono')?`<td>${telLink(c.telPais||'',c.telefono||'')}</td>`:''}
        ${_isColVisible('conductores','hall')?`<td>${hBadge(c.hall)}</td>`:''}
        ${_isColVisible('conductores','idioma')?`<td style="font-size:14px" title="${l?.name||''}">${l?l.flag:'–'}</td>`:''}
        ${_isColVisible('conductores','eventos')?`<td style="font-size:10px;color:var(--text3)">${(c.eventosNombres||[]).join(', ')||'–'}</td>`:''}
        ${_isColVisible('conductores','ingresos')?`<td style="text-align:center;font-weight:800;color:#4a5568">${DB.ingresos.filter(i=>i.matricula===c.matricula).length}</td>`:''}
        <td><div style="display:flex;gap:2px">
          ${canEdit()?`<button class="btn btn-edit btn-xs" onclick="openCondModal(DB.conductores.find(x=>x.id==='${c.id}'))">✏️</button>`:''}
          ${canDel()?`<button class="btn btn-danger btn-xs" onclick="askDelCond('${c.id}')">🗑</button>`:''}
        </div></td>
      </tr>`;}).join('')}
    </tbody></table></div>`:`<div class="empty"><div class="ei">👤</div><div class="et">${DB.conductores.length?'Sin resultados':'Sin conductores'}</div></div>`}`;}

function searchChoferIng(q){const res=document.getElementById('fiChoferResults');if(!res)return;if(!q||q.length<2){res.classList.remove('open');return;}const ql=q.toLowerCase();const found=DB.conductores.filter(c=>`${c.nombre} ${c.apellido} ${c.matricula||''} ${c.empresa||''}`.toLowerCase().includes(ql)).slice(0,8);if(!found.length){res.classList.remove('open');return;}res.innerHTML=found.map(c=>`<div class="dr-item" onmousedown="fillChoferIng('${c.id}')">${c.nombre} ${c.apellido}${c.matricula?' · <b>'+c.matricula+'</b>':''} <span style="color:var(--text3)">${c.empresa||''}</span></div>`).join('');res.classList.add('open');}

function openCondModalFromIng(prefill){
  // Usar openCondModal con un objeto pseudo-conductor para prerellenar
  const tmp={...prefill,id:null};
  editCondId=null;
  document.getElementById('mCondTitle').textContent=tr('newDriver');
  document.getElementById('btnCondLbl').textContent=tr('saveDriver');
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  set('fcNom',tmp.nombre);set('fcApe',tmp.apellido);set('fcEmp',tmp.empresa);
  set('fcMat',tmp.matricula);set('fcRem',tmp.remolque);set('fcHall',tmp.hall);
  set('fcTelP',tmp.telPais||'+34');set('fcTel',tmp.telefono);set('fcEmail',tmp.email);
  set('fcTipoV',tmp.tipoVehiculo||'');
  set('fcPas',tmp.pasaporte);set('fcPais',tmp.pais);
  set('fcFechaNac',tmp.fechaNacimiento);set('fcFechaExp',tmp.fechaExpiracion);
  set('fcNotas',tmp.notas||'');
  fillIdiomaSelect();
  if(tmp.idioma)setTimeout(()=>{const el=document.getElementById('fcIdioma');if(el)el.value=tmp.idioma;},50);
  // Override saveCond to also update the tag after saving
  const _origSave=window._condSaveOverride;
  window._condSaveAfterFromIng=true;
  document.getElementById('mCond').classList.add('open');
  // Show toast hint
  toast('✏️ Revisa y completa los datos del conductor','#4a5568',4000);
}

function fillChoferIng(id){
  const c=DB.conductores.find(x=>x.id===id);if(!c)return;
  const set=(eid,v)=>{const el=document.getElementById(eid);if(el&&(v||v===0))el.value=v;};
  set('fiMat',c.matricula);set('fiRem',c.remolque);
  set('fiNom',c.nombre);set('fiApe',c.apellido);
  set('fiEmp',c.empresa);
  set('fiTelP',c.telPais||'+34');set('fiTel',c.telefono);
  set('fiEmail',c.email);
  set('fiPas',c.pasaporte);set('fiPais',c.pais);
  set('fiFechaNac',c.fechaNacimiento);set('fiFechaExp',c.fechaExpiracion);
  if(c.tipoVehiculo){document.getElementById('fiTipoVeh').value=c.tipoVehiculo;syncToggleButtons();}
  if(c.idioma&&document.getElementById('fiLang'))document.getElementById('fiLang').value=c.idioma;
  if(c.hall&&!_fiHalls.length){_fiHalls=[c.hall];renderHallTags();}
  const _fcs=document.getElementById('fiChoferSearch');if(_fcs)_fcs.value=c.nombre+' '+c.apellido;
  const _fcr=document.getElementById('fiChoferResults');if(_fcr)_fcr.classList.remove('open');
  updatePhrasePreview();
  const matVal=document.getElementById('fiMat')?.value||c.matricula;
  if(matVal)setMatTag('👤',c.nombre+' '+c.apellido,c.empresa,'chofer');
  toast('✅ Conductor autocompletado','var(--text2)');
}

function autoDetectMat(mat){
  if(!mat||mat.length<4)return;
  const matU=mat.toUpperCase();
  // Si dropdown está abierto y el usuario está interactuando, no forzar
  const res=document.getElementById('fiMatResults');
  if(res&&res.classList.contains('open'))return;
  // 1. Conductor exacto
  const cond=DB.conductores.find(c=>c.matricula===matU);
  if(cond){fillChoferIng(cond.id);return;}
  // 2. Historial exacto — entrada más reciente
  const allIngs=[...DB.ingresos,...(DB.ingresos2||[])];
  const exact=allIngs.filter(i=>i.matricula===matU)
    .sort((a,b)=>(b.entrada||'').localeCompare(a.entrada||''))[0];
  if(exact){
    autoFillFromHist(exact.id);
    setMatTag('📋',`${exact.nombre||''} ${exact.apellido||''}`.trim(),exact.empresa||'','ing');
  }
}

function askDelCond(id){const c=DB.conductores.find(x=>x.id===id);if(!c)return;_askDelGuarded('cond_'+id,()=>askDel('Eliminar conductor','<b>'+c.nombre+' '+c.apellido+'</b>',()=>{softDelete('conductores',id,renderConductores);}));}

function searchChoferAg(q){const res=document.getElementById('agChoferResults');if(!q||q.length<2){res.classList.remove('open');return;}const ql=q.toLowerCase();const found=DB.conductores.filter(c=>`${c.nombre} ${c.apellido} ${c.matricula||''}`.toLowerCase().includes(ql)).slice(0,8);if(!found.length){res.classList.remove('open');return;}res.innerHTML=found.map(c=>`<div class="dr-item" onmousedown="fillChoferAg('${c.id}')">${c.nombre} ${c.apellido}${c.matricula?' · <b>'+c.matricula+'</b>':''} <span style="color:var(--text3)">${c.empresa||''}</span></div>`).join('');res.classList.add('open');}

function fillChoferAg(id){
  const c=DB.conductores.find(x=>x.id===id);if(!c)return;
  const set=(eid,v)=>{const el=document.getElementById(eid);if(el&&v)el.value=v;};
  set('agMat',c.matricula);set('agRem',c.remolque);
  set('agCond',c.nombre+' '+c.apellido);set('agEmp',c.empresa);
  set('agHall',c.hall);set('agTel',c.telefono);set('agTipoV',c.tipoVehiculo);
  set('agPas',c.pasaporte);set('agPais',c.pais);
  set('agFechaNac',c.fechaNacimiento);set('agFechaExp',c.fechaExpiracion);
  set('agGps',c.gpsUrl);
  if(c.descargaTipo||c.descarga)syncAgDescarga(c.descargaTipo||c.descarga);
  document.getElementById('agChoferSearch').value=c.nombre+' '+c.apellido;
  document.getElementById('agChoferResults').classList.remove('open');
  toast('✅ Chofer cargado','var(--text2)');
}

function openCondModal(c){editCondId=c?c.id:null;document.getElementById('mCondTitle').textContent=c?'Editar conductor':'Nuevo conductor';document.getElementById('btnCondLbl').textContent=c?tr('save'):tr('create');const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};set('fcId',c?.id);set('fcNom',c?.nombre);set('fcApe',c?.apellido);set('fcEmp',c?.empresa);set('fcMat',c?.matricula);set('fcRem',c?.remolque);set('fcHall',c?.hall);set('fcTelP',c?.telPais||'+34');set('fcTel',c?.telefono);set('fcEmail',c?.email);set('fcTipoV',c?.tipoVehiculo||'');set('fcPas',c?.pasaporte);set('fcPais',c?.pais);set('fcFechaNac',c?.fechaNacimiento);set('fcFechaExp',c?.fechaExpiracion);set('fcGps',c?.gpsUrl);set('fcNotas',c?.notas);set('fcEncargado',c?.encargado);set('fcEncTelP',c?.encargadoTelPais||'+34');set('fcEncTel',c?.encargadoTel);set('fcEncEmail',c?.encargadoEmail);fillIdiomaSelect();if(c?.idioma)setTimeout(()=>{const el=document.getElementById('fcIdioma');if(el)el.value=c.idioma;},0);document.getElementById('mCond').classList.add('open');}

function exportConductores(){if(!canExport()){toast('Sin permiso para exportar','var(--red)');return;};if(!DB.conductores.length){toast('Sin datos','var(--red)');return;}const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(DB.conductores.map(c=>({Nombre:c.nombre,Apellido:c.apellido,Empresa:c.empresa||'',Matricula:c.matricula||'',Remolque:c.remolque||'',Telefono:c.telefono||'',Hall:c.hall||'',TipoVehiculo:c.tipoVehiculo||'',Idioma:c.idioma||''}))),'Conductores');XLSX.writeFile(wb,'conductores.xlsx');logExport('Conductores','conductores.xlsx');toast('✅ Exportado');}

