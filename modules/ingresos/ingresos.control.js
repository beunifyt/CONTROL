/* ingresos — 74 funciones */

function renderTipoVehButtons(ev){
  // Si el evento tiene tipoVehLabels usa esos, sino usa TV_FIRA por defecto (Fira GV)
  const labels=ev?.tipoVehLabels||TV_FIRA;
  const wrap=document.getElementById('tipoVehBtns');if(!wrap)return;
  wrap.innerHTML=Object.values(labels).map(t=>
    `<button type="button" class="btn btn-sm btn-gh" id="${t.id}" onclick="setToggle('fiTipoVeh','${t.val}')" style="flex:1">${t.lbl}</button>`
  ).join('');
  syncToggleButtons();
}

function applyIngFormFieldVisibility(){
  const ck=_getCamposKey(_ingSource==='ingresos2'?'ingresos2':'ingresos');
  Object.entries(_FMAP).forEach(([k,wid])=>{
    const el=document.getElementById(wid);if(!el)return;
    const cfg=DB.camposCfg?.[ck]?.current?.[k]??'show';
    el.style.display=cfg==='off'?'none':'';
    const lbl=el.querySelector('.flbl');if(!lbl)return;
    const old=lbl.querySelector('.freq-auto');if(old)old.remove();
    if(cfg==='required'){const s=document.createElement('span');s.className='freq freq-auto';s.textContent=' *';lbl.appendChild(s);}
  });
}

function getFormEvento(){const sel=document.getElementById('fiEventoId');if(sel&&sel.value)return DB.eventos.find(e=>e.id===sel.value)||null;return getActiveEvent();}

function onFormEventoChange(){const ev=getFormEvento();renderTipoVehButtons(ev);renderHallTags();const inp=document.getElementById('fiHallInput');if(inp)inp.value='';const res=document.getElementById('fiHallResults');if(res)res.classList.remove('open');fillPuertaSelect();}

function applyEventFieldVisibility(){
  const actEvs=getActiveEvents();
  // Populate evento selector
  const selWrap=document.getElementById('fiEventoSel');
  const selEl=document.getElementById('fiEventoId');
  if(selEl){
    const curVal=selEl.value;
    const allEvs2=DB.eventos||[];
    selEl.innerHTML='<option value="">— Sin evento —</option>'+allEvs2.map(e=>`<option value="${e.id}" ${(curVal||DB.defaultEventId||'')===(e.id)?'selected':''}>${e.ico||'📋'} ${e.nombre}</option>`).join('');
    if(!curVal&&DB.defaultEventId)selEl.value=DB.defaultEventId;
    if(selWrap)selWrap.style.display=(allEvs2.length>0&&!DB.activeEventId)?'block':'none';
  }
  const bar=document.getElementById('fiEventoBar');if(bar)bar.style.display='none';
  renderTipoVehButtons(getFormEvento());
  // Autocompletar pos — DESACTIVADO ⚡ OFF 🔢
  /* const posEl=document.getElementById('fiPos');
  if(posEl&&!posEl.value){
    const today=new Date().toISOString().slice(0,10);
    const ev=getFormEvento();
    let nextPos;
    if(_ingSource==='ingresos2'){
      if(ev?.acumularPos)nextPos=(DB.ingresos2||[]).filter(i=>i.eventoId===ev?.id).length+1;
      else nextPos=(DB.ingresos2||[]).filter(i=>i.entrada?.startsWith(today)).length+1;
    }else{
      nextPos=DB.ingresos.filter(i=>i.entrada?.startsWith(today)).length+1;
    }
    posEl.placeholder='Auto ('+nextPos+')';posEl.setAttribute('data-autopos',nextPos);
  } */
}

function checkBL(mat){return DB.listaNegra.find(x=>x.matricula===mat.toUpperCase()&&(!x.hasta||x.hasta>=new Date().toISOString().slice(0,10)))||null;}

function checkEE(mat){return DB.enEspera.find(e=>e.matricula===mat.toUpperCase()&&e.estado==='pendiente')||null;}

function autoMsg(tipo,titulo,mensaje,mat='',horasExpira=null){const expiraTs=horasExpira?Date.now()+(horasExpira*60*60*1000):null;const m={id:uid(),ts:nowL(),autor:CU?.nombre||'Sistema',tipo,titulo,mensaje,matricula:mat,leido:[SID],pausado:false,expiraTs};DB.mensajesRampa.unshift(m);if(DB.mensajesRampa.length>100)DB.mensajesRampa=DB.mensajesRampa.slice(0,100);saveDBNow();}

function fillTelSels(){const custom=JSON.parse(localStorage.getItem('cu1_customTelCodes')||'[]');const allCodes=[...PAISES];custom.forEach(c=>{if(!allCodes.find(p=>p.code===c))allCodes.push({code:c,flag:'🌐'});});const opts=allCodes.map(p=>`<option value="${p.code}">${p.flag} ${p.code}</option>`).join('');['dlTelP','dlTelP2'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=opts;});['fiTelP','fcTelP'].forEach(id=>{const el=document.getElementById(id);if(el&&!el.value)el.value='+34';});document.querySelectorAll('#fiTelP,#fcTelP').forEach(el=>{el.removeEventListener('change',_saveTelCode);el.addEventListener('change',_saveTelCode);el.removeEventListener('blur',_saveTelCode);el.addEventListener('blur',_saveTelCode);});}

function _saveTelCode(e){const v=(e.target.value||'').trim();if(v&&v.startsWith('+')&&v.length>=2&&!PAISES.find(p=>p.code===v)){const custom=JSON.parse(localStorage.getItem('cu1_customTelCodes')||'[]');if(!custom.includes(v)){custom.push(v);localStorage.setItem('cu1_customTelCodes',JSON.stringify(custom));fillTelSels();toast('📞 Prefijo '+v+' guardado','#4a5568');}}}

function setToggle(hiddenId,val){const el=document.getElementById(hiddenId);const cur=el.value;el.value=(cur===val)?'':val;syncToggleButtons();}

function setAgDescarga(v){
  const cur=document.getElementById('agDescarga');if(!cur)return;
  cur.value=cur.value===v?'':v;
  ['agDcHand','agDcFork'].forEach(id=>{
    const b=document.getElementById(id);if(!b)return;
    const bv=id==='agDcHand'?'mano':'maquinaria';
    b.className='btn btn-sm '+(cur.value===bv?'btn-p':'btn-gh');
    b.style.opacity=cur.value&&cur.value!==bv?'.35':'1';
  });
}

function syncAgDescarga(v){
  const cur=document.getElementById('agDescarga');if(cur)cur.value=v||'';
  ['agDcHand','agDcFork'].forEach(id=>{
    const b=document.getElementById(id);if(!b)return;
    const bv=id==='agDcHand'?'mano':'maquinaria';
    b.className='btn btn-sm '+(v===bv?'btn-p':'btn-gh');
    b.style.opacity=v&&v!==bv?'.35':'1';
  });
}

function syncToggleButtons(){const tv=document.getElementById('fiTipoVeh')?.value||'';const dc=document.getElementById('fiDescarga')?.value||'';const map={tvTrailer:'trailer',tvB:'semiremolque',tvA:'camion'};Object.entries(map).forEach(([btnId,v])=>{const b=document.getElementById(btnId);if(b){const active=tv===v;b.className='btn btn-sm '+(active?'btn-p':'btn-gh');b.style.opacity=tv&&!active?'.35':'1';}});const dmap={dcHand:'mano',dcFork:'maquinaria'};Object.entries(dmap).forEach(([btnId,v])=>{const b=document.getElementById(btnId);if(b){const active=dc===v;b.className='btn btn-sm '+(active?'btn-p':'btn-gh');b.style.opacity=dc&&!active?'.35':'1';}});}

function fillPuertaSelect(){const sel=document.getElementById('fiPuerta');if(!sel)return;const ev=getActiveEvent();let puertas=ev?.puertas||[];if(!puertas.length&&ev?.recintoId){const r=(DB.recintos||[]).find(x=>x.id===ev.recintoId);if(r)puertas=r.puertas||[];}sel.innerHTML='<option value="">--</option>'+puertas.map(p=>`<option value="${p.nombre}">${p.nombre}</option>`).join('');}

function cycleEvCampo(k){const el=document.getElementById('evF'+k);if(!el)return;const cur=el.dataset.val||'show';const next={off:'show',show:'required',required:'off'}[cur]||'show';const colors={off:['var(--border)','var(--bg2)','var(--text4)','✕'],show:['#4a5568','#4a5568','#fff','✓'],required:['var(--red)','var(--red)','#fff','★']};const c=colors[next];el.dataset.val=next;el.style.borderColor=c[0];el.style.background=c[1];el.style.color=c[2];el.style.opacity=next==='off'?'.4':'1';el.innerHTML=`${c[3]} ${k}`;}

function updatePhrasePreview(){
  // Phrase 2 - translate like phrase 1
  const p2w=document.getElementById('fiPhrase2Wrap');
  if(p2w){
    const ev2=getActiveEvent();const dLang2=document.getElementById('fiLang')?.value||'es';const uLang2=CUR_LANG||'es';
    if(ev2?.phrase2){
      p2w.style.display='block';
      const p2src=ev2.phrase2;
      // Check if translation exists
      if(!ev2.phrases2)ev2.phrases2={};
      ev2.phrases2[uLang2]=p2src; // base language
      const p2translated=ev2.phrases2[dLang2];
      const dInfo2=LANGS_UI.find(l=>l.code===dLang2)||{flag:'',name:dLang2};
      const uInfo2=LANGS_UI.find(l=>l.code===uLang2)||{flag:'🇪🇸',name:'Español'};
      if(dLang2===uLang2){
        document.getElementById('fiPhrase2Line').innerHTML=uInfo2.flag+' '+p2src;
      }else if(p2translated){
        document.getElementById('fiPhrase2Line').innerHTML=dInfo2.flag+' '+p2translated+'<br><span style="font-size:10px;color:var(--text3)">'+uInfo2.flag+' '+p2src+'</span>';
      }else{
        document.getElementById('fiPhrase2Line').innerHTML=dInfo2.flag+' <span style="color:#4a5568;font-style:italic;font-size:11px">traduciendo...</span><br><span style="font-size:10px;color:var(--text3)">'+uInfo2.flag+' '+p2src+'</span>';
        freeTranslatePhrase2(p2src,uLang2,dLang2,dInfo2,ev2);
      }
    }else{p2w.style.display='none';}
  }const wrap=document.getElementById('fiPhraseWrap');if(!wrap)return;const driverLang=document.getElementById('fiLang')?.value||'es';const uLang=CUR_LANG||'es';const ev=getActiveEvent();if(!ev||!ev.phrases){wrap.style.display='none';return;}const evPhrases=ev.phrases||{};const phraseUser=evPhrases[uLang]||evPhrases.es||'';if(!phraseUser){wrap.style.display='none';return;}wrap.style.display='block';const uInfo=LANGS_UI.find(l=>l.code===uLang)||{flag:'🇪🇸',name:'Español'};document.getElementById('fiPhraseUserLine').innerHTML=`🔔 ${uInfo.flag} ${phraseUser}`;const dLine=document.getElementById('fiPhraseDriverLine');if(driverLang===uLang){dLine.style.display='none';return;}const dInfo=LANGS_UI.find(l=>l.code===driverLang)||{flag:'',name:driverLang};const existing=evPhrases[driverLang];if(existing){dLine.style.display='block';dLine.innerHTML=`${dInfo.flag} ${existing}`;return;}dLine.style.display='block';dLine.innerHTML=`${dInfo.flag} <span style="color:#b45309;font-style:italic;font-size:11px">traduciendo...</span>`;freeTranslatePhrase(phraseUser,uLang,driverLang,dInfo,ev);}

function cleanTab(tab){if(!confirm('¿Limpiar los registros del día de «'+tab+'»?'))return;
  if(!canClean()){toast(tr('sinPermiso'),'var(--red)');return;}
  const names={ingresos:'Referencia',ingresos2:'Ingresos',agenda:'Agenda',conductores:'Conductores',movimientos:'Embalaje',vehiculos:'Historial'};
  const n=names[tab]||tab;
  if(!confirm('⚠️ ¿Limpiar todos los datos de '+n+'?'))return;
  // Requiere escribir la frase de confirmación exacta
  const frase=prompt('🔴 CONFIRMACIÓN FINAL\n\nEscribe el nombre exacto de la pestaña para confirmar:\n\n"'+n+'"');
  if((frase||'').trim()!==n){toast('Frase incorrecta — operación cancelada','var(--amber)',4000);return;}
  if(tab==='ingresos'){DB.ingresos=[];DB.vehiculos=[];}
  else if(tab==='ingresos2'){DB.ingresos2=[];DB.vehiculos=[];}
  else if(tab==='agenda')DB.agenda=[];
  else if(tab==='conductores')DB.conductores=[];
  else if(tab==='movimientos')DB.movimientos=[];
  else if(tab==='vehiculos')DB.vehiculos=[];
  DB.editHistory=[];
  // Write immediately to Firebase (skip debounce) so listener doesn't re-populate
  saveLocalDB();
  if(fbRef){clearTimeout(writeDebounce);fbRef.set({_session:SID,_ts:Date.now(),movimientos:DB.movimientos,ingresos:DB.ingresos,listaNegra:DB.listaNegra,enEspera:DB.enEspera,mensajesRampa:DB.mensajesRampa,conductores:DB.conductores,usuarios:DB.usuarios,auditLog:(DB.auditLog||[]).slice(0,200),eventos:DB.eventos||[],agenda:DB.agenda||[],activeEventId:DB.activeEventId||null,activeEventIds:DB.activeEventIds||[],defaultEventId:DB.defaultEventId||null,printFieldOrder:DB.printFieldOrder||PRINT_DEF,hiddenPrintFields:DB.hiddenPrintFields||[],editHistory:[],ingresos2:DB.ingresos2||[],vehiculos:DB.vehiculos||[],papelera:(DB.papelera||[]).slice(0,200),exportLog:(DB.exportLog||[]).slice(0,500),printPhrases:DB.printPhrases||{},printPhrases2:DB.printPhrases2||{},tabSorts:DB.tabSorts||{},tabOrder:DB.tabOrder||[],colOrders:DB.colOrders||{},printCfg1:DB.printCfg1||{},printCfg2:DB.printCfg2||{},printCfgAg:DB.printCfgAg||{},printCfgCond:DB.printCfgCond||{},printCfgFlota:DB.printCfgFlota||{},recintos:DB.recintos||[],printTemplates:DB.printTemplates||[],printCfgModes:DB.printCfgModes||{},camposCfg:DB.camposCfg||{},eventoHistorial:(DB.eventoHistorial||[]).slice(0,50),eventosPapelera:(DB.eventosPapelera||[]).slice(0,50),_deviceAlerts:(DB._deviceAlerts||[]).slice(0,50),devices:(DB.devices||[]),_devRequireApproval:DB._devRequireApproval||false}).then(()=>{setSyncStatus('ok');}).catch(()=>setSyncStatus('error'));}
  renderTab(curTab);renderHdr();
  logAudit('limpiar_tab',tab,'Limpieza total de '+n);
  toast('🗑 '+n+' limpiado','var(--red)');
}

function toggleAutoFill(){
  _autoFillOn=!_autoFillOn;
  try{localStorage.setItem((SK||'cu1')+'_af'+(CU?.id||''),_autoFillOn?'1':'0');}catch(e){}
  // Update button text directly (faster than full re-render)
  document.querySelectorAll('.af-toggle-btn').forEach(b=>{
    const icon=b.textContent.trim().charAt(0);
    b.textContent=icon+' '+(_autoFillOn?tr('on')||'ON':tr('off')||'OFF');
  });
  _updateAfBtn();
  toast(_autoFillOn?'⚡ '+tr('autofill_on'):'⚡ '+tr('autofill_off'),_autoFillOn?'#4a5568':'var(--amber)');
}

function _updateAfBtn(){
  document.querySelectorAll('.af-toggle-btn').forEach(b=>{
    b.style.opacity=_autoFillOn?'1':'0.5';
    b.style.background=_autoFillOn?'var(--bll)':'var(--bg2)';
    b.style.color=_autoFillOn?'#4a5568':'var(--text3)';
    b.style.borderColor=_autoFillOn?'#4a5568':'var(--border2)';
    b.style.fontWeight=_autoFillOn?'700':'400';
  });
  document.querySelectorAll('.pos-toggle-btn').forEach(b=>{
    b.style.opacity=_posAutoOn?'1':'0.5';
    b.style.background=_posAutoOn?'var(--bll)':'var(--bg2)';
    b.style.color=_posAutoOn?'#4a5568':'var(--text3)';
    b.style.borderColor=_posAutoOn?'#4a5568':'var(--border2)';
    b.style.fontWeight=_posAutoOn?'700':'400';
    // Also show/hide fiPos input
    const fp=document.getElementById('fiPos');
    if(fp){fp.style.display=_posAutoOn?'none':'';fp.placeholder=_posAutoOn?'Auto':tr('pos_manual')||'Nº manual';}
  });
}

function togglePosAuto(){
  _posAutoOn=!_posAutoOn;
  try{localStorage.setItem((SK||'cu1')+'_pa'+(CU?.id||''),_posAutoOn?'1':'0');}catch(e){}
  document.querySelectorAll('.pos-toggle-btn').forEach(b=>{
    const icon=b.textContent.trim().charAt(0);
    b.textContent=icon+' '+(_posAutoOn?tr('on')||'ON':tr('off')||'OFF');
  });
  _updateAfBtn();
  const fp=document.getElementById('fiPos');
  if(fp){
    fp.style.display=_posAutoOn?'none':'';
    if(!_posAutoOn)setTimeout(()=>fp.focus(),50);
  }
  toast(_posAutoOn?'🔢 '+tr('pos_auto'):'🔢 '+tr('pos_manual_on'),_posAutoOn?'#4a5568':'var(--amber)');
}

function histHtml(collection,renderFn){
  const hist=(DB.editHistory||[]).filter(h=>!collection||(h.collection===collection||!h.collection));
  if(!hist.length)return'';
  const items=hist.slice(0,6);
  const col1=items.slice(0,3),col2=items.slice(3,6);
  const mkItem=(h)=>{const col=h.collection||'ingresos';const item=(DB[col]||[]).find(x=>x.id===h.id);const pos=h.pos||item?.pos||'';const ico={new:'✅',edit:'✏️',salida:'↩',reactivar:'↺',new_ing2:'✅',edit_ing2:'✏️'}[h.action]||'';return`<div style="display:flex;align-items:center;gap:3px;padding:2px 0;font-size:10px;cursor:pointer;white-space:nowrap" onclick="showIngDetalle('${h.id}','${col}')">${pos?`<span style="font-weight:800;color:var(--text3)">#${pos}</span>`:''}<span class="mchip-sm" style="font-size:9px;padding:1px 4px">${h.mat||'–'}</span><span style="color:var(--text3)">${ico}</span><span style="color:var(--text4)">${fmt(h.ts,'t')}</span></div>`;};
  return`<div style="background:var(--all);border:1px solid #fde68a;border-radius:var(--r);padding:4px 8px;flex-shrink:0;min-width:200px">
    <div style="font-size:8px;font-weight:900;color:var(--amber);text-transform:uppercase;margin-bottom:2px">${tr('tabEdiciones')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">${col1.map(mkItem).join('')}${col2.map(mkItem).join('')}</div>
  </div>`;
}

function _ingHistorial(collection){
  // Filtro estricto: solo mostrar entradas de esta colección. Si no tienen collection guardada, solo mostrar en ingresos/ingresos2
  const hist=(DB.editHistory||[]).filter(h=>{
    if(!collection)return true;
    if(h.collection)return h.collection===collection;
    // Entradas antiguas sin collection -> solo visibles en ingresos e ingresos2
    return collection==='ingresos'||collection==='ingresos2';
  });
  const clearBtn=isSA()?`<button class="btn btn-gh btn-sm" onclick="exportHistorialExcel()" title="Excel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button><label class="btn btn-s btn-sm" style="cursor:pointer;margin-left:3px" title="Importar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><input type="file" accept=".xlsx,.xls" style="display:none" onchange="importHistorialExcel(this)"></label><button class="btn btn-danger btn-sm" onclick="vaciarHistorial('${collection}')" style="margin-left:3px" title="Vaciar" style="color:var(--red)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="8" y1="3" x2="16" y2="3"/></svg></button>`:'';
  const importBtn='';
  if(!hist.length)return`<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:4px">${clearBtn}</div><div style="padding:20px;text-align:center;color:var(--text3);font-size:12px">${tr('sinModificaciones')}</div>`;
  const icoMap={new:'✅ Nuevo',edit:'✏️ Editado',salida:'↩ Salida',reactivar:'↺ Reactivado',new_ing2:'✅ Nuevo',edit_ing2:'✏️ Editado'};
  return`<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-bottom:4px"><span style="font-size:11px;color:var(--text3)">${hist.length} registros</span>${clearBtn}</div>
  <div class="tbl-wrap"><table class="dtbl"><thead><tr><th>#</th><th>${tr('matricula')}</th><th><span id="lbl_permAction">${tr('accion')}</span></th><th>'+tr('frUserLbl')+'</th><th>'+tr('hora')+'</th></tr></thead><tbody>
    ${hist.map(h=>{
      const col=h.collection||'ingresos';
      return`<tr style="cursor:pointer" onclick="showIngDetalle('${h.id}','${col}')">
        <td style="font-weight:800;color:var(--text3);font-size:11px">${h.pos?'#'+h.pos:''}</td>
        <td><span class="mchip-sm">${h.mat||'–'}</span></td>
        <td style="font-size:11px">${icoMap[h.action]||h.action||''}</td>
        <td style="font-size:11px;color:var(--text3)">${h.user||'–'}</td>
        <td style="font-size:11px;font-family:'JetBrains Mono',monospace">${fmt(h.ts)}</td>
      </tr>`;}).join('')}
  </tbody></table></div>`;
}

function renderIngresos(){
  const today=new Date().toISOString().slice(0,10);
  let items=[...DB.ingresos];
  // Filter by user's work event (personal fav or global active)
  const _workEvId=getUserWorkEventId();
  if(_workEvId)items=items.filter(i=>!i.eventoId||i.eventoId===_workEvId);
  const q=(iF.q||'').toLowerCase();
  if(q)items=items.filter(i=>`${i.pos||''} ${i.matricula} ${i.nombre||''} ${i.apellido||''} ${i.empresa||''} ${i.llamador||''} ${i.referencia||''} ${(i.halls||[i.hall||'']).join(' ')} ${i.stand||''} ${i.remolque||''} ${i.montador||''} ${i.expositor||''} ${i.comentario||''} ${i.telefono||''} ${i.email||''} ${i.pasaporte||''} ${i.eventoNombre||''} ${i.puertaHall||''} ${i.tipoCarga||''}`.toLowerCase().includes(q));
  if(iF.fecha)items=items.filter(i=>i.entrada?.startsWith(iF.fecha));
  if(iF.hall)items=items.filter(i=>i.hall===iF.hall||((i.halls||[]).includes(iF.hall)));
  if(iF.activos)items=items.filter(i=>!i.salida);
  items=items.sort((a,b)=>(b.entrada||'').localeCompare(a.entrada||''));
  if(!window._subRestored_ingresos){window._subRestored_ingresos=true;const _ls=_loadSubTab('ingresos','lista');if(_ls)iF._sub=_ls;}const sub=iF._sub||'lista';const ev=getActiveEvent();
  document.getElementById('tab-ingresos').innerHTML=`
    <div class="subtab-bar" style="display:flex;align-items:center;gap:3px;padding:4px 0;flex-wrap:nowrap;min-height:34px;border-bottom:1px solid var(--border);margin-bottom:4px;overflow-x:auto;scrollbar-width:none">
      <span data-zone="L" style="display:inline-flex;gap:3px;flex-shrink:0">
      ${[['lista',tr('tabLista')],['listanegra',tr('tabSpecial')],['historial',tr('tabEdiciones')]].map(([s,l])=>`<button data-draggable data-zone="L" class="btn btn-sm ${sub===s?'btn-p':'btn-gh'}" onclick="iF._sub='${s}';_saveSubTab('ingresos','${s}');renderIngresos()">${l}</button>`).join('')}
      </span>
      <span data-zone="M" style="display:inline-flex;gap:3px;flex-shrink:0">
      ${canAdd()&&sub!=='campos'&&sub!=='columnas'?`<button data-draggable data-zone="M" class="btn btn-sm btn-p" style="font-weight:700" onclick="_ingSource='ingresos';openIngModal()">+ Referencia</button>`:''}
      </span>
      <div style="width:1px;height:20px;background:var(--border);flex-shrink:0;margin:0 4px"></div>
      <span data-zone="R" style="display:inline-flex;gap:3px;align-items:center;flex-shrink:0">
      ${[['columnas',tr('tabColumnas')],...(canCampos()?[['campos',tr('camposDise')]]:[])].map(([s,l])=>`<button data-draggable data-zone="R" class="btn btn-sm ${sub===s?'btn-p':'btn-gh'}" onclick="iF._sub='${s}';_saveSubTab('ingresos','${s}');renderIngresos()">${l}</button>`).join('')}
      </span>
      <span style="flex:1"></span>
      <span data-zone="R" style="display:inline-flex;gap:3px;align-items:center;flex-shrink:0">
      ${sub!=='historial'&&sub!=='campos'&&sub!=='columnas'?`<button class="btn btn-s btn-sm" title="Importar" onclick="if(!canImport()){toast(tr('sinPermiso'),'var(--red)');return;}document.getElementById('xlsxIng').click()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button><button class="btn btn-gh btn-sm" title="Plantilla" onclick="dlTemplateIng()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`:''}
      ${sub!=='historial'&&sub!=='campos'&&sub!=='columnas'&&canExport()?`<button class="btn btn-gh btn-sm" title="Excel" onclick="exportIngresos()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>`:''}
      ${sub!=='historial'&&sub!=='campos'&&sub!=='columnas'&&canClean()?`<button class="btn btn-sm" style="color:var(--red)" title=tr('limpiar') onclick="if(!confirm('¿Limpiar registros del día en Referencia?'))return;cleanTab('ingresos')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>`:''}
      </span>
    </div>
    ${sub!=='historial'&&sub!=='print'&&sub!=='campos'?`<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--border);padding-bottom:4px">
      <div class="sbox" style="flex:1;min-width:120px"><span class="sico">🔍</span><input type="search" placeholder="${tr('searchDash')}" value="${iF.q||''}" id="srch-ingresos" oninput="iF.q=this.value;debounceSearch('ingresos',renderIngresos)"></div>
      <input type="date" value="${iF.fecha||''}" oninput="iF.fecha=this.value;debounceSearch('ingresos-date',renderIngresos)" style="height:32px;padding:4px 8px;font-size:11px;box-sizing:border-box;width:auto;min-width:110px;max-width:130px">
      <span class="pill" style="border:1.5px solid ${iF.activos?'#4a5568':'var(--border)'};background:${iF.activos?'#4a5568':'var(--bg2)'};color:${iF.activos?'#fff':'var(--text3)'}" onclick="iF.activos=!iF.activos;renderIngresos()">${tr('soloActivos')}</span>
      ${iF.q||iF.fecha||iF.hall||iF.activos?`<span class="pill pill-r" onclick="iF={q:'',fecha:'',hall:'',activos:false,_sub:iF._sub||'lista'};renderIngresos()">✕</span>`:''}
      <span style="font-size:10px;color:var(--text3)">${items.length} ${tr('regLabel')}</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px">
      <span class="pill" style="font-size:10px;font-weight:700;padding:3px 8px;border:1.5px solid ${!iF.hall?'#7dd3fc':'#c8cacc'};background:var(--bg3);color:var(--text2);cursor:pointer" onclick="iF.hall='';renderIngresos()">${tr('all')}</span>
      ${getRecintoHalls().map(h=>`<span class="pill" style="font-size:10px;font-weight:700;padding:3px 8px;background:${iF.hall===h?'#4a5568':'#e8eaed'};color:${iF.hall===h?'#f7f7f7':'var(--text2)'};border:1.5px solid ${iF.hall===h?'#4a5568':'#c8cacc'};cursor:pointer" onclick="iF.hall='${h}';renderIngresos()">${h}</span>`).join('')}
    </div>`:''}
    ${sub==='lista'?_ingLista(items):sub==='listanegra'?_ingLN():sub==='historial'?_ingHistorial('ingresos'):sub==='campos'?renderCamposSubtab('ingresos'):sub==='columnas'?renderColVisSub('ingresos'):sub==='print'?_ingPrintCfg('ing1'):_ingLista(items)}`;
  if(sub==='print'){iF._sub='lista';goTab('impresion',null);window._impSub='ing1';renderImpresion();return;}
}

function _ingLista(items){
  const s=getSort('ingresos');
  items=sortArr(items,s.col||'pos',s.dir||'desc');
  return`
  ${items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr>${thSort('ingresos','pos','#')}${thSort('ingresos','matricula','Matrícula')}${_isColVisible('ingresos','llamador')?thSort('ingresos','llamador','Llamador'):''}${_isColVisible('ingresos','referencia')?thSort('ingresos','referencia','Ref'):''}${_isColVisible('ingresos','nombre')?thSort('ingresos','nombre','Conductor/Empresa'):''}${_isColVisible('ingresos','telefono')?thSort('ingresos','telefono','Tel.'):''}${_isColVisible('ingresos','hall')?'<th>'+tr('hall')+'</th>':''}${_isColVisible('ingresos','stand')?'<th>'+tr('stand')+'</th>':''}${_isColVisible('ingresos','evento')?'<th style="font-size:10px">'+tr('evento')+'</th>':''}${thSort('ingresos','salida','Estado')}${_isColVisible('ingresos','entrada')?thSort('ingresos','entrada','Entrada'):''}<th>${tr('acciones')}</th></tr></thead><tbody>
    ${items.map(i=>{const _evN=i.eventoNombre||'';const _tev=getTabEvent('ingresos');const _isAlt=_evN&&_tev&&_evN!==_tev.nombre;return`<tr style="${_isAlt?'background:#f0f7ff':''}">
      <td style="font-weight:700;color:var(--text3)">${i.pos||''}</td>
      <td><span class="mchip" style="cursor:pointer" onclick="showIngDetalle('${i.id}')" title="Ver detalle">${i.matricula}</span>${i.remolque?`<br><span class="mchip-sm">${i.remolque}</span>`:''}</td>
      ${_isColVisible('ingresos','llamador')?`<td style="font-size:11px">${i.llamador||'–'}</td>`:''}
      ${_isColVisible('ingresos','referencia')?`<td style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text3)">${i.referencia||'–'}</td>`:''}
      ${_isColVisible('ingresos','nombre')?`<td><b style="font-size:12px">${i.nombre||''} ${i.apellido||''}</b>${i.empresa?`<br><span style="font-size:11px;color:var(--text3)">${i.empresa}</span>`:''}</td>`:''}
      ${_isColVisible('ingresos','telefono')?`<td>${telLink(i.telPais||'',i.telefono||'')}</td>`:''}
      ${_isColVisible('ingresos','hall')?`<td>${(i.halls||[i.hall||'']).filter(Boolean).map(h=>hBadge(h)).join(' ')||'–'}</td>`:''}${_isColVisible('ingresos','stand')?`<td style="font-size:11px">${i.stand||'–'}</td>`:''}
      ${_isColVisible('ingresos','evento')?`<td style="font-size:9px;color:var(--text3);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${i.eventoNombre||''}">${i.eventoNombre?i.eventoNombre.slice(0,12):'–'}</td>`:''}
      <td>${!i.salida?'<span class="pill pill-g">✓ En recinto</span>':`<span style="font-size:10px;color:var(--text3)">↩ ${fmt(i.salida,'t')}</span>`}</td>
      ${_isColVisible('ingresos','entrada')?`<td style="font-size:11px;white-space:nowrap">${fmt(i.entrada)}</td>`:''}
      <td><div style="display:flex;gap:2px;flex-wrap:wrap">
        <button class="btn btn-gh btn-xs" onclick="printIngreso('${i.id}')" title="Imprimir Normal">🖨</button>
        <button class="btn btn-xs" style="background:#4a5568;color:#f7f7f7;border-radius:20px" title="Imprimir Troquelado A4" onclick="printTrqRef('${i.id}')">✂</button>
        ${canEdit()?`<button class="btn btn-edit btn-xs" onclick="_ingSource='ingresos';openIngModal(DB.ingresos.find(x=>x.id==='${i.id}'))">✏️</button>`:''}
        ${!i.salida&&canStatus()?`<button class="btn btn-warning btn-xs" onclick="marcarSalidaIng('${i.id}')">↩ Salida</button><button class="btn btn-xs" style="background:#4a5568;color:#fff" title="Registrar paso tracking" onclick="registrarPasoTracking('${i.id}','ingresos')">📡</button>`:''}
        ${i.salida&&canStatus()?`<button class="btn btn-success btn-xs" onclick="reactivarIngreso('${i.id}')" title="Reactivar / Error salida">↺</button>`:''}
        ${canDel()?`<button class="btn btn-danger btn-xs" onclick="askDelIng('${i.id}')">🗑</button>`:''}
      </div></td>
    </tr>`;}).join('')}
  </tbody></table></div>`:`<div class="empty"><div class="ei">🚦</div><div class="et">${DB.ingresos.length?'Sin resultados':'Sin ingresos registrados'}</div></div>`}`;}

function _ingEspera(){
  const items=DB.enEspera.filter(e=>e.estado==='pendiente').sort((a,b)=>{const p={urgente:0,alta:1,normal:2};return(p[a.prioridad]||2)-(p[b.prioridad]||2);});
  return`<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:5px 10px;margin-bottom:4px;font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px">🔗 <b>${tr('datosCompartidos')}</b></div>
  <div class="sec-act" style="margin-bottom:10px">${canAdd()?`<button class="btn btn-p btn-sm" onclick="openEEModal()">+ En espera</button>`:''}</div>
  <div class="sg sg3" style="margin-bottom:10px">
    <div class="stat-box" style="border-top:#3a4558">${items.length}</div><div class="stat-l">⏳ Pendientes</div></div>
    <div class="stat-box" style="border-top:3px solid #3a4558"><div class="stat-n" style="color:#4a5568">${DB.enEspera.filter(e=>e.estado==='llegado').length}</div><div class="stat-l">✅ Llegados</div></div>
    <div class="stat-box"><div class="stat-n" style="color:var(--text3)">${DB.enEspera.filter(e=>e.estado==='cancelado').length}</div><div class="stat-l">❌ Cancelados</div></div>
  </div>
  ${items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr><th>${tr('matricula')}</th><th>${tr('prioridad')}</th><th>${tr('thDriver')}</th><th>${tr('empresa')}</th><th>${tr('hall')}</th><th>${tr('hora')}</th><th>${tr('acciones')}</th></tr></thead><tbody>
    ${items.map(e=>`<tr><td><span class="mchip">${e.matricula}</span></td>
      <td><span style="font-size:11px;font-weight:800;color:${e.prioridad==='urgente'?'var(--red)':e.prioridad==='alta'?'var(--amber)':'var(--text3)'}">${e.prioridad==='urgente'?'🔴':e.prioridad==='alta'?'🔶':'●'} ${e.prioridad}</span></td>
      <td style="font-size:11px">${e.conductor||'–'}</td><td style="font-size:11px">${e.empresa||'–'}</td><td>${hBadge(e.hall)}</td><td style="font-size:11px">${e.hora||fmt(e.ts,'t')}</td>
      <td><div style="display:flex;gap:2px">
        ${canAdd()?`<button class="btn btn-success btn-xs" onclick="marcarEELlegado('${e.id}')">✅</button>`:''}
        ${canEdit()?`<button class="btn btn-edit btn-xs" onclick="openEEModal(DB.enEspera.find(x=>x.id==='${e.id}'))">✏️</button>`:''}
        ${canDel()?`<button class="btn btn-danger btn-xs" onclick="askDelEE('${e.id}')">🗑</button>`:''}
      </div></td></tr>`).join('')}
  </tbody></table></div>`:`<div class="empty"><div class="ei">⏳</div><div class="et"><span id="lbl_waitingEmpty">${tr('waitingEmpty')}</span></div></div>`}`;}

function _ingLN(){
  const items=DB.listaNegra;
  return`<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:5px 10px;margin-bottom:4px;font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px">🔗 <b>${tr('datosCompartidos')}</b></div>
  <div class="sec-act" style="margin-bottom:10px">${canSpecial()?`<button class="btn btn-r btn-sm" onclick="openLNModal()"><span id="lbl_addPlate">${tr('addPlate')}</span></button>`:''} ${canExport()?`<button class="btn btn-gh btn-sm" onclick="exportListaNegra()" title="Excel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>`:''}</div>
  <div class="sg sg3" style="margin-bottom:10px">
    <div class="stat-box" style="border-top:3px solid var(--red)"><div class="stat-n" style="color:var(--red)">${items.filter(i=>i.nivel==='bloqueo').length}</div><div class="stat-l">🚫 Bloqueadas</div></div>
    <div class="stat-box" style="border-top:3px solid var(--amber)"><div class="stat-n" style="color:var(--amber)">${items.filter(i=>i.nivel==='alerta').length}</div><div class="stat-l">⚠️ Alertas</div></div>
    <div class="stat-box"><div class="stat-n">${items.length}</div><div class="stat-l">${tr('today')}</div></div>
  </div>
  ${items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr><th>${tr('matricula')}</th><th>${tr('nivel')}</th><th>${tr('lblMotivo')}</th><th>${tr('empresa')}</th><th>${tr('lblValidUntil')}</th><th>${tr('acciones')}</th></tr></thead><tbody>
    ${items.map(ln=>`<tr><td><span class="mchip">${ln.matricula}</span></td>
      <td><span style="font-weight:800;color:${ln.nivel==='bloqueo'?'var(--red)':'var(--amber)'}">${ln.nivel==='bloqueo'?'🚫 BLOQUEO':'⚠️ ALERTA'}</span></td>
      <td style="font-size:11px">${ln.motivo||'–'}</td><td style="font-size:11px">${ln.empresa||'–'}</td><td style="font-size:11px">${ln.hasta||'–'}</td>
      <td><div style="display:flex;gap:2px">${canSpecial()?`<button class="btn btn-edit btn-xs" onclick="openLNModal(DB.listaNegra.find(x=>x.id==='${ln.id}'))">✏️</button>`:''} ${canDel()?`<button class="btn btn-danger btn-xs" onclick="askDelLN('${ln.id}')">🗑</button>`:''}</div></td>
    </tr>`).join('')}
  </tbody></table></div>`:`<div class="empty"><div class="ei">🚫</div><div class="et"><span id="lbl_specialEmpty">${tr('specialEmpty')}</span></div></div>`}`;}

function showIngDetalle(id,source){
  const col=source||'ingresos';
  const i=(DB[col]||[]).find(x=>x.id===id);if(!i){showIngDetalleBase(id);return;}
  document.getElementById('mIngDetailTitle').textContent='🚛 '+i.matricula+(i.pos?' · Pos.'+i.pos:'')+(source==='ingresos2'?' [Ingresos libre]':'');
  document.getElementById('mIngDetailPrint').onclick=()=>{const _ck=source==='ingresos2'?'ing2':'ing1';_printWithActiveTpl(_ck,i,source==='ingresos2',_ck,'normal');};
  const trqBtn=document.getElementById('mIngDetailPrintTrq');if(trqBtn)trqBtn.onclick=()=>{const cfgK=source==='ingresos2'?'ing2':'ing1';const mode=(DB.printCfgModes||{})[cfgK]||'normal';if(mode==='normal')printIngresoFromObj(i,source==='ingresos2');else{const _o=Object.assign({},i);_o._isLib=source==='ingresos2';printIngresoTroquelado(_o);}};
  document.getElementById('mIngDetailEdit').onclick=()=>{closeOv('mIngDetail');if(source==='ingresos2')openIngModal2(i);else openIngModal(i);};
  document.getElementById('mIngDetailPrint').style.display='';
  document.getElementById('mIngDetailEdit').style.display='';
  const halls=i.halls||[i.hall||''];
  document.getElementById('mIngDetailBody').innerHTML=`
    <div class="sg sg3" style="margin-bottom:6px">
      <div class="stat-box" style="border-top:#3a4558;grid-column:span 2"><div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:900;color:#4a5568">${i.matricula}</div>${i.remolque?`<div style="font-size:11px;color:var(--text3);margin-top:3px">Remolque: <b>${i.remolque}</b></div>`:''}<div class="stat-l" style="margin-top:3px">${halls.map(h=>hBadge(h)).join(' ')}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
      ${[['👤 Nombre',i.nombre+' '+i.apellido],['🏢 Empresa',i.empresa],['📞 Teléfono',(i.telPais||'')+' '+(i.telefono||'')],['📍 Stand',i.stand],['📞 Llamador',i.llamador],['🔖 Referencia',i.referencia],['🔧 Montador',i.montador],['🎪 Expositor',i.expositor],['🚚 Remolque',i.remolque],['🪪 Pasaporte/DNI',i.pasaporte],['✉️ Email',i.email],['📅 Evento',i.eventoNombre],['🕐 Entrada',fmt(i.entrada)],['↩ Salida',i.salida?fmt(i.salida):'En recinto'],['👤 Creado por',i.creadoPor]].map(([l,v])=>v&&v.trim&&v.trim()?`<div style="padding:5px 8px;background:var(--bg3);border-radius:var(--r)"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:1px">${l}</div><div style="font-weight:600">${v}</div></div>`:'').join('')}
      ${i.comentario?`<div style="grid-column:1/-1;padding:5px 8px;background:var(--bg3);border-radius:var(--r)"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:1px">📝 Comentario</div><div>${i.comentario}</div></div>`:''}
    </div>
    ${!i.salida?'<div style="margin-top:10px;background:var(--gll);border:1.5px solid #bbf7d0;border-radius:var(--r);padding:8px 12px;font-weight:700;color:#4a5568;font-size:13px">✓ En recinto</div>':'<div style="margin-top:10px;background:var(--bg3);border-radius:var(--r);padding:8px 12px;font-size:12px;color:var(--text3)">↩ Salida: '+fmt(i.salida)+'</div>'}`;
  document.getElementById('mIngDetail').classList.add('open');
}

function showIngDetalleBase(id){
  // fallback: buscar en ambas colecciones
  const i=DB.ingresos.find(x=>x.id===id)||(DB.ingresos2||[]).find(x=>x.id===id);
  if(!i)return;
  const src=DB.ingresos.find(x=>x.id===id)?undefined:'ingresos2';
  showIngDetalle(id,src);
}

function openIngModal(i){
  editIngId=i?i.id:null;blkOverrideData=null;
  document.getElementById('mIngTitle').textContent=i?tr('editRecord'):tr('newRecord');
  document.getElementById('btnIngLbl').textContent=i?tr('save'):tr('registerEntry');
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  set('fiId',i?.id);set('fiMat',i?.matricula);set('fiLlamador',i?.llamador);set('fiRef',i?.referencia);
  // Manage mat tag
  const _tag=document.getElementById('fiMatTag');if(_tag)_tag.style.display='none';
  if(i?.matricula){
    const _tc=DB.conductores.find(cd=>cd.matricula===i.matricula);
    if(_tc)setMatTag('👤',_tc.nombre+' '+_tc.apellido,_tc.empresa);
    else if(i.nombre)setMatTag('📋',`${i.nombre||''} ${i.apellido||''}`.trim(),i.empresa||'','ing');
  }
  set('fiEmp',i?.empresa);set('fiMontador',i?.montador);set('fiExpositor',i?.expositor);
  set('fiStand',i?.stand);set('fiPuertaHall',i?.puertaHall);set('fiRem',i?.remolque);set('fiNom',i?.nombre);set('fiApe',i?.apellido);
  set('fiPas',i?.pasaporte);set('fiFechaNac',i?.fechaNacimiento);set('fiFechaExp',i?.fechaExpiracion);set('fiPais',i?.pais);
  set('fiTelP',i?.telPais||'+34');set('fiTel',i?.telefono);set('fiEmail',i?.email);
  set('fiComent',i?.comentario);set('fiCarga',i?.tipoCarga||'');set('fiRegRXL',i?.regRXL||'');set('fiSOT',i?.oficinaSot||'');set('fiTipoVeh',i?.tipoVehiculo||'');set('fiDescarga',i?.descargaTipo||'');
  // Posición
  const posEl=document.getElementById('fiPos');
  if(posEl)posEl.value=i?.pos||'';
  // Multi-hall — guardar halls del ingreso para restaurar tras cambios de evento
  // Importante: i.halls puede ser [] vacío (importado sin halls), en ese caso usar i.hall
  const _hallsToRestore=(i?.halls&&i.halls.length)?[...i.halls]:(i?.hall?[i.hall]:[]);
  _fiHalls=[..._hallsToRestore];
  renderHallTags();
  // Evento de trabajo del usuario como default — set selector
  const _evSel=document.getElementById('fiEventoId');
  if(_evSel){
    if(i?.eventoId)_evSel.value=i.eventoId;
    else{const _defEv=getUserWorkEventId()||DB.defaultEventId||'';_evSel.value=_defEv;}
  }
  document.getElementById('fiHistorial').style.display='none';
  document.getElementById('fiBlkWarn').style.display='none';
  document.getElementById('fiEspMatch').style.display='none';
  const _am=document.getElementById('fiAgendaMatch');if(_am)_am.style.display='none';
  window._fiAgendaMatchId=null;
  const _cs=document.getElementById('fiChoferSearch');if(_cs)_cs.value='';
  const _cr=document.getElementById('fiChoferResults');if(_cr)_cr.classList.remove('open');
  // Also clear mat tag and results
  const _mt=document.getElementById('fiMatTag');if(_mt)_mt.style.display='none';
  const _mr=document.getElementById('fiMatResults');if(_mr)_mr.classList.remove('open');
  fillLangIng();if(document.getElementById('fiLang'))document.getElementById('fiLang').value=i?.lang||CU?.lang||'es';updatePhrasePreview();
  syncToggleButtons();fillPuertaSelect();if(i?.puerta)set('fiPuerta',i.puerta);
  const _cfgK=_ingSource==='ingresos2'?'ing2':'ing1';
  initPrintLayout(_cfgK);
  // Restore saved print mode visual state
  setTimeout(()=>{
    const saved=(DB.printCfgModes||{})[_cfgK]||'normal';
    setFormPrintMode(saved);
  },50);
  applyEventFieldVisibility();
  applyIngFormFieldVisibility();
  // Restaurar halls del ingreso original — applyEventFieldVisibility puede
  // disparar onFormEventoChange que llama renderHallTags con _fiHalls vacío
  if(_hallsToRestore.length&&!_fiHalls.length){
    _fiHalls=[..._hallsToRestore];
    renderHallTags();
  }
  document.getElementById('mIng').classList.add('open');
  // Mostrar/ocultar botón OCR según permiso
  const _ocrBtn=document.getElementById('btnOcrCam');if(_ocrBtn)_ocrBtn.style.display=canOcr()?'inline-flex':'none';
  // Disparar buscador de referencia tras abrir el modal (el campo ya tiene valor)
  setTimeout(()=>{
    const _refVal=(document.getElementById('fiRef')?.value||'').trim();
    if(_refVal.length>=2)searchRefAutoComplete(_refVal);
  },150);
}

function renderHallTags(){
  const tagsEl=document.getElementById('fiHallTags');
  const inpEl=document.getElementById('fiHallInput');
  if(!tagsEl)return;
  tagsEl.innerHTML=_fiHalls.map((h,i)=>{
    const ev=getFormEvento();
    const evHalls=ev?.halls||[];
    return`<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;background:var(--bll);color:#4a5568;border:1px solid var(--border);cursor:pointer">${h} <span onclick="removeHall(${i})" style="margin-left:2px;font-size:12px;opacity:.7">×</span></span>`;
  }).join('');
  const hid=document.getElementById('fiHall');if(hid)hid.value=_fiHalls[0]||'';
  if(inpEl)inpEl.value='';
  document.getElementById('fiHallResults')?.classList.remove('open');
}

function removeHall(idx){_fiHalls.splice(idx,1);renderHallTags();}

function filterHallSuggestions(q){
  const res=document.getElementById('fiHallResults');
  const ev=getFormEvento();
  const evHalls=ev?.halls||[];
  // Usar halls del evento activo, o del recinto vinculado
  let allOpts=[];
  if(evHalls.length)allOpts=[...evHalls];
  else if(ev?.recintoId){const r=DB.recintos.find(x=>x.id===ev.recintoId);if(r&&r.halls)allOpts=[...r.halls];}
  const filtered=allOpts.filter(h=>(!q||h.toLowerCase().includes(q.toLowerCase()))&&!_fiHalls.includes(h));
  // Si el usuario escribe algo que no está en la lista del evento, permitirlo igualmente
  if(q&&q.trim()&&!allOpts.includes(q.trim().toUpperCase())&&!allOpts.includes(q.trim())&&!_fiHalls.includes(q.trim())){
    filtered.push(q.trim());
  }
  if(!filtered.length){res.classList.remove('open');return;}
  res.innerHTML=filtered.map(h=>`<div class="dr-item" onmousedown="addHall('${h}')">🚪 ${h}</div>`).join('');
  res.classList.add('open');
}

function addHall(h){
  if(!_fiHalls.includes(h)){_fiHalls.push(h);}
  renderHallTags();
  const inp=document.getElementById('fiHallInput');if(inp)inp.value='';
  document.getElementById('fiHallResults')?.classList.remove('open');
}

function checkMatOnInput(mat){
  if(!mat||mat.length<2)return;
  const matU=mat.toUpperCase();

  // ── 1. Buscar en Base de Matrículas (vehiculos DB) ──
  const veh=(DB.vehiculos||[]).find(v=>v.matricula===matU);

  // ── 2. Historial combinado: ingresos + ingresos2 ──
  const allIngs=[...DB.ingresos,...(DB.ingresos2||[])];
  const hist=allIngs.filter(i=>i.matricula===matU)
    .sort((a,b)=>(b.entrada||'').localeCompare(a.entrada||'')).slice(0,5);

  const hEl=document.getElementById('fiHistorial'),hList=document.getElementById('fiHistList');
  if(hist.length||veh){
    hEl.style.display='block';
    let html='';
    // Ficha de la base de matrículas (si existe)
    if(veh){
      const wasInIng1=DB.ingresos.some(i=>i.matricula===matU);
      const wasInIng2=(DB.ingresos2||[]).some(i=>i.matricula===matU);
      const srcLabel=(wasInIng1&&wasInIng2)?'Referencia + Ingresos':wasInIng2?'Ingresos':'Booking';
      html+=`<div style="background:var(--bll);border:1.5px solid var(--border);border-radius:var(--r);padding:7px 10px;margin-bottom:5px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;font-weight:900;color:#4a5568;text-transform:uppercase;margin-bottom:2px">🚛 En base de matrículas · ${srcLabel}</div>
          <div style="font-size:13px;font-weight:700">${veh.nombre||'–'}</div>
          <div style="font-size:11px;color:var(--text3)">${veh.empresa||''} ${veh.telefono?'· 📞 '+veh.telefono:''}</div>
        </div>
        <div style="margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:3px">
          <span style="font-size:10px;font-weight:700;color:var(--text3)">${veh.ingresos||0} ingresos previos</span>
          <button class="btn btn-p btn-xs" onmousedown="autoFillFromVeh('${veh.matricula}')">⚡ Autocompletar</button>
        </div>
      </div>`;
    }
    // Historial de ingresos anteriores
    if(hist.length){
      html+=`<div style="font-size:10px;font-weight:700;color:var(--text3);margin-bottom:4px">🚛 Ingresos anteriores — clic para cargar datos:</div>`;
      html+=hist.map(i=>{
        const src=(DB.ingresos2||[]).find(x=>x.id===i.id)?'<span style="font-size:9px;background:var(--bg4);padding:1px 4px;border-radius:3px">Ing.2</span>':'';
        return`<div class="hist-row" onclick="autoFillFromHist('${i.id}')">
          📋 <b>${i.nombre||''} ${i.apellido||''}</b> · ${i.empresa||''} ${hBadge(i.hall)}
          ${src} <span style="margin-left:auto;font-size:10px">${fmt(i.entrada,'d')}</span>
        </div>`;
      }).join('');
    }
    hList.innerHTML=html;
  } else {
    hEl.style.display='none';
  }

  // ── 3. Especial ──
  const ln=checkBL(matU),wEl=document.getElementById('fiBlkWarn');
  if(ln){
    wEl.style.display='block';
    wEl.style.borderColor=ln.nivel==='bloqueo'?'var(--red)':'var(--amber)';
    wEl.style.background=ln.nivel==='bloqueo'?'var(--rll)':'var(--all)';
    document.getElementById('fiBlkMsg').textContent=ln.nivel==='bloqueo'?'🚫 MATRÍCULA BLOQUEADA':'⚠️ MATRÍCULA CON ALERTA';
    document.getElementById('fiBlkDet').textContent='Motivo: '+ln.motivo+' | '+ln.nivel.toUpperCase();
  } else wEl.style.display='none';

  // ── 4. En espera ──
  const ee=checkEE(matU),eEl=document.getElementById('fiEspMatch');
  if(ee){
    eEl.style.display='block';
    document.getElementById('fiEspDet').textContent=(ee.conductor||'–')+' · '+(ee.empresa||'–')+' · Hall '+(ee.hall||'?');
    [['fiNom',ee.conductor],['fiEmp',ee.empresa],['fiHall',ee.hall],['fiRef',ee.booking],['fiTel',ee.telefono]]
      .forEach(([id,v])=>{const el=document.getElementById(id);if(el&&v&&!el.value)el.value=v;});
  } else eEl.style.display='none';
}

function autoFillFromHist(id){if(!_autoFillOn)return;
  const i=DB.ingresos.find(x=>x.id===id)||(DB.ingresos2||[]).find(x=>x.id===id);if(!i)return;
  const set=(eid,v)=>{const el=document.getElementById(eid);if(el&&v!=null&&v!=='')el.value=v;};
  set('fiNom',i.nombre);set('fiApe',i.apellido);set('fiEmp',i.empresa);
  set('fiMontador',i.montador);set('fiExpositor',i.expositor);
  set('fiStand',i.stand);set('fiPuertaHall',i.puertaHall);
  set('fiRem',i.remolque);set('fiPas',i.pasaporte);
  set('fiPais',i.pais);set('fiFechaNac',i.fechaNacimiento);set('fiFechaExp',i.fechaExpiracion);
  set('fiTelP',i.telPais||'+34');set('fiTel',i.telefono);
  set('fiEmail',i.email);set('fiLlamador',i.llamador);
  if(i.tipoVehiculo){document.getElementById('fiTipoVeh').value=i.tipoVehiculo;syncToggleButtons();}
  if(i.descargaTipo)document.getElementById('fiDescarga').value=i.descargaTipo;
  if(i.lang&&document.getElementById('fiLang'))document.getElementById('fiLang').value=i.lang;
  if(i.halls&&i.halls.length){_fiHalls=[...i.halls];renderHallTags();}
  else if(i.hall){_fiHalls=[i.hall];renderHallTags();}
  updatePhrasePreview();
  document.getElementById('fiHistorial').style.display='none';
  toast('📋 Historial autocompletado','#4a5568');
}

function searchMatUnified(q){
  const res=document.getElementById('fiMatResults');
  if(!res){return;}
  if(!_autoFillOn){res.classList.remove('open');return;}
  if(!q||q.length<3){res.classList.remove('open');return;}
  const ql=q.toLowerCase();
  const items=[];
  // 1. Conductores — coincide matrícula, nombre, apellido o empresa
  const seenCond=new Set();
  DB.conductores.forEach(cd=>{
    const haystack=`${cd.matricula||''} ${cd.nombre||''} ${cd.apellido||''} ${cd.empresa||''}`.toLowerCase();
    if(haystack.includes(ql)&&!seenCond.has(cd.id)){
      seenCond.add(cd.id);
      items.push({
        mat:cd.matricula||'',
        nombre:`${cd.nombre||''} ${cd.apellido||''}`.trim(),
        empresa:cd.empresa||'',
        sub:cd.remolque?`🚚 ${cd.remolque}`:'',
        src:'chofer',id:cd.id,date:''
      });
    }
  });
  // 2. Historial (ingresos) — por matrícula, si no está ya cubierto por conductor
  const seenMat=new Set(items.filter(i=>i.src==='chofer').map(i=>i.mat));
  const seenIng=new Set();
  [...DB.ingresos,...(DB.ingresos2||[])].sort((a,b)=>(b.entrada||'').localeCompare(a.entrada||'')).forEach(i=>{
    if(!i.matricula)return;
    const mat=i.matricula.toUpperCase();
    const haystack=`${mat} ${i.nombre||''} ${i.apellido||''} ${i.empresa||''}`.toLowerCase();
    if(haystack.includes(ql)&&!seenIng.has(i.id)&&!seenMat.has(mat)){
      seenIng.add(i.id);seenMat.add(mat);
      items.push({
        mat,
        nombre:`${i.nombre||''} ${i.apellido||''}`.trim(),
        empresa:i.empresa||'',
        sub:`${i.eventoNombre||''} ${(i.halls||[]).join('/')||i.hall||''}`.trim(),
        src:'ing',id:i.id,
        date:i.entrada?i.entrada.slice(0,10):''
      });
    }
  });
  // 3. DB.vehiculos — vehículos del Historial que no estén ya cubiertos por ingresos/conductores
  (DB.vehiculos||[]).forEach(v=>{
    if(!v.matricula)return;
    const mat=v.matricula.toUpperCase();
    if(seenMat.has(mat))return; // ya cubierto
    const haystack=`${mat} ${v.nombre||''} ${v.empresa||''}`.toLowerCase();
    if(haystack.includes(ql)){
      seenMat.add(mat);
      const parts=(v.nombre||'').trim().split(/\s+/);
      items.push({
        mat,
        nombre:v.nombre||'',
        empresa:v.empresa||'',
        sub:`${v.ingresos||0} ingresos · ${v.ultimoIngreso?v.ultimoIngreso.slice(0,10):''}`.trim(),
        src:'veh',id:mat,
        date:v.ultimoIngreso?v.ultimoIngreso.slice(0,10):''
      });
    }
  });
  if(!items.length){res.classList.remove('open');return;}
  res.innerHTML=items.slice(0,9).map(it=>`<div class="dr-item" onmousedown="selectMatUnified('${it.src}','${it.id||it.mat}')" style="${it.src==='chofer'?'border-left:#3a4558;background:var(--bll);':''}">
    <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
      <b style="font-family:'JetBrains Mono',monospace;font-size:13px">${it.mat||'–'}</b>
      <span style="font-size:10px;font-weight:800;padding:1px 5px;border-radius:3px;${it.src==='chofer'?'background:#e8eaed;color:#1e40af':it.src==='veh'?'background:#e8ede8;color:#166534':'background:#f3f4f6;color:#374151'}">${it.src==='chofer'?'👤 Conductor':it.src==='veh'?'📜 Historial':'📋 Ingreso'}</span>
      ${it.date?`<span style="font-size:10px;color:var(--text4)">${it.date}</span>`:''}
    </div>
    <div style="font-size:12px;font-weight:600;color:var(--text)">${it.nombre||'–'}</div>
    <div style="font-size:11px;color:var(--text3)">${it.empresa}${it.sub?' · '+it.sub:''}</div>
  </div>`).join('');
  res.classList.add('open');
}

function searchMatAutoComplete(q){searchMatUnified(q);}

function selectMatUnified(src,id){
  const res=document.getElementById('fiMatResults');
  if(res)res.classList.remove('open');
  // Recoger datos del candidato para mostrar confirmación
  let preview={mat:'',nombre:'',empresa:'',telefono:'',remolque:'',src};
  if(src==='chofer'){
    const cd=DB.conductores.find(x=>x.id===id);
    if(!cd)return;
    preview={mat:cd.matricula||'',nombre:`${cd.nombre||''} ${cd.apellido||''}`.trim(),empresa:cd.empresa||'',telefono:(cd.telPais||'')+' '+(cd.telefono||''),remolque:cd.remolque||'',src,id};
  } else if(src==='ing'){
    const ing=[...DB.ingresos,...(DB.ingresos2||[])].find(i=>i.id===id);
    if(!ing)return;
    preview={mat:ing.matricula||'',nombre:`${ing.nombre||''} ${ing.apellido||''}`.trim(),empresa:ing.empresa||'',telefono:(ing.telPais||'')+' '+(ing.telefono||''),remolque:ing.remolque||'',src,id};
  } else {
    // src==='veh' — id es la matrícula
    const v=(DB.vehiculos||[]).find(x=>x.matricula===id);
    const allIngs=[...DB.ingresos,...(DB.ingresos2||[])];
    const last=allIngs.filter(i=>i.matricula===id).sort((a,b)=>(b.entrada||'').localeCompare(a.entrada||''))[0];
    preview={mat:id,nombre:last?`${last.nombre||''} ${last.apellido||''}`.trim():v?.nombre||'',empresa:last?.empresa||v?.empresa||'',telefono:last?(last.telPais||'')+' '+(last.telefono||''):'',remolque:last?.remolque||'',src,id};
  }
  _showMatConfirm(preview);
}

function _showMatConfirm(p){
  // Usar el modal mDel repropuesto — no, usar un toast-confirm inline propio
  const campos=[
    ['🚛 Matrícula',p.mat,'font-family:JetBrains Mono,monospace;font-weight:900;font-size:15px'],
    ['👤 Conductor',p.nombre,'font-weight:700'],
    ['🏢 Empresa',p.empresa,''],
    ['📱 Teléfono',p.telefono,'font-family:JetBrains Mono,monospace'],
    ['🚚 Remolque',p.remolque,'font-family:JetBrains Mono,monospace'],
  ].filter(([,v])=>v&&String(v).trim()&&String(v).trim()!=='+34 '&&String(v).trim()!=='+34');
  const srcLabel={chofer:'👤 Conductores',ing:'📋 Historial de ingresos',veh:'📜 Registro de vehículos'}[p.src]||'';
  const html=`<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Encontrado en ${srcLabel}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:12px">
      ${campos.map(([l,v,s])=>`<div style="background:var(--bg3);border-radius:4px;padding:5px 8px"><div style="font-size:9px;font-weight:700;color:var(--text3);margin-bottom:1px">${l}</div><div style="${s}">${esc(String(v))}</div></div>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:0">¿Absorber estos datos en el formulario?</div>`;
  askDel('Confirmar datos a absorber',html,()=>{_doAbsorbMat(p);},'⬇ Absorber','#4a5568');
}

function _doAbsorbMat(p){
  const {src,id,mat}=p;
  if(src==='chofer'){
    const cd=DB.conductores.find(x=>x.id===id);
    if(cd){
      document.getElementById('fiMat').value=cd.matricula||'';
      checkMatOnInput(cd.matricula||'');
      fillChoferIng(cd.id);
      setMatTag('👤',cd.nombre+' '+cd.apellido,cd.empresa,'chofer');
    }
  } else if(src==='ing'){
    const ing=[...DB.ingresos,...(DB.ingresos2||[])].find(i=>i.id===id);
    if(ing){
      document.getElementById('fiMat').value=ing.matricula||'';
      checkMatOnInput(ing.matricula||'');
      autoFillFromHist(ing.id);
      setMatTag('📋',`${ing.nombre||''} ${ing.apellido||''}`.trim(),ing.empresa||'','ing');
    }
  } else {
    // veh
    document.getElementById('fiMat').value=mat;
    checkMatOnInput(mat);
    const allIngs=[...DB.ingresos,...(DB.ingresos2||[])];
    const last=allIngs.filter(i=>i.matricula===mat).sort((a,b)=>(b.entrada||'').localeCompare(a.entrada||''))[0];
    if(last){
      autoFillFromHist(last.id);
      setMatTag('📋',`${last.nombre||''} ${last.apellido||''}`.trim(),last.empresa||'','ing');
    } else {
      autoFillFromVeh(mat);
      const v=(DB.vehiculos||[]).find(x=>x.matricula===mat);
      if(v)setMatTag('📜',v.nombre||mat,v.empresa||'','veh');
    }
  }
  toast('✅ Datos absorbidos','#4a5568');
}

function setMatTag(icon,name,empresa,src){
  const tag=document.getElementById('fiMatTag');
  if(!tag)return;
  document.getElementById('fiMatTagIcon').textContent=icon;
  document.getElementById('fiMatTagName').textContent=name+(empresa?' · '+empresa:'');
  tag.style.display='flex';
  // Solo mostrar botón "Guardar en conductores" si viene de historial (no ya es conductor)
  const saveBtn=document.getElementById('fiMatTagSave');
  if(saveBtn)saveBtn.style.display=(src==='ing'||src==='veh')?'inline-block':'none';
}

function clearMatField(){
  const matEl=document.getElementById('fiMat');
  if(matEl)matEl.value='';
  const tag=document.getElementById('fiMatTag');if(tag)tag.style.display='none';
  const res=document.getElementById('fiMatResults');if(res)res.classList.remove('open');
  // Clear conductor-filled fields
  ['fiRem','fiNom','fiApe','fiEmp','fiTelP','fiTel','fiEmail','fiPas','fiPais','fiFechaNac','fiFechaExp'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=el.id==='fiTelP'?'+34':'';});
  document.getElementById('fiTipoVeh').value='';
  document.getElementById('fiDescarga').value='';
  syncToggleButtons();
  _fiHalls=[];renderHallTags();
  toast('🗑 Campos de conductor borrados','var(--text3)');
}

function fillFromMatSearch(mat,src,id){document.getElementById('fiMat').value=mat;document.getElementById('fiMatResults').classList.remove('open');checkMatOnInput(mat);if(src==='chofer'&&id){fillChoferIng(id);}else{const ing=[...DB.ingresos,...(DB.ingresos2||[])].find(i=>i.matricula===mat);if(ing){const set=(eid,v)=>{const el=document.getElementById(eid);if(el&&v)el.value=v;};set('fiRem',ing.remolque);set('fiNom',ing.nombre);set('fiApe',ing.apellido);set('fiEmp',ing.empresa);set('fiLlamador',ing.llamador);set('fiRef',ing.referencia);set('fiMontador',ing.montador);set('fiExpositor',ing.expositor);set('fiStand',ing.stand);set('fiPuertaHall',ing.puertaHall);set('fiTelP',ing.telPais||'+34');set('fiTel',ing.telefono);set('fiEmail',ing.email);set('fiPas',ing.pasaporte);set('fiPais',ing.pais);set('fiFechaNac',ing.fechaNacimiento);set('fiFechaExp',ing.fechaExpiracion);if(ing.tipoVehiculo){document.getElementById('fiTipoVeh').value=ing.tipoVehiculo;syncToggleButtons();}if(ing.lang&&document.getElementById('fiLang'))document.getElementById('fiLang').value=ing.lang;if(ing.halls&&ing.halls.length){_fiHalls=[...ing.halls];renderHallTags();}else if(ing.hall){_fiHalls=[ing.hall];renderHallTags();}updatePhrasePreview();toast('✅ Historial autocompletado','var(--text2)');}}}

function searchRefAutoComplete(q){
  const res=document.getElementById('fiRefResults');
  const panel=document.getElementById('fiAgendaMatch');
  if(!res)return;
  if(!q||q.length<2){
    res.classList.remove('open');
    if(panel)panel.style.display='none';
    return;
  }
  const ql=q.toLowerCase();
  const _workEvId=getUserWorkEventId();
  const agendaActiva=_workEvId?(DB.agenda||[]).filter(a=>a.eventoId===_workEvId):(DB.agenda||[]);
  if(!agendaActiva.length){res.classList.remove('open');if(panel)panel.style.display='none';return;}
  const found=agendaActiva.filter(a=>
    (a.referencia&&a.referencia.toLowerCase().includes(ql))||
    (a.matricula&&a.matricula.toLowerCase().includes(ql))||
    (a.conductor&&a.conductor.toLowerCase().includes(ql))
  ).slice(0,8);
  const exact=agendaActiva.find(a=>a.referencia&&a.referencia.toUpperCase()===q.toUpperCase());
  if(exact&&panel){window._fiAgendaMatchId=exact.id;_renderAgendaMatchPanel(exact);panel.style.display='block';}
  else if(panel){panel.style.display='none';}
  if(!found.length){res.classList.remove('open');return;}
  const evObj=id=>id?DB.eventos.find(e=>e.id===id):null;
  res.innerHTML=found.map(a=>{
    const ev=evObj(a.eventoId);
    const evPill=ev?`<span style="background:#fdf4ff;border:1px solid #f0abfc;border-radius:12px;padding:1px 7px;font-size:9px;font-weight:800;color:#86198f">${ev.ico||'📋'} ${ev.nombre}</span>`:'';
    return`<div class="dr-item" onmousedown="fillFromAgenda('${a.id}')">
      <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
        <b style="font-family:'JetBrains Mono',monospace">${esc(a.referencia||a.matricula||'')}</b>
        ${evPill}
        <span style="font-size:10px;color:var(--text3)">${a.fecha||''} ${a.hora||''}</span>
      </div>
      <div style="font-size:10px;color:var(--text3);margin-top:2px">
        🚛 ${a.matricula||'–'} · ${a.conductor||a.empresa||''} ${a.hall?'· Hall <b>'+a.hall+'</b>':''}
        ${a.montador?'· Montador: '+a.montador:''}
      </div>
    </div>`;
  }).join('');
  res.classList.add('open');
}

function _doSaveIng(mat,emp,hall,ev){
  const now=nowL();const today=now.slice(0,10);
  const _col=(_ingSource==='ingresos2')?'ingresos2':'ingresos';
  const old2=editIngId?(DB[_col]||[]).find(x=>x.id===editIngId):null;
  const posInput=parseInt(document.getElementById('fiPos')?.value)||null;
  // Si es edición, continuar con la pos existente directamente
  if(editIngId){
    _doSaveIngWithPos(mat,emp,hall,ev,null,now,today,_col,old2,posInput);
    return;
  }
  // Si es nuevo registro: obtener posición atómica
  if(_posAutoOn && fbRef){
    const _ev=ev;const _mat=mat;const _emp=emp;const _hall=hall;
    const _acum=_col==='ingresos2'&&_ev?.acumularPos;
    const _counterKey=_acum?('_posAcum_'+(_ev?.id||'x')):('_posDay_'+today);
    fbRef.child(_counterKey).transaction(cur=>(cur||0)+1,(err,committed,snap)=>{
      const atomicPos=(!err&&committed&&snap)?snap.val():null;
      _doSaveIngWithPos(_mat,_emp,_hall,_ev,atomicPos,now,today,_col,null,posInput);
    });
    return;
  }
  // Fallback sin Firebase
  let autoPos;
  if(_posAutoOn){
    if(_col==='ingresos') autoPos=DB.ingresos.filter(i=>i.entrada?.startsWith(today)).length+1;
    else{const acum=ev?.acumularPos;
      if(acum)autoPos=(DB.ingresos2||[]).filter(i=>i.eventoId===ev?.id).length+1;
      else autoPos=(DB.ingresos2||[]).filter(i=>i.entrada?.startsWith(today)).length+1;}
  }else{autoPos=posInput||null;}
  _doSaveIngWithPos(mat,emp,hall,ev,autoPos,now,today,_col,null,posInput);
}

function _doSaveIngWithPos(mat,emp,hall,ev,atomicPos,now,today,_col,old2,posInput){
  if(!old2)old2=editIngId?(DB[_col]||[]).find(x=>x.id===editIngId):null;
  let autoPos=atomicPos;
  if(autoPos===null||autoPos===undefined){
    if(_posAutoOn){
      if(_col==='ingresos') autoPos=DB.ingresos.filter(i=>i.entrada?.startsWith(today)).length+(editIngId?0:1);
      else{const acum=ev?.acumularPos;
        if(acum)autoPos=(DB.ingresos2||[]).filter(i=>i.eventoId===ev?.id).length+(editIngId?0:1);
        else autoPos=(DB.ingresos2||[]).filter(i=>i.entrada?.startsWith(today)).length+(editIngId?0:1);}
    }else{autoPos=posInput||null;}
  }
  const halls=_fiHalls.length?_fiHalls:(hall?[hall]:[]);
  const ing={
    id:editIngId||uid(),
    pos:_posAutoOn?(editIngId?(old2?.pos||autoPos):autoPos):( posInput||old2?.pos||null),
    halls:halls,
    hall:halls[0]||hall||'',
    matricula:mat,
    llamador:(document.getElementById('fiLlamador').value||'').trim(),
    referencia:(document.getElementById('fiRef').value||'').trim().toUpperCase(),
    empresa:emp,
    montador:(document.getElementById('fiMontador').value||'').trim(),
    expositor:(document.getElementById('fiExpositor').value||'').trim(),
    stand:(document.getElementById('fiStand').value||'').trim(),
    remolque:(document.getElementById('fiRem').value||'').trim().toUpperCase(),
    nombre:(document.getElementById('fiNom').value||'').trim(),
    apellido:(document.getElementById('fiApe').value||'').trim(),
    pasaporte:(document.getElementById('fiPas').value||'').trim(),
    telPais:document.getElementById('fiTelP').value,
    telefono:(document.getElementById('fiTel').value||'').trim(),
    email:(document.getElementById('fiEmail').value||'').trim(),
    comentario:(document.getElementById('fiComent').value||'').trim(),
    fechaNacimiento:document.getElementById('fiFechaNac')?.value||'',
    fechaExpiracion:document.getElementById('fiFechaExp')?.value||'',
    pais:(document.getElementById('fiPais')?.value||'').trim(),
    regRXL:(document.getElementById('fiRegRXL')?.value||'').trim(),
    oficinaSot:(document.getElementById('fiSOT')?.value||'').trim(),
    tipoVehiculo:document.getElementById('fiTipoVeh')?.value||'',
    descargaTipo:document.getElementById('fiDescarga')?.value||'',
    puertaHall:(document.getElementById('fiPuertaHall')?.value||'').trim(),
    puerta:document.getElementById('fiPuerta')?.value||'',
    tipoCarga:document.getElementById('fiCarga').value,
    lang:(document.getElementById('fiLang')?.value)||'es',
    eventoNombre:ev?.nombre||'',
    eventoId:ev?.id||null,
    entrada:old2?.entrada||now,
    salida:old2?.salida||null,
    creadoPor:CU?.nombre||'?',
    editadoPor:editIngId?(CU?.nombre||'?'):null,
    editadoTs:editIngId?now:null
  };
  updateVehiculos(ing);
  if(!DB[_col])DB[_col]=[];
  if(editIngId){
    // Detect if this is a temp plate being replaced with real plate
    const _isTempToReal=old2&&(old2.matricula.startsWith('REF-')||old2.matricula.startsWith('IMP-'))&&!mat.startsWith('REF-')&&!mat.startsWith('IMP-');
    if(_isTempToReal){
      // Assign next pos and set entrada to NOW — this is the actual arrival
      const today=now.slice(0,10);
      const ev2=ing.eventoId?DB.eventos.find(e=>e.id===ing.eventoId):getActiveEvent();
      let newPos;
      if(_col==='ingresos2'){
        if(ev2?.acumularPos)newPos=(DB.ingresos2||[]).filter(i=>i.eventoId===ev2?.id&&i.pos).length+1;
        else newPos=(DB.ingresos2||[]).filter(i=>i.entrada?.startsWith(today)&&i.pos).length+1;
      }else{
        newPos=DB.ingresos.filter(i=>i.entrada?.startsWith(today)&&i.pos).length+1;
      }
      ing.pos=String(newPos);
      ing.entrada=now;
      toast('🚗 Matrícula real asignada — Pos. '+newPos+' · Entrada: '+now.slice(11,16),'var(--text2)');
    }
    DB[_col]=DB[_col].map(x=>x.id===editIngId?ing:x);
    if(!DB.editHistory)DB.editHistory=[];
    DB.editHistory.unshift({id:ing.id,ts:now,user:CU?.nombre||'?',mat:mat,pos:ing.pos||'',action:_isTempToReal?'new':('edit'+(_col==='ingresos2'?'_ing2':'')),collection:_col});
    if(DB.editHistory.length>50)DB.editHistory=DB.editHistory.slice(0,50);
  }else{
    DB[_col].push(ing);
    if(!DB.editHistory)DB.editHistory=[];
    DB.editHistory.unshift({id:ing.id,ts:now,user:CU?.nombre||'?',mat:mat,pos:ing.pos||'',action:'new',collection:_col||'ingresos'});
    // Auto-init tracking
    if(!ing.tracking)ing.tracking=[{stepId:'rampa',ts:now,user:CU?.nombre||'Sistema'}];
    if(DB.editHistory.length>20)DB.editHistory=DB.editHistory.slice(0,20);
  }
  saveDB();closeOv('mIng');
  logAudit(editIngId?'editar_ing':'ingreso','ingreso',mat+' Halls:'+(halls.join(','))||'');

  // ── Cruce bidireccional con Agenda ──
  // Si el ingreso tiene referencia, buscar la cita de agenda correspondiente
  // y volcar hacia ella los datos que aún no tenga (matrícula, conductor, empresa,
  // teléfono, remolque, tipo vehículo) + hora de entrada real
  const _ref=ing.referencia;
  if(_ref){
    const _agIdx=(DB.agenda||[]).findIndex(a=>
      a.referencia&&a.referencia.toUpperCase()===_ref.toUpperCase()&&
      (!a.eventoId||a.eventoId===ing.eventoId||!ing.eventoId)
    );
    if(_agIdx>=0){
      const _ag=DB.agenda[_agIdx];
      let _agChanged=false;
      // Volcar hora de entrada como horaReal si la cita no la tiene o estaba pendiente
      const _horaIngreso=ing.entrada?ing.entrada.slice(11,16):'';
      if(_horaIngreso&&(!_ag.horaReal||_ag.estado==='PENDIENTE')){
        _ag.horaReal=_horaIngreso;
        _ag.estado='LLEGADO';
        _agChanged=true;
      }
      // Completar campos que la cita no tenga con los del ingreso
      const _fill=(k,v)=>{if(v&&!_ag[k]){_ag[k]=v;_agChanged=true;}};
      _fill('matricula',ing.matricula);
      _fill('remolque',ing.remolque);
      _fill('conductor',ing.nombre?(ing.nombre+(ing.apellido?' '+ing.apellido:'')).trim():null);
      _fill('empresa',ing.empresa);
      _fill('telefono',ing.telefono);
      _fill('tipoVehiculo',ing.tipoVehiculo);
      _fill('hall',ing.hall);
      _fill('stand',ing.stand);
      _fill('montador',ing.montador);
      _fill('expositor',ing.expositor);
      if(_agChanged){
        _ag._syncedFromIng=ing.id;
        _ag._syncedTs=ing.entrada||nowL();
        DB.agenda[_agIdx]=_ag;
        saveDB();
        toast('Agenda actualizada con datos del ingreso','var(--text2)',3500);
      }
    }
  }
  if(editIngId){
    // Edición: render normal
    if(_ingSource==='ingresos2'){iF._sub2='lista';renderIngresos2();}else{iF._sub='lista';renderIngresos();}renderHdr();
    toast('✅ Actualizado','var(--text2)');
  } else {
    // Nuevo ingreso: asignar posición post-Firebase solo si modo auto ⚡
    if(_posAutoOn){
      _assignPosAfterFirebase(ing,_col,ev);
    } else {
      // Modo manual: usar la posición que el usuario escribió
      if(_col==='ingresos2'){iF._sub2='lista';renderIngresos2();}else{iF._sub='lista';renderIngresos();}renderHdr();
      if(ing.pos)_showPosConfirm(ing.pos,ing,false);
      else toast('✅ Ingreso registrado','var(--text2)');
    }
  }
}

function _doAssignPosLocal(ing,col,ev){
  // Offline fallback: use local max+1
  const today=new Date().toISOString().slice(0,10);
  const source=DB[col]||[];
  let taken;
  if(col==='ingresos2'&&ev?.acumularPos){
    taken=source.filter(i=>i.eventoId===ev?.id&&i.pos&&i.id!==ing.id).map(i=>parseInt(i.pos)).filter(n=>!isNaN(n));
  } else {
    taken=source.filter(i=>i.entrada?.startsWith(today)&&i.pos&&i.id!==ing.id).map(i=>parseInt(i.pos)).filter(n=>!isNaN(n));
  }
  let newPos=Math.max(0,...taken)+1;
  _applyPos(ing,col,newPos);
  saveDBNow();
  if(col==='ingresos2'){renderIngresos2();}else{renderIngresos();}renderHdr();
  _showPosConfirm(newPos,ing,false);
}

function _applyPos(ing,col,newPos){
  const idx=(DB[col]||[]).findIndex(i=>i.id===ing.id);
  if(idx>=0){DB[col][idx].pos=String(newPos);ing.pos=String(newPos);}
  const hIdx=(DB.editHistory||[]).findIndex(h=>h.id===ing.id&&h.action==='new');
  if(hIdx>=0)DB.editHistory[hIdx].pos=String(newPos);
}

function _showPosConfirm(pos,ing,fromFirebase){
  // Remove existing if any
  const ex=document.getElementById('mPosConfirm');if(ex)ex.remove();
  const d=document.createElement('div');
  d.id='mPosConfirm';
  d.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;';
  d.innerHTML=`<div style="background:#fff;border-radius:16px;padding:32px 40px;text-align:center;max-width:340px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.3)">
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;margin-bottom:8px">✅ Ingreso confirmado${fromFirebase?' · Posición asignada por servidor':''}</div>
    <div style="font-size:96px;font-weight:900;color:#0f172a;line-height:1;margin:8px 0;font-family:'Inter',monospace">${pos}</div>
    <div style="font-size:13px;color:#6b7280;margin-bottom:6px">Nº Posición</div>
    <div style="font-family:monospace;font-size:20px;font-weight:700;color:#4a5568;margin-bottom:4px">${ing.matricula}</div>
    <div style="font-size:12px;color:#6b7280;margin-bottom:20px">${ing.empresa||ing.nombre||''}</div>
    <button onclick="document.getElementById('mPosConfirm').remove()" style="background:#4a5568;color:#fff;border:none;border-radius:20px;padding:10px 32px;font-size:15px;font-weight:700;cursor:pointer;width:100%">✓ Anotado</button>
  </div>`;
  d.addEventListener('click',e=>{if(e.target===d)d.remove();});
  document.body.appendChild(d);
  // Auto-close after 30 seconds
  setTimeout(()=>{const m=document.getElementById('mPosConfirm');if(m)m.remove();},3000);
}

function marcarSalidaIng(id){
  const i=DB.ingresos.find(x=>x.id===id);if(!i)return;
  i.salida=nowL();i.salidaPor=CU?.nombre||'?';
  if(!DB.editHistory)DB.editHistory=[];
  DB.editHistory.unshift({id:i.id,ts:i.salida,user:CU?.nombre||'?',mat:i.matricula,pos:i.pos||'',action:'salida',collection:'ingresos'});
  if(DB.editHistory.length>20)DB.editHistory=DB.editHistory.slice(0,20);
  saveDBNow();renderIngresos();renderHdr();logAudit('salida','ingreso','Salida: '+i.matricula);toast('✅ Salida registrada');
}

function doRegistrarPaso(id,col,stepId){
  document.getElementById('trkDropdown')?.remove();
  const arr=col==='ingresos2'?(DB.ingresos2||[]):DB.ingresos;
  const ing=arr.find(x=>x.id===id);if(!ing)return;
  if(!ing.tracking)ing.tracking=[];
  const si=TRACKING_STEPS.find(s=>s.id===stepId)||{id:stepId,name:stepId};
  ing.tracking.push({stepId,ts:new Date().toISOString(),user:CU?.nombre||'?'});
  saveDB();
  if(col==='ingresos2')renderIngresos2();else renderIngresos();
  renderHdr();
  toast(`${si.ico||'📍'} ${si.name||stepId} registrado`,'var(--text2)');
}

function reactivarIngreso(id){
  const i=DB.ingresos.find(x=>x.id===id);if(!i)return;
  const prevSalida=i.salida;
  i.salida=null;i.salidaPor=null;
  if(!DB.editHistory)DB.editHistory=[];
  DB.editHistory.unshift({id:i.id,ts:nowL(),user:CU?.nombre||'?',mat:i.matricula,pos:i.pos||'',action:'reactivar',note:'Salida anulada: '+prevSalida,collection:'ingresos'});
  if(DB.editHistory.length>20)DB.editHistory=DB.editHistory.slice(0,20);
  saveDBNow();renderIngresos();renderHdr();logAudit('reactivar','ingreso','Reactivado: '+i.matricula);toast('↺ Salida anulada — vehículo en recinto','var(--amber)');
}

function imprimirYGuardar(){imprimirYGuardarConTpl('normal');}

function openMovModal(m){editMovId=m?m.id:null;document.getElementById('mMovTitle').textContent=m?'Editar movimiento':'Nuevo movimiento';document.getElementById('btnMovLbl').textContent=m?tr('save'):tr('add');const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};set('fmId',m?.id);set('fmMat',m?.matricula);set('fmRem',m?.remolque);set('fmNom',m?.nombre);set('fmApe',m?.apellido);set('fmEmp',m?.empresa);set('fmHall',m?.hall);set('fmCarga',m?.tipoCarga||'');set('fmStatus',m?.status||'ALMACEN');set('fmPos',m?.posicion);set('fmVuelta',m?.numVuelta||1);set('fmNotas',m?.notas);if(m?.tacografoHora){const el=document.getElementById('fmTaco');if(el)el.value=m.tacografoHora.replace(' ','T');}document.getElementById('mMov').classList.add('open');}

function saveMov(){const mat=(document.getElementById('fmMat').value||'').trim().toUpperCase(),hall=document.getElementById('fmHall').value;if(!mat||!hall){toast('Matrícula y hall obligatorios','var(--red)');return;}const tacoRaw=document.getElementById('fmTaco').value;const m={id:editMovId||uid(),matricula:mat,remolque:(document.getElementById('fmRem').value||'').trim().toUpperCase(),nombre:(document.getElementById('fmNom').value||'').trim(),apellido:(document.getElementById('fmApe').value||'').trim(),empresa:(document.getElementById('fmEmp').value||'').trim(),hall,tipoCarga:document.getElementById('fmCarga').value,status:document.getElementById('fmStatus').value,posicion:parseInt(document.getElementById('fmPos').value)||0,numVuelta:parseInt(document.getElementById('fmVuelta').value)||1,tacografoHora:tacoRaw?tacoRaw.replace('T',' '):null,notas:(document.getElementById('fmNotas').value||'').trim(),lastStatusTs:nowL(),ts:editMovId?(DB.movimientos.find(x=>x.id===editMovId)?.ts||nowL()):nowL()};if(editMovId)DB.movimientos=DB.movimientos.map(x=>x.id===editMovId?m:x);else DB.movimientos.push(m);saveDB();closeOv('mMov');renderFlota();renderHdr();toast('✅ Guardado');}

function openEEModal(e){editEEId=e?e.id:null;document.getElementById('mEETitle').textContent=e?'Editar espera':'Nueva en espera';document.getElementById('btnEELbl').textContent=e?tr('save'):tr('add');const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};set('eeId',e?.id);set('eeM',e?.matricula);set('eeHora',e?.hora||'');set('eePrio',e?.prioridad||'normal');set('eeCond',e?.conductor);set('eeEmp',e?.empresa);set('eeTel',e?.telefono);set('eeHall',e?.hall);set('eeRef',e?.booking);set('eeNotas',e?.notas);document.getElementById('mEE').classList.add('open');}

function saveEE(){const mat=(document.getElementById('eeM').value||'').trim().toUpperCase();if(!mat){toast('Matrícula obligatoria','var(--red)');return;}const e={id:editEEId||uid(),matricula:mat,hora:document.getElementById('eeHora').value,prioridad:document.getElementById('eePrio').value,conductor:(document.getElementById('eeCond').value||'').trim(),empresa:(document.getElementById('eeEmp').value||'').trim(),telefono:(document.getElementById('eeTel').value||'').trim(),hall:document.getElementById('eeHall').value,booking:(document.getElementById('eeRef').value||'').trim().toUpperCase(),notas:(document.getElementById('eeNotas').value||'').trim(),estado:'pendiente',ts:nowL(),creadoPor:CU?.nombre||''};if(editEEId)DB.enEspera=DB.enEspera.map(x=>x.id===editEEId?e:x);else DB.enEspera.push(e);autoMsg(e.prioridad==='urgente'?'urgente':e.prioridad==='alta'?'alerta':'info','⏳ '+mat+' en espera',mat+' · Hall: '+(e.hall||'?'),mat);saveDB();closeOv('mEE');renderIngresos();renderHdr();toast('⏳ En espera añadido');}

function marcarEELlegado(id){const e=DB.enEspera.find(x=>x.id===id);if(!e)return;e.estado='llegado';saveDBNow();openIngModal({matricula:e.matricula,nombre:e.conductor,empresa:e.empresa,hall:e.hall,referencia:e.booking,telefono:e.telefono});renderHdr();}

function openLNModal(ln){if(!canSpecial()){toast(tr('sinPermiso'),'var(--red)');return;}editLNId=ln?ln.id:null;document.getElementById('mLNTitle').textContent=ln?'Editar':'Añadir Especial';document.getElementById('btnLNLbl').textContent=ln?tr('save'):tr('add');const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};set('lnId',ln?.id);set('lnM',ln?.matricula);set('lnN',ln?.nivel||'alerta');set('lnMotivo',ln?.motivo);set('lnEmp',ln?.empresa);set('lnHasta',ln?.hasta);document.getElementById('mLN').classList.add('open');}

function saveLN(){const mat=(document.getElementById('lnM').value||'').trim().toUpperCase(),mot=(document.getElementById('lnMotivo').value||'').trim();if(!mat||!mot){toast('Matrícula y motivo obligatorios','var(--red)');return;}const ln={id:editLNId||uid(),matricula:mat,nivel:document.getElementById('lnN').value,motivo:mot,empresa:(document.getElementById('lnEmp').value||'').trim(),hasta:document.getElementById('lnHasta').value||null,ts:nowL(),usuario:CU?.nombre||''};if(editLNId)DB.listaNegra=DB.listaNegra.map(x=>x.id===editLNId?ln:x);else DB.listaNegra.push(ln);autoMsg('alerta',tr('tabSpecial'),mat+' — '+ln.nivel.toUpperCase()+': '+mot,mat);logAudit('create','listaNegra',mat+' ('+ln.nivel+')');saveDB();closeOv('mLN');renderIngresos();toast('🚫 '+mat+' añadida');}

function showBlkAlert(ln,mat,allowOverride){document.getElementById('baIcon').textContent=ln.nivel==='bloqueo'?'🚫':'⚠️';document.getElementById('baTitle').textContent=ln.nivel==='bloqueo'?'ACCESO DENEGADO':'MATRÍCULA CON ALERTA';document.getElementById('baDetail').innerHTML='<b>'+tr('plateLabel')+'</b> '+mat+'<br><b>Nivel:</b> '+ln.nivel.toUpperCase()+'<br><b>Motivo:</b> '+ln.motivo;document.getElementById('baInstr').textContent=ln.nivel==='bloqueo'?'Solo Supervisor puede autorizar.':'Verificar antes de permitir acceso.';document.getElementById('baOverrideBtn').style.display=(allowOverride&&isSup())?'flex':'none';document.getElementById('mBA').classList.add('open');autoMsg(ln.nivel==='bloqueo'?'urgente':'alerta','🚫 Intento acceso LN',mat+' — '+ln.nivel.toUpperCase()+': '+ln.motivo,mat);}

function blOverride(){closeOv('mBA');const mat=(document.getElementById('fiMat').value||'').trim().toUpperCase();const ev=getActiveEvent();_doSaveIng(mat,(document.getElementById('fiEmp').value||'').trim(),document.getElementById('fiHall').value,ev);}

function telLink(telPais,tel){
  if(!tel||!tel.trim())return'–';
  const full=(telPais||'')+tel.trim().replace(/\s/g,'');
  const wa=full.replace('+','').replace(/\D/g,'');
  return`<div style="display:flex;align-items:center;gap:4px;white-space:nowrap">
    <a href="tel:${full}" style="color:#4a5568;text-decoration:none;font-size:13px" title="Llamar">📞</a>
    <a href="https://wa.me/${wa}" target="_blank" style="color:#25D366;text-decoration:none;font-size:13px" title="WhatsApp">💬</a>
    <span style="font-size:11px">${tel}</span>
  </div>`;
}

function showDetalle(id,coleccion){
  const map={ingresos:showIngDetalle,ingresos2:(id)=>showIngDetalle(id,'ingresos2'),agenda:showAgDetalle,conductores:showCondDetalle,vehiculos:showVehDetalle};
  const fn=map[coleccion||'ingresos'];if(fn)fn(id);
}

function showAgDetalle(id){
  const a=DB.agenda.find(x=>x.id===id);if(!a)return;
  document.getElementById('mIngDetailTitle').textContent='📅 '+a.matricula+' · '+a.fecha+' '+a.hora;
  document.getElementById('mIngDetailPrint').onclick=()=>printAgendaItem(a);
  document.getElementById('mIngDetailEdit').onclick=()=>{closeOv('mIngDetail');openAgendaModal(a);};
  document.getElementById('mIngDetailBody').innerHTML=`
    <div class="sg sg3" style="margin-bottom:6px">
      <div class="stat-box" style="border-top:#3a4558"><div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:900">${a.hora||'–'}</div><div class="stat-l">${tr('fechaPlan')}</div></div>
      <div class="stat-box" style="border-top:3px solid #3a4558"><div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:900">${a.horaReal||'–'}</div><div class="stat-l">${tr('horaReal')}</div></div>
      <div class="stat-box"><div style="font-size:13px;font-weight:700">${a.estado||'PENDIENTE'}</div><div class="stat-l">Estado</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
      ${[['🚛 Matrícula',a.matricula],['🚚 Remolque',a.remolque],['👤 Conductor',a.conductor],['🏢 Empresa',a.empresa],['🔖 Referencia',a.referencia],['🏭 Hall',a.hall],['📍 Stand',a.stand],['📱 Teléfono',a.telefono],['🎪 Expositor',a.expositor],['🔧 Montador',a.montador],['📋 Evento',a.eventoNombre],['🚗 Tipo',a.tipoVehiculo]].map(([l,v])=>v?`<div style="padding:5px 8px;background:var(--bg3);border-radius:var(--r)"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:1px">${l}</div><div style="font-weight:600">${v}</div></div>`:'').join('')}
      ${a.notas?`<div style="grid-column:1/-1;padding:5px 8px;background:var(--bg3);border-radius:var(--r)"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:1px">📝 Notas</div><div>${a.notas}</div></div>`:''}
    </div>`;
  document.getElementById('mIngDetail').classList.add('open');
}

function showCondDetalle(id){
  const c=DB.conductores.find(x=>x.id===id);if(!c)return;
  const l=LANGS_UI.find(x=>x.code===(c.idioma||'es'));
  const ingCount=DB.ingresos.filter(i=>i.matricula===c.matricula).length+DB.ingresos2.filter(i=>i.matricula===c.matricula).length;
  document.getElementById('mIngDetailTitle').textContent='👤 '+c.nombre+' '+c.apellido;
  document.getElementById('mIngDetailPrint').style.display='none';
  document.getElementById('mIngDetailEdit').onclick=()=>{closeOv('mIngDetail');openCondModal(c);};
  document.getElementById('mIngDetailBody').innerHTML=`
    <div class="sg sg3" style="margin-bottom:6px">
      <div class="stat-box" style="border-top:#3a4558"><div class="stat-n">${ingCount}</div><div class="stat-l">${tr('ingresosTotales')}</div></div>
      <div class="stat-box" style="border-top:3px solid var(--teal);grid-column:span 2"><div style="font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:900;color:var(--teal)">${c.matricula||'–'}</div><div class="stat-l">${tr('matHabitual')}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px">
      ${[['🏢 Empresa',c.empresa],['🚚 Remolque',c.remolque],['🏭 Hall habitual',c.hall],['📱 Teléfono',(c.telPais||'')+' '+(c.telefono||'')],['✉️ Email',c.email],['🌍 Idioma',l?l.flag+' '+l.name:''],['🚗 Tipo vehículo',TV[c.tipoVehiculo]||c.tipoVehiculo]].map(([l,v])=>v?`<div style="padding:5px 8px;background:var(--bg3);border-radius:var(--r)"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:1px">${l}</div><div style="font-weight:600">${v}</div></div>`:'').join('')}
      ${c.notas?`<div style="grid-column:1/-1;padding:5px 8px;background:var(--bg3);border-radius:var(--r)"><div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:1px">📝 Notas</div><div>${c.notas}</div></div>`:''}
    </div>`;
  document.getElementById('mIngDetail').classList.add('open');
}

function showVehDetalle(id){
  const v=DB.vehiculos.find(x=>x.id===id);if(!v)return;
  const ings=[...DB.ingresos,...(DB.ingresos2||[])].filter(i=>i.matricula===v.matricula).sort((a,b)=>(b.entrada||'').localeCompare(a.entrada||'')).slice(0,10);
  document.getElementById('mIngDetailTitle').textContent='🚛 '+v.matricula;
  document.getElementById('mIngDetailPrint').style.display='none';
  document.getElementById('mIngDetailEdit').style.display='none';
  document.getElementById('mIngDetailBody').innerHTML=`
    <div class="sg sg3" style="margin-bottom:6px">
      <div class="stat-box" style="border-top:#3a4558"><div class="stat-n">${v.ingresos||0}</div><div class="stat-l">${tr('ingresosTotales')}</div></div>
      <div class="stat-box" style="border-top:3px solid var(--teal)"><div style="font-size:13px;font-weight:700;color:var(--teal)">${v.empresa||'–'}</div><div class="stat-l">Empresa</div></div>
      <div class="stat-box"><div style="font-size:11px;font-weight:700">${v.nombre||'–'}</div><div class="stat-l">Conductor</div></div>
    </div>
    <div style="font-size:12px;margin-bottom:10px">${telLink(v.telPais||'',v.telefono||'')}</div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;margin-bottom:6px">${tr('ultimosIngresos')}</div>
    <div class="tbl-wrap"><table class="dtbl"><thead><tr><th>${tr('entry')}</th><th>${tr('hall')}</th><th>${tr('evento')}</th><th>${tr('estado')}</th></tr></thead><tbody>
      ${ings.map(i=>`<tr><td style="font-size:11px">${fmt(i.entrada)}</td><td>${(i.halls||[i.hall||'']).filter(Boolean).map(h=>hBadge(h)).join(' ')}</td><td style="font-size:10px">${i.eventoNombre||'–'}</td><td>${!i.salida?'<span class="pill pill-g" style="font-size:10px">✓</span>':'<span style="font-size:10px">↩</span>'}</td></tr>`).join('')}
    </tbody></table></div>`;
  document.getElementById('mIngDetail').classList.add('open');
}

function exportIngresos(){if(!canExport()){toast('Sin permiso para exportar','var(--red)');return;};if(!DB.ingresos.length){toast('Sin datos','var(--red)');return;}const wb=XLSX.utils.book_new();const fn='ingresos_'+new Date().toISOString().slice(0,10)+'.xlsx';XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(DB.ingresos.map(i=>({Pos:i.pos||'',Matricula:i.matricula,Llamador:i.llamador||'',Referencia:i.referencia||'',Nombre:i.nombre||'',Apellido:i.apellido||'',Empresa:i.empresa||'',Montador:i.montador||'',Expositor:i.expositor||'',Hall:(i.halls||[i.hall||'']).join('/')+'',Stand:i.stand||'',Remolque:i.remolque||'',Pasaporte:i.pasaporte||'',Telefono:i.telefono||'',Email:i.email||'',Comentario:i.comentario||'',Entrada:fmt(i.entrada),Salida:i.salida?fmt(i.salida):'En recinto',Idioma:i.lang||'es',Evento:i.eventoNombre||''}))),'Ingresos');XLSX.writeFile(wb,fn);logExport('Ingresos-Booking',fn);toast('✅ Exportado');}

function exportListaNegra(){if(!canExport()){toast('Sin permiso para exportar','var(--red)');return;};if(!DB.listaNegra.length){toast('Sin datos','var(--red)');return;}const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(DB.listaNegra.map(ln=>({Matricula:ln.matricula,Nivel:ln.nivel,Motivo:ln.motivo,Empresa:ln.empresa||'',Hasta:ln.hasta||''}))),'ListaNegra');XLSX.writeFile(wb,'listanegra.xlsx');toast('✅ Exportado');}

function _pRenderHallTags(){
  var wrap=document.getElementById('pHallTags');if(!wrap)return;
  wrap.innerHTML=_pHalls.map(function(h){
    return'<span style="display:inline-flex;align-items:center;gap:3px;background:#4a5568;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px">'
      +esc('Hall '+h)+' <span style="cursor:pointer;opacity:.7" onclick="pRemoveHall(\''+h+'\')">✕</span></span>';
  }).join('')+'<button class="btn btn-s btn-xs" onclick="pAddHall()">+ Hall</button>';
}

function _getIngStatus(ing,mat){
  if(!ing)return{cls:'vs-none',label:'— Sin asignar',key:'none'};
  var enFira=(DB.movimientos||[]).find(function(x){return(x.matricula||'').toUpperCase()===mat&&x.status==='FIRA';});
  if(enFira)return{cls:'vs-fira',label:'✓ Dentro Fira',key:'fira'};
  if(ing.entrada&&!ing.salida)return{cls:'vs-park',label:'🅿 Rampa/Parking',key:'park'};
  var enEsp=(DB.enEspera||[]).find(function(x){return(x.matricula||'').toUpperCase()===mat;});
  if(enEsp)return{cls:'vs-road',label:'🚗 En camino',key:'road'};
  return{cls:'vs-none',label:'📋 Prerregistrado',key:'pre'};
}

function _miniTrackHtml(key){
  var steps=['pre','road','park','fira'];
  var idx=steps.indexOf(key);if(idx<0)idx=0;
  return'<div style="display:flex;align-items:center;gap:0">'+steps.map(function(s,i){
    var done=i<idx,active=i===idx;
    var dot='<div style="width:16px;height:16px;border-radius:50%;border:2px solid var(--border2);background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;position:relative;z-index:1'+(done?';background:#4a5568;border-color:#4a5568;color:#fff':active?';background:#4a5568;border-color:#3a4558;color:#fff':'')+'">'+(done?'✓':active?'●':'○')+'</div>';
    var line=i<3?'<div style="width:12px;height:2px;background:'+(done?'#4a5568':'var(--border2)')+'"></div>':'';
    return dot+line;
  }).join('')+'</div>';
}

function _expandTrackHtml(key,r){
  var labels=['Prerregistrado','En camino','Rampa/Parking','Dentro Fira'];
  var keys=['pre','road','park','fira'];
  var idx=keys.indexOf(key);if(idx<0)idx=0;
  var steps=labels.map(function(l,i){
    var done=i<idx,active=i===idx;
    var cls=done?'td-done':active?'td-active':'td-pending';
    var dot='<div class="track-dot '+(done?'td-done':active?'td-active':'')+'">'+( done?'✓':active?'●':'○')+'</div>';
    var ts=done||active?(r.ing&&i===2?r.hora:i===0?(r.pr?r.pr.creadoTs.slice(0,10):r.hora):r.hora):'—';
    return'<div class="track-step '+cls+'">'+dot+'<div class="track-lbl">'+l+'</div><div class="track-time">'+ts+'</div></div>';
  });
  return'<div class="track-row">'+steps.join('')+'</div>'
    +(r.noRef&&r.pr&&r.pr.periodoDesde?'<div style="margin-top:6px;font-size:9px;color:#4a5568;font-weight:600">📅 Período: '+r.pr.periodoDesde+(r.pr.periodoHasta?' / '+r.pr.periodoHasta:'')+'</div>':'');
}

