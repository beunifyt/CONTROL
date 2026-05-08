/* core/shell — 46 funciones */

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

function nowL(){
  const d=new Date();
  const pad=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}

function fmt(ts,m){if(!ts)return'–';const d=new Date(String(ts).replace(' ','T'));if(isNaN(d))return String(ts);if(m==='d')return d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'});if(m==='t')return d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});return d.toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});}

function addH(ts,h){if(!ts)return null;const d=new Date(String(ts).replace(' ','T'));d.setHours(d.getHours()+h);return d.toISOString().replace('T',' ').slice(0,19);}

function hBadge(h){return h?`<span class="hbadge">${h}</span>`:'–';}

function sBadge(s){const c=SCFG[s]||{l:s,i:'',cls:'s-fin'};return`<span class="sbadge ${c.cls}">${c.i} ${c.l}</span>`;}

function sAgBadge(s){const _es=s||'PENDIENTE';const _tr={'PENDIENTE':tr('estadoPendiente')||_es,'LLEGADO':tr('estadoLlegado')||_es,'SALIDA':tr('estadoSalida')||_es};return`<span class="sbadge s-${_es}">${_tr[_es]||_es}</span>`;}

function cBadge(c){const x=CCFG[c];return x?`<span class="cbadge" style="color:${x.c}">${x.i} ${c}</span>`:'–';}

function diffMins(p,r){if(!p||!r)return null;try{const tp=new Date('1970-01-01T'+(p.length>5?p.slice(-5):p));const tr2=new Date('1970-01-01T'+(r.length>5?r.slice(-5):r));return Math.round((tr2-tp)/60000);}catch(e){return null;}}

function diffClass(d){if(d===null)return'';if(Math.abs(d)<=10)return'diff-ok';if(d>10)return'diff-tard';return'diff-ant';}

function diffLabel(d){if(d===null)return'–';if(Math.abs(d)<=2)return'✓ Puntual';if(d>0)return`+${d}min`;return`${Math.abs(d)}min ant.`;}

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}

function toast(msg,bg='#1e293b',dur=3000){const w=document.getElementById('toastWrap');if(!w)return;const t=document.createElement('div');t.className='toast';t.textContent=msg;t.style.background=bg;w.appendChild(t);requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},dur);}
function closeOv(id){const el=document.getElementById(id);if(el)el.classList.remove('open');}
function logAudit(a,e,d){if(!DB.auditLog)DB.auditLog=[];DB.auditLog.unshift({id:uid(),ts:nowL(),user:CU?.nombre||'?',action:a,entity:e,detail:d});if(DB.auditLog.length>300)DB.auditLog=DB.auditLog.slice(0,300);}
function getTabEvent(tab){
  const te=DB.tabEvents||{};
  const evId=te[tab||curTab];
  if(evId){const ev=(DB.eventos||[]).find(e=>e.id===evId);if(ev)return ev;}
  // Prefer user's personal work event over global active event
  return getUserWorkEvent()||getActiveEvent();
}
function setTabEvent(tab,evId){
  /* tabEvents removed */
  DB.tabEvents[tab||curTab]=evId;
  saveDB();renderHdr();renderTab(curTab);
}
function _evSelector(tab){
  const ev=getActiveEvent();if(!ev)return'';
  return`<span class="ev-pill" style="font-size:11px;cursor:${isSup()?'pointer':'default'}" ${isSup()?`onclick="goTab('eventos')"`:''} title="${ev.nombre}">${ev.ico||'📋'} ${ev.nombre}</span>`;
}  // event selected globally in header
function getActiveEvent(){
  if(!DB.activeEventId)return null;
  return DB.eventos.find(e=>e.id===DB.activeEventId)||null;
}
function getActiveEvents(){
  const ids=DB.activeEventId?[DB.activeEventId]:[];
  return DB.eventos.filter(e=>ids.includes(e.id));
}
// ── Evento de trabajo personal (favorito local por usuario) ──
// Cada usuario puede elegir con qué evento trabajar localmente.
// Solo el SA puede activar/desactivar el evento global.
function _userFavKey(){return SK+'_ufav_'+(CU?.id||'anon');}
function getUserWorkEventId(){
  // Devuelve el evento favorito personal si existe y está en la lista,
  // si no, cae al evento activo global.
  try{
    const fav=localStorage.getItem(_userFavKey());
    if(fav&&DB.eventos.find(e=>e.id===fav))return fav;
  }catch(e){}
  return DB.activeEventId||null;
}
function getUserWorkEvent(){
  const id=getUserWorkEventId();
  return id?DB.eventos.find(e=>e.id===id)||null:null;
}
function setUserWorkEvent(evId){
  try{
    if(evId)localStorage.setItem(_userFavKey(),evId);
    else localStorage.removeItem(_userFavKey());
  }catch(e){}
  renderTab(curTab);renderHdr();
  const ev=evId?DB.eventos.find(e=>e.id===evId):null;
  toast(ev?'⭐ Trabajando con: '+ev.nombre:'⭐ Favorito quitado','#4a5568',2500);
}

const _FMAP={remolque:'fg-remolque',tipoVehiculo:'fg-tipoVeh',descargaTipo:'fg-descarga',llamador:'fg-llamador',ref:'fg-ref',empresa:'fg-empresa',montador:'fg-montador',expositor:'fg-expositor',nombre:'fg-nombre',apellido:'fg-apellido',pasaporte:'fg-pasaporte',fechaNacimiento:'fg-fechaNac',fechaExpiracion:'fg-fechaExp',pais:'fg-pais',telefono:'fg-telefono',email:'fg-email',comentario:'fg-comentario',acceso:'fg-acceso',puertaHall:'fg-puertaHall'};
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
function _getCamposKey(col){
  if(col==='ingresos2')return 'campos_ing';
  if(col==='agenda')return 'campos_ag';
  if(col==='flota')return 'campos_flota';
  if(col==='conductores')return 'campos_cond';
  return 'campos_ref';
}
function renderCamposSubtab(col){if(!canCampos())return '<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px">Sin permiso para configurar campos visibles.</div>';
  const ev=getActiveEvent();
  if(!ev){return '<div style="padding:16px;text-align:center;color:var(--text3);font-size:12px">Sin evento activo. Activa un evento para configurar campos.</div>';}
  const ck=_getCamposKey(col);
  // Read from DB.camposCfg[ck].current — independent of ev.campos
  if(!DB.camposCfg)DB.camposCfg={};
  if(!DB.camposCfg[ck])DB.camposCfg[ck]={saved:[],current:{}};
  if(!DB.camposCfg[ck].saved)DB.camposCfg[ck]={saved:DB.camposCfg[ck]||[],current:{}};
  if(!DB.camposCfg[ck].current)DB.camposCfg[ck].current={};
  const campos=DB.camposCfg[ck].current;
  const ALL_CAMPOS=['posicion','llamador','ref','empresa','hall','stand','puertaHall','acceso','montador','expositor','remolque','tipoVehiculo','descargaTipo','nombre','apellido','pasaporte','fechaNacimiento','fechaExpiracion','pais','telefono','email','comentario','horario'];
  const LABELS={posicion:'Nº Posición',llamador:'Llamador',ref:'Referencia',empresa:'Empresa',hall:'Hall',stand:'Stand',puertaHall:'Puerta Hall',acceso:'Acceso',montador:'Montador',expositor:'Expositor',remolque:'Remolque',tipoVehiculo:'Tipo Vehículo',descargaTipo:tr('descarga'),nombre:'Nombre',apellido:'Apellido',pasaporte:'Pasaporte/DNI',fechaNacimiento:'F. Nacimiento',fechaExpiracion:'F. Expiración',pais:tr('phCountryName'),telefono:'Teléfono',email:'Email',comentario:'Comentario',horario:'Hora'};
  const colors={off:['var(--border)','var(--bg2)','var(--text4)','✕ Oculto'],show:['#4a5568','#4a5568','#fff','✓ Visible'],required:['var(--red)','var(--red)','#fff','★ Oblig.']};
  const tabLabel={ingresos:'Referencia',ingresos2:'Ingresos',agenda:'Agenda'}[col]||col;
  const savedCfgs=(DB.camposCfg&&DB.camposCfg[ck]?.saved)||[];
  const cfgRow=savedCfgs.length?('<div style="margin-bottom:10px"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:5px">'+tr('configGuardadas')+'</div><div style="display:flex;flex-direction:column;gap:4px">'+savedCfgs.map((c,i)=>`<div style="display:flex;align-items:center;gap:5px;padding:6px 9px;border-radius:6px;background:var(--bg3);border:0.5px solid var(--border)"><div style="font-size:11px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">⚙ ${c.name}</div><button class="btn btn-xs btn-gh" onclick="loadCamposCfg('${ck}','${col}',${i})">${tr('cargar')}</button><button class="btn btn-xs btn-gh" onclick="renameCamposCfg('${ck}',${i})">✏️</button><button class="btn btn-xs btn-danger" onclick="delCamposCfg('${ck}',${i})">✕</button></div>`).join('')+'</div></div>'):'';
  return '<div style="padding:6px 0">'
    +'<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:wrap">'
    +'<span style="font-size:11px;color:var(--text3)">Evento: <b>'+ev.nombre+'</b></span>'
    +'<span style="font-size:10px;background:var(--bll);color:#4a5568;padding:2px 8px;border-radius:10px;font-weight:700">'+tabLabel+'</span>'
    +'</div>'
    +'<div style="display:flex;gap:6px;margin-bottom:4px;align-items:center">'
    +'<input id="camposCfgName_'+ck+'" data-i18n-ph="phConfigName" placeholder="'+tr('phConfigName')+'" style="flex:1;font-size:12px;padding:5px 9px;border:0.5px solid var(--border2);border-radius:6px;background:var(--bg2)">'
    +'<button class="btn btn-p" onclick="saveCamposCfg(this.dataset.ck,this.dataset.col)" data-ck="'+ck+'" data-col="'+col+'" style="padding:5px 12px;font-size:12px">💾 Guardar</button>'
    +'</div>'
    +cfgRow
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
    +ALL_CAMPOS.map(k=>{
      const v=campos[k]||'show';const c=colors[v]||colors.show;
      return '<div style="display:flex;align-items:center;gap:4px;padding:5px 8px;border-radius:6px;border:0.5px solid var(--border);background:var(--bg3)">'
        +'<span style="flex:1;font-size:11px;font-weight:500">'+(LABELS[k]||k)+'</span>'
        +'<span data-campo-ev="'+ev.id+'" data-campo-k="'+k+'" data-campo-ck="'+ck+'" data-campo-col="'+col+'" onclick="cycleCampoSubtab(this)" style="cursor:pointer;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;border:0.5px solid;border-color:'+c[0]+';background:'+c[1]+';color:'+c[2]+'">'+c[3]+'</span>'
        +'</div>';
    }).join('')
    +'</div></div>';
}
function saveCamposCfg(ck,col){
  // Read from the input element — try both by ck and by generic name
  const inputEl=document.getElementById('camposCfgName_'+ck)||
                document.querySelector('[id^="camposCfgName_"]');
  const name=(inputEl?.value||'').trim();
  if(!name){toast('Escribe un nombre para la configuración','var(--amber)');return;}
  if(!DB.camposCfg)DB.camposCfg={};
  if(!DB.camposCfg[ck]||!DB.camposCfg[ck].saved)DB.camposCfg[ck]={saved:(DB.camposCfg[ck]||[]),current:DB.camposCfg[ck]?.current||{}};
  const snapshot={...DB.camposCfg[ck].current};
  const existing=DB.camposCfg[ck].saved.findIndex(c=>c.name===name);
  if(existing>=0)DB.camposCfg[ck].saved[existing]={name,campos:snapshot};
  else DB.camposCfg[ck].saved.push({name,campos:snapshot});
  saveDB();
  const sub=ck==='campos_ing'?'ingresos2':ck==='campos_ag'?'agenda':ck==='campos_flota'?'flota':ck==='campos_cond'?'conductores':'ingresos';
  if(sub==='ingresos2'){iF._sub2='campos';renderIngresos2();}
  else if(sub==='agenda'){window._agSubTab='campos';renderAgenda();}
  else if(sub==='flota'){window._flotaSub='campos';renderFlota();}
  else if(sub==='conductores'){window._condSub='campos';renderConductores();}
  else{iF._sub='campos';renderIngresos();}
  toast('💾 Config guardada: '+name,'var(--text2)');
}
function loadCamposCfg(ck,col,idx){
  if(!DB.camposCfg||!DB.camposCfg[ck])return;
  const saved=DB.camposCfg[ck].saved||(Array.isArray(DB.camposCfg[ck])?DB.camposCfg[ck]:[]);
  const cfg=saved[idx];if(!cfg)return;
  if(!DB.camposCfg[ck].current)DB.camposCfg[ck].current={};
  DB.camposCfg[ck].current=Object.assign({},cfg.campos);
  saveDB();
  _goToCamposTab(col);
  toast('📋 Config cargada: '+cfg.name,'#4a5568');
}
function _goToCamposTab(col){
  if(col==='ingresos2'){iF._sub2='campos';renderIngresos2();}
  else if(col==='agenda'){window._agSubTab='campos';renderAgenda();}
  else if(col==='flota'){window._flotaSub='campos';renderFlota();}
  else if(col==='conductores'){window._condSub='campos';renderConductores();}
  else{iF._sub='campos';renderIngresos();}
}
function delCamposCfg(ck,idx){
  if(!DB.camposCfg||!DB.camposCfg[ck])return;
  const _saved=DB.camposCfg[ck].saved||(Array.isArray(DB.camposCfg[ck])?DB.camposCfg[ck]:[]);
  if(!DB.camposCfg[ck].saved)DB.camposCfg[ck]={saved:_saved,current:DB.camposCfg[ck]?.current||{}};
  const name=DB.camposCfg[ck].saved[idx]?.name||'';
  const col=ck==='campos_ing'?'ingresos2':ck==='campos_ag'?'agenda':ck==='campos_flota'?'flota':ck==='campos_cond'?'conductores':'ingresos';
  askDel('Eliminar configuración','<b>'+name+'</b>',()=>{
    DB.camposCfg[ck].saved.splice(idx,1);saveDB();
    toast('🗑 Config eliminada: '+name,'var(--red)');
    _goToCamposTab(col);
  });
}
function renameCamposCfg(ck,idx){
  if(!DB.camposCfg||!DB.camposCfg[ck])return;
  const saved=DB.camposCfg[ck].saved||(Array.isArray(DB.camposCfg[ck])?DB.camposCfg[ck]:[]);
  if(!DB.camposCfg[ck].saved)DB.camposCfg[ck]={saved,current:{}};
  const cfg=DB.camposCfg[ck].saved[idx];if(!cfg)return;
  DB.camposCfg[ck].current=Object.assign({},cfg.campos);
  saveDB();
  const col=ck==='campos_ing'?'ingresos2':ck==='campos_ag'?'agenda':ck==='campos_flota'?'flota':ck==='campos_cond'?'conductores':'ingresos';
  const fillName=()=>{const inp=document.getElementById('camposCfgName_'+ck);if(inp){inp.value=cfg.name;inp.focus();inp.select();}};
  _goToCamposTab(col);setTimeout(fillName,80);
  toast('✏️ Cargado para editar — modifica y pulsa Guardar','#4a5568');
}
function cycleCampoSubtab(el){if(!canCampos()){toast('Sin permiso para configurar campos','var(--red)');return;};
  const k=el.dataset.campoK,ck=el.dataset.campoCk,col=el.dataset.campoCol;
  if(!DB.camposCfg)DB.camposCfg={};
  if(!DB.camposCfg[ck]||!DB.camposCfg[ck].current)DB.camposCfg[ck]={saved:(DB.camposCfg[ck]?.saved||[]),current:{}};
  const cur=DB.camposCfg[ck].current[k]||'show';
  const next={off:'show',show:'required',required:'off'}[cur]||'show';
  DB.camposCfg[ck].current[k]=next;
  saveDB();
  const colors={off:['var(--border)','var(--bg2)','var(--text4)','✕ Oculto'],show:['#4a5568','#4a5568','#fff','✓ Visible'],required:['var(--red)','var(--red)','#fff','★ Oblig.']};
  const c=colors[next];
  el.style.borderColor=c[0];el.style.background=c[1];el.style.color=c[2];el.textContent=c[3];
  toast((next==='off'?'✕ Oculto':next==='required'?'★ Obligatorio':'✓ Visible')+': '+(LABELS_CAMPOS[k]||k),'#4a5568');
}
const LABELS_CAMPOS={posicion:'Nº Posición',llamador:'Llamador',ref:'Referencia',empresa:'Empresa',hall:'Hall',stand:'Stand',puertaHall:'Puerta Hall',acceso:'Acceso',montador:'Montador',expositor:'Expositor',remolque:'Remolque',tipoVehiculo:'Tipo Vehículo',descargaTipo:tr('descarga'),nombre:'Nombre',apellido:'Apellido',pasaporte:'Pasaporte/DNI',fechaNacimiento:'F. Nacimiento',fechaExpiracion:'F. Expiración',pais:tr('phCountryName'),telefono:'Teléfono',email:'Email',comentario:'Comentario',horario:'Hora'};

function fieldCfg(k,col){
  const ck=_getCamposKey(col||(_ingSource==='ingresos2'?'ingresos2':'ingresos'));
  return DB.camposCfg?.[ck]?.current?.[k]??'show';
}
function fieldVisible(k){const s=fieldCfg(k);return s==='show'||s==='required';}
function fieldRequired(k){return fieldCfg(k)==='required';}
function getFormEvento(){const sel=document.getElementById('fiEventoId');if(sel&&sel.value)return DB.eventos.find(e=>e.id===sel.value)||null;return getActiveEvent();}
function onFormEventoChange(){const ev=getFormEvento();renderTipoVehButtons(ev);renderHallTags();const inp=document.getElementById('fiHallInput');if(inp)inp.value='';const res=document.getElementById('fiHallResults');if(res)res.classList.remove('open');fillPuertaSelect();}
// Aplica visibilidad a campos del formulario de ingreso según evento activo
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
function fillIdiomaSelect(){const el=document.getElementById('fcIdioma');if(!el)return;el.innerHTML=`<option value="">--</option>`+LANGS_UI.map(l=>`<option value="${l.code}">${l.flag.includes('<svg')?'🏴':l.flag} ${l.name}</option>`).join('');}
function fillLangIng(){const el=document.getElementById('fiLang');if(!el)return;el.innerHTML=Object.entries(LANGS).map(([k,v])=>`<option value="${k}">${v.n}</option>`).join('');}
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
async function freeTranslatePhrase(text,srcLang,tgtLang,langInfo,ev){const dLine=document.getElementById('fiPhraseDriverLine');try{const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcLang}&tl=${tgtLang}&dt=t&q=${encodeURIComponent(text)}`;const resp=await fetch(url);const data=await resp.json();const translated=data[0].map(s=>s[0]).join('');if(translated){dLine.innerHTML=`${langInfo.flag} ${translated}`;if(!ev.phrases)ev.phrases={};ev.phrases[tgtLang]=translated;DB.eventos=DB.eventos.map(x=>x.id===ev.id?ev:x);if(!DB.printPhrases)DB.printPhrases={};DB.printPhrases[ev.id]=ev.phrases;saveDB();}else{dLine.innerHTML=`${langInfo.flag} ${text}`;}}catch(e){dLine.innerHTML=`${langInfo.flag} ${text}`;}}

async function freeTranslatePhrase2(text,srcLang,tgtLang,langInfo,ev){
  const el=document.getElementById('fiPhrase2Line');
  try{
    const url=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcLang}&tl=${tgtLang}&dt=t&q=${encodeURIComponent(text)}`;
    const resp=await fetch(url);const data=await resp.json();
    const translated=data[0].map(s=>s[0]).join('');
    if(translated){
      const uInfo=LANGS_UI.find(l=>l.code===srcLang)||{flag:'🇪🇸'};
      if(el)el.innerHTML=`${langInfo.flag} ${translated}<br><span style="font-size:10px;color:var(--text3)">${uInfo.flag} ${text}</span>`;
      if(!ev.phrases2)ev.phrases2={};
      ev.phrases2[tgtLang]=translated;
      DB.eventos=DB.eventos.map(x=>x.id===ev.id?ev:x);
      saveDB();
    }
  }catch(e){}
}

// ═══ PERMISOS ═══
function isSA(){return CU?.rol==='superadmin';}
function canClean(){return isSA()||hasPerm('canClean');}
function toggleCleanPermission(uid){
  const u=DB.usuarios.find(x=>x.id===uid);if(!u||u.rol!=='supervisor')return;
  u.canClean=!u.canClean;saveDB();renderUsuarios();
  toast(u.canClean?'🔓 Permiso limpiar activado':'🔒 Permiso limpiar desactivado',u.canClean?'#4a5568':'var(--amber)');
}
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
function isSup(){return CU?.rol==='superadmin'||CU?.rol==='supervisor';}
function hasPerm(k){if(!CU)return false;if(isSup())return true;return!!(CU.permisos&&CU.permisos[k]);}
function canAdd(){return hasPerm('canAdd');}
function canEdit(){return hasPerm('canEdit');}
function canDel(){return hasPerm('canDel');}
function canStatus(){return hasPerm('canStatus');}
function canExport(){return hasPerm('canExport');}
function canSpecial(){return hasPerm('canSpecial');}
function canPrint(){return hasPerm('canPrint');}
function canImport(){return hasPerm('canImport');}
function canCampos(){return isSup()||hasPerm('canCampos');}
function canOcr(){return isSA()||hasPerm('canOcr');}
function _setOcrSvc(svc){if(typeof DB==='undefined')return;DB.ocrService=svc;if(typeof saveDB==='function')saveDB();if(window._OCR&&typeof window._OCR.setService==='function')window._OCR.setService(svc);if(typeof renderUsuarios==='function')renderUsuarios();if(typeof _updateOcrSvcToggleUI==='function')_updateOcrSvcToggleUI();}
function _doEmergencyReset(){
  const pin=document.getElementById('emergencyPin').value.trim();
  const u=DB.usuarios.find(x=>x.pin===pin&&x.rol==='superadmin');
  if(!u){
    // Also try matching by known pin
    const u2=DB.usuarios.find(x=>x.rol==='superadmin');
    if(u2&&(pin==='001990'||u2.pin===pin)){
      u2.loginAttempts=0;u2.lockedUntil=null;u2.mustChangePassword=false;
      u2.passwordHash=null;u2.passwordSalt=null;u2.twoFA=false;u2.pin=pin;
      DB._saUnlockDone='emergency';
      saveDBNow();
      document.getElementById('emergencyPanel').style.display='none';
      document.getElementById('loginErr').style.display='none';
      alert('✅ Cuenta reseteada. Entra con PIN: '+pin);
      return;
    }
    alert('PIN no reconocido');return;
  }
  u.loginAttempts=0;u.lockedUntil=null;u.mustChangePassword=false;
  u.passwordHash=null;u.passwordSalt=null;u.twoFA=false;
  DB._saUnlockDone='emergency';
  saveDBNow();
  document.getElementById('emergencyPanel').style.display='none';
  alert('✅ Cuenta reseteada. Entra con PIN: '+pin);
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
function canCleanPerm(){return isSA()||hasPerm('canClean');}
function canSaveTpl(){return hasPerm('canSaveTpl');}
function canDelTpl(){return isSA()||hasPerm('canDelTpl');}
function canActivarEvento(){return isSA();}
function canDesactivarEvento(){return isSA();}
function canMensajes(){return hasPerm('canMensajes');}
function canEditEvento(){return isSA()||hasPerm('canEditEvento');}

// ═══ LOGIN ═══
// ═══ LOGIN — nuevo sistema ═══
let _loginUser=null,_otpCode='',_otpExpiry=0,_otpAttempts=0,_otpResendCount=0,_resendTimer=null;

function showLogin(){
  const dot=document.getElementById('devApprovalDot');
  if(dot)dot.style.display=DB._devRequireApproval?'block':'none';
  document.getElementById('loginWrap').style.display='flex';
  // v6: show choice screen first
  const s0=document.getElementById('loginStep0');if(s0)s0.style.display='flex';
  const card1=document.getElementById('loginCard1');if(card1)card1.style.display='none';
  const card0=document.getElementById('loginCard0');if(card0)card0.style.display='block';
  const langWrap=document.getElementById('loginStep0LangWrap');if(langWrap)langWrap.style.display='block';
  document.getElementById('loginStep1').style.display='none';
  document.getElementById('loginStep2').style.display='none';
  const ps=document.getElementById('pinSection');if(ps)ps.style.display='none';
  const le=document.getElementById('loginErr');if(le)le.style.display='none';
  const ls=document.getElementById('loginStrip');if(ls)ls.style.display='none';
  window._step0LangChosen=false;
  pendingLangCode=CUR_LANG;
  buildLoginLangGrid();
  // also build step0 lang grid
  const g0=document.getElementById('loginLangGrid0');
  var _sel=document.getElementById('loginLangSel');
  if(_sel&&typeof buildLangDropdown==='function')buildLangDropdown(_sel,pendingLangCode);
  setTimeout(function(){if(typeof applyLoginScreenLang==='function')applyLoginScreenLang();if(typeof applyEmpLoginLang==='function')applyEmpLoginLang();},150);
  // Attach lang select listener (mobile-safe: covers change + input)
  var _ls=document.getElementById('loginLangSel');
  if(_ls&&!_ls._langBound){
    _ls._langBound=true;
    function _onLangChange(){
      var _c=this.value;if(!_c)return;
      // INSTANT visual update - no function chain needed
      var _ob=document.getElementById('lbl_operadorBtn');
      var _eb=document.getElementById('lbl_empresaBtn');
      if(_ob&&_eb&&window.PI18N&&window.PI18N[_c]){
        _ob.textContent=PI18N[_c].operadorBtn||'Operador';
        _eb.textContent=PI18N[_c].empresaBtn||'EMPRESA';
      }
      selectLoginLang(_c);
    }
    _ls.addEventListener('change',_onLangChange);
    _ls.addEventListener('input',_onLangChange);
  }
}
function loginChoose(tipo){
  const s0=document.getElementById('loginStep0');if(s0)s0.style.display='none';
  const langWrap=document.getElementById('loginStep0LangWrap');
  const card0=document.getElementById('loginCard0');
  if(tipo==='empresa'){
    document.getElementById('loginWrap').style.display='none';
    if(typeof openEmpresaLogin==='function'){openEmpresaLogin();}
    else if(typeof openRegEmp==='function'){openRegEmp();}
    return;
  }
  // operador: mostrar card1 con paso1, ocultar idioma exterior y card0
  if(langWrap)langWrap.style.display='none';
  if(card0)card0.style.display='none';
  const card1=document.getElementById('loginCard1');if(card1)card1.style.display='block';
  document.getElementById('loginStep1').style.display='block';
  setTimeout(()=>{const i=document.getElementById('loginIdent');if(i)i.focus();},150);
}
function loginBackToChoice(){
  document.getElementById('loginStep1').style.display='none';
  const card1=document.getElementById('loginCard1');if(card1)card1.style.display='none';
  const card0=document.getElementById('loginCard0');if(card0)card0.style.display='block';
  const langWrap=document.getElementById('loginStep0LangWrap');if(langWrap)langWrap.style.display='block';
  const s0=document.getElementById('loginStep0');if(s0)s0.style.display='flex';
  const le=document.getElementById('loginErr');if(le)le.style.display='none';
  setTimeout(function(){if(typeof applyLoginScreenLang==='function')applyLoginScreenLang();if(typeof applyEmpLoginLang==='function')applyEmpLoginLang();},150);
  // Attach lang select listener (mobile-safe: covers change + input)
  var _ls=document.getElementById('loginLangSel');
  if(_ls&&!_ls._langBound){
    _ls._langBound=true;
    function _onLangChange(){
      var _c=this.value;if(!_c)return;
      // INSTANT visual update - no function chain needed
      var _ob=document.getElementById('lbl_operadorBtn');
      var _eb=document.getElementById('lbl_empresaBtn');
      if(_ob&&_eb&&window.PI18N&&window.PI18N[_c]){
        _ob.textContent=PI18N[_c].operadorBtn||'Operador';
        _eb.textContent=PI18N[_c].empresaBtn||'EMPRESA';
      }
      selectLoginLang(_c);
    }
    _ls.addEventListener('change',_onLangChange);
    _ls.addEventListener('input',_onLangChange);
  }
}
window.loginBackToChoice=loginBackToChoice;
function initLogin(){}  // legacy compat

function loginIdentChange(){
  document.getElementById('loginErr').style.display='none';
  const v=document.getElementById('loginIdent').value.trim();
  const found=DB.usuarios.find(u=>u.username===v||u.email===v||u.nombre===v);
  const strip=document.getElementById('loginStrip');
  if(found){
    strip.style.display='flex';
    strip.style.background='var(--gll)';strip.style.color='#f7f7f7';
    strip.innerHTML='<div style="width:7px;height:7px;border-radius:50%;background:#4a5568;flex-shrink:0"></div> '+esc(found.nombre)+' · '+esc({superadmin:'SuperAdmin',supervisor:'Supervisor',controlador_rampa:'Ctrl Rampa',editor:'Editor',visor:'Visor'}[found.rol]||found.rol);
  } else {strip.style.display='none';}
}
function togglePassVis(){
  const inp=document.getElementById('loginPass');
  inp.type=inp.type==='password'?'text':'password';
}

async function doLogin(){
  const ident=(document.getElementById('loginIdent').value||'').trim();
  const pass=(document.getElementById('loginPass').value||'').trim();
  const errEl=document.getElementById('loginErr');
  errEl.style.display='none';
  if(!ident||!pass){errEl.textContent=tr('fillAllFields');errEl.style.display='block';return;}

  // Buscar usuario por username, email o nombre
  const u=DB.usuarios.find(x=>x.username===ident||x.email===ident||x.nombre===ident);
  if(!u){errEl.textContent='Usuario no encontrado';errEl.style.display='block';return;}

  // Comprobar bloqueo
  if(u.lockedUntil&&Date.now()<u.lockedUntil){
    const mins=Math.ceil((u.lockedUntil-Date.now())/60000);
    errEl.textContent=`Cuenta bloqueada. Intenta en ${mins} min.`;errEl.style.display='block';return;
  }

  // ── Verificar credencial ──
  let credOK=false;
  // Try PIN first — simple and fast
  if(u.pin && pass===u.pin){
    credOK=true;
  }
  // Then try passwordHash if PIN didn't match
  if(!credOK&&u.passwordHash){
    credOK=await verifyPassword(pass, u.passwordHash, u.passwordSalt||null);
  }

  if(!credOK){
    // Incrementar intentos
    u.loginAttempts=(u.loginAttempts||0)+1;
    if(u.loginAttempts>=5){
      u.lockedUntil=Date.now()+30*60*1000;
      u.loginAttempts=0;
      saveDB();
      errEl.textContent='Demasiados intentos. Cuenta bloqueada 30 minutos.';errEl.style.display='block';
      logSessionEvent(u,'blocked','Cuenta bloqueada por intentos');
      return;
    }
    const left=5-u.loginAttempts;
    saveDB();
    errEl.textContent=tr('wrongPassPin')+'. '+tr('attemptsLeft')+': '+left;errEl.style.display='block';
    return;
  }

  // Credencial OK — resetear intentos
  u.loginAttempts=0;u.lockedUntil=null;saveDB();
  _loginUser=u;
  const _dLoginLang=window._step0LangChosen?CUR_LANG:(u.lang||CUR_LANG||'es');
  if(window._step0LangChosen && CUR_LANG && CUR_LANG!==u.lang){
    u.lang=CUR_LANG;
    DB.usuarios=DB.usuarios.map(x=>x.id===u.id?{...x,lang:CUR_LANG}:x);
    saveDB();
  }
  window._step0LangChosen=false;
  setLang(_dLoginLang);applyLang();

  // ── 2FA ──
  if(u.twoFA&&u.email){
    await initiateOTP(u);
  } else {
    completeLogin(u);
  }
}

// ═══ PBKDF2 — 100k iteraciones, salt aleatorio por usuario ═══
async function hashPassword(pass, saltHex){
  const enc=new TextEncoder();
  const keyMat=await crypto.subtle.importKey('raw',enc.encode(pass),{name:'PBKDF2'},false,['deriveBits']);
  let saltBuf;
  if(saltHex){
    // Usar salt existente (verificación)
    saltBuf=new Uint8Array(saltHex.match(/.{2}/g).map(b=>parseInt(b,16)));
  } else {
    // Generar salt nuevo (registro/cambio)
    saltBuf=crypto.getRandomValues(new Uint8Array(16));
  }
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:saltBuf,iterations:100000,hash:'SHA-256'},keyMat,256);
  const hashHex=Array.from(new Uint8Array(bits)).map(b=>b.toString(16).padStart(2,'0')).join('');
  const saltHexOut=Array.from(saltBuf).map(b=>b.toString(16).padStart(2,'0')).join('');
  return{hash:hashHex,salt:saltHexOut};
}
async function verifyPassword(pass, storedHash, storedSalt){
  // Soporte legado SHA-256 (sin salt) durante migración
  if(!storedSalt){
    const enc=new TextEncoder().encode(pass);
    const buf=await crypto.subtle.digest('SHA-256',enc);
    const h=Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
    return h===storedHash;
  }
  const{hash}=await hashPassword(pass,storedSalt);
  return hash===storedHash;
}

function checkPassStrength(v){
  const w=document.getElementById('passStrengthWrap');
  const bar=document.getElementById('passStrengthBar');
  const lbl=document.getElementById('passStrengthLbl');
  if(!v){w.style.display='none';return;}
  w.style.display='block';
  let score=0;
  if(v.length>=8)score++;if(v.length>=12)score++;
  if(/[A-Z]/.test(v))score++;if(/[0-9]/.test(v))score++;if(/[^a-zA-Z0-9]/.test(v))score++;
  const levels=[['0%','var(--red)','Muy débil'],['20%','var(--red)','Débil'],['40%','var(--amber)','Regular'],['65%','var(--amber)','Buena'],['85%','#4a5568','Fuerte'],['100%','#4a5568','Muy fuerte']];
  const [w2,bg,txt]=levels[Math.min(score,5)];
  bar.style.width=w2;bar.style.background=bg;lbl.textContent=txt;lbl.style.color=bg;
}

async function initiateOTP(u){
  // Generar código 6 dígitos
  _otpCode=String(Math.floor(100000+Math.random()*900000));
  _otpExpiry=Date.now()+10*60*1000; // 10 minutos
  _otpAttempts=0;
  _otpResendCount=0;

  // Capturar sesión para incluir en email
  const session=await captureSession();

  // Mostrar paso 2
  document.getElementById('loginStep1').style.display='none';
  document.getElementById('loginStep2').style.display='block';
  document.getElementById('login2FAMsg').textContent=tr('codeSent')+' '+maskEmail(u.email);
  startOTPTimer();

  // Enviar email
  await sendOTPEmail(u,_otpCode,session);
}

async function resendOTP(){
  if(!_loginUser)return;
  if(_otpResendCount>=3){
    const errEl=document.getElementById('otpErr');
    if(errEl){errEl.textContent=tr('resendLimit');errEl.style.display='block';}
    setTimeout(backToStep1,3000);return;
  }
  _otpResendCount++;
  _otpCode=String(Math.floor(100000+Math.random()*900000));
  _otpExpiry=Date.now()+10*60*1000;
  _otpAttempts=0;
  [0,1,2,3,4,5].forEach(i=>{const el=document.getElementById('otp'+i);if(el)el.value='';});
  document.getElementById('otpErr').style.display='none';
  const session=await captureSession();
  await sendOTPEmail(_loginUser,_otpCode,session);
  startOTPTimer();
  toast('📧 Código reenviado','var(--text2)');
}

async function sendOTPEmail(u,code,session){
  const ejsKey=localStorage.getItem('cu1_ejsKey')||'';
  const ejsSvc=localStorage.getItem('cu1_ejsSvc')||'';
  const ejsTpl=localStorage.getItem('cu1_ejsTpl')||'';
  // SEGURIDAD: Nunca mostrar el código OTP en pantalla
  if(typeof emailjs==='undefined'){
    // emailjs no cargó — mostrar solo mensaje de error, NO el código
    const otpEl=document.getElementById('otpExpiry');
    if(otpEl)otpEl.innerHTML='<span style="color:#8b3a3a;font-weight:700">⚠ Error al enviar. Solicita un nuevo código.</span>';
    return;
  }
  try{emailjs.init({publicKey:ejsKey});}catch(e){}
  try{
    await emailjs.send(ejsSvc,ejsTpl,{
      to_email:u.email,
      to_name:u.nombre,
      otp_code:code,
      device:session.device||'–',
      browser:session.browser||'–',
      ip:session.ip||'–',
      location:session.country||'–',
      app_name:'BeUnifyT'
    },{publicKey:ejsKey});
    toast(tr('sendingCode').replace('…','')+' '+maskEmail(u.email),'#4a5568',3000);
  }catch(e){
    // Si falla el envío: mostrar error genérico, NUNCA el código
    const otpEl=document.getElementById('otpExpiry');
    if(otpEl){const sp=otpEl.querySelector('span[data-err]');if(sp)sp.remove();const err=document.createElement('span');err.dataset.err='1';err.style.cssText='color:#8b3a3a;font-weight:700';err.textContent=' ⚠ Error al enviar. Solicita un nuevo código.';otpEl.appendChild(err);}
    console.warn('[2FA send error - OTP NOT shown in UI]',e.text||e.message||e);
  }
}

let _otpTimerInterval=null;
function startOTPTimer(){
  clearInterval(_otpTimerInterval);
  const btn=document.getElementById('resendBtn');
  let resendCd=60;
  if(btn){btn.disabled=true;btn.textContent='Reenviar (60s)';}
  _otpTimerInterval=setInterval(()=>{
    const left=Math.max(0,Math.ceil((_otpExpiry-Date.now())/1000));
    const mins=Math.floor(left/60),secs=left%60;
    const el=document.getElementById('otpExpiry');
    if(el)el.textContent=left>0?`Expira en ${mins}:${String(secs).padStart(2,'0')}`:'⏰ Código expirado';
    resendCd--;
    if(btn&&resendCd>0){btn.textContent=`Reenviar (${resendCd}s)`;}
    else if(btn){btn.disabled=false;btn.textContent=tr('resendBtn');}
    if(left<=0)clearInterval(_otpTimerInterval);
  },1000);
}

function otpMove(idx,inp){
  inp.value=inp.value.replace(/[^0-9]/g,'').slice(-1);
  if(inp.value&&idx<5)document.getElementById('otp'+(idx+1))?.focus();
  // Auto-verify when all filled
  if([0,1,2,3,4,5].every(i=>(document.getElementById('otp'+i)?.value||'')!=''))verifyOTP();
}

function verifyOTP(){
  const entered=[0,1,2,3,4,5].map(i=>document.getElementById('otp'+i)?.value||'').join('');
  const errEl=document.getElementById('otpErr');
  if(entered.length!==6){errEl.textContent=tr('introduce6digits');errEl.style.display='block';return;}
  if(Date.now()>_otpExpiry){errEl.textContent='⏰ '+tr('codeExpired')+'. '+tr('resendBtn')+'.';errEl.style.display='block';return;}
  if(entered!==_otpCode){
    _otpAttempts++;
    if(_otpAttempts>=3){
      errEl.textContent='Demasiados intentos. Vuelve a empezar.';errEl.style.display='block';
      setTimeout(backToStep1,2000);return;
    }
    errEl.textContent=tr('codeWrong')+': '+(3-_otpAttempts);errEl.style.display='block';
    [0,1,2,3,4,5].forEach(i=>{const el=document.getElementById('otp'+i);if(el)el.value='';});
    document.getElementById('otp0')?.focus();return;
  }
  clearInterval(_otpTimerInterval);
  completeLogin(_loginUser);
}

function backToStep1(){
  clearInterval(_otpTimerInterval);
  document.getElementById('loginStep1').style.display='block';
  document.getElementById('loginStep2').style.display='none';
  document.getElementById('pinSection').style.display='none';
  _loginUser=null;_otpCode='';
}

async function captureSession(){
  const ua=navigator.userAgent;
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'–';
  const lang=navigator.language||'–';
  // Device detection
  const isMob=/Mobi|Android/i.test(ua);
  const isTab=/Tablet|iPad/i.test(ua);
  const deviceType=isTab?'Tablet':isMob?'Móvil':'Escritorio';
  // Browser
  let browser='Desconocido';
  if(/Edg\//.test(ua))browser='Edge';
  else if(/Chrome\//.test(ua))browser='Chrome';
  else if(/Firefox\//.test(ua))browser='Firefox';
  else if(/Safari\//.test(ua)&&!/Chrome/.test(ua))browser='Safari';
  // OS
  let os='–';
  if(/Windows NT/.test(ua))os='Windows';
  else if(/Mac OS X/.test(ua))os='macOS';
  else if(/Android/.test(ua))os='Android';
  else if(/iPhone|iPad/.test(ua))os='iOS';
  else if(/Linux/.test(ua))os='Linux';
  // IP (best effort)
  let ip='–',country='–';
  try{
    const r=await Promise.race([
      fetch('https://api.ipify.org?format=json').then(x=>x.json()),
      new Promise((_,rej)=>setTimeout(()=>rej('timeout'),3000))
    ]);
    ip=r.ip||'–';
  }catch(e){}
  return{ua,browser,os,deviceType,device:`${deviceType} · ${os}`,tz,lang,ip,country,ts:nowL()};
}

function maskEmail(email){
  if(!email||!email.includes('@'))return email;
  const [local,domain]=email.split('@');
  return local.slice(0,2)+'***@'+domain;
}

function _guessDeviceLabel(ua){
  const s=ua||'';
  if(/iPhone/.test(s))return '📱 iPhone';
  if(/iPad/.test(s))return '📱 iPad';
  if(/Android.*Mobile/.test(s))return '📱 Android';
  if(/Android/.test(s))return '📱 Tablet Android';
  if(/Mac/.test(s))return '💻 Mac';
  if(/Windows/.test(s))return '💻 Windows';
  if(/Linux/.test(s))return '🖥 Linux';
  return '❓ Desconocido';
}
async function completeLogin(u){
  // Capture session metadata
  const session=await captureSession();
  // Device fingerprint: hash of userAgent + screen + timezone
  const _fp=[navigator.userAgent,screen.width+'x'+screen.height,Intl.DateTimeFormat().resolvedOptions().timeZone].join('|');
  const _fpHash=_fp.split('').reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0).toString(36);
  session._fp=_fpHash;
  // Check if this device is known for this user
  const _knownKey='cu1_kd_'+(u.id||'');
  let _known=[];try{_known=JSON.parse(localStorage.getItem(_knownKey)||'[]');}catch(e){}
  const _isKnown=_known.includes(_fpHash);
  // Register/update in DB.devices
  if(!DB.devices)DB.devices=[];
  // Safety: if Firebase hasn't loaded devices yet, skip block check
  const _devIdx=DB.devices.findIndex(d=>d.fp===_fpHash);
  const _devLabel=_guessDeviceLabel(navigator.userAgent);
  if(_devIdx>=0){
    // Update last access
    DB.devices[_devIdx].lastAccess=nowL();
    DB.devices[_devIdx].lastUser=u.nombre;
    DB.devices[_devIdx].lastUserId=u.id;
    // Check if blocked
    if(DB.devices[_devIdx].status==='blocked'&&u.rol!=='superadmin'){
      logSessionEvent(u,'blocked','Dispositivo bloqueado: '+DB.devices[_devIdx].name,session);
      document.getElementById('loginSyncLbl').textContent='';
      showLogin();
      const _bm=document.getElementById('pinErr');if(_bm){_bm.textContent='🚫 Dispositivo bloqueado. Contacta con el administrador.';_bm.style.display='block';}
      return;
    }
  } else {
    // New device — check if SA requires approval
    const _requireApproval=DB._devRequireApproval===true;
    const _newStatus=_requireApproval?'blocked':'new';
    DB.devices.push({id:uid(),fp:_fpHash,name:_devLabel,status:_newStatus,firstAccess:nowL(),lastAccess:nowL(),lastUser:u.nombre,lastUserId:u.id,ua:navigator.userAgent,screen:screen.width+'x'+screen.height});
    session._newDevice=true;
    if(!DB._deviceAlerts)DB._deviceAlerts=[];
    DB._deviceAlerts.unshift({ts:nowL(),user:u.nombre,userId:u.id,fp:_fpHash,ua:navigator.userAgent,screen:screen.width+'x'+screen.height,tz:Intl.DateTimeFormat().resolvedOptions().timeZone});
    if(DB._deviceAlerts.length>50)DB._deviceAlerts=DB._deviceAlerts.slice(0,50);
    // If approval required, block immediately
    if(_requireApproval&&u.rol!=='superadmin'){
      saveDB();
      logSessionEvent(u,'blocked','Dispositivo nuevo pendiente de aprobación SA',session);
      showLogin();
      const _bm=document.getElementById('pinErr');
      if(_bm){_bm.textContent='⚠️ '+tr('newDevicePending');_bm.style.display='block';}
      return;
    }
  }
  if(!_isKnown){
    _known.push(_fpHash);if(_known.length>10)_known=_known.slice(-10);
    try{localStorage.setItem(_knownKey,JSON.stringify(_known));}catch(e){}
  }
  logSessionEvent(u,'login_ok',_devIdx>=0?'Login exitoso':'⚠️ DISPOSITIVO NUEVO — primer acceso desde este dispositivo',session);
  // Forzar cambio de contraseña en primer login
  if(u.mustChangePassword){
    _loginUser=u;
    showForcedPasswordChange(u);
    return;
  }
  loginSuccess(u);
}

function showForcedPasswordChange(u){
  document.getElementById('loginWrap').style.display='flex';
  document.getElementById('loginStep1').style.display='none';
  document.getElementById('loginStep2').style.display='none';
  document.getElementById('pinSection').style.display='none';
  // Inyectar pantalla de cambio forzado
  const card=document.querySelector('#loginWrap .login-card');
  const div=document.createElement('div');
  div.id='forcePassSection';
  div.innerHTML=`
    <div style="text-align:center;margin-bottom:16px">
      <div style="font-size:28px">🔐</div>
      <div style="font-weight:800;font-size:15px;margin-top:6px">${tr('changePass')}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">${tr('firstRunSub')}</div>
    </div>
    <div class="fg" style="margin-bottom:8px">
      <span class="flbl">Nueva contraseña <span class="freq">*</span></span>
      <input id="fpNewPass" type="password" data-i18n-ph="phMinPass" placeholder="Mínimo 8 caracteres" oninput="checkPassStrength(this.value)">
    </div>
    <div id="passStrengthWrap2" style="margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:4px">
        <div style="flex:1;height:4px;border-radius:2px;background:var(--bg4);overflow:hidden">
          <div id="passStrengthBar2" style="height:100%;border-radius:2px;transition:width .3s,background .3s;width:0%"></div>
        </div>
        <span id="passStrengthLbl2" style="font-size:10px;font-weight:700;min-width:40px"></span>
      </div>
    </div>
    <div class="fg" style="margin-bottom:14px">
      <span class="flbl">Confirmar contraseña <span class="freq">*</span></span>
      <input id="fpNewPass2" type="password" data-i18n-ph="phRepeatPass" placeholder="Repetir contraseña">
    </div>
    <div id="fpErr" style="display:none;color:var(--red);font-size:12px;font-weight:700;margin-bottom:8px;padding:6px 10px;background:var(--rll);border-radius:var(--r)"></div>
    <button class="btn btn-p" style="width:100%;padding:10px;font-size:14px" onclick="doForcedPassChange()">✓ Guardar y continuar</button>`;
  // Ajuste del indicador de fuerza para este campo
  div.querySelector('#fpNewPass').addEventListener('input',function(){
    const bar=document.getElementById('passStrengthBar2');
    const lbl=document.getElementById('passStrengthLbl2');
    let score=0;const v=this.value;
    if(v.length>=8)score++;if(v.length>=12)score++;
    if(/[A-Z]/.test(v))score++;if(/[0-9]/.test(v))score++;if(/[^a-zA-Z0-9]/.test(v))score++;
    const levels=[['0%','var(--red)','Muy débil'],['20%','var(--red)','Débil'],['40%','var(--amber)','Regular'],['65%','var(--amber)','Buena'],['85%','#4a5568','Fuerte'],['100%','#4a5568','Muy fuerte']];
    const[w,bg,txt]=levels[Math.min(score,5)];
    if(bar){bar.style.width=w;bar.style.background=bg;}
    if(lbl){lbl.textContent=txt;lbl.style.color=bg;}
  });
  card.appendChild(div);
}

async function doForcedPassChange(){
  const pass=document.getElementById('fpNewPass')?.value||'';
  const pass2=document.getElementById('fpNewPass2')?.value||'';
  const errEl=document.getElementById('fpErr');
  errEl.style.display='none';
  if(pass.length<8){errEl.textContent=tr('minChars8');errEl.style.display='block';return;}
  if(pass!==pass2){errEl.textContent=tr('passNoMatch');errEl.style.display='block';return;}
  const{hash,salt}=await hashPassword(pass,null);
  const u=_loginUser;
  u.passwordHash=hash;u.passwordSalt=salt;u.mustChangePassword=false;
  DB.usuarios=DB.usuarios.map(x=>x.id===u.id?u:x);
  saveDB();
  const sec=document.getElementById('forcePassSection');
  if(sec)sec.remove();
  loginSuccess(u);
  toast('✅ Contraseña actualizada','var(--text2)');
}

function logSessionEvent(u,action,detail,session){
  if(!DB.auditLog)DB.auditLog=[];
  const entry={
    id:uid(),ts:nowL(),user:u?.nombre||'?',userId:u?.id||'?',
    action,entity:'sesion',detail,
    session:session||null
  };
  DB.auditLog.unshift(entry);
  if(DB.auditLog.length>500)DB.auditLog=DB.auditLog.slice(0,500);
  saveDB();
}

// Compat
let pinVal='',pinUid='';
function selectUser(id){pinUid=id;pinVal='';updatePinDots();document.getElementById('pinErr').style.display='none';const u=DB.usuarios.find(x=>x.id===id);if(!u)return;const _dLoginLang=window._step0LangChosen?CUR_LANG:(u.lang||CUR_LANG||'es');
  if(window._step0LangChosen && CUR_LANG && CUR_LANG!==u.lang){
    u.lang=CUR_LANG;
    DB.usuarios=DB.usuarios.map(x=>x.id===u.id?{...x,lang:CUR_LANG}:x);
    saveDB();
  }
  window._step0LangChosen=false;
  setLang(_dLoginLang);applyLang();document.getElementById('pinUserName').textContent=u.nombre;document.getElementById('loginList').style.display='none';document.getElementById('pinSection').style.display='block';setTimeout(()=>document.getElementById('pinInp').focus(),100);}
function backToList(){document.getElementById('loginList').style.display='block';document.getElementById('pinSection').style.display='none';pinVal='';updatePinDots();}
function updatePinDots(){for(let i=0;i<6;i++){const d=document.getElementById('pd'+i);if(d)d.className='pdot'+(i<pinVal.length?' f':'');}}
function numPress(n){if(n==='del'){pinVal=pinVal.slice(0,-1);updatePinDots();document.getElementById('pinErr').style.display='none';}else if(n==='ok')tryPin();else if(pinVal.length<6){pinVal+=n;updatePinDots();if(pinVal.length===6)setTimeout(tryPin,150);}}
function syncPinInp(){const v=(document.getElementById('pinInp').value||'').replace(/\D/g,'').slice(0,6);pinVal=v;updatePinDots();if(v.length===6)setTimeout(tryPin,150);}
function tryPin(){const u=DB.usuarios.find(x=>x.id===pinUid);if(u&&pinVal===u.pin)loginSuccess(u);else{document.getElementById('pinErr').style.display='block';pinVal='';updatePinDots();}}
function loginSuccess(u){
  CU=u;
  // Leer el tab guardado ANTES de setLang para que no renderice 'dash'
  const _savedTabEarly=localStorage.getItem(SK+'_tab');
  if(_savedTabEarly)curTab=_savedTabEarly;
  var _ll=window._step0LangChosen?CUR_LANG:(u.lang||CUR_LANG||'es');
  if(window._step0LangChosen&&CUR_LANG&&CUR_LANG!==u.lang){
    u.lang=CUR_LANG;
    DB.usuarios=DB.usuarios.map(function(x){return x.id===u.id?Object.assign({},x,{lang:CUR_LANG}):x;});
    saveDB();
  }
  window._step0LangChosen=false;
  saveSession();setLang(_ll);
  // ── v6: rol empresa → portal ──
  if(u.rol==='empresa'){
    document.getElementById('loginWrap').style.display='none';
    var pw=document.getElementById('portalWrap');if(pw)pw.style.display='flex';
    // Wait for load listener to register _launchPortal
    var _tryLaunch=function(tries){
      if(typeof _launchPortal==='function'){_launchPortal(u);}
      else if(tries>0){setTimeout(function(){_tryLaunch(tries-1);},100);}
    };
    _tryLaunch(20);
    return;
  }
  document.getElementById('loginWrap').style.display='none';
  document.getElementById('appHdr').style.display='flex';
  document.getElementById('mainTabs').style.display='flex';
  document.getElementById('appMain').style.display='block';
  const badge=u.rol==='superadmin'?` <span class="badge-sa">⭐SA</span>`:u.rol==='supervisor'?` <span class="badge-sup">🔑</span>`:'';
  document.getElementById('hdrUser').innerHTML=esc(u.nombre)+badge;
  const defT={superadmin:['dash','ingresos','ingresos2','flota','conductores','agenda','analytics','vehiculos','auditoria','papelera','recintos','eventos','mensajes','usuarios','impresion','empresas'],supervisor:['dash','ingresos','ingresos2','flota','conductores','agenda','analytics','vehiculos','auditoria','papelera','recintos','eventos','usuarios','impresion'],controlador_rampa:['ingresos','ingresos2'],editor:['ingresos','ingresos2','conductores','agenda','impresion'],visor:['ingresos','ingresos2','agenda']};
  const allowed=u.tabs||defT[u.rol]||['dash','ingresos'];
  document.querySelectorAll('#mainTabs .btn-tab').forEach(b=>b.style.display=allowed.includes(b.dataset.tab)?'':'none');
  logAudit('login','usuario','Login: '+u.nombre);setTimeout(applyTabOrder,50);
  // SA: show new device alert if any
  if(isSA()&&DB._deviceAlerts&&DB._deviceAlerts.length){
    var _readTs=[];try{var _rt=localStorage.getItem((SK||'cu1')+'_devAlertRead');if(_rt)_readTs=JSON.parse(_rt);}catch(e){}
    DB._deviceAlerts.forEach(function(a){if(_readTs.indexOf(a.ts)>=0)a._saRead=true;});
    var _unread=DB._deviceAlerts.filter(function(a){return !a._saRead;});
    if(_unread.length){
      setTimeout(()=>{
        const _msg=_unread.map(a=>`• ${a.user} — ${a.ts.slice(0,16)} — ${(a.ua||'').slice(0,60)}`).join('\n');
        const _d=document.createElement('div');
        _d.style.cssText='position:fixed;top:60px;right:16px;z-index:9999;background:#fff;border:2px solid #8b3a3a;border-radius:10px;padding:14px 18px;max-width:380px;box-shadow:0 8px 24px rgba(0,0,0,.2)';
        _d.id='mDevAlert';
        _d.innerHTML='<div style="font-size:13px;font-weight:800;color:#8b3a3a;margin-bottom:8px">⚠️ '+_unread.length+' acceso(s) desde dispositivo nuevo</div><pre style="font-size:10px;color:#374151;white-space:pre-wrap;margin-bottom:10px">'+_msg+'</pre><div style="display:flex;gap:8px"><button onclick="_closeDevAlert()" style="flex:1;padding:6px;background:#8b3a3a;color:#fff;border:none;border-radius:20px;font-weight:700;cursor:pointer">✓ Visto</button><button onclick="_closeDevAlert();goTab(&quot;auditoria&quot;)" style="flex:1;padding:6px;background:#4a5568;border:1px solid #d1d5db;border-radius:20px;cursor:pointer">'+tr('verArchivos')+'</button></div>';
        document.body.appendChild(_d);
      },1500);
    }
  }
  const _saveBtn=document.getElementById('btnSaveDay');if(_saveBtn)_saveBtn.style.display=(isSA()||hasPerm('canSaveDay'))?'':'none';
  _lastMsgCount=DB.mensajesRampa.filter(m=>!m.leido?.includes(SID)&&!m.pausado&&(!m.expiraTs||Date.now()<m.expiraTs)).length;
  applyLang();
  // Restore autofill preference
  try{const _afPref=localStorage.getItem((SK||'cu1')+'_af'+(CU?.id||''));if(_afPref!==null)_autoFillOn=_afPref==='1';}catch(e){}
  try{const _paPref=localStorage.getItem((SK||'cu1')+'_pa'+(CU?.id||''));if(_paPref!==null)_posAutoOn=_paPref==='1';}catch(e){}
  // ⚡ OFF — Posición auto desactivada permanentemente: ignorar preferencia guardada
  _posAutoOn=false;
  const _savedTab=localStorage.getItem(SK+'_tab');
  const _restoreTab=_savedTab&&allowed.includes(_savedTab)?_savedTab:(allowed.includes('ingresos')?'ingresos':allowed[0]||'dash');
  goTab(_restoreTab,document.querySelector('#mainTabs .btn-tab[data-tab="'+_restoreTab+'"]'));
  renderHdr();
}
function doLogout(){if(CU)logSessionEvent(CU,'logout','Cierre de sesión');CU=null;saveSession();try{localStorage.removeItem(SK+'_tab');}catch(e){};if(window._portalLiveInterval)clearInterval(window._portalLiveInterval);var pw=document.getElementById('portalWrap');if(pw)pw.style.display='none';var rw=document.getElementById('regEmpWrap');if(rw)rw.style.display='none';var elw=document.getElementById('empLoginWrap');if(elw)elw.style.display='none';['loginWrap'].forEach(id=>document.getElementById(id).style.display='flex');['appHdr','mainTabs','appMain'].forEach(id=>document.getElementById(id).style.display='none');showLogin();}

// ═══ HEADER ═══
function renderHdr(){
  const now=new Date(),today=now.toISOString().slice(0,10);
  const _nowTs=Date.now();
  const msgs=DB.mensajesRampa.filter(m=>!m.leido?.includes(SID)&&!m.pausado&&(!m.expiraTs||_nowTs<m.expiraTs)).length;
  const agH=DB.agenda.filter(a=>a.fecha===today&&a.estado==='PENDIENTE').length;
  const ev=getTabEvent(curTab);
  const enRec=DB.ingresos.filter(i=>!i.salida).length;
  const hoy=DB.ingresos.filter(i=>i.entrada?.startsWith(today)).length+(DB.ingresos2||[]).filter(i=>i.entrada?.startsWith(today)).length;
  const esp=DB.listaNegra.length;
  const evCount=DB.activeEventId?1:0;
  const activeEvNames=DB.activeEventId?[DB.eventos.find(e=>e.id===DB.activeEventId)].filter(Boolean):[];
  const isUserFavEv=ev&&getUserWorkEventId()===ev.id&&ev.id!==DB.activeEventId;
  const w=document.getElementById('hdrCnts');if(!w)return;
  w.innerHTML=`
    <div style="display:flex;align-items:center;gap:4px">
      ${ev?`<span class="ev-pill" style="font-size:12px;cursor:pointer;margin-left:52px" onclick="goTab('eventos')" title="${isUserFavEv?'Mi evento favorito':'Evento activo global'}">${ev.ico||'📋'} ${ev.nombre}${isUserFavEv?' <span style="font-size:10px">⭐</span>':''}</span>`:'<span style="font-size:11px;color:var(--text3);margin-left:52px">'+tr('sinEvento')+'</span>'}
    </div>
    <div style="display:flex;gap:6px;align-items:center" id="hdrStats">
      ${curTab==='recintos'?`<button class="btn btn-sm" onclick="openRecintoModal()" style="background:#4a5568;color:#f7f7f7;border:none;border-radius:20px;font-weight:700"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>${tr('newVenue')}</button>`:''}
    </div>
    <div style="display:flex;gap:4px;margin-left:auto">
      ${msgs?`<div class="hdr-cnt" style="border-color:var(--red);background:var(--rll)"><div class="hdr-cv" style="color:var(--red)">${msgs}</div><div class="hdr-cl">MSG</div></div>`:''}
      ${agH?`<div class="hdr-cnt" style="border-color:#c7d2fe;background:#eef2ff"><div class="hdr-cv" style="color:#4f46e5">${agH}</div><div class="hdr-cl">AGENDA</div></div>`:''}
    </div>`;

}


// ═══ ROUTING ═══

function _saveSubTab(tab,sub){try{localStorage.setItem((SK||'cu1')+'_subtab_'+tab+'_'+(CU?.id||''),sub);}catch(e){}}
function _loadSubTab(tab,def){try{return localStorage.getItem((SK||'cu1')+'_subtab_'+tab+'_'+(CU?.id||''))||def;}catch(e){return def;}}
function goTab(tab,btn){curTab=tab;try{localStorage.setItem(SK+'_tab',tab);}catch(e){};document.querySelectorAll('#mainTabs .btn-tab').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');else{const b=document.querySelector('#mainTabs [data-tab="'+tab+'"]');if(b)b.classList.add('active');}document.querySelectorAll('#appMain .app-main > div').forEach(d=>d.style.display='none');const t=document.getElementById('tab-'+tab);if(t)t.style.display='block';renderHdr();(function(){var _map={dash:renderDash,ingresos:renderIngresos,ingresos2:renderIngresos2,flota:renderFlota,conductores:renderConductores,agenda:renderAgenda,analytics:renderAnalytics,vehiculos:renderVehiculos,auditoria:renderAuditoria,papelera:renderPapelera,impresion:renderImpresion,recintos:renderRecintos,eventos:renderEventosTab,mensajes:renderMensajesTab,usuarios:function(){renderUsuarios();setTimeout(function(){if(window._OCR&&typeof window._OCR.renderStats==='function')window._OCR.renderStats();},200);},empresas:function(){if(typeof renderEmpresasTab==='function')renderEmpresasTab();}};(_map[tab]||function(){})();setTimeout(_autoInitDrag,200);})();}
function renderTab(t){goTab(t);}

// ═══ DASHBOARD ═══
let _dashEvFilter=null;
function renderDash(){
  var now=new Date(),today=now.toISOString().slice(0,10);
  var allEvs=DB.activeEventId?[DB.eventos.find(function(e){return e.id===DB.activeEventId;})].filter(Boolean):[];
  if(_dashEvFilter===null&&allEvs.length)_dashEvFilter=(allEvs[0]&&allEvs[0].id)||null;
  var selEv=_dashEvFilter?DB.eventos.find(function(e){return e.id===_dashEvFilter;}):null;
  var allIngs=DB.ingresos.concat(DB.ingresos2||[]);
  var ings=selEv?allIngs.filter(function(i){return i.eventoId===selEv.id;}):allIngs;
  var rIngs=selEv?DB.ingresos.filter(function(i){return i.eventoId===selEv.id;}):DB.ingresos;
  var iIngs=selEv?(DB.ingresos2||[]).filter(function(i){return i.eventoId===selEv.id;}):(DB.ingresos2||[]);
  // Last 7 days
  var last7=[];for(var _d=6;_d>=0;_d--){var _dt=new Date();_dt.setDate(_dt.getDate()-_d);last7.push(_dt.toISOString().slice(0,10));}
  var byDay=last7.map(function(d){return{d:d,nRef:rIngs.filter(function(i){return i.entrada&&i.entrada.indexOf(d)===0;}).length,nIng:iIngs.filter(function(i){return i.entrada&&i.entrada.indexOf(d)===0;}).length};});
  var maxDay=Math.max.apply(null,byDay.map(function(x){return x.nRef+x.nIng;}).concat([1]));
  // Hourly today
  var byHRef=[],byHIng=[];
  for(var _h=0;_h<24;_h++){
    byHRef.push(rIngs.filter(function(i){return i.entrada&&i.entrada.indexOf(today)===0&&parseInt((i.entrada||'').slice(11,13))===_h;}).length);
    byHIng.push(iIngs.filter(function(i){return i.entrada&&i.entrada.indexOf(today)===0&&parseInt((i.entrada||'').slice(11,13))===_h;}).length);
  }
  var maxHour=Math.max.apply(null,byHRef.concat(byHIng).concat([1]));
  var activeHrs=[];byHRef.forEach(function(n,h){if(n>0)activeHrs.push(h);});byHIng.forEach(function(n,h){if(n>0)activeHrs.push(h);});
  var minH=activeHrs.length?Math.max(0,Math.min.apply(null,activeHrs)-1):6;
  var maxH2=activeHrs.length?Math.min(23,Math.max.apply(null,activeHrs)+1):20;
  // Tracking
  var trkCounts={};ings.forEach(function(i){(i.tracking||[]).forEach(function(t){trkCounts[t.stepId]=(trkCounts[t.stepId]||0)+1;});});
  var trkTotal=Object.values(trkCounts).reduce(function(a,b){return a+b;},0);
  // Halls
  var hallC={};ings.forEach(function(i){var halls=i.halls||(i.hall?[i.hall]:[]);halls.filter(Boolean).forEach(function(h){hallC[h]=(hallC[h]||0)+1;});});
  var topH=Object.entries(hallC).sort(function(a,b){return b[1]-a[1];}).slice(0,6);
  var maxHall=topH.length?topH[0][1]:1;
  // Stats
  var enRec=ings.filter(function(i){return !i.salida;}).length;
  var hoy=ings.filter(function(i){return i.entrada&&i.entrada.indexOf(today)===0;}).length;
  var hoyRef=rIngs.filter(function(i){return i.entrada&&i.entrada.indexOf(today)===0;}).length;
  var hoyIng=iIngs.filter(function(i){return i.entrada&&i.entrada.indexOf(today)===0;}).length;
  var msgs=DB.mensajesRampa.filter(function(m){return !m.leido||m.leido.indexOf(SID)<0;}).length;
  var agHoy=DB.agenda.filter(function(a){return a.fecha===today&&(!selEv||a.eventoId===selEv.id);});
  var lastIngs=ings.slice().sort(function(a,b){return(b.entrada||'').localeCompare(a.entrada||'');}).slice(0,15);
  var descC={mano:0,maquinaria:0};ings.forEach(function(i){if(i.descargaTipo)descC[i.descargaTipo]=(descC[i.descargaTipo]||0)+1;});
  // Preregistros
  var totalPre=(DB.preregistros||[]).length;
  var evPre=selEv?(DB.preregistros||[]).filter(function(p){return p.eventoId===selEv.id||p.eventoNombre===selEv.nombre;}).length:totalPre;
  var evPreVehs=selEv?[].concat.apply([],[(DB.preregistros||[]).filter(function(p){return p.eventoId===selEv.id||p.eventoNombre===selEv.nombre;}).map(function(p){return p.matricula;})]).filter(function(v,i,a){return a.indexOf(v)===i;}).length:0;
  // Ref vs Ing
  var totalRef=rIngs.length,totalIng=iIngs.length,totalBoth=totalRef+totalIng;
  var pctRef=totalBoth?Math.round(totalRef/totalBoth*100):50;
  var pctIng=totalBoth?100-pctRef:50;
  // Event selector
  var evSelector='';
  if(allEvs.length>1){
    evSelector='<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px">';
    allEvs.forEach(function(e){evSelector+='<button class="btn btn-xs '+(_dashEvFilter===e.id?'btn-p':'btn-gh')+'" onclick="_dashEvFilter=\''+e.id+'\';renderDash()">'+(e.ico||'📋')+' '+esc(e.nombre)+'</button>';}

function toast(msg,bg='#1e293b',dur=3000){const w=document.getElementById('toastWrap');if(!w)return;const t=document.createElement('div');t.className='toast';t.textContent=msg;t.style.background=bg;w.appendChild(t);requestAnimationFrame(()=>requestAnimationFrame(()=>t.classList.add('show')));setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),300);},dur);}

function closeOv(id){const el=document.getElementById(id);if(el)el.classList.remove('open');}

function renderHdr(){
  const now=new Date(),today=now.toISOString().slice(0,10);
  const _nowTs=Date.now();
  const msgs=DB.mensajesRampa.filter(m=>!m.leido?.includes(SID)&&!m.pausado&&(!m.expiraTs||_nowTs<m.expiraTs)).length;
  const agH=DB.agenda.filter(a=>a.fecha===today&&a.estado==='PENDIENTE').length;
  const ev=getTabEvent(curTab);
  const enRec=DB.ingresos.filter(i=>!i.salida).length;
  const hoy=DB.ingresos.filter(i=>i.entrada?.startsWith(today)).length+(DB.ingresos2||[]).filter(i=>i.entrada?.startsWith(today)).length;
  const esp=DB.listaNegra.length;
  const evCount=DB.activeEventId?1:0;
  const activeEvNames=DB.activeEventId?[DB.eventos.find(e=>e.id===DB.activeEventId)].filter(Boolean):[];
  const isUserFavEv=ev&&getUserWorkEventId()===ev.id&&ev.id!==DB.activeEventId;
  const w=document.getElementById('hdrCnts');if(!w)return;
  w.innerHTML=`
    <div style="display:flex;align-items:center;gap:4px">
      ${ev?`<span class="ev-pill" style="font-size:12px;cursor:pointer;margin-left:52px" onclick="goTab('eventos')" title="${isUserFavEv?'Mi evento favorito':'Evento activo global'}">${ev.ico||'📋'} ${ev.nombre}${isUserFavEv?' <span style="font-size:10px">⭐</span>':''}</span>`:'<span style="font-size:11px;color:var(--text3);margin-left:52px">'+tr('sinEvento')+'</span>'}
    </div>
    <div style="display:flex;gap:6px;align-items:center" id="hdrStats">
      ${curTab==='recintos'?`<button class="btn btn-sm" onclick="openRecintoModal()" style="background:#4a5568;color:#f7f7f7;border:none;border-radius:20px;font-weight:700"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>${tr('newVenue')}</button>`:''}
    </div>
    <div style="display:flex;gap:4px;margin-left:auto">
      ${msgs?`<div class="hdr-cnt" style="border-color:var(--red);background:var(--rll)"><div class="hdr-cv" style="color:var(--red)">${msgs}</div><div class="hdr-cl">MSG</div></div>`:''}
      ${agH?`<div class="hdr-cnt" style="border-color:#c7d2fe;background:#eef2ff"><div class="hdr-cv" style="color:#4f46e5">${agH}</div><div class="hdr-cl">AGENDA</div></div>`:''}
    </div>`;

}

function _saveSubTab(tab,sub){try{localStorage.setItem((SK||'cu1')+'_subtab_'+tab+'_'+(CU?.id||''),sub);}catch(e){}}

function _loadSubTab(tab,def){try{return localStorage.getItem((SK||'cu1')+'_subtab_'+tab+'_'+(CU?.id||''))||def;}catch(e){return def;}}

function goTab(tab,btn){curTab=tab;try{localStorage.setItem(SK+'_tab',tab);}catch(e){};document.querySelectorAll('#mainTabs .btn-tab').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');else{const b=document.querySelector('#mainTabs [data-tab="'+tab+'"]');if(b)b.classList.add('active');}document.querySelectorAll('#appMain .app-main > div').forEach(d=>d.style.display='none');const t=document.getElementById('tab-'+tab);if(t)t.style.display='block';renderHdr();(function(){var _map={dash:renderDash,ingresos:renderIngresos,ingresos2:renderIngresos2,flota:renderFlota,conductores:renderConductores,agenda:renderAgenda,analytics:renderAnalytics,vehiculos:renderVehiculos,auditoria:renderAuditoria,papelera:renderPapelera,impresion:renderImpresion,recintos:renderRecintos,eventos:renderEventosTab,mensajes:renderMensajesTab,usuarios:function(){renderUsuarios();setTimeout(function(){if(window._OCR&&typeof window._OCR.renderStats==='function')window._OCR.renderStats();},200);},empresas:function(){if(typeof renderEmpresasTab==='function')renderEmpresasTab();}};(_map[tab]||function(){})();setTimeout(_autoInitDrag,200);})();}

function renderTab(t){goTab(t);}

function renameDevice(id){
  if(!isSA()){toast('Solo SuperAdmin','var(--red)');return;}
  const d=(DB.devices||[]).find(x=>x.id===id);if(!d)return;
  const name=prompt('Nombre del dispositivo:',d.name||'');
  if(!name||!name.trim())return;
  d.name=name.trim();saveDB();renderAuditoria();
  toast('✏️ Renombrado: '+d.name,'var(--text2)');
}

function setDeviceStatus(id,status){
  if(!isSA()){toast('Solo SuperAdmin','var(--red)');return;}
  const d=(DB.devices||[]).find(x=>x.id===id);if(!d)return;
  d.status=status;saveDB();renderAuditoria();
  const labels={trusted:'✅ Aprobado — dispositivo de confianza',blocked:'🚫 Dispositivo bloqueado',new:'⚠️ Marcado como nuevo'};
  toast(labels[status]||status,status==='blocked'?'var(--red)':'#4a5568');
}

function deleteDevice(id){
  if(!isSA()){toast('Solo SuperAdmin','var(--red)');return;}
  askDel('Eliminar dispositivo','El dispositivo podrá volver a entrar como nuevo.',()=>{
    DB.devices=(DB.devices||[]).filter(x=>x.id!==id);saveDB();renderAuditoria();
    toast('🗑 Dispositivo eliminado','var(--red)');
  });
}

function tabDragStart(e){
  _tabDragSrc=e.currentTarget;
  e.currentTarget.classList.add('tab-dragging');
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain',e.currentTarget.dataset.tab);
}

function tabDragOver(e){
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  if(e.currentTarget!==_tabDragSrc)e.currentTarget.classList.add('tab-drag-over');
}

function tabDragLeave(e){e.currentTarget.classList.remove('tab-drag-over');}

function tabDrop(e){
  e.preventDefault();
  const bar=document.getElementById('mainTabs');
  if(!_tabDragSrc||!bar)return;
  const tgt=e.currentTarget;
  tgt.classList.remove('tab-drag-over');
  if(tgt===_tabDragSrc)return;
  // Reorder DOM
  const tabs=[...bar.querySelectorAll('.btn-tab')];
  const fromIdx=tabs.indexOf(_tabDragSrc);
  const toIdx=tabs.indexOf(tgt);
  if(fromIdx<0||toIdx<0)return;
  if(fromIdx<toIdx)bar.insertBefore(_tabDragSrc,tgt.nextSibling);
  else bar.insertBefore(_tabDragSrc,tgt);
  // Persist order
  DB.tabOrder=[...bar.querySelectorAll('.btn-tab')].map(b=>b.dataset.tab);
  saveDB();
}

function tabDragEnd(e){
  e.currentTarget.classList.remove('tab-dragging');
  document.querySelectorAll('.btn-tab').forEach(b=>b.classList.remove('tab-drag-over'));
  _tabDragSrc=null;
}

function applyTabOrder(){
  const order=DB.tabOrder||[];
  if(!order.length)return;
  const bar=document.getElementById('mainTabs');if(!bar)return;
  // Add any new tabs not in saved order (insert after recintos or at end)
  const allTabs=[...bar.querySelectorAll('.btn-tab')].map(b=>b.dataset.tab);
  allTabs.forEach(t=>{if(!order.includes(t)){const ri=order.indexOf('recintos');order.splice(ri>=0?ri:order.length,0,t);}});
  order.forEach(tabId=>{
    const btn=bar.querySelector(`.btn-tab[data-tab="${tabId}"]`);
    if(btn)bar.appendChild(btn);
  });
}

function colDragStart(e){
  _colDragSrc=e.currentTarget;
  _colDragTab=e.currentTarget.dataset.tab;
  const ths=[..._colDragSrc.closest('thead').querySelectorAll('th')];
  _colDragIdx=ths.indexOf(_colDragSrc);
  e.currentTarget.classList.add('col-dragging');
  e.dataTransfer.effectAllowed='move';
}

function colDragOver(e){
  e.preventDefault();
  if(e.currentTarget!==_colDragSrc)e.currentTarget.classList.add('col-drag-over');
}

function colDragLeave(e){e.currentTarget.classList.remove('col-drag-over');}

function colDrop(e){
  e.preventDefault();
  const tgt=e.currentTarget;
  tgt.classList.remove('col-drag-over');
  if(!_colDragSrc||tgt===_colDragSrc)return;
  const thead=_colDragSrc.closest('thead');
  const table=_colDragSrc.closest('table');
  const ths=[...thead.querySelectorAll('th')];
  const fromIdx=ths.indexOf(_colDragSrc);
  const toIdx=ths.indexOf(tgt);
  if(fromIdx<0||toIdx<0)return;
  // Reorder TH row
  if(fromIdx<toIdx)thead.querySelector('tr').insertBefore(_colDragSrc,tgt.nextSibling);
  else thead.querySelector('tr').insertBefore(_colDragSrc,tgt);
  // Reorder every TD row to match
  table.querySelectorAll('tbody tr').forEach(row=>{
    const cells=[...row.querySelectorAll('td')];
    if(cells.length<=Math.max(fromIdx,toIdx))return;
    if(fromIdx<toIdx)row.insertBefore(cells[fromIdx],cells[toIdx].nextSibling);
    else row.insertBefore(cells[fromIdx],cells[toIdx]);
  });
  // Persist column order for this tab
  if(_colDragTab){
    if(!DB.colOrders)DB.colOrders={};
    const newThs=[...thead.querySelectorAll('th')];
    DB.colOrders[_colDragTab]=newThs.map(th=>th.dataset.col||th.textContent.trim());
    saveDB();
  }
}

function colDragEnd(e){
  e.currentTarget.classList.remove('col-dragging');
  document.querySelectorAll('.dtbl th').forEach(th=>th.classList.remove('col-drag-over'));
  _colDragSrc=null;_colDragTab=null;_colDragIdx=-1;
}

function debounceSearch(key,fn,delay=250){
  clearTimeout(_searchTimers[key]);
  _searchTimers[key]=setTimeout(()=>{
    const ae=document.activeElement;const aid=ae?.id;const cp=ae?.selectionStart;
    fn();
    if(aid){const el=document.getElementById(aid);if(el){el.focus();if(typeof cp==='number'&&el.setSelectionRange)try{el.setSelectionRange(cp,cp)}catch(e){}}}
  },delay);
}

function getSort(tab){
  if(DB.tabSorts[tab])return DB.tabSorts[tab];
  // Default sorts per tab
  const defaults={ingresos:{col:'pos',dir:'desc'},ingresos2:{col:'pos',dir:'desc'},agenda:{col:'hora',dir:'asc'},flota:{col:'posicion',dir:'asc'},vehiculos:{col:'ultimoIngreso',dir:'desc'},conductores:{col:'nombre',dir:'asc'}};
  return defaults[tab]||{col:'',dir:'asc'};
}

function setSort(tab,col){
  const cur=DB.tabSorts[tab]||{col:'',dir:'asc'};
  const dir=(cur.col===col&&cur.dir==='asc')?'desc':'asc';
  DB.tabSorts[tab]={col,dir};saveDB();renderTab(tab);
}

function sortArr(arr,col,dir){
  if(!col)return arr;
  return [...arr].sort((a,b)=>{
    let va=a[col],vb=b[col];
    // Nulls/empty always last
    const aN=va===undefined||va===null||va==='';
    const bN=vb===undefined||vb===null||vb==='';
    if(aN&&bN)return 0;
    if(aN)return 1;
    if(bN)return -1;
    // Solo comparar como número si el valor es un número puro (sin guiones, dos puntos, espacios)
    const isNum = v => !isNaN(parseFloat(v)) && isFinite(v) && !/[-: ]/.test(String(v).trim());
    const n=isNum(va)?parseFloat(va):NaN, m=isNum(vb)?parseFloat(vb):NaN;
    const cmp=(!isNaN(n)&&!isNaN(m))?(n-m):String(va).localeCompare(String(vb),'es',{numeric:false,sensitivity:'base'});
    return dir==='desc'?-cmp:cmp;
  });
}

function thSort(tab,col,label){
  const s=getSort(tab);
  const isActive=s.col===col||((!s.col||s.col==='')&&col==='pos'&&(tab==='ingresos'||tab==='ingresos2'));
  const ico=isActive?(s.dir==='asc'?'↑':'↓'):'⇅';
  const activeStyle=isActive?'color:var(--text2);font-weight:600;':'';
  return`<th draggable="true" data-tab="${tab}" data-col="${col}"
    onclick="setSort('${tab}','${col}')"
    style="cursor:grab;user-select:none;white-space:nowrap;${activeStyle}"
    ondragstart="colDragStart(event)"
    ondragover="colDragOver(event)"
    ondragleave="colDragLeave(event)"
    ondrop="colDrop(event)"
    ondragend="colDragEnd(event)"
    >${label} <span style="opacity:.5;font-size:10px">${ico}</span></th>`;
}

function openGlobalSearch(){document.getElementById('globalSearchInput').value='';document.getElementById('globalSearchResults').innerHTML='<div class="empty"><div class="es">'+tr('writeToSearch')+'</div></div>';document.getElementById('mGlobalSearch').classList.add('open');setTimeout(()=>document.getElementById('globalSearchInput').focus(),100);}

function doGlobalSearch(q){
  const el=document.getElementById('globalSearchResults');if(!el)return;
  if(!q||q.length<2){el.innerHTML='<div class="empty"><div class="es">'+tr('minChars2')+'</div></div>';return;}
  const ql=q.toLowerCase();let html='';
  // Ingresos
  const ings=DB.ingresos.filter(i=>`${i.pos||''} ${i.matricula} ${i.nombre||''} ${i.apellido||''} ${i.empresa||''} ${i.llamador||''} ${i.referencia||''} ${(i.halls||[i.hall||'']).join(' ')} ${i.stand||''} ${i.remolque||''} ${i.montador||''} ${i.expositor||''} ${i.comentario||''}`.toLowerCase().includes(ql));
  if(ings.length)html+=`<div style="font-size:10px;font-weight:900;text-transform:uppercase;color:var(--text3);margin-bottom:6px;border-bottom:1.5px solid var(--border);padding-bottom:4px">Ingresos (${ings.length})</div>`+ings.slice(0,10).map(i=>`<div style="padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--r);margin-bottom:4px;cursor:pointer;display:flex;align-items:center;gap:10px" onclick="closeOv('mGlobalSearch');iF._sub='lista';iF.q='${i.matricula}';goTab('ingresos');"><span class="mchip">${i.matricula}</span><span style="font-size:12px">${i.nombre||''} ${i.apellido||''}</span><span style="font-size:11px;color:var(--text3)">${i.empresa||''}</span>${(i.halls||[i.hall||'']).filter(Boolean).map(h=>`<span class="hbadge">${h}</span>`).join(' ')}<span style="margin-left:auto;font-size:10px;color:var(--text3)">${fmt(i.entrada,'d')}</span><span class="pill ${!i.salida?'pill-g':'pill-r'}" style="font-size:10px">${!i.salida?'✓':'↩'}</span></div>`).join('');
  // Agenda
  const ags=DB.agenda.filter(a=>`${a.matricula} ${a.conductor||''} ${a.empresa||''} ${a.referencia||''} ${a.montador||''} ${a.expositor||''} ${a.hall||''}`.toLowerCase().includes(ql));
  if(ags.length)html+=`<div style="font-size:10px;font-weight:900;text-transform:uppercase;color:var(--text3);margin:12px 0 6px;border-bottom:1.5px solid var(--border);padding-bottom:4px">📅 Agenda (${ags.length})</div>`+ags.slice(0,8).map(a=>`<div style="padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--r);margin-bottom:4px;cursor:pointer;display:flex;align-items:center;gap:10px" onclick="closeOv('mGlobalSearch');agF.q='${a.matricula}';agF.fecha='';goTab('agenda');"><span class="mchip">${a.matricula}</span><span style="font-size:12px">${a.conductor||''}</span><span style="font-size:11px;color:var(--text3)">${a.empresa||''}</span><span style="margin-left:auto;font-size:10px">${a.fecha} ${a.hora||''}</span>${sAgBadge(a.estado||'PENDIENTE')}</div>`).join('');
  // Conductores
  const conds=DB.conductores.filter(c=>`${c.nombre} ${c.apellido} ${c.empresa||''} ${c.matricula||''}`.toLowerCase().includes(ql));
  if(conds.length)html+=`<div style="font-size:10px;font-weight:900;text-transform:uppercase;color:var(--text3);margin:12px 0 6px;border-bottom:1.5px solid var(--border);padding-bottom:4px">👤 ${tr('drivers')} (${conds.length})</div>`+conds.slice(0,6).map(c=>`<div style="padding:8px 10px;border:1.5px solid var(--border);border-radius:var(--r);margin-bottom:4px;cursor:pointer;display:flex;align-items:center;gap:10px" onclick="closeOv('mGlobalSearch');cF.q='${(c.nombre+' '+c.apellido).replace(/'/g,'')}';goTab('conductores');"><span style="font-weight:700">${c.nombre} ${c.apellido}</span><span style="font-size:11px;color:var(--text3)">${c.empresa||''}</span>${c.matricula?`<span class="mchip-sm">${c.matricula}</span>`:''}</div>`).join('');
  el.innerHTML=html||`<div class="empty"><div class="ei">🔍</div><div class="et">Sin resultados para "${q}"</div></div>`;
}

function resetAllData(){
  if(!isSA()){toast('🔒 Solo SuperAdmin puede ejecutar este reset','var(--red)',4000);return;}
  if(!confirm('⚠️ ¿BORRAR TODOS LOS DATOS?\n\nSe eliminará: ingresos, conductores, eventos, recintos, agenda, historial, etc.\n\nEsta acción NO se puede deshacer.'))return;
  const frase=prompt('🔴 ÚLTIMA CONFIRMACIÓN\n\nEscribe exactamente: BORRAR TODO\n\npara confirmar el reset total:');
  if((frase||'').trim()!=='BORRAR TODO'){toast('Frase incorrecta — operación cancelada','var(--amber)',4000);return;}
  const keepKeys=['cu1_fbUrl','cu1_fbKey','cu1_apiKey','cu1_customTelCodes'];
  const saved={};keepKeys.forEach(k=>{const v=localStorage.getItem(k);if(v)saved[k]=v;});
  const _pc1={...DB.printCfg1};const _pc2={...DB.printCfg2};const _usuarios=[...DB.usuarios];
  DB.movimientos=[];DB.ingresos=[];DB.ingresos2=[];DB.listaNegra=[];DB.enEspera=[];DB.mensajesRampa=[];DB.conductores=[];DB.auditLog=[];DB.eventos=[];DB.agenda=[];DB.recintos=[];DB.vehiculos=[];DB.papelera=[];DB.exportLog=[];DB.editHistory=[];DB.printPhrases={};DB.printPhrases2={};DB.tabSorts={};DB.colOrders={};DB.activeEventId=null;DB.printCfg1=_pc1;DB.printCfg2=_pc2;DB.usuarios=_usuarios;
  localStorage.removeItem(SK);
  keepKeys.forEach(k=>{if(saved[k])localStorage.setItem(k,saved[k]);});
  logAudit('reset_total','sistema','Reset total ejecutado por: '+(CU?.nombre||'?'));
  saveDB();
  toast('🗑 Todos los datos eliminados','var(--red)');
  renderTab(curTab);renderHdr();
}

function _initSubtabDrag(barEl){
  if(!barEl||barEl._dragInit)return;
  barEl._dragInit=true;
  let dragSrc=null;
  function _getBarKey(){
    const tabEl=barEl.closest('[id^="tab-"]');
    const uid=window.CU?.id||'x';
    return tabEl?'_btnOrder_'+tabEl.id+'_'+uid:null;
  }
  // Solo los botones con data-draggable son arrastrables
  barEl.querySelectorAll('[data-draggable]').forEach(function(btn){
    btn.setAttribute('draggable','true');
    btn.addEventListener('dragstart',function(e){
      dragSrc=btn;btn.style.opacity='.4';
      e.dataTransfer.effectAllowed='move';
    });
    btn.addEventListener('dragend',function(){btn.style.opacity='';dragSrc=null;});
    btn.addEventListener('dragover',function(e){e.preventDefault();});
    btn.addEventListener('drop',function(e){
      e.preventDefault();
      if(!dragSrc||dragSrc===btn)return;
      // Respetar zonas: solo mover dentro de la misma zona
      const srcZone=dragSrc.dataset.zone||'';
      const tgtZone=btn.dataset.zone||'';
      if(srcZone&&tgtZone&&srcZone!==tgtZone)return;
      // Mover dentro del mismo contenedor padre (el span[data-zone])
      const srcParent=dragSrc.parentElement;
      const tgtParent=btn.parentElement;
      if(srcParent!==tgtParent)return;
      const btnsInZone=Array.from(srcParent.querySelectorAll('[data-draggable]'));
      const si=btnsInZone.indexOf(dragSrc),di=btnsInZone.indexOf(btn);
      if(si<di)btn.after(dragSrc);else btn.before(dragSrc);
      // Guardar orden por zona
      const key=_getBarKey();
      if(key){
        const allZoned=Array.from(barEl.querySelectorAll('[data-draggable]'));
        const order=allZoned.map(function(b){return (b.dataset.zone||'')+'|'+b.textContent.trim();});
        try{localStorage.setItem(key,JSON.stringify(order));}catch(er){}
      }
    });
  });
}

function _applySubtabOrders(){
  document.querySelectorAll('.subtab-bar').forEach(function(bar){
    const tabEl=bar.closest('[id^="tab-"]');
    if(!tabEl)return;
    const uid=window.CU?.id||'x';
    const key='_btnOrder_'+tabEl.id+'_'+uid;
    let saved;
    try{saved=JSON.parse(localStorage.getItem(key));}catch(e){}
    if(!saved||!saved.length)return;
    // Agrupar por zona
    const zoneOrders={};
    saved.forEach(function(entry){
      const sep=entry.indexOf('|');
      const zone=sep>=0?entry.slice(0,sep):'';
      const label=sep>=0?entry.slice(sep+1):entry;
      if(!zoneOrders[zone])zoneOrders[zone]=[];
      zoneOrders[zone].push(label);
    });
    // Reordenar dentro de cada span[data-zone]
    bar.querySelectorAll('[data-zone]').forEach(function(zoneEl){
      const zone=zoneEl.dataset.zone;
      const order=zoneOrders[zone];
      if(!order)return;
      const btns=Array.from(zoneEl.querySelectorAll('[data-draggable]'));
      order.forEach(function(label){
        const btn=btns.find(function(b){return b.textContent.trim()===label;});
        if(btn)zoneEl.appendChild(btn);
      });
    });
  });
}

function _autoInitDrag(){
  document.querySelectorAll('.subtab-bar').forEach(function(bar){_initSubtabDrag(bar);});
  _applySubtabOrders();
}

function _initBarDrag(barEl){
  if(!barEl||barEl._dragInited)return;
  barEl._dragInited=true;
  let dragSrc=null,dragNode=null;
  function getSortable(el){return el.closest('[data-draggable]');}
  barEl.querySelectorAll('[data-draggable]').forEach(function(item){
    item.setAttribute('draggable','true');
    item.addEventListener('dragstart',function(e){
      dragSrc=item;item.style.opacity='.4';
      e.dataTransfer.effectAllowed='move';
    });
    item.addEventListener('dragend',function(){
      item.style.opacity='';
      barEl.querySelectorAll('[data-draggable]').forEach(function(i){i.classList.remove('drag-over');});
    });
    item.addEventListener('dragover',function(e){
      e.preventDefault();if(dragSrc&&dragSrc!==item){
        barEl.querySelectorAll('[data-draggable]').forEach(function(i){i.classList.remove('drag-over');});
        item.classList.add('drag-over');
      }
    });
    item.addEventListener('drop',function(e){
      e.preventDefault();item.classList.remove('drag-over');
      if(dragSrc&&dragSrc!==item){
        const allItems=Array.from(barEl.querySelectorAll('[data-draggable]'));
        const si=allItems.indexOf(dragSrc),di=allItems.indexOf(item);
        if(si<di)item.after(dragSrc); else item.before(dragSrc);
      }
    });
  });
}

function _initAllDrags(){
  document.querySelectorAll('[data-drag-bar]').forEach(function(bar){_initBarDrag(bar);});
}


function _closeDevAlert(){
  DB._deviceAlerts.forEach(function(a){a._saRead=true;});
  try{
    var _readTs=(DB._deviceAlerts||[]).map(function(a){return a.ts;}).filter(Boolean);
    localStorage.setItem((SK||'cu1')+'_devAlertRead',JSON.stringify(_readTs));
  }catch(e){}
  saveDB();
  var el=document.getElementById('mDevAlert');
  if(el)el.remove();
}

