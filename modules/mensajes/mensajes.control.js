/* mensajes — 6 funciones */

function pauseMsg(id){const m=DB.mensajesRampa.find(x=>x.id===id);if(!m)return;m.pausado=!m.pausado;saveDBNow();renderMensajesTab();renderHdr();}

function _ingMsgs(){
  const _nowTs=Date.now();
  const items=[...DB.mensajesRampa].sort((a,b)=>(b.ts||'').localeCompare(a.ts||'')).slice(0,80);
  let changed=false;
  DB.mensajesRampa.forEach(m=>{
    if(!m.leido)m.leido=[];
    if(!m.leido.includes(SID)){m.leido.push(SID);changed=true;}
    if(!m.pausado&&m.expiraTs&&_nowTs>m.expiraTs){m.pausado=true;changed=true;}
  });
  if(changed){saveDBNow();_lastMsgCount=0;}
  return`<div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r);padding:5px 10px;margin-bottom:4px;font-size:11px;color:var(--text3);display:flex;align-items:center;gap:4px">🔗 <b>${tr('datosCompartidosMensajes')}</b></div>
  <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
    <button class="btn btn-p btn-sm" onclick="openMsgModal()">📢 Nuevo</button>
    <button class="btn btn-gh btn-sm" onclick="marcarTodosMsgLeidos()"><span id="lbl_allRead">✓ Todos leídos</span></button>
    ${isSup()&&DB.mensajesRampa.length?`<button class="btn btn-danger btn-sm" title="Limpiar mensajes" onclick="askDel('Limpiar todos los mensajes','Se eliminarán <b>'+DB.mensajesRampa.length+'</b> mensajes. Esta acción no se puede deshacer.',()=>{DB.mensajesRampa=[];_markDeleteOp('mensajesRampa');saveDB();renderMensajesTab();renderHdr();})" title=tr('limpiar')><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>`:''}
    ${canExport()?`<button class="btn btn-gh btn-sm" onclick="exportMensajes()" title="Excel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>`:''}
  </div>
  ${items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr><th>'+tr('thType')+'</th><th>${tr('titulo')}</th><th>${tr('titulo')}</th><th>${tr('matricula')}</th><th>${tr('hora')}</th><th>${tr('autor')}</th><th></th></tr></thead><tbody>
    ${items.map(m=>{const isExpired=m.expiraTs&&_nowTs>m.expiraTs;const ur=!m.leido?.includes(SID)&&!m.pausado&&!isExpired;return`<tr style="${m.pausado||isExpired?'opacity:.45;background:var(--bg3)':ur?'background:var(--rll)':''}">
      <td>${m.tipo==='urgente'?'🔴':m.tipo==='alerta'?'⚠️':'ℹ️'}${m.pausado?' ⏸':isExpired?' ⏰':''}</td>
      <td style="font-weight:${ur?800:600};font-size:12px">${m.titulo||'–'}</td>
      <td style="font-size:11px">${m.mensaje||'–'}</td>
      <td>${m.matricula?`<span class="mchip-sm">${m.matricula}</span>`:'-'}</td>
      <td style="font-size:10px;white-space:nowrap">${fmt(m.ts,'t')}</td>
      <td style="font-size:10px">${m.autor||'–'}</td>
      <td><div style="display:flex;gap:2px">
        <button class="btn btn-xs btn-gh" title="${m.pausado?'Reactivar':'Pausar'}" onclick="pauseMsg('${m.id}')">${m.pausado?'▶':'⏸'}</button>
      </div></td>
    </tr>`;}).join('')}
  </tbody></table></div>`:`<div class="empty"><div class="ei">📢</div><div class="et">${tr('sinMensajes')}</div></div>`}`;}

function openMsgModal(){const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};set('msgTipo','info');set('msgTitulo','');set('msgTexto','');set('msgMat','');document.getElementById('mMsg').classList.add('open');}

function marcarTodosMsgLeidos(){DB.mensajesRampa.forEach(m=>{if(!m.leido)m.leido=[];if(!m.leido.includes(SID))m.leido.push(SID);});saveDBNow();renderIngresos();renderHdr();}

function exportMensajes(){if(!canExport()){toast('Sin permiso para exportar','var(--red)');return;};if(!DB.mensajesRampa.length){toast('Sin datos','var(--red)');return;}const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(DB.mensajesRampa.map(m=>({Tipo:m.tipo,Titulo:m.titulo||'',Mensaje:m.mensaje,Matricula:m.matricula||'',Autor:m.autor,Hora:fmt(m.ts)}))),'Mensajes');XLSX.writeFile(wb,'mensajes.xlsx');toast('✅ Exportado');}

function renderMensajesTab(){const el=document.getElementById('tab-mensajes');if(!el)return;el.innerHTML='<div class="sec-hdr"><div class="sec-ttl">📢 Mensajes de Rampa ('+DB.mensajesRampa.length+')</div></div>'+_ingMsgs();}

