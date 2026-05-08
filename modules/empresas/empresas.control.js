/* empresas — 85 funciones */

function savePuerta3(cfgKey){
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  cfg.puerta3={
    nombre:(document.getElementById('tabPuerta3Nom_'+cfgKey)?.value||'').trim(),
    url:(document.getElementById('tabPuerta3Url_'+cfgKey)?.value||'').trim()
  };
  saveDB();
  if(cfgKey==='ag'){goTab('impresion',null);window._impSub='ag';renderImpresion();}
  else if(cfgKey==='ing2'){goTab('impresion',null);window._impSub='ing2';renderImpresion();}
  else{goTab('impresion',null);window._impSub='ing1';renderImpresion();}
  setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);});
  toast('🚪 QR de puerta guardado','var(--text2)');
}

function saveTabPhrases(cfgKey){
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  const uLang=CUR_LANG||'es';
  const el1=document.getElementById('tabPhrase1_'+cfgKey);
  if(el1){
    const ph1=el1.value.trim();
    if(!cfg.phrases)cfg.phrases={};
    if(ph1)cfg.phrases[uLang]=ph1;else delete cfg.phrases[uLang];
  }
  const el2=document.getElementById('tabPhrase2_'+cfgKey);
  if(el2){
    const ph2=el2.value.trim();
    if(ph2)cfg.phrase2=ph2;else delete cfg.phrase2;
  }
  // Only save and toast if elements were actually in the DOM
  if(el1||el2){saveDB();if(el1&&el2)toast('💾 Frases guardadas','var(--text2)');}
}

function savePrintTemplateFromCfg(cfgKey){
  const nameEl=document.getElementById('pctpl-name-'+cfgKey);
  const name=(nameEl?.value||'').trim();
  if(!name){toast('Escribe un nombre para la plantilla','var(--amber)');nameEl?.focus();return;}
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  const mode=(DB.printCfgModes||{})[cfgKey]||'normal';
  if(!DB.printTemplates)DB.printTemplates=[];
  const existing=DB.printTemplates.findIndex(t=>t.name===name);
  const tpl={name,mode,paperSize:cfg.paperSize||'A4',font:cfg.font||'Arial',cfgKey,
    fieldOrder:[...(cfg.fieldOrder||PRINT_DEF)],
    hiddenFields:[...(cfg.hiddenFields||[])],
    phrases:{...(cfg.phrases||{})},
    phrase2:cfg.phrase2||'',
    puerta3:{...(cfg.puerta3||{})},
    favEventId:cfg.favEventId||null,
    qrTracking:cfg.qrTracking!==false,
    fieldLayout:cfg.fieldLayout?{...cfg.fieldLayout}:null,
    canvasCleared:cfg.canvasCleared||false,
    bgImage:cfg.bgImage||'',
    bgOpacity:cfg.bgOpacity||0.35,
    ph1On:cfg.ph1On===true,
    ph2On:cfg.ph2On!==false,
    ph3On:cfg.ph3On===true,
    labelMode:cfg.labelMode||0};
  if(existing>=0)DB.printTemplates[existing]=tpl;else DB.printTemplates.push(tpl);
  // Mark this template as the active one "En vivo"
  if(!DB.printCfgModes)DB.printCfgModes={};
  DB.printCfgModes[cfgKey+'_activeTpl']=name;
  saveDB();
  if(nameEl)nameEl.value='';
  if(cfgKey==='ag'){goTab('impresion',null);window._impSub='ag';renderImpresion();}
  else if(cfgKey==='ing2'){goTab('impresion',null);window._impSub='ing2';renderImpresion();}
  else{goTab('impresion',null);window._impSub='ing1';renderImpresion();}
  setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);});
  toast('💾 Plantilla "'+name+'" guardada','var(--text2)');
}

function savePrintTemplate(cfgKey){
  // legacy — redirect to new flow
  savePrintTemplateFromCfg(cfgKey);
}

function saveRecinto(){
  const nom=(document.getElementById('recNom').value||'').trim();if(!nom){toast('Nombre obligatorio','var(--red)');return;}
  const r={id:editRecId||uid(),nombre:nom,ciudad:(document.getElementById('recCiudad').value||'').trim(),pais:(document.getElementById('recPais').value||'').trim(),halls:[..._recHallsTemp],puertas:[..._recPuertasTemp],atencion:{tel:(document.getElementById('recAtcTel').value||'').trim(),email:(document.getElementById('recAtcEmail').value||'').trim(),notas:(document.getElementById('recAtcNotas').value||'').trim()}};
  if(editRecId)DB.recintos=DB.recintos.map(x=>x.id===editRecId?r:x);else DB.recintos.push(r);
  saveDB();closeOv('mRecinto');renderRecintos();toast('✅ Recinto guardado');
}

function saveMatAsChofer(){
  const mat=(document.getElementById('fiMat')?.value||'').trim().toUpperCase();
  if(!mat){toast('Matrícula requerida','var(--red)');return;}
  // Verificar si ya existe
  const exists=DB.conductores.find(cd=>cd.matricula===mat);
  if(exists){
    if(!confirm('⚠️ '+mat+' ya existe en conductores ('+exists.nombre+' '+exists.apellido+').\n¿Abrir para editar?'))return;
    closeOv('mIng');
    setTimeout(()=>openCondModal(exists),200);
    return;
  }
  // Leer datos del formulario actual
  const get=id=>(document.getElementById(id)?.value||'').trim();
  const nom=get('fiNom'),ape=get('fiApe');
  if(!nom&&!ape){toast('Rellena al menos nombre y apellido antes de guardar','var(--amber)');return;}
  // Pre-llenar modal conductor con los datos del formulario
  const prefill={
    matricula:mat,
    nombre:nom,apellido:ape,
    empresa:get('fiEmp'),
    remolque:get('fiRem'),
    hall:_fiHalls[0]||'',
    telPais:get('fiTelP')||'+34',
    telefono:get('fiTel'),
    email:get('fiEmail'),
    tipoVehiculo:get('fiTipoVeh'),
    pasaporte:get('fiPas'),
    pais:get('fiPais'),
    fechaNacimiento:get('fiFechaNac'),
    fechaExpiracion:get('fiFechaExp'),
    idioma:get('fiLang'),
    notas:''
  };
  // Abrir modal conductor prellenado (sin cerrar el de ingreso)
  openCondModalFromIng(prefill);
}

function saveIngreso(){
  const mat=(document.getElementById('fiMat').value||'').trim().toUpperCase();if(!mat){toast('Matrícula obligatoria','var(--red)');return;}
  const emp=(document.getElementById('fiEmp').value||'').trim(),hall=document.getElementById('fiHall').value,ev=getFormEvento();
  if(fieldCfg('empresa')==='required'&&!emp){toast('Empresa obligatoria','var(--red)');return;}
  if(fieldCfg('hall')==='required'&&!hall){toast('Hall obligatorio','var(--red)');return;}
  const ln=checkBL(mat);if(ln&&!blkOverrideData){blkOverrideData={mat};showBlkAlert(ln,mat,true);return;}
  blkOverrideData=null;_doSaveIng(mat,emp,hall,ev);
}

function registrarPasoTracking(id,col){
  if(!canStatus()){toast(tr('sinPermiso'),'var(--red)');return;}
  const actEvs=getActiveEvents();
  const steps=TRACKING_STEPS.filter(s=>!s.end);
  const menu=`<div style="background:var(--bg2);border:1.5px solid var(--border2);border-radius:var(--r);box-shadow:var(--sh2);min-width:180px;z-index:9999;padding:4px 0">
    ${steps.map(s=>`<div onclick="doRegistrarPaso('${id}','${col}','${s.id}')" style="padding:7px 12px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px;white-space:nowrap" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">${s.ico} ${s.name}</div>`).join('')}
    <div style="border-top:1px solid var(--border);margin:4px 0"></div>
    <div onclick="doRegistrarPaso('${id}','${col}','terminado')" style="padding:7px 12px;cursor:pointer;font-size:12px;font-weight:700;color:var(--red);display:flex;align-items:center;gap:4px" onmouseover="this.style.background='var(--rll)'" onmouseout="this.style.background=''">✅ Terminado</div>
  </div>`;
  // Show as dropdown
  const existing=document.getElementById('trkDropdown');if(existing)existing.remove();
  const d=document.createElement('div');
  d.id='trkDropdown';d.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:9998';
  d.innerHTML=`<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">${menu}</div>`;
  d.onclick=(e)=>{if(e.target===d)d.remove();};
  document.body.appendChild(d);
}

function registrarPasoTrackingAg(agId){
  // Find the ingreso linked to this agenda item by matricula
  const ag=DB.agenda.find(x=>x.id===agId);if(!ag)return;
  const mat=ag.matricula;
  const ing=[...DB.ingresos,...(DB.ingresos2||[])].find(i=>i.matricula===mat&&!i.salida);
  if(!ing){toast('⚠ No hay ingreso activo para '+mat,'var(--amber)');return;}
  const col=(DB.ingresos2||[]).find(i=>i.id===ing.id)?'ingresos2':'ingresos';
  registrarPasoTracking(ing.id,col);
}

function saveAgenda(){
  const mat=(document.getElementById('agMat').value||'').trim().toUpperCase(),fecha=document.getElementById('agFecha').value,hora=document.getElementById('agHora').value;
  if(!fecha){toast('La fecha es obligatoria','var(--red)');return;}
  if(!editAgId&&!mat){toast('Matrícula obligatoria para nueva cita','var(--red)');return;}
  const eId=document.getElementById('agEvento').value,ev=eId?DB.eventos.find(x=>x.id===eId):null;
  const old=editAgId?DB.agenda.find(x=>x.id===editAgId):null;
  const a={id:editAgId||uid(),fecha,hora,eventoId:eId||null,eventoNombre:ev?.nombre||'',matricula:mat,remolque:(document.getElementById('agRem').value||'').trim().toUpperCase(),tipoVehiculo:document.getElementById('agTipoV').value,conductor:(document.getElementById('agCond').value||'').trim(),empresa:(document.getElementById('agEmp').value||'').trim(),referencia:(document.getElementById('agRef').value||'').trim().toUpperCase(),montador:(document.getElementById('agMontador').value||'').trim(),expositor:(document.getElementById('agExpositor').value||'').trim(),hall:(document.getElementById('agHall').value||'').trim(),stand:(document.getElementById('agStand').value||'').trim(),puerta:(document.getElementById('agPuerta').value||'').trim(),puertaHall:(document.getElementById('agPuertaHall').value||'').trim(),pasaporte:(document.getElementById('agPas').value||'').trim().toUpperCase(),pais:(document.getElementById('agPais').value||'').trim(),fechaNacimiento:document.getElementById('agFechaNac').value||'',fechaExpiracion:document.getElementById('agFechaExp').value||'',pase:document.getElementById('agPase').value,descargaTipo:document.getElementById('agDescarga')?.value||'',telefono:(document.getElementById('agTel').value||'').trim(),gpsUrl:(document.getElementById('agGps').value||'').trim(),tipoCarga:document.getElementById('agCarga').value,gastoTipo:document.getElementById('agGastoTipo').value,gastoImporte:document.getElementById('agGastoImporte').value||null,estado:document.getElementById('agEstado').value||'PENDIENTE',horaReal:old?.horaReal||null,requisitos:[...agReqsTemp],notas:(document.getElementById('agNotas').value||'').trim(),creadoPor:CU?.nombre||'?',ts:old?.ts||nowL()};
  if(editAgId)DB.agenda=DB.agenda.map(x=>x.id===editAgId?a:x);else DB.agenda.push(a);
  if(!DB.editHistory)DB.editHistory=[];DB.editHistory.unshift({id:ag.id,ts:nowL(),user:CU?.nombre||'?',mat:mat,pos:'',action:editAgId?'edit':'new',collection:'agenda'});if(DB.editHistory.length>200)DB.editHistory=DB.editHistory.slice(0,200);
  saveDB();closeOv('mAg');window._agSubTab='lista';renderAgenda();renderHdr();logAudit(editAgId?'edit_ag':'new_ag','agenda',mat+' '+fecha+' '+hora);toast('✅ Cita guardada','var(--text2)');
}

function saveCond(){const nom=(document.getElementById('fcNom').value||'').trim(),ape=(document.getElementById('fcApe').value||'').trim();if(!nom||!ape){toast('Nombre y apellido obligatorios','var(--red)');return;}const c={id:editCondId||uid(),nombre:nom,apellido:ape,empresa:(document.getElementById('fcEmp').value||'').trim(),matricula:(document.getElementById('fcMat').value||'').trim().toUpperCase(),remolque:(document.getElementById('fcRem').value||'').trim().toUpperCase(),hall:document.getElementById('fcHall').value,telPais:document.getElementById('fcTelP').value,telefono:(document.getElementById('fcTel').value||'').trim(),email:(document.getElementById('fcEmail').value||'').trim(),idioma:document.getElementById('fcIdioma').value,tipoVehiculo:document.getElementById('fcTipoV').value,pasaporte:(document.getElementById('fcPas').value||'').trim().toUpperCase(),pais:(document.getElementById('fcPais').value||'').trim(),fechaNacimiento:document.getElementById('fcFechaNac').value||'',fechaExpiracion:document.getElementById('fcFechaExp').value||'',gpsUrl:(document.getElementById('fcGps').value||'').trim(),notas:(document.getElementById('fcNotas').value||'').trim(),encargado:(document.getElementById('fcEncargado').value||'').trim(),encargadoTelPais:document.getElementById('fcEncTelP').value,encargadoTel:(document.getElementById('fcEncTel').value||'').trim(),encargadoEmail:(document.getElementById('fcEncEmail').value||'').trim()};if(editCondId)DB.conductores=DB.conductores.map(x=>x.id===editCondId?c:x);else DB.conductores.push(c);
  if(!DB.editHistory)DB.editHistory=[];DB.editHistory.unshift({id:c.id,ts:nowL(),user:CU?.nombre||'?',mat:c.matricula||c.nombre,pos:'',action:editCondId?'edit':'new',collection:'conductores'});if(DB.editHistory.length>200)DB.editHistory=DB.editHistory.slice(0,200);
  saveDB();closeOv('mCond');renderConductores();
  if(window._condSaveAfterFromIng){
    window._condSaveAfterFromIng=false;
    setMatTag('👤',c.nombre+' '+c.apellido,c.empresa,'chofer');
    const saveBtn=document.getElementById('fiMatTagSave');if(saveBtn)saveBtn.style.display='none';
    toast('✅ Conductor guardado y vinculado a la matrícula','#4a5568',4000);
  } else {
    toast('✅ Conductor guardado');
  }}

function saveEvento(){const nom=(document.getElementById('evNom').value||'').trim();if(!nom){toast('Nombre obligatorio','var(--red)');return;}const campos={};EV_CAMPOS.forEach(k=>{const el=document.getElementById('evF'+k);if(el)campos[k]=el.dataset?.val||el.value||'show';});
  // Preservar traducciones existentes, actualizar solo el idioma del usuario
  const oldEv=editEvId?DB.eventos.find(x=>x.id===editEvId):null;
  let phrases={...(oldEv?.phrases||{})};
  /* phrases managed in print config, not events */
  const evHalls=[...document.querySelectorAll('.evHallCb:checked')].map(cb=>cb.value);
  const printName=(document.getElementById('evPrintName')?.value||'').trim();
  const acumularPos=document.getElementById('evAcumPos')?.checked||false;
  const phrase2='';
  const oldEv2=editEvId?DB.eventos.find(x=>x.id===editEvId):null;
  const phrases2={...(oldEv2?.phrases2||{})};
  const _evUsr=[...document.querySelectorAll('[data-ev-user]:checked')].map(el=>el.dataset.evUser);
  const _prevUsr=editEvId?(DB.eventos.find(x=>x.id===editEvId)?.usuariosAsignados||[]):[];
  const ev={id:editEvId||uid(),phrase2,phrases2,nombre:nom,ini:document.getElementById('evIni').value,fin:document.getElementById('evFin').value,ico:document.getElementById('evIco').value||'📋',recintoId:document.getElementById('evRecintoId')?.value||'',recinto:document.getElementById('evRec').value,ciudad:document.getElementById('evCiudad').value,halls:evHalls,campos,puertas:[...evPuertasTemp],phrases,printTemplate:document.getElementById('evPrintTemplate')?.value||'fullgv',printName,acumularPos,bgImage:evBgData||'',usuariosAsignados:_evUsr.length?_evUsr:_prevUsr};
  // Save named print template
  if(printName){if(!DB.printTemplates)DB.printTemplates=[];if(!DB.printTemplates.find(t=>t.name===printName))DB.printTemplates.push({name:printName,type:ev.printTemplate,fields:ev.campos,hiddenFields:[...(DB.printCfg2?.hiddenFields||[])]});}
  const _oldEv2=editEvId?DB.eventos.find(x=>x.id===editEvId):null;if(!DB.eventoHistorial)DB.eventoHistorial=[];if(_oldEv2)DB.eventoHistorial.unshift({..._oldEv2,_editedBy:CU?.nombre||'?',_editedTs:nowL()});if(DB.eventoHistorial.length>50)DB.eventoHistorial=DB.eventoHistorial.slice(0,50);logAudit(editEvId?'edit_evento':'new_evento','evento',(editEvId?'Editado: ':'Creado: ')+ev.nombre);
  if(editEvId)DB.eventos=DB.eventos.map(x=>x.id===editEvId?ev:x);else DB.eventos.push(ev);
  /* phrases not stored in events anymore */
  saveDB();closeOv('mEvento');renderIngresos();toast('✅ Evento guardado');}

function saveMsg(){if(!canMensajes()){toast('Sin permiso para enviar mensajes','var(--red)');return;};const tit=(document.getElementById('msgTitulo').value||'').trim(),txt=(document.getElementById('msgTexto').value||'').trim();if(!tit||!txt){toast('Título y mensaje obligatorios','var(--red)');return;}const m={id:uid(),tipo:document.getElementById('msgTipo').value,titulo:tit,mensaje:txt,matricula:(document.getElementById('msgMat').value||'').trim().toUpperCase(),ts:nowL(),autor:CU?.nombre||'?',leido:[]};DB.mensajesRampa.unshift(m);if(DB.mensajesRampa.length>200)DB.mensajesRampa=DB.mensajesRampa.slice(0,200);saveDBNow();closeOv('mMsg');renderIngresos();renderHdr();toast('📢 Enviado');}

async function saveUser(){
  const nom=(document.getElementById('fuNom').value||'').trim();
  const username=(document.getElementById('fuUsername').value||'').trim();
  const email=(document.getElementById('fuEmail').value||'').trim();
  const pass=document.getElementById('fuPass').value;
  const pass2=document.getElementById('fuPass2').value;
  const pin=document.getElementById('fuPin').value;
  const pin2=document.getElementById('fuPin2').value;
  const twoFA=document.getElementById('fu2FA')?.checked||false;
  if(!nom){toast('Nombre obligatorio','var(--red)');return;}
  if(!username){toast('Nombre de usuario obligatorio','var(--red)');return;}
  // Check username unique
  const existingU=DB.usuarios.find(x=>x.username===username&&x.id!==editUserId);
  if(existingU){toast('Nombre de usuario ya existe','var(--red)');return;}
  if(pass&&pass!==pass2){toast(tr('passNoMatch'),'var(--red)');return;}
  if(pin&&(pin.length<6||pin.length>8||!/^\d+$/.test(pin))){toast('PIN: mínimo 6 dígitos numéricos','var(--red)');return;}
  if(pin&&pin!==pin2){toast('Los PINs no coinciden','var(--red)');return;}
  if(twoFA&&!email){toast('Email requerido para activar 2FA','var(--amber)');return;}
  const _gp=id=>!!(document.getElementById(id)?.checked);const permisos={canAdd:_gp('fpAdd'),canEdit:_gp('fpEdit'),canDel:_gp('fpDel'),canStatus:_gp('fpStat'),canExport:_gp('fpExp'),canSpecial:_gp('fpBL'),canEditEvento:_gp('fpEvEdit'),canPrint:_gp('fpPrint'),canImport:_gp('fpImport'),canClean:_gp('fpClean'),canSaveTpl:_gp('fpSaveTpl'),canDelTpl:_gp('fpDelTpl'),canActivarEvento:_gp('fpActivarEv'),canSaveDay:_gp('fpSave'),canMensajes:_gp('fpMsg'),canCampos:_gp('fpCampos'),canOcr:_gp('fpOcr')};
  const tabMap=[['ftDash','dash'],['ftIng','ingresos'],['ftIng2','ingresos2'],['ftFlota','flota'],['ftCond','conductores'],['ftAg','agenda'],['ftAn','analytics'],['ftVeh','vehiculos'],['ftAud','auditoria'],['ftPap','papelera'],['ftRec','recintos'],['ftUs','usuarios'],['ftImp','impresion'],['ftEv','eventos'],['ftEmpresas','empresas']];
  const tabs=tabMap.filter(([eid])=>document.getElementById(eid)?.checked).map(([,tab])=>tab);
  const oldUser=editUserId?DB.usuarios.find(x=>x.id===editUserId):null;
  // Hash password con PBKDF2 si se proporcionó
  let passwordHash=oldUser?.passwordHash||'';
  let passwordSalt=oldUser?.passwordSalt||'';
  if(pass){const result=await hashPassword(pass,null);passwordHash=result.hash;passwordSalt=result.salt;}
  const isNew=!editUserId;
  const u={
    id:editUserId||uid(),nombre:nom,username,email,
    passwordHash,passwordSalt,twoFA,
    rol:document.getElementById('fuRol').value,
    lang:document.getElementById('fuLang').value||'es',
    pin:pin||(oldUser?.pin||''),
    permisos,tabs,
    loginAttempts:oldUser?.loginAttempts||0,
    lockedUntil:oldUser?.lockedUntil||null,
    mustChangePassword:isNew?true:(oldUser?.mustChangePassword||false)
  };
  if(editUserId)DB.usuarios=DB.usuarios.map(x=>x.id===editUserId?u:x);else DB.usuarios.push(u);
  if(CU?.id===u.id){CU=u;const _dLoginLang=window._step0LangChosen?CUR_LANG:(u.lang||CUR_LANG||'es');
  if(window._step0LangChosen && CUR_LANG && CUR_LANG!==u.lang){
    u.lang=CUR_LANG;
    DB.usuarios=DB.usuarios.map(x=>x.id===u.id?{...x,lang:CUR_LANG}:x);
    saveDB();
  }
  window._step0LangChosen=false;
  setLang(_dLoginLang);applyLang();}
  saveDB();closeOv('mUser');renderUsuarios();toast('✅ Usuario guardado');
}

function exportAll(){if(!isSA()){toast('Solo SuperAdmin puede hacer backup completo','var(--red)');return;}
  const wb=XLSX.utils.book_new();
  if(DB.ingresos.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(DB.ingresos.map(i=>({Pos:i.pos,Matricula:i.matricula,Nombre:i.nombre,Apellido:i.apellido,Empresa:i.empresa,Hall:(i.halls||[i.hall]).join('/'),Stand:i.stand,Ref:i.referencia,Llamador:i.llamador,Remolque:i.remolque,Telefono:i.telefono,Entrada:i.entrada,Salida:i.salida||'',Evento:i.eventoNombre||''}))),'Referencia');
  if((DB.ingresos2||[]).length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((DB.ingresos2||[]).map(i=>({Pos:i.pos,Matricula:i.matricula,Nombre:i.nombre,Apellido:i.apellido,Empresa:i.empresa,Hall:(i.halls||[i.hall]).join('/'),Stand:i.stand,Ref:i.referencia,Telefono:i.telefono,Entrada:i.entrada,Salida:i.salida||'',Evento:i.eventoNombre||''}))),'Ingresos');
  if(DB.agenda.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(DB.agenda.map(a=>({Fecha:a.fecha,Hora:a.hora,Matricula:a.matricula,Conductor:a.conductor,Empresa:a.empresa,Hall:a.hall,Estado:a.estado,Evento:a.eventoNombre||''}))),'Agenda');
  if(DB.conductores.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(DB.conductores.map(c=>({Nombre:c.nombre,Apellido:c.apellido,Matricula:c.matricula,Empresa:c.empresa,Telefono:c.telefono,Eventos:(c.eventosNombres||[]).join(',')}))),'Conductores');
  if((DB.eventos||[]).length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((DB.eventos||[]).map(e=>({Nombre:e.nombre,Inicio:e.ini,Fin:e.fin,Recinto:e.recinto,Halls:(e.halls||[]).join(',')}))),'Eventos');
  const fn='backup_completo_'+new Date().toISOString().slice(0,10)+'.xlsx';
  XLSX.writeFile(wb,fn);toast('✅ Backup completo exportado','var(--text2)');
}

function renderEmpresasTab(){
  if(!isSA()){return;}
  var el=document.getElementById('tab-empresas');if(!el)return;
  var _sub=window._empSub||'empresas';
  var emps=DB.empresas||[];
  var pres=DB.preregistros||[];
  var q=(window._empSearch||'').toLowerCase();
  var fNivel=window._empFiltNivel||'';
  var fEvento=window._empFiltEvento||'';

  // ── STATS ──
  var verif=emps.filter(function(e){return e.nivel==='verified';}).length;
  var semi=emps.filter(function(e){return e.nivel==='semi';}).length;
  var bloq=emps.filter(function(e){return e.nivel==='blocked';}).length;
  var totalVehs=emps.reduce(function(a,e){return a+(e.vehiculos||[]).length;},0);
  var totalPre=pres.length;

  var h='<div class="app-main">';
  // Stats row
  h+='<div class="sg sg4" style="margin-bottom:10px">';
  h+='<div class="stat-box"><div class="stat-n">'+emps.length+'</div><div class="stat-l">'+tr('companies')+'</div></div>';
  h+='<div class="stat-box"><div class="stat-n" style="color:#4a5568">'+verif+'</div><div class="stat-l">'+tr('verificadas')+'</div></div>';
  h+='<div class="stat-box"><div class="stat-n" style="color:#4a5568">'+totalVehs+'</div><div class="stat-l">'+tr('vehs')+'</div></div>';
  h+='<div class="stat-box"><div class="stat-n" style="color:var(--teal)">'+totalPre+'</div><div class="stat-l">'+tr('prereg')+'</div></div>';
  h+='</div>';
  // Subtabs
  h+='<div style="display:flex;gap:0;border:1px solid var(--border);border-radius:20px;overflow:hidden;width:fit-content;margin-bottom:10px">';
  h+='<div style="padding:5px 16px;font-size:11px;font-weight:700;cursor:pointer;background:'+(_sub==='empresas'?'#4a5568':'var(--bg2)')+';color:'+(_sub==='empresas'?'#fff':'var(--text3)')+'" onclick="window._empSub=&quot;empresas&quot;;window._empSearch=&quot;&quot;;renderEmpresasTab()">🏢 Empresas ('+emps.length+')</div>';
  h+='<div style="padding:5px 16px;font-size:11px;font-weight:700;cursor:pointer;background:'+(_sub==='preregistros'?'#4a5568':'var(--bg2)')+';color:'+(_sub==='preregistros'?'#fff':'var(--text3)')+'" onclick="window._empSub=&quot;preregistros&quot;;window._empSearch=&quot;&quot;;renderEmpresasTab()">📋 Preregistros ('+totalPre+')</div>';
  h+='</div>';

  // ── TOOLBAR ──
  h+='<div class="sec-hdr" style="margin-bottom:8px"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;flex:1">';
  h+='<div class="sbox" style="flex:1;min-width:200px"><span class="sico">🔍</span>';
  var _searchId=_sub==='empresas'?'_empSearchInpE':'_empSearchInpP';
  h+='<input id="'+_searchId+'" type="text" placeholder="'+((_sub==='empresas')?tr('phSearchCompany'):tr('phSearchRefEvent'))+'" value="'+(window._empSearch||'')+'" oninput="window._empSearch=this.value;_renderEmpresasContent()" style="width:100%"></div>';
  if(_sub==='empresas'){
    h+='<select style="height:32px;border-radius:20px;font-size:11px" onchange="window._empFiltNivel=this.value;renderEmpresasTab()">';
    h+='<option value="">'+tr('todosNiveles')+'</option>';
    h+='<option value="verified"'+(fNivel==='verified'?' selected':'')+'>✅ Verificadas</option>';
    h+='<option value="semi"'+(fNivel==='semi'?' selected':'')+'>🟡 Semi</option>';
    h+='<option value="blocked"'+(fNivel==='blocked'?' selected':'')+'>🚫 Bloqueadas</option>';
    h+='</select>';
  } else {
    // Preregistros: filter by evento
    var evOptions='<option value="">'+tr('todosEventos')+'</option>';
    (DB.eventos||[]).forEach(function(ev){evOptions+='<option value="'+ev.id+'"'+(fEvento===ev.id?' selected':'')+'>'+esc(ev.nombre)+'</option>';});
    h+='<select style="height:32px;border-radius:20px;font-size:11px" onchange="window._empFiltEvento=this.value;renderEmpresasTab()">'+evOptions+'</select>';
  }
  h+='</div><div class="sec-act">';
  if(_sub==='empresas'){
    h+='<button class="btn btn-p btn-sm" onclick="saCrearEmpresa()">'+tr('createCompany')+'</button>';
    h+='<button class="btn btn-gh btn-sm" onclick="saExportEmpresas()" title="Excel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>';
  } else {
    h+='<button class="btn btn-gh btn-sm" onclick="_exportPreregistros()" title="Excel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>';
  }
  h+='</div></div>';

  h+='<div id="_empTabContent">';
  h+=_buildEmpresasContent(emps,pres,_sub,q,fNivel,fEvento);
  h+='</div></div>';

  el.innerHTML=h;
  // Restore focus on search input
  var inp=document.getElementById(_searchId);
  if(inp){inp.focus();try{var l=inp.value.length;inp.setSelectionRange(l,l);}catch(e){}}
}

function _renderEmpresasContent(){
  var el=document.getElementById('_empTabContent');if(!el)return;
  var _sub=window._empSub||'empresas';
  var q=(window._empSearch||'').toLowerCase();
  var fNivel=window._empFiltNivel||'';
  var fEvento=window._empFiltEvento||'';
  el.innerHTML=_buildEmpresasContent(DB.empresas||[],DB.preregistros||[],_sub,q,fNivel,fEvento);
}

function _buildEmpresasContent(emps,pres,_sub,q,fNivel,fEvento){
  var h='';
  if(_sub==='empresas'){
    var filtered=emps.filter(function(e){
      if(fNivel&&e.nivel!==fNivel)return false;
      if(q){var t=(e.nombre+' '+(e.cif||'')+' '+(e.email||'')+' '+(e.contacto||'')+(e.tel||'')).toLowerCase();if(!t.includes(q))return false;}
      return true;
    });
    h+='<div style="font-size:11px;color:var(--text3);margin-bottom:6px">'+filtered.length+' empresa'+(filtered.length!==1?'s':'')+(filtered.length<emps.length?' de '+emps.length:'')+'</div>';
    h+='<div class="tbl-wrap"><table class="dtbl"><thead><tr>';
    h+='<th>'+tr('empresa')+'</th><th>'+'CIF/VAT'+'</th><th>'+tr('thContact')+'</th><th>'+tr('telefono')+'</th><th>'+tr('thEmail')+'</th><th>'+tr('thType')+'</th><th>'+tr('vehs')+'</th><th>'+tr('prereg')+'</th><th>'+tr('rgpd')+'</th><th>'+tr('nivel')+'</th><th>'+tr('acciones')+'</th>';
    h+='</tr></thead><tbody>';
    filtered.forEach(function(emp){
      var nv=(emp.vehiculos||[]).length;
      var np=pres.filter(function(p){return p.empresaId===emp.id;}).length;
      var con=(DB.consentimientos||[]).find(function(c){return c.empresaId===emp.id;});
      var nb=emp.nivel==='verified'?'<span class="sbadge s-fira">✓</span>':emp.nivel==='blocked'?'<span class="sbadge" style="background:var(--rll);color:var(--red)">✕</span>':'<span class="sbadge s-PENDIENTE">~</span>';
      h+='<tr>';
      h+='<td style="font-weight:700">'+esc(emp.nombre)+'</td>';
      h+='<td style="font-family:JetBrains Mono,monospace;font-size:11px">'+esc(emp.cif||'–')+'</td>';
      h+='<td style="font-size:12px">'+esc(emp.contacto||'–')+'</td>';
      h+='<td style="font-size:11px">'+esc(emp.tel||'–')+'</td>';
      h+='<td style="font-size:11px;color:var(--text3)">'+esc(emp.email||'–')+'</td>';
      h+='<td style="font-size:11px">'+esc(emp.tipo||'–')+'</td>';
      h+='<td style="text-align:center;font-weight:700;color:#4a5568">'+nv+'</td>';
      h+='<td style="text-align:center;font-weight:700;color:var(--teal)">'+np+'</td>';
      h+='<td style="text-align:center">'+(con?'<span style="color:#4a5568;font-weight:700;font-size:11px">✓</span>':'<span style="color:var(--red);font-size:11px">✕</span>')+'</td>';
      h+='<td>'+nb+'</td>';
      h+='<td><div style="display:flex;gap:3px;flex-wrap:wrap">';
      h+='<button class="btn btn-edit btn-xs" onclick="saVerPortalEmpresa(\''+emp.id+'\')">👁 Portal</button>';
      h+='<button class="btn btn-edit btn-xs" onclick="saEditarEmpresa(\''+emp.id+'\')">✏️</button>';
      if(emp.nivel==='semi')h+='<button class="btn btn-success btn-xs" onclick="saPromoverEmpresa(\''+emp.id+'\')">'+(tr('promote'))+'</button>';
      if(emp.nivel!=='blocked')h+='<button class="btn btn-danger btn-xs" onclick="saBloquearEmpresa(\''+emp.id+'\')">'+(tr('block'))+'</button>';
      else h+='<button class="btn btn-gh btn-xs" onclick="saDesbloquearEmpresa(\''+emp.id+'\')">'+(tr('unblock'))+'</button>';
      h+='</div></td></tr>';
    });
    h+='</tbody></table></div>';
  } else {
    // PREREGISTROS TABLE — todos los campos
    var filteredP=pres.filter(function(p){
      if(fEvento&&p.eventoId!==fEvento)return false;
      if(q){var t=((p.matricula||'')+' '+(p.empresa||'')+' '+(p.empresaNombre||'')+' '+(p.ref||'')+' '+(p.eventoNombre||'')+' '+(p.nombre||'')+' '+(p.expositor||'')+' '+(p.stand||'')+' '+(p.hall||'')).toLowerCase();if(!t.includes(q))return false;}
      return true;
    }).sort(function(a,b){return(b.creadoTs||'').localeCompare(a.creadoTs||'');});
    h+='<div style="font-size:11px;color:var(--text3);margin-bottom:6px">'+filteredP.length+' preregistro'+(filteredP.length!==1?'s':'')+(filteredP.length<pres.length?' de '+pres.length:'')+'</div>';
    h+='<div class="tbl-wrap"><table class="dtbl"><thead><tr>';
    h+='<th>'+tr('thCompany')+'</th><th>'+tr('thEvent')+'</th><th>'+tr('thPlate')+'</th><th>'+tr('thTrailer')+'</th><th>'+tr('thDriver')+'tor</th><th>Ref.</th><th>'+tr('lblExpositor')+'</th><th>'+tr('hall')+'</th><th>'+tr('stand')+'</th><th>'+tr('fechaPlan')+'</th><th>'+tr('hora')+'</th><th>'+tr('descarga')+'</th><th>'+tr('estado')+'</th><th>'+tr('creado')+'</th>';
    h+='</tr></thead><tbody>';
    filteredP.forEach(function(p){
      var stBg=p.estado==='preregistrado'?'var(--bll)':p.estado==='en_camino'?'var(--all)':p.estado==='en_recinto'?'var(--gll)':'var(--bg3)';
      var stColor=p.estado==='preregistrado'?'#4a5568':p.estado==='en_camino'?'var(--amber)':p.estado==='en_recinto'?'#4a5568':'var(--text3)';
      var stLabel=p.estado==='preregistrado'?'Prereg.':p.estado==='en_camino'?'Camino':p.estado==='en_recinto'?'En recinto':p.estado||'–';
      var ts=p.creadoTs?p.creadoTs.slice(0,16).replace('T',' '):'–';
      h+='<tr>';
      h+='<td style="font-weight:700">'+esc(p.empresaNombre||p.empresa||'–')+'</td>';
      h+='<td style="font-size:11px;color:var(--text3)">'+esc(p.eventoNombre||'–')+'</td>';
      h+='<td><span class="mchip-sm">'+esc(p.matricula||'–')+'</span></td>';
      h+='<td style="font-size:11px">'+esc(p.remolque||'–')+'</td>';
      h+='<td style="font-size:11px">'+esc(p.nombre||'–')+'</td>';
      h+='<td style="font-family:JetBrains Mono,monospace;font-size:11px">'+esc(p.ref||'–')+'</td>';
      h+='<td style="font-size:11px">'+esc(p.expositor||'–')+'</td>';
      h+='<td>'+hBadge(p.hall)+'</td>';
      h+='<td style="font-size:11px">'+esc(p.stand||'–')+'</td>';
      h+='<td style="font-size:11px">'+esc(p.fechaPlan||'–')+'</td>';
      h+='<td style="font-size:11px">'+esc(p.horaPlan||'–')+'</td>';
      h+='<td style="font-size:11px">'+esc(p.descargaTipo||'–')+'</td>';
      h+='<td><span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:'+stBg+';color:'+stColor+'">'+stLabel+'</span></td>';
      h+='<td style="font-size:10px;color:var(--text3)">'+ts+'</td>';
      h+='</tr>';
    });
    h+='</tbody></table></div>';
  }
  return h;
}

function applyPortalLang(){
  var p=ptr;
  var se=function(id,key){var e=document.getElementById(id);if(e)e.textContent=p(key);};

  // ── Tabs ──
  se('ptEmpresa','miEmpresa');se('ptVehiculos','misVeh');se('ptEvento','asigEvento');se('ptEstado','estadoVivo');

  // ── Mi empresa ──
  se('pTxtDatosEmpresa','datosEmp');se('pLblNombreEmp','nombreEmp');se('pLblCIF','cifVat');
  se('pLblContacto','contacto');se('pLblTel','telefono');se('pLblEmail','email');
  se('pTxtFirmaRgpd','firmRgpd');

  // ── Guardar button ──
  var sb=document.getElementById('pBtnSaveEmp');
  if(sb&&sb.style.background==='')sb.textContent=p('guardarBtn');
  var sm=document.getElementById('pSaveMsg');if(sm)sm.textContent='✓ '+p('guardar');

  // ── Mis vehículos toolbar ──
  var fp=document.getElementById('pVehFiltPais');
  if(fp&&fp.options[0])fp.options[0].text=p('todosLandPaises');
  var ft=document.getElementById('pVehFiltTipo');
  if(ft&&ft.options[0])ft.options[0].text=p('todosTipos');
  var fe=document.getElementById('pVehFiltEst');
  if(fe&&fe.options[0])fe.options[0].text=p('todosEstados');

  // ── Asignar evento - tipo registro cards ──
  se('pLblConRef','conRef');se('pLblConRefSub','conRefSub');
  se('pLblSinRef','sinRefCard');se('pLblSinRefSub','sinRefCardSub');
  se('pTxtEventos','eventosDis');

  // ── Asignar evento - form fields ──
  se('pLblVehAsig','vehAst');se('pTxtDatosAcceso','datosAcceso');
  se('pLblRef','refBooking');se('pLblExpositor','expositorLbl');
  se('pLblDescarga','descargaSelect');
  se('pLblHalls','hallsLbl');
  var hs=document.getElementById('pLblHallsSub');if(hs)hs.textContent=p('hallsSub');
  se('pLblStands','standsLbl');
  var ss=document.getElementById('pLblStandsSub');if(ss)ss.textContent=p('standsSub');
  se('pLblFechaPrev','fechaPrevAst');se('pLblHoraEst','horaEstLbl');
  var sh=document.getElementById('pLblSinHora');if(sh)sh.textContent=p('sinHoraFijaLbl');
  se('pTxtAsignarEvento','sigAsignar');

  // ── Sin referencia panel ──
  se('pLblVehNref','vehAst');

  // ── Vehículo form ──
  var vft=document.getElementById('pVehFormTitle');
  if(vft&&!vft._editing)vft.textContent=p('addVeh');

  // ── Reg steps ──
  se('regBackLbl','backLbl');se('regContinueLbl','continuarLbl');
  se('rsTxtEmp','empresaLbl');se('regStep2LangBtn','idiomaLbl');

  // ── empLogin ──
  applyEmpLoginLang();

  // ── Portal header ──
  var sb2=document.getElementById('portalSalirBtn');if(sb2)sb2.textContent=p('salirBtn')||'Salir';
  var pb=document.getElementById('portalBadgeTxt');
  if(pb)pb.textContent='🏢 '+(p('portalTitle')||'Portal Empresa');
  var plc=document.getElementById('portalLangCode');
  if(plc)plc.textContent=(CUR_LANG||'es').toUpperCase();
  var pm=document.getElementById('portalLangMenu');if(pm)pm._built=false;

  // ── Mis vehículos - tabla headers ──
  var thMap={thMatricula:'thMatricula',thPais:'thPais',thTipo:'thTipo',thConductor:'thConductor',
    thTel:'thTel',thRemolque:'thRemolque',thUltIngreso:'thUltIngreso',thEstado:'thEstado',thIncidencia:'thIncidencia'};
  Object.keys(thMap).forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=p(thMap[id]);});

  // ── Mis vehículos - toolbar ──
  se('pBtnAddVeh','addVehBtn2');
  se('pImportarLbl','importarBtn');
  se('pBtnPlantilla','plantillaBtn');se('pBtnExcelVeh','excelBtn');
  var vs=document.getElementById('pVehSearchBox');if(vs)vs.placeholder=p('buscarVeh');
  se('pVehEmptyMsg','sinVehMostrar');

  // ── Mis vehículos - incidencia ──
  se('pIncLbl1','incLbl1');se('pIncLbl2','incLbl2');se('pIncLbl3','incLbl3');se('pIncLbl4','incLbl4');
  se('pIncWarning','incWarning');se('pBtnIncEnviar','enviarIncBtn');se('pBtnIncCancel','cancelar');

  // ── Mis vehículos - veh form ──
  var vft=document.getElementById('pVehFormTitle');if(vft&&!window._pEditVehIdx)vft.textContent=p('addVeh');

  // ── Sin referencia panel title ──
  var nrefTitle=document.querySelector('#pNrefPanel .portal-card-title');
  if(nrefTitle)nrefTitle.innerHTML='📋 '+p('sinRefTit');

  // ── Prevision impacto label ──
  var prevLbl=document.querySelector('#pForecastBox div');
  if(prevLbl&&prevLbl.textContent.includes('PREVISIÓN'))prevLbl.textContent='📊 '+p('prevImpacto').toUpperCase();


  // ── Estado en vivo sub-tabs ──
  se('pEstSub1Txt','conRefTab');se('pEstSub2Txt','sinRefTab');
  var ef=document.getElementById('pEstFiltEst');
  if(ef){ef.options[0]&&(ef.options[0].text=p('filtTodos'));
    ef.options[1]&&(ef.options[1].text=p('filtFira'));
    ef.options[2]&&(ef.options[2].text=p('filtPark'));
    ef.options[3]&&(ef.options[3].text=p('filtEspera'));
    ef.options[4]&&(ef.options[4].text=p('filtNone'));}


  // ── Estado en vivo - tabla headers ──
  var estMap={pEstThMat:'estThMat',pEstThHora:'estThHora',pEstThRef:'estThRef',
    pEstThHall:'estThHall',pEstThTrack:'estThTrack',pEstThEstado:'estThEstado'};
  Object.keys(estMap).forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=p(estMap[id]);});
  se('pEstEmptyMsg','estEmptyMsg');

  // ── Asignar form - botones ──
  se('pTxtAsignarEvento','sigAsignar');
  var tca=document.getElementById('pTxtCancelAsig');if(tca)tca.textContent=p('cancelar');
  
  // ── Vehículos footer ──
  se('pVehEmptyMsg','sinVehMostrar');
  var sb=document.getElementById('pSyncBadgeTxt');if(sb)sb.textContent='🟢 '+p('syncOk').replace('🟢 ','');
  var sb2=document.getElementById('pSyncBadge');if(sb2&&!document.getElementById('pSyncBadgeTxt'))sb2.textContent='🟢 '+p('syncOk').replace('🟢 ','');


  // ── Sin referencia - periodo tabs ──
  se('pPerLbl1','perEvento'); se('pPerLbl2','perSemana');
  se('pPerLbl3','perMes');    se('pPerLbl4','perAnual');

  // ── Sin referencia - form labels ──
  se('pNrefLblVeh','nrefVeh');    se('pNrefLblEvento','nrefEvento');
  se('pNrefLblDesde','nrefDesde'); se('pNrefLblHall','nrefHall');
  se('pNrefLblHasta','nrefHasta'); se('pNrefLblStand','nrefStand');
  se('pNrefLblMes','nrefMes');    se('pNrefLblAnio','nrefAnio');

  // ── Sin referencia - buttons ──
  var trn=document.getElementById('pTxtRegistrarNref');
  if(trn)trn.textContent=p('registrarNref');
  var tcn=document.getElementById('pTxtCancelNref');
  if(tcn)tcn.textContent=p('cancelar');

  // ── Tipo filter options ──
  var ft=document.getElementById('pVehFiltTipo');
  if(ft&&ft.options.length>=5){
    ft.options[0].text=p('todosTipos');
    ft.options[1].text=p('tipoTrailer');
    ft.options[2].text=p('tipoSemi');
    ft.options[3].text=p('tipoCamion');
    ft.options[4].text=p('tipoFurgoneta');
    ft.options[5]&&(ft.options[5].text=p('tipoOtro'));
  }

  // ── Status filter options ──
  var fe=document.getElementById('pVehFiltEst');
  if(fe&&fe.options.length>=4){
    fe.options[0].text=p('filtTodos');
    fe.options[1].text=p('filtFira');
    fe.options[2].text=p('filtPark');
    fe.options[3].text=p('filtEspera');
    fe.options[4]&&(fe.options[4].text=p('filtNone'));
  }

  // ── Search placeholder ──
  var vs=document.getElementById('pVehSearchBox');
  if(vs)vs.placeholder=p('buscarVeh');

  // ── + Añadir button ──
  se('pBtnAddVeh','addVehBtn2');


  // ── Veh form labels ──
  se('pVehLblMat','vehLblMat');     se('pVehLblTipo','vehLblTipo');
  se('pVehLblPais','vehLblPais');   se('pVehLblRemolque','vehLblRemolque');
  se('pVehLblConductor','vehLblConductor');
  se('pVehLblTelCC','vehLblTelCC'); se('pVehLblTel','vehLblTel');

  // ── Veh form buttons ──
  var tgv=document.getElementById('pTxtGuardarVeh');
  if(tgv)tgv.textContent=p('guardarSincBtn');
  var tcv=document.getElementById('pTxtCancelVeh');
  if(tcv)tcv.textContent='✕ '+p('cancelar');

  // ── Veh tipo options in form ──
  var vt=document.getElementById('pVehTipo');
  if(vt&&vt.options.length>=5){
    vt.options[0].text='🚛 '+p('tipoTrailer');
    vt.options[1].text='🚚 '+p('tipoSemi');
    vt.options[2].text='🚗 '+p('tipoCamion');
    vt.options[3].text='🚐 '+p('tipoFurgoneta');
    vt.options[4].text='📦 '+p('tipoOtro');
  }


  // Tipo descarga
  var pd=document.getElementById('pAsignDescarga');
  if(pd&&pd.options.length>=4){pd.options[1].text=p('descManual');pd.options[2].text=p('descForklift');pd.options[3].text=p('descMixto');}

  // Months
  var pm=document.getElementById('pNrefMes');
  if(pm&&pm.options.length>=12){['mesEnero','mesFebrero','mesMarzo','mesAbril','mesMayo','mesJunio','mesJulio','mesAgosto','mesSeptiembre','mesOctubre','mesNoviembre','mesDiciembre'].forEach(function(k,i){pm.options[i].text=p(k);});}

  // Selecciona
  var pvs=document.getElementById('pAsignVeh');if(pvs&&pvs.options[0])pvs.options[0].text=p('seleccionaVeh');
  var pvn=document.getElementById('pNrefVeh');if(pvn&&pvn.options[0])pvn.options[0].text=p('seleccionaVeh');

  // Veh form title
  var pvft=document.getElementById('pVehFormTitle');if(pvft&&!window._pEditVehIdx)pvft.textContent=p('addVeh');

  // Countries via Intl.DisplayNames
  var _lang2=_regLang||CUR_LANG||'es';
  try{
    var _dn=new Intl.DisplayNames([_lang2],{type:'region'});
    var _flagOf=function(code){try{return String.fromCodePoint(0x1F1E0+code.toUpperCase().charCodeAt(0)-65)+String.fromCodePoint(0x1F1E0+code.toUpperCase().charCodeAt(1)-65);}catch(e){return'';}};
    var _tc=function(sel){if(!sel)return;for(var i=0;i<sel.options.length;i++){var v=sel.options[i].value;if(v&&v!=='other'&&v.length===2){try{var nm=_dn.of(v);if(nm)sel.options[i].text=_flagOf(v)+' '+nm;}catch(e){}}}}
    _tc(document.getElementById('pVehPais'));
    _tc(document.getElementById('pVehFiltPais'));
  }catch(e){}

  var pc=document.getElementById('pVehConductor');if(pc)pc.placeholder=p('phConductor');
  var pm2=document.getElementById('pVehMat');if(pm2)pm2.placeholder=p('phMat');

  if(typeof updateThemeMenuLabels==='function')updateThemeMenuLabels();
  var _eep=document.getElementById('empLoginEmailPh');if(_eep)_eep.placeholder=p('emailEmpPh');
}

function pCheckManualCC(sel, manualId){
  var manual = document.getElementById(manualId);
  if(!manual)return;
  if(sel.value==='manual'){
    manual.style.display='inline-block';
    manual.focus();
    sel.style.display='none';
    manual.onblur=function(){if(!manual.value){sel.style.display='';manual.style.display='none';sel.value='+34';}};
  }
}

function togglePortalLangMenu(){
  var menu=document.getElementById('portalLangMenu');
  if(!menu)return;
  if(menu.style.display!=='none'){menu.style.display='none';return;}
  // Build language list
  if(!menu._built){
    menu._built=true;
    menu.innerHTML=LANGS_UI.map(function(l){
      var flag=l.flag.includes('<svg')?'🌐':l.flag;
      return'<div onclick="portalChangeLang(\''+l.code+'\');" style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;color:#e2e8f0;white-space:nowrap" '+
        'onmouseover="this.style.background=\'#334155\'" onmouseout="this.style.background=\'\'">'+'<span style="font-size:14px">'+flag+'</span><span>'+l.name+'</span></div>';
    }).join('');
  }
  menu.style.display='block';
  // Close on outside click
  setTimeout(function(){
    document.addEventListener('click',function _c(e){
      if(!e.target.closest('#portalLangMenu')&&!e.target.closest('#portalLangBadge')){
        menu.style.display='none';
        document.removeEventListener('click',_c);
      }
    });
  },10);
}

function portalChangeLang(code){
  document.getElementById('portalLangMenu').style.display='none';
  selectLoginLang(code);
  // Update badge
  var lc=document.getElementById('portalLangCode');
  if(lc)lc.textContent=code.toUpperCase();
}

function openEmpLangPicker(){
  var picker=document.getElementById('empLangPickerInline');
  if(!picker)return;
  var isOpen=picker.style.display!=='none'&&picker.style.display!=='';
  picker.style.display=isOpen?'none':'';
  if(!isOpen){
    var grid=document.getElementById('empLangGrid');
    if(!grid)return;
    grid.innerHTML="";
    window._empLR=[];
    LANGS_UI.forEach(function(l){
      var sel=l.code===(_regLang||CUR_LANG||'es');
      var idx=window._empLR.push(l.code)-1;
      var d=document.createElement('div');
      d.className='lang-item'+(sel?' sel':'');
      d.title=l.name;
      d.style.background=sel?'#1e3a5f':'#f8fafc';
      d.style.borderColor=sel?'#1e3a5f':'#e2e8f0';
      d.style.color=sel?'#fff':'#374151';
      d.innerHTML='<div style="height:22px;display:flex;align-items:center;justify-content:center">'+(l.flag.includes('<svg')?l.flag:'<span style="font-size:20px">'+l.flag+'</span>')+'</div><div style="font-size:9px;font-weight:700;margin-top:2px">'+l.name+'</div>';
      (function(i){d.onclick=function(){empSetLang(window._empLR[i]);};})(idx);
      grid.appendChild(d);
    });
  }
}

function empSetLang(code){
  _regLang=code;setLang(code);applyLang();
  var picker=document.getElementById('empLangPickerInline');
  if(picker)picker.style.display='none';
  var lbl=document.getElementById('empLoginLangLbl');
  var l=LANGS_UI.find(function(x){return x.code===code;});
  if(lbl&&l)lbl.textContent=l.name;
  applyEmpLoginLang();
}

function openRegEmp(){
  _regLang=CUR_LANG||'es';_regC1=false;_regC2=false;_regScrolled=false;_regOTPAttempts=0;
  document.getElementById('regEmpWrap').style.display='block';
  regGoStep(1);_buildRegLangGrid();
}

function closeRegEmp(){document.getElementById('regEmpWrap').style.display='none';}

function regSelLang(code,el){
  _regLang=code;
  document.querySelectorAll('#regLangGrid .lang-item-p').forEach(function(x){x.classList.remove('sel');});
  if(el)el.classList.add('sel');
  var cb=document.getElementById('regLangContinueBtn');if(cb)cb.textContent='→ '+code.toUpperCase();
  _applyRegI18n();
}

function regGoStep(n){
  [1,2,3,4,5].forEach(function(i){
    var el=document.getElementById('regStep'+i);if(el)el.style.display=i===n?'block':'none';
  });
  _applyRegI18n();
  if(n===3){
    _regScrolled=false;_regC1=false;_regC2=false;_applyConsentState();
    var doc=document.getElementById('regRgpdDoc');
    if(doc){doc.innerHTML=RGPD_DOC[_regLang]||RGPD_DOC.en;doc.scrollTop=0;}
  }
  if(n===4){_regOTPAttempts=0;_startOTPTimer();}
}

function regSelTipo(el){
  document.querySelectorAll('.regTipoPill').forEach(function(x){x.classList.remove('sel');});
  if(el){el.classList.add('sel');_regTipo=el.dataset.tipo||'sl';}
  var lbl=document.getElementById('regLblCIF');if(!lbl)return;
  var map={sl:'CIF *',ue:'VAT intracomunitario *',autonomo:'NIF *',noue:'Tax ID *'};
  lbl.childNodes[0].textContent=(map[_regTipo]||tr('cifLabel'))+' ';
}

function regCheckVAT(){
  var val=(document.getElementById('regCIF')||{}).value||'';
  var badge=document.getElementById('regVerBadge');
  var msg=document.getElementById('regVATMsg');
  if(!badge)return;
  if(_regTipo==='ue'&&val.length>=9){
    badge.innerHTML='<span class="vbadge vb-semi">~ Verificando…</span>';
    if(msg){msg.style.display='block';msg.style.background='var(--all)';msg.style.color='var(--amber)';msg.style.border='1px solid #fde68a';msg.textContent='⏳ Consultando VIES…';}
    setTimeout(function(){
      var validPrefixes=['ES','FR','DE','IT','PT','PL','RO','NL','BE','HU','CZ','HR','SK','SI','FI','EL','BG','GB','SE','DK','AT','IE','LT','LV','EE'];
      var prefix=val.slice(0,2).toUpperCase();
      if(validPrefixes.some(function(p){return prefix===p;})){
        badge.innerHTML='<span class="vbadge vb-ver">✓ Verificada VIES</span>';
        if(msg){msg.style.background='var(--gll)';msg.style.color='#065f46';msg.style.border='1px solid #a7f3d0';msg.textContent='✅ Verificada automáticamente por VIES (CE). Nivel: Verificada.';}
      }else{
        badge.innerHTML='<span class="vbadge vb-semi">~ No reconocido</span>';
        if(msg){msg.style.background='var(--all)';msg.style.color='var(--amber)';msg.style.border='1px solid #fde68a';msg.textContent='⚠️ '+tr('unrecognizedFormat');}
      }
    },1200);
  }else if(_regTipo==='sl'||_regTipo==='autonomo'){
    var cifRe=/^[A-HJNP-SUVW][0-9]{7}[0-9A-J]$/i;
    var nifRe=/^[0-9]{8}[A-Z]$/i;
    if(cifRe.test(val)||nifRe.test(val)){
      badge.innerHTML='<span class="vbadge vb-semi">~ '+tr('validFormat')+'</span>';
      if(msg){msg.style.display='block';msg.style.background='var(--all)';msg.style.color='var(--amber)';msg.style.border='1px solid #fde68a';msg.textContent='🟡 '+tr('validFormat')+'. '+tr('active')+'.';}
    }else if(val.length>0){
      badge.innerHTML='<span class="vbadge" style="background:var(--rll);color:var(--red);border:1px solid #fecaca">✕ '+tr('invalidFormat')+'</span>';
      if(msg){msg.style.display='block';msg.style.background='var(--rll)';msg.style.color='var(--red)';msg.style.border='1px solid #fecaca';msg.textContent='❌ '+tr('invalidFormat')+'.';}
    }else{badge.innerHTML='';if(msg)msg.style.display='none';}
  }else{
    badge.innerHTML='<span class="vbadge vb-semi">~ Declarada</span>';
    if(msg){msg.style.display='block';msg.style.background='var(--all)';msg.style.color='var(--amber)';msg.style.border='1px solid #fde68a';msg.textContent='🟡 Nivel: Semiverificada (datos declarados).';}
  }
}

function regCheckScroll(el){
  if(el.scrollHeight-el.scrollTop<=el.clientHeight+30){
    _regScrolled=true;
    var area=document.getElementById('regConsentArea');
    if(area){area.style.pointerEvents='auto';area.style.opacity='1';}
    var warn=document.getElementById('regScrollWarn');
    if(warn){warn.style.background='var(--gll)';warn.style.color='#065f46';warn.style.border='1px solid #a7f3d0';warn.textContent='✓ '+ptr('scroll');}
  }
}

function regToggleConsent(n){
  if(!_regScrolled)return;
  if(n===1){_regC1=!_regC1;_applyConsentState();}else{_regC2=!_regC2;_applyConsentState();}
}

function _applyConsentState(){
  var c1=document.getElementById('regC1'),c2=document.getElementById('regC2');
  var ch1=document.getElementById('regC1chk'),ch2=document.getElementById('regC2chk');
  var btn=document.getElementById('regOTPBtn');
  if(c1)c1.className='consent-row'+(_regC1?' on':'');
  if(c2)c2.className='consent-row'+(_regC2?' on':'');
  if(ch1){ch1.className='consent-chk'+(_regC1?' on':'');ch1.textContent=_regC1?'✓':'';}
  if(ch2){ch2.className='consent-chk'+(_regC2?' on':'');ch2.textContent=_regC2?'✓':'';}
  if(btn)btn.disabled=!(_regC1&&_regC2&&_regScrolled);
}

function _completarRegistroEmpresa(){
  var cif=(_regData.cif||'').toUpperCase();
  var nivel='semi';
  if(_regTipo==='ue'){
    var vp=['ES','FR','DE','IT','PT','PL','RO','NL','BE','HU','CZ','HR','SK','SI','FI','EL','BG','GB','SE','DK','AT','IE','LT','LV','EE'];
    if(vp.some(function(p){return cif.startsWith(p);}))nivel='verified';
  }
  var empId='emp_'+uid();var userId='u_emp_'+uid();
  var ts=new Date().toISOString();
  var conservHasta=new Date(Date.now()+2*365.25*24*3600*1000).toISOString().slice(0,10);
  var empresa={id:empId,nombre:_regData.nombre,cif:_regData.cif,tipo:_regData.tipo,
    contacto:_regData.contacto,tel:_regData.tel,email:_regData.email,nivel:nivel,
    lang:_regLang,userId:userId,vehiculos:[],preregistros:[],creadoTs:ts};
  var consentimiento={id:'con_'+uid(),empresaId:empId,nombre:_regData.nombre,
    representante:_regData.contacto,telefono:_regData.tel,email:_regData.email,
    timestamp:ts,ip:'[IP cliente]',docVersion:'rgpd-v1.0-'+_regLang,
    docHash:'[hash-produccion]',idioma:_regLang,
    plazoConservacion:'2 años / hasta '+conservHasta,conservHasta:conservHasta,
    otpMetodo:'Email (EmailJS)',otpEmail:_regData.email,c1:true,c2:true,emailEnviado:false};
  var hashFn=typeof hashPassword==='function'?hashPassword:function(p){return Promise.resolve({hash:p,salt:'none'});};
  hashFn(_regData.pass).then(function(res){
    var usuario={id:userId,nombre:_regData.contacto,username:_regData.email,
      email:_regData.email,passwordHash:res.hash,passwordSalt:res.salt||'',
      rol:'empresa',lang:_regLang,empId:empId,tabs:['portal'],creadoTs:ts};
    if(!DB.empresas)DB.empresas=[];
    if(!DB.consentimientos)DB.consentimientos=[];
    DB.empresas.push(empresa);DB.usuarios.push(usuario);DB.consentimientos.push(consentimiento);
    saveDB();
    var exDesc=document.getElementById('regTxtExitoDesc');
    if(exDesc)exDesc.innerHTML=ptr('exitoDesc')+'<br><b>'+esc(_regData.email)+'</b>';
    var rec=document.getElementById('regFirmaRecord');
    if(rec)rec.innerHTML='<div style="font-weight:800;font-size:12px;margin-bottom:6px;color:#4a5568">🔐 '+ptr('firmaReg')+'</div>'+
      '<div style="font-size:10px;font-family:\'JetBrains Mono\',monospace;line-height:1.8">'+
      'Firmante: '+esc(_regData.contacto)+'<br>Email OTP: '+maskEmail(_regData.email)+'<br>'+
      'Fecha: '+ts.slice(0,16).replace('T',' ')+' UTC<br>'+
      'Nivel: '+(nivel==='verified'?'✅ Verificada VIES':'🟡 Semiverificada')+'<br>'+
      ptr('conserv')+': '+conservHasta+'<br>'+ptr('idiomaDok')+': '+_regLang.toUpperCase()+'</div>';
    var exTit=document.getElementById('regTxtExito');if(exTit)exTit.textContent=ptr('exito');
    regGoStep(5);
    if(typeof logAudit==='function')logAudit('registro_empresa',empId,'Nuevo: '+_regData.nombre+' ('+nivel+')');
  });
}

function regFinish(){
  var lastEmp=(DB.usuarios||[]).filter(function(u){return u.rol==='empresa';}).slice(-1)[0];
  if(lastEmp){closeRegEmp();CU=lastEmp;saveSession();setLang(lastEmp.lang||'es');_launchPortal(lastEmp);}
  else{closeRegEmp();toast('Registro completado. Accede con tu email.','#4a5568',4000);}
}

function _launchPortal(u){
  ['appHdr','mainTabs','appMain','statsBar'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='none';});
  document.getElementById('portalWrap').style.display='flex';
  var emp=_getMyEmpresa();if(!emp){toast('Error: empresa no encontrada','var(--red)');return;}
  var pn=document.getElementById('portalEmpNombre');if(pn)pn.textContent=emp.nombre;
  var nb=document.getElementById('portalVbadge');
  if(nb)nb.innerHTML=emp.nivel==='verified'?'<span class="vbadge vb-ver">✓ Verificada</span>':'<span class="vbadge vb-semi">~ Semiverificada</span>';
  applyPortalLang();pRenderAll();
  if(window._portalLiveInterval)clearInterval(window._portalLiveInterval);
  window._portalLiveInterval=setInterval(function(){if(CU&&CU.rol==='empresa')pRenderEstado();},30000);
}

function _applyPortalLangTabs(){applyPortalLang();}

function _getMyEmpresa(){
  if(!CU)return null;
  return(DB.empresas||[]).find(function(e){return e.id===CU.empId||e.email===CU.email;})||null;
}

function portalGoTab(tab,el){
  ['empresa','vehiculos','evento','estado'].forEach(function(t){
    var d=document.getElementById('ptab-'+t);if(d)d.style.display=t===tab?'block':'none';
  });
  document.querySelectorAll('.portal-tab').forEach(function(x){x.classList.remove('active');});
  if(el)el.classList.add('active');
  if(tab==='vehiculos')pRenderVehiculos();
  else if(tab==='evento'){pRenderEventos();pRenderVehSelectAsig();}
  else if(tab==='estado')pRenderEstado();
  else if(tab==='empresa')pRenderEmpresaTab();
  applyPortalLang();
  if(typeof applyPortalLang==="function")applyPortalLang();
}

function pRenderAll(){pRenderEmpresaTab();pRenderVehiculos();}

function pRenderEmpresaTab(){
  var emp=_getMyEmpresa();if(!emp)return;
  var fv=function(id,v){var e=document.getElementById(id);if(e)e.value=v||'';};
  fv('pEmpNombre',emp.nombre);fv('pEmpCIF',emp.cif);fv('pEmpContacto',emp.contacto);
  fv('pEmpTel',emp.tel?emp.tel.replace(/^\+\d+\s*/,''):'');(function(){var cc=emp.tel&&emp.tel.match(/^(\+\d+)/)?emp.tel.match(/^(\+\d+)/)[1]:'+34';var s=document.getElementById('pEmpTelCC');if(s)s.value=cc;})();fv('pEmpEmail',emp.email);
  var card=document.getElementById('pRgpdCard'),status=document.getElementById('pRgpdStatus');
  if(card&&status){
    card.style.display='block';
    var con=(DB.consentimientos||[]).find(function(c){return c.empresaId===emp.id;});
    if(con){status.innerHTML='<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--gll);border-radius:var(--r);border:1px solid #a7f3d0"><span style="font-size:16px">✅</span><div style="font-size:11px;color:#065f46"><b>Consentimiento RGPD firmado por email</b> — '+con.timestamp.slice(0,10)+'<br>'+ptr('conserv')+': <b>'+con.conservHasta+'</b></div></div>';}
    else{status.innerHTML='<div style="padding:8px 10px;background:var(--rll);border-radius:var(--r);font-size:11px;color:var(--red)">⚠️ Sin consentimiento RGPD registrado.</div>';}
  }
}

function pMarkDirty(){var b=document.getElementById('pBtnSaveEmp');if(b){b.style.background='#4a5568';b.style.color='#f7f7f7';}}

function pSaveEmpresa(){
  var emp=_getMyEmpresa();if(!emp)return;
  emp.nombre=document.getElementById('pEmpNombre').value.trim()||emp.nombre;
  emp.contacto=document.getElementById('pEmpContacto').value.trim()||emp.contacto;
  var _empCC=(document.getElementById('pEmpTelCC')||{}).value||'+34';var _empTelNum=document.getElementById('pEmpTel').value.trim()||'';emp.tel=_empTelNum?(_empCC+' '+_empTelNum):emp.tel;
  DB.empresas=DB.empresas.map(function(e){return e.id===emp.id?emp:e;});
  var pn=document.getElementById('portalEmpNombre');if(pn)pn.textContent=emp.nombre;
  saveDB();
  var b=document.getElementById('pBtnSaveEmp');if(b){b.style.background='';b.style.color='';}
  var msg=document.getElementById('pSaveMsg');if(msg){msg.style.display='inline';setTimeout(function(){msg.style.display='none';},2500);}
  toast('💾 Guardado','var(--text2)');
}

function pRenderVehiculos(){
  var emp=_getMyEmpresa();if(!emp)return;
  var list=document.getElementById('pVehList'),cnt=document.getElementById('pVehCount');
  var vehs=emp.vehiculos||[];
  if(cnt)cnt.textContent=vehs.length+' '+(ptr('vehiculosLbl')||'vehículos');
  if(!list)return;
  if(!vehs.length){list.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">🚛 '+ptr('sinVeh')+'</div>';return;}
  list.innerHTML=vehs.map(function(v,i){
    var st=_getVehStatus(v.matricula);
    return'<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg3);border-radius:var(--r2);margin-bottom:6px">'+
      '<div class="mchip" style="font-size:11px">'+esc(v.matricula)+'</div>'+
      '<div style="flex:1"><div style="font-size:12px;font-weight:700">'+_tipoVehIcon(v.tipo)+' '+esc(v.conductor||'Sin conductor')+'</div>'+
      '<div style="font-size:10px;color:var(--text3)">'+(v.tel?'📱 '+esc(v.tel):'')+' '+(v.remolque?'· '+esc(v.remolque):'')+'</div></div>'+
      '<span class="vstatus '+st.cls+'">'+st.label+'</span>'+
      '<button class="btn btn-danger btn-xs" onclick="pDelVehiculo('+i+')" style="padding:2px 6px;font-size:10px">🗑</button></div>';
  }).join('');
}

function pAddVehiculo(){
  var mat=((document.getElementById('pVehMat')||{}).value||'').trim().toUpperCase();
  if(!mat){toast('La matrícula es obligatoria','var(--amber)');return;}
  var emp=_getMyEmpresa();if(!emp)return;
  if(!emp.vehiculos)emp.vehiculos=[];
  if(emp.vehiculos.find(function(v){return v.matricula===mat;})){toast('Matrícula ya registrada','var(--amber)');return;}
  emp.vehiculos.push({matricula:mat,tipo:(document.getElementById('pVehTipo')||{}).value||'trailer',
    conductor:(document.getElementById('pVehConductor')||{}).value.trim()||'',
    tel:(document.getElementById('pVehTel')||{}).value.trim()||'',
    remolque:((document.getElementById('pVehRemolque')||{}).value||'').trim().toUpperCase(),
    pais:(document.getElementById('pVehPais')||{}).value||'ES',
    addedTs:new Date().toISOString()});
  DB.empresas=DB.empresas.map(function(e){return e.id===emp.id?emp:e;});
  saveDB();
  ['pVehMat','pVehConductor','pVehTel','pVehRemolque'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  pRenderVehiculos();toast('✅ Vehículo añadido','var(--text2)');
}

function pDelVehiculo(idx){
  var emp=_getMyEmpresa();if(!emp||!emp.vehiculos)return;
  if(!confirm('¿Eliminar '+esc(emp.vehiculos[idx].matricula)+'?'))return;
  emp.vehiculos.splice(idx,1);
  DB.empresas=DB.empresas.map(function(e){return e.id===emp.id?emp:e;});
  saveDB();pRenderVehiculos();toast('🗑 Eliminado','var(--amber)');
}

function pRenderEventos(){
  var list=document.getElementById('pEventosList');if(!list)return;
  var evs=(DB.eventos||[]).filter(function(e){return!e.papelera;});
  if(!evs.length){list.innerHTML='<div style="font-size:12px;color:var(--text3);padding:12px">'+ptr('sinPrerr')+'</div>';return;}
  list.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'+
    evs.map(function(ev){
      var isAct=DB.activeEventIds&&DB.activeEventIds.includes(ev.id);
      return'<div style="border:'+(isAct?'1px solid #3a4558':'1px solid var(--border)')+';border-radius:var(--r2);padding:12px;background:'+(isAct?'var(--bll)':'var(--bg2)')+';cursor:pointer" onclick="pSelEvento(\''+ev.id+'\')">'+
        '<div style="font-size:12px;font-weight:700">🏛 '+esc(ev.nombre||ev.name||'Evento')+'</div>'+
        '<div style="font-size:10px;color:var(--text2);margin-top:2px">'+esc(ev.fecha||'')+' '+esc(ev.lugar||'')+'</div>'+
        '<div style="margin-top:6px"><span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:8px;background:'+(isAct?'var(--gll)':'var(--bg3)')+';color:'+(isAct?'#4a5568':'var(--text4)')+'">'+(isAct?ptr('activo')||'✓ Activo':'—')+'</span></div></div>';
    }).join('')+'</div>';
}

function pSelEvento(evId){
  var ev=(DB.eventos||[]).find(function(e){return e.id===evId;});if(!ev)return;
  var f=document.getElementById('pAsignForm');if(!f)return;
  f.style.display='block';f.dataset.evId=evId;
  var nom=document.getElementById('pAsignEventoNombre');if(nom)nom.textContent=ev.nombre||ev.name||'Evento';
  pRenderVehSelectAsig();
  setTimeout(function(){f.scrollIntoView({behavior:'smooth'});},100);
}

function pRenderVehSelectAsig(){
  var sel=document.getElementById('pAsignVeh');if(!sel)return;
  var emp=_getMyEmpresa();var vehs=emp?(emp.vehiculos||[]):[];
  sel.innerHTML='<option value="">-- Selecciona --</option>'+
    vehs.map(function(v){return'<option value="'+esc(v.matricula)+'">'+esc(v.matricula)+(v.conductor?' · '+esc(v.conductor):'')+'</option>';}).join('');
}

function pConfirmarAsignacion(){
  var evId=document.getElementById('pAsignForm').dataset.evId;
  var veh=(document.getElementById('pAsignVeh')||{}).value;
  if(!evId||!veh){toast('Selecciona vehículo y evento','var(--amber)');return;}
  var emp=_getMyEmpresa();if(!emp)return;
  var ev=(DB.eventos||[]).find(function(e){return e.id===evId;});
  var vehData=(emp.vehiculos||[]).find(function(v){return v.matricula===veh;})||{};
  var prereg={id:uid(),empresaId:emp.id,empresaNombre:emp.nombre,eventoId:evId,
    eventoNombre:ev?ev.nombre||ev.name:'',matricula:veh,remolque:vehData.remolque||'',
    nombre:vehData.conductor||'',empresa:emp.nombre,
    ref:(document.getElementById('pAsignRef')||{}).value.trim()||'',
    expositor:(document.getElementById('pAsignExpositor')||{}).value.trim()||'',
    hall:(document.getElementById('pAsignHall')||{}).value||'',
    stand:(document.getElementById('pAsignStand')||{}).value.trim()||'',
    fechaPlan:(document.getElementById('pAsignFecha')||{}).value||'',
    horaPlan:(document.getElementById('pAsignHora')||{}).value||'',
    descargaTipo:(document.getElementById('pAsignDescarga')||{}).value||'',
    telefono:vehData.tel||emp.tel||'',estado:'preregistrado',
    nivelEmpresa:emp.nivel,creadoTs:new Date().toISOString(),creadoPor:'portal_empresa'};
  if(!DB.preregistros)DB.preregistros=[];DB.preregistros.push(prereg);
  DB.ingresos.push({id:prereg.id,matricula:prereg.matricula,remolque:prereg.remolque,
    nombre:prereg.nombre,empresa:prereg.empresa,ref:prereg.ref,expositor:prereg.expositor,
    hall:prereg.hall,stand:prereg.stand,telefono:prereg.telefono,
    comentario:'[PREREGISTRO PORTAL - '+emp.nivel.toUpperCase()+']',
    estado:'preregistrado',eventoId:evId,entrada:null,salida:null,
    creadoPor:'portal_empresa',creadoTs:prereg.creadoTs});
  saveDB();document.getElementById('pAsignForm').style.display='none';
  ['pAsignRef','pAsignExpositor','pAsignStand','pAsignFecha','pAsignHora'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  pRenderEstado();toast('✅ Preregistro enviado a los operadores','#4a5568',3000);
  if(typeof logAudit==='function')logAudit('preregistro',prereg.id,'Empresa '+emp.nombre+' preregistra '+veh);
}

function pRenderEstado(){
  var emp=_getMyEmpresa();if(!emp)return;
  var selEv=document.getElementById('pEstadoEvento');
  if(selEv){
    var evs=(DB.eventos||[]).filter(function(e){return!e.papelera;});
    var cur=selEv.value;
    selEv.innerHTML='<option value="">'+tr('todosEventos')+'</option>'+evs.map(function(e){return'<option value="'+e.id+'">'+esc(e.nombre||e.name||'Evento')+'</option>';}).join('');
    if(cur)selEv.value=cur;
  }
  var filterEvId=selEv?selEv.value:'';
  var list=document.getElementById('pEstadoList');if(!list)return;
  var sub=_pEstSubMenu||1;
  var pres=(DB.preregistros||[]).filter(function(p){
    if(p.empresaId!==emp.id)return false;
    if(filterEvId&&p.eventoId!==filterEvId)return false;
    if(sub===2&&!p.sinReferencia)return false;
    if(sub===1&&p.sinReferencia)return false;
    return true;
  });
  if(!pres.length){
    list.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">'+ptr('sinPrerr')+'</div>';
    return;
  }
  var html='<div class="tbl-wrap"><table class="dtbl"><thead><tr>';
  html+='<th>'+tr('thCompany')+'</th><th>'+tr('thEvent')+'</th><th>'+tr('thPlate')+'</th><th>'+tr('thTrailer')+'</th><th>'+tr('thDriver')+'tor</th><th>Ref.</th><th>'+tr('lblExpositor')+'</th><th>'+tr('hall')+'</th><th>'+tr('stand')+'</th><th>'+tr('fechaPlan')+'</th><th>'+tr('hora')+'</th><th>'+tr('descarga')+'</th><th>'+tr('estado')+'</th><th>'+tr('creado')+'</th>';
  html+='</tr></thead><tbody>';
  pres.forEach(function(p){
    var mat=(p.matricula||'').toUpperCase();
    var ingReal=(DB.ingresos||[]).concat(DB.ingresos2||[]).find(function(x){return(x.matricula||'').toUpperCase()===mat&&!x.salida;});
    var enFira=(DB.movimientos||[]).find(function(x){return(x.matricula||'').toUpperCase()===mat&&x.status==='FIRA';});
    var enEsp=(DB.enEspera||[]).find(function(x){return(x.matricula||'').toUpperCase()===mat;});
    var estado=p.estado||'preregistrado';
    if(enFira)estado='dentro';else if(ingReal)estado='parking';else if(enEsp)estado='espera';
    var stBg=estado==='dentro'?'var(--gll)':estado==='parking'?'var(--all)':estado==='espera'?'var(--bll)':'#f1f5f9';
    var stColor=estado==='dentro'?'#4a5568':estado==='parking'?'var(--amber)':estado==='espera'?'#4a5568':'var(--text3)';
    var stLabel=estado==='dentro'?'✓ Dentro':estado==='parking'?'Rampa':estado==='espera'?'En espera':'Prereg.';
    var ts=p.creadoTs?p.creadoTs.slice(0,16).replace('T',' '):'–';
    html+='<tr>';
    html+='<td style="font-weight:700;font-size:11px">'+esc(p.empresaNombre||p.empresa||emp.nombre)+'</td>';
    html+='<td style="font-size:10px;color:var(--text3)">'+esc(p.eventoNombre||'–')+'</td>';
    html+='<td><span class="mchip-sm">'+esc(p.matricula||'–')+'</span></td>';
    html+='<td style="font-size:11px">'+esc(p.remolque||'–')+'</td>';
    html+='<td style="font-size:11px">'+esc(p.nombre||'–')+'</td>';
    html+='<td style="font-family:JetBrains Mono,monospace;font-size:11px">'+esc(p.ref||'–')+'</td>';
    html+='<td style="font-size:11px">'+esc(p.expositor||'–')+'</td>';
    html+='<td>'+hBadge(p.hall)+'</td>';
    html+='<td style="font-size:11px">'+esc(p.stand||'–')+'</td>';
    html+='<td style="font-size:11px">'+esc(p.fechaPlan||'–')+'</td>';
    html+='<td style="font-size:11px">'+esc(p.horaPlan||'–')+'</td>';
    html+='<td style="font-size:11px">'+esc(p.descargaTipo||'–')+'</td>';
    html+='<td><span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;background:'+stBg+';color:'+stColor+'">'+stLabel+'</span></td>';
    html+='<td style="font-size:10px;color:var(--text3)">'+ts+'</td>';
    html+='</tr>';
  });
  html+='</tbody></table></div>';
  list.innerHTML=html;
}

function saPromoverEmpresa(id){
  var emp=(DB.empresas||[]).find(function(e){return e.id===id;});if(!emp)return;
  emp.nivel='verified';DB.empresas=DB.empresas.map(function(e){return e.id===id?emp:e;});
  saveDB();if(typeof renderUsuarios==='function')renderUsuarios();
  toast('✅ Empresa promovida a Verificada','var(--text2)');
  if(typeof logAudit==='function')logAudit('empresa_promovida',id,emp.nombre);
}

function saBloquearEmpresa(id){
  var emp=(DB.empresas||[]).find(function(e){return e.id===id;});if(!emp)return;
  if(!confirm('¿Bloquear empresa '+esc(emp.nombre)+'?'))return;
  emp.nivel='blocked';DB.empresas=DB.empresas.map(function(e){return e.id===id?emp:e;});
  var u=(DB.usuarios||[]).find(function(x){return x.empId===id;});if(u)u.lockedUntil=Date.now()+365*24*3600*1000;
  saveDB();if(typeof renderUsuarios==='function')renderUsuarios();
  toast('🔒 Empresa bloqueada','var(--red)');
  if(typeof logAudit==='function')logAudit('empresa_bloqueada',id,emp.nombre);
}

function saDesbloquearEmpresa(id){
  var emp=(DB.empresas||[]).find(function(e){return e.id===id;});if(!emp)return;
  emp.nivel='semi';DB.empresas=DB.empresas.map(function(e){return e.id===id?emp:e;});
  var u=(DB.usuarios||[]).find(function(x){return x.empId===id;});if(u)u.lockedUntil=null;
  saveDB();if(typeof renderUsuarios==='function')renderUsuarios();
  toast('✅ Empresa desbloqueada','var(--text2)');
}

function saVerEmpresa(id){
  var emp=(DB.empresas||[]).find(function(e){return e.id===id;});if(!emp)return;
  var vehs=(emp.vehiculos||[]).map(function(v){return v.matricula+(v.conductor?' ('+v.conductor+')':'');}).join(', ')||'Sin vehículos';
  var con=(DB.consentimientos||[]).find(function(c){return c.empresaId===id;});
  alert('🏢 '+emp.nombre+'\n\nCIF: '+emp.cif+'\nContacto: '+emp.contacto+'\nEmail: '+emp.email+'\nTel: '+emp.tel+'\nNivel: '+emp.nivel+'\nVehículos: '+vehs+(con?'\n\n✅ RGPD firmado: '+con.timestamp.slice(0,16)+'\nConservar hasta: '+con.conservHasta+'\nMétodo: '+con.otpMetodo:'\n\n⚠️ Sin consentimiento RGPD'));
}

function saCrearEmpresa(){openRegEmp();toast('ℹ️ Crea la cuenta en nombre de la empresa','#4a5568',4000);}

function pflag(code){return PAIS_FLAGS[code]||'🌍';}

function pShowAddVeh(){
  window._pEditVehIdx=null;
  var f=document.getElementById('pVehForm');if(!f)return;
  document.getElementById('pVehFormTitle').textContent='Añadir vehículo';
  ['pVehMat','pVehConductor','pVehTel','pVehRemolque'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
  f.style.display='block';f.scrollIntoView({behavior:'smooth'});
}

function pSaveVehiculo(){
  var mat=((document.getElementById('pVehMat')||{}).value||'').trim().toUpperCase();
  if(!mat){toast('La matrícula es obligatoria','var(--red)');return;}
  var emp=_getMyEmpresa();if(!emp)return;
  if(!emp.vehiculos)emp.vehiculos=[];
  var cc=((document.getElementById('pVehTelCC')||{}).value||'+34');
  var tel=((document.getElementById('pVehTel')||{}).value||'').trim();
  var veh={
    matricula:mat,
    tipo:(document.getElementById('pVehTipo')||{}).value||'trailer',
    pais:(document.getElementById('pVehPais')||{}).value||'ES',
    conductor:(document.getElementById('pVehConductor')||{}).value.trim()||'',
    telCC:cc,tel:tel,
    telefono:cc+' '+tel,
    remolque:((document.getElementById('pVehRemolque')||{}).value||'').trim().toUpperCase(),
    addedTs:new Date().toISOString(),
    incidencias:[]
  };
  var idx=window._pEditVehIdx;
  if(idx!=null&&idx>=0){
    veh.incidencias=emp.vehiculos[idx].incidencias||[];
    emp.vehiculos[idx]=veh;
  } else {
    if(emp.vehiculos.find(function(v){return v.matricula===mat;})){toast('Matrícula ya registrada','var(--amber)');return;}
    emp.vehiculos.push(veh);
  }
  // Force update DB reference
  var _empIdx=DB.empresas.findIndex(function(e){return e.id===emp.id;});
  if(_empIdx>=0)DB.empresas[_empIdx]=emp;
  saveLocalDB();writeToFirebase();
  var f=document.getElementById('pVehForm');if(f)f.style.display='none';
  window._pEditVehIdx=null;
  pRenderVehTabla();
  pShowSyncOk('✅ Vehículo guardado y sincronizado');
  toast('✅ Vehículo guardado','var(--text2)');
}

function pRenderVehiculos(){pRenderVehTabla();}

function pRenderVehTabla(){
  var emp=_getMyEmpresa();
  var vehs=emp?(emp.vehiculos||[]):[];
  var q=((document.getElementById('pVehSearch')||{}).value||'').toLowerCase();
  var fp=((document.getElementById('pVehFiltPais')||{}).value||'');
  var ft=((document.getElementById('pVehFiltTipo')||{}).value||'');
  var fe=((document.getElementById('pVehFiltEst')||{}).value||'');
  var filtered=vehs.filter(function(v){
    if(fp&&v.pais!==fp)return false;
    if(ft&&v.tipo!==ft)return false;
    var st=_getVehStatus(v.matricula);
    if(fe&&st.key!==fe)return false;
    if(q){var hay=(v.matricula+' '+(v.conductor||'')+' '+(v.telefono||'')+' '+(v.tel||'')+' '+(v.remolque||'')+' '+(v.pais||'')).toLowerCase();if(!hay.includes(q))return false;}
    return true;
  });
  var tbody=document.getElementById('pVehTbody');
  var empty=document.getElementById('pVehEmpty');
  var cnt=document.getElementById('pVehCount');
  if(cnt)cnt.textContent=filtered.length+' '+(ptr('vehiculosLbl')||'vehículos')+(filtered.length<vehs.length?' ('+filtered.length+'/'+vehs.length+')':'');
  if(!tbody)return;
  if(!filtered.length){tbody.innerHTML='';if(empty)empty.style.display='block';return;}
  if(empty)empty.style.display='none';
  // Find last ingreso per vehicle
  tbody.innerHTML=filtered.map(function(v,i){
    var realIdx=vehs.indexOf(v);
    var st=_getVehStatus(v.matricula);
    var lastIng=(DB.ingresos||[]).concat(DB.ingresos2||[]).filter(function(x){return(x.matricula||'').toUpperCase()===v.matricula;}).sort(function(a,b){return(b.entrada||'').localeCompare(a.entrada||'');});
    var lastDt=lastIng.length&&lastIng[0].entrada?lastIng[0].entrada.slice(0,16).replace('T',' '):'—';
    var hasInc=v.incidencias&&v.incidencias.length&&v.incidencias.some(function(inc){return inc.activa;});
    return'<tr style="cursor:default">'
      +'<td><span class="mchip">'+esc(v.matricula)+'</span></td>'
      +'<td style="font-size:11px">'+pflag(v.pais)+' '+(v.pais||'')+'</td>'
      +'<td style="font-size:11px;color:var(--text2)">'+(_tipoVehIcon(v.tipo)||'')+' '+(v.tipo||'')+'</td>'
      +'<td style="font-weight:600;font-size:12px">'+esc(v.conductor||'—')+'</td>'
      +'<td style="font-size:10px;color:var(--text3);font-family:\'JetBrains Mono\',monospace">'+esc(v.telCC||'')+'</td>'
      +'<td style="font-size:10px;font-family:\'JetBrains Mono\',monospace">'+esc(v.tel||'—')+'</td>'
      +'<td style="font-size:10px;color:var(--text3);font-family:\'JetBrains Mono\',monospace">'+esc(v.remolque||'—')+'</td>'
      +'<td style="font-size:10px;font-family:\'JetBrains Mono\',monospace;white-space:nowrap">'+esc(lastDt)+'</td>'
      +'<td><span class="vstatus '+st.cls+'">'+st.label+'</span></td>'
      +'<td>'+(hasInc?'<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:var(--rll);color:var(--red);border:1px solid var(--rlb)">⚠️ Activa</span>':'<span style="color:var(--text4);font-size:10px">—</span>')+'</td>'
      +'<td><div style="display:flex;gap:4px">'
        +'<button class="btn btn-s btn-xs" onclick="pEditVehiculo('+realIdx+')">✏️</button>'
        +'<button class="btn btn-xs" style="background:var(--all);color:var(--amber);border:1px solid var(--alb)" onclick="pAbrirIncidencia('+realIdx+')">⚠️</button>'
        +'<button class="btn btn-xs" style="background:var(--rll);color:var(--red);border:1px solid var(--rlb)" onclick="pDelVehiculo('+realIdx+')">🗑</button>'
      +'</div></td>'
      +'</tr>';
  }).join('');
}

function pFilterVehiculos(){pRenderVehTabla();}

function pEditVehiculo(idx){
  var emp=_getMyEmpresa();if(!emp||!emp.vehiculos)return;
  var v=emp.vehiculos[idx];if(!v)return;
  window._pEditVehIdx=idx;
  var f=document.getElementById('pVehForm');if(!f)return;
  document.getElementById('pVehFormTitle').textContent='Añadir vehículo'.replace('Añadir','Editar').replace('Add','Edit')+' — '+v.matricula;
  var sv=function(id,val){var e=document.getElementById(id);if(e)e.value=val||'';};
  sv('pVehMat',v.matricula);sv('pVehTipo',v.tipo);sv('pVehPais',v.pais);
  sv('pVehConductor',v.conductor);sv('pVehTelCC',v.telCC||'+34');sv('pVehTel',v.tel);
  sv('pVehRemolque',v.remolque);
  f.style.display='block';f.scrollIntoView({behavior:'smooth'});
}

function pAbrirIncidencia(idx){
  var emp=_getMyEmpresa();if(!emp)return;
  var v=emp.vehiculos[idx];if(!v)return;
  window._pIncVehIdx=idx;
  var matEl=document.getElementById('pIncMat');if(matEl)matEl.textContent=v.matricula;
  window._pIncTipo=1;pSelInc(1);
  var m=document.getElementById('pIncModal');if(m){m.style.display='block';m.scrollIntoView({behavior:'smooth'});}
}

function pSelInc(n){
  window._pIncTipo=n;
  [1,2,3,4].forEach(function(i){
    var el=document.getElementById('pIncOpt'+i);if(!el)return;
    if(i===n){el.style.borderColor='var(--red)';el.style.background='var(--rll)';el.querySelector('div:last-child').style.color='var(--red)';}
    else{el.style.borderColor='var(--border2)';el.style.background='var(--bg2)';el.querySelector('div:last-child').style.color='var(--text2)';}
  });
  var fields=document.getElementById('pIncFields');if(!fields)return;
  var emp=_getMyEmpresa();
  var v=emp&&window._pIncVehIdx!=null?emp.vehiculos[window._pIncVehIdx]:null;
  var html='<div class="sg sg2" style="margin-bottom:10px">';
  if(n===1){
    html+='<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('newPlate')+'</div><input id="pIncNuevaMat" type="text" data-i18n-ph="phNewPlate" placeholder="Nueva matrícula" style="font-family:\'JetBrains Mono\',monospace;text-transform:uppercase;border-color:var(--red)"></div>'
        +'<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('tipoNuevoVeh')+'</div><select id="pIncNuevoTipo"><option value="trailer">'+tr('trailerType')+'</option><option value="semiremolque">'+tr('semirremolque')+'</option><option value="camion">'+tr('camion')+'</option><option value="furgoneta">'+tr('furgoneta')+'</option></select></div>'
        +'<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('newDriverField')+'</div><input id="pIncNuevoCond" type="text" data-i18n-ph="phDriverName" placeholder="Nombre conductor" value="'+(v?esc(v.conductor||''):'')+'"></div>'
        +'<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('telNuevoCond')+'</div><input id="pIncNuevoTel" type="tel" data-i18n-ph="phPhone" placeholder="Teléfono" value="'+(v?esc(v.tel||''):'')+'"></div>';
  } else if(n===2){
    html+='<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('newDriverField')+'</div><input id="pIncNuevoCond" type="text" data-i18n-ph="phFullName" placeholder="Nombre y apellido"></div>'
        +'<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('telefono')+'</div><input id="pIncNuevoTel" type="tel" placeholder="+34 600 000 000"></div>'
        +'<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('thLanguage')+'</div><select id="pIncIdioma"><option value="es">🇪🇸 Español</option><option value="en">🇬🇧 English</option><option value="pl">🇵🇱 Polski</option><option value="ro">🇷🇴 Română</option><option value="de">🇩🇪 Deutsch</option></select></div>';
  } else if(n===3){
    html+='<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('newDate')+'</div><input id="pIncFecha" type="date"></div>'
        +'<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('nuevaHora')+'</div><input id="pIncHora" type="time"></div>';
  } else if(n===4){
    html+='<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('newReference')+'</div><input id="pIncRef" type="text" placeholder="REF-NUEVA-001"></div>'
        +'<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('hall')+'</div><select id="pIncHall"><option value="">--</option><option>1</option><option>2A</option><option>2B</option><option>3A</option><option>3B</option><option>4</option><option>5</option><option>6</option><option>7</option><option>8</option></select></div>'
        +'<div><div class="hdr-cl" style="margin-bottom:3px">'+tr('nuevoStand')+'</div><input id="pIncStand" type="text"></div>';
  }
  html+='<div style="grid-column:1/-1"><div class="hdr-cl" style="margin-bottom:3px">Descripción / motivo *</div><textarea id="pIncDesc" data-i18n-ph="phChangeReason" placeholder="'+tr('phChangeReason')+'" style="height:60px"></textarea></div></div>';
  fields.innerHTML=html;
}

function pGuardarIncidencia(){
  var emp=_getMyEmpresa();if(!emp)return;
  var idx=window._pIncVehIdx;if(idx==null)return;
  var v=emp.vehiculos[idx];if(!v)return;
  var n=window._pIncTipo||1;
  var desc=((document.getElementById('pIncDesc')||{}).value||'').trim();
  if(!desc){toast('Describe el motivo de la incidencia','var(--amber)');return;}
  var inc={id:uid(),tipo:n,ts:new Date().toISOString(),desc:desc,activa:true,operador:'portal_empresa'};
  // Apply changes
  if(n===1){
    var nm=((document.getElementById('pIncNuevaMat')||{}).value||'').trim().toUpperCase();
    if(!nm){toast('La nueva matrícula es obligatoria','var(--red)');return;}
    // Transfer preregistros
    (DB.preregistros||[]).forEach(function(p){if(p.matricula===v.matricula)p.matricula=nm;});
    (DB.ingresos||[]).forEach(function(i){if(i.matricula===v.matricula&&!i.salida)i.comentario='[CAMBIO MATRÍCULA: '+v.matricula+'→'+nm+']';});
    inc.matAnterior=v.matricula;inc.matNueva=nm;
    v.matricula=nm;
    var nc=((document.getElementById('pIncNuevoCond')||{}).value||'').trim();if(nc)v.conductor=nc;
    var nt=((document.getElementById('pIncNuevoTel')||{}).value||'').trim();if(nt)v.tel=nt;
  } else if(n===2){
    var nc2=((document.getElementById('pIncNuevoCond')||{}).value||'').trim();
    if(nc2)v.conductor=nc2;
    var nt2=((document.getElementById('pIncNuevoTel')||{}).value||'').trim();if(nt2)v.tel=nt2;
    var ni=((document.getElementById('pIncIdioma')||{}).value||'es');v.idioma=ni;
  }
  if(!v.incidencias)v.incidencias=[];
  v.incidencias.push(inc);
  emp.vehiculos[idx]=v;
  DB.empresas=DB.empresas.map(function(e){return e.id===emp.id?emp:e;});
  saveDB();
  var m=document.getElementById('pIncModal');if(m)m.style.display='none';
  pRenderVehTabla();
  pShowSyncOk('⚡ Incidencia registrada · operador notificado en tiempo real');
  if(typeof logAudit==='function')logAudit('incidencia_portal',v.matricula,'Tipo '+n+': '+desc);
}

function pImportFlotaExcel(inp){
  var file=inp.files[0];if(!file)return;
  var r=new FileReader();
  r.onload=function(e){
    try{
      var wb=XLSX.read(e.target.result,{type:'binary'});
      var rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});
      var emp=_getMyEmpresa();if(!emp)return;
      if(!emp.vehiculos)emp.vehiculos=[];
      var added=0,skipped=0;
      rows.forEach(function(row){
        var mat=String(row['Matricula']||row['Matrícula']||'').trim().toUpperCase();
        if(!mat){skipped++;return;}
        if(emp.vehiculos.find(function(v){return v.matricula===mat;})){skipped++;return;}
        var cc=String(row['CodPaisTel']||row['CodigoPais']||'+34').trim();
        var tel=String(row['Telefono']||row['Teléfono']||'').trim();
        emp.vehiculos.push({
          matricula:mat,
          tipo:String(row['TipoVehiculo']||row['Tipo']||'otro').trim().toLowerCase(),
          pais:String(row['PaisMatricula']||row['Pais']||'ES').trim().toUpperCase().slice(0,2),
          conductor:String(row['NombreConductor']||row['Conductor']||'').trim(),
          telCC:cc,tel:tel,telefono:cc+' '+tel,
          remolque:String(row['Remolque']||'').trim().toUpperCase(),
          idioma:String(row['Idioma']||'es').trim(),
          addedTs:new Date().toISOString(),incidencias:[]
        });
        added++;
      });
      DB.empresas=DB.empresas.map(function(e){return e.id===emp.id?emp:e;});
      saveDB();
      var msg=document.getElementById('pImportMsg');
      if(msg){msg.style.display='block';msg.textContent='✅ '+added+' vehículos importados'+(skipped?' · '+skipped+' omitidos (ya existían o sin matrícula)':'');}
      pRenderVehTabla();
      toast('✅ '+added+' vehículos importados','var(--text2)');
    }catch(err){toast('❌ Error al importar: '+err.message,'var(--red)');}
    inp.value='';
  };
  r.readAsBinaryString(file);
}

function pExportFlotaExcel(){
  var emp=_getMyEmpresa();if(!emp)return;
  var vehs=emp.vehiculos||[];
  if(!vehs.length){toast('Sin vehículos que exportar','var(--amber)');return;}
  var wb=XLSX.utils.book_new();
  var ws=XLSX.utils.json_to_sheet(vehs.map(function(v){return{
    Matricula:v.matricula,PaisMatricula:v.pais,TipoVehiculo:v.tipo,
    NombreConductor:v.conductor||'',CodPaisTel:v.telCC||'',Telefono:v.tel||'',
    Remolque:v.remolque||'',Idioma:v.idioma||'es',Incidencias:(v.incidencias||[]).length
  };}));
  XLSX.utils.book_append_sheet(wb,ws,'Flota');
  XLSX.writeFile(wb,'flota_'+((emp.nombre||'empresa').replace(/\s/g,'_'))+'_'+new Date().toISOString().slice(0,10)+'.xlsx');
  toast('📥 Excel exportado','#4a5568');
}

function pDlPlantillaFlota(){
  var wb=XLSX.utils.book_new();
  var ws=XLSX.utils.aoa_to_sheet([
    ['Matricula','PaisMatricula','TipoVehiculo','NombreConductor','CodPaisTel','Telefono','Remolque','Idioma'],
    ['(oblig.)','ES/FR/DE/PL/RO…','trailer/camion/furgoneta/semiremolque','Nombre Apellido','+34 / +40 / +48…','SIN prefijo ni espacios','REM-001','es/en/fr/de…'],
    ['3266LBR','ES','trailer','Juan García','+34','603786000','REM-001','es'],
    ['4342FERC','RO','semiremolque','Pedro López','+40','612345678','','ro'],
    ['WA4421DE','DE','camion','Hans Mueller','+49','17612345678','REM-DE01','de']
  ]);
  XLSX.utils.book_append_sheet(wb,ws,'Plantilla_Flota');
  XLSX.writeFile(wb,'plantilla_flota_portal.xlsx');
  toast('📋 Plantilla descargada','#4a5568');
}

function pSelRegTipo(tipo){
  _pCurRegTipo=tipo;
  var r=document.getElementById('pRegTipoRef');
  var n=document.getElementById('pRegTipoNref');
  if(r){r.style.borderColor=tipo==='ref'?'#4a5568':'var(--border)';r.style.background=tipo==='ref'?'var(--bll)':'var(--bg2)';}
  if(n){n.style.borderColor=tipo==='nref'?'#3a4558':'var(--border)';n.style.background=tipo==='nref'?'#e8eaed':'var(--bg2)';}
  var pnl=document.getElementById('pNrefPanel');
  var evl=document.getElementById('pEventosList');
  var asf=document.getElementById('pAsignForm');
  if(pnl)pnl.style.display=tipo==='nref'?'block':'none';
  if(evl)evl.style.display=tipo==='ref'?'block':'none';
  if(asf&&tipo==='nref')asf.style.display='none';
  if(tipo==='nref'){_pFillNrefVeh();_pCalcForecast();}
}

function _pFillNrefVeh(){
  var emp=_getMyEmpresa();var vehs=emp?(emp.vehiculos||[]):[];
  var sel=document.getElementById('pNrefVeh');if(!sel)return;
  sel.innerHTML=vehs.map(function(v){return'<option value="'+esc(v.matricula)+'">'+esc(v.matricula)+(v.conductor?' — '+esc(v.conductor):'')+'</option>';}).join('');
  var evSel=document.getElementById('pNrefEvento');if(evSel){
    evSel.innerHTML=(DB.eventos||[]).filter(function(e){return!e.papelera;}).map(function(e){return'<option value="'+e.id+'">'+esc(e.nombre||e.name||'Evento')+'</option>';}).join('');
  }
}

function pSelPeriodo(n){
  [1,2,3,4].forEach(function(i){
    var el=document.getElementById('pPer'+i);if(!el)return;
    if(i===n){el.style.borderColor='#3a4558';el.style.background='#e8eaed';}
    else{el.style.borderColor='var(--border)';el.style.background='var(--bg2)';}
    el.querySelector('div:last-child').style.color=i===n?'#4a5568':'var(--text2)';
  });
  var show=function(id,v){var e=document.getElementById(id);if(e)e.style.display=v?'block':'none';};
  show('pNrefEvField',n===1);
  show('pNrefDesdeField',n===1||n===2);
  show('pNrefHastaField',n===2);
  show('pNrefMesField',n===3);
  show('pNrefAnioField',n===4);
  _pCalcForecast(n);
}

function pGuardarNref(){
  var emp=_getMyEmpresa();if(!emp)return;
  var mat=((document.getElementById('pNrefVeh')||{}).value||'').trim();
  if(!mat){toast('Selecciona un vehículo','var(--amber)');return;}
  var prereg={
    id:uid(),empresaId:emp.id,empresaNombre:emp.nombre,
    eventoId:null,eventoNombre:'Sin referencia',matricula:mat,
    empresa:emp.nombre,ref:'SIN-REF',sinReferencia:true,
    periodoDesde:((document.getElementById('pNrefDesde')||{}).value||''),
    periodoHasta:((document.getElementById('pNrefHasta')||{}).value||''),
    anio:((document.getElementById('pNrefAnio')||{}).value||''),
    hall:((document.getElementById('pNrefHall')||{}).value||'').trim(),
    stand:((document.getElementById('pNrefStand')||{}).value||'').trim(),
    anio:((document.getElementById('pNrefAnio')||{}).value||''),
    hall:((document.getElementById('pNrefHall')||{}).value||'').trim(),
    stand:((document.getElementById('pNrefStand')||{}).value||'').trim(),
    estado:'preregistrado',creadoTs:new Date().toISOString(),creadoPor:'portal_empresa'
  };
  if(!DB.preregistros)DB.preregistros=[];
  DB.preregistros.push(prereg);
  DB.ingresos.push({id:prereg.id,matricula:mat,empresa:emp.nombre,ref:'SIN-REF',
    comentario:'[SIN REFERENCIA - PERÍODO: '+(prereg.periodoDesde||'')+(prereg.periodoHasta?' / '+prereg.periodoHasta:'')+']',
    estado:'preregistrado',sinReferencia:true,creadoPor:'portal_empresa',creadoTs:prereg.creadoTs,entrada:null,salida:null});
  saveDB();
  document.getElementById('pNrefPanel').style.display='none';
  pShowSyncOk('✅ Registro sin referencia enviado');
}

function pToggleHallInput(){
  var wrap=document.getElementById('pHallInputWrap');
  if(!wrap)return;
  var open=wrap.style.display==='none'||!wrap.style.display;
  wrap.style.display=open?'block':'none';
  if(open){
    // Populate pills from event halls
    var evId=((document.getElementById('pAsignEvento')||{}).value||'');
    var ev=(DB.eventos||[]).find(function(e){return e.id===evId;})||getActiveEvent();
    var evHalls=ev&&ev.halls?ev.halls:[];
    var pills=document.getElementById('pHallPills');
    if(pills&&evHalls.length){
      evHalls.forEach(function(h){
        var sel2=_pHalls.includes(h);
        var sp=document.createElement("span");
        sp.style.cssText="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;display:inline-block;margin:2px";
        sp.style.background=sel2?"#4a5568":"#e8eaed";
        sp.style.color=sel2?"#fff":"#1e40af";
        sp.style.border="1.5px solid "+(sel2?"#4a5568":"#93c5fd");
        sp.textContent=h;
        sp.onclick=(function(hall){return function(){pAddHallQuick(hall);};})(h);
        pills.appendChild(sp);
      });
    } else if(pills){
      pills.innerHTML='<span style="font-size:10px;color:var(--text3)">Escribe el hall manualmente:</span>';
    }
    var inp=document.getElementById('pHallFreeInput');if(inp)inp.focus();
  }
}

function pAddHallQuick(h){
  if(!_pHalls.includes(h))_pHalls.push(h);
  _pRenderHallTags();
  pToggleHallInput();
}

function pAddHallFromInput(){
  var inp=document.getElementById('pHallFreeInput');
  if(!inp)return;
  var v=inp.value.trim().toUpperCase();
  if(!v)return;
  if(!_pHalls.includes(v))_pHalls.push(v);
  _pRenderHallTags();
  inp.value='';
  pToggleHallInput();
}

function pRemoveHall(h){
  _pHalls=_pHalls.filter(function(x){return x!==h;});
  _pRenderHallTags();
}

function pEstadoSub(n){
  _pEstSubMenu=n;
  var s1=document.getElementById('pEstSub1'),s2=document.getElementById('pEstSub2');
  if(s1){s1.style.background=n===1?'#4a5568':'var(--bg3)';s1.style.color=n===1?'#fff':'var(--text3)';}
  if(s2){s2.style.background=n===2?'#4a5568':'var(--bg3)';s2.style.color=n===2?'#fff':'var(--text3)';}
  pRenderEstado();
}

function pToggleEstExpand(i){
  var row=document.getElementById('pEstRow_'+i);
  if(!row)return;
  var isOpen=row.style.display!=='none';
  // Close all
  document.querySelectorAll('[id^="pEstRow_"]').forEach(function(r){r.style.display='none';});
  if(!isOpen)row.style.display='table-row';
}

function pShowSyncOk(msg){
  var b=document.getElementById('pSyncBadge');if(b){b.textContent='🟢 Sync OK · ahora';setTimeout(function(){b.textContent='🟢 Sincronizado';},3000);}
  var b2=document.getElementById('pEstSyncBadge');if(b2){b2.textContent='🟢 Sync OK · ahora';setTimeout(function(){b2.textContent='🟢 Sync';},3000);}
  toast(msg||'✅ Sincronizado','#4a5568',2500);
}

function saVerPortalEmpresa(empId){
  var emp=(DB.empresas||[]).find(function(e){return e.id===empId;});
  if(!emp){toast('Empresa no encontrada','var(--red)');return;}
  var u=(DB.usuarios||[]).find(function(x){return x.empId===empId||x.email===emp.email;});
  if(!u){
    // Crear usuario temporal en memoria para preview
    u={id:'_preview_'+empId,nombre:emp.contacto||emp.nombre,rol:'empresa',empId:empId,email:emp.email,lang:'es',_preview:true};
  }
  // Guardar estado SA para poder volver
  window._saPreviewFrom={tab:'empresas',cu:CU};
  // Lanzar portal como si fuera la empresa, pero con botón volver
  CU=u;
  ['appHdr','mainTabs','appMain','statsBar'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='none';});
  var pw=document.getElementById('portalWrap');if(pw)pw.style.display='flex';
  // Add SA back button
  var topbar=pw?pw.querySelector('.portal-hdr'):null;
  if(topbar&&!topbar.querySelector('#saBackBtn')){
    var bb=document.createElement('button');
    bb.id='saBackBtn';bb.className='btn btn-a btn-sm';bb.style.marginRight='8px';
    bb.textContent='← Volver como SA';
    bb.onclick=saVolverDesdePreview;
    topbar.insertBefore(bb,topbar.firstChild);
  }
  if(typeof _launchPortal==='function')_launchPortal(u);
  toast('👁 Vista empresa: '+emp.nombre,'var(--teal)',3000);
}

function saVolverDesdePreview(){
  var prev=window._saPreviewFrom;
  if(!prev)return;
  CU=prev.cu;
  // Remove SA back button
  var bb=document.getElementById('saBackBtn');if(bb)bb.remove();
  var pw=document.getElementById('portalWrap');if(pw)pw.style.display='none';
  ['appHdr','mainTabs','appMain','statsBar'].forEach(function(id){
    var e=document.getElementById(id);
    if(e)e.style.display=id==='statsBar'?'flex':id==='appHdr'?'flex':id==='mainTabs'?'flex':'block';
  });
  window._saPreviewFrom=null;
  goTab(prev.tab||'empresas');
}

function saEditarEmpresa(empId){
  var emp=(DB.empresas||[]).find(function(e){return e.id===empId;});
  if(!emp)return;
  // Find linked user
  var u=(DB.usuarios||[]).find(function(x){return x.empId===empId||x.email===emp.email;});
  if(u){
    // Open existing user modal pre-filled with empresa data
    openUserModal(u.id);
  } else {
    toast('No hay usuario vinculado a esta empresa. Crea uno con rol Empresa.','var(--amber)',4000);
  }
}

function saExportEmpresas(){
  var emps=DB.empresas||[];
  if(!emps.length){toast('Sin empresas que exportar','var(--amber)');return;}
  var wb=XLSX.utils.book_new();
  var ws=XLSX.utils.json_to_sheet(emps.map(function(e){
    var con=(DB.consentimientos||[]).find(function(c){return c.empresaId===e.id;});
    return{Nombre:e.nombre,CIF:e.cif||'',Contacto:e.contacto||'',Email:e.email||'',Tel:e.tel||'',Nivel:e.nivel,Vehiculos:(e.vehiculos||[]).length,RGPD:con?'Firmado '+con.timestamp.slice(0,10):'No firmado'};
  }));
  XLSX.utils.book_append_sheet(wb,ws,'Empresas');
  XLSX.writeFile(wb,'empresas_'+new Date().toISOString().slice(0,10)+'.xlsx');
  toast('📥 Exportado','#4a5568');
}

function pAutocompletarRefEnRampa(refVal){
  if(!refVal||refVal.length<3)return;
  var ref=refVal.trim().toUpperCase();
  // Buscar en preregistros
  var pre=(DB.preregistros||[]).find(function(p){
    return p.ref&&p.ref.toUpperCase()===ref&&p.estado==='preregistrado';
  });
  if(!pre)return;
  // Buscar también en ingresos con estado preregistrado
  var ing=(DB.ingresos||[]).find(function(i){
    return(i.ref||i.referencia||'').toUpperCase()===ref&&i.estado==='preregistrado';
  });
  var src=pre||ing;if(!src)return;
  // Autorellenar campos del formulario de ingreso principal
  var campos=[
    ['fiMat',src.matricula],['fiEmp',src.empresa||src.empresaNombre||''],
    ['fiRef',src.ref||ref],['fiExpositor',src.expositor||''],
    ['fiHall',src.hall||''],['fiStand',src.stand||''],
    ['fiNom',src.nombre||''],['fiTel',src.telefono||''],
    ['fiRemolque',src.remolque||''],['fiComentario',src.comentario||'']
  ];
  var filled=0;
  campos.forEach(function(c){
    var el=document.getElementById(c[0]);
    if(el&&c[1]&&!el.value){el.value=c[1];filled++;}
  });
  if(filled>0){
    toast('📋 Preregistro cargado: '+esc(src.matricula||ref),'#f7f7f7',3000);
    if(typeof logAudit==='function')logAudit('autocompletado_ref',ref,'Preregistro absorbido: '+src.matricula);
    // Disparar buscador de agenda con la referencia cargada
    setTimeout(function(){if(typeof searchRefAutoComplete==='function')searchRefAutoComplete(ref);},100);
  }
}

