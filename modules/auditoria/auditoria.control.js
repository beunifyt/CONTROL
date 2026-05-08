/* auditoria — 7 funciones */

function logAudit(a,e,d){if(!DB.auditLog)DB.auditLog=[];DB.auditLog.unshift({id:uid(),ts:nowL(),user:CU?.nombre||'?',action:a,entity:e,detail:d});if(DB.auditLog.length>300)DB.auditLog=DB.auditLog.slice(0,300);}

function renderAuditoria(){
  if(!isSup()){document.getElementById('tab-auditoria').innerHTML='<div class="empty"><div class="et">'+tr('sinPermiso')+'</div></div>';return;}
  if(!window._audSub)window._audSub='sesiones';
  if(window._audQ2===undefined)window._audQ2='';
  const sub=window._audSub;
  const q=(window._audQ2||'').toLowerCase();
  const allLog=[...DB.auditLog||[]];
  const allExport=[...DB.exportLog||[]];
  const noSyncLog=JSON.parse(localStorage.getItem('cu1_noSyncLog')||'[]');
  const _meta=e=>{const a=e.action||'';if(a==='login_ok')return{icon:'✓',bg:'var(--gll)',color:'#4a5568',label:'Login OK'};if(a==='logout')return{icon:'⎋',bg:'var(--bg3)',color:'var(--text3)',label:'Logout'};if(a==='blocked')return{icon:'🔒',bg:'var(--rll)',color:'var(--red)',label:'Bloqueado'};if(a==='sin_sync_activado')return{icon:'📴',bg:'var(--all)',color:'var(--amber)',label:'Sin Sync'};if(a==='reset_total')return{icon:'💥',bg:'var(--rll)',color:'var(--red)',label:'Reset Total'};if(a==='limpiar_tab')return{icon:'🗑',bg:'var(--rll)',color:'var(--red)',label:'Limpiar Tab'};if(a==='login')return{icon:'🔑',bg:'var(--bll)',color:'#4a5568',label:'Login'};if(a.startsWith('new'))return{icon:'✅',bg:'var(--gll)',color:'#4a5568',label:'Nuevo'};if(a.startsWith('edit'))return{icon:'✏️',bg:'var(--bll)',color:'#4a5568',label:'Editar'};if(a==='salida')return{icon:'↩',bg:'var(--bg3)',color:'var(--text3)',label:'Salida'};if(a==='reactivar')return{icon:'↺',bg:'var(--bll)',color:'#4a5568',label:'Reactivar'};if(a.includes('del')||a.includes('borr'))return{icon:'🗑',bg:'var(--rll)',color:'var(--red)',label:'Eliminar'};return{icon:'•',bg:'var(--bg3)',color:'var(--text3)',label:a};};
  const _isSec=e=>['blocked','sin_sync_activado','reset_total','limpiar_tab'].includes(e.action);
  const totalSes=allLog.filter(e=>e.entity==='sesion').length;
  const totalAct=allLog.filter(e=>e.entity!=='sesion').length;
  const totalBlk=allLog.filter(e=>e.action==='blocked').length;
  const totalSec=allLog.filter(e=>_isSec(e)).length+noSyncLog.length;
  let subContent='';
  if(sub==='dispositivos'){
    const devs=(DB.devices||[]).slice().sort((a,b)=>(b.lastAccess||'').localeCompare(a.lastAccess||''));
    const statusIcon={trusted:'✅',blocked:'🚫',new:'⚠️'};
    const statusLabel={trusted:'Confiable',blocked:'Bloqueado',new:'Nuevo'};
    const statusColor={trusted:'#4a5568',blocked:'var(--red)',new:'var(--amber)'};
    subContent=`<div style="margin-bottom:4px;font-size:11px;color:var(--text3)">Solo visible para SuperAdmin. Renombra, confía o bloquea dispositivos.</div>
    <div style="display:flex;align-items:center;gap:4px;margin:8px 0;padding:8px 12px;background:var(--bg3);border-radius:var(--r);border:0.5px solid var(--border)"><div style="flex:1"><div style="font-size:12px;font-weight:700">🔒 Requerir aprobación SA para dispositivos nuevos</div><div style="font-size:10px;color:var(--text3)">Activo: nuevos dispositivos quedan bloqueados hasta aprobación. Inactivo: entran libremente y SA recibe alerta.</div></div>${DB._devRequireApproval
  ?`<button onclick="DB._devRequireApproval=false;saveDB();renderAuditoria();const _dot2=document.getElementById('devApprovalDot');if(_dot2)_dot2.style.display='none';toast('🔓 Nuevos dispositivos entran libremente','var(--text2)')" style="padding:7px 16px;border:none;border-radius:20px;background:#4a5568;color:#fff;font-weight:800;cursor:pointer;font-size:12px;white-space:nowrap">🔒 ON</button>`
  :`<button onclick="DB._devRequireApproval=true;saveDB();renderAuditoria();const _dot=document.getElementById('devApprovalDot');if(_dot)_dot.style.display='block';toast('🔒 Nuevos dispositivos requieren aprobación','#4a5568')" style="padding:7px 16px;border:none;border-radius:20px;background:#8b3a3a;color:#fff;font-weight:800;cursor:pointer;font-size:12px;white-space:nowrap">🔓 OFF</button>`}</div>
    ${devs.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr><th>${tr('dispositivo')}</th><th>${tr('frUserLbl')}</th><th>${tr('ultimoAcceso')}</th><th>${tr('estado')}</th><th></th></tr></thead><tbody>
    ${devs.map(d=>`<tr>
      <td><span style="font-size:13px">${d.name||'❓'}</span><div style="font-size:9px;color:var(--text4);font-family:monospace">${(d.fp||'').slice(0,8)}</div></td>
      <td style="font-size:12px">${d.lastUser||'–'}</td>
      <td style="font-size:11px;white-space:nowrap">${d.lastAccess?d.lastAccess.slice(0,16):'–'}</td>
      <td><span style="font-weight:700;color:${statusColor[d.status||'new']}">${statusIcon[d.status||'new']} ${statusLabel[d.status||'new']}</span></td>
      <td><div style="display:flex;gap:4px;align-items:center">
        <button class="btn btn-xs btn-gh" onclick="renameDevice('${d.id}')" title="Renombrar">✏️</button>
        ${d.status!=='trusted'?`<button class="btn btn-xs btn-gh" style="color:#4a5568" onclick="setDeviceStatus('${d.id}','trusted')" title="Marcar como confiable">✅</button>`:''}
        ${d.status!=='blocked'?`<button class="btn btn-xs btn-gh" style="color:var(--red)" onclick="setDeviceStatus('${d.id}','blocked')" title="Bloquear">🚫</button>`:''}
        <button class="btn btn-xs btn-danger" onclick="deleteDevice('${d.id}')" title="Eliminar">🗑</button>
      </div></td>
    </tr>`).join('')}
    </tbody></table></div>`:'<div class="empty"><div class="ei">🖥</div><div class="et">'+tr('sinDispositivos')+'</div><div class="es">'+tr('datosCompartidos')+'</div></div>'}`;
  } else if(sub==='sesiones'){
    let items=allLog.filter(e=>e.entity==='sesion');
    if(q)items=items.filter(e=>`${e.user||''} ${e.detail||''} ${e.session?.ip||''} ${e.session?.device||''}`.toLowerCase().includes(q));
    subContent=items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr><th>'+tr('estado')+'</th><th>'+tr('frUserLbl')+'</th><th>'+tr('detalle')+'</th><th>'+tr('dispositivo')+'</th><th>IP</th><th>'+tr('fechaHora')+'</th></tr></thead><tbody>${items.map(e=>{const m=_meta(e);const s=e.session||{};return`<tr><td><span class="sbadge" style="background:${m.bg};color:${m.color}">${m.icon} ${m.label}</span></td><td style="font-weight:700;font-size:12px">${esc(e.user||'–')}</td><td style="font-size:11px;color:var(--text3);max-width:200px">${esc(e.detail||'–')}</td><td style="font-size:11px">${s.device?`📱 ${esc(s.device)} · ${esc(s.browser||'–')}`:'–'}</td><td style="font-family:'JetBrains Mono',monospace;font-size:11px">${esc(s.ip||'–')}</td><td style="font-size:11px;white-space:nowrap">${e.ts||'–'}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty"><div class="ei">🔑</div><div class="et">'+tr('sinEventosSesion')+'</div></div>';
  }else if(sub==='acciones'){
    let items=allLog.filter(e=>e.entity!=='sesion');
    if(q)items=items.filter(e=>`${e.user||''} ${e.action||''} ${e.entity||''} ${e.detail||''}`.toLowerCase().includes(q));
    subContent=items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr><th>'+tr('thType')+'</th><th>'+tr('frUserLbl')+'</th><th>'+tr('entidad')+'</th><th>'+tr('detalle')+'</th><th>'+tr('fechaHora')+'</th></tr></thead><tbody>${items.map(e=>{const m=_meta(e);return`<tr><td><span class="sbadge" style="background:${m.bg};color:${m.color}">${m.icon} ${m.label}</span></td><td style="font-weight:700;font-size:12px">${esc(e.user||'–')}</td><td><span style="background:var(--bg3);padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700">${esc(e.entity||'–')}</span></td><td style="font-size:11px;color:var(--text2)">${esc(e.detail||'–')}</td><td style="font-size:11px;white-space:nowrap">${e.ts||'–'}</td></tr>`;}).join('')}</tbody></table></div>`:'<div class="empty"><div class="ei">📋</div><div class="et">'+tr('sinAcciones')+'</div></div>';
  }else if(sub==='seguridad'){
    let secItems=allLog.filter(e=>_isSec(e));
    if(q)secItems=secItems.filter(e=>`${e.user||''} ${e.detail||''}`.toLowerCase().includes(q));
    const nsItems=noSyncLog.filter(x=>!q||`${x.user||''} ${x.motivo||''}`.toLowerCase().includes(q));
    const rows=nsItems.map(x=>`<tr style="background:var(--all)"><td><span class="sbadge" style="background:var(--all);color:var(--amber)">📴 Sin Sync</span></td><td style="font-weight:700;font-size:12px">${esc(x.user||'–')} <span style="font-size:10px;color:var(--text3)">${esc(x.rol||'')}</span></td><td style="font-size:11px;color:var(--amber);font-weight:700">${esc(x.motivo||'–')}</td><td style="font-size:11px;color:var(--text3)">${esc((x.ua||'').slice(0,60))}</td><td style="font-size:11px;white-space:nowrap">${x.ts?new Date(x.ts).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'–'}</td></tr>`).join('')+secItems.map(e=>{const m=_meta(e);const s=e.session||{};return`<tr><td><span class="sbadge" style="background:${m.bg};color:${m.color}">${m.icon} ${m.label}</span></td><td style="font-weight:700;font-size:12px">${esc(e.user||'–')}</td><td style="font-size:11px">${esc(e.detail||'–')}</td><td style="font-size:11px;color:var(--text3)">${s.ip?esc(s.ip):''}</td><td style="font-size:11px;white-space:nowrap">${e.ts||'–'}</td></tr>`;}).join('');
    subContent=rows?`<div class="tbl-wrap"><table class="dtbl"><thead><tr><th>'+tr('evento')+'</th><th>'+tr('frUserLbl')+'</th><th>'+tr('detMotivo')+'</th><th>IP / UA</th><th>'+tr('fechaHora')+'</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty"><div class="ei">🛡</div><div class="et">'+tr('sinEventosSeg')+'</div></div>';
  }else if(sub==='exportaciones'){
    let items=[...allExport];
    if(q)items=items.filter(e=>`${e.user||''} ${e.tab||''} ${e.filename||''}`.toLowerCase().includes(q));
    items.sort((a,b)=>(b.ts||'').localeCompare(a.ts||''));
    subContent=items.length?`<div class="tbl-wrap"><table class="dtbl"><thead><tr><th>'+tr('fechaHora')+'</th><th>'+tr('frUserLbl')+'</th><th>'+tr('thRole')+'</th><th>'+tr('pestana')+'</th><th>'+tr('auditoria')+'</th></tr></thead><tbody>${items.map(e=>`<tr><td style="font-size:11px;white-space:nowrap">${fmt(e.ts)}</td><td style="font-weight:700;font-size:12px">${esc(e.user||'–')}</td><td style="font-size:11px">${{superadmin:'SA',supervisor:'Sup',editor:'Ed',controlador_rampa:'Ctrl',visor:'Visor'}[e.rol]||esc(e.rol||'–')}</td><td><span style="background:var(--bll);color:#4a5568;padding:2px 7px;border-radius:4px;font-size:11px;font-weight:700">${esc(e.tab||'–')}</span></td><td style="font-size:11px;font-family:'JetBrains Mono',monospace">${esc(e.filename||'–')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><div class="ei">📥</div><div class="et">'+tr('sinExportaciones')+'</div></div>';
  }
  const tabBtn=(id,label,cnt,danger=false)=>`<button class="btn btn-sm ${sub===id?(danger?'btn-r':'btn-p'):(danger&&cnt>0?'btn-danger':'btn-gh')}" onclick="window._audSub='${id}';renderAuditoria()">${label}${cnt?` <span style="background:${sub===id?'rgba(255,255,255,.3)':'var(--bg4)'};padding:1px 5px;border-radius:10px;font-size:9px;font-weight:900;margin-left:3px">${cnt}</span>`:''}</button>`;
  document.getElementById('tab-auditoria').innerHTML=`


    <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--border);padding-bottom:4px">
      <div class="sbox" style="flex:1;min-width:140px"><span class="sico">🔍</span><input type="search" placeholder="${tr('searchAudit')}" value="${esc(window._audQ2||'')}" oninput="window._audQ2=this.value;renderAuditoria()"></div>
      ${window._audQ2?`<span class="pill pill-r" style="flex-shrink:0" onclick="window._audQ2='';renderAuditoria()">✕</span>`:''}
      <span style="flex:1"></span>
      ${tabBtn('dispositivos','🖥 Dispositivos',(DB.devices||[]).filter(d=>d.status==='new').length,false)}
      ${tabBtn('sesiones','🔑 Sesiones',totalSes)}
      ${tabBtn('acciones','📋 Acciones',totalAct)}
      ${tabBtn('seguridad','🛡 Seguridad',totalSec,true)}
      ${tabBtn('exportaciones','📥 Exportaciones',allExport.length)}
      ${isSA()?`<button class="btn btn-gh btn-sm" onclick="exportAuditLog()" title="Excel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></button>`:''}
      ${isSA()&&(sub==='sesiones'||sub==='acciones'||sub==='seguridad')?`<button class="btn btn-danger btn-sm" style="flex-shrink:0" onclick="if(confirm('¿Limpiar?\')){DB.auditLog=[];saveDB();renderAuditoria();}" title=tr('limpiar')><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>`:''}
    </div>
    ${subContent}`;
}

function exportAuditLog(){if(!isSA()){toast('Solo SuperAdmin','var(--red)');return;};
  if(!isSA())return;
  const wb=XLSX.utils.book_new();
  const ses=(DB.auditLog||[]).filter(e=>e.entity==='sesion').map(e=>({Fecha:e.ts,Usuario:e.user||'',Accion:e.action||'',Detalle:e.detail||'',IP:e.session?.ip||'',Dispositivo:e.session?.device||'',Navegador:e.session?.browser||''}));
  const act=(DB.auditLog||[]).filter(e=>e.entity!=='sesion').map(e=>({Fecha:e.ts,Usuario:e.user||'',Accion:e.action||'',Entidad:e.entity||'',Detalle:e.detail||''}));
  const exp=(DB.exportLog||[]).map(e=>({Fecha:e.ts,Usuario:e.user||'',Rol:e.rol||'',Pestana:e.tab||'',Archivo:e.filename||''}));
  const nsl=JSON.parse(localStorage.getItem('cu1_noSyncLog')||'[]').map(x=>({Fecha:x.ts,Usuario:x.user||'',Rol:x.rol||'',Motivo:x.motivo||'',UA:(x.ua||'').slice(0,120)}));
  if(ses.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ses),'Sesiones');
  if(act.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(act),tr('acciones'));
  if(exp.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(exp),'Exportaciones');
  if(nsl.length)XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(nsl),'SinSync');
  const fn='auditoria_'+new Date().toISOString().slice(0,10)+'.xlsx';
  XLSX.writeFile(wb,fn);logExport('Auditoria',fn);toast('✅ Audit log exportado','var(--text2)');
}

function _markDeleteOp(coleccion){
  _deleteOps[coleccion]=Date.now();
  // Limpiar después de 8 segundos
  setTimeout(()=>{delete _deleteOps[coleccion];},8000);
}

function _isDeleteProtected(coleccion){
  const ts=_deleteOps[coleccion];
  return ts&&(Date.now()-ts)<8000;
}

function softDelete(coleccion,id,renderFn){
  if(!DB[coleccion])return;
  const item=DB[coleccion].find(x=>x.id===id);if(!item)return;
  if(!DB.papelera)DB.papelera=[];
  DB.papelera.unshift({id:uid(),origen:coleccion,item:{...item},ts:nowL(),borradoPor:CU?.nombre||'?'});
  if(DB.papelera.length>500)DB.papelera=DB.papelera.slice(0,500);
  DB[coleccion]=DB[coleccion].filter(x=>x.id!==id);
  _markDeleteOp(coleccion);
  _markDeleteOp('papelera');
  saveDBNow();if(renderFn)renderFn();
  toast('🗑 Eliminado — ver Papelera para restaurar','var(--amber)',4000);
}

function logExport(tab,filename){
  if(!DB.exportLog)DB.exportLog=[];
  DB.exportLog.unshift({id:uid(),ts:nowL(),user:CU?.nombre||'?',tab,filename,rol:CU?.rol||'?'});
  if(DB.exportLog.length>500)DB.exportLog=DB.exportLog.slice(0,500);
  saveDB();
}

