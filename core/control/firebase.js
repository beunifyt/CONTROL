/* core/firebase — 19 funciones */

function connectFirebase(){const url=(document.getElementById('fbUrlInp').value||'').trim();if(!url){toast('URL requerida','var(--red)');return;}fbKey=(document.getElementById('fbKeyInp').value||'controlunificado').trim().replace(/[^a-zA-Z0-9_-]/g,'');const ak=(document.getElementById('apiKeyInp').value||'').trim();if(ak)localStorage.setItem('cu1_apiKey',ak);try{if(fbApp)fbApp.delete();fbApp=firebase.initializeApp({databaseURL:url},'cu1_'+Date.now());fbDb=firebase.database(fbApp);fbRef=fbDb.ref('cu1/'+fbKey);localStorage.setItem('cu1_fbUrl',url);localStorage.setItem('cu1_fbKey',fbKey);localStorage.removeItem('cu1_noSync');document.getElementById('setupWrap').style.display='none';startFirebaseSync();showLogin();}catch(e){toast('❌ '+e.message,'var(--red)');}}

function startFirebaseSync(){setSyncStatus('connecting');const FK=['movimientos','ingresos','listaNegra','enEspera','mensajesRampa','conductores','auditLog','eventos','agenda','recintos'];fbRef.on('value',snap=>{
      var _dirty=false;try{var _dt=parseInt(localStorage.getItem(SK+'_dirty')||'0');_dirty=_dt>0&&(Date.now()-_dt)<10000;}catch(e){}const rem=snap.val();if(!rem){setSyncStatus('ok');if(typeof _checkFirstRunAfterFirebase==='function')_checkFirstRunAfterFirebase();return;}if(rem._session===SID){setSyncStatus('ok');return;}let changed=false;FK.forEach(k=>{
        // ── No restaurar colecciones que acaban de ser borradas localmente ──
        if(_isDeleteProtected(k))return;
        if(rem[k]){const arr=Array.isArray(rem[k])?rem[k]:Object.values(rem[k]);if(JSON.stringify(arr)!==JSON.stringify(DB[k])){DB[k]=arr;changed=true;}}});if(rem.activeEventId!==undefined&&rem.activeEventId!==DB.activeEventId){DB.activeEventId=rem.activeEventId;if(rem.activeEventId&&(!DB.activeEventIds||!DB.activeEventIds.length))DB.activeEventIds=[rem.activeEventId];changed=true;}if(rem.printFieldOrder){DB.printFieldOrder=rem.printFieldOrder;}if(rem.hiddenPrintFields){DB.hiddenPrintFields=rem.hiddenPrintFields;}if(rem.activeEventIds)DB.activeEventIds=rem.activeEventIds;if(rem.defaultEventId!==undefined)DB.defaultEventId=rem.defaultEventId;if(rem.editHistory)DB.editHistory=rem.editHistory;if(rem.ingresos2)DB.ingresos2=rem.ingresos2;
        // No restaurar papelera si está protegida
        if(!_isDeleteProtected('papelera')&&rem.papelera)DB.papelera=rem.papelera;
        if(rem.vehiculos)DB.vehiculos=rem.vehiculos;if(rem.exportLog)DB.exportLog=rem.exportLog;if(rem.printPhrases&&!_dirty)DB.printPhrases=rem.printPhrases;if(rem.printPhrases2&&!_dirty)DB.printPhrases2=rem.printPhrases2;if(rem.tabSorts&&!_dirty)DB.tabSorts=rem.tabSorts;if(rem.tabOrder&&!_dirty)DB.tabOrder=rem.tabOrder;if(rem.colOrders&&!_dirty)DB.colOrders=rem.colOrders;if(rem.printCfg1&&!_dirty)DB.printCfg1=rem.printCfg1;if(rem.printCfg2&&!_dirty)DB.printCfg2=rem.printCfg2;if(rem.printCfgAg&&!_dirty)DB.printCfgAg=rem.printCfgAg;if(rem.printTemplates&&!_dirty)DB.printTemplates=rem.printTemplates;if(rem.printCfgModes&&!_dirty)DB.printCfgModes=rem.printCfgModes;if(rem.camposCfg&&!_dirty)DB.camposCfg=rem.camposCfg;if(rem.eventoHistorial)DB.eventoHistorial=rem.eventoHistorial;if(rem.eventosPapelera)DB.eventosPapelera=rem.eventosPapelera;if(rem._deviceAlerts)DB._deviceAlerts=rem._deviceAlerts;if(rem.devices)DB.devices=rem.devices;if(rem._devRequireApproval!==undefined)DB._devRequireApproval=rem._devRequireApproval;if(rem.usuarios&&!_dirty){const ru=Array.isArray(rem.usuarios)?rem.usuarios:Object.values(rem.usuarios);DEF_USERS.forEach(du=>{if(!ru.find(u=>u.id===du.id))ru.push(du);});if(JSON.stringify(ru)!==JSON.stringify(DB.usuarios)){DB.usuarios=ru;changed=true;}}if(rem.empresas)DB.empresas=Array.isArray(rem.empresas)?rem.empresas:Object.values(rem.empresas);if(rem.preregistros)DB.preregistros=Array.isArray(rem.preregistros)?rem.preregistros:Object.values(rem.preregistros);if(rem.consentimientos)DB.consentimientos=Array.isArray(rem.consentimientos)?rem.consentimientos:Object.values(rem.consentimientos);fbConnected=true;setSyncStatus('ok');
      // Auto-fix SA unlock (one-time, removes itself after running)
      if(!DB._saUnlockDone||DB._saUnlockDone===true||DB._saUnlockDone==='v2'||DB._saUnlockDone==='v3'){
        const _saU=DB.usuarios.find(u=>u.rol==='superadmin'&&(u.nombre==='Carlos'||u.pin==='001990'||u.id==='u_sa'));
        if(_saU){
          _saU.loginAttempts=0;
          _saU.lockedUntil=null;
          _saU.mustChangePassword=false;
          _saU.email='carlosreyesrivera12@gmail.com';
          _saU.twoFA=false;
          _saU.pin='001990';
          _saU.passwordHash=null;
          _saU.passwordSalt=null;
          DB._saUnlockDone='v4';
          saveDBNow();
        }
      }
      if(changed){saveLocalDB();if(CU){renderTab(curTab);renderHdr();}}},()=>setSyncStatus('error'));fbDb.ref('.info/connected').on('value',snap=>{fbConnected=snap.val();setSyncStatus(fbConnected?'ok':'error');const d=document.getElementById('loginSyncDot'),l=document.getElementById('loginSyncLbl');if(d)d.className='sd '+(fbConnected?'sd-g':'sd-r');});}

function writeToFirebase(){if(!fbRef)return;clearTimeout(writeDebounce);writeDebounce=setTimeout(()=>{fbRef.set({_session:SID,_ts:Date.now(),movimientos:DB.movimientos,ingresos:DB.ingresos,listaNegra:DB.listaNegra,enEspera:DB.enEspera,mensajesRampa:DB.mensajesRampa,conductores:DB.conductores,usuarios:DB.usuarios,auditLog:(DB.auditLog||[]).slice(0,200),eventos:DB.eventos||[],agenda:DB.agenda||[],activeEventId:DB.activeEventId||null,activeEventIds:DB.activeEventIds||[],defaultEventId:DB.defaultEventId||null,printFieldOrder:DB.printFieldOrder||PRINT_DEF,hiddenPrintFields:DB.hiddenPrintFields||[],editHistory:(DB.editHistory||[]).slice(0,20),ingresos2:DB.ingresos2||[],vehiculos:DB.vehiculos||[],papelera:(DB.papelera||[]).slice(0,200),exportLog:(DB.exportLog||[]).slice(0,500),printPhrases:DB.printPhrases||{},printPhrases2:DB.printPhrases2||{},tabSorts:DB.tabSorts||{},tabOrder:DB.tabOrder||[],colOrders:DB.colOrders||{},/* tabEvents removed */printCfg1:DB.printCfg1||{},printCfg2:DB.printCfg2||{},printCfgAg:DB.printCfgAg||{},printCfgCond:DB.printCfgCond||{},printCfgFlota:DB.printCfgFlota||{},recintos:DB.recintos||[],printTemplates:DB.printTemplates||[],printCfgModes:DB.printCfgModes||{},camposCfg:DB.camposCfg||{},eventoHistorial:(DB.eventoHistorial||[]).slice(0,50),eventosPapelera:(DB.eventosPapelera||[]).slice(0,50),_deviceAlerts:(DB._deviceAlerts||[]).slice(0,50),devices:(DB.devices||[]),_devRequireApproval:DB._devRequireApproval||false}).then(()=>{setSyncStatus('ok');try{localStorage.removeItem(SK+'_dirty');}catch(e){}}).catch(()=>setSyncStatus('error'));},350);}

function initLocalSync(){try{bc=new BroadcastChannel('cu1_sync');bc.onmessage=()=>{
  // No recargar desde localStorage si hay operaciones de delete activas
  if(Object.keys(_deleteOps).some(k=>_isDeleteProtected(k)))return;
  loadLocalDB();if(CU){renderTab(curTab);renderHdr();}
};}catch(e){window.addEventListener('storage',ev=>{if(ev.key===SK){
  if(Object.keys(_deleteOps).some(k=>_isDeleteProtected(k)))return;
  loadLocalDB();if(CU){renderTab(curTab);renderHdr();}
}});}}

function showSyncInfo(){/* info hidden */}

function setSyncStatus(s){const dot=document.getElementById('syncDot'),lbl=document.getElementById('syncLbl');const cls={ok:'sd-g',error:'sd-r',connecting:'sd-y',off:'sd-o'}[s]||'sd-y';if(dot)dot.className='sd '+cls;if(lbl)lbl.textContent='';fbConnected=(s==='ok');}

function getQrBase(){return'https://carlosreyesrivera12.github.io/control/INDEX';}

function loadLocalDB(){try{const s=localStorage.getItem(SK);if(s){const p=JSON.parse(s);DB={...DB,...p};['listaNegra','enEspera','mensajesRampa','auditLog','eventos','agenda','conductores','movimientos','ingresos','usuarios'].forEach(k=>{if(!Array.isArray(DB[k]))DB[k]=[];});if(!DB.activeEventId)DB.activeEventId=null;if(!DB.printFieldOrder)DB.printFieldOrder=[...PRINT_DEF];if(!DB.hiddenPrintFields)DB.hiddenPrintFields=[];if(!DB.activeEventIds)DB.activeEventIds=DB.activeEventId?[DB.activeEventId]:[];if(!DB.defaultEventId)DB.defaultEventId=DB.activeEventId||null;if(!DB.editHistory)DB.editHistory=[];if(!DB.ingresos2)DB.ingresos2=[];if(!DB.vehiculos)DB.vehiculos=[];if(!DB.papelera)DB.papelera=[];if(!DB.exportLog)DB.exportLog=[];if(!DB.printPhrases)DB.printPhrases={};if(!DB.printPhrases2)DB.printPhrases2={};if(!DB.tabSorts)DB.tabSorts={};if(!DB.tabOrder)DB.tabOrder=[];if(!DB.colOrders)DB.colOrders={};/* tabEvents removed */if(!DB.printCfg1)DB.printCfg1={fieldOrder:[...PRINT_DEF],hiddenFields:[],favEventId:null};if(!DB.printCfg2)DB.printCfg2={fieldOrder:[...PRINT_DEF],hiddenFields:[],favEventId:null};if(!DB.printCfgAg)DB.printCfgAg={fieldOrder:[...PRINT_DEF],hiddenFields:[],favEventId:null,qrTracking:true};if(!DB.printCfg1.fieldOrder)DB.printCfg1.fieldOrder=[...PRINT_DEF];if(!DB.printCfg2.fieldOrder)DB.printCfg2.fieldOrder=[...PRINT_DEF];if(!DB.printCfgModes)DB.printCfgModes={};if(!DB.camposCfg)DB.camposCfg={};if(!DB.devices)DB.devices=[];if(!DB.eventoHistorial)DB.eventoHistorial=[];if(!DB.eventosPapelera)DB.eventosPapelera=[];if(!DB.empresas)DB.empresas=[];if(!DB.preregistros)DB.preregistros=[];if(!DB.consentimientos)DB.consentimientos=[];
    [DB.printCfg1,DB.printCfg2].forEach(cfg=>{if(cfg.fieldOrder&&!cfg.fieldOrder.includes('tipoVehiculo')){const ri=cfg.fieldOrder.indexOf('remolque');cfg.fieldOrder.splice(ri>=0?ri+1:cfg.fieldOrder.length,0,'tipoVehiculo','descargaTipo');}if(cfg.fieldOrder&&!cfg.fieldOrder.includes('puertaHall')){const si=cfg.fieldOrder.indexOf('stand');cfg.fieldOrder.splice(si>=0?si+1:cfg.fieldOrder.length,0,'puertaHall');}});if(!DB.recintos)DB.recintos=[];if(!DB.printTemplates)DB.printTemplates=[];}DEF_USERS.forEach(du=>{if(!DB.usuarios.find(u=>u.id===du.id))DB.usuarios.push(du);});}catch(e){}}

function saveLocalDB(){try{localStorage.setItem(SK,JSON.stringify(DB));localStorage.setItem(SK+'_dirty',Date.now().toString());}catch(e){}}

function saveDB(){saveLocalDB();writeToFirebase();if(bc)try{bc.postMessage(1);}catch(e){}}

function saveDBNow(){
  saveLocalDB();
  clearTimeout(writeDebounce);
  if(bc)try{bc.postMessage(1);}catch(e){}
  if(!fbRef)return;
  const _p={_session:SID,_ts:Date.now(),movimientos:DB.movimientos,ingresos:DB.ingresos,listaNegra:DB.listaNegra,enEspera:DB.enEspera,mensajesRampa:DB.mensajesRampa,conductores:DB.conductores,usuarios:DB.usuarios,auditLog:(DB.auditLog||[]).slice(0,200),eventos:DB.eventos||[],agenda:DB.agenda||[],activeEventId:DB.activeEventId||null,activeEventIds:DB.activeEventIds||[],defaultEventId:DB.defaultEventId||null,printFieldOrder:DB.printFieldOrder||PRINT_DEF,hiddenPrintFields:DB.hiddenPrintFields||[],editHistory:(DB.editHistory||[]).slice(0,20),ingresos2:DB.ingresos2||[],vehiculos:DB.vehiculos||[],papelera:(DB.papelera||[]).slice(0,200),exportLog:(DB.exportLog||[]).slice(0,500),printPhrases:DB.printPhrases||{},printPhrases2:DB.printPhrases2||{},tabSorts:DB.tabSorts||{},tabOrder:DB.tabOrder||[],colOrders:DB.colOrders||{},printCfg1:DB.printCfg1||{},printCfg2:DB.printCfg2||{},printCfgAg:DB.printCfgAg||{},printCfgCond:DB.printCfgCond||{},printCfgFlota:DB.printCfgFlota||{},recintos:DB.recintos||[],printTemplates:DB.printTemplates||[],printCfgModes:DB.printCfgModes||{},camposCfg:DB.camposCfg||{},eventoHistorial:(DB.eventoHistorial||[]).slice(0,50),eventosPapelera:(DB.eventosPapelera||[]).slice(0,50),_deviceAlerts:(DB._deviceAlerts||[]).slice(0,50),devices:(DB.devices||[]),_devRequireApproval:DB._devRequireApproval||false};
  fbRef.set(_p).then(()=>setSyncStatus('ok')).catch(()=>setSyncStatus('error'));
}

function loadSession(){try{const s=localStorage.getItem(SK+'_sess');if(s){const d=JSON.parse(s);if(!d.exp||Date.now()>d.exp){localStorage.removeItem(SK+'_sess');return false;}const u=DB.usuarios.find(x=>x.id===d.uid&&!x.lockedUntil);if(u){CU=u;if(d.lang)CU.lang=d.lang;return true;}localStorage.removeItem(SK+'_sess');return false;}return false;}catch(e){return false;}}

function saveSession(){try{if(CU){localStorage.setItem(SK+'_sess',JSON.stringify({uid:CU.id,exp:Date.now()+SESSION_TTL,lang:CU.lang||CUR_LANG||'es'}));}else{localStorage.removeItem(SK+'_sess');}}catch(e){}}

function _assignPosAfterFirebase(ing,col,ev){
  // Show lista immediately — don't wait for position
  if(col==='ingresos2'){iF._sub2='lista';renderIngresos2();}else{iF._sub='lista';renderIngresos();}renderHdr();

  // Use Firebase atomic transaction on a counter key — guarantees uniqueness
  // Counter key: pos_YYYY-MM-DD_col (or pos_eventoId if acumularPos)
  const today=new Date().toISOString().slice(0,10);
  const counterKey=col==='ingresos2'&&ev?.acumularPos
    ?'pos_ev_'+(ev.id||'x')
    :'pos_'+today+'_'+col;

  if(fbRef&&fbConnected&&fbDb){
    const counterRef=fbDb.ref('cu1/'+_FB_KEY+'_counters/'+counterKey);
    counterRef.transaction(current=>{
      return (current||0)+1;
    },(error,committed,snap)=>{
      if(error||!committed){
        // Transaction failed — fall back to local max+1
        _doAssignPosLocal(ing,col,ev);
      } else {
        const newPos=snap.val();
        _applyPos(ing,col,newPos);
        saveDBNow();
        if(col==='ingresos2'){renderIngresos2();}else{renderIngresos();}renderHdr();
        _showPosConfirm(newPos,ing,true);
      }
    });
  } else {
    _doAssignPosLocal(ing,col,ev);
  }
}

function checkFirstRun(){
  // Con Firebase configurado (fbRef existe), NUNCA mostrar setup en carga inicial.
  // El check real lo hace _checkFirstRunAfterFirebase() desde el callback de Firebase.
  if(fbRef) return;
  if(DB.usuarios.length===0) showFirstRunSetup();
}

function _checkFirstRunAfterFirebase(){
  // Solo se llama desde startFirebaseSync cuando Firebase confirma que no hay datos remotos
  if(_fbFirstCheckDone) return;
  _fbFirstCheckDone=true;
  if(DB.usuarios.length===0) showFirstRunSetup();
}

function showFirstRunSetup(){
  document.getElementById('loginWrap').style.display='none';
  document.getElementById('setupWrap').style.display='none';
  // Crear overlay de primer setup
  if(document.getElementById('firstRunWrap'))return;
  const wrap=document.createElement('div');
  wrap.id='firstRunWrap';
  wrap.className='setup-wrap';
  wrap.innerHTML=`<div class="login-card" style="max-width:420px">
    <div style="text-align:center;margin-bottom:18px">
      <div style="font-size:36px">🔐</div>
      <div style="font-weight:900;font-size:20px">${tr('firstRun')}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">${tr('firstRunSub')}</div>
    </div>
    <div class="fg" style="margin-bottom:8px"><span class="flbl" data-i18n="frNomLbl">Nombre completo <span class="freq">*</span></span><input id="fr_nom" data-i18n-ph="phAdminName" placeholder="Nombre del administrador"></div>
    <div class="fg" style="margin-bottom:8px"><span class="flbl">Usuario <span class="freq">*</span></span><input id="fr_user" data-i18n-ph="phUsername" placeholder="nombre_usuario (sin espacios)" oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9._-]/g,'')"></div>
    <div class="fg" style="margin-bottom:8px"><span class="flbl" data-i18n="frEmailLbl">Email (para 2FA)</span><input id="fr_email" type="email" data-i18n-ph="phAdminEmail" placeholder="admin@empresa.com"></div>
    <div class="fg" style="margin-bottom:8px"><span class="flbl">Contraseña <span class="freq">*</span></span><input id="fr_pass" type="password" data-i18n-ph="phMinPass" placeholder="Mínimo 8 caracteres"></div>
    <div class="fg" style="margin-bottom:8px"><span class="flbl">Confirmar contraseña <span class="freq">*</span></span><input id="fr_pass2" type="password" data-i18n-ph="phRepeatPass" placeholder="Repetir contraseña"></div>
    <div class="fg" style="margin-bottom:14px"><span class="flbl">PIN (mínimo 6 dígitos)</span><input id="fr_pin" type="password" inputmode="numeric" maxlength="8" data-i18n-ph="phQuickPin" placeholder="Acceso rápido por PIN"></div>
    <div id="fr_err" style="display:none;color:var(--red);font-size:12px;font-weight:700;margin-bottom:8px;padding:6px 10px;background:var(--rll);border-radius:var(--r)"></div>
    <button class="btn btn-p" style="width:100%;padding:10px;font-size:14px" onclick="doFirstRunSetup()">✓ Crear SuperAdmin y continuar</button>
  </div>`;
  document.body.appendChild(wrap);
}

async function doFirstRunSetup(){
  const nom=(document.getElementById('fr_nom').value||'').trim();
  const username=(document.getElementById('fr_user').value||'').trim();
  const email=(document.getElementById('fr_email').value||'').trim();
  const pass=document.getElementById('fr_pass').value;
  const pass2=document.getElementById('fr_pass2').value;
  const pin=document.getElementById('fr_pin').value;
  const errEl=document.getElementById('fr_err');
  errEl.style.display='none';
  if(!nom){errEl.textContent=tr('nameRequired');errEl.style.display='block';return;}
  if(!username){errEl.textContent='Usuario obligatorio';errEl.style.display='block';return;}
  if(pass.length<8){errEl.textContent=tr('passMin8');errEl.style.display='block';return;}
  if(pass!==pass2){errEl.textContent=tr('passNoMatch');errEl.style.display='block';return;}
  if(pin&&(pin.length<6||!/^\d+$/.test(pin))){errEl.textContent=tr('pinMin6');errEl.style.display='block';return;}
  // ⚠️ SEGURIDAD: Solo el email autorizado puede crear el SuperAdmin
  const SA_EMAIL='carlosreyesrivera12@gmail.com';
  if(email!==SA_EMAIL){errEl.textContent='⛔ Email no autorizado para SuperAdmin. Usa el email de administración correcto.';errEl.style.display='block';return;}
  // Verificar que no existe ya un SuperAdmin en el sistema (protección anti-reset)
  if(DB.usuarios.some(u=>u.rol==='superadmin')){errEl.textContent='⛔ Ya existe un SuperAdmin en el sistema. Contacta al administrador.';errEl.style.display='block';return;}
  const{hash,salt}=await hashPassword(pass,null);
  const u={id:'u_sa_'+uid(),nombre:nom,username,email,passwordHash:hash,passwordSalt:salt,pin:pin||'',twoFA:!!(email&&pin),rol:'superadmin',permisos:{canAdd:true,canEdit:true,canDel:true,canStatus:true,canExport:true,canSpecial:true,canPrint:true,canImport:true,canClean:true,canSaveTpl:true,canDelTpl:true,canEditEvento:true,canActivarEvento:true,canMensajes:true},lang:'es',mustChangePassword:false,loginAttempts:0,lockedUntil:null};
  DB.usuarios=[u];
  saveDB();
  const w=document.getElementById('firstRunWrap');
  if(w)w.remove();
  toast('✅ SuperAdmin creado. Inicia sesión.','var(--text2)');
  showLogin();
}

function startFirebaseSyncV6(){
  if(!fbRef)return;
  fbRef.on('value',function(snap){
    var rem=snap.val();
    if(!rem||rem._session===SID)return;
    if(rem.empresas)DB.empresas=Array.isArray(rem.empresas)?rem.empresas:Object.values(rem.empresas);
    if(rem.preregistros)DB.preregistros=Array.isArray(rem.preregistros)?rem.preregistros:Object.values(rem.preregistros);
    if(rem.consentimientos)DB.consentimientos=Array.isArray(rem.consentimientos)?rem.consentimientos:Object.values(rem.consentimientos);
    if(CU&&CU.rol==='empresa')pRenderAll();
  });
}

