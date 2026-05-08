/* papelera — 18 funciones */

function importPapelera(inp){if(!isSA()){toast('Solo SuperAdmin puede importar papelera','var(--red)');return;};
  const file=inp.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{try{
    const wb=XLSX.read(e.target.result,{type:'binary'});
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});
    if(!DB.papelera)DB.papelera=[];let added=0;
    rows.forEach(row=>{
      const id=String(row['ID']||uid()).trim();
      if(DB.papelera.find(p=>p.id===id))return;
      DB.papelera.push({id,origen:String(row[tr('origen')]||'ingresos2').trim(),ts:String(row['Fecha']||nowL()).trim(),borradoPor:String(row['BorradoPor']||'Import').trim(),item:{matricula:String(row['Matricula']||'').trim(),empresa:String(row['Empresa']||'').trim()}});
      added++;
    });
    saveDB();renderPapelera();toast('✅ '+added+' elementos importados a papelera');
  }catch(err){toast('❌ Error: '+err.message,'var(--red)');}inp.value='';};
  reader.readAsBinaryString(file);
}

function renderPapelera(){
  let items=[...DB.papelera||[]];
  const q=(DB._papQ||'').toLowerCase();
  if(DB._papFiltro)items=items.filter(p=>p.origen===DB._papFiltro);
  if(q)items=items.filter(p=>JSON.stringify(p.item).toLowerCase().includes(q));
  items=items.sort((a,b)=>(b.ts||'').localeCompare(a.ts||''));
  const origenCounts={};(DB.papelera||[]).forEach(p=>origenCounts[p.origen]=(origenCounts[p.origen]||0)+1);
  document.getElementById('tab-papelera').innerHTML=`
    

    <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--border);padding-bottom:4px">
      <div class="sbox" style="flex:1;min-width:130px"><span class="sico">🔍</span><input type="search" placeholder="${tr('searchHistory')}" value="${DB._papQ||''}" oninput="DB._papQ=this.value;debounceSearch('papelera',renderPapelera)"></div>
      ${DB._papQ?`<span class="pill pill-r" style="flex-shrink:0" onclick="DB._papQ='';renderPapelera()">✕</span>`:''}
      <span class="pill" style="border:2px solid ${!DB._papFiltro?'#4a5568':'var(--border)'};background:${!DB._papFiltro?'#4a5568':'var(--bg2)'};color:${!DB._papFiltro?'#fff':'var(--text3)'}" onclick="DB._papFiltro='';renderPapelera()">Todos (${(DB.papelera||[]).length})</span>
      ${Object.entries(origenCounts).map(([k,v])=>`<span class="pill" style="border:2px solid ${DB._papFiltro===k?'#4a5568':'var(--border)'};background:${DB._papFiltro===k?'#4a5568':'var(--bg2)'};color:${DB._papFiltro===k?'#fff':'var(--text3)'}" onclick="DB._papFiltro='${k}';renderPapelera()">${{ingresos:'🔖 Referencia',ingresos2:'🚛 Ingresos',agenda:'📅 Agenda',conductores:'👤 Conductores',movimientos:'📦 Embalaje'}[k]||k} (${v})</span>`).join('')}
      <span style="flex:1"></span>
      <button class="btn btn-gh btn-sm" onclick="exportPapelera()" title="Excel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>
      ${isSA()?`<label class="btn btn-s btn-sm" title="Importar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><input type="file" accept=".xlsx,.xls" style="display:none" onchange="importPapelera(this)"></label>`:''}
      ${isSA()?`<button class="btn btn-gh btn-sm" onclick="dlTemplatePapelera()">📋 Plantilla</button>`:''}
      <button class="btn btn-s btn-sm" onclick="restaurarSeleccion()">↺ Restaurar sel.</button>
      <button class="btn btn-danger btn-sm" style="flex-shrink:0" onclick="purgeSelectedPapelera()">🗑 Eliminar sel.</button>
      ${isSA()?`<button class="btn btn-danger btn-sm" style="flex-shrink:0" onclick="vaciarPapelera()" title="Vaciar todo" style="color:var(--red)"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><line x1="12" y1="3" x2="12" y2="6"/><line x1="8" y1="3" x2="16" y2="3"/></svg></button>`:''}
    </div>
    ${items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr>
      <th><input type="checkbox" onchange="if(this.checked){document.querySelectorAll('.papelera-chk').forEach(c=>c.checked=true);}else{document.querySelectorAll('.papelera-chk').forEach(c=>c.checked=false);}"></th>
      <th>${tr('origen')}</th><th>${tr('contenido')}</th><th>${tr('borrPor')}</th><th>${tr('fechaBorrado')}</th><th>${tr('acciones')}</th>
    </tr></thead><tbody>
      ${items.map(p=>{
        const item=p.item||{};
        const label=item.matricula||item.nombre||item.referencia||item.titulo||p.id.slice(0,8);
        const sub=item.empresa||item.apellido||item.mensaje||'';
        return`<tr>
          <td><input type="checkbox" class="papelera-chk" data-pid="${p.id}"></td>
          <td><span style="background:var(--bg3);padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700">${{ingresos:'🔖 Referencia',ingresos2:'🚛 Ingresos',agenda:'📅 Agenda',conductores:'👤 Conductores',movimientos:'📦 Embalaje',listaNegra:tr('tabSpecial'),mensajesRampa:'📢 Mensajes'}[p.origen]||p.origen}</span></td>
          <td><div style="font-weight:700;font-size:12px">${label}</div><div style="font-size:10px;color:var(--text3)">${sub}</div></td>
          <td style="font-size:11px">${p.borradoPor||'–'}</td>
          <td style="font-size:11px;white-space:nowrap">${fmt(p.ts)}</td>
          <td><div style="display:flex;gap:2px">
            <button class="btn btn-success btn-xs" onclick="restoreFromPapelera('${p.id}')">↺ Restaurar</button>
            <button class="btn btn-danger btn-xs" onclick="purgeFromPapelera('${p.id}')">🗑</button>
          </div></td>
        </tr>`;}).join('')}
    </tbody></table></div>`:`<div class="empty"><div class="ei">🗑</div><div class="et"><span id="lbl_emptyTrash">${tr('emptyTrash')}</span></div></div>`}`;
}

function _askDelGuarded(id,fn){
  if(_delDebounce[id])return;
  _delDebounce[id]=true;
  setTimeout(()=>{delete _delDebounce[id];},1500);
  fn();
}

function askDelIng(id){const i=DB.ingresos.find(x=>x.id===id);if(!i)return;_askDelGuarded('ing_'+id,()=>askDel('Eliminar referencia','<b>'+i.matricula+'</b>',()=>{softDelete('ingresos',id,renderIngresos);}));}

function askDelIng2(id){const i=(DB.ingresos2||[]).find(x=>x.id===id);if(!i)return;_askDelGuarded('ing2_'+id,()=>askDel('Eliminar ingreso','<b>'+i.matricula+'</b>',()=>{softDelete('ingresos2',id,renderIngresos2);}));}

function askDelMov(id){const m=DB.movimientos.find(x=>x.id===id);if(!m)return;_askDelGuarded('mov_'+id,()=>askDel('Eliminar movimiento','<b>'+m.matricula+'</b>',()=>{softDelete('movimientos',id,renderFlota);}));}

function askDelEE(id){_askDelGuarded('ee_'+id,()=>askDel('Eliminar de espera','',()=>{DB.enEspera=DB.enEspera.filter(x=>x.id!==id);_markDeleteOp('enEspera');saveDB();renderIngresos();}));}

function askDelLN(id){const ln=DB.listaNegra.find(x=>x.id===id);if(!ln)return;_askDelGuarded('ln_'+id,()=>askDel('Eliminar de especial','<b>'+ln.matricula+'</b>',()=>{DB.listaNegra=DB.listaNegra.filter(x=>x.id!==id);_markDeleteOp('listaNegra');saveDB();renderIngresos();}));}

function restoreFromPapelera(pid){
  const entry=DB.papelera.find(x=>x.id===pid);if(!entry)return;
  if(!DB[entry.origen])DB[entry.origen]=[];
  DB[entry.origen].push(entry.item);
  DB.papelera=DB.papelera.filter(x=>x.id!==pid);
  saveDB();renderPapelera();
  toast('↺ Restaurado en '+entry.origen,'var(--text2)');
}

function purgeFromPapelera(pid){if(!canDel()&&!isSA()){toast('Sin permiso para eliminar','var(--red)');return;};
  DB.papelera=DB.papelera.filter(x=>x.id!==pid);saveDB();renderPapelera();toast('🗑 Eliminado permanentemente','var(--red)');
}

function purgeSelectedPapelera(){if(!canDel()&&!isSA()){toast('Sin permiso para eliminar','var(--red)');return;};
  const sel=[...document.querySelectorAll('.papelera-chk:checked')].map(el=>el.dataset.pid);
  if(!sel.length){toast('Selecciona al menos uno','var(--amber)');return;}
  DB.papelera=DB.papelera.filter(x=>!sel.includes(x.id));saveDB();renderPapelera();toast('🗑 '+sel.length+' eliminados');
}

function askDel(title,detail,fn,btnLabel,btnColor){
  document.getElementById('delTitle').textContent=title;
  document.getElementById('delDetail').innerHTML=detail||'';
  pendingDelFn=fn;
  const btn=document.getElementById('btnDoDelete');
  if(btn){
    btn.disabled=false;
    btn.textContent=btnLabel||tr('yesDelete');
    btn.style.background=btnColor||'var(--red)';
  }
  document.getElementById('mDel').classList.add('open');
}

function doDelete(){
  const btn=document.getElementById('btnDoDelete');
  if(btn){if(btn.disabled)return;btn.disabled=true;}
  if(pendingDelFn){
    try{pendingDelFn();}catch(e){console.error('doDelete error',e);toast('Error al eliminar','var(--red)');}
    pendingDelFn=null;
  }
  // Reset button style for next use
  if(btn){btn.textContent=tr('yesDelete');btn.style.background='var(--red)';}
  closeOv('mDel');
}

function vaciarTab(tab){
  if(!isSA()){toast('Solo SuperAdmin','var(--red)');return;}
  var names={ingresos:'Referencia',ingresos2:'Ingresos',movimientos:'Embalaje',conductores:'Conductores',agenda:'Agenda',vehiculos:'Historial',mensajesRampa:'Mensajes rampa',listaNegra:tr('tabSpecial'),enEspera:'En espera'};
  var name=names[tab]||tab;
  askDel('💥 Vaciar «'+name+'»','<b>Se eliminarán TODOS los registros.</b><br><span style="font-size:11px;color:var(--text3)">Se descargará backup Excel antes de borrar.</span>',function(){
    var data=DB[tab]||[];
    if(data.length){var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(data),name.slice(0,31));XLSX.writeFile(wb,'backup_'+tab+'_'+new Date().toISOString().slice(0,10)+'.xlsx');}
    DB[tab]=[];
    _markDeleteOp(tab);
    saveLocalDB();
    if(fbRef){clearTimeout(writeDebounce);fbRef.set({_session:SID,_ts:Date.now(),movimientos:DB.movimientos,ingresos:DB.ingresos,listaNegra:DB.listaNegra,enEspera:DB.enEspera,mensajesRampa:DB.mensajesRampa,conductores:DB.conductores,usuarios:DB.usuarios,auditLog:(DB.auditLog||[]).slice(0,200),eventos:DB.eventos||[],agenda:DB.agenda||[],activeEventId:DB.activeEventId||null,activeEventIds:DB.activeEventIds||[],defaultEventId:DB.defaultEventId||null,printFieldOrder:DB.printFieldOrder||PRINT_DEF,hiddenPrintFields:DB.hiddenPrintFields||[],editHistory:[],ingresos2:DB.ingresos2||[],vehiculos:DB.vehiculos||[],papelera:(DB.papelera||[]).slice(0,200),exportLog:(DB.exportLog||[]).slice(0,500),printPhrases:DB.printPhrases||{},printPhrases2:DB.printPhrases2||{},tabSorts:DB.tabSorts||{},tabOrder:DB.tabOrder||[],colOrders:DB.colOrders||{},printCfg1:DB.printCfg1||{},printCfg2:DB.printCfg2||{},printCfgAg:DB.printCfgAg||{},printCfgCond:DB.printCfgCond||{},printCfgFlota:DB.printCfgFlota||{},recintos:DB.recintos||[],printTemplates:DB.printTemplates||[],printCfgModes:DB.printCfgModes||{},camposCfg:DB.camposCfg||{},eventoHistorial:(DB.eventoHistorial||[]).slice(0,50),eventosPapelera:(DB.eventosPapelera||[]).slice(0,50),_deviceAlerts:(DB._deviceAlerts||[]).slice(0,50),devices:(DB.devices||[]),_devRequireApproval:DB._devRequireApproval||false}).then(()=>{setSyncStatus('ok');toast('💥 Vaciado y sincronizado','var(--red)');}).catch(()=>setSyncStatus('error'));}
    if(typeof logAudit==='function')logAudit('vaciar_tab',tab,'SA');
    if(window._anlState){window._anlState.evFilter=null;window._anlState._ts=Date.now();}
    var renders={ingresos:renderIngresos,ingresos2:renderIngresos2,movimientos:renderFlota,conductores:renderConductores,agenda:renderAgenda,vehiculos:renderVehiculos,mensajesRampa:renderMensajesTab,listaNegra:renderIngresos,enEspera:renderIngresos};
    (renders[tab]||renderDash)();renderHdr();
    toast('💥 "'+name+'" vaciado','var(--amber)');
  },'💥 Sí, vaciar todo','var(--red)');
}

function vaciarHistorial(col){if(!isSA()){toast('Solo SuperAdmin','var(--red)');return;}if(!confirm('⚠️ Vaciar historial.\nSolo SuperAdmin.\nBackup Excel antes.'))return;var h=DB.editHistory||[];if(h.length){var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(h),'Historial');XLSX.writeFile(wb,'backup_historial_'+new Date().toISOString().slice(0,10)+'.xlsx');}DB.editHistory=[];saveDB();if(col==='ingresos2'){iF._sub2='historial';renderIngresos2();}else{iF._sub='historial';renderIngresos();}toast('💥 Historial vaciado','var(--amber)');}

function exportPapelera(){if(!isSA()&&!canExport()){toast('Sin permiso para exportar','var(--red)');return;};var items=DB.papelera||[];if(!items.length){toast(tr('emptyTrash'),'var(--amber)');return;}var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(items.map(function(p){return{Origen:p.origen,Matricula:(p.item&&p.item.matricula)||'',Nombre:(p.item&&p.item.nombre)||'',Empresa:(p.item&&p.item.empresa)||'',BorradoPor:p.borradoPor||'',Fecha:p.ts||''};})),'Papelera');XLSX.writeFile(wb,'papelera_'+new Date().toISOString().slice(0,10)+'.xlsx');toast('📥 Exportado','#4a5568');}

function restaurarSeleccion(){var sel=[].slice.call(document.querySelectorAll('.papelera-chk:checked')).map(function(c){return c.dataset.pid;});if(!sel.length){toast('Selecciona elementos','var(--amber)');return;}sel.forEach(function(id){var e=DB.papelera.find(function(x){return x.id===id;});if(!e)return;if(!DB[e.origen])DB[e.origen]=[];DB[e.origen].push(e.item);DB.papelera=DB.papelera.filter(function(x){return x.id!==id;});});saveDB();renderPapelera();renderHdr();toast('↺ '+sel.length+' restaurados','var(--text2)');}

function vaciarPapelera(){if(!isSA()){toast('Solo SuperAdmin','var(--red)');return;}var bk=DB.papelera||[];if(!bk.length){toast('Papelera ya vacía','var(--amber)');return;}if(!confirm('Vaciar papelera ('+bk.length+' elementos).\nBackup Excel antes.'))return;var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(bk.map(function(p){return{Origen:p.origen,Matricula:(p.item&&p.item.matricula)||'',Fecha:p.ts||''};})),'Papelera_Backup');XLSX.writeFile(wb,'papelera_backup_'+new Date().toISOString().slice(0,10)+'.xlsx');DB.papelera=[];saveDB();renderPapelera();toast('🗑 Papelera vaciada','var(--amber)');}

