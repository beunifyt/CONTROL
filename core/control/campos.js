/* core/campos — 21 funciones */

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

function fieldCfg(k,col){
  const ck=_getCamposKey(col||(_ingSource==='ingresos2'?'ingresos2':'ingresos'));
  return DB.camposCfg?.[ck]?.current?.[k]??'show';
}

function fieldVisible(k){const s=fieldCfg(k);return s==='show'||s==='required';}

function fieldRequired(k){return fieldCfg(k)==='required';}

function _getColVisKey(tab){return (SK||'cu1')+'_colvis_'+tab+'_'+(CU?.id||'anon');}

function _getColVis(tab){
  try{
    const raw=localStorage.getItem(_getColVisKey(tab));
    if(raw)return JSON.parse(raw);
  }catch(e){}
  // Default: todas visibles
  const def={};(_COL_DEFS[tab]||[]).forEach(c=>{def[c.k]=true;});
  return def;
}

function _setColVis(tab,vis){
  try{localStorage.setItem(_getColVisKey(tab),JSON.stringify(vis));}catch(e){}
}

function _isColVisible(tab,k){
  const def=_COL_DEFS[tab]||[];
  const col=def.find(c=>c.k===k);
  if(col?.always)return true;
  const vis=_getColVis(tab);
  return vis[k]!==false;
}

function renderColVisSub(tab){
  const defs=_COL_DEFS[tab]||[];
  const vis=_getColVis(tab);
  const sKey=(SK||'cu1')+'_colcfg_'+tab+'_'+(CU?.id||'anon');
  let saved=[];
  try{const r=localStorage.getItem(sKey);if(r)saved=JSON.parse(r);}catch(e){}

  const cfgRow=saved.length?'<div style="margin-bottom:10px"><div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);margin-bottom:5px">'+tr('configGuardadas')+'</div><div style="display:flex;flex-direction:column;gap:4px">'+saved.map(function(cfg,i){return '<div style="display:flex;align-items:center;gap:5px;padding:6px 9px;border-radius:6px;background:var(--bg3);border:0.5px solid var(--border)"><div style="font-size:11px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">⚙ '+cfg.name+'</div><button class="btn btn-xs btn-gh" onclick="_loadColCfg(\''+tab+'\','+i+')">'+tr('cargar')+'</button><button class="btn btn-xs btn-danger" onclick="_delColCfg(\''+tab+'\','+i+')">✕</button></div>';}).join('')+'</div></div>':'';

  return '<div style="padding:6px 0">'
    +'<div style="display:flex;gap:6px;margin-bottom:8px;align-items:center">'
    +'<input id="_colCfgName_'+tab+'" data-i18n-ph="phConfigName" placeholder="'+tr('phConfigName')+'" style="flex:1;font-size:12px;padding:5px 9px;border:0.5px solid var(--border2);border-radius:6px;background:var(--bg2)">'
    +'<button class="btn btn-p" onclick="_saveColCfg(\''+tab+'\');" style="padding:5px 12px;font-size:12px">💾 Guardar</button>'
    +'</div>'
    +cfgRow
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
    +defs.map(function(col){
      const on=col.always||vis[col.k]!==false;
      const oc=col.always?'':'onclick="_toggleColVis(\''+tab+'\',\''+col.k+'\',this)"';
      return '<div style="display:flex;align-items:center;gap:4px;padding:5px 8px;border-radius:6px;border:0.5px solid var(--border);background:var(--bg3)">'
        +'<span style="flex:1;font-size:11px;font-weight:500">'+col.l+(col.always?' <span style="font-size:9px;color:var(--text3)">(siempre)</span>':'')+'</span>'
        +'<span '+oc+' style="cursor:'+(col.always?'default':'pointer')+';padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;border:0.5px solid;'+(on?'border-color:#4a5568;background:#4a5568;color:#f7f7f7':'border-color:var(--border);background:var(--bg2);color:var(--text4)')+'">'+( on?'✓ Visible':'✕ Oculta')+'</span>'
        +'</div>';
    }).join('')
    +'</div></div>';
}

function _toggleColVis(tab,k,el){
  const vis=_getColVis(tab);
  vis[k]=!vis[k];
  _setColVis(tab,vis);
  const on=vis[k]!==false;
  el.style.borderColor=on?'#4a5568':'var(--border)';
  el.style.background=on?'#4a5568':'var(--bg2)';
  el.style.color=on?'#fff':'var(--text4)';
  el.textContent=on?'✓ Visible':'✕ Oculta';
}

function _saveColCfg(tab){
  const inp=document.getElementById('_colCfgName_'+tab);
  const name=(inp?.value||'').trim();
  if(!name){toast('Escribe un nombre','var(--amber)');return;}
  const vis=_getColVis(tab);
  let saved=[];
  const sKey=(SK||'cu1')+'_colcfg_'+tab+'_'+(CU?.id||'anon');
  try{const r=localStorage.getItem(sKey);if(r)saved=JSON.parse(r);}catch(e){}
  const ei=saved.findIndex(x=>x.name===name);
  if(ei>=0)saved[ei]={name,vis};else saved.push({name,vis});
  try{localStorage.setItem(sKey,JSON.stringify(saved));}catch(e){}
  toast('💾 Configuración guardada: '+name,'var(--text2)');
}

function _loadColCfg(tab,idx){
  const sKey=(SK||'cu1')+'_colcfg_'+tab+'_'+(CU?.id||'anon');
  let saved=[];
  try{const r=localStorage.getItem(sKey);if(r)saved=JSON.parse(r);}catch(e){}
  if(!saved[idx])return;
  _setColVis(tab,saved[idx].vis);
  toast('📋 Columnas cargadas: '+saved[idx].name,'#4a5568');
  // Re-render manteniendo subtab columnas para que el usuario vea los cambios
  const renders={ingresos:function(){iF._sub='columnas';renderIngresos();},ingresos2:function(){iF._sub2='columnas';renderIngresos2();},agenda:function(){window._agSubTab='columnas';renderAgenda();},flota:function(){window._flotaSub='columnas';renderFlota();},conductores:function(){window._condSub='columnas';renderConductores();}};
  const fn=renders[tab];if(fn)fn();
}

function _renameColCfg(tab,idx){
  const sKey=(SK||'cu1')+'_colcfg_'+tab+'_'+(CU?.id||'anon');
  let saved=[];
  try{const r=localStorage.getItem(sKey);if(r)saved=JSON.parse(r);}catch(e){}
  if(!saved[idx])return;
  // Load config into current vis and put name in input
  _setColVis(tab,saved[idx].vis);
  const inp=document.getElementById('_colCfgName_'+tab);
  if(inp){inp.value=saved[idx].name;inp.focus();}
  toast('✏️ Cargado para editar — modifica y pulsa Guardar','#4a5568');
  const renders={ingresos:function(){iF._sub='columnas';renderIngresos();},ingresos2:function(){iF._sub2='columnas';renderIngresos2();},agenda:function(){window._agSubTab='columnas';renderAgenda();},flota:function(){window._flotaSub='columnas';renderFlota();},conductores:function(){window._condSub='columnas';renderConductores();}};
  const fn=renders[tab];if(fn)fn();
}

function _delColCfg(tab,idx){
  const sKey=(SK||'cu1')+'_colcfg_'+tab+'_'+(CU?.id||'anon');
  let saved=[];
  try{const r=localStorage.getItem(sKey);if(r)saved=JSON.parse(r);}catch(e){}
  const name=saved[idx]?.name||'';
  askDel('Eliminar configuración','<b>'+name+'</b>',()=>{
    saved.splice(idx,1);
    try{localStorage.setItem(sKey,JSON.stringify(saved));}catch(e){}
    toast('🗑 Config eliminada: '+name,'var(--red)');
    const renders={ingresos:function(){iF._sub='columnas';renderIngresos();},ingresos2:function(){iF._sub2='columnas';renderIngresos2();},agenda:function(){window._agSubTab='columnas';renderAgenda();},flota:function(){window._flotaSub='columnas';renderFlota();},conductores:function(){window._condSub='columnas';renderConductores();}};
    const fn=renders[tab];if(fn)fn();
  });
}

