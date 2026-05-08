/* ingresos2 — 5 funciones */

function renderIngresos2(){
  const today=new Date().toISOString().slice(0,10);
  let items=[...DB.ingresos2||[]];
  // Filter by user's work event (personal fav or global active)
  const _workEvId=getUserWorkEventId();
  if(_workEvId)items=items.filter(i=>!i.eventoId||i.eventoId===_workEvId);
  const q=(iF.q2||'').toLowerCase();
  if(q)items=items.filter(i=>`${i.pos||''} ${i.matricula} ${i.nombre||''} ${i.apellido||''} ${i.empresa||''} ${i.llamador||''} ${i.referencia||''} ${(i.halls||[i.hall||'']).join(' ')} ${i.stand||''} ${i.remolque||''} ${i.montador||''} ${i.expositor||''} ${i.comentario||''} ${i.telefono||''} ${i.email||''} ${i.pasaporte||''} ${i.eventoNombre||''} ${i.puertaHall||''} ${i.tipoCarga||''}`.toLowerCase().includes(q));
  if(iF.hall2)items=items.filter(i=>(i.halls||[i.hall||'']).includes(iF.hall2));
  if(iF.activos2)items=items.filter(i=>!i.salida);
  const s=getSort('ingresos2');items=sortArr(items,s.col||'pos',s.dir||'desc');
  const ev=getActiveEvent();
  if(!window._subRestored_ingresos2){window._subRestored_ingresos2=true;const _ls=_loadSubTab('ingresos2','lista');if(_ls)iF._sub2=_ls;}const sub2=iF._sub2||'lista';
  document.getElementById('tab-ingresos2').innerHTML=`
    <div class="subtab-bar" style="display:flex;align-items:center;gap:3px;padding:4px 0;flex-wrap:nowrap;min-height:34px;border-bottom:1px solid var(--border);margin-bottom:4px;overflow-x:auto;scrollbar-width:none">
      <span data-zone="L" style="display:inline-flex;gap:3px;flex-shrink:0">
      ${[['lista',tr('tabLista')],['listanegra',tr('tabSpecial')],['historial',tr('tabEdiciones')]].map(([s,l])=>`<button data-draggable data-zone="L" class="btn btn-sm ${sub2===s?'btn-p':'btn-gh'}" onclick="iF['_sub2']='${s}';_saveSubTab('ingresos2','${s}');renderIngresos2()" style="flex-shrink:0">${l}</button>`).join('')}
      </span>
      <span data-zone="M" style="display:inline-flex;gap:3px;flex-shrink:0">
      ${canAdd()&&sub2!=='campos'?`<button data-draggable data-zone="M" class="btn btn-sm btn-p" style="font-weight:700;flex-shrink:0" onclick="_ingSource='ingresos2';openIngModal()">${tr('btnNewIngreso')}</button>`:''}
      </span>
      <div style="width:1px;height:20px;background:var(--border);flex-shrink:0;margin:0 2px"></div>
      <span data-zone="R" style="display:inline-flex;gap:3px;align-items:center;flex-shrink:0">
      <button data-draggable data-zone="R" class="btn btn-sm ${sub2==='columnas'?'btn-p':'btn-gh'}" style="flex-shrink:0" onclick="iF['_sub2']='columnas';_saveSubTab('ingresos2','columnas');renderIngresos2()">${tr('tabColumnas')}</button>
      ${canCampos()?`<button data-draggable data-zone="R" class="btn btn-sm ${sub2==='campos'?'btn-p':'btn-gh'}" style="flex-shrink:0" onclick="iF['_sub2']='campos';_saveSubTab('ingresos2','campos');renderIngresos2()">${tr('campos')}</button>`:''}
      </span>
      <span style="flex:1;min-width:8px"></span>
      <span data-zone="R" style="display:inline-flex;gap:3px;align-items:center;flex-shrink:0">
      ${sub2!=='historial'&&sub2!=='campos'?`<button class="btn btn-s btn-sm" title="Importar" onclick="if(!canImport()){toast(tr('sinPermiso'),'var(--red)');return;}document.getElementById('xlsxIng2').click()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button><button class="btn btn-gh btn-sm" title="Plantilla" onclick="dlTemplateIng2()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></button>`:''}
      ${sub2!=='historial'&&sub2!=='campos'&&canExport()?`<button class="btn btn-gh btn-sm" title="Excel" onclick="exportIngresos2()"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>`:''}
      ${sub2!=='historial'&&sub2!=='campos'&&canClean()?`<button class="btn btn-sm" style="color:var(--red)" title=tr('limpiar') onclick="if(!confirm('¿Limpiar registros del día en Ingresos?'))return;cleanTab('ingresos2')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>`:''}
      </span>
    </div>
    ${sub2!=='historial'&&sub2!=='print'&&sub2!=='campos'?`<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--border);padding-bottom:4px">
      <div class="sbox" style="flex:1;min-width:120px"><span class="sico">🔍</span><input type="search" data-i18n-ph="phSearchDash" placeholder="${tr('phSearchDash')}" value="${iF.q2||''}" id="srch-ingresos2" oninput="iF.q2=this.value;debounceSearch('ingresos2',renderIngresos2)"></div>
      <input type="date" value="${iF.fecha2||''}" oninput="iF.fecha2=this.value;debounceSearch('ingresos2-date',renderIngresos2)" style="height:32px;padding:4px 8px;font-size:11px;box-sizing:border-box;width:auto;min-width:110px;max-width:130px">
      <span class="pill" style="border:1.5px solid ${iF.activos2?'#4a5568':'var(--border)'};background:${iF.activos2?'#4a5568':'var(--bg2)'};color:${iF.activos2?'#fff':'var(--text3)'}" onclick="iF.activos2=!iF.activos2;renderIngresos2()">${tr('soloActivos')}</span>
      ${iF.q2||iF.fecha2||iF.hall2||iF.activos2?`<span class="pill pill-r" onclick="iF.q2='';iF.fecha2='';iF.hall2='';iF.activos2=false;renderIngresos2()">✕</span>`:''}
      <span style="font-size:10px;color:var(--text3)">${items.length} ${tr('regLabel')}</span>
    </div>
    ${sub2!=='campos'?`<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:6px">
      <span class="pill" style="font-size:10px;font-weight:700;padding:3px 8px;border:1.5px solid ${!iF.hall2?'#7dd3fc':'#c8cacc'};background:${!iF.hall2?'#e0f2fe':'#e8eaed'};color:${!iF.hall2?'#0369a1':'#1e40af'};cursor:pointer" onclick="iF.hall2='';renderIngresos2()">${tr('all')}</span>
      ${getRecintoHalls().map(h=>`<span class="pill" style="font-size:10px;font-weight:700;padding:3px 8px;border:1.5px solid ${iF.hall2===h?'#4a5568':'var(--border)'};background:${iF.hall2===h?'#4a5568':'var(--bg2)'};color:${iF.hall2===h?'#fff':'var(--text3)'};cursor:pointer" onclick="iF.hall2='${h}';renderIngresos2()">${h}</span>`).join('')}
    </div>`:''}`:''}
    ${sub2==='lista'?`
    ${items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr>
      ${thSort('ingresos2','pos','#')}${thSort('ingresos2','matricula','Matrícula')}${_isColVisible('ingresos2','llamador')?thSort('ingresos2','llamador','Llamador'):''}${_isColVisible('ingresos2','referencia')?thSort('ingresos2','referencia','Ref'):''}${_isColVisible('ingresos2','nombre')?thSort('ingresos2','nombre','Conductor/Empresa'):''}${_isColVisible('ingresos2','telefono')?thSort('ingresos2','telefono','Tel.'):''}${_isColVisible('ingresos2','hall')?'<th>'+tr('hall')+'</th>':''}${_isColVisible('ingresos2','stand')?'<th>'+tr('stand')+'</th>':''}${_isColVisible('ingresos2','evento')?'<th style="font-size:10px">'+tr('evento')+'</th>':''}${thSort('ingresos2','salida','Estado')}${_isColVisible('ingresos2','entrada')?thSort('ingresos2','entrada','Entrada'):''}<th>${tr('acciones')}</th>
    </tr></thead><tbody>
      ${items.map(i=>`<tr>
        <td style="font-weight:700;color:var(--text3)">${i.pos||''}</td>
        <td><span class="mchip" style="cursor:pointer" onclick="showIngDetalle('${i.id}','ingresos2')">${i.matricula}</span>${i.remolque?`<br><span class="mchip-sm">${i.remolque}</span>`:''}</td>
        ${_isColVisible('ingresos2','llamador')?`<td style="font-size:11px">${i.llamador||'–'}</td>`:''}
        ${_isColVisible('ingresos2','referencia')?`<td style="font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text3)">${i.referencia||'–'}</td>`:''}
        ${_isColVisible('ingresos2','nombre')?`<td><b style="font-size:12px">${i.nombre||''} ${i.apellido||''}</b>${i.empresa?`<br><span style="font-size:11px;color:var(--text3)">${i.empresa}</span>`:''}</td>`:''}
        ${_isColVisible('ingresos2','telefono')?`<td>${telLink(i.telPais||'',i.telefono||'')}</td>`:''}
        ${_isColVisible('ingresos2','hall')?`<td>${(i.halls||[i.hall||'']).filter(Boolean).map(h=>hBadge(h)).join(' ')||'–'}</td>`:''}
        ${_isColVisible('ingresos2','stand')?`<td style="font-size:11px">${i.stand||'–'}</td>`:''}
        ${_isColVisible('ingresos2','evento')?`<td style="font-size:9px;color:var(--text3);max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${i.eventoNombre||''}">${i.eventoNombre?i.eventoNombre.slice(0,12):'–'}</td>`:''}
        <td>${!i.salida?'<span class="pill pill-g">✓ En recinto</span>':`<span style="font-size:10px;color:var(--text3)">↩ ${fmt(i.salida,'t')}</span>`}</td>
        ${_isColVisible('ingresos2','entrada')?`<td style="font-size:11px;white-space:nowrap">${fmt(i.entrada)}</td>`:''}
        <td><div style="display:flex;gap:2px;flex-wrap:wrap">
          <button class="btn btn-gh btn-xs" onclick="printIngreso2('${i.id}')" title="Imprimir Normal">🖨</button>
          <button class="btn btn-xs" style="background:#4a5568;color:#f7f7f7;border-radius:20px" title="Imprimir Troquelado A4" onclick="printTrqIng('${i.id}')">✂</button>
          ${canEdit()?`<button class="btn btn-edit btn-xs" onclick="openIngModal2(DB.ingresos2.find(x=>x.id==='${i.id}'))">✏️</button>`:''}
          ${!i.salida&&canStatus()?`<button class="btn btn-warning btn-xs" onclick="marcarSalidaIng2('${i.id}')">↩ Salida</button><button class="btn btn-xs" style="background:#4a5568;color:#fff" title="Registrar paso tracking" onclick="registrarPasoTracking('${i.id}','ingresos2')">📡</button>`:''}
          ${i.salida&&canStatus()?`<button class="btn btn-success btn-xs" onclick="reactivarIngreso2('${i.id}')" title="Reactivar">↺</button>`:''}
          ${canDel()?`<button class="btn btn-danger btn-xs" onclick="askDelIng2('${i.id}')">🗑</button>`:''}
        </div></td>
      </tr>`).join('')}
    </tbody></table></div>`:`<div class="empty"><div class="ei">🚛</div><div class="et">${tr('noEntries')}</div></div>`}`:''}
    ${sub2!=='lista'?(sub2==='listanegra'?_ingLN():sub2==='historial'?_ingHistorial('ingresos2'):sub2==='campos'?renderCamposSubtab('ingresos2'):sub2==='columnas'?renderColVisSub('ingresos2'):sub2==='print'?_ingPrintCfg('ing2'):_ingPrintCfg('ing2')):''}`;  if(sub2==='print'){iF._sub2='lista';goTab('impresion',null);window._impSub='ing2';renderImpresion();return;}
}

function openIngModal2(i){_ingSource='ingresos2';openIngModal(i);}

function marcarSalidaIng2(id){const i=(DB.ingresos2||[]).find(x=>x.id===id);if(!i)return;i.salida=nowL();saveDBNow();renderIngresos2();renderHdr();}

function reactivarIngreso2(id){const i=(DB.ingresos2||[]).find(x=>x.id===id);if(!i)return;i.salida=null;saveDBNow();renderIngresos2();renderHdr();toast('↺ Salida anulada','var(--amber)');}

function exportIngresos2(){if(!canExport()){toast('Sin permiso para exportar','var(--red)');return;};if(!(DB.ingresos2||[]).length){toast('Sin datos','var(--red)');return;}const wb=XLSX.utils.book_new();const fn='ingresos_libre_'+new Date().toISOString().slice(0,10)+'.xlsx';XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet((DB.ingresos2||[]).map(i=>({Pos:i.pos||'',Matricula:i.matricula,Nombre:i.nombre||'',Apellido:i.apellido||'',Empresa:i.empresa||'',Hall:(i.halls||[i.hall||'']).join('/')+'',Stand:i.stand||'',Remolque:i.remolque||'',Telefono:i.telefono||'',Comentario:i.comentario||'',Entrada:fmt(i.entrada),Salida:i.salida?fmt(i.salida):'En recinto'}))),'Ingresos');XLSX.writeFile(wb,fn);logExport('Ingresos-SinRef',fn);toast('✅ Exportado');}

