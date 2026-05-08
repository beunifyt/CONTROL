/* ocr — 12 funciones */

function cambiarFirebase(){/* setup screen removed — config is fixed in code */}

function renderAnalyticsCampos(){
  const S=window._anlState;
  if(!S.anlSelFields)S.anlSelFields=[];
  if(!S.anlCombos)S.anlCombos=[];
  if(!S.anlMode)S.anlMode='completitud';

  // ── FULL DATA SOURCES ──
  const auditItems=DB.auditLog||[];
  const TABS=[
    {key:'ingresos',label:'🔖 Referencia',data:DB.ingresos,
     fields:{matricula:'Matrícula',referencia:'Referencia',llamador:'Llamador',nombre:'Nombre',apellido:'Apellido',empresa:'Empresa',montador:'Montador',expositor:'Expositor',hall:'Hall',stand:'Stand',puertaHall:'Puerta Hall',remolque:'Remolque',tipoVehiculo:'Tipo Vehículo',descargaTipo:tr('descarga'),pasaporte:'Pasaporte/DNI',telefono:'Teléfono',email:'Email',comentario:'Comentario',tipoCarga:'Tipo Carga',entrada:'Hora Entrada',salida:'Hora Salida',pos:'Posición',eventoNombre:'Evento'}},
    {key:'ingresos2',label:'🚛 Ingresos',data:DB.ingresos2||[],
     fields:{matricula:'Matrícula',nombre:'Nombre',apellido:'Apellido',empresa:'Empresa',hall:'Hall',stand:'Stand',puertaHall:'Puerta Hall',remolque:'Remolque',tipoVehiculo:'Tipo Vehículo',descargaTipo:tr('descarga'),telefono:'Teléfono',comentario:'Comentario',entrada:'Hora Entrada',salida:'Hora Salida',pos:'Posición',eventoNombre:'Evento'}},
    {key:'movimientos',label:'📦 Embalaje',data:DB.movimientos||[],
     fields:{matricula:'Tractora',remolque:'Remolque',empresa:'Empresa',hall:'Hall',status:'Estado',tipoCarga:'Tipo Carga',posicion:'Posición',nombre:'Conductor',apellido:'Apellido',telefono:'Teléfono',tipoVehiculo:'Tipo Vehículo'}},
    {key:'agenda',label:'📅 Agenda',data:DB.agenda||[],
     fields:{matricula:'Matrícula',conductor:'Conductor',empresa:'Empresa',referencia:'Referencia',montador:'Montador',expositor:'Expositor',hall:'Hall',stand:'Stand',tipoCarga:'Tipo Carga',descargaTipo:tr('descarga'),tipoVehiculo:'Tipo Vehículo',telefono:'Teléfono',notas:'Notas',estado:'Estado',fecha:'Fecha',hora:'Hora Plan',horaReal:'Hora Real',eventoNombre:'Evento'}},
    {key:'vehiculos',label:'📜 Historial',data:DB.vehiculos||[],
     fields:{matricula:'Matrícula',empresa:'Empresa',nombre:'Conductor',telefono:'Teléfono',ingresos:'Nº Ingresos',evento:'Último Evento',ultimoIngreso:'Último Ingreso',remolque:'Remolque',tipoVehiculo:'Tipo Vehículo'}},
    {key:'auditLog',label:'📂 Archivos',data:auditItems,
     fields:{user:'Usuario',action:tr('accion'),entity:tr('entidad'),detail:tr('detalle'),ts:tr('fechaHora')}},
    {key:'papelera',label:'🗑 Papelera',data:DB.papelera||[],
     fields:{origen:tr('origen'),borradoPor:'Borrado Por',ts:'Fecha',_mat:'Matrícula item',_emp:'Empresa item'}},
    {key:'usuarios',label:'👥 Usuarios',data:DB.usuarios||[],
     fields:{nombre:'Nombre',rol:'Rol',lang:'Idioma',pin:'Tiene PIN',email:'Email'}}
  ];

  // Helper: get value from possibly nested papelera items
  const getVal=(row,f)=>{
    if(f==='_mat')return row.item?.matricula||'';
    if(f==='_emp')return row.item?.empresa||'';
    return row[f];
  };
  const count=(arr,f)=>arr.filter(x=>{const v=getVal(x,f);return v!==undefined&&v!==null&&String(v).trim()!=='';}).length;
  const pct=(n,t)=>t?Math.round(n/t*100):0;
  const C=(n,k)=>{if(k>n)return 0;let r=1;for(let i=0;i<k;i++){r=r*(n-i)/(i+1);}return Math.round(r);};

  const selTab=S.camposTab||'ingresos';
  const tabData=TABS.find(t=>t.key===selTab)||TABS[0];
  const arr=tabData.data;
  const total=arr.length;
  const fieldKeys=Object.keys(tabData.fields);
  const n=fieldKeys.length;
  const combos2=C(n,2),combos3=C(n,3),combosAll=Math.pow(2,n)-1-n;

  // Correlation: cross any N fields, generate all pairs from selected
  const correlate=(fields)=>{
    const pairs={};
    arr.forEach(row=>{
      const vals=fields.map(f=>String(getVal(row,f)||'').trim().slice(0,20));
      if(vals.some(v=>!v))return;
      const key=vals.join(' × ');
      pairs[key]=(pairs[key]||0)+1;
    });
    return Object.entries(pairs).sort((a,b)=>b[1]-a[1]).slice(0,10);
  };

  // Generate all pairs + triplets from selected fields
  const selFields=S.anlSelFields||[];
  const genCombinations=(arr,size)=>{
    const res=[];
    const helper=(start,cur)=>{if(cur.length===size){res.push([...cur]);return;}for(let i=start;i<arr.length;i++){cur.push(arr[i]);helper(i+1,cur);cur.pop();}};
    helper(0,[]);return res;
  };
  const autoCombos=[
    ...genCombinations(selFields,2),
    ...(selFields.length>=3?genCombinations(selFields,3):[])
  ];

  const COLORS=['#4a5568','#7a8294','#3a4558','#8a8070','#7a4a4a','var(--cyan)'];

  document.getElementById('tab-analytics').innerHTML=`
    <div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-xs btn-gh" onclick="window._anlState.subtab='graficos';renderAnalytics()">📊 Gráficos</button>
      <button class="btn btn-xs btn-p">📋 Campos & Correlaciones</button>
      <span style="flex:1"></span>
      ${canExport()?`<button class="btn btn-xs btn-gh" onclick="exportDia()">⬇ Exportar</button>`:''}
    </div>

    <div style="display:flex;gap:4px;margin-bottom:4px;flex-wrap:wrap">
      ${TABS.map(t=>`<button class="btn btn-xs ${selTab===t.key?'btn-p':'btn-gh'}" onclick="window._anlState.camposTab='${t.key}';window._anlState.anlSelFields=[];renderAnalyticsCampos()">${t.label} <span style="font-size:9px;opacity:.7">${t.data.length}</span></button>`).join('')}
    </div>

    <div class="sg sg4" style="margin-bottom:4px">
      <div class="stat-box" style="border-top:#3a4558">${total}</div><div class="stat-l">${tr('regLabel')}</div></div>
      <div class="stat-box" style="border-top:3px solid #3a4558"><div class="stat-n" style="color:#4a5568">${n}</div><div class="stat-l">${tr('campos')}</div></div>
      <div class="stat-box" style="border-top:3px solid var(--amber)"><div class="stat-n" style="color:var(--amber)">${combos2.toLocaleString()}</div><div class="stat-l">${tr('paresPosibles')}</div></div>
      <div class="stat-box" style="border-top:3px solid #4a5568"><div class="stat-n" style="color:#4a5568">${combos3.toLocaleString()}</div><div class="stat-l">${tr('tripletasPosibles')}</div></div>
    </div>

    <div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
      <div style="font-size:11px;font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
        🔗 Selecciona campos — genera todas las combinaciones automáticamente
        <span style="font-size:10px;color:var(--text3)">${selFields.length} seleccionados → ${autoCombos.length} combinaciones</span>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px">
        ${fieldKeys.map((f,fi)=>{
          const sel=selFields.includes(f);
          const col=sel?COLORS[selFields.indexOf(f)%COLORS.length]:'var(--border2)';
          return`<button onclick="(()=>{const sf=window._anlState.anlSelFields||[];const idx=sf.indexOf('${f}');if(idx>=0)sf.splice(idx,1);else sf.push('${f}');window._anlState.anlSelFields=sf;renderAnalyticsCampos();})()" style="padding:4px 10px;font-size:11px;border-radius:6px;cursor:pointer;border:1.5px solid ${col};background:${sel?col.replace('var(','rgba(').replace(')',',0.15)'):'var(--bg3)'};color:${sel?col:'var(--text3)'};font-weight:${sel?'700':'400'}">${tabData.fields[f]}</button>`;
        }).join('')}
      </div>
      ${selFields.length?`<button class="btn btn-gh btn-sm" onclick="window._anlState.anlSelFields=[];renderAnalyticsCampos()">✕ Limpiar selección</button>`:'<span style="font-size:10px;color:var(--text3)">Toca los campos para seleccionarlos. Con 2+ campos genera pares, con 3+ genera también tripletas.</span>'}
    </div>

    ${autoCombos.length?`
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:10px">
      ${autoCombos.map((combo,ci)=>{
        const pairs=correlate(combo);
        const maxV=pairs[0]?.[1]||1;
        const isTriplet=combo.length===3;
        const colors=combo.map((_,i)=>COLORS[selFields.indexOf(combo[i])%COLORS.length]);
        const titleParts=combo.map((f,i)=>`<span style="color:${colors[i]}">${tabData.fields[f]}</span>`).join(' × ');
        return`<div style="background:var(--bg2);border:0.5px solid var(--border);border-radius:10px;padding:12px">
          <div style="font-size:12px;font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:4px">
            ${isTriplet?'🔀':'🔗'} ${titleParts}
            ${isTriplet?'<span style="font-size:9px;background:var(--bg3);padding:2px 6px;border-radius:4px;color:#4a5568">tripleta</span>':''}
          </div>
          ${pairs.length===0?`<div style="font-size:11px;color:var(--text3)">${tr('sinDatosCruzados')}</div>`:`
          <div style="display:flex;flex-direction:column;gap:4px">
            ${pairs.map(([key,cnt])=>{
              const parts=key.split(' × ');
              const w=Math.round(cnt/maxV*100);
              const grad=colors.length===2?`linear-gradient(90deg,${colors[0]},${colors[1]})`:`linear-gradient(90deg,${colors[0]},${colors[1]||colors[0]},${colors[2]||colors[0]})`;
              return`<div style="display:flex;align-items:center;gap:4px">
                <span style="font-size:10px;min-width:200px;color:var(--text2)">${parts.map((p,i)=>`<b style="color:${colors[i]||'var(--text)'}">${p}</b>`).join(' <span style="opacity:.4">×</span> ')}</span>
                <div style="flex:1;height:8px;background:var(--bg3);border-radius:4px"><div style="width:${w}%;height:100%;background:${grad};border-radius:4px"></div></div>
                <span style="font-size:10px;font-weight:700;min-width:28px;text-align:right">${cnt}</span>
              </div>`;
            }).join('')}
          </div>`}
        </div>`;
      }).join('')}
    </div>`:''}

    <div class="card">
      <div style="font-weight:800;margin-bottom:10px;display:flex;justify-content:space-between">
        <span>📊 Completitud — ${tabData.label}</span>
        <span style="font-size:10px;font-weight:400;color:var(--text3)">${n} campos · ${combos2} pares · ${combos3} tripletas</span>
      </div>
      ${total===0?`<div class="empty"><div class="ei">📭</div><div class="et"><span id="lbl_noData2">${tr('noData2')}</span></div></div>`:`
      <div style="display:flex;flex-direction:column;gap:5px">
        ${fieldKeys.map(f=>{
          const nf=count(arr,f);
          const p=pct(nf,total);
          const color=p===100?'#4a5568':p>=50?'#4a5568':p>0?'var(--amber)':'var(--border2)';
          const vals={};arr.forEach(row=>{const v=String(getVal(row,f)||'').trim();if(v){vals[v]=(vals[v]||0)+1;}});
          const top=Object.entries(vals).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([v,cnt])=>`<span style="font-size:9px;background:var(--bg4);padding:1px 6px;border-radius:3px;margin-left:3px">${v.slice(0,18)}: ${cnt}</span>`).join('');
          return`<div>
            <div style="display:flex;align-items:center;gap:4px">
              <span style="font-size:11px;font-weight:600;min-width:120px;color:var(--text2)">${tabData.fields[f]}</span>
              <div style="flex:1;height:7px;background:var(--bg3);border-radius:4px"><div style="width:${p}%;height:100%;background:${color};border-radius:4px;transition:width .3s"></div></div>
              <span style="font-size:10px;font-weight:700;min-width:70px;text-align:right;color:${color}">${nf}/${total} (${p}%)</span>
            </div>
            ${top?`<div style="padding-left:128px">${top}</div>`:''}
          </div>`;
        }).join('')}
      </div>`}
    </div>`;
}

function cambiarEstMov(id,status){const m=DB.movimientos.find(x=>x.id===id);if(!m)return;m.status=status;m.lastStatusTs=nowL();saveDB();renderFlota();renderHdr();}

function openCamModal(){
  document.getElementById('camResult').textContent='';
  var _st=document.getElementById('camStatus');if(_st){_st.textContent='';_st.style.display='none';}
  document.getElementById('btnCamUse').style.display='none';
  var _sb=document.getElementById('camStatusBadge');if(_sb)_sb.style.display='none';
  var _svb=document.getElementById('camSvcBadge');if(_svb)_svb.style.display='none';
  camResultMat='';
  // Mostrar toggle servicio solo si SA
  var _tog=document.getElementById('btnOcrSvcToggle');
  if(_tog){
    _tog.style.display=isSA()?'inline-flex':'none';
    _updateOcrSvcToggleUI();
  }
  if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){
    navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(stream=>{
      camStream=stream;const v=document.getElementById('camFeed');v.srcObject=stream;v.style.display='block';
      document.getElementById('mCam').classList.add('open');
    }).catch(()=>{document.getElementById('cameraInput').click();});
  }else{document.getElementById('cameraInput').click();}
}

function _updateOcrSvcToggleUI(){
  var tog=document.getElementById('btnOcrSvcToggle');
  var lbl=document.getElementById('ocrSvcLabel');
  var badge=document.getElementById('camSvcBadge');
  if(!tog)return;
  var svc=(window._OCR&&typeof window._OCR.getService==='function')?window._OCR.getService():(typeof DB!=='undefined'&&DB.ocrService)||'vision';
  if(svc==='vision'){
    if(lbl)lbl.textContent='Vision';
    tog.style.borderColor='#2563eb';tog.style.color='#2563eb';tog.style.background='#eff6ff';
    if(badge){badge.style.borderColor='#bfdbfe';badge.style.background='#eff6ff';badge.style.color='#2563eb';badge.textContent='☁️ Vision';}
  }else{
    if(lbl)lbl.textContent='Local';
    tog.style.borderColor='var(--green)';tog.style.color='var(--green)';tog.style.background='var(--gll)';
    if(badge){badge.style.borderColor='#a7f3d0';badge.style.background='var(--gll)';badge.style.color='var(--green)';badge.textContent='🔌 Local';}
  }
}

function _toggleOcrService(){
  if(!isSA())return;
  var svc=(window._OCR&&typeof window._OCR.getService==='function')?window._OCR.getService():(typeof DB!=='undefined'&&DB.ocrService)||'vision';
  var next=svc==='vision'?'local':'vision';
  if(window._OCR&&typeof window._OCR.setService==='function'){window._OCR.setService(next);}
  else{if(typeof DB!=='undefined'){DB.ocrService=next;if(typeof saveDB==='function')saveDB();}}
  _updateOcrSvcToggleUI();
  // Actualizar stats en tab usuarios si está abierto
  if(typeof renderOcrStatsSection==='function')renderOcrStatsSection();
  if(window._OCR&&typeof window._OCR.renderStats==='function')window._OCR.renderStats();
}

function closeCam(){if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}closeOv('mCam');}

function captureOCR(){const v=document.getElementById('camFeed'),c=document.getElementById('camCanvas');if(!v.srcObject){document.getElementById('camStatus').textContent='Sin cámara activa';return;}c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);c.toBlob(async function(blob){// Usar cam-ocr si disponible, fallback a Vision API
if(window._OCR&&typeof window._OCR.runFromBlob==='function'){await window._OCR.runFromBlob(blob);}else{await callClaudeOCR(blob);}},'image/jpeg',0.92);}

async function callClaudeOCR(blob,_isCrop){
  const st=document.getElementById('camStatus');
  if(!_isCrop)st.textContent='⏳ Analizando...';
  try{
    const b64=await blobToB64(blob);
    const ak=localStorage.getItem('cu1_apiKey')||'';
    if(!ak){st.textContent='⚠️ Sin API Key';return;}
    const resp=await fetch('https://vision.googleapis.com/v1/images:annotate?key='+ak,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({requests:[{image:{content:b64},features:[
        {type:'TEXT_DETECTION',maxResults:50}
      ]}]})
    });
    const data=await resp.json();
    if(data.error){st.textContent='❌ '+data.error.message;return;}
    const texts=data.responses?.[0]?.textAnnotations;
    if(!texts||!texts.length){st.textContent='❌ No detectada';return;}

    // texts[0] = full text, texts[1..] = individual words with bounding boxes
    const words=texts.slice(1);

    // Score each word block
    let best=null,bestScore=0;
    words.forEach(function(w){
      const txt=(w.description||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
      const score=typeof _scorePlate==='function'?_scorePlate(txt):(txt.match(/[A-Z]/g)?.length>1&&txt.match(/[0-9]/g)?.length>1?txt.length*2:0);
      if(score>bestScore){bestScore=score;best=w;}
    });

    // If good candidate found and not already a crop — crop and re-analyze
    if(best&&bestScore>=6&&!_isCrop){
      const verts=best.boundingPoly?.vertices||[];
      if(verts.length>=4){
        // Get bounding box with generous padding
        const xs=verts.map(v=>v.x||0), ys=verts.map(v=>v.y||0);
        const x0=Math.max(0,Math.min(...xs)-40);
        const y0=Math.max(0,Math.min(...ys)-20);
        const x1=Math.min(9999,Math.max(...xs)+40);
        const y1=Math.min(9999,Math.max(...ys)+20);
        const w2=x1-x0, h2=y1-y0;
        if(w2>20&&h2>8){
          // Crop from original blob
          const img=new Image();
          const url=URL.createObjectURL(blob);
          img.onload=async function(){
            const cv=document.getElementById('camCanvas');
            // Scale coords if image display size != natural size
            const scaleX=img.naturalWidth/img.naturalWidth; // always 1 for blob
            cv.width=Math.round(w2);
            cv.height=Math.round(h2);
            cv.getContext('2d').drawImage(img,x0,y0,w2,h2,0,0,w2,h2);
            URL.revokeObjectURL(url);
            st.textContent='🔍 Recortando zona...';
            cv.toBlob(async function(cropped){
              await callClaudeOCR(cropped,true);
            },'image/jpeg',0.97);
          };
          img.src=url;
          return;
        }
      }
    }

    // Final: pick best word or full text
    const fullText=(texts[0]?.description||'').toUpperCase();
    const lns=fullText.split(/[\n\r\s]+/)
      .map(l=>l.replace(/[^A-Z0-9]/g,'').trim())
      .filter(l=>l.length>=4&&l.length<=10);
    const _sp=typeof _scorePlate==='function'?_scorePlate:(t=>(t.match(/[A-Z]/g)?.length>1&&t.match(/[0-9]/g)?.length>1?t.length*2:0));lns.sort((a,b)=>_sp(b)-_sp(a));
    const plate=lns[0]||(best?best.description.toUpperCase().replace(/[^A-Z0-9]/g,''):'');
    if(plate&&plate.length>=3){
      camResultMat=plate;
      document.getElementById('camResult').textContent=plate;
      document.getElementById('btnCamUse').style.display='inline-flex';
      // Mostrar badges de la muestra
      var _sb=document.getElementById('camStatusBadge');if(_sb)_sb.style.display='inline-block';
      var _svb=document.getElementById('camSvcBadge');if(_svb)_svb.style.display='inline-block';
      st.style.display='none';
      _updateOcrSvcToggleUI();
    }else{
      st.textContent='❌ No detectada. Intenta de nuevo.';
    }
  }catch(e){st.textContent='❌ Error: '+e.message;}
}

async function processCameraCapture(inp){const file=inp.files[0];if(!file)return;document.getElementById('mCam').classList.add('open');document.getElementById('camFeed').style.display='none';var _st=document.getElementById('camStatus');if(_st){_st.textContent='Analizando...';_st.style.display='block';}if(window._OCR&&typeof window._OCR.runFromBlob==='function'){await window._OCR.runFromBlob(file);}else{await callClaudeOCR(file);}inp.value='';}

function blobToB64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(blob);});}

function useCamResult(){if(!camResultMat)return;const mat=document.getElementById('fiMat');if(mat){mat.value=camResultMat;checkMatOnInput(camResultMat);}closeCam();toast('✅ Matrícula: '+camResultMat,'var(--text2)');}

