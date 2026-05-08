/* agenda — 12 funciones */

function renderAgenda(){
  const today=new Date().toISOString().slice(0,10),nowT=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
  if(!window._subRestored_agenda){window._subRestored_agenda=true;const _ls=_loadSubTab('agenda','lista');if(_ls)window._agSubTab=_ls;}const _agSub=window._agSubTab||'lista';
  // If print subtab, just render header + print config
  if(_agSub==='print'){
    const dayAll=DB.agenda.filter(a=>a.fecha===today);
    document.getElementById('tab-agenda').innerHTML=
      '<div class="sec-hdr">'+
      _evSelector('agenda')+
      '<div class="sec-act">'+
      (canAdd()?'<button class="btn btn-p btn-sm" onclick="openAgendaModal()">+ Nueva cita</button><button class="btn btn-sm btn-gh af-toggle-btn" onclick="toggleAutoFill()" style="font-size:11px;padding:5px 9px">⚡ ON</button>':'')+
      '</div></div>'+
      '<div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap">'+
      '<button class="btn btn-sm btn-gh" onclick="window._agSubTab=\'lista\';renderAgenda()">'+ tr('tabLista') +'</button>'+
      '<button class="btn btn-sm btn-p">🖨 Impresión</button>'+
      '</div>'+
      _ingPrintCfg('ag');
    setTimeout(()=>{initPrintLayout('ag');initPcCanvas('ag');},100);
    return;
  }
  let items=[...DB.agenda];
  // Filter by tab event
  const tabEv=getTabEvent('agenda');
  if(tabEv)items=items.filter(a=>!a.eventoId||a.eventoId===tabEv.id||a.eventoNombre===tabEv.nombre);
  if(agF.desde)items=items.filter(a=>a.fecha>=agF.desde);
  if(agF.hasta)items=items.filter(a=>a.fecha<=agF.hasta);
  if(agF.fecha)items=items.filter(a=>a.fecha===agF.fecha);
  if(agF.hall)items=items.filter(a=>a.hall===agF.hall);
  if(agF.estado)items=items.filter(a=>a.estado===agF.estado);
  const q=(agF.q||'').toLowerCase();if(q)items=items.filter(a=>`${a.matricula} ${a.conductor||''} ${a.empresa||''} ${a.referencia||''} ${a.montador||''} ${a.expositor||''} ${a.hall||''} ${a.remolque||''}`.toLowerCase().includes(q));
  if(agF.evento)items=items.filter(a=>(a.eventoNombre||a.empresa||'').toLowerCase().includes(agF.evento.toLowerCase()));
  if(agF.fecha===today)items=items.map(a=>(a.estado==='PENDIENTE'&&a.hora&&a.hora<nowT)?{...a,_late:true}:a);
  const sa=getSort('agenda');items=sortArr(items,sa.col||'hora',sa.dir||'asc');
  const dayAll=DB.agenda.filter(a=>a.fecha===agF.fecha);
  document.getElementById('tab-agenda').innerHTML=`

    <div class="subtab-bar" style="display:flex;align-items:center;gap:3px;padding:4px 0;flex-wrap:nowrap;min-height:34px;border-bottom:1px solid var(--border);margin-bottom:4px;overflow-x:auto;scrollbar-width:none">
      <span data-zone="L" style="display:inline-flex;gap:3px;flex-shrink:0">
      <button data-draggable data-zone="L" class="btn btn-sm ${_agSub==='lista'?'btn-p':'btn-gh'}" onclick="window._agSubTab='lista';_saveSubTab('agenda','lista');renderAgenda()" style="flex-shrink:0">${tr('tabLista')}</button>
      <button data-draggable data-zone="L" class="btn btn-sm ${_agSub==='especial'?'btn-p':'btn-gh'}" onclick="window._agSubTab='especial';_saveSubTab('agenda','especial');renderAgenda()" style="flex-shrink:0">${tr('tabSpecial')}</button>
      <button data-draggable data-zone="L" class="btn btn-sm ${_agSub==='historial'?'btn-p':'btn-gh'}" onclick="window._agSubTab='historial';_saveSubTab('agenda','historial');renderAgenda()" style="flex-shrink:0">${tr('tabEdiciones')}</button>
      </span>
      <span data-zone="M" style="display:inline-flex;gap:3px;flex-shrink:0">
      ${canAdd()&&_agSub!=='campos'?`<button data-draggable data-zone="M" class="btn btn-sm btn-p" style="font-weight:700;flex-shrink:0" onclick="openAgendaModal()">${tr('btnNewCita')}</button>`:''}
      </span>
      <div style="width:1px;height:20px;background:var(--border);flex-shrink:0;margin:0 4px"></div>
      <span data-zone="R" style="display:inline-flex;gap:3px;align-items:center;flex-shrink:0">
      <button data-draggable data-zone="R" class="btn btn-sm ${_agSub==='columnas'?'btn-p':'btn-gh'}" onclick="window._agSubTab='columnas';_saveSubTab('agenda','columnas');renderAgenda()" style="flex-shrink:0">${tr('tabColumnas')}</button>
      ${canCampos()?`<button data-draggable data-zone="R" class="btn btn-sm ${_agSub==='campos'?'btn-p':'btn-gh'}" onclick="window._agSubTab='campos';_saveSubTab('agenda','campos');renderAgenda()" style="flex-shrink:0">${tr('campos')}</button>`:''}
      </span>
      <span style="flex:1;min-width:8px"></span>
      <span data-zone="R" style="display:inline-flex;gap:3px;align-items:center;flex-shrink:0">
      ${_agSub!=='campos'?`<button class="btn btn-s btn-sm" title="Importar" onclick="document.getElementById('xlsxAg').click()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button><button class="btn btn-gh btn-sm" title="Plantilla" onclick="dlTemplateAg()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`:''}
      ${_agSub!=='campos'&&canExport()?`<button class="btn btn-gh btn-sm" title="Excel" onclick="exportAgenda()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>`:''}
      ${_agSub!=='campos'&&canClean()?`<button class="btn btn-sm" style="color:var(--red)" title=tr('limpiar') onclick="if(!confirm('¿Limpiar agenda?'))return;cleanTab('agenda')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>`:''}
      </span>
      
    </div>
    ${_agSub==='campos'?renderCamposSubtab('agenda'):_agSub==='columnas'?renderColVisSub('agenda'):_agSub==='historial'?_ingHistorial('agenda'):_agSub==='especial'?_ingLN():''}
    ${_agSub!=='campos'?`<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--border);padding-bottom:4px">
      <div class="sbox" style="flex:1;min-width:140px"><span class="sico">🔍</span><input type="search" placeholder="${tr('searchWaiting')}" value="${agF.q||''}" oninput="agF.q=this.value;debounceSearch('agenda',renderAgenda)"></div>
      <input type="date" value="${agF.desde||''}" oninput="agF.desde=this.value;renderAgenda()" style="height:32px;padding:4px 8px;font-size:11px;box-sizing:border-box;width:auto;min-width:110px;max-width:130px" title="Desde">
      <input type="date" value="${agF.hasta||''}" oninput="agF.hasta=this.value;renderAgenda()" style="height:32px;padding:4px 8px;font-size:11px;box-sizing:border-box;width:auto;min-width:110px;max-width:130px" title="Hasta">
      ${agF.q||agF.hall||agF.estado||agF.desde||agF.hasta?`<span class="pill pill-r" style="flex-shrink:0" onclick="agF={q:'',hall:'',estado:'',evento:'',desde:'',hasta:'',fecha:''};renderAgenda()">✕</span>`:''}
      <span style="font-size:10px;color:var(--text3);flex-shrink:0">${items.length} citas</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px">
      <span class="pill" style="font-size:10px;font-weight:700;padding:3px 8px;border:1.5px solid ${!agF.hall?'#7dd3fc':'#c8cacc'};background:${!agF.hall?'#e0f2fe':'#e8eaed'};color:${!agF.hall?'#0369a1':'#1e40af'};cursor:pointer" onclick="agF.hall='';renderAgenda()">${tr('all')}</span>
      ${getRecintoHalls().map(h=>`<span class="pill" style="font-size:10px;font-weight:700;padding:3px 8px;background:${agF.hall===h?'#4a5568':'#e8eaed'};color:${agF.hall===h?'#fff':'#1e40af'};border:1.5px solid ${agF.hall===h?'#4a5568':'#c8cacc'};cursor:pointer" onclick="agF.hall='${h}';renderAgenda()">${h}</span>`).join('')}
    </div>`:''} 
    ${items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr>${thSort('agenda','estado','Estado')}${_isColVisible('agenda','fecha')?thSort('agenda','fecha',tr('fecha')):''}${_isColVisible('agenda','hora')?thSort('agenda','hora','Hora P.'):''}${_isColVisible('agenda','horaReal')?thSort('agenda','horaReal','Hora R.'):''}${_isColVisible('agenda','dif')?'<th>'+'Dif.'+'</th>':''}${thSort('agenda','matricula','Matrícula')}${_isColVisible('agenda','referencia')?thSort('agenda','referencia','Ref.'):''}${_isColVisible('agenda','conductor')?thSort('agenda','conductor','Conductor'):''}${_isColVisible('agenda','empresa')?thSort('agenda','empresa','Empresa'):''}${_isColVisible('agenda','hall')?'<th>'+tr('hall')+'</th>':''}${_isColVisible('agenda','extras')?'<th>Extras</th>':''}<th>${tr('acciones')}</th></tr></thead><tbody>
      ${items.map(a=>{const d=a.horaReal?diffMins(a.hora,a.horaReal):null;return`<tr style="${a._late?'background:var(--rll)':''}">
        <td>${sAgBadge(a.estado||'PENDIENTE')}${a._late?'<br><span style="font-size:9px;color:var(--red)">⏰</span>':''}</td>
        ${_isColVisible('agenda','fecha')?`<td style="font-size:11px;font-weight:600;color:var(--text2)">${a.fecha||'–'}</td>`:''}
        ${_isColVisible('agenda','hora')?`<td style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700">${a.hora||'–'}</td>`:''}
        ${_isColVisible('agenda','horaReal')?`<td style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700">${a.horaReal||'–'}</td>`:''}
        ${_isColVisible('agenda','dif')?`<td><span class="${diffClass(d)}" style="font-size:11px">${a.horaReal?diffLabel(d):'–'}</span></td>`:''}
        <td><span class="mchip" style="cursor:pointer" onclick="showAgDetalle('${a.id}')">${a.matricula||'–'}</span>${a.remolque?`<br><span class="mchip-sm">${a.remolque}</span>`:''}</td>
        ${_isColVisible('agenda','referencia')?`<td style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#4a5568">${a.referencia||'–'}</td>`:''}
        ${_isColVisible('agenda','conductor')?`<td style="font-size:11px"><b>${a.conductor||'–'}</b>${a.tipoVehiculo?`<br><span style="font-size:10px">${TV[a.tipoVehiculo]||a.tipoVehiculo}</span>`:''}</td>`:''}
        ${_isColVisible('agenda','empresa')?`<td style="font-size:11px"><span style="color:var(--text3)">${a.empresa||''}</span>${a.montador?`<br>Mont: ${a.montador}`:''}</td>`:''}
        ${_isColVisible('agenda','hall')?`<td>${hBadge(a.hall)}${a.stand?`<br><span style="font-size:10px">Std: ${a.stand}</span>`:''}</td>`:''}
        ${_isColVisible('agenda','extras')?`<td style="font-size:10px">${a.gpsUrl?`<a href="${a.gpsUrl}" target="_blank" class="gps-pill">📍</a> `:''}${a.pase?`<span class="pase-pill">${PP[a.pase]||a.pase}</span> `:''}${a.requisitos?.length?`📋${a.requisitos.length}`:''}</td>`:''}
        <td><div style="display:flex;gap:2px;flex-wrap:wrap">
          ${canStatus()&&a.estado!=='LLEGADO'&&a.estado!=='SALIDA'?`<button class="btn btn-success btn-xs" onclick="marcarAgLlegado('${a.id}')">✅</button>`:''}
          ${canStatus()&&a.estado==='LLEGADO'?`<button class="btn btn-edit btn-xs" onclick="marcarAgSalida('${a.id}')">🔵</button>`:''}
          <button class="btn btn-gh btn-xs" onclick="printAgendaItem(DB.agenda.find(x=>x.id==='${a.id}'))" title=tr('btnImprimir')>🖨</button>
          <button class="btn btn-xs" style="background:#4a5568;color:#fff" title="Registrar paso tracking" onclick="registrarPasoTrackingAg('${a.id}')">📡</button>
          ${canEdit()?`<button class="btn btn-edit btn-xs" onclick="openAgendaModal(DB.agenda.find(x=>x.id==='${a.id}'))">✏️</button>`:''}
          ${canDel()?`<button class="btn btn-danger btn-xs" onclick="askDelAg('${a.id}')">🗑</button>`:''}
        </div></td>
      </tr>`;}).join('')}
    </tbody></table></div>`:`<div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">${tr('noAppointments')}</div>`}`;
}

function _renderAgendaMatchPanel(a){
  const body=document.getElementById('fiAgendaMatchBody');
  if(!body)return;
  const evObj=a.eventoId?DB.eventos.find(e=>e.id===a.eventoId):null;
  const campos=[
    ['📅 Fecha/Hora',(a.fecha||'')+(a.hora?' '+a.hora:'')],
    ['🚛 Matrícula',a.matricula],
    ['🚚 Remolque',a.remolque],
    ['👤 Conductor',a.conductor],
    ['🏢 Empresa',a.empresa],
    ['🏭 Hall',a.hall],
    ['📍 Stand',a.stand],
    ['🔧 Montador',a.montador],
    ['🎪 Expositor',a.expositor],
    ['📱 Teléfono',a.telefono],
    ['🔖 Referencia',a.referencia],
    ['📋 Evento',evObj?.nombre||a.eventoNombre],
  ].filter(([,v])=>v&&String(v).trim());
  body.innerHTML=campos.map(([l,v])=>`<div style="background:rgba(255,255,255,.6);border-radius:4px;padding:4px 7px"><div style="font-size:9px;font-weight:700;color:#4a5568;opacity:.8;margin-bottom:1px">${l}</div><div style="font-weight:600;color:var(--text);font-size:11px">${esc(String(v))}</div></div>`).join('');
}

function fillFromAgenda(id){
  const a=(DB.agenda||[]).find(x=>x.id===id);
  if(!a)return;
  const set=(eid,v)=>{const el=document.getElementById(eid);if(el&&v!=null&&v!=='')el.value=v;};
  // Referencia y datos del evento/lugar
  set('fiRef',a.referencia);
  set('fiMontador',a.montador);
  set('fiExpositor',a.expositor);
  set('fiStand',a.stand);
  set('fiPuertaHall',a.puertaHall);
  set('fiEmp',a.empresa);
  set('fiNom',a.conductor);
  set('fiTel',a.telefono);
  if(a.puerta)set('fiPuerta',a.puerta);
  if(a.descargaTipo){const el=document.getElementById('fiDescarga');if(el){el.value=a.descargaTipo;syncToggleButtons();}}
  if(a.tipoVehiculo){const el=document.getElementById('fiTipoVeh');if(el){el.value=a.tipoVehiculo;syncToggleButtons();}}
  if(a.hall&&!_fiHalls.includes(a.hall)){_fiHalls=[a.hall];renderHallTags();}
  // Si la cita tiene evento, asignarlo como favorito personal (no global)
  if(a.eventoId){
    const ev=DB.eventos.find(e=>e.id===a.eventoId);
    if(ev){
      // Preseleccionar en el selector del formulario, no modificar el activo global
      const evSel=document.getElementById('fiEventoId');
      if(evSel)evSel.value=a.eventoId;
      applyEventFieldVisibility();
      updatePhrasePreview();
    }
  }
  // Si la cita tiene matrícula y el campo mat está vacío, autocompletar
  const matEl=document.getElementById('fiMat');
  if(a.matricula&&matEl&&!matEl.value){
    matEl.value=a.matricula;
    checkMatOnInput(a.matricula);
  }
  // Ocultar dropdown y mostrar panel confirmado
  const res=document.getElementById('fiRefResults');
  if(res)res.classList.remove('open');
  const panel=document.getElementById('fiAgendaMatch');
  if(panel){
    window._fiAgendaMatchId=id;
    _renderAgendaMatchPanel(a);
    panel.style.display='block';
    // Cambiar botón a "Absorbido ✓"
    const btn=panel.querySelector('button');
    if(btn){btn.textContent='✓ Absorbido';btn.style.background='#4a5568';setTimeout(()=>{btn.textContent='⬇ Absorber datos';btn.style.background='#4a5568';},2500);}
  }
  toast('📅 Datos de agenda cargados','var(--text2)');
}

function askDelAg(id){const a=DB.agenda.find(x=>x.id===id);if(!a)return;_askDelGuarded('ag_'+id,()=>askDel('Eliminar cita','<b>'+a.matricula+'</b> '+a.fecha+' '+a.hora,()=>{softDelete('agenda',id,renderAgenda);}));}

function openAgendaModal(a){
  editAgId=a?a.id:null;agReqsTemp=a?.requisitos?[...a.requisitos]:[];
  document.getElementById('mAgTitle').textContent=a?tr('editAppointment'):tr('newAppointment');
  document.getElementById('btnAgLbl').textContent=a?tr('saveChanges'):tr('addAppointment');
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  set('agId',a?.id);set('agFecha',a?.fecha||new Date().toISOString().slice(0,10));set('agHora',a?.hora);
  set('agMat',a?.matricula);set('agRem',a?.remolque);set('agTipoV',a?.tipoVehiculo);set('agCond',a?.conductor);
  set('agEmp',a?.empresa);set('agRef',a?.referencia);set('agMontador',a?.montador);set('agExpositor',a?.expositor);
  set('agHall',a?.hall);set('agStand',a?.stand);set('agPuerta',a?.puerta);set('agPase',a?.pase);
  const agHInp=document.getElementById('agHall');if(agHInp){agHInp.value=a?.hall||'';}
  set('agPuertaHall',a?.puertaHall);set('agPas',a?.pasaporte);set('agPais',a?.pais);set('agFechaNac',a?.fechaNacimiento);set('agFechaExp',a?.fechaExpiracion);set('agTel',a?.telefono);set('agGps',a?.gpsUrl);set('agCarga',a?.tipoCarga||'');syncAgDescarga(a?.descargaTipo||'');
  set('agGastoTipo',a?.gastoTipo);set('agGastoImporte',a?.gastoImporte);set('agEstado',a?.estado||'PENDIENTE');set('agNotas',a?.notas);
  const evSel=document.getElementById('agEvento');if(evSel){const _dEv=DB.defaultEventId||DB.activeEventId||'';evSel.innerHTML='<option value="">— Sin evento —</option>'+DB.eventos.map(e=>`<option value="${e.id}" ${(a?.eventoId||(!a&&_dEv)||'')===e.id?'selected':''}>${e.ico||'📋'} ${e.nombre}</option>`).join('');if(!a&&_dEv)evSel.value=_dEv;onAgEventoChange();const _w=document.getElementById('agEvWrap');if(_w)_w.style.display=(DB.activeEventId&&!a)?'none':'block';}
  document.getElementById('agChoferSearch').value='';document.getElementById('agChoferResults').classList.remove('open');
  renderAgReqs();document.getElementById('mAg').classList.add('open');
}

function _filterAgHall(q){
  const res=document.getElementById('agHallResults');if(!res)return;
  const opts=window._agHallOpts||getRecintoHalls();
  if(!q){res.classList.remove('open');return;}
  const filtered=opts.filter(h=>!q||h.toLowerCase().includes(q.toLowerCase()));
  // Always allow free text — add current value if not in list
  if(q.trim()&&!opts.find(h=>h.toLowerCase()===q.toLowerCase()))filtered.push(q.trim());
  if(!filtered.length){res.classList.remove('open');return;}
  res.innerHTML=filtered.map(h=>`<div class="dr-item" onmousedown="document.getElementById('agHall').value='${h}';document.getElementById('agHallResults').classList.remove('open')">🚪 ${h}</div>`).join('');
  res.classList.add('open');
}

function addReqAg(){const v=(document.getElementById('agReqInput').value||'').trim();if(!v)return;agReqsTemp.push(v);document.getElementById('agReqInput').value='';renderAgReqs();}

function removeReqAg(i){agReqsTemp.splice(i,1);renderAgReqs();}

function renderAgReqs(){const el=document.getElementById('agReqsList');if(el)el.innerHTML=agReqsTemp.map((r,i)=>`<span class="req-chip">${r}<button onclick="removeReqAg(${i})">✕</button></span>`).join('');}

function marcarAgLlegado(id){const a=DB.agenda.find(x=>x.id===id);if(!a)return;a.estado='LLEGADO';a.horaReal=new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});saveDBNow();renderAgenda();renderHdr();toast('✅ Llegada registrada','var(--text2)');}

function marcarAgSalida(id){const a=DB.agenda.find(x=>x.id===id);if(!a)return;a.estado='SALIDA';a.horaSalida=nowL();saveDBNow();renderAgenda();toast('🔵 Salida registrada');}

function exportAgenda(){if(!canExport()){toast('Sin permiso para exportar','var(--red)');return;};if(!DB.agenda.length){toast('Sin datos','var(--red)');return;}const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(DB.agenda.map(a=>({Fecha:a.fecha,HoraPlan:a.hora,HoraReal:a.horaReal||'',Matricula:a.matricula,Remolque:a.remolque||'',Conductor:a.conductor||'',Empresa:a.empresa||'',Referencia:a.referencia||'',Montador:a.montador||'',Expositor:a.expositor||'',Hall:a.hall||'',Stand:a.stand||'',Carga:a.tipoCarga||'',Telefono:a.telefono||'',Estado:a.estado,Notas:a.notas||'',Evento:a.eventoNombre||''}))),'Agenda');const fn3='agenda_'+new Date().toISOString().slice(0,10)+'.xlsx';XLSX.writeFile(wb,fn3);logExport('Agenda',fn3);toast('✅ Exportado');}

