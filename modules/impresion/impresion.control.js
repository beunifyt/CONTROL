/* impresion — 79 funciones */

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

function _ingPrintCfg(cfgKey){
  const isAg=cfgKey==='ag',isTab2=cfgKey==='ing2',isCond=cfgKey==='cond',isFlota=cfgKey==='flota';
  if(!DB.printCfgCond)DB.printCfgCond={};
  if(!DB.printCfgFlota)DB.printCfgFlota={};
  const cfg=isAg?DB.printCfgAg:isTab2?DB.printCfg2:isCond?DB.printCfgCond:isFlota?DB.printCfgFlota:DB.printCfg1;
  const mode=(DB.printCfgModes||{})[cfgKey]||'normal';
  const paperSize=cfg.paperSize||'A4';
  const font=cfg.font||'Arial';
  const ph3=cfg.puerta3||{};
  const ph2Val=(cfg.phrase2||'').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const uLang=CUR_LANG||'es';
  const ph1Val=((cfg.phrases||{})[uLang]||'').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const _dm=DB.printCfgModes||{};

  // Plantillas de diseño guardadas
  const tpls=(DB.printTemplates||[]).map((t,idx)=>{
    const _dIng1=_dm['dest_ing1']===t.name,_dIng2=_dm['dest_ing2']===t.name,_dAg=_dm['dest_ag']===t.name;
    const chip=(on,lbl)=>`<span onclick="toggleTplDest('${t.name}','dest_${lbl}','${cfgKey}')" style="cursor:pointer;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;border:0.5px solid;${on?'background:#4a5568;color:#f7f7f7;border-color:#3a4558':'background:var(--bg3);color:var(--text3);border-color:var(--border)'}">${{ing1:'Ref',ing2:'Ing',ag:'Ag',cond:'Cond',flota:'Emb'}[lbl]||lbl}${on?' ✓':''}</span>`;
    return`<div style="display:flex;align-items:center;gap:5px;padding:6px 8px;border-radius:6px;background:var(--bg2);border:0.5px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px;cursor:pointer" onclick="loadPrintTemplate('${t.name}','${cfgKey}')"> ${t.name} <span style="font-size:9px;color:var(--text3)">${t.mode==='troquel'?'✂':''} ${t.paperSize||'A4'}</span></div>
        <div style="display:flex;gap:3px;flex-wrap:wrap">${chip(_dIng1,'ing1')}${chip(_dIng2,'ing2')}${chip(_dAg,'ag')}${chip(_dm['dest_cond']===t.name,'cond')}${chip(_dm['dest_flota']===t.name,'flota')}</div>
      </div>
      <button onclick="loadPrintTemplate('${t.name}','${cfgKey}')" title=tr('cargar') style="width:26px;height:26px;border-radius:6px;border:0.5px solid var(--border);background:var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
      <button onclick="editPrintTpl(${idx},'${cfgKey}')" title="Renombrar" style="width:26px;height:26px;border-radius:6px;border:0.5px solid var(--border);background:var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button onclick="delPrintTpl(${idx},'${cfgKey}')" title="Eliminar" style="width:26px;height:26px;border-radius:6px;border:0.5px solid #fca5a5;background:#8b3a3a;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center">
        <svg width="12" height="12" fill="none" stroke="#fff" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
      </button>
    </div>`;
  }).join('');

  // Plantillas de imágenes guía
  const bgTpls=(DB.printBgTemplates||[]).map((t,i)=>
    `<div style="display:flex;align-items:center;gap:5px;padding:5px 8px;border-radius:6px;background:var(--bg2);border:0.5px solid var(--border)">
      <span style="font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🖼 ${t.name}</span>
      <button onclick="pcLoadBgTpl('${cfgKey}',${i})" style="width:26px;height:26px;border-radius:6px;border:0.5px solid var(--border);background:var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center" title=tr('cargar')>
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
      <button onclick="pcDelBgTpl(${i},'${cfgKey}')" class="pc-btn-3d" style="width:28px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;color:var(--red)" title="Eliminar">
        <svg width="12" height="12" fill="none" stroke="#8b3a3a" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
      </button>
    </div>`
  ).join('');

  const placedJSON=JSON.stringify(cfg.fieldLayout||{});

  // Font list — fuentes comunes + web
  const FONT_LIST=['Arial','Arial Black','Arial Narrow','Calibri','Cambria','Candara','Century Gothic','Comic Sans MS','Consolas','Courier New','Franklin Gothic Medium','Georgia','Gill Sans','Helvetica','Impact','Lucida Console','Lucida Sans','Montserrat','Open Sans','Oswald','Palatino','Roboto','Segoe UI','Tahoma','Times New Roman','Trebuchet MS','Ubuntu','Verdana'];
  const fontOpts=FONT_LIST.map(f=>`<option value="${f}" ${f===font?'selected':''} style="font-family:${f}">${f}</option>`).join('');

  const sep='<div style="width:1px;height:20px;background:var(--border);flex-shrink:0;margin:0 5px"></div>';
  const lbl=(t)=>`<span style="font-size:9px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-right:2px">${t}</span>`;

  return `<div id="pcfg-${cfgKey}" style="background:var(--bg2);border-radius:var(--r2);padding:10px">
  <style>
  #pv-${cfgKey}{position:relative;background:#fff;border:1px solid #aaa;overflow:visible;width:794px;height:1123px;flex-shrink:0;font-family:'Arial',sans-serif;transform-origin:top left;}
  #pc-canvas-wrap-${cfgKey}{touch-action:pan-y;overflow-x:auto;-webkit-overflow-scrolling:touch;}
  .pfc-${cfgKey}{position:absolute;border:1.5px solid #000;background:rgba(255,255,255,.96);border-radius:2px;padding:1px 4px;font-size:8px;font-weight:700;cursor:move;z-index:10;display:flex;align-items:baseline;line-height:1.4;user-select:none;min-width:50px;max-width:200px}
  .pfc-${cfgKey}.pfc-sel{border:2px solid #3b5bdb;background:#eff6ff;z-index:20}
  .pfc-${cfgKey} .pfc-line{flex:1;min-width:20px;border-bottom:1px solid #000;height:1px;margin:0 2px;align-self:flex-end;margin-bottom:2px}
  .pfc-${cfgKey} .pfc-val{font-weight:400;margin-left:3px}
  .pfc-${cfgKey} .pfc-rm{font-size:9px;color:#aaa;cursor:pointer;margin-left:3px;flex-shrink:0}
  .pfc-${cfgKey} .pfc-rm:hover{color:#e00}
  .guide-h-${cfgKey}{position:absolute;left:0;right:0;height:1px;background:#3b5bdb;pointer-events:none;z-index:50;display:none}
  .guide-v-${cfgKey}{position:absolute;top:0;bottom:0;width:1px;background:#e53e3e;pointer-events:none;z-index:50;display:none}
  .fp-item-${cfgKey}{display:flex;align-items:center;gap:4px;padding:3px 6px;border-radius:5px;border:0.5px solid var(--border);background:var(--bg);font-size:11px;font-weight:500;user-select:none}
  .fp-item-${cfgKey}.fp-done{opacity:.4}
  .fp-item-${cfgKey} .fp-drag-h{cursor:grab;display:flex;align-items:center;gap:4px;flex:1}
  .fp-item-${cfgKey}.fp-done .fp-drag-h{cursor:default;text-decoration:line-through}
  .pc-btn-3d{
    background:linear-gradient(to bottom,#f5f5f5 0%,#e8e8e8 100%);
    border:1px solid #c0c0c0;
    border-bottom:3px solid #a0a0a0;
    border-radius:7px;
    color:#2c2c2c;
    font-size:10px;
    font-weight:600;
    padding:4px 10px;
    cursor:pointer;
    box-shadow:0 2px 4px rgba(0,0,0,.12),inset 0 1px 0 rgba(255,255,255,.7);
    transition:all .08s ease;
    white-space:nowrap;
    flex-shrink:0;
    letter-spacing:.01em;
  }
  .pc-btn-3d:hover{background:linear-gradient(to bottom,#fafafa 0%,#eeeeee 100%);border-color:#b0b0b0;border-bottom-color:#909090;}
  .pc-btn-3d:active{background:linear-gradient(to bottom,#e0e0e0 0%,#ebebeb 100%);border-top:3px solid #a0a0a0;border-bottom:1px solid #c0c0c0;box-shadow:inset 0 1px 3px rgba(0,0,0,.12);transform:translateY(1px);}
  .pc-btn-3d.on{background:linear-gradient(to bottom,#e0e0e8 0%,#d4d4e0 100%);border-color:#9898b0;border-bottom-color:#7878a0;color:#1a1a2a;box-shadow:inset 0 2px 3px rgba(0,0,0,.10);}
  .pc-btn-3d.save{background:linear-gradient(to bottom,#f5f5f5 0%,#e8e8e8 100%);border-color:#b8b8b8;border-bottom-color:#989898;color:#2c2c2c;box-shadow:0 2px 4px rgba(0,0,0,.10),inset 0 1px 0 rgba(255,255,255,.6);}
  .pc-btn-3d.save:hover{background:linear-gradient(to bottom,#fafafa 0%,#eeeeee 100%);}
  .pc-sep-v{width:1px;height:22px;background:#d0d0d0;flex-shrink:0;margin:0 6px;}
  .pc-grp-lbl{font-size:9px;color:#787878;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-right:3px;}
  .pc-sec{background:var(--bg);border:0.5px solid var(--border);border-radius:8px;overflow:hidden}
  .pc-sec-hdr{display:flex;align-items:center;gap:7px;padding:7px 10px;border-bottom:0.5px solid var(--border);background:var(--bg3)}
  .pc-sec-hdr span{font-size:10px;font-weight:700;color:var(--text2)}
  .pc-sec-body{padding:8px 10px;display:flex;flex-direction:column;gap:7px}
  .pc-row{display:flex;align-items:center;gap:6px}
  .pc-lbl{font-size:10px;color:var(--text3);min-width:40px}
  @media(max-width:640px){#pcfg-${cfgKey}{padding:6px!important}.pc-outer-${cfgKey}{grid-template-columns:1fr!important;overflow-x:visible!important}}
  </style>

  <div class="pc-outer-${cfgKey}" style="display:grid;grid-template-columns:280px 1fr;gap:12px;overflow-x:auto">

  <!-- ══ PANEL IZQUIERDO ══ -->
  <div style="display:flex;flex-direction:column;gap:8px;align-self:start;position:sticky;top:0;max-height:calc(100vh - 70px);overflow-y:auto;padding-right:2px;min-width:0">

    <!-- 1. Imagen de guía -->
    <div class="pc-sec" data-sec-id="guia">
      <div class="pc-sec-hdr" style="background:#eff6ff;border-bottom-color:#bfdbfe">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        <span>${tr('imgGuia')}</span>
        <span style="font-size:9px;color:var(--text3);font-weight:400">(no se imprime)</span>
        <span style="flex:1"></span>
        <label style="cursor:pointer;display:flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:600;background:var(--bg);border:0.5px solid var(--border);color:var(--text2)">
          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Subir
          <input type="file" id="pcbg-${cfgKey}" accept="image/*" style="display:none" onchange="pcLoadBG(this,'${cfgKey}')">
        </label>
      </div>
      <div class="pc-sec-body" style="gap:6px">
        <div class="pc-row">
          <span style="font-size:10px;color:var(--text3)">${tr('opacidad')}</span>
          <input type="range" min="5" max="80" value="${Math.round((cfg.bgOpacity||0.35)*100)}" step="5" style="flex:1;height:3px;cursor:pointer;accent-color:#4a5568" oninput="const img=document.getElementById('pcbg-img-${cfgKey}');if(img)img.style.opacity=this.value/100;document.getElementById('pc-bg-pct-${cfgKey}').textContent=this.value+'%';const _c=${cfgKey==='ag'?'DB.printCfgAg':cfgKey==='ing2'?'DB.printCfg2':cfgKey==='cond'?'DB.printCfgCond':cfgKey==='flota'?'DB.printCfgFlota':'DB.printCfg1'};_c.bgOpacity=this.value/100;saveDB()">
          <span id="pc-bg-pct-${cfgKey}" style="font-size:10px;min-width:28px;text-align:right;font-weight:600">${Math.round((cfg.bgOpacity||0.35)*100)}%</span>
          <button onclick="(()=>{const img=document.getElementById('pcbg-img-${cfgKey}');if(img){img.src='';img.style.display='none';}const _c=${cfgKey==='ag'?'DB.printCfgAg':cfgKey==='ing2'?'DB.printCfg2':cfgKey==='cond'?'DB.printCfgCond':cfgKey==='flota'?'DB.printCfgFlota':'DB.printCfg1'};delete _c.bgImage;delete _c.bgOpacity;saveDB();toast('Imagen eliminada','var(--text3)');})()" style="width:22px;height:22px;border-radius:50%;border:0.5px solid var(--border);background:var(--bg3);cursor:pointer;font-size:10px;color:var(--text3);display:flex;align-items:center;justify-content:center">✕</button>
        </div>
        ${bgTpls?`<div style="display:flex;flex-direction:column;gap:3px">${bgTpls}</div>`:''}
        <div style="display:flex;gap:5px;align-items:center">
          <input id="pc-bg-tpl-name-${cfgKey}" data-i18n-ph="phSaveGuide" placeholder="Guardar imagen como guía..." style="flex:1;font-size:10px;padding:3px 7px;border:0.5px solid var(--border);border-radius:5px;background:var(--bg)">
          <button onclick="pcSaveBgTpl('${cfgKey}')" class="pc-btn-3d save">${tr('phSaveGuide')}</button>
        </div>
      </div>
    </div>

    <!-- 2. Campos del diseño -->
    <div class="pc-sec" data-sec-id="campos">
      <div id="pc-fld-hdr-${cfgKey}" class="pc-sec-hdr" style="cursor:pointer;border-bottom:none;background:#f0fdf4" onclick="pcToggleFields('${cfgKey}')">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        <span>${tr('camposDise')}</span>
        <span style="flex:1"></span>
        <span id="pc-fld-arrow-${cfgKey}" style="font-size:11px;color:var(--text3)">▸</span>
      </div>
      <div id="pc-fld-body-${cfgKey}" style="display:none;flex-direction:column;gap:2px;padding:6px 8px 8px;max-height:320px;overflow-y:auto;border-top:0.5px solid var(--border)">
        <div id="pc-palette-${cfgKey}" style="display:flex;flex-direction:column;gap:2px"></div>
      </div>
    </div>

    <!-- 3. Documento -->
    <div class="pc-sec" data-sec-id="documento">
      <div class="pc-sec-hdr" style="background:#fffbeb;border-bottom-color:#fde68a">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>${tr('documento')}</span>
      </div>
      <div class="pc-sec-body">
        <div class="pc-row">
          <span class="pc-lbl">${tr('fuente')}</span>
          <select onchange="setPrintCfgFont('${cfgKey}',this.value);this.style.fontFamily=this.value" style="flex:1;font-size:11px;padding:3px 6px;border-radius:6px;border:0.5px solid var(--border);background:var(--bg);font-family:${font};cursor:pointer">${fontOpts}</select>
        </div>
        <div class="pc-row">
          <span class="pc-lbl">${tr('papel')}</span>
          ${['A3','A4','A5'].map(sz=>`<button class="pc-btn-3d ${paperSize===sz?'on':''}" style="font-size:11px;font-weight:600" onclick="setPaperSize('${cfgKey}','${sz}')">${sz}</button>`).join('')}
          <div style="width:1px;height:16px;background:var(--border);margin:0 2px"></div>
          <button id="pc-orient-${cfgKey}" class="pc-btn-3d" onclick="pcToggleOrient('${cfgKey}')">${cfg.landscape?'↔ Horiz':'↕ Vert'}</button>
        </div>
        <div class="pc-row">
          <span class="pc-lbl">${tr('modo')}</span>
          <button class="pc-btn-3d ${mode==='normal'?'on':''}" style="font-size:11px;font-weight:700" onclick="setFormPrintMode('normal');setTimeout(()=>{const el=document.getElementById('pcfg-${cfgKey}');if(el){const ck='${cfgKey}';window._impSub=ck==='ag'?'ag':ck==='ing2'?'ing2':'ing1';renderImpresion();}},50)">Normal</button>
          <button class="btn btn-xs ${mode==='troquel'?'':'btn-gh'}" style="padding:2px 12px;font-size:11px;font-weight:700" onclick="setFormPrintMode('troquel');setTimeout(()=>{const el=document.getElementById('pcfg-${cfgKey}');if(el){const ck='${cfgKey}';window._impSub=ck==='ag'?'ag':ck==='ing2'?'ing2':'ing1';renderImpresion();}},50)">✂ Troquel</button>
        </div>
      </div>
    </div>

    <!-- 4. Frases y QR -->
    <div class="pc-sec" data-sec-id="frases">
      <div class="pc-sec-hdr" style="background:#faf5ff;border-bottom-color:#e9d5ff">
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 00-2 2v3M16 21v-3M21 21v-3"/></svg>
        <span>${tr('contenido')}</span>
      </div>
      <div class="pc-sec-body" style="gap:5px">
        <div class="pc-row">
          <span style="font-size:11px;font-weight:600;flex:1">${tr('qrTracking')}</span>
          <button class="btn btn-xs ${cfg.qrTracking!==false?'btn-p':'btn-gh'}" style="font-size:10px;padding:1px 8px" onclick="pcQuickAddPhrase('qr','${cfgKey}')">+ Canvas</button>
          <div style="display:flex;align-items:center;gap:5px;cursor:pointer" onclick="toggleQR('${cfgKey}')">
            <div style="width:28px;height:15px;border-radius:8px;background:${cfg.qrTracking!==false?'#4a5568':'var(--border2)'};position:relative">
              <div style="width:11px;height:11px;border-radius:50%;background:#fff;position:absolute;top:2px;left:${cfg.qrTracking!==false?'15':'2'}px"></div>
            </div>
            <span style="font-size:10px;font-weight:700;min-width:22px;color:${cfg.qrTracking!==false?'#f7f7f7':'var(--text3)'}">${cfg.qrTracking!==false?'ON':'OFF'}</span>
          </div>
        </div>
        ${['p1','p2','p3'].map(pk=>{
          const isOn=pk==='p1'?cfg.ph1On===true:pk==='p2'?cfg.ph2On!==false:cfg.ph3On===true;
          const labels={'p1':'Frase 1 — bajo matrícula','p2':`Frase 2 — pie ficha`,'p3':'Frase 3 — QR acceso'};
          const bodyHtml=pk==='p3'
            ?`<div style="padding:4px 0 2px;display:flex;flex-direction:column;gap:3px">
                <input id="pcp3n-${cfgKey}" data-i18n-ph="phDoorName" placeholder="${tr('phDoorName')}" value="${(ph3.nombre||'').replace(/"/g,'&quot;')}

function pcSetZoom(ck,val){
  val=parseInt(val);
  const pv=document.getElementById('pv-'+ck);
  if(!pv)return;
  const lbl=document.getElementById('pc-zoom-lbl-'+ck);
  const sl=document.getElementById('pc-zoom-'+ck);
  const scale=val/100;
  pv.style.transform='scale('+scale+')';
  pv.style.transformOrigin='top left';
  // Adjust container size to match scaled canvas
  const wrap=document.getElementById('pc-canvas-wrap-'+ck);
  if(wrap){
    wrap.style.height=Math.round(1123*scale+20)+'px';
    wrap.style.width='';  // auto — el overflow:auto maneja el scroll horizontal
    wrap.style.maxWidth='100%';
    wrap.style.overflowX='auto';
  }
  if(lbl)lbl.textContent=val+'%';
  if(sl)sl.value=val;
  // Save zoom
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  cfg.zoom=val;saveDB();
}

function pcSetCopies(ck,n){
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  cfg.copies=n;saveDB();
  [1,2,3,5].forEach(function(x){
    const btn=document.getElementById('pc-cop'+x+'-'+ck);
    if(btn){btn.style.background=x===n?'#4a5568':'';btn.style.color=x===n?'#fff':'';btn.style.borderColor=x===n?'#f7f7f7':'var(--border)';}
  });
  toast('Copias: ×'+n,'var(--text2)');
}

function pcToggleOrient(ck){
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  cfg.landscape=!cfg.landscape;saveDB();
  const btn=document.getElementById('pc-orient-'+ck);
  if(btn)btn.textContent=cfg.landscape?'↔ Horizontal':'↕ Vertical';
  const pv=document.getElementById('pv-'+ck);
  if(pv){
    if(cfg.landscape){pv.style.width='1123px';pv.style.height='794px';}
    else{pv.style.width='';pv.style.height='';}
  }
  toast(cfg.landscape?'Horizontal':'Vertical','var(--text2)');
}

function pcToggleBold(ck){
  const sk=window['pcSelKey_'+ck];const pl=window['pcPlaced_'+ck];
  if(!sk||!pl||!pl[sk])return;
  pl[sk].bold=!pl[sk].bold;
  const el=document.getElementById('pfc-'+ck+'-'+sk);
  if(el)el.style.fontWeight=pl[sk].bold?'900':'700';
  const btn=document.getElementById('pc-bold-'+ck);
  if(btn){btn.style.background=pl[sk].bold?'#4a5568':'';btn.style.color=pl[sk].bold?'#f7f7f7':'';}
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  cfg.fieldLayout=Object.assign({},pl);saveDB();
}

function pcToggleItalic(ck){
  const sk=window['pcSelKey_'+ck];const pl=window['pcPlaced_'+ck];
  if(!sk||!pl||!pl[sk])return;
  pl[sk].italic=!pl[sk].italic;
  const el=document.getElementById('pfc-'+ck+'-'+sk);
  if(el)el.style.fontStyle=pl[sk].italic?'italic':'normal';
  const btn=document.getElementById('pc-italic-'+ck);
  if(btn){btn.style.background=pl[sk].italic?'#4a5568':'';btn.style.color=pl[sk].italic?'#f7f7f7':'';}
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  cfg.fieldLayout=Object.assign({},pl);saveDB();
}

function pcToggleUnder(ck){
  const sk=window['pcSelKey_'+ck];const pl=window['pcPlaced_'+ck];
  if(!sk||!pl||!pl[sk])return;
  pl[sk].underline=!pl[sk].underline;
  const el=document.getElementById('pfc-'+ck+'-'+sk);
  if(el)el.style.textDecoration=pl[sk].underline?'underline':'none';
  const btn=document.getElementById('pc-under-'+ck);
  if(btn){btn.style.background=pl[sk].underline?'#4a5568':'';btn.style.color=pl[sk].underline?'#f7f7f7':'';}
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  cfg.fieldLayout=Object.assign({},pl);saveDB();
}

function pcSetAlign(ck,align){
  const sk=window['pcSelKey_'+ck];const pl=window['pcPlaced_'+ck];
  if(!sk||!pl||!pl[sk])return;
  pl[sk].align=align;
  const el=document.getElementById('pfc-'+ck+'-'+sk);
  if(el)el.style.textAlign=align;
  ['l','c','r'].forEach(function(a){
    const btn=document.getElementById('pc-al-'+a+'-'+ck);
    const map={l:'left',c:'center',r:'right'};
    if(btn){btn.style.background=map[a]===align?'#4a5568':'';btn.style.color=map[a]===align?'#f7f7f7':'';}
  });
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  cfg.fieldLayout=Object.assign({},pl);saveDB();
}

function pcToggleBg(ck){
  const sk=window['pcSelKey_'+ck];const pl=window['pcPlaced_'+ck];
  if(!sk||!pl||!pl[sk])return;
  pl[sk].noBg=!pl[sk].noBg;
  const el=document.getElementById('pfc-'+ck+'-'+sk);
  if(el)el.style.background=pl[sk].noBg?'transparent':'rgba(255,255,255,.96)';
  const btn=document.getElementById('pc-bg-'+ck);
  if(btn){btn.style.background=!pl[sk].noBg?'#4a5568':'';btn.style.color=!pl[sk].noBg?'#f7f7f7':'';}
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  cfg.fieldLayout=Object.assign({},pl);saveDB();
}

function pcToggleBorder(ck){
  const sk=window['pcSelKey_'+ck];const pl=window['pcPlaced_'+ck];
  if(!sk||!pl||!pl[sk])return;
  pl[sk].noBorder=!pl[sk].noBorder;
  const el=document.getElementById('pfc-'+ck+'-'+sk);
  if(el)el.style.border=pl[sk].noBorder?'none':'1.5px solid #000';
  const btn=document.getElementById('pc-brd-'+ck);
  if(btn){btn.style.background=!pl[sk].noBorder?'#4a5568':'';btn.style.color=!pl[sk].noBorder?'#f7f7f7':'';}
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  cfg.fieldLayout=Object.assign({},pl);saveDB();
}

function setPaperSize(cfgKey,size){
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  cfg.paperSize=size;saveDB();
  if(cfgKey==='ing2'){iF._sub2='print';renderIngresos2();}
  else if(cfgKey==='ag'){window._impSub='ag';renderImpresion();}
  else{window._impSub='ing1';renderImpresion();}
  setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);});
  toast(' Papel '+size,'#4a5568');
}

function setPrintCfgFont(cfgKey,font){
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  cfg.font=font;saveDB();
  if(cfgKey==='ag'){goTab('impresion',null);window._impSub='ag';renderImpresion();}
  else if(cfgKey==='ing2'){goTab('impresion',null);window._impSub='ing2';renderImpresion();}
  else{goTab('impresion',null);window._impSub='ing1';renderImpresion();}
  setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);});
}

function setPrintCfgMode(cfgKey,mode){
  if(!DB.printCfgModes)DB.printCfgModes={};
  DB.printCfgModes[cfgKey]=mode;
  saveDB();
  if(cfgKey==='ag'){goTab('impresion',null);window._impSub='ag';renderImpresion();}
  else if(cfgKey==='ing2'){goTab('impresion',null);window._impSub='ing2';renderImpresion();}
  else{goTab('impresion',null);window._impSub='ing1';renderImpresion();}
  setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);});
}

function setPrintCfgSize(cfgKey,size){
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  cfg.paperSize=size;saveDB();
  if(cfgKey==='ag'){goTab('impresion',null);window._impSub='ag';renderImpresion();}
  else if(cfgKey==='ing2'){goTab('impresion',null);window._impSub='ing2';renderImpresion();}
  else{goTab('impresion',null);window._impSub='ing1';renderImpresion();}
  setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);});
}

function printPreviewWithCfg(cfgKey){
  // Sync active template into cfg before preview (if one is "En vivo")
  if(cfgKey!=='ag'){
    const _activeName=(DB.printCfgModes||{})[cfgKey+'_activeTpl'];
    if(_activeName){
      const _tpl=(DB.printTemplates||[]).find(t=>t.name===_activeName);
      if(_tpl){
        const _cfg2=cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
        if(_tpl.fieldOrder)_cfg2.fieldOrder=[..._tpl.fieldOrder];
        if(_tpl.hiddenFields)_cfg2.hiddenFields=[..._tpl.hiddenFields];
        if(_tpl.paperSize)_cfg2.paperSize=_tpl.paperSize;
        if(_tpl.phrases)_cfg2.phrases={..._tpl.phrases};
        if(_tpl.font)_cfg2.font=_tpl.font;
        if(_tpl.puerta3)_cfg2.puerta3={..._tpl.puerta3};
        if(_tpl.phrase2!==undefined)_cfg2.phrase2=_tpl.phrase2;
        if(_tpl.qrTracking!==undefined)_cfg2.qrTracking=_tpl.qrTracking;
        if(_tpl.fieldLayout)_cfg2.fieldLayout={..._tpl.fieldLayout};else delete _cfg2.fieldLayout;
        _cfg2.canvasCleared=_tpl.canvasCleared||false;
        if(_tpl.mode)DB.printCfgModes[cfgKey]=_tpl.mode;
        _cfg2.ph1On=_tpl.ph1On===true;
        _cfg2.ph2On=_tpl.ph2On!==false;
        _cfg2.ph3On=_tpl.ph3On===true;
      }
    }
  }
  initPrintLayout(cfgKey);
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  const mode=(DB.printCfgModes||{})[cfgKey]||'normal';
  const size=cfg.paperSize||'A4';
  // If canvas was explicitly cleared AND has no fields placed, show blank preview
  const hasLayout=cfg.fieldLayout&&Object.keys(cfg.fieldLayout).length>0;
  if(cfg.canvasCleared&&!hasLayout){
    const w=window.open('','_blank','width=900,height=700');
    if(w){
      const pW=size==='A3'?'297mm':size==='A5'?'148mm':'210mm';
      w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Vista previa — vacía</title><script>document.addEventListener('keydown',function(e){if(e.key==='Escape')window.close();});<\/script>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px}
.page{width:${pW};min-height:285mm;background:#fff;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(0,0,0,.08);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
.msg{font-size:15px;font-weight:700;color:#64748b}.sub{font-size:12px;color:#94a3b8}
.btn{cursor:pointer;border:none;border-radius:8px;padding:10px 22px;font-size:13px;font-weight:700;background:#111;color:#fff}
</style></head><body>
<div class="page">
  <div style="font-size:48px">📋</div>
  <div class="msg">Canvas vacío — sin campos configurados</div>
  <div class="sub">Añade campos desde el panel izquierdo y vuelve a hacer Vista previa</div>
</div>
<button class="btn" onclick="window.close()">✕ Cerrar</button>
</body></html>`);
      w.document.close();
    }else toast('⚠ Activa ventanas emergentes','var(--amber)');
    return;
  }
  const isLib=cfgKey==='ing2';
  const _isAgPreview=cfgKey==='ag';
  const favId=cfg.favEventId||null;
  const ev=favId?DB.eventos.find(e=>e.id===favId):getActiveEvent();
  const tabPhrases=cfg.phrases||{};
  const uLang=CUR_LANG||'es';
  // Use last real ingreso if available, else demo data
  const _srcArr=cfgKey==='ing2'?(DB.ingresos2||[]):cfgKey==='ag'?DB.agenda:[...DB.ingresos];
  const _lastReal=_srcArr.length?_srcArr[_srcArr.length-1]:null;
  const _demoData={id:'preview-'+Date.now(),pos:'3',matricula:'AB1234CD',remolque:'TR5678X',nombre:'Jean',apellido:'Dupont',empresa:'Empresa Demo S.L.',hall:'5',halls:['5','3A'],stand:'B-200',puertaHall:'P3',llamador:'12345',referencia:'REF-001',montador:'MontajeXL',expositor:'ExpoDemo',telefono:'600123456',telPais:'+34',email:'demo@empresa.com',pasaporte:'12345678Z',pais:'España',lang:uLang,fechaNacimiento:'1985-03-15',tipoVehiculo:'semiremolque',descargaTipo:'mano',tipoCarga:'GOODS',entrada:nowL(),eventoNombre:ev?.nombre||'Demo Evento',eventoId:ev?.id,comentario:'Vista previa con datos reales'};
  const fake=_lastReal?Object.assign({},_lastReal,{_tabPhrases:tabPhrases,_phrase2:cfg.phrase2||'',_font:cfg.font||'Arial',_puerta3:cfg.puerta3||{},_isAg:cfgKey==='ag',_isLib:cfgKey==='ing2'||cfgKey==='ag',lang:_lastReal.lang||uLang}):Object.assign(_demoData,{_tabPhrases:tabPhrases,_phrase2:cfg.phrase2||'',_font:cfg.font||'Arial',_puerta3:cfg.puerta3||{},_isAg:cfgKey==='ag',_isLib:cfgKey==='ing2'||cfgKey==='ag'});
  if(_lastReal)toast('👁 Vista previa con último '+(_lastReal.matricula||'ingreso'),'#4a5568');
  window._printSizeOverride=size;
  if(mode==='troquel'){const o=Object.assign({},fake);o._isLib=isLib||_isAgPreview;printIngresoTroquelado(o);}
  else printIngresoFromObj(fake,isLib||_isAgPreview);
  setTimeout(()=>{window._printSizeOverride=null;},500);
}

function cfgHideAll(cfgKey){const c2=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:cfgKey==='cond'?DB.printCfgCond:cfgKey==='flota'?DB.printCfgFlota:DB.printCfg1;c2.hiddenFields=[...PRINT_DEF];saveDB();initPrintLayout(cfgKey);}

function cfgShowAll(cfgKey){const c2=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:cfgKey==='cond'?DB.printCfgCond:cfgKey==='flota'?DB.printCfgFlota:DB.printCfg1;c2.hiddenFields=[];saveDB();initPrintLayout(cfgKey);}

function printIngreso2(id){
  const i=(DB.ingresos2||[]).find(x=>x.id===id);if(!i){toast('No encontrado','var(--red)');return;}
  saveTabPhrases('ing2');
  _printWithActiveTpl('ing2',i,true,'ing2','normal');
}

function dlTemplatePapelera(){
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{ID:'',Origen:'ingresos2',Matricula:'AB1234CD',Empresa:'Empresa S.L.',BorradoPor:'control',Fecha:'2025-01-01 09:00'}]),'Papelera');
  XLSX.writeFile(wb,'plantilla_papelera.xlsx');toast('📋 Plantilla descargada');
}

function dlTemplateUsuarios(){
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Nombre:'Ramon1',PIN:'1234',Rol:'controlador_rampa',Idioma:'es'},{Nombre:'Cabina1',PIN:'5678',Rol:'editor',Idioma:'es'}]),'Usuarios');
  XLSX.writeFile(wb,'plantilla_usuarios.xlsx');toast('📋 Plantilla descargada');
}

function dlTemplateVehiculos(){
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Matricula:'AB1234CD',Conductor:'Nombre Apellido',Empresa:'Empresa S.L.',Telefono:'600123456',TelPais:'+34',Remolque:'TR1234',TipoVehiculo:'semiremolque',Idioma:'es',Ingresos:1,Evento:'Evento 2025',UltimoIngreso:'2025-01-01 09:00'}]),'Vehiculos');
  XLSX.writeFile(wb,'plantilla_vehiculos.xlsx');toast('📋 Plantilla descargada');
}

function renderImpresion(){
  if(!window._subRestored_impresion){window._subRestored_impresion=true;const _ls=_loadSubTab('impresion','ing1');if(_ls)window._impSub=_ls;}
  const sub=window._impSub||'ing1';
  const el=document.getElementById('tab-impresion');if(!el)return;
  // Check which template is assigned to each tab
  const _dm=DB.printCfgModes||{};
  const tabs=[
    ['ing1','🔖 Referencia','dest_ing1'],
    ['ing2','🚛 Ingresos','dest_ing2'],
    ['ag','📅 Agenda','dest_ag'],
    ['cond','👤 Conductores','dest_cond'],
    ['flota','📦 Embalaje','dest_flota']
  ];
  el.innerHTML=`<div class="app-main" style="max-width:1600px;margin:0 auto;padding:1px 14px 14px;overflow-x:auto;-webkit-overflow-scrolling:touch">
    <div style="display:flex;gap:2px;margin-bottom:6px;border-bottom:0.5px solid var(--border);padding-bottom:6px;align-items:center;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none">
      ${tabs.map(([k,l,dk])=>{
        const ico=PRINT_ICONS[k]||'';
        const name=l.split(' ').slice(1).join(' ')||l;
        const assignedTpl=_dm[dk]||null;
        const isActive=sub===k;
        return`<button onclick="window._impSub='${k}';_saveSubTab('impresion','${k}');renderImpresion()"
          title="${l}${assignedTpl?' — '+assignedTpl:' — Sin plantilla'}"
          style="display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:7px;border:1.5px solid ${isActive?'#3a4558':'var(--border)'};background:${isActive?'#4a5568':'var(--bg)'};color:${isActive?'#f7f7f7':'var(--text2)'};cursor:pointer;font-size:11px;font-weight:${isActive?'700':'400'};white-space:nowrap;box-shadow:${isActive?'0 2px 5px rgba(0,0,0,.15)':'0 1px 2px rgba(0,0,0,.06)'}">
          ${ico}
          ${isActive?`<span>${name}</span>`:''}
        </button>`;
      }).join('')}
    </div>
    ${_ingPrintCfg(sub)}
  </div>`;
  setTimeout(()=>{initPrintLayout(sub);initPcCanvas(sub);const _lp=document.getElementById('pcfg-'+sub);if(_lp){const _leftPanel=_lp.querySelector('[style*="flex-direction:column"][style*="gap:8px"]');if(_leftPanel)_pcInitSectionDrag(_leftPanel);}},100);
}

function showPrintMenu(evt,id,col){
  evt.stopPropagation();
  document.getElementById('trkDropdown')?.remove();
  // Get the ingreso object
  let ing=null;
  if(col==='ingresos')ing=DB.ingresos.find(x=>x.id===id);
  else if(col==='ingresos2')ing=(DB.ingresos2||[]).find(x=>x.id===id);
  else if(col==='agenda'){
    const ag=DB.agenda.find(x=>x.id===id);
    if(ag)ing=[...DB.ingresos,...(DB.ingresos2||[])].find(i=>i.matricula===ag.matricula&&!i.salida)||ag;
  }
  if(!ing){toast('No hay datos para imprimir','var(--red)');return;}
  const isLib=col==='ingresos2';
  // Saved templates
  const tpls=(DB.printTemplates||[]);
  const tplItems=tpls.length?`<div style="border-top:1px solid var(--border);padding:4px 0"><div style="font-size:9px;font-weight:800;color:var(--text3);padding:3px 12px;text-transform:uppercase">📋 Plantillas guardadas</div>${tpls.map(t=>`<div onclick="loadAndPrint('${t.name}','${id}','${col}')" style="padding:6px 12px;cursor:pointer;font-size:12px;font-weight:700" onmouseover="this.style.background='var(--bll)'" onmouseout="this.style.background=''">${t.ico||''} ${t.name}</div>`).join('')}</div>`:'';
  const d=document.createElement('div');
  d.id='trkDropdown';
  d.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;z-index:9998';
  const rect=evt.target.getBoundingClientRect();
  d.innerHTML=`<div style="position:fixed;top:${Math.min(rect.bottom+4,window.innerHeight-280)}px;left:${Math.min(rect.left,window.innerWidth-200)}px;background:var(--bg2);border:1.5px solid var(--border2);border-radius:var(--r);box-shadow:var(--sh2);min-width:190px;z-index:9999;padding:4px 0">
    <div style="font-size:9px;font-weight:800;color:var(--text3);padding:3px 12px;text-transform:uppercase">🖨 Formato</div>
    <div onclick="printIngresoFromObj(${col==='agenda'?'DB.ingresos.find(x=>x.matricula===DB.agenda.find(a=>a.id===\''+id+'\')?.matricula)||DB.agenda.find(a=>a.id===\''+id+'\')':'DB.'+col+'.find(x=>x.id===\''+id+'\')'},${isLib})" style="padding:7px 12px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">Normal A4</div>
    <div onclick="printIngresoTroquelado(${col==='agenda'?'DB.ingresos.find(x=>x.matricula===DB.agenda.find(a=>a.id===\''+id+'\')?.matricula)||DB.agenda.find(a=>a.id===\''+id+'\')':'DB.'+col+'.find(x=>x.id===\''+id+'\')'})" style="padding:7px 12px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">✂ Troquelado A4</div>
    <div onclick="printIngresoSize(${col==='agenda'?'DB.ingresos.find(x=>x.matricula===DB.agenda.find(a=>a.id===\''+id+'\')?.matricula)||DB.agenda.find(a=>a.id===\''+id+'\')':'DB.'+col+'.find(x=>x.id===\''+id+'\')'},'A3',${isLib})" style="padding:7px 12px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">📋 Normal A3</div>
    <div onclick="printIngresoSize(${col==='agenda'?'DB.ingresos.find(x=>x.matricula===DB.agenda.find(a=>a.id===\''+id+'\')?.matricula)||DB.agenda.find(a=>a.id===\''+id+'\')':'DB.'+col+'.find(x=>x.id===\''+id+'\')'},'A5',${isLib})" style="padding:7px 12px;cursor:pointer;font-size:12px;font-weight:700;display:flex;align-items:center;gap:4px" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">🗒 Mitad A5</div>
    ${tplItems}
  </div>`;
  d.onclick=(e)=>{if(e.target===d)d.remove();};
  document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){d.remove();document.removeEventListener('keydown',esc);}});
  document.body.appendChild(d);
}

function printIngresoSize(ing,size,isLib){
  if(!ing)return;
  // Override page size via CSS in the print window
  const origFn=window._printSizeOverride;
  window._printSizeOverride=size;
  printIngresoFromObj(ing,isLib);
  setTimeout(()=>{window._printSizeOverride=null;},500);
}

function loadAndPrint(tplName,id,col){
  document.getElementById('trkDropdown')?.remove();
  let ing=null;
  if(col==='ingresos')ing=DB.ingresos.find(x=>x.id===id);
  else if(col==='ingresos2')ing=(DB.ingresos2||[]).find(x=>x.id===id);
  else if(col==='agenda'){const ag=DB.agenda.find(x=>x.id===id);if(ag)ing=[...DB.ingresos,...(DB.ingresos2||[])].find(i=>i.matricula===ag.matricula)||ag;}
  if(!ing)return;
  const tpl=(DB.printTemplates||[]).find(t=>t.name===tplName);
  if(!tpl){printIngresoFromObj(ing,col==='ingresos2');return;}
  // Apply template config temporarily
  const cfgKey=col==='ingresos2'?'ing2':'ing1';
  const saved=JSON.parse(JSON.stringify(col==='ingresos2'?DB.printCfg2:DB.printCfg1));
  if(cfgKey==='ing2')DB.printCfg2={...DB.printCfg2,...tpl};
  else DB.printCfg1={...DB.printCfg1,...tpl};
  if(tpl.mode==='troquel')printIngresoTroquelado(ing);
  else printIngresoFromObj(ing,col==='ingresos2');
  setTimeout(()=>{if(cfgKey==='ing2')DB.printCfg2=saved;else DB.printCfg1=saved;},500);
}

function _printWithActiveTpl(cfgKey,ing,isLib,destKey,fallbackMode){
  // Apply template cfg synchronously so window.open is called in same event tick
  const modes=DB.printCfgModes||{};
  const dk=destKey||cfgKey;
  const activeName=modes['dest_'+dk]||modes[cfgKey+'_activeTpl'];
  const tpl=activeName?(DB.printTemplates||[]).find(t=>t.name===activeName):null;
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  // Snapshot current cfg to restore after print
  const saved=JSON.parse(JSON.stringify(cfg));
  // Apply template fields if found
  if(tpl){
    if(tpl.fieldOrder)cfg.fieldOrder=[...tpl.fieldOrder];
    if(tpl.hiddenFields)cfg.hiddenFields=[...tpl.hiddenFields];
    if(tpl.paperSize)cfg.paperSize=tpl.paperSize;
    if(tpl.phrases)cfg.phrases={...tpl.phrases};
    if(tpl.font)cfg.font=tpl.font;
    if(tpl.puerta3)cfg.puerta3={...tpl.puerta3};
    if(tpl.phrase2!==undefined)cfg.phrase2=tpl.phrase2;
    if(tpl.qrTracking!==undefined)cfg.qrTracking=tpl.qrTracking;
    if(tpl.fieldLayout)cfg.fieldLayout={...tpl.fieldLayout};else delete cfg.fieldLayout;
    cfg.canvasCleared=tpl.canvasCleared||false;
    cfg.ph1On=tpl.ph1On===true;
    cfg.ph2On=tpl.ph2On!==false;
    cfg.ph3On=tpl.ph3On===true;
    if(tpl.mode)modes[cfgKey]=tpl.mode;
  } else if(activeName){
    toast('⚠ Plantilla "'+activeName+'" no encontrada — usando cfg actual','var(--amber)');
  }
  // Print synchronously in same event loop tick
  const mode=modes[cfgKey]||fallbackMode||'normal';
  const size=cfg.paperSize||'A4';
  if(size!=='A4')window._printSizeOverride=size;
  if(mode==='troquel'){const o=Object.assign({},ing);o._isLib=isLib;printIngresoTroquelado(o);}
  else printIngresoFromObj(ing,isLib);
  // Restore cfg after window opens
  setTimeout(()=>{Object.assign(cfg,saved);window._printSizeOverride=null;},800);
}

function printTrqRef(id){
  const i=DB.ingresos.find(x=>x.id===id);if(!i)return;
  saveTabPhrases('ing1');
  _printWithActiveTpl('ing1',i,false,'ing1','troquel');
}

function printTrqIng(id){
  const i=(DB.ingresos2||[]).find(x=>x.id===id);if(!i)return;
  saveTabPhrases('ing2');
  _printWithActiveTpl('ing2',i,true,'ing2','troquel');
}

function printIngreso(id){
  const i=DB.ingresos.find(x=>x.id===id);if(!i){toast('No encontrado','var(--red)');return;}
  saveTabPhrases('ing1');
  _printWithActiveTpl('ing1',i,false,'ing1','normal');
}

function imprimirYGuardarConTpl(fallbackMode){
  if(!canPrint()){toast('Sin permiso para imprimir','var(--red)');return;}
  const mat=(document.getElementById('fiMat').value||'').trim().toUpperCase();
  if(!mat){toast('Matrícula obligatoria','var(--red)');return;}
  const cfgK=_ingSource==='ingresos2'?'ing2':'ing1';
  const isLib=_ingSource==='ingresos2';
  saveIngreso();
  setTimeout(()=>{
    const col=_ingSource==='ingresos2'?'ingresos2':'ingresos';
    const i=(DB[col]||[]).find(x=>x.matricula===mat&&!x.salida)||(DB[col]||[]).filter(x=>x.matricula===mat).sort((a,b)=>(b.entrada||'').localeCompare(a.entrada||''))[0];
    if(i)_printWithActiveTpl(cfgK,i,isLib,cfgK,fallbackMode||'normal');
  },400);
}

function initPrintLayout(cfgKey){
  const cfg=cfgKey==='ag'?DB.printCfgAg:(cfgKey==='ing2'?DB.printCfg2:DB.printCfg1);
  if(!cfg.fieldOrder)cfg.fieldOrder=[...PRINT_DEF];
  if(!cfg.hiddenFields)cfg.hiddenFields=[];
  const gridId=cfgKey==='ag'?'printLayoutGridAg':cfgKey==='ing2'?'printLayoutGrid2':'printLayoutGrid';
  const grid=document.getElementById(gridId);if(!grid)return;
  const all=[...cfg.fieldOrder];PRINT_DEF.forEach(f=>{if(!all.includes(f))all.push(f);});
  const LABELS={posicion:'Posición',matricula:'Matrícula',llamador:'Llamador',ref:'Referencia',empresa:'Empresa',montador:'Montador',expositor:'Expositor',hall:'Hall',stand:'Stand',puertaHall:'Puerta Hall',remolque:'Remolque',nombre:'Nombre',apellido:'Apellido',pasaporte:tr('pasaporte'),telefono:'Teléfono',email:'Email',comentario:'Comentario',tipoVehiculo:'Tipo Vehículo',descargaTipo:tr('descarga'),tipoCarga:tr('carga'),fechaNacimiento:'F.Nacimiento',pais:tr('phCountryName'),horario:'Hora ingreso'};
  grid.innerHTML=all.map((f,idx)=>`<div class="pfi${cfg.hiddenFields.includes(f)?' hidden-f':''}" draggable="true" data-field="${f}" data-cfg="${cfgKey||'ing1'}" ondragstart="pfiDS(event)" ondragover="pfiDO(event)" ondrop="pfiDP(event,this.dataset.cfg)" ondragend="pfiDE(event)">
    <div style="display:flex;align-items:center;gap:4px;width:100%">
      <div style="display:flex;flex-direction:column;gap:0;margin-right:2px">
        <button onclick="event.stopPropagation();movePrintField('${cfgKey}',${idx},-1)" style="background:none;border:none;cursor:pointer;padding:0;font-size:9px;line-height:1;color:var(--text3)">▲</button>
        <button onclick="event.stopPropagation();movePrintField('${cfgKey}',${idx},1)" style="background:none;border:none;cursor:pointer;padding:0;font-size:9px;line-height:1;color:var(--text3)">▼</button>
      </div>
      <span style="flex:1;font-size:11px" onclick="togglePF('${f}','${cfgKey||'ing1'}')">${LABELS[f]||f}</span>
      <span onclick="togglePF('${f}','${cfgKey||'ing1'}')" style="font-size:12px;opacity:.6;cursor:pointer">${cfg.hiddenFields.includes(f)?'🙈':'👁'}</span>
    </div>
  </div>`).join('');
}

function movePrintField(cfgKey,idx,dir){
  const cfg=cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  if(!cfg.fieldOrder)cfg.fieldOrder=[...PRINT_DEF];
  const newIdx=idx+dir;
  if(newIdx<0||newIdx>=cfg.fieldOrder.length)return;
  const arr=cfg.fieldOrder;
  [arr[idx],arr[newIdx]]=[arr[newIdx],arr[idx]];
  saveDB();initPrintLayout(cfgKey);
}

function printPreview(cfgKey){printPreviewWithCfg(cfgKey||'ing1');}

function setActivePrintMode(mode, cfgKey){
  const btnN=document.getElementById('btnPreviewNormal_'+cfgKey);
  const btnT=document.getElementById('btnPreviewTrq_'+cfgKey);
  if(btnN&&btnT){
    if(mode==='normal'){
      btnN.style.background='#4a5568';btnN.style.color='#fff';btnN.style.borderColor='#4a5568';
      btnT.style.background='var(--bg3)';btnT.style.color='var(--text)';btnT.style.borderColor='var(--border2)';
    } else {
      btnT.style.background='#4a5568';btnT.style.color='#f7f7f7';btnT.style.borderColor='#3a4558';
      btnN.style.background='var(--bg3)';btnN.style.color='var(--text)';btnN.style.borderColor='var(--border2)';
    }
  }
  if(!DB.printCfgModes)DB.printCfgModes={};
  DB.printCfgModes[cfgKey]=mode;
  saveDB();
}

function setFormPrintMode(mode){
  const cfgK=(_ingSource||'ingresos')==='ingresos2'?'ing2':'ing1';
  if(!DB.printCfgModes)DB.printCfgModes={};
  DB.printCfgModes[cfgK]=mode;
  saveDB();
  const btnN=document.getElementById('btnNormalA4Form');
  const btnT=document.getElementById('btnTroquelA4Form');
  if(btnN&&btnT){
    if(mode==='normal'){
      btnN.style.background='var(--teal)';btnN.style.color='#fff';btnN.style.borderColor='var(--teal)';
      btnT.style.background='var(--bg3)';btnT.style.color='var(--text)';btnT.style.borderColor='var(--border2)';
    } else {
      btnT.style.background='#4a5568';btnT.style.color='#f7f7f7';btnT.style.borderColor='#3a4558';
      btnN.style.background='var(--bg3)';btnN.style.color='var(--text)';btnN.style.borderColor='var(--border2)';
    }
  }
}

function printPreviewTroquelado(cfgKey){
  const ck=cfgKey||'ing1';
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  const tabPhrases=cfg.phrases||{};const uLang=CUR_LANG||'es';
  const favId=cfg.favEventId||null;
  const ev=favId?DB.eventos.find(e=>e.id===favId):getActiveEvent();
  const fake={id:'preview-trq',pos:'1',matricula:'AB1234CD',remolque:'TR5678',nombre:'Juan',apellido:'García',empresa:'Empresa Demo S.L.',hall:'2',halls:['2'],stand:'A-15',puertaHall:'P3',telefono:'600123456',telPais:'+34',lang:uLang,tipoVehiculo:'trailer',descargaTipo:'mano',entrada:nowL(),eventoNombre:ev?.nombre||'Demo',eventoId:ev?.id,
    _tabPhrases:tabPhrases,_phrase2:cfg.phrase2||'',_font:cfg.font||'Arial',_puerta3:cfg.puerta3||{},_isAg:ck==='ag',_isLib:ck==='ing2'||ck==='ag'};
  printIngresoTroquelado(fake);
}

function toggleTplDest(tplName,destKey,cfgKey){
  if(!DB.printCfgModes)DB.printCfgModes={};
  if(DB.printCfgModes[destKey]===tplName){delete DB.printCfgModes[destKey];}
  else{DB.printCfgModes[destKey]=tplName;}
  saveDB();
  if(cfgKey==='ag'){goTab('impresion',null);window._impSub='ag';renderImpresion();}
  else if(cfgKey==='ing2'){goTab('impresion',null);window._impSub='ing2';renderImpresion();}
  else{goTab('impresion',null);window._impSub='ing1';renderImpresion();}
  setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);});
  const dNames={'dest_ing1':'Referencia','dest_ing2':'Ingresos','dest_ag':'Agenda'};
  const assigned=DB.printCfgModes[destKey]===tplName;
  toast((assigned?'✓ ':'✕ ')+(dNames[destKey]||destKey)+' → '+(assigned?tplName:'sin plantilla'),'var(--text2)');
}

function delPrintTpl(idx,cfgKey){
  const tpl=DB.printTemplates[idx];if(!tpl)return;
  askDel('Eliminar plantilla','<b>'+tpl.name+'</b><br><span style="font-size:11px;color:var(--text3)">'+tr('deleteConfirm')+'</span>',()=>{
    DB.printTemplates.splice(idx,1);saveDB();
    if(curTab==='eventos')renderEventosTab();
    else{const isI2=cfgKey==='ing2';if(isI2){iF._sub2='print';renderIngresos2();}else{iF._sub='print';renderIngresos();}}
    toast('🗑 Plantilla eliminada','var(--red)');
  });
}

function editPrintTpl(idx,cfgKey){
  // ✏️ = Cargar plantilla en canvas para editar + poner nombre en input
  const tpl=DB.printTemplates[idx];if(!tpl)return;
  loadPrintTemplate(tpl.name,cfgKey);
  // Fill name input after render so user can overwrite
  const fillTplName=()=>{
    const inp=document.getElementById('pctpl-name-'+cfgKey);
    if(inp){inp.value=tpl.name;inp.focus();inp.select();}
  };
  if(cfgKey==='ag'){window._agSubTab='print';renderAgenda();setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);setTimeout(fillTplName,150);},80);}
  else if(cfgKey==='ing2'){iF._sub2='print';renderIngresos2();setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);setTimeout(fillTplName,150);},80);}
  else if(cfgKey==='ing1'){iF._sub='print';renderIngresos();setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);setTimeout(fillTplName,150);},80);}
  else{window._impSub=cfgKey;renderImpresion();setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);setTimeout(fillTplName,150);},80);}
  toast('✏️ Plantilla cargada para editar — modifica y pulsa Guardar','#4a5568');
}

function loadPrintTemplate(name,cfgKey){
  const tpl=DB.printTemplates.find(t=>t.name===name);if(!tpl)return;
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  if(tpl.fieldOrder)cfg.fieldOrder=[...tpl.fieldOrder];
  if(tpl.hiddenFields)cfg.hiddenFields=[...tpl.hiddenFields];
  if(tpl.paperSize)cfg.paperSize=tpl.paperSize;
  if(tpl.phrases)cfg.phrases={...tpl.phrases};
  if(tpl.font)cfg.font=tpl.font;
  if(tpl.puerta3)cfg.puerta3={...tpl.puerta3};
  if(tpl.phrase2!==undefined)cfg.phrase2=tpl.phrase2;
  if(tpl.favEventId!==undefined)cfg.favEventId=tpl.favEventId;
  if(tpl.qrTracking!==undefined)cfg.qrTracking=tpl.qrTracking;
  // Restore canvas layout if saved
  if(tpl.fieldLayout)cfg.fieldLayout={...tpl.fieldLayout};else delete cfg.fieldLayout;
  cfg.canvasCleared=tpl.canvasCleared||false;
  if(tpl.bgImage){cfg.bgImage=tpl.bgImage;cfg.bgOpacity=tpl.bgOpacity||0.35;}else{delete cfg.bgImage;delete cfg.bgOpacity;}
  cfg.ph1On=tpl.ph1On===true;
  cfg.ph2On=tpl.ph2On!==false;
  cfg.ph3On=tpl.ph3On===true;
  if(tpl.labelMode!==undefined){cfg.labelMode=tpl.labelMode;_pcLabelMode[cfgKey]=tpl.labelMode;}
  // Track which template is active "En vivo"
  if(!DB.printCfgModes)DB.printCfgModes={};
  DB.printCfgModes[cfgKey+'_activeTpl']=name;
  if(tpl.mode)DB.printCfgModes[cfgKey]=tpl.mode;
  saveDB();
  if(cfgKey==='ag'){window._agSubTab='print';renderAgenda();setTimeout(()=>initPrintLayout('ag'),100);}
  else renderPrintCfg(cfgKey);
  toast('📋 Plantilla "'+name+'" cargada y activa','#4a5568');
}

function renderPrintCfg(cfgKey){
  _printCfgKey=cfgKey||'ing1';
  if(curTab==='ingresos2'){iF._sub2='print';renderIngresos2();}
  else{goTab('impresion',null);window._impSub='ing1';renderImpresion();}
  setTimeout(()=>initPrintLayout(cfgKey||'ing1'),100);
}

function _getPrintCfg(ing,isLib){
  return ing._isAg?DB.printCfgAg:isLib?DB.printCfg2:DB.printCfg1;
}

function _buildPrintHtml(ing,isLib,forceMode){
  var cfg=_getPrintCfg(ing,isLib);
  var mode=forceMode||(DB.printCfgModes||{})[isLib?'ing2':'ing1']||'normal';
  var isTroquel=mode==='troquel';
  var lang=ing.lang||'es';
  var t=LANGS[lang];
  if(!t){console.warn('⚠ Idioma no encontrado en LANGS:',lang,'→ usando es');t=LANGS.es||LANGS.en;}
  var now=new Date();
  var ev=ing.eventoId?DB.eventos.find(function(e){return e.id===ing.eventoId;}):getActiveEvent();
  var uLang=CUR_LANG||'es';
  var ph1On=cfg&&cfg.ph1On===true;
  var ph2On=cfg&&cfg.ph2On!==false;
  var ph3On=cfg&&cfg.ph3On===true;
  var phrases=cfg&&cfg.phrases||{};
  var phrase1=ph1On?(phrases[uLang]||phrases.es||''):'';
  var phrase1drv=ph1On&&lang!==uLang?(phrases[lang]||phrase1):phrase1;
  var phrase2=ph2On?(cfg&&cfg.phrase2||''):'';
  var puerta3=ph3On?(cfg&&cfg.puerta3||{}):{};
  var font=(cfg&&cfg.font)||'Arial';
  var paperSize=window._printSizeOverride||(cfg&&cfg.paperSize)||'A4';
  var pW=paperSize==='A3'?'297mm':paperSize==='A5'?'148mm':'210mm';
  var pH=paperSize==='A3'?'420mm':paperSize==='A5'?'148mm':'297mm';
  var halls=(ing.halls||[ing.hall||'']).filter(Boolean);
  var hallStr=halls.join(' / ')||'';
  var posNum=ing.pos||'';
  var mat=ing.matricula||'';
  var tel=(ing.telPais||'')+' '+(ing.telefono||'');
  var ln=checkBL(mat);
  var qrOn=cfg&&cfg.qrTracking!==false;
  var qrUrl=getQrBase()+'?track='+(ing.id||'').slice(0,8).toUpperCase();

  var layout=cfg&&cfg.fieldLayout||{};
  var hasLayout=Object.keys(layout).length>0;

  // No layout = show message
  if(!hasLayout){
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+tr('sinPlantilla')+'</title>'
      +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;flex-direction:column;gap:16px}'
      +'.card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:32px 40px;text-align:center;max-width:400px}'
      +'.ico{font-size:48px;margin-bottom:4px}.ttl{font-size:18px;font-weight:700;color:#0f172a;margin-bottom:8px}'
      +'.sub{font-size:13px;color:#64748b;line-height:1.6}'
      +'.btn{margin-top:20px;cursor:pointer;border:none;border-radius:8px;padding:10px 22px;font-size:14px;font-weight:700;background:#111;color:#fff}'
      +'</style></head><body>'
      +'<div class="card"><div class="ico">🖨</div>'
      +'<div class="ttl">'+tr('sinPlantillaConf')+'</div>'
      +'<div class="sub">Ve al tab <b>Impresión</b>, configura los campos en el canvas y guarda la plantilla.<br><br>Asigna la plantilla a <b>'+tr('ingresos')+'</b> o <b>'+tr('ingresos2')+'</b> con los chips Ref / Ing.</div>'
      +'<button class="btn" onclick="window.close()">'+tr('close')+'</button></div>'
      +'</body></html>';
  }

  var VAL={
    posicion:posNum,matricula:mat,telefonoCompleto:tel.trim(),
    nombreCompleto:((ing.nombre||'')+' '+(ing.apellido||'')).trim(),
    empresa:ing.empresa||'',expositor:ing.expositor||'',
    montador:ing.montador||'',hall:hallStr,stand:ing.stand||'',
    puertaHall:ing.puertaHall||'',remolque:ing.remolque||'',
    tipoVehiculo:({trailer:tr('trailerType'),semiremolque:'B Semiremolque',camion:'A Camión'}[ing.tipoVehiculo]||ing.tipoVehiculo||''),
    descargaTipo:({mano:'A Mano',maquinaria:'Maquinaria'}[ing.descargaTipo]||ing.descargaTipo||''),
    tipoCarga:ing.tipoCarga||'',referencia:ing.referencia||'',
    llamador:ing.llamador||'',pasaporte:ing.pasaporte||'',
    email:ing.email||'',pais:ing.pais||'',
    fechaNacimiento:ing.fechaNacimiento||'',
    comentario:ing.comentario||'',
    horario:ing.entrada?new Date(ing.entrada.replace(' ','T')).toLocaleString(undefined,{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'',
    eventoNombre:ing.eventoNombre||ev&&ev.nombre||'',
    pase:ing.pase||'',gpsUrl:ing.gpsUrl||''
  };
  var LABEL={
    posicion:'Pos.',matricula:'Matricula',telefonoCompleto:'Telefono',
    nombreCompleto:(t.Nom||'Nombre'),empresa:(t.Emp||'Empresa'),
    expositor:(t.Exp||'Expositor'),montador:(t.Mon||'Montador'),
    hall:(t.Hal||'Hall'),stand:(t.Std||'Stand'),puertaHall:'Puerta Hall',
    remolque:(t.Rem||'Remolque'),tipoVehiculo:'Tipo Vehiculo',
    descargaTipo:tr('descarga'),tipoCarga:'Tipo Carga',referencia:'Referencia',
    llamador:'Llamador',pasaporte:'Pasaporte/DNI',email:'Email',
    pais:'Pais',fechaNacimiento:'F.Nacimiento',comentario:'Comentario',
    horario:'Hora ingreso',eventoNombre:'Evento',pase:'Pase/Acceso',gpsUrl:'GPS'
  };

  var chipsHtml='';
  var bln=checkBL(mat);
  var labelMode=(cfg&&cfg.labelMode)||0;
  Object.keys(layout).forEach(function(k){
    var p=layout[k];
    var baseK=k.replace(/_\d+$/,'');
    var val=VAL[baseK]||'';
    var lbl=LABEL[baseK]||baseK;
    // Scale: canvas ~440px wide maps to A4 210mm. At 96dpi A4=794px. Factor≈1.8
    // Use pt for print fidelity: 1px canvas ≈ 0.75pt print
    var fs=Math.round((p.fs||8)*0.95);
    var fsLbl=Math.max(fs-3,5);
    var inner='';
    if(labelMode===2){
      // Solo Valor — no label at all
      if(val){
        inner='<span style="font-size:'+fs+'px;font-weight:700;color:#000">'+val+'</span>';
      } else {
        inner='<span style="display:inline-block;width:80px;border-bottom:1px solid #000;vertical-align:bottom">&nbsp;</span>';
      }
    } else if(labelMode===1||p.line){
      // Etiq+Línea
      inner='<span style="font-size:'+fsLbl+'px;color:#888;text-transform:uppercase;letter-spacing:.4px">'+lbl+' </span><span style="display:inline-block;width:80px;border-bottom:1px solid #000;vertical-align:bottom">&nbsp;</span>';
    } else {
      // Etiq+Valor
      inner='<span style="font-size:'+fsLbl+'px;color:#888;text-transform:uppercase;letter-spacing:.4px">'+lbl+': </span><span style="font-size:'+fs+'px;font-weight:700;color:#000">'+val+'</span>';
    }
    chipsHtml+='<div style="position:absolute;left:'+p.x+'%;top:'+p.y+'%;font-family:\''+font+'\',Arial,sans-serif;line-height:1.3;white-space:nowrap">'+inner+'</div>';
  });

  var ph1Html=phrase1?('<div style="position:absolute;left:4%;right:4%;top:auto;background:#fffbeb;border:1px solid #c8b48a;border-radius:4px;padding:3px 7px;font-size:7px;font-weight:700;font-family:\''+font+'\',Arial,sans-serif;color:#92400e">'+(phrase1drv&&phrase1drv!==phrase1?'<span style="font-size:6px;color:#b45309">'+phrase1drv+'</span><br>':'')+phrase1+'</div>'):'';
  var ph2Html=phrase2?('<div style="position:absolute;bottom:6px;left:4%;right:4%;border:1px solid #000;padding:2px 6px;font-size:6.5px;font-weight:700;font-family:\''+font+'\',Arial,sans-serif;line-height:1.4">'+phrase2+'</div>'):'';
  var ph3Html=(puerta3.nombre||puerta3.url)?('<div style="position:absolute;bottom:6px;right:4%;border:1px solid #3a4558;padding:2px 6px;font-size:6px;font-weight:700;font-family:\''+font+'\',Arial,sans-serif;color:#166534;background:#f8fafc">'+(puerta3.nombre||puerta3.url)+'</div>'):'';
  var lnHtml=bln?('<div style="position:absolute;top:2%;left:4%;right:4%;background:#fef2f2;border:2px solid #8b3a3a;border-radius:4px;padding:3px 8px;font-size:7px;font-weight:700;color:#8b3a3a;font-family:\''+font+'\',Arial,sans-serif">&#9888; '+(bln.nivel||'').toUpperCase()+': '+bln.motivo+'</div>'):'';
  var bgImg=cfg&&cfg.bgImage?('<img src="'+cfg.bgImage+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;opacity:'+(cfg.bgOpacity||0.35)+';">'):'';
  var cutLine=isTroquel?'<div style="position:absolute;top:50%;left:0;right:0;height:2px;background:#000"></div>':'';

  var html='<!DOCTYPE html><html lang="'+lang+'"><head><meta charset="UTF-8"><title>'+mat+'</title>'
    +'<style>*{box-sizing:border-box;margin:0;padding:0}'
    +'@page{size:'+paperSize+' portrait;margin:0}'
    +'body{font-family:\''+font+'\',Arial,sans-serif;background:#fff;width:'+pW+'}'
    +'.page{position:relative;width:'+pW+';height:'+pH+';background:#fff;overflow:hidden}'
    +'.btn-wrap{position:fixed;bottom:16px;right:16px;display:flex;gap:8px;z-index:999}'
    +'@media print{.btn-wrap{display:none}}'
    +'</style></head><body>'
    +'<div class="page">'
    +bgImg+lnHtml+chipsHtml+ph1Html+ph2Html+ph3Html+cutLine
    +'</div>'
    +'<div class="btn-wrap">'
    +'<button onclick="window.print()" style="background:#4a5568;color:#fff;border:none;border-radius:20px;padding:10px 22px;font-size:14px;font-weight:800;cursor:pointer">'+tr('print')+'</button>'
    +'<button onclick="window.close()" style="background:#fff;color:#f7f7f7;border:1.5px solid #ccc;border-radius:20px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer">X</button>'
    +'</div>'
    +'<script>'
    +'document.addEventListener(\'keydown\',function(e){if(e.key===\'Escape\')window.close();});'
    +'(function(){'
    +'var qrUrl="'+qrUrl+'";'
    +'function doQR(id){var el=document.getElementById(id);if(!el)return;try{new QRCode(el,{text:qrUrl,width:40,height:40,correctLevel:QRCode.CorrectLevel.M});}catch(e){}}'
    +'function loadQR(){doQR("pqr1");doQR("pqr2");}'
    +'if(typeof QRCode!=="undefined"){loadQR();}else{var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";s.onload=loadQR;document.head.appendChild(s);}'
    +'setTimeout(function(){window.print();},800);'
    +'})();'
    +'<\/script>'
    +'</body></html>';
  return html;
}

function printIngresoFromObj(ing,isLib){
  var html=_buildPrintHtml(ing,isLib,'normal');
  var w=window.open('','_blank','width=900,height=1200,scrollbars=yes');
  if(w){w.document.write(html);w.document.close();}
  else toast('Activa ventanas emergentes en el navegador','var(--amber)');
}

function printIngresoTroquelado(ing){
  var isLib=ing._isLib||false;
  var html=_buildPrintHtml(ing,isLib,'troquel');
  var w=window.open('','_blank','width=900,height=1200,scrollbars=yes');
  if(w){w.document.write(html);w.document.close();}
  else toast('Activa ventanas emergentes en el navegador','var(--amber)');
}

function imprimirYGuardarTroquelado(){
  var mat=(document.getElementById('fiMat').value||'').trim().toUpperCase();
  if(!mat){toast('Matricula obligatoria','var(--red)');return;}
  var isLib=_ingSource==='ingresos2';
  saveIngreso();
  setTimeout(function(){
    var col=isLib?'ingresos2':'ingresos';
    var i=(DB[col]||[]).find(function(x){return x.matricula===mat&&!x.salida;});
    if(!i)i=(DB[col]||[]).filter(function(x){return x.matricula===mat;}).sort(function(a,b){return(b.entrada||'').localeCompare(a.entrada||'');})[0];
    if(i)_printWithActiveTpl(isLib?'ing2':'ing1',i,isLib,isLib?'ing2':'ing1','troquel');
  },400);
}

function printAgendaItem(a){
  if(!a)return;
  const ing=[...DB.ingresos,...(DB.ingresos2||[])].find(i=>i.matricula===a.matricula&&!i.salida)||a;
  const merged={...a,...ing,matricula:a.matricula,_isAg:true,_isLib:true};
  _printWithActiveTpl('ag',merged,true,'ag','normal');
}

function _printAgendaItem_legacy(a){
  if(!a)return;
  const ev=DB.eventos.find(x=>x.id===a.eventoId)||null;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Agenda — ${a.matricula}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}@page{size:A4 portrait;margin:15mm}
:root{--f:'Segoe UI',Arial,sans-serif;--fm:'Courier New',monospace}
body{font-family:var(--f);color:#000}
.hdr{border-bottom:4px solid #000;padding-bottom:8px;margin-bottom:6px;display:flex;justify-content:space-between}
.badge{font-family:var(--fm);border:4px solid #000;border-radius:8px;padding:6px 14px;font-size:28px;font-weight:700;letter-spacing:4.5px;display:inline-block;margin-bottom:8px}
.hora{font-family:var(--fm);font-size:50px;font-weight:700;letter-spacing:3px;text-align:center;margin:8px 0}
table{width:100%;border-collapse:collapse}
td{font-family:var(--f);padding:5px 10px;border-bottom:1px solid #eee;font-size:12px;font-weight:500;letter-spacing:0.3px}
td:first-child{font-family:var(--f);font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#888;width:35%}
.sig-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
.sig-box{border:1.5px solid #ccc;border-radius:6px;padding:8px 12px;min-height:50px}
.sig-lbl{font-family:var(--f);font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:1.8px;color:#aaa}
.btn-wrap{position:fixed;bottom:20px;right:20px;display:flex;gap:8px}@media print{.btn-wrap{display:none}}</style></head>
<body>
<div class="hdr"><div><b style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;font-weight:800;letter-spacing:0.4px">AGENDA / PLANIFICACIÓN</b><div style="font-family:'Segoe UI',Arial,sans-serif;font-size:8px;color:#666;margin-top:2px;letter-spacing:0.8px;text-transform:uppercase;font-weight:500">${ev?ev.nombre:'BeUnifyT'}</div></div><div style="text-align:right;font-family:'Segoe UI',Arial,sans-serif;font-size:9px;color:#666;letter-spacing:0.4px">${a.fecha}</div></div>
<div style="text-align:center;margin-bottom:6px">
  <div class="badge">${a.matricula}</div>
  <div class="hora">${a.hora||'--:--'}</div>
  <div style="font-family:'Segoe UI',Arial,sans-serif;font-size:8px;color:#888;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">${tr('horaPlan')}</div>
</div>
<table><tbody>
  ${a.conductor?`<tr><td>Conductor</td><td style="font-weight:600;letter-spacing:0.4px">${a.conductor}</td></tr>`:'<tr><td>Conductor</td><td style="color:#ccc">____________________________</td></tr>'}
  ${a.empresa?`<tr><td>Empresa</td><td style="letter-spacing:0.3px">${a.empresa}</td></tr>`:'<tr><td>Empresa</td><td style="color:#ccc">____________________________</td></tr>'}
  ${a.referencia?`<tr><td>${tr('ingresos')}</td><td style="font-family:'Courier New',monospace;font-weight:600;letter-spacing:2.5px">${a.referencia}</td></tr>`:'<tr><td>'+tr('ingresos')+'</td><td style="color:#ccc">____________________________</td></tr>'}
  ${a.montador?`<tr><td>Montador</td><td style="letter-spacing:0.3px">${a.montador}</td></tr>`:'<tr><td>Montador</td><td style="color:#ccc">____________________________</td></tr>'}
  ${a.expositor?`<tr><td>Expositor</td><td style="letter-spacing:0.3px">${a.expositor}</td></tr>`:'<tr><td>Expositor</td><td style="color:#ccc">____________________________</td></tr>'}
  <tr><td>Hall</td><td style="font-family:'Segoe UI',Arial,sans-serif;font-size:20px;font-weight:800;letter-spacing:2px">${a.hall||'<span style="color:#ccc">____</span>'}</td></tr>
  <tr><td>Stand</td><td style="font-family:'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:1.5px">${a.stand||'<span style="color:#ccc">____</span>'}</td></tr>
  ${a.remolque?`<tr><td>Remolque</td><td style="font-family:'Courier New',monospace;font-weight:600;letter-spacing:3px">${a.remolque}</td></tr>`:'<tr><td>Remolque</td><td style="color:#ccc">____________________________</td></tr>'}
  <tr><td>${tr('telefono')}</td><td style="font-family:'Courier New',monospace;font-size:13px;font-weight:600;letter-spacing:2px">${a.telefono||'<span style="color:#ccc">____________________________</span>'}</td></tr>
  ${a.notas?`<tr><td>Notas</td><td style="letter-spacing:0.3px">${a.notas}</td></tr>`:'<tr><td>Notas</td><td style="color:#ccc">____________________________________________</td></tr>'}
  <tr><td>Estado</td><td style="font-weight:600;letter-spacing:1px">${a.estado||'PENDIENTE'}</td></tr>
</tbody></table>
<div class="sig-row"><div class="sig-box"><div class="sig-lbl">Firma del Conductor</div></div><div class="sig-box"><div class="sig-lbl">Sello / Firma Control</div></div></div>
<div class="btn-wrap">
<button onclick="window.print()" style="background:#4a5568;color:#fff;border:none;border-radius:20px;padding:10px 22px;font-size:13px;font-weight:800;cursor:pointer">🖨️ Imprimir</button>
<button onclick="window.close()" style="background:#fff;color:#f7f7f7;border:1.5px solid #ccc;border-radius:20px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer">✕</button>
</div><scr'+'ipt>document.addEventListener("keydown",function(e){if(e.key==="Escape")window.close();});</scr'+'ipt></body></html>`;
  const w=window.open('','_blank','width=800,height=1100,scrollbars=yes');
  if(w){w.document.write(html);w.document.close();setTimeout(()=>{try{w.focus();w.print();}catch(e){}},600);}
  else toast('⚠ Activa ventanas emergentes','var(--amber)');
}

function printIngresoRESA(ing,ev){
  const lang=ing.lang||'es';const t=LANGS[lang]||(console.warn('⚠ Idioma no en LANGS:',lang),LANGS.es)||LANGS.en;const now=new Date();
  const halls=(ing.halls||[ing.hall||'']).filter(Boolean);
  const hallStr=halls.join(' / ')||'';
  const ln=checkBL(ing.matricula);
  // Helper visibilidad: devuelve true si el campo NO está marcado 'off' en el evento
  const cv=(k)=>!ev?.campos||ev.campos[k]!=='off';
  // Helpers
  const val=(v)=>v&&String(v).trim()?String(v).trim():'';
  const box=(label,value,big,mono)=>`
    <div class="rfield ${big?'rbig':''}">
      <div class="rlbl">${label}</div>
      <div class="rinput${mono?' rmono':''}">${val(value)}</div>
    </div>`;
  // Vehicle type SVG icons
  const tipoVeh=ing.tipoVehiculo||'';
  const descTipo=ing.descargaTipo||'';
  const X=`<span style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;display:flex;align-items:center;justify-content:center;font-size:28pt;font-weight:900;color:#c00;line-height:1;pointer-events:none">✕</span>`;
  // SVG vehicle icons matching RESA form
  const svgTrailer=`<svg viewBox="0 0 80 36" width="76" height="34" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="6" width="36" height="22" rx="2"/><rect x="38" y="10" width="38" height="18" rx="2"/><circle cx="12" cy="30" r="4"/><circle cx="28" cy="30" r="4"/><circle cx="58" cy="30" r="4"/><circle cx="70" cy="30" r="4"/><line x1="36" y1="20" x2="40" y2="20"/></svg>`;
  const svgTipoB=`<svg viewBox="0 0 60 36" width="56" height="34" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="10" width="56" height="18" rx="2"/><path d="M2 12 L14 6 L46 6 L58 12"/><circle cx="14" cy="30" r="4"/><circle cx="46" cy="30" r="4"/></svg>`;
  const svgTipoA=`<svg viewBox="0 0 44 36" width="40" height="34" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="10" width="40" height="18" rx="2"/><path d="M2 12 L10 4 L34 4 L42 12"/><circle cx="10" cy="30" r="4"/><circle cx="34" cy="30" r="4"/></svg>`;
  const svgMano=`<svg viewBox="0 0 40 40" width="36" height="36" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"><path d="M20 36 L20 18 M20 18 C20 18 14 14 14 8 C14 5 16 3 18 4 C18 4 18 8 20 8 M20 8 C20 8 20 4 22 4 C24 3 26 5 26 8 C26 11 24 14 24 14"/><path d="M14 16 C12 15 10 17 11 19 L14 24 M26 16 C28 15 30 17 29 19 L26 24"/></svg>`;
  const svgMaq=`<svg viewBox="0 0 50 40" width="46" height="36" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round"><rect x="4" y="18" width="42" height="14" rx="2"/><path d="M4 24 L2 30 M46 24 L48 30"/><circle cx="12" cy="34" r="4"/><circle cx="38" cy="34" r="4"/><path d="M16 18 L16 8 L34 8 L34 18"/><rect x="20" y="4" width="10" height="6" rx="1"/></svg>`;

  let html=`<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8">

<title>${ing.eventoNombre||'BOOKING'} — ${ing.matricula}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4 portrait;margin:0}
:root{--f:'Segoe UI',Arial,sans-serif;--fm:'Courier New',monospace}
body{font-family:var(--f);background:#fff;color:#000;width:210mm;font-size:9.5pt}
.page-wrap{display:flex;gap:0;min-height:287mm}
.page{padding:7mm 6mm 5mm;min-height:287mm;display:flex;flex-direction:column;gap:3.5mm;flex:1;min-width:0}
.cut-strip{width:24mm;flex-shrink:0;border-left:2px dashed #ccc;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:3mm;padding:8mm 0;background:#fafafa}
.cut-mat{writing-mode:vertical-lr;transform:rotate(180deg);font-family:var(--fm);font-size:11pt;font-weight:900;letter-spacing:3px}
.cut-pos{writing-mode:vertical-lr;transform:rotate(180deg);font-size:30pt;font-weight:900;line-height:1}
.cut-lbl{writing-mode:vertical-lr;transform:rotate(180deg);font-size:5.5pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#888}
.cut-sc{font-size:10pt;color:#bbb;margin-bottom:1mm}
.cut-phrase{writing-mode:vertical-rl;font-size:8pt;font-weight:800;letter-spacing:1.5px;color:#222;max-height:70mm;overflow:hidden;text-align:center}
.cut-tel{writing-mode:vertical-lr;transform:rotate(180deg);font-family:var(--fm);font-size:9pt;font-weight:900;letter-spacing:2px;color:#444}
/* HEADER */
.top-bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:4mm;border-bottom:2px solid #000;padding-bottom:3mm}
.brand-name{font-family:var(--f);font-size:14pt;font-weight:700;line-height:1.1;letter-spacing:0.3px}
.brand-sub{font-family:var(--f);font-size:6.5pt;color:#555;margin-top:2px;letter-spacing:1px;text-transform:uppercase;font-weight:500}
/* POS */
.pos-center{display:flex;flex-direction:column;align-items:center;justify-content:center}
.pos-box{border:3px solid #000;border-radius:6px;padding:1mm 8mm;text-align:center;min-width:28mm}
.pos-n{font-size:42pt;font-weight:900;line-height:1;font-family:var(--f)}
.pos-l{font-family:var(--f);font-size:6pt;font-weight:700;text-transform:uppercase;letter-spacing:2.5px;color:#555;margin-top:1px}
/* LLAMADOR */
.top-right-col{display:flex;flex-direction:column;align-items:flex-end;gap:2.5mm}
.llamador-row{display:flex;align-items:center;gap:4mm}
.llamador-lbl{font-family:var(--f);font-size:6.5pt;font-weight:700;letter-spacing:1.5px;color:#333;text-transform:uppercase}
.llamador-val{font-family:var(--fm);border:1.5px solid #000;padding:1mm 6mm;min-width:18mm;font-size:14pt;font-weight:600;text-align:center;letter-spacing:3.5px}
.icons-row{display:flex;gap:4mm;align-items:flex-end}
.ico-wrap{position:relative;display:flex;flex-direction:column;align-items:center;gap:1mm;cursor:default}
.ico-lbl{font-family:var(--f);font-size:5.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#555}
/* SECCIONES */
.section{display:flex;flex-direction:column;gap:2mm}
.sec-hdr{font-family:var(--f);background:#f0f0f0;border-left:3.5px solid #000;padding:2px 6px;font-size:7.5pt;font-weight:700;letter-spacing:1.5px;text-transform:uppercase}
/* CAMPOS */
.rfield{display:flex;flex-direction:column;gap:0.5mm}
.rfield.rbig .rinput{font-size:14pt;font-weight:600;min-height:10mm;letter-spacing:0.5px}
.rlbl{font-family:var(--f);font-size:6.5pt;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:1.5px}
.rinput{font-family:var(--f);border-bottom:1.5px solid #000;min-height:8mm;padding:0.5mm 1mm;font-size:11.5pt;font-weight:500;letter-spacing:0.4px}
.rmono{font-family:var(--fm);letter-spacing:3px;font-weight:600}
/* REFERENCE */
.ref-row{display:flex;gap:2px}
.ref-cell{font-family:var(--fm);border:1px solid #555;width:10mm;height:10mm;display:flex;align-items:center;justify-content:center;font-size:12pt;font-weight:600;letter-spacing:0}
/* GRIDS */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.g3{display:grid;grid-template-columns:28mm 1fr 24mm;gap:3mm}
/* USO OFICINA */
.oficina-row{font-family:var(--f);display:flex;align-items:center;gap:5mm;padding:1.5mm 0;border-top:1px solid #ddd;font-size:8pt;letter-spacing:0.4px}
.chk-wrap{display:flex;gap:3mm}
.chk{display:flex;align-items:center;gap:2mm;font-weight:700;letter-spacing:0.3px}
.chk-sq{width:14px;height:14px;border:1.5px solid #000;display:flex;align-items:center;justify-content:center;font-size:11pt;font-weight:700}
/* LN */
.ln-warn{font-family:var(--f);background:#fef2f2;border:2px solid #8b3a3a;border-radius:3px;padding:3px 7px;font-size:7.5pt;font-weight:700;color:#8b3a3a;margin-bottom:1mm;letter-spacing:0.4px}
/* BTN */
.btn-wrap{position:fixed;bottom:14px;right:14px;display:flex;gap:6px;z-index:999}
@media print{.btn-wrap{display:none}body{width:100%}}
</style></head>
<body><div class="page-wrap"><div class="page">

<!-- HEADER: LOGO | POS CENTRO | LLAMADOR+ICONOS -->
<div class="top-bar">
  <div>
    <div class="brand-name">${ing.eventoNombre||'BOOKING'}</div>
    <div class="brand-sub">BeUnifyT · ${now.toLocaleDateString(lang==='es'?'es-ES':'en-GB',{day:'2-digit',month:'2-digit',year:'numeric'})} ${now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</div>
  </div>
  <!-- POSICIÓN: cuadro grande CENTRO -->
  <div class="pos-center">
    <div class="pos-box">
      <div class="pos-n">${ing.pos||'–'}</div>
      <div class="pos-l">Pos.</div>
    </div>
  </div>
  <!-- LLAMADOR + TIPO VEHÍCULO + DESCARGA -->
  <div class="top-right-col">
    ${cv('llamador')?`<div class="llamador-row">
      <div class="llamador-lbl">${t.Cal||'Llamador'} Nº</div>
      <div class="llamador-val">${ing.llamador||'&nbsp;&nbsp;&nbsp;&nbsp;'}</div>
    </div>`:''}
    <div class="icons-row">
      <div class="ico-wrap">
        ${tipoVeh==='trailer'?`<div style="position:relative">${svgTrailer}${X}</div>`:svgTrailer}
        <div class="ico-lbl">${tr('trailerType')}</div>
      </div>
      <div class="ico-wrap">
        ${tipoVeh==='semiremolque'?`<div style="position:relative">${svgTipoB}${X}</div>`:svgTipoB}
        <div class="ico-lbl">Tipo B</div>
      </div>
      <div class="ico-wrap">
        ${tipoVeh==='camion'||tipoVeh==='furgoneta'||tipoVeh==='coche'?`<div style="position:relative">${svgTipoA}${X}</div>`:svgTipoA}
        <div class="ico-lbl">Tipo A</div>
      </div>
      <div style="width:1px;background:#ccc;align-self:stretch;margin:0 2mm"></div>
      <div class="ico-wrap">
        ${descTipo==='mano'?`<div style="position:relative">${svgMano}${X}</div>`:svgMano}
        <div class="ico-lbl">${t.DescMano||'A Mano'}</div>
      </div>
      <div class="ico-wrap">
        ${descTipo==='maquinaria'?`<div style="position:relative">${svgMaq}${X}</div>`:svgMaq}
        <div class="ico-lbl">${t.DescMaq||'Maquinaria'}</div>
      </div>
    </div>
  </div>
</div>

${ln?`<div class="ln-warn">⛔ ${ln.nivel.toUpperCase()}: ${ln.motivo}</div>`:''}

<!-- DATOS VEHÍCULO -->
<div class="section">
  <div class="sec-hdr">${t.DatosVeh||'DATOS VEHÍCULO'}</div>
  ${cv('ref')?`<div>
    <div class="rlbl">${t.Ref||'Referencia'}</div>
    <div class="ref-row">
      ${Array.from({length:14},(_,i)=>`<div class="ref-cell">${(ing.referencia||'')[i]||''}</div>`).join('')}
    </div>
  </div>`:''}
  ${box(t.Mat,ing.matricula,true,true)}
  ${box(t.Rem,ing.remolque,true,true)}
</div>

<!-- DATOS RESERVA -->
${cv('empresa')||cv('montador')||cv('expositor')||cv('hall')||cv('stand')?`<div class="section">
  <div class="sec-hdr">${t.DatosRes||'DATOS RESERVA'}</div>
  ${cv('empresa')?box(t.Emp,ing.empresa,true):''}
  ${cv('montador')?box(t.Mon,ing.montador):''}
  ${cv('expositor')?box(t.Exp,ing.expositor):''}
  ${cv('hall')||cv('stand')?`<div class="g3">
    ${cv('hall')?box(t.Hal,hallStr,true):''}
    ${cv('stand')?box(t.Std,ing.stand,true):''}
    ${box('Puerta',ing.puerta||'')}
  </div>`:''}
</div>`:''}

<!-- DATOS PERSONALES -->
${cv('nombre')||cv('apellido')||cv('pasaporte')||cv('telefono')||cv('email')?`<div class="section">
  <div class="sec-hdr">${t.DatosPer||'DATOS PERSONALES'}</div>
  ${cv('nombre')||cv('apellido')?box(t.Nom,(cv('nombre')?ing.nombre||'':'')+' '+(cv('apellido')?ing.apellido||'':''),true):''}
  ${cv('pasaporte')?`<div class="g2">
    ${box(t.Pas,ing.pasaporte)}
    ${box(t.FechaExp||'Fecha Expiración',ing.fechaExpiracion)}
  </div>
  <div class="g2">
    ${box(t.FechaNac||'Fecha Nacimiento',ing.fechaNacimiento)}
    ${box(t.Pais||tr('phCountryName'),ing.pais)}
  </div>`:''}
  ${cv('telefono')?box(t.Tel,(ing.telPais||'')+' '+(ing.telefono||''),true):''}
  ${cv('email')?box(t.Eml,ing.email):''}
</div>`:''}
${cv('comentario')?`<div class="section"><div class="sec-hdr">${t.Obs||'OBSERVACIONES'}</div>${box(t.Obs,ing.comentario)}</div>`:''}

<!-- USO OFICINA RXL -->
<div class="section">
  <div class="sec-hdr" style="border-left-color:#777;background:#f8f8f8;color:#444">${t.OfRXL||'USO OFICINA RXL'}</div>
  <div class="oficina-row">
    <div style="font-size:8pt;font-weight:600;min-width:130px">Registro Electrónico</div>
    <div class="chk-wrap">
      <div class="chk"><div class="chk-sq">${ing.regRXL?'✓':''}</div> SI</div>
      <div class="chk"><div class="chk-sq">${!ing.regRXL?'✓':''}</div> NO</div>
    </div>
    <div style="flex:1;border-bottom:1px solid #aaa;min-height:6mm;font-size:11pt;font-weight:500;padding:0 2mm">${ing.regRXL||''}</div>
    <div style="flex:1;border-bottom:1px solid #aaa;min-height:6mm"></div>
  </div>
  <div class="oficina-row">
    <div style="font-size:8pt;font-weight:600;min-width:130px">Oficina SOT Migdía</div>
    <div style="flex:0.5;border-bottom:1px solid #aaa;min-height:6mm;font-size:11pt;font-weight:500;padding:0 2mm">${ing.oficinaSot||''}</div>
    <div style="flex:1;border-bottom:1px solid #aaa;min-height:6mm"></div>
    <div style="flex:1;border-bottom:1px solid #aaa;min-height:6mm"></div>
  </div>
</div>

</div>
<div style="display:flex;justify-content:space-between;align-items:flex-end;padding:3mm 6mm;font-size:6pt;color:#999;border-top:1px solid #eee;margin-top:2mm">
  <span>BeUnifyT · ${LANGS[lang]?.n||lang}</span>
  <span>ID: ${ing.id.slice(0,8).toUpperCase()}</span>
  <div id="printQR" style="margin-left:auto"></div>
</div>
<div class="btn-wrap">
<button onclick="window.print()" style="background:#4a5568;color:#fff;border:none;border-radius:20px;padding:9px 20px;font-size:13px;font-weight:700;cursor:pointer">🖨️ Imprimir</button>
<button onclick="window.close()" style="background:#fff;color:#f7f7f7;border:1.5px solid #ccc;border-radius:20px;padding:9px 14px;font-size:13px;cursor:pointer">✕</button>
</div>
<div class="cut-strip">
  <div class="cut-sc">✂</div>
  <div class="cut-pos">${ing.pos||'?'}</div>
  <div class="cut-lbl">Pos.</div>
  <div class="cut-mat">${ing.matricula}</div>
  <div class="cut-lbl">${hallStr}</div>
  ${_ph2T?`<div class="cut-phrase">${_ph2T}</div>`:''}
  ${(ing.telefono||'').trim()?`<div class="cut-tel">${(ing.telPais||'')} ${ing.telefono}</div>`:''}
</div></div>
</body></html>`;
  const qrUrl2=getQrBase()+'?track='+ing.id.slice(0,8).toUpperCase();
  let qrDataUrl2='';
  try{const tmpDiv=document.createElement('div');tmpDiv.style.display='none';document.body.appendChild(tmpDiv);const qr=new QRCode(tmpDiv,{text:qrUrl2,width:60,height:60,correctLevel:QRCode.CorrectLevel.M});const cvs=tmpDiv.querySelector('canvas');if(cvs)qrDataUrl2=cvs.toDataURL();document.body.removeChild(tmpDiv);}catch(e){}
  if(qrDataUrl2){html=html.replace('<div id="printQR" style="margin-left:auto"></div>','<img src="'+qrDataUrl2+'" style="width:60px;height:60px;margin-left:auto">');}
  const w=window.open('','_blank','width=900,height=1200,scrollbars=yes');
  if(w){w.document.write(html);w.document.close();setTimeout(()=>{try{w.focus();w.print();}catch(e){}},600);}
  else toast('⚠ Activa ventanas emergentes','var(--amber)');
}

function printIngreso2Small(ing){
  const now=new Date();
  const halls=(ing.halls||[ing.hall||'']).filter(Boolean);
  const ln=checkBL(ing.matricula);
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8">

<title>${ing.matricula}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A5 landscape;margin:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#000;width:210mm;height:148mm;font-size:9pt}
.page{padding:6mm 8mm;height:148mm;display:flex;flex-direction:column;gap:3mm}
.top{display:flex;align-items:center;gap:6mm;border-bottom:3px solid #000;padding-bottom:3mm}
.pos-box{border:4px solid #000;border-radius:6px;padding:2px 8px;text-align:center;min-width:44px}
.pos-n{font-size:28pt;font-weight:900;line-height:1}
.pos-l{font-size:6pt;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#555}
.mat-box{flex:1;border:3px solid #000;border-radius:6px;padding:4px 10px;text-align:center}
.mat-v{font-size:24pt;font-weight:900;font-family:'Courier New',monospace;letter-spacing:4px}
.mat-l{font-size:5.5pt;font-weight:700;text-transform:uppercase;color:#888;letter-spacing:2px}
.halls{display:flex;gap:4px;flex-wrap:wrap}
.hb{border:3px solid #000;border-radius:5px;padding:2px 8px;font-size:16pt;font-weight:900;letter-spacing:1px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.f{border-bottom:1.5px solid #000;padding:1mm 2mm;font-size:11pt;font-weight:500;letter-spacing:0.4px;min-height:8mm}
.fmono{font-family:'Courier New',monospace;letter-spacing:3px;font-weight:500}
.fl{font-size:6.5pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#777;margin-bottom:0.5mm}
.ln-w{background:#fef2f2;border:2px solid #8b3a3a;border-radius:3px;padding:2px 6px;font-size:7.5pt;font-weight:800;color:#8b3a3a;letter-spacing:0.3px}
.btn-wrap{position:fixed;bottom:10px;right:10px;display:flex;gap:6px;z-index:999}
@media print{.btn-wrap{display:none}}
</style></head>
<body><div class="page">
<div class="top">
  <div class="pos-box"><div class="pos-n">${ing.pos||'–'}</div><div class="pos-l">Pos.</div></div>
  <div class="mat-box"><div class="mat-v">${ing.matricula}</div><div class="mat-l">Matrícula</div></div>
  <div class="halls">${halls.map(h=>`<div class="hb">${h}</div>`).join('')||''}</div>
  ${ing.llamador?`<div style="border:2px solid #000;border-radius:5px;padding:2px 8px;text-align:center"><div style="font-size:6pt;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#555">Llamador</div><div style="font-size:15pt;font-weight:500;font-family:'Courier New',monospace;letter-spacing:3px">${ing.llamador}</div></div>`:''}
</div>
${ln?`<div class="ln-w">⛔ ${ln.nivel.toUpperCase()}: ${ln.motivo}</div>`:''}
<div class="grid">
  <div><div class="fl">Empresa</div><div class="f">${ing.empresa||''}</div></div>
  <div><div class="fl">Remolque</div><div class="f fmono">${ing.remolque||''}</div></div>
  <div><div class="fl">Nombre / Conductor</div><div class="f">${(ing.nombre||'')+' '+(ing.apellido||'')}</div></div>
  <div><div class="fl">${tr('ingresos')}</div><div class="f fmono">${ing.referencia||''}</div></div>
  <div><div class="fl">Stand</div><div class="f">${ing.stand||''}</div></div>
  <div><div class="fl">${tr('telefono')}</div><div class="f fmono">${(ing.telPais||'')+' '+(ing.telefono||'')}</div></div>
  <div><div class="fl">Montador</div><div class="f">${ing.montador||''}</div></div>
  <div><div class="fl">Expositor</div><div class="f">${ing.expositor||''}</div></div>
</div>
<div style="margin-top:auto;border-top:1px solid #ddd;padding-top:2mm;font-size:6.5pt;color:#aaa;letter-spacing:0.3px;display:flex;justify-content:space-between">
  <span>${ing.eventoNombre||'BeUnifyT'}</span>
  <span>${now.toLocaleDateString('es-ES')} ${now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}</span>
</div>
</div>
<div class="btn-wrap">
<button onclick="window.print()" style="background:#4a5568;color:#fff;border:none;border-radius:20px;padding:8px 18px;font-size:12px;font-weight:800;cursor:pointer">🖨️ Imprimir</button>
<button onclick="window.close()" style="background:#fff;color:#f7f7f7;border:1.5px solid #ccc;border-radius:20px;padding:8px 14px;font-size:12px;cursor:pointer">✕</button>
</div></body></html>`;
  const w=window.open('','_blank','width=900,height=700,scrollbars=yes');
  if(w){w.document.write(html);w.document.close();setTimeout(()=>{try{w.focus();w.print();}catch(e){}},600);}
  else toast('⚠ Activa ventanas emergentes','var(--amber)');
}

function printIngresoCustomBg(ing,ev){
  const lang=ing.lang||'es';const now=new Date();
  const halls=(ing.halls||[ing.hall||'']).filter(Boolean);
  const hallStr=halls.join(' / ')||'';
  const tipoVeh=ing.tipoVehiculo||'';
  const descTipo=ing.descargaTipo||'';
  const nombre=((ing.nombre||'')+' '+(ing.apellido||'')).trim();
  const tel=((ing.telPais||'')+(ing.telPais&&ing.telefono?' ':'')+( ing.telefono||'')).trim();
  // ✕ roja: se pone como overlay sobre el SVG del icono seleccionado
  const X=`<span style="position:absolute;top:-4px;left:-4px;right:-4px;bottom:-4px;display:flex;align-items:center;justify-content:center;font-size:28pt;font-weight:900;color:#c00;line-height:1">&#10005;</span>`;
  // SVGs idénticos al RESA — strokes transparentes (invisible), solo el ✕ se ve
  const svgT=(sel)=>`<div style="position:relative">`+
    `<svg viewBox="0 0 80 36" width="76" height="34" fill="none" stroke="transparent" stroke-width="1.5"><rect x="2" y="6" width="36" height="22" rx="2"/><rect x="38" y="10" width="38" height="18" rx="2"/><circle cx="12" cy="30" r="4"/><circle cx="28" cy="30" r="4"/><circle cx="58" cy="30" r="4"/><circle cx="70" cy="30" r="4"/><line x1="36" y1="20" x2="40" y2="20"/></svg>`+
    (sel?X:'')+`</div>`;
  const svgB=(sel)=>`<div style="position:relative">`+
    `<svg viewBox="0 0 60 36" width="56" height="34" fill="none" stroke="transparent" stroke-width="1.5"><rect x="2" y="10" width="56" height="18" rx="2"/><path d="M2 12 L14 6 L46 6 L58 12"/><circle cx="14" cy="30" r="4"/><circle cx="46" cy="30" r="4"/></svg>`+
    (sel?X:'')+`</div>`;
  const svgA=(sel)=>`<div style="position:relative">`+
    `<svg viewBox="0 0 44 36" width="40" height="34" fill="none" stroke="transparent" stroke-width="1.5"><rect x="2" y="10" width="40" height="18" rx="2"/><path d="M2 12 L10 4 L34 4 L42 12"/><circle cx="10" cy="30" r="4"/><circle cx="34" cy="30" r="4"/></svg>`+
    (sel?X:'')+`</div>`;
  const svgMano=(sel)=>`<div style="position:relative">`+
    `<svg viewBox="0 0 40 40" width="36" height="36" fill="none" stroke="transparent" stroke-width="1.5"><path d="M20 36 L20 18 M20 18 C20 18 14 14 14 8 C14 5 16 3 18 4 C18 4 18 8 20 8 M20 8 C20 8 20 4 22 4 C24 3 26 5 26 8 C26 11 24 14 24 14"/><path d="M14 16 C12 15 10 17 11 19 L14 24 M26 16 C28 15 30 17 29 19 L26 24"/></svg>`+
    (sel?X:'')+`</div>`;
  const svgMaq=(sel)=>`<div style="position:relative">`+
    `<svg viewBox="0 0 50 40" width="46" height="36" fill="none" stroke="transparent" stroke-width="1.5"><rect x="4" y="18" width="42" height="14" rx="2"/><path d="M4 24 L2 30 M46 24 L48 30"/><circle cx="12" cy="34" r="4"/><circle cx="38" cy="34" r="4"/><path d="M16 18 L16 8 L34 8 L34 18"/><rect x="20" y="4" width="10" height="6" rx="1"/></svg>`+
    (sel?X:'')+`</div>`;
  const isTrailer=tipoVeh==='trailer';
  const isTipoB=tipoVeh==='semiremolque';
  const isTipoA=tipoVeh==='camion'||tipoVeh==='furgoneta'||tipoVeh==='coche';
  const isMano=descTipo==='mano';
  const isMaq=descTipo==='maquinaria';
  // Cuadrícula calibración
  const gH=Array.from({length:29},(_,i)=>`<div style="position:absolute;left:0;right:0;top:${(i+1)*10}mm;height:1px;background:rgba(0,100,255,.3)"></div><span style="position:absolute;left:0.5mm;top:${(i+1)*10+0.2}mm;font-size:4.5pt;color:rgba(0,100,255,.7)">${(i+1)*10}</span>`).join('');
  const gV=Array.from({length:20},(_,i)=>`<div style="position:absolute;top:0;bottom:0;left:${(i+1)*10}mm;width:1px;background:rgba(0,100,255,.3)"></div><span style="position:absolute;top:0.3mm;left:${(i+1)*10+0.3}mm;font-size:4.5pt;color:rgba(0,100,255,.7)">${(i+1)*10}</span>`).join('');

  const html=`<!DOCTYPE html><html lang="${lang}"><head><meta charset="UTF-8">

<title>${ing.matricula||'Ficha'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4 portrait;margin:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:transparent;color:#000;width:210mm;font-size:9.5pt}
.page{padding:7mm 8mm 5mm;min-height:287mm;display:flex;flex-direction:column;gap:3.5mm}
/* HEADER — mismo grid que RESA, bordes y textos decorativos invisibles */
.top-bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:4mm;border-bottom:2px solid transparent;padding-bottom:3mm}
.brand-name{font-size:16pt;font-weight:700;line-height:1.1;color:transparent}
.brand-sub{font-size:7.5pt;margin-top:1px;color:transparent}
/* POS — misma caja, mismas dimensiones, borde y label invisibles, número visible */
.pos-center{display:flex;flex-direction:column;align-items:center;justify-content:center}
.pos-box{border:3px solid transparent;border-radius:6px;padding:1mm 8mm;text-align:center;min-width:28mm}
.pos-n{font-size:42pt;font-weight:900;line-height:1;color:#000;font-family:'Segoe UI',Arial,sans-serif}
.pos-l{font-size:6.5pt;text-transform:uppercase;letter-spacing:1.5px;color:transparent;margin-top:1px}
/* LLAMADOR + iconos — mismo layout, label y borde invisibles, valor visible */
.top-right-col{display:flex;flex-direction:column;align-items:flex-end;gap:2.5mm}
.llamador-row{display:flex;align-items:center;gap:4mm}
.llamador-lbl{font-size:7.5pt;color:transparent}
.llamador-val{border:1.5px solid transparent;padding:1mm 6mm;min-width:18mm;font-size:12pt;font-weight:500;text-align:center;color:#000;font-family:'Courier New',monospace;letter-spacing:2.5px}
.icons-row{display:flex;gap:4mm;align-items:flex-end}
.ico-wrap{position:relative;display:flex;flex-direction:column;align-items:center;gap:1mm}
.ico-lbl{font-size:6pt;color:transparent}
/* SECCIONES — cabeceras invisibles, gap/padding idénticos */
.section{display:flex;flex-direction:column;gap:2mm}
.sec-hdr{background:transparent;border-left:3.5px solid transparent;padding:2px 6px;font-size:9pt;color:transparent}
/* CAMPOS — mismas dimensiones, sin líneas, sin etiquetas, valor visible
   TODOS los campos usan exactamente el mismo estilo: 11.5pt / weight:500 */
.rfield{display:flex;flex-direction:column;gap:0.5mm}
.rfield.rbig .rinput{font-size:11.5pt;font-weight:500;min-height:10mm}
.rlbl{font-size:7pt;color:transparent;text-transform:uppercase;letter-spacing:0.3px}
.rinput{border-bottom:1.5px solid transparent;min-height:8mm;padding:0.5mm 1mm;font-size:11.5pt;font-weight:500;color:#000;font-family:'Segoe UI',Arial,sans-serif;letter-spacing:0.3px}
.rmono{font-family:'Courier New',monospace;letter-spacing:2.5px;font-weight:500}
/* REFERENCIA — celdas con borde invisible, mismo tamaño */
.ref-row{display:flex;gap:2px}
.ref-cell{font-family:'Courier New',monospace;border:1px solid transparent;width:10mm;height:10mm;display:flex;align-items:center;justify-content:center;font-size:12pt;font-weight:500;color:#000;letter-spacing:0}
/* GRIDS */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.g3{display:grid;grid-template-columns:28mm 1fr 24mm;gap:3mm}
/* USO OFICINA — mismas dimensiones, sin colores visibles */
.oficina-row{display:flex;align-items:center;gap:5mm;padding:1.5mm 0;border-top:1px solid transparent;font-size:8.5pt}
.chk-wrap{display:flex;gap:3mm}
.chk{display:flex;align-items:center;gap:2mm;color:transparent}
.chk-sq{width:14px;height:14px;border:1.5px solid transparent;display:flex;align-items:center;justify-content:center;font-size:11pt;font-weight:500;color:#000}
/* Separador vertical entre grupos iconos */
.sep{width:1px;background:transparent;align-self:stretch;margin:0 2mm}
/* Cuadrícula calibración */
.guide{position:absolute;inset:0;pointer-events:none;display:none;font-family:Arial,sans-serif}
/* Panel calibración */
.ctrl{position:fixed;bottom:12px;right:12px;z-index:9999;background:rgba(255,255,255,.97);border:1.5px solid #bbb;border-radius:8px;padding:10px 12px;box-shadow:0 4px 18px rgba(0,0,0,.18);font-family:Arial,sans-serif;font-size:11px;display:flex;flex-direction:column;gap:6px;min-width:200px}
.cr{display:flex;align-items:center;gap:4px}
.cb{border:none;border-radius:4px;padding:6px 10px;font-size:12px;font-weight:800;cursor:pointer;flex:1}
.cj{background:#f0f0f0;border:1px solid #ccc;border-radius:4px;padding:4px 7px;font-size:11px;font-weight:800;cursor:pointer}
.cv{min-width:44px;text-align:center;font-family:'Courier New',monospace;font-size:11px;font-weight:700}
@media print{.ctrl,.guide{display:none!important}body{background:transparent}}
</style></head>
<body>
<div style="position:relative">
<div class="page">

<!-- HEADER (mismo grid 1fr auto 1fr) -->
<div class="top-bar">
  <div>
    <div class="brand-name">EVENTO</div>
    <div class="brand-sub">.</div>
  </div>
  <div class="pos-center">
    <div class="pos-box">
      <div class="pos-n">${ing.pos||''}</div>
      <div class="pos-l">Pos.</div>
    </div>
  </div>
  <div class="top-right-col">
    <div class="llamador-row">
      <div class="llamador-lbl">Llamador N\xba</div>
      <div class="llamador-val">${ing.llamador||'\u00a0\u00a0\u00a0\u00a0'}</div>
    </div>
    <div class="icons-row">
      <div class="ico-wrap">${svgT(isTrailer)}<div class="ico-lbl">${tr('trailerType')}</div></div>
      <div class="ico-wrap">${svgB(isTipoB)}<div class="ico-lbl">Tipo B</div></div>
      <div class="ico-wrap">${svgA(isTipoA)}<div class="ico-lbl">Tipo A</div></div>
      <div class="sep"></div>
      <div class="ico-wrap">${svgMano(isMano)}<div class="ico-lbl">A Mano</div></div>
      <div class="ico-wrap">${svgMaq(isMaq)}<div class="ico-lbl">Maquinaria</div></div>
    </div>
  </div>
</div>

<!-- DATOS VEHÍCULO -->
<div class="section">
  <div class="sec-hdr">DATOS VEH\xcdCULO</div>
  <div>
    <div class="rlbl">${tr('ingresos')}</div>
    <div class="ref-row">
      ${Array.from({length:14},(_,i)=>`<div class="ref-cell">${(ing.referencia||'')[i]||''}</div>`).join('')}
    </div>
  </div>
  <div class="rfield rbig"><div class="rlbl">Matr\xedcula</div><div class="rinput rmono">${ing.matricula||''}</div></div>
  <div class="rfield rbig"><div class="rlbl">Remolque</div><div class="rinput rmono">${ing.remolque||''}</div></div>
</div>

<!-- DATOS RESERVA -->
<div class="section">
  <div class="sec-hdr">DATOS RESERVA</div>
  <div class="rfield rbig"><div class="rlbl">Empresa</div><div class="rinput">${ing.empresa||''}</div></div>
  <div class="rfield"><div class="rlbl">Montador</div><div class="rinput">${ing.montador||''}</div></div>
  <div class="rfield"><div class="rlbl">Expositor</div><div class="rinput">${ing.expositor||''}</div></div>
  <div class="g3">
    <div class="rfield rbig"><div class="rlbl">Hall</div><div class="rinput">${hallStr}</div></div>
    <div class="rfield rbig"><div class="rlbl">Stand</div><div class="rinput">${ing.stand||''}</div></div>
    <div class="rfield"><div class="rlbl">Puerta</div><div class="rinput">${ing.puerta||''}</div></div>
  </div>
</div>

<!-- DATOS PERSONALES -->
<div class="section">
  <div class="sec-hdr">DATOS PERSONALES</div>
  <div class="rfield rbig"><div class="rlbl">Nombre</div><div class="rinput">${nombre}</div></div>
  <div class="g2">
    <div class="rfield"><div class="rlbl">Pasaporte</div><div class="rinput">${ing.pasaporte||''}</div></div>
    <div class="rfield"><div class="rlbl">Fecha Exp</div><div class="rinput">${ing.fechaExpiracion||''}</div></div>
  </div>
  <div class="g2">
    <div class="rfield"><div class="rlbl">Fecha Nac</div><div class="rinput">${ing.fechaNacimiento||''}</div></div>
    <div class="rfield"><div class="rlbl">Pa\xeds</div><div class="rinput">${ing.pais||''}</div></div>
  </div>
  <div class="rfield rbig"><div class="rlbl">Tel\xe9fono</div><div class="rinput">${tel}</div></div>
  <div class="rfield"><div class="rlbl">Email</div><div class="rinput">${ing.email||''}</div></div>
</div>

<!-- USO OFICINA RXL -->
<div class="section">
  <div class="sec-hdr" style="border-left-color:transparent;background:transparent;color:transparent">USO OFICINA RXL</div>
  <div class="oficina-row">
    <div style="font-size:8pt;min-width:130px;color:transparent">Registro Electr\xf3nico</div>
    <div class="chk-wrap">
      <div class="chk"><div class="chk-sq">${ing.regRXL?'&#10003;':''}</div> SI</div>
      <div class="chk"><div class="chk-sq">${!ing.regRXL?'&#10003;':''}</div> NO</div>
    </div>
    <div style="flex:1;border-bottom:1px solid transparent;min-height:6mm;font-size:11.5pt;font-weight:500;padding:0 2mm">${ing.regRXL||''}</div>
    <div style="flex:1;border-bottom:1px solid transparent;min-height:6mm"></div>
  </div>
  <div class="oficina-row">
    <div style="font-size:8pt;min-width:130px;color:transparent">Oficina SOT</div>
    <div style="flex:0.5;border-bottom:1px solid transparent;min-height:6mm;font-size:11.5pt;font-weight:500;padding:0 2mm">${ing.oficinaSot||''}</div>
    <div style="flex:1;border-bottom:1px solid transparent;min-height:6mm"></div>
    <div style="flex:1;border-bottom:1px solid transparent;min-height:6mm"></div>
  </div>
</div>

</div>
<!-- Cuadrícula calibración -->
<div class="guide" id="guide">${gH}${gV}</div>
</div>

<!-- Panel calibración -->
<div class="ctrl">
  <div class="cr">
    <button class="cb" style="background:#4a5568;color:#fff" onclick="window.print()">&#128424; Imprimir</button>
    <button class="cb" style="background:#555;color:#fff;flex:0;padding:6px 10px" onclick="window.close()">&#10005;</button>
  </div>
  <div style="font-size:9px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.5px;border-top:1px solid #eee;padding-top:5px">Offset calibraci\xf3n</div>
  <div class="cr">
    <span style="min-width:38px;font-weight:700">&#8597; Y:</span>
    <button class="cj" onclick="adj(0,-1)">&#8722;1</button>
    <button class="cj" onclick="adj(0,-.5)">&#8722;&#189;</button>
    <span class="cv" id="vy">+0mm</span>
    <button class="cj" onclick="adj(0,.5)">+&#189;</button>
    <button class="cj" onclick="adj(0,1)">+1</button>
  </div>
  <div class="cr">
    <span style="min-width:38px;font-weight:700">&#8596; X:</span>
    <button class="cj" onclick="adj(-1,0)">&#8722;1</button>
    <button class="cj" onclick="adj(-.5,0)">&#8722;&#189;</button>
    <span class="cv" id="vx">+0mm</span>
    <button class="cj" onclick="adj(.5,0)">+&#189;</button>
    <button class="cj" onclick="adj(1,0)">+1</button>
  </div>
  <div class="cr">
    <button class="cj" style="flex:1;padding:5px" onclick="tog()">&#9638; Cuadr\xedcula 10mm</button>
    <button class="cj" onclick="rst()">&#8635;</button>
  </div>
  <div style="font-size:8px;color:#bbb;text-align:center;line-height:1.4">Ajusta offset &#8594; imprime prueba<br>Una vez calibrado, es fijo para todas</div>
</div>
<scr'+'ipt>
var ox=0,oy=0,gon=false;
var pg=document.querySelector('.page');
function adj(dx,dy){
  ox=Math.round((ox+dx)*10)/10;
  oy=Math.round((oy+dy)*10)/10;
  pg.style.transform='translate('+ox+'mm,'+oy+'mm)';
  document.getElementById('vx').textContent=(ox>=0?'+':'')+ox+'mm';
  document.getElementById('vy').textContent=(oy>=0?'+':'')+oy+'mm';
}
function tog(){
  gon=!gon;
  document.getElementById('guide').style.display=gon?'block':'none';
}
function rst(){ox=0;oy=0;pg.style.transform='';document.getElementById('vx').textContent='+0mm';document.getElementById('vy').textContent='+0mm';}
<\/script>
</body></html>`;
  const w=window.open('','_blank','width=900,height=1200,scrollbars=yes');
  if(w){w.document.write(html);w.document.close();setTimeout(()=>{try{w.focus();}catch(e){}},300);}
  else toast('&#9888; Activa ventanas emergentes','var(--amber)');
}

function downloadPlantillaIng(){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Pos:'',Matricula:'',Llamador:'',Referencia:'',Nombre:'',Apellido:'',Empresa:'',Montador:'',Expositor:'',Hall:'',Stand:'',Remolque:'',Pasaporte:'',Telefono:'',Email:'',Comentario:'',Entrada:'',Salida:'',Idioma:'es',Evento:''}]),'Ingresos');XLSX.writeFile(wb,'plantilla_ingresos.xlsx');toast('📋 Plantilla descargada');}

function downloadPlantillaCond(){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Nombre:'',Apellido:'',Empresa:'',Matricula:'',Remolque:'',Telefono:'',Hall:'',TipoVehiculo:'',Idioma:''}]),'Conductores');XLSX.writeFile(wb,'plantilla_conductores.xlsx');toast('📋 Plantilla descargada');}

function downloadPlantillaAg(){const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet([{Fecha:'2025-01-01',HoraPlan:'09:00',Matricula:'',Remolque:'',Conductor:'',Empresa:'',Referencia:'',Montador:'',Expositor:'',Hall:'',Stand:'',Carga:'',Telefono:'',Notas:'',Evento:''}]),'Agenda');XLSX.writeFile(wb,'plantilla_agenda.xlsx');toast('📋 Plantilla descargada');}

function _pcInitSectionDrag(panel){
  if(!panel)return;
  const secs=panel.querySelectorAll('.pc-sec');
  let dragSrc=null;
  secs.forEach(function(sec){
    const hdr=sec.querySelector('.pc-sec-hdr,.pc-sec-hdr-clickable');
    if(!hdr)return;
    hdr.setAttribute('draggable','true');
    hdr.addEventListener('dragstart',function(e){
      dragSrc=sec;
      sec.classList.add('pc-dragging');
      e.dataTransfer.effectAllowed='move';
    });
    hdr.addEventListener('dragend',function(){
      sec.classList.remove('pc-dragging');
      panel.querySelectorAll('.pc-sec').forEach(function(s){s.classList.remove('pc-drag-over');});
    });
    sec.addEventListener('dragover',function(e){
      e.preventDefault();
      if(dragSrc&&dragSrc!==sec)sec.classList.add('pc-drag-over');
    });
    sec.addEventListener('dragleave',function(){sec.classList.remove('pc-drag-over');});
    sec.addEventListener('drop',function(e){
      e.preventDefault();
      sec.classList.remove('pc-drag-over');
      if(dragSrc&&dragSrc!==sec){
        const allSecs=Array.from(panel.querySelectorAll('.pc-sec'));
        const srcIdx=allSecs.indexOf(dragSrc);
        const dstIdx=allSecs.indexOf(sec);
        if(srcIdx<dstIdx)sec.after(dragSrc);
        else sec.before(dragSrc);
        // Persist order
        const order=Array.from(panel.querySelectorAll('.pc-sec')).map(function(s){return s.dataset.secId||'';});
        try{localStorage.setItem('cu1_pcsecorder','_impSub_panel',JSON.stringify(order));}catch(e){}
      }
    });
  });
}

function _pcPushHistory(ck){
  if(!window._pcHistory[ck])window._pcHistory[ck]=[];
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  window._pcHistory[ck].push(JSON.stringify(cfg.fieldLayout||{}));
  if(window._pcHistory[ck].length>30)window._pcHistory[ck].shift();
}

function pcUndo(ck){
  const hist=window._pcHistory[ck];
  if(!hist||hist.length<2){toast('Sin más acciones para deshacer','var(--text3)');return;}
  hist.pop();
  const prev=hist[hist.length-1];
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  try{cfg.fieldLayout=JSON.parse(prev);}catch(e){cfg.fieldLayout={};}
  saveDB();
  setTimeout(()=>{initPrintLayout(ck);initPcCanvas(ck);},50);
  toast('↩ Deshecho','var(--text2)');
}

function pcSaveBgTpl(ck){
  const inp=document.getElementById('pc-bg-tpl-name-'+ck);
  const name=(inp?.value||'').trim();
  if(!name){toast('Escribe un nombre para la guía','var(--amber)');return;}
  const img=document.getElementById('pcbg-img-'+ck);
  if(!img||!img.src||img.src===window.location.href){toast('Sube una imagen primero','var(--amber)');return;}
  if(!DB.printBgTemplates)DB.printBgTemplates=[];
  const existing=DB.printBgTemplates.findIndex(t=>t.name===name);
  const cfg2=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  const entry={name,data:img.src,opacity:cfg2.bgOpacity||0.35};
  if(existing>=0)DB.printBgTemplates[existing]=entry;
  else DB.printBgTemplates.push(entry);
  saveDB();if(inp)inp.value='';
  toast('Guía guardada: '+name,'var(--text2)');renderImpresion();
}

function pcLoadBgTpl(ck,idx){
  const t=(DB.printBgTemplates||[])[idx];if(!t)return;
  const img=document.getElementById('pcbg-img-'+ck);
  if(img){img.src=t.data;img.style.display='block';img.style.opacity=t.opacity||0.35;}
  const cfg2=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  cfg2.bgImage=t.data;cfg2.bgOpacity=t.opacity||0.35;saveDB();
  toast('Guía cargada: '+t.name,'#4a5568');
}

function pcDelBgTpl(idx,ck){
  const name=(DB.printBgTemplates||[])[idx]?.name||'';
  askDel('Eliminar guía','<b>'+name+'</b>',()=>{
    if(DB.printBgTemplates)DB.printBgTemplates.splice(idx,1);
    saveDB();renderImpresion();
    toast('Guía eliminada: '+name,'var(--red)');
  });
}

function pcLoadBG(inp,ck){
  if(!inp||!inp.files||!inp.files[0])return;
  var f=inp.files[0];var r=new FileReader();
  r.onload=function(e){
    var img=document.getElementById('pcbg-img-'+ck);
    if(img){img.src=e.target.result;img.style.display='block';img.style.opacity='0.35';}
    var _cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:DB.printCfg1;
    _cfg.bgImage=e.target.result;
    var _op=parseFloat((document.querySelector('#pcbg-'+ck)?.closest?.('[data-bgwrap]')?.querySelector?.('input[type=range]'))||null);
    _cfg.bgOpacity=isNaN(_op)?0.35:_op/100;
    saveDB();
  };
  r.readAsDataURL(f);
}

function pcTogglePhrase(pk,cfgKey){
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  if(pk==='p1')cfg.ph1On=!cfg.ph1On;
  else if(pk==='p2')cfg.ph2On=!(cfg.ph2On!==false);
  else if(pk==='p3')cfg.ph3On=!cfg.ph3On;
  saveDB();
  // Auto-add to canvas palette as draggable chip when toggled ON
  setTimeout(()=>{
    const ckMap={'p1':'_ph1','p2':'_ph2','p3':'_ph2'};
    const chipKey=ckMap[pk];
    const isOn=pk==='p1'?cfg.ph1On===true:pk==='p2'?cfg.ph2On!==false:cfg.ph3On===true;
    if(chipKey&&isOn&&window['pcMake_'+cfgKey]){
      const placed=window['pcPlaced_'+cfgKey]||{};
      if(!placed[chipKey])window['pcMake_'+cfgKey](chipKey,5,pk==='p1'?22:88,8,false);
    }
  },200);
  if(cfgKey==='ag'){goTab('impresion',null);window._impSub='ag';renderImpresion();}
  else if(cfgKey==='ing2'){goTab('impresion',null);window._impSub='ing2';renderImpresion();}
  else{goTab('impresion',null);window._impSub='ing1';renderImpresion();}
  setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);});
}

function pcToggleFields(ck){
  const body=document.getElementById('pc-fld-body-'+ck);
  const arrow=document.getElementById('pc-fld-arrow-'+ck);
  if(!body)return;
  const open=body.style.display!=='none';
  body.style.display=open?'none':'flex';
  if(arrow)arrow.textContent=open?'▸':'▾';
  if(!open){
    // Ensure palette is populated
    const pal=document.getElementById('pc-palette-'+ck);
    if(pal&&!pal.children.length&&window['pcRenderPalette_'+ck])window['pcRenderPalette_'+ck]();
  }
}

function pcQuickAddPhrase(pk,ck){
  const cfg=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
  const keyMap={p1:'_ph1',p2:'_ph2',p3:'_ph3',qr:'_qr'};
  const chipKey=keyMap[pk];
  if(pk==='qr')cfg.qrTracking=true;
  else if(pk==='p1')cfg.ph1On=true;
  else if(pk==='p2')cfg.ph2On=true;
  else if(pk==='p3')cfg.ph3On=true;
  saveDB();
  // Lanzar como chip arrastrable (no en posición fija)
  setTimeout(function(){
    if(chipKey&&window['pcMake_'+ck]){
      const placed=window['pcPlaced_'+ck]||{};
      if(!placed[chipKey]){
        // Posición inicial centrada
        window['pcMake_'+ck](chipKey,10,50,8,false);
      }
    }
    initPrintLayout(ck);initPcCanvas(ck);
  },200);
  toast('Frase añadida al canvas — arrastrala','var(--text2)');
}

function preSavePrintTemplate(cfgKey){
  const nameEl=document.getElementById('pctpl-name-'+cfgKey);
  const name=(nameEl?.value||'').trim();
  if(!name){toast('Escribe un nombre para la plantilla','var(--amber)');nameEl?.focus();return;}
  const cfg=cfgKey==='ag'?DB.printCfgAg:cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;
  const mode=(DB.printCfgModes||{})[cfgKey]||'normal';
  const size=cfg.paperSize||'A4';
  // Show confirmation panel
  const panel=document.getElementById('pctpl-confirm-'+cfgKey);
  if(panel){
    panel.style.display='block';
    const fmtEl=document.getElementById('pctpl-cfmt-'+cfgKey);
    const szEl=document.getElementById('pctpl-csz-'+cfgKey);
    const nmEl=document.getElementById('pctpl-cnm-'+cfgKey);
    if(fmtEl){fmtEl.textContent=mode==='troquel'?'✂ Troquelado':'Normal';fmtEl.style.background=mode==='troquel'?'#4a5568':'#4a5568';}
    if(szEl)szEl.textContent=size;
    if(nmEl)nmEl.textContent='"'+name+'"';
  }
}

function confirmSavePrintTemplate(cfgKey){
  document.getElementById('pctpl-confirm-'+cfgKey)?.style&&(document.getElementById('pctpl-confirm-'+cfgKey).style.display='none');
  savePrintTemplateFromCfg(cfgKey);
}

function pcToggleLabelMode(ck){
  var cur=_pcLabelMode[ck]||0;
  var next=(cur+1)%3;
  _pcLabelMode[ck]=next;
  // persist in cfg
  var _cfg2=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:DB.printCfg1;
  if(_cfg2)_cfg2.labelMode=next;
  saveDB();
  var btn=document.getElementById('pc-lblbtn-'+ck);
  if(btn){
    if(next===0){btn.style.background='';btn.style.color='';btn.textContent='Etiq+Valor';}
    else if(next===1){btn.style.background='#5a6a8a';btn.style.color='#f0ede8';btn.textContent='Etiq+Línea';}
    else{btn.style.background='#4a5568';btn.style.color='#f7f7f7';btn.textContent='Solo Valor';}
  }
  // Refresh all chips for this ck
  document.querySelectorAll('.pfc-'+ck).forEach(function(el){
    var k=el.getAttribute('data-k');
    if(k&&window['pcRefreshChip_'+ck])window['pcRefreshChip_'+ck](k);
  });
}

function initPcCanvas(cfgKey){
  var CK=cfgKey;
  var SNAP=2;
  // ─── FIELDS: include posicion, matricula, telefono, QR ───
  var FIELDS=[
    {k:'posicion',l:'Nº Posición',demo:'7'},
    {k:'matricula',l:'Matrícula',demo:'AB1234CD'},
    {k:'telefonoCompleto',l:'Teléfono',demo:'+34 600 123456'},
    {k:'nombreCompleto',l:'Nombre y Apellido',demo:'Juan García'},
    {k:'empresa',l:'Empresa',demo:'Empresa Demo S.L.'},
    {k:'expositor',l:'Expositor',demo:'ExpoDemo SL'},
    {k:'montador',l:'Montador',demo:'MontajeXL'},
    {k:'hall',l:'Hall',demo:'Hall 5'},
    {k:'stand',l:'Stand',demo:'B-200'},
    {k:'puertaHall',l:'Puerta Hall',demo:'P3'},
    {k:'remolque',l:'Remolque',demo:'TR5678X'},
    {k:'tipoVehiculo',l:'Tipo Vehículo',demo:'Semiremolque'},
    {k:'descargaTipo',l:tr('descarga'),demo:'Manual'},
    {k:'tipoCarga',l:'Tipo Carga',demo:'Mercancía'},
    {k:'referencia',l:'Referencia',demo:'REF-001'},
    {k:'llamador',l:'Llamador',demo:'12345'},
    {k:'pasaporte',l:'Pasaporte/DNI',demo:'12345678Z'},
    {k:'email',l:'Email',demo:'demo@empresa.com'},
    {k:'pais',l:tr('phCountryName'),demo:'España'},
    {k:'fechaNacimiento',l:'F. Nacimiento',demo:'01/01/1985'},
    {k:'comentario',l:'Comentario',demo:'Vista previa'},
    {k:'horario',l:'Hora Ingreso',demo:'09:45'},
    {k:'eventoNombre',l:'Evento',demo:'ALIMENTARIA 2026'},
    {k:'pase',l:'Pase/Acceso',demo:'Hall 5'},
    {k:'gpsUrl',l:'GPS/Dirección',demo:'Metal·lúrgia 52'},
  ];
  // ─── AUTO LAYOUT ───
  var AUTO=[
    {k:'empresa',x:5,y:28,fs:8,line:false},{k:'expositor',x:52,y:28,fs:8,line:false},
    {k:'hall',x:5,y:33,fs:8,line:false},{k:'stand',x:52,y:33,fs:8,line:false},
    {k:'puertaHall',x:5,y:38,fs:8,line:false},{k:'remolque',x:52,y:38,fs:8,line:false},
    {k:'tipoVehiculo',x:5,y:43,fs:8,line:true},{k:'descargaTipo',x:52,y:43,fs:8,line:true},
    {k:'referencia',x:5,y:48,fs:8,line:true},{k:'montador',x:52,y:48,fs:8,line:true},
    {k:'nombreCompleto',x:5,y:53,fs:8,line:false},{k:'telefonoCompleto',x:52,y:53,fs:8,line:false},
    {k:'tipoCarga',x:5,y:58,fs:8,line:true},{k:'llamador',x:52,y:58,fs:8,line:false},
    {k:'email',x:5,y:63,fs:7,line:false},{k:'comentario',x:5,y:67,fs:7,line:true},
  ];
  function getCfg(){return CK==='ag'?DB.printCfgAg:CK==='ing2'?DB.printCfg2:DB.printCfg1;}
  function getFont(){return getCfg().font||'Arial';}
  // placed uses composite key: fieldKey or fieldKey_N for duplicates
  var placed=Object.assign({},getCfg().fieldLayout||{});
  var dragging=false,chipKey=null,startX=0,startY=0,startL=0,startT=0;
  // canvasCleared state is already set in HTML template — no JS needed here

  // ─── RESTORE BG IMAGE ───
  (function(){
    var _bc=getCfg();
    if(_bc.bgImage){
      var _bi=document.getElementById('pcbg-img-'+CK);
      if(_bi){_bi.src=_bc.bgImage;_bi.style.display='block';_bi.style.opacity=String(_bc.bgOpacity||0.35);}
    }
  }());

  // ─── SNAP GUIDES ───
  function showGuides(nx,ny,excludeKey){
    var gh=document.getElementById('pc-gh-'+CK);
    var gv=document.getElementById('pc-gv-'+CK);
    var pv=document.getElementById('pv-'+CK);
    if(!pv)return{x:nx,y:ny};
    var snapX=nx,snapY=ny;
    var anchorsH=[0,25,50,75,100];
    var anchorsV=[0,25,50,75,100];
    // Snap to other chips
    Object.keys(placed).forEach(function(k){
      if(k===excludeKey)return;
      var p=placed[k];
      anchorsH.push(p.y);
      anchorsV.push(p.x);
    });
    var snappedH=false,snappedV=false;
    anchorsV.forEach(function(v){if(Math.abs(nx-v)<SNAP){snapX=v;snappedV=true;}});
    anchorsH.forEach(function(h){if(Math.abs(ny-h)<SNAP){snapY=h;snappedH=true;}});
    if(gh){gh.style.display=snappedH?'block':'none';gh.style.top=snapY+'%';}
    if(gv){gv.style.display=snappedV?'block':'none';gv.style.left=snapX+'%';}
    return{x:snapX,y:snapY};
  }
  function hideGuides(){
    var gh=document.getElementById('pc-gh-'+CK);
    var gv=document.getElementById('pc-gv-'+CK);
    if(gh)gh.style.display='none';
    if(gv)gv.style.display='none';
  }

  // ─── CHIP HTML ───
  function chipHtml(k){
    var baseKey=k.replace(/_\d+$/,'');
    var f=FIELDS.find(function(x){return x.k===baseKey;})||{k:baseKey,l:baseKey,demo:'—'};
    var p=placed[k];if(!p)return'';
    var labelMode=_pcLabelMode[CK]||0;
    var content;
    // Special chips: QR and phrases
    if(k==='_qr'){
      var qrsz=p.fs||16;
      content='<svg width="'+qrsz+'" height="'+qrsz+'" viewBox="0 0 5 5" shape-rendering="crispEdges"><rect width="2" height="2" fill="#000"/><rect x="1" y="1" width="1" height="1" fill="#fff"/><rect x="3" width="2" height="2" fill="#000"/><rect y="3" width="2" height="2" fill="#000"/><rect x="2" y="2" width="3" height="3" fill="#000"/><rect x="3" y="3" width="2" height="2" fill="#fff"/></svg>';
    } else if(k==='_ph1'){
      var cfg1=CK==='ag'?DB.printCfgAg:CK==='ing2'?DB.printCfg2:DB.printCfg1;
      var ph1v=(cfg1.phrases&&cfg1.phrases[CUR_LANG||'es'])||'Frase 1...';
      content='<span style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+ph1v.substring(0,40)+'</span>';
    } else if(k==='_ph2'){
      var cfg2=CK==='ag'?DB.printCfgAg:CK==='ing2'?DB.printCfg2:DB.printCfg1;
      var ph2v=cfg2.phrase2||'Frase 2...';
      content='<span style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+ph2v.substring(0,40)+'</span>';
    } else if(labelMode===0){
      content='<b style="font-weight:700;font-size:inherit">'+f.l+'</b>: <span class="pfc-val">'+f.demo+'</span>';
    }else if(labelMode===1){
      content='<b style="font-weight:700;font-size:inherit">'+f.l+'</b>: <span class="pfc-line"></span>';
    }else{
      content='<span style="font-weight:400;font-size:inherit">'+f.demo+'</span>';
    }
    return content;
  }

  // ─── MAKE CHIP ───
  function make(k,xp,yp,fs,line){
    if(!placed[k])placed[k]={};
    placed[k]={x:parseFloat(xp),y:parseFloat(yp),fs:parseFloat(fs)||8,line:!!line};
    var pv=document.getElementById('pv-'+CK);if(!pv)return;
    var el=document.getElementById('pfc-'+CK+'-'+k);
    if(!el){
      el=document.createElement('div');
      el.className='pfc-'+CK;
      el.id='pfc-'+CK+'-'+k;
      el.setAttribute('data-k',k);
      el.addEventListener('mousedown',chipDown);
      el.addEventListener('touchstart',function(e){
        if(e.touches.length!==1)return;
        var touch=e.touches[0];
        var me={clientX:touch.clientX,clientY:touch.clientY,target:e.target,currentTarget:e.currentTarget,preventDefault:function(){}};
        chipDown(me);
      },{passive:true});
      pv.appendChild(el);
    }
    var lineStyle=line?';border-bottom:2.5px solid #3a4558':'';
    el.style.cssText='position:absolute;border:1.5px solid #3b5bdb;background:rgba(235,245,255,.93);border-radius:2px;padding:1px 5px 1px 4px;font-size:'+(fs||8)+'px;cursor:move;z-index:10;display:inline-flex;align-items:baseline;line-height:1.5;user-select:none;white-space:nowrap;max-width:none;font-family:'+getFont()+',Arial,sans-serif;left:'+xp+'%;top:'+yp+'%'+lineStyle;
    el.innerHTML=chipHtml(k)+'<span class="pfc-rm" style="font-size:9px;color:#999;cursor:pointer;margin-left:4px;flex-shrink:0" data-k="'+k+'">✕</span>';
    el.querySelector('.pfc-rm').onclick=function(e){e.stopPropagation();delChip(this.dataset.k);};
    pal();save();
  }

  function delChip(k){
    var el=document.getElementById('pfc-'+CK+'-'+k);
    if(el)el.remove();
    delete placed[k];
    save();pal();
  }

  function refreshChip(k){
    var el=document.getElementById('pfc-'+CK+'-'+k);
    if(!el||!placed[k])return;
    var p=placed[k];
    var lineStyle=p.line?';border-bottom:2.5px solid #3a4558':'';
    el.style.fontSize=p.fs+'px';
    el.style.fontFamily=getFont()+',Arial,sans-serif';
    el.style.cssText=el.style.cssText.replace(/border-bottom:[^;]*/,'');
    if(p.line)el.style.borderBottom='2.5px solid #3a4558';
    else el.style.borderBottom='';
    el.innerHTML=chipHtml(k)+'<span class="pfc-rm" style="font-size:9px;color:#999;cursor:pointer;margin-left:4px;flex-shrink:0" data-k="'+k+'">✕</span>';
    el.querySelector('.pfc-rm').onclick=function(e){e.stopPropagation();delChip(this.dataset.k);};
  }

  // ─── PALETTE ───
  function pal(){
    var el=document.getElementById('pc-palette-'+CK);if(!el)return;
    // Count how many instances of each base key are placed
    var placed_counts={};
    Object.keys(placed).forEach(function(k){
      var base=k.replace(/_\d+$/,'');
      placed_counts[base]=(placed_counts[base]||0)+1;
    });
    el.innerHTML=FIELDS.map(function(f){
      var cnt=placed_counts[f.k]||0;
      var isPlaced=cnt>0;
      var dot='<div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;background:'+(isPlaced?'#94a3b8':'#3b5bdb')+';margin-right:5px"></div>';
      // Duplicate button (add another instance)
      var addBtn='<button data-bk="'+f.k+'" data-action="add" style="padding:1px 5px;border-radius:20px;font-size:10px;background:#e0f2fe;color:#0369a1;border:0.5px solid #7dd3fc;cursor:pointer;flex-shrink:0" title="Añadir otro">+</button>';
      var lineBtn=isPlaced?('<button data-bk="'+f.k+'" data-action="toggle" style="padding:1px 4px;border-radius:20px;font-size:9px;border:0.5px solid #cbd5e1;background:var(--bg3);color:var(--text3);cursor:pointer;flex-shrink:0">✏</button>'):'';
      var cntBadge=cnt>1?('<span style="font-size:9px;background:#3b5bdb;color:#fff;border-radius:10px;padding:0 5px;margin-left:3px">×'+cnt+'</span>'):(isPlaced?'<span style="font-size:9px;color:#a5b4fc;margin-left:3px">✓</span>':'');
      return'<div class="fp-item-'+CK+'" id="fpi-'+CK+'-'+f.k+'" style="display:flex;align-items:center;gap:3px;padding:3px 5px;border-radius:4px;border:0.5px solid var(--border);background:var(--bg);font-size:11px;font-weight:500;user-select:none">'
        +'<div class="fp-drag-h" draggable="true" data-fk="'+f.k+'" style="display:flex;align-items:center;flex:1;cursor:grab">'
        +dot+'<span'+(isPlaced?' style="opacity:.6"':'')+'>'+f.l+'</span>'+cntBadge+'</div>'
        +lineBtn+addBtn
        +'</div>';
    }).join('');
    // Bind drag
    el.querySelectorAll('[draggable="true"]').forEach(function(e){
      e.ondragstart=function(ev){window.pcDragKey=this.dataset.fk;ev.dataTransfer.effectAllowed='move';};
    });
    // Bind add button
    el.querySelectorAll('[data-action="add"]').forEach(function(btn){
      btn.onclick=function(){
        var bk=this.dataset.bk;
        // Find next available key (bk, bk_2, bk_3, ...)
        var k=bk;
        for(var i=2;placed[k];i++){k=bk+'_'+i;}
        // Place at a default position (slightly offset from last)
        var cnt=Object.keys(placed).filter(function(pk){return pk===bk||pk.startsWith(bk+'_');}).length;
        make(k,5+(cnt*8)%60,30+(cnt*10)%50,8,false);
      };
    });
    // Bind line toggle
    el.querySelectorAll('[data-action="toggle"]').forEach(function(btn){
      btn.onclick=function(){
        var bk=this.dataset.bk;
        // Toggle first instance
        var k=placed[bk]?bk:Object.keys(placed).find(function(pk){return pk.startsWith(bk+'_');});
        if(k&&placed[k]){placed[k].line=!placed[k].line;refreshChip(k);save();pal();}
      };
    });
  }

  function save(){_pcPushHistory(CK);getCfg().fieldLayout=Object.assign({},placed);saveDB();}
  function clearAll(){
    Object.keys(placed).forEach(function(k){var el=document.getElementById('pfc-'+CK+'-'+k);if(el)el.remove();delete placed[k];});
    save();pal();hideGuides();
    // Hide fixed header/footer blocks
    var hdr=document.getElementById('pc-hdr-'+CK);
    var nfoot=document.getElementById('pc-nfoot-'+CK);
    var tfoot=document.getElementById('pc-tfoot-'+CK);
    if(hdr)hdr.style.display='none';
    if(nfoot)nfoot.style.display='none';
    if(tfoot)tfoot.style.display='none';
    getCfg().canvasCleared=true;saveDB();
  }
  function showFixedBlocks(){
    var hdr=document.getElementById('pc-hdr-'+CK);
    var cfg2=getCfg();var mode2=(window.DB&&window.DB.printCfgModes&&window.DB.printCfgModes[CK])||'normal';
    if(hdr)hdr.style.display='';
    var nfoot=document.getElementById('pc-nfoot-'+CK);
    var tfoot=document.getElementById('pc-tfoot-'+CK);
    if(nfoot)nfoot.style.display=mode2==='normal'?'block':'none';
    if(tfoot)tfoot.style.display=mode2==='troquel'?'block':'none';
    cfg2.canvasCleared=false;saveDB();
  }

  // ─── CHIP MOUSEDOWN ───
  function chipDown(e){
    if(e.target.classList.contains('pfc-rm'))return;
    var ch=e.currentTarget;var k=ch.getAttribute('data-k');
    document.querySelectorAll('.pfc-'+CK).forEach(function(c){
      c.classList.remove('pfc-sel');
      c.style.border='1.5px solid #3b5bdb';
    });
    ch.classList.add('pfc-sel');
    ch.style.border='2px solid #3a4558';
    ch.style.boxShadow='0 0 0 2px rgba(59,91,219,.3)';
    window['pcSelKey_'+CK]=k;
    var baseKey=k.replace(/_\d+$/,'');
    var f=FIELDS.find(function(x){return x.k===baseKey;})||{l:k};
    var p=placed[k]||{};
    var si=document.getElementById('pc-selinfo-'+CK);
    if(si)si.textContent=f.l+' · '+(p.fs||8)+'px · '+(p.line?'✏ línea':'📋 dato');
    // Update Línea button state
    var lb=document.getElementById('pc-linebtn-'+CK);
    if(lb){lb.style.background=p.line?'#4a5568':'';lb.style.color=p.line?'#fff':'';}
    dragging=true;chipKey=k;
    var pv=document.getElementById('pv-'+CK);if(!pv)return;
    startX=e.clientX;startY=e.clientY;
    startL=parseFloat(ch.style.left)||0;
    startT=parseFloat(ch.style.top)||0;
    e.preventDefault();
  }

  // ─── MOUSEMOVE / MOUSEUP ───
  window.addEventListener('mousemove',function _pcMM(e){
    if(!dragging||!chipKey)return;
    var pv=document.getElementById('pv-'+CK);if(!pv)return;
    var r=pv.getBoundingClientRect();
    var nx=Math.max(0,Math.min(92,startL+(e.clientX-startX)/r.width*100));
    var ny=Math.max(0,Math.min(96,startT+(e.clientY-startY)/r.height*100));
    var snapped=showGuides(nx,ny,chipKey);
    nx=snapped.x;ny=snapped.y;
    var ch=document.getElementById('pfc-'+CK+'-'+chipKey);
    if(ch){ch.style.left=nx+'%';ch.style.top=ny+'%';}
    if(placed[chipKey]){placed[chipKey].x=nx;placed[chipKey].y=ny;}
  });
  window.addEventListener('mouseup',function _pcMU(){
    if(dragging&&chipKey){save();hideGuides();}
    dragging=false;chipKey=null;
  });
  window.addEventListener('touchmove',function _pcTM(e){
    if(!dragging||!chipKey)return;
    e.preventDefault();
    var touch=e.touches[0];
    var pv=document.getElementById('pv-'+CK);if(!pv)return;
    var r=pv.getBoundingClientRect();
    var nx=Math.max(0,Math.min(92,startL+(touch.clientX-startX)/r.width*100));
    var ny=Math.max(0,Math.min(96,startT+(touch.clientY-startY)/r.height*100));
    var snapped=showGuides(nx,ny,chipKey);
    nx=snapped.x;ny=snapped.y;
    var ch=document.getElementById('pfc-'+CK+'-'+chipKey);
    if(ch){ch.style.left=nx+'%';ch.style.top=ny+'%';}
    if(placed[chipKey]){placed[chipKey].x=nx;placed[chipKey].y=ny;}
  },{passive:false});
  window.addEventListener('touchend',function _pcTE(){
    if(dragging&&chipKey){save();hideGuides();}
    dragging=false;chipKey=null;
  });

  // ─── GLOBAL HANDLERS ───
  window['pcCreateChip_'+CK]=make;
  window['pcRefreshChip_'+CK]=refreshChip;
  window['pcPlaced_'+CK]=placed;
  window['pcClearAll_'+CK]=clearAll;
  window['pcAutoPlace_'+CK]=function(){clearAll();AUTO.forEach(function(i){make(i.k,i.x,i.y,i.fs,i.line);});};

  // Touch drag desde paleta al canvas
  (function(){
    var _tKey=null,_tCk=null;
    document.addEventListener('touchstart',function(e){
      var el=e.target.closest('[draggable="true"][data-fk]');
      if(!el)return;
      _tKey=el.dataset.fk;
      _tCk=CK;
    },{passive:true});
    document.addEventListener('touchend',function(e){
      if(!_tKey)return;
      var touch=e.changedTouches[0];
      var pv=document.getElementById('pv-'+_tCk);
      if(!pv){_tKey=null;return;}
      var r=pv.getBoundingClientRect();
      if(touch.clientX>=r.left&&touch.clientX<=r.right&&touch.clientY>=r.top&&touch.clientY<=r.bottom){
        var pl=window['pcPlaced_'+_tCk]||{};
        var finalKey=_tKey;
        for(var i=2;pl[finalKey];i++){finalKey=_tKey+'_'+i;}
        var x=((touch.clientX-r.left)/r.width*100).toFixed(1);
        var y=((touch.clientY-r.top)/r.height*100).toFixed(1);
        if(window['pcCreateChip_'+_tCk])window['pcCreateChip_'+_tCk](finalKey,x,y,8,false);
      }
      _tKey=null;_tCk=null;
    },{passive:true});
  })();
  window.pcDrop=window.pcDrop||function(e,ck){
    e.preventDefault();
    var k=window.pcDragKey;if(!k)return;
    var pl=window['pcPlaced_'+ck]||{};
    // Allow multiple: if key exists, create _N suffix
    var finalKey=k;
    for(var i=2;pl[finalKey];i++){finalKey=k+'_'+i;}
    var pv=document.getElementById('pv-'+ck);if(!pv)return;
    var r=pv.getBoundingClientRect();
    var x=((e.clientX-r.left)/r.width*100).toFixed(1);
    var y=((e.clientY-r.top)/r.height*100).toFixed(1);
    if(window['pcCreateChip_'+ck])window['pcCreateChip_'+ck](finalKey,x,y,8,false);
    window.pcDragKey=null;
  };
  window.pcClickPv=window.pcClickPv||function(e,ck){
    if(!e.target.closest('.pfc-'+ck)){
      document.querySelectorAll('.pfc-'+ck).forEach(function(c){c.classList.remove('pfc-sel');c.style.boxShadow='';c.style.border='1.5px solid #3b5bdb';});
      var si=document.getElementById('pc-selinfo-'+ck);
      if(si)si.textContent='← selecciona un campo en la ficha';
      window['pcSelKey_'+ck]=null;
      var lb=document.getElementById('pc-linebtn-'+ck);
      if(lb){lb.style.background='';lb.style.color='';}
    }
  };
  window.pcToggleLine=function(ck,k){
    var pl=window['pcPlaced_'+ck];if(!pl||!pl[k])return;
    pl[k].line=!pl[k].line;
    if(window['pcRefreshChip_'+ck])window['pcRefreshChip_'+ck](k);
    var lb=document.getElementById('pc-linebtn-'+ck);
    if(lb){lb.style.background=pl[k].line?'#4a5568':'';lb.style.color=pl[k].line?'#fff':'';}
    var cfg2=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
    cfg2.fieldLayout=Object.assign({},pl);saveDB();
  };
  window.pcAutoPlace=function(ck){if(window['pcAutoPlace_'+ck])window['pcAutoPlace_'+ck]();};
  window.pcClearAll=function(ck){if(window['pcClearAll_'+ck])window['pcClearAll_'+ck]();};
function resetPrintCfgDia0(cfgKey){
  if(!confirm('⚠️ Esto borrará el layout del canvas, las plantillas guardadas y frases.\n¿Continuar?'))return;
  // Reset ALL three print configs and ALL templates (shared across tabs)
  [DB.printCfg1, DB.printCfg2, DB.printCfgAg].forEach(cfg=>{
    if(cfg){
      delete cfg.fieldLayout;delete cfg.canvasCleared;delete cfg.phrase2;
      delete cfg.phrases;delete cfg.puerta3;delete cfg.font;
      delete cfg.bgImage;delete cfg.bgOpacity;
      delete cfg.ph1On;delete cfg.ph3On;cfg.ph2On=false;
      cfg.hiddenFields=[];cfg.qrTracking=false;cfg.favEventId=null;
    }
  });
  DB.printTemplates=[];
  DB.printCfgModes={};
  saveDB();
  if(cfgKey==='ag'){goTab('impresion',null);window._impSub='ag';renderImpresion();}
  else if(cfgKey==='ing2'){goTab('impresion',null);window._impSub='ing2';renderImpresion();}
  else{goTab('impresion',null);window._impSub='ing1';renderImpresion();}
  setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);},120);
  toast('🔄 Todo reseteado a día 0 (plantillas, canvas, frases)','var(--text2)');
}
  window.pcResizeSel=function(ck,d){
    var sk=window['pcSelKey_'+ck];var pl=window['pcPlaced_'+ck];
    if(!sk||!pl||!pl[sk])return;
    pl[sk].fs=Math.max(5,Math.min(72,(pl[sk].fs||8)+d));  // max 72px
    var cfg2=ck==='ag'?DB.printCfgAg:ck==='ing2'?DB.printCfg2:ck==='cond'?DB.printCfgCond:ck==='flota'?DB.printCfgFlota:DB.printCfg1;
    cfg2.fieldLayout=Object.assign({},pl);saveDB();
    var el=document.getElementById('pfc-'+ck+'-'+sk);
    if(el)el.style.fontSize=pl[sk].fs+'px';
    var si=document.getElementById('pc-selinfo-'+ck);
    var bk=sk.replace(/_\d+$/,'');
    var f=FIELDS.find(function(x){return x.k===bk;})||{l:sk};
    if(si)si.textContent=f.l+' · '+pl[sk].fs+'px · '+(pl[sk].line?'✏ línea':'📋 dato');
  };
  window.pcToggleLineSel=function(ck){
    var sk=window['pcSelKey_'+ck];
    if(sk)window.pcToggleLine(ck,sk);
  };

  // ─── LOAD SAVED LAYOUT ───
  var saved=getCfg().fieldLayout||{};
  Object.keys(saved).forEach(function(k){
    var p=saved[k];
    if(p&&typeof p.x==='number'){make(k,p.x,p.y,p.fs,p.line);var _el=document.getElementById('pfc-'+CK+'-'+k);if(_el){if(p.bold)_el.style.fontWeight='900';if(p.italic)_el.style.fontStyle='italic';if(p.underline)_el.style.textDecoration='underline';if(p.align)_el.style.textAlign=p.align;if(p.noBg)_el.style.background='transparent';if(p.noBorder)_el.style.border='none';}}
  });
  var ev=getActiveEvent();
  var lbl=document.getElementById('pc-ev-lbl-'+CK);
  if(lbl&&ev)lbl.textContent=ev.nombre||'';
  pal();
  // Apply saved zoom
  var _savedZoom=(getCfg().zoom)||0;
  if(!_savedZoom){
    // Auto-zoom según ancho de pantalla
    var _w=document.getElementById('tab-impresion')?.offsetWidth||window.innerWidth;
    _savedZoom=Math.max(30,Math.min(100,Math.floor(_w/794*100)));
  }
  setTimeout(function(){pcSetZoom(CK,_savedZoom);},50);
}

function resetPrintCfgDia0(cfgKey){
  if(!confirm('⚠️ Esto borrará el layout del canvas, las plantillas guardadas y frases.\n¿Continuar?'))return;
  // Reset ALL three print configs and ALL templates (shared across tabs)
  [DB.printCfg1, DB.printCfg2, DB.printCfgAg].forEach(cfg=>{
    if(cfg){
      delete cfg.fieldLayout;delete cfg.canvasCleared;delete cfg.phrase2;
      delete cfg.phrases;delete cfg.puerta3;delete cfg.font;
      delete cfg.bgImage;delete cfg.bgOpacity;
      delete cfg.ph1On;delete cfg.ph3On;cfg.ph2On=false;
      cfg.hiddenFields=[];cfg.qrTracking=false;cfg.favEventId=null;
    }
  });
  DB.printTemplates=[];
  DB.printCfgModes={};
  saveDB();
  if(cfgKey==='ag'){goTab('impresion',null);window._impSub='ag';renderImpresion();}
  else if(cfgKey==='ing2'){goTab('impresion',null);window._impSub='ing2';renderImpresion();}
  else{goTab('impresion',null);window._impSub='ing1';renderImpresion();}
  setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);},120);
  toast('🔄 Todo reseteado a día 0 (plantillas, canvas, frases)','var(--text2)');
}

function renderMetricBtns(btns,M,CT,labels){
  var icons={bar:'📊',pie:'🥧',line:'📈'};
  return btns.map(function(k){
    var ico=icons[(CT&&CT[k])||'bar']||'📊';
    var h='<span style="display:inline-flex;gap:1px">';
    h+='<button class="btn btn-xs '+(M[k]?'btn-p':'btn-gh')+'" onclick="toggleMetric(\''+k+'\')">'+labels[k]+'</button>';
    if(M[k])h+='<button class="btn btn-xs" style="background:var(--bg3);border:1px solid var(--border);font-size:9px;padding:2px 5px" onclick="cycleChartType(\''+k+'\')" title="Tipo">'+ico+'</button>';
    return h+'</span>';
  }).join('');
}

function renderEstanciaMetric(ings,CT){if(!(window._anlState&&window._anlState.metrics&&window._anlState.metrics.estancia))return'';var cs=ings.filter(function(i){return i.salida&&i.entrada;});var ts=cs.map(function(i){return(new Date(i.salida.replace(' ','T'))-new Date(i.entrada.replace(' ','T')))/60000;}).filter(function(d){return d>0&&d<1440;});if(!ts.length)return'<div class="card" style="margin-bottom:6px"><b>⏱ Estancia</b><div style="font-size:11px;color:var(--text3);margin-top:6px">'+tr('noExitData')+'</div></div>';var avg=ts.reduce(function(a,b){return a+b;},0)/ts.length;var sorted=[].concat(ts).sort(function(a,b){return a-b;});var med=sorted[Math.floor(ts.length/2)];var fx=function(m){var h=Math.floor(m/60),mm=Math.round(m%60);return h?h+'h '+mm+'m':mm+'m';};var bk=[[0,30],[30,60],[60,120],[120,240],[240,480],[480,1440]];var dist=bk.map(function(ab){return{l:fx(ab[0])+'–'+fx(ab[1]),n:ts.filter(function(t){return t>=ab[0]&&t<ab[1];}).length};});var maxD=Math.max.apply(null,dist.map(function(d){return d.n;}).concat([1]));var ct=(CT&&CT.estancia)||'bar';var PC=['#4a5568','#4a5568','#4a5568','#8b5cf6','#ef4444','#06b6d4'];var body='';if(ct==='pie'){var tot=ts.length||1;var ang=-Math.PI/2;var segs=dist.filter(function(d){return d.n>0;}).map(function(d,i){var a=(d.n/tot)*2*Math.PI;var x1=60+55*Math.cos(ang),y1=60+55*Math.sin(ang);ang+=a;var x2=60+55*Math.cos(ang),y2=60+55*Math.sin(ang);return'<path d="M60,60 L'+x1.toFixed(1)+','+y1.toFixed(1)+' A55,55 0 '+(a>Math.PI?1:0)+',1 '+x2.toFixed(1)+','+y2.toFixed(1)+' Z" fill="'+PC[i%6]+'" opacity=".85"/>';});body='<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap"><svg width="110" height="110" viewBox="0 0 120 120">'+segs.join('')+'</svg><div>'+dist.filter(function(d){return d.n>0;}).map(function(d,i){return'<div style="font-size:10px;display:flex;align-items:center;gap:4px"><div style="width:10px;height:10px;border-radius:2px;background:'+PC[i%6]+'"></div>'+d.l+': <b>'+d.n+'</b></div>';}).join('')+'</div></div>';}else{body=dist.map(function(d){return'<div class="bar-row"><span style="font-size:9px;min-width:68px;color:var(--text3)">'+d.l+'</span><div class="bar-bg"><div class="bar-fill" style="width:'+Math.round(d.n/maxD*100)+'%;background:#4a5568"></div></div><span class="bar-val">'+d.n+'</span></div>';}).join('');}return'<div class="card" style="margin-bottom:6px"><div style="font-weight:800;margin-bottom:6px">⏱ Estancia ('+ts.length+' veh.) · avg '+fx(avg)+' · med '+fx(med)+'</div><div style="display:flex;gap:12px;font-size:11px;margin-bottom:6px"><span>Min: <b>'+fx(sorted[0])+'</b></span><span>Max: <b>'+fx(sorted[sorted.length-1])+'</b></span></div>'+body+'</div>';}

function renderRefVsIngMetric(ings,selEv,CT){if(!(window._anlState&&window._anlState.metrics&&window._anlState.metrics.refvsing))return'';var rN=DB.ingresos.filter(function(i){return!selEv||i.eventoId===selEv.id;}).length;var iN=(DB.ingresos2||[]).filter(function(i){return!selEv||i.eventoId===selEv.id;}).length;var tot=rN+iN||1;var ct=(CT&&CT.refvsing)||'bar';var rPct=Math.round(rN/tot*100);var iPct=100-rPct;if(ct==='pie'){var pts=[{v:rN,c:'#4a5568',l:'🔖 Ref'},{v:iN,c:'#4a5568',l:'🚛 Ing'}].filter(function(p){return p.v>0;});var a=-Math.PI/2;var segs=pts.map(function(p){var ang=(p.v/tot)*2*Math.PI;var x1=60+55*Math.cos(a),y1=60+55*Math.sin(a);a+=ang;var x2=60+55*Math.cos(a),y2=60+55*Math.sin(a);return'<path d="M60,60 L'+x1.toFixed(1)+','+y1.toFixed(1)+' A55,55 0 '+(ang>Math.PI?1:0)+',1 '+x2.toFixed(1)+','+y2.toFixed(1)+' Z" fill="'+p.c+'" opacity=".85"/>';});return'<div class="card" style="margin-bottom:6px"><div style="font-weight:800;margin-bottom:8px">🔄 Ref vs Ing</div><div style="display:flex;align-items:center;gap:4px"><svg width="110" height="110" viewBox="0 0 120 120">'+segs.join('')+'</svg><div>'+pts.map(function(p){return'<div style="font-size:11px;display:flex;align-items:center;gap:4px"><div style="width:10px;height:10px;border-radius:2px;background:'+p.c+'"></div>'+p.l+': <b>'+p.v+'</b> ('+Math.round(p.v/tot*100)+'%)</div>';}).join('')+'</div></div></div>';}return'<div class="card" style="margin-bottom:6px"><div style="font-weight:800;margin-bottom:8px">🔄 Ref vs Ing ('+(rN+iN)+')</div><div style="height:12px;border-radius:6px;overflow:hidden;display:flex;margin-bottom:8px"><div style="width:'+rPct+'%;background:#4a5568;font-size:9px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">'+(rPct>15?rPct+'%':'')+'</div><div style="flex:1;background:#4a5568;font-size:9px;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">'+(iPct>15?iPct+'%':'')+'</div></div><div style="display:flex;gap:12px;margin-bottom:8px"><span style="font-size:12px"><b style="color:#4a5568">'+rN+'</b> 🔖 Ref</span><span style="font-size:12px"><b style="color:#4a5568">'+iN+'</b> Ing</span></div></div>';}

function dlTemplateFlota(){
  const {headerRow,descRow,exRow,evNom}=_buildTemplate('flota');
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet([headerRow,descRow,exRow]);
  XLSX.utils.book_append_sheet(wb,ws,'Embalaje');
  XLSX.writeFile(wb,'plantilla_embalaje'+(evNom?'_'+evNom.replace(/\s/g,'_').slice(0,20):'')+'.xlsx');
  toast('📥 Plantilla Embalaje — '+(evNom||'sin evento')+' · '+(headerRow.length-1)+' campos','#4a5568');
}

function dlTemplateIng(){
  const {headerRow,descRow,exRow,evNom}=_buildTemplate('ingresos');
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet([headerRow,descRow,exRow]);
  XLSX.utils.book_append_sheet(wb,ws,'Referencia');
  XLSX.writeFile(wb,'plantilla_referencia'+(evNom?'_'+evNom.replace(/\s/g,'_').slice(0,20):'')+'.xlsx');
  toast('📥 Plantilla Referencia — '+(evNom||'sin evento')+' · '+(headerRow.length-1)+' campos','#4a5568');
}

function dlTemplateIng2(){
  const {headerRow,descRow,exRow,evNom}=_buildTemplate('ingresos2');
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet([headerRow,descRow,exRow]);
  XLSX.utils.book_append_sheet(wb,ws,'Ingresos');
  XLSX.writeFile(wb,'plantilla_ingresos'+(evNom?'_'+evNom.replace(/\s/g,'_').slice(0,20):'')+'.xlsx');
  toast('📥 Plantilla Ingresos — '+(evNom||'sin evento')+' · '+(headerRow.length-1)+' campos','#4a5568');
}

function dlTemplateAg(){
  const {headerRow,descRow,exRow,evNom}=_buildTemplate('agenda');
  const wb=XLSX.utils.book_new();
  const ws=XLSX.utils.aoa_to_sheet([headerRow,descRow,exRow]);
  XLSX.utils.book_append_sheet(wb,ws,'Agenda');
  XLSX.writeFile(wb,'plantilla_agenda'+(evNom?'_'+evNom.replace(/\s/g,'_').slice(0,20):'')+'.xlsx');
  toast('📥 Plantilla Agenda — '+(evNom||'sin evento')+' · '+(headerRow.length-1)+' campos','#4a5568');
}

function _pCalcForecast(n){
  n=n||1;
  var dias=0,visitas=0,impacto='—';
  if(n===1){dias=4;visitas=4;impacto='Medio';}
  else if(n===2){
    var d=document.getElementById('pNrefDesde'),h=document.getElementById('pNrefHasta');
    if(d&&h&&d.value&&h.value){
      var ms=new Date(h.value)-new Date(d.value);dias=Math.max(1,Math.round(ms/86400000)+1);visitas=dias;
      impacto=dias<=2?'Bajo':dias<=6?'Medio':'Alto';
    }
  } else if(n===3){dias=30;visitas=Math.round(30*3/7);impacto='Medio';}
  else if(n===4){dias=365;visitas=52;impacto='Alto';}
  var sv=function(id,v){var e=document.getElementById(id);if(e)e.textContent=v;};
  sv('pFcDias',dias||'—');sv('pFcVisitas',visitas?('~'+visitas):'—');sv('pFcImpacto',impacto);
}


function toggleQR(cfgKey){const c2=cfgKey==='ing2'?DB.printCfg2:DB.printCfg1;c2.qrTracking=!(c2.qrTracking!==false);saveDB();if(cfgKey==='ing2'){iF._sub2='print';renderIngresos2();}else{iF._sub='print';renderIngresos();}setTimeout(()=>{initPrintLayout(cfgKey);initPcCanvas(cfgKey);if(c2.qrTracking&&window['pcMake_'+cfgKey]){const _pl=window['pcPlaced_'+cfgKey]||{};if(!_pl['_qr'])window['pcMake_'+cfgKey]('_qr',75,3,20,false);}},200);toast(c2.qrTracking?'📱 QR añadido al canvas — arrastralo':'📱 QR desactivado','#4a5568');}


function pfiDS(e){_dragSrc=e.currentTarget;e.currentTarget.classList.add('dragging');e.dataTransfer.effectAllowed='move';}


function pfiDO(e){e.preventDefault();e.dataTransfer.dropEffect='move';}


function pfiDP(e,cfgKey){e.preventDefault();if(!_dragSrc||_dragSrc===e.currentTarget)return;const _ck=cfgKey||_dragSrc.dataset.cfg;const gridId=_ck==='ag'?'printLayoutGridAg':_ck==='ing2'?'printLayoutGrid2':'printLayoutGrid';const grid=document.getElementById(gridId);if(!grid)return;const items=[...grid.querySelectorAll('.pfi')];const from=items.indexOf(_dragSrc),to=items.indexOf(e.currentTarget);if(from<0||to<0)return;const order=items.map(el=>el.dataset.field);order.splice(to,0,order.splice(from,1)[0]);const cfg=_ck==='ag'?DB.printCfgAg:_ck==='ing2'?DB.printCfg2:DB.printCfg1;cfg.fieldOrder=order;saveDB();initPrintLayout(_ck);}


function pfiDE(e){e.currentTarget.classList.remove('dragging');}


function togglePF(f,cfgKey){
  const cfg=(cfgKey==='ag')?DB.printCfgAg:(cfgKey==='ing2')?DB.printCfg2:DB.printCfg1;
  if(!cfg.hiddenFields)cfg.hiddenFields=[];
  const idx=cfg.hiddenFields.indexOf(f);
  if(idx>=0)cfg.hiddenFields.splice(idx,1);else cfg.hiddenFields.push(f);
  saveDB();
  const chipsEl=document.getElementById(cfgKey==='ing2'?'printChips2':'printChips1');
  if(chipsEl){chipsEl.innerHTML=PRINT_DEF.map(fld=>{const hidden=(cfg.hiddenFields||[]).includes(fld);return`<span onclick="togglePF('${fld}','${cfgKey||'ing1'}')" style="display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:12px;border:1px solid ${hidden?'var(--border)':'#4a5568'};background:${hidden?'var(--bg2)':'#4a5568'};color:${hidden?'var(--text4)':'#fff'};font-size:10px;font-weight:700;cursor:pointer;user-select:none;transition:all .15s;opacity:${hidden?'.45':'1'}">${hidden?'✕':'✓'} ${PRINT_LABELS[fld]||fld}</span>`;}).join('');}
  initPrintLayout(cfgKey||'ing1');
}


function adj(dx,dy){
  ox=Math.round((ox+dx)*10)/10;
  oy=Math.round((oy+dy)*10)/10;
  pg.style.transform='translate('+ox+'mm,'+oy+'mm)';
  document.getElementById('vx').textContent=(ox>=0?'+':'')+ox+'mm';
  document.getElementById('vy').textContent=(oy>=0?'+':'')+oy+'mm';
}


function tog(){
  gon=!gon;
  document.getElementById('guide').style.display=gon?'block':'none';
}


function rst(){ox=0;oy=0;pg.style.transform='';document.getElementById('vx').textContent='+0mm';document.getElementById('vy').textContent='+0mm';}

