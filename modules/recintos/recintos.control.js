/* recintos — 8 funciones */

function renderRecintos(){
  if(!isSup()){document.getElementById('tab-recintos').innerHTML='<div class="empty"><div class="et">'+tr('sinPermiso')+'</div></div>';return;}
  const items=DB.recintos||[];
  document.getElementById('tab-recintos').innerHTML=`
    <div style="margin-bottom:8px">
      <button class="btn btn-p btn-sm" onclick="openRecintoModal()" style="background:#4a5568;color:#f7f7f7;border-color:#3a4558;font-weight:600;border-radius:20px">+ Nuevo recinto</button>
    </div>
    ${items.length?`<div class="tbl-wrap"><table class="dtbl" style="color:#111"><thead><tr><th>${tr('recinto')}</th><th>${tr('phCity')}</th><th>${tr('phCountryName')}</th><th>${tr('halls')}</th><th>${tr('puertas')}</th><th>${tr('atenCliente')}</th><th>${tr('acciones')}</th></tr></thead><tbody>
      ${items.map(r=>`<tr>
        <td><b style="font-size:13px;color:#111">${r.nombre}</b></td>
        <td style="font-size:12px;color:#111">${r.ciudad||'–'}</td>
        <td style="font-size:12px;color:#111">${r.pais||'–'}</td>
        <td><div style="display:flex;flex-wrap:wrap;gap:2px">${(r.halls||[]).map(h=>`<span class="hbadge">${h}</span>`).join('')||'–'}</div></td>
        <td style="font-size:11px;color:#111">${(r.puertas||[]).map(p=>`🚪${p.nombre}`).join(', ')||'–'}</td>
        <td style="font-size:11px;color:#111">${r.atencion?.tel?'📞':''}${r.atencion?.email?' ✉':''}${!r.atencion?.tel&&!r.atencion?.email?'–':''}</td>
        <td><div style="display:flex;gap:2px">
          <button class="btn btn-edit btn-xs" onclick="openRecintoModal(DB.recintos.find(x=>x.id==='${r.id}'))">✏️</button>
          <button class="btn btn-danger btn-xs" onclick="if(confirm('¿Eliminar recinto ${r.nombre}?')){DB.recintos=DB.recintos.filter(x=>x.id!=='${r.id}');saveDB();renderRecintos();toast('🗑 Eliminado');}">🗑</button>
        </div></td>
      </tr>`).join('')}
    </tbody></table></div>`:`<div class="empty"><div class="ei">🏟</div><div class="et">${tr('sinRecintos')}</div><div style="margin-top:12px"><button class="btn btn-p btn-sm" onclick="openRecintoModal()">+ Crear primer recinto</button></div></div>`}`;
}

function openRecintoModal(r){
  editRecId=r?r.id:null;_recHallsTemp=r?.halls?[...r.halls]:[];_recPuertasTemp=r?.puertas?[...r.puertas]:[];
  document.getElementById('mRecTitle').textContent=r?tr('editVenue'):tr('newVenue');
  document.getElementById('btnRecLbl').textContent=r?tr('save'):tr('create');
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  set('recId',r?.id);set('recNom',r?.nombre);set('recCiudad',r?.ciudad);set('recPais',r?.pais);
  set('recAtcTel',r?.atencion?.tel);set('recAtcEmail',r?.atencion?.email);set('recAtcNotas',r?.atencion?.notas);
  renderRecHalls();renderRecPuertas();
  document.getElementById('mRecinto').classList.add('open');
}

function addRecHall(){const inp=document.getElementById('recHallInput');const v=(inp.value||'').trim().toUpperCase();if(!v)return;if(!_recHallsTemp.includes(v))_recHallsTemp.push(v);inp.value='';renderRecHalls();}

function renderRecHalls(){const el=document.getElementById('recHallList');if(el)el.innerHTML=_recHallsTemp.map((h,i)=>`<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:var(--r);background:var(--bll);border:1.5px solid var(--border);font-size:12px;font-weight:700;color:#4a5568">🏭 ${h}<button class="btn btn-danger btn-xs" style="padding:1px 4px;font-size:9px" onclick="_recHallsTemp.splice(${i},1);renderRecHalls()">✕</button></span>`).join('');}

function addRecPuerta(){const nom=(document.getElementById('recPuertaNom').value||'').trim();if(!nom)return;_recPuertasTemp.push({nombre:nom,direccion:(document.getElementById('recPuertaDir').value||'').trim(),qr:(document.getElementById('recPuertaQR').value||'').trim()});document.getElementById('recPuertaNom').value='';document.getElementById('recPuertaDir').value='';document.getElementById('recPuertaQR').value='';renderRecPuertas();}

function renderRecPuertas(){const el=document.getElementById('recPuertasList');if(el)el.innerHTML=_recPuertasTemp.map((p,i)=>`<div style="display:flex;align-items:center;gap:4px;padding:6px 8px;border:1px solid var(--border);border-radius:var(--r);background:var(--bg2);font-size:12px"><span style="font-weight:700">🚪 ${p.nombre}</span>${p.direccion?`<span style="color:var(--text3)">📍 ${p.direccion}</span>`:''} ${p.qr?`<a href="${p.qr}" target="_blank" style="color:#4a5568;font-size:10px">🔗 QR</a>`:''}<button class="btn btn-danger btn-xs" onclick="_recPuertasTemp.splice(${i},1);renderRecPuertas()">✕</button></div>`).join('');}

function getRecintoHalls(){const ev=getActiveEvent();if(ev?.halls&&ev.halls.length)return ev.halls;if(ev?.recintoId){const r=DB.recintos.find(x=>x.id===ev.recintoId);if(r&&r.halls&&r.halls.length)return r.halls;}return[];}

function onRecintoSelectChange(){const sel=document.getElementById('evRecintoId');const rid=sel?.value;const r=rid?(DB.recintos||[]).find(x=>x.id===rid):null;document.getElementById('evRec').value=r?r.nombre:'';document.getElementById('evCiudad').value=r?`${r.ciudad||''} ${r.pais||''}`.trim():'';evPuertasTemp=r?.puertas?[...r.puertas]:[];renderPuertasEv();renderEvHallsGrid(r?r.halls:[],[]);}

