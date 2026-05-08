/* flota — 3 funciones */

function renderFlota(){
  const now=new Date();let items=[...DB.movimientos];
  const q=(fF.q||'').toLowerCase();if(q)items=items.filter(m=>`${m.matricula} ${m.nombre||''} ${m.empresa||''} ${m.hall||''} ${m.remolque||''} ${m.status||''}`.toLowerCase().includes(q));
  if(fF.status)items=items.filter(m=>m.status===fF.status);if(fF.hall)items=items.filter(m=>m.hall===fF.hall);
  const sf=getSort('flota');items=sf.col?sortArr(items,sf.col,sf.dir):items.sort((a,b)=>(a.posicion||999)-(b.posicion||999));
  if(!window._subRestored_flota){window._subRestored_flota=true;const _ls=_loadSubTab('flota','lista');if(_ls)window._flotaSub=_ls;}const _fSub=window._flotaSub||'lista';
  document.getElementById('tab-flota').innerHTML=`
    
    <div class="sg sg4" style="margin-bottom:4px">${['ALMACEN','SOT','FIRA','FINAL'].map(s=>`<div class="stat-box" style="border-top:3px solid ${SCFG[s]?.c||'var(--border)'}"><div class="stat-n" style="color:${SCFG[s]?.c||'var(--text)'}">${DB.movimientos.filter(m=>m.status===s).length}</div><div class="stat-l">${SCFG[s]?.i||''} ${s}</div></div>`).join('')}</div>
    <div class="subtab-bar" style="display:flex;align-items:center;gap:3px;padding:4px 0;flex-wrap:nowrap;min-height:34px;border-bottom:1px solid var(--border);margin-bottom:4px;overflow-x:auto;scrollbar-width:none">
      <span data-zone="L" style="display:inline-flex;gap:3px;flex-shrink:0">
      ${[['lista',tr('tabLista')],['historial',tr('tabEdiciones')]].map(([s,l])=>`<button data-draggable data-zone="L" class="btn btn-sm ${_fSub===s?'btn-p':'btn-gh'}" style="flex-shrink:0" onclick="window._flotaSub='${s}';_saveSubTab('flota','${s}');renderFlota()">${l}</button>`).join('')}
      </span>
      <span data-zone="M" style="display:inline-flex;gap:3px;flex-shrink:0">
      ${_fSub==='lista'&&canAdd()?`<button data-draggable data-zone="M" class="btn btn-sm btn-p" style="font-weight:700;flex-shrink:0" onclick="openMovModal()">${tr('btnNewMove')}</button>`:''}
      </span>
      <div style="width:1px;height:20px;background:var(--border);flex-shrink:0;margin:0 4px"></div>
      <span data-zone="R" style="display:inline-flex;gap:3px;align-items:center;flex-shrink:0">
      ${[['columnas',tr('tabColumnas')],...(canCampos()?[['campos',tr('camposDise')]]:[])].map(([s,l])=>`<button data-draggable data-zone="R" class="btn btn-sm ${_fSub===s?'btn-p':'btn-gh'}" style="flex-shrink:0" onclick="window._flotaSub='${s}';_saveSubTab('flota','${s}');renderFlota()">${l}</button>`).join('')}
      </span>
      <span style="flex:1"></span>
      <span data-zone="R" style="display:inline-flex;gap:3px;align-items:center;flex-shrink:0">
      ${_fSub==='lista'?`<button class="btn btn-s btn-sm" title="Importar" onclick="document.getElementById('xlsxFlota').click()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button><button class="btn btn-gh btn-sm" title="Plantilla" onclick="dlTemplateFlota()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`:''}
      ${_fSub==='lista'&&canExport()?`<button class="btn btn-gh btn-sm" title="Excel" onclick="exportFlota()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>`:''}
      </span>
    </div>
    ${_fSub==='lista'?`<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--border);padding-bottom:4px">
      <div class="sbox" style="flex:2;min-width:140px"><span class="sico">🔍</span><input type="search" placeholder="${tr('searchHistory')}" value="${fF.q||''}" oninput="fF.q=this.value;debounceSearch('flota',renderFlota)"></div>
      ${fF.q||fF.hall?`<span class="pill pill-r" style="flex-shrink:0" onclick="fF={q:'',status:'',hall:''};renderFlota()">✕</span>`:''}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px">
      <span class="pill" style="font-size:10px;font-weight:700;padding:3px 8px;border:1.5px solid ${!fF.hall?'#7dd3fc':'#c8cacc'};background:${!fF.hall?'#e0f2fe':'#e8eaed'};color:${!fF.hall?'#0369a1':'#1e40af'};cursor:pointer" onclick="fF.hall='';renderFlota()">${tr('all')}</span>
      ${getRecintoHalls().map(h=>`<span class="pill" style="font-size:10px;font-weight:700;padding:3px 8px;background:${fF.hall===h?'#4a5568':'#e8eaed'};color:${fF.hall===h?'#fff':'#1e40af'};border:1.5px solid ${fF.hall===h?'#4a5568':'#c8cacc'};cursor:pointer" onclick="fF.hall='${h}';renderFlota()">${h}</span>`).join('')}
    </div>`:''}
    ${_fSub==='campos'?renderCamposSubtab('flota'):_fSub==='columnas'?renderColVisSub('flota'):_fSub==='historial'?_ingHistorial('movimientos'):items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr>${thSort('flota','posicion','#')}${thSort('flota','matricula','Tractora')}${_isColVisible('flota','remolque')?'<th>'+tr('thTrailer')+'</th>':''}${_isColVisible('flota','nombre')?thSort('flota','nombre','Conductor'):''}${_isColVisible('flota','empresa')?thSort('flota','empresa','Empresa'):''}${_isColVisible('flota','hall')?'<th>'+tr('hall')+'</th>':''}${_isColVisible('flota','tipoCarga')?'<th>'+tr('carga')+'</th>':''}${thSort('flota','status','Estado')}${_isColVisible('flota','tacografoHora')?'<th>'+tr('lblTacho')+'</th>':''}<th>${tr('acciones')}</th></tr></thead><tbody>
      ${items.map(m=>{const sotOv=m.status==='SOT'&&m.tacografoHora&&new Date(addH(m.tacografoHora,9))<=now;return`<tr style="${sotOv?'background:var(--rll)':''}">
        <td style="font-weight:800">${m.posicion||'–'}</td><td><span class="mchip">${m.matricula}</span></td>
        ${_isColVisible('flota','remolque')?`<td>${m.remolque?`<span class="mchip-sm">${m.remolque}</span>`:'-'}</td>`:''}
        ${_isColVisible('flota','nombre')?`<td style="font-size:11px">${m.nombre||''} ${m.apellido||''}</td>`:''}
        ${_isColVisible('flota','empresa')?`<td style="font-size:11px">${m.empresa||'–'}</td>`:''}
        ${_isColVisible('flota','hall')?`<td>${hBadge(m.hall)}</td>`:''}
        ${_isColVisible('flota','tipoCarga')?`<td>${cBadge(m.tipoCarga)}</td>`:''}
        <td>${sBadge(m.status)}${sotOv?'<span style="color:var(--red);font-size:10px"> ⚠️</span>':''}</td>
        ${_isColVisible('flota','tacografoHora')?`<td style="font-size:10px;font-family:'JetBrains Mono',monospace">${m.tacografoHora?fmt(m.tacografoHora,'t'):'-'}</td>`:''}
        <td><div style="display:flex;gap:2px;flex-wrap:wrap">
          ${canStatus()?`<select style="padding:2px 4px;font-size:10px;border-radius:4px;border:1px solid var(--border);max-width:90px" onchange="cambiarEstMov('${m.id}',this.value)">${['ALMACEN','SOT','FIRA','FINAL'].map(s=>`<option value="${s}" ${m.status===s?'selected':''}>${SCFG[s]?.i||''} ${s}</option>`).join('')}</select>`:''}
          ${canEdit()?`<button class="btn btn-edit btn-xs" onclick="openMovModal(DB.movimientos.find(x=>x.id==='${m.id}'))">✏️</button>`:''}
          ${canDel()?`<button class="btn btn-danger btn-xs" onclick="askDelMov('${m.id}')">🗑</button>`:''}
        </div></td>
      </tr>`;}).join('')}
    </tbody></table></div>`:`<div class="empty"><div class="ei">🚛</div><div class="et">${tr('noMovements')}</div></div>`}`;}

function exportFlota(){if(!canExport()){toast('Sin permiso para exportar','var(--red)');return;};if(!DB.movimientos.length){toast('Sin datos','var(--red)');return;}const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(DB.movimientos.map(m=>({Pos:m.posicion||'',Estado:m.status,Tractora:m.matricula,Remolque:m.remolque||'',Nombre:m.nombre||'',Apellido:m.apellido||'',Empresa:m.empresa||'',Hall:m.hall||'',Carga:m.tipoCarga||''}))),'Flota');const fn2='flota_'+new Date().toISOString().slice(0,10)+'.xlsx';XLSX.writeFile(wb,fn2);logExport('Flota',fn2);toast('✅ Exportado');}

function importXlsxFlota(inp){if(!canImport()){toast('Sin permiso para importar','var(--red)');return;};var file=inp.files[0];if(!file)return;var r=new FileReader();r.onload=function(e){try{var wb=XLSX.read(e.target.result,{type:'binary'});var rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});var added=0;rows.forEach(function(row,idx){var allEmpty=Object.values(row).every(function(v){return String(v).trim()==='';});if(allEmpty)return;var mat=String(row['Matricula']||'').trim().toUpperCase();DB.movimientos.push({id:uid(),posicion:String(row['Posicion']||'').trim(),matricula:mat,remolque:String(row['Remolque']||'').trim().toUpperCase(),nombre:String(row['Nombre']||'').trim(),apellido:String(row['Apellido']||'').trim(),empresa:String(row['Empresa']||'').trim(),hall:String(row['Hall']||'').trim(),tipoCarga:String(row['TipoCarga']||'').trim(),status:String(row['Status']||'ALMACEN').trim().toUpperCase(),tacografoHora:String(row['Tacografo']||'').trim(),eventoNombre:String(row['Evento']||'').trim(),creadoPor:'Importación'});added++;});saveDB();renderFlota();renderHdr();toast('✅ '+added+' importados','var(--text2)');}catch(err){toast('❌ '+err.message,'var(--red)');}inp.value='';};r.readAsBinaryString(file);}

