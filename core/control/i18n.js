/* core/i18n — 18 funciones */

function tr(k){return(I18N[CUR_LANG]&&I18N[CUR_LANG][k])||(I18N.es&&I18N.es[k])||k;}

function setLang(l){CUR_LANG=(l&&I18N[l])?l:'es';try{if(l&&l!=='es')localStorage.setItem(SK+'_lang',CUR_LANG);else localStorage.removeItem(SK+'_lang');}catch(e){}if(typeof updateThemeMenuLabels==='function')updateThemeMenuLabels();}

function applyLang(){
  // RTL support for Arabic
  document.documentElement.dir=CUR_LANG==='ar'?'rtl':'ltr';
  if(typeof applyLoginScreenLang==='function')applyLoginScreenLang();
  if(typeof applyPortalLang==='function')setTimeout(applyPortalLang,0);
  const _TAB_SVG={
    'dash':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    'ingresos':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>',
    'ingresos2':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8l5 3-5 3"/></svg>',
    'flota':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>',
    'conductores':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/></svg>',
    'agenda':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>',
    'analytics':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    'vehiculos':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    'auditoria':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>',
    'impresion':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    'recintos':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'eventos':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>',
    'papelera':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>',
    'mensajes':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
    'usuarios':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    'empresas':'<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>'
  };

  document.querySelectorAll('#mainTabs .btn-tab').forEach(el=>{const k=el.dataset.tab;if(k){const t18=I18N[CUR_LANG]||I18N.en||I18N.es||{};const lbl=t18[k];if(lbl){const svg=_TAB_SVG[k]||'';el.innerHTML=svg+(typeof lbl==='string'?lbl.replace(/^[^\s]*\s/,''):lbl);}}});const lb=document.getElementById('btnLang');if(lb){const l=LANGS_UI.find(x=>x.code===CUR_LANG);const f=l?l.flag:'';lb.innerHTML='🌐 '+(f.includes('<svg')?f:f);}if(CU)renderTab(curTab);if(typeof updateThemeMenuLabels==='function')updateThemeMenuLabels();var _pvft=document.getElementById('pVehFormTitle');if(_pvft)_pvft.textContent='Añadir vehículo';
  // Actualizar labels estáticos con IDs
  var _staticLabels={
    'lbl_deleteConfirm':'deleteConfirm','lbl_yesDelete':'yesDelete',
    'lbl_ingresos7days':'ingresos7days','lbl_noScansYet':'noScansYet',
    'lbl_activeHalls':'activeHalls','lbl_latestEntries':'latestEntries',
    'lbl_emptyTrash':'emptyTrash','lbl_waitingEmpty':'waitingEmpty',
    'lbl_specialEmpty':'specialEmpty','lbl_addPlate':'addPlate',
    'lbl_allRead':'allRead','lbl_noData2':'noData2',
    'lbl_noPlatesYet':'noPlatesYet','lbl_noVehicles':'noVehicles'
  };
  var _agPh=document.getElementById('agendaSearchPh');if(_agPh)_agPh.placeholder="'+'Matrícula, ref, conductor…'+'";
  Object.keys(_staticLabels).forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.textContent=tr(_staticLabels[id]);
  });
  // Labels modales y UI estática
  var _modalLabels={
    'lbl_mLN_title':'specialTitle','lbl_mLN_cancel':'cancel','lbl_mLN_add':'addBtn',
    'lbl_mLN_mat':'matricula','lbl_mLN_nivel':'levelLabel','lbl_mLN_motivo':'lblMotivo',
    'lbl_mLN_emp':'empresa','lbl_mLN_hasta':'lblValidUntil',
    'lbl_mMsg_title':'newMessage','lbl_mMsg_cancel':'cancel','lbl_mMsg_send':'msgSendBtn',
    'lbl_mUser_cancel':'cancel','lbl_mUser_create':'createBtn',
    'lbl_permAction':'permAction','lbl_permDesc':'permDesc','lbl_permActive':'permActiveCol',
    'lbl_tabsVisible':'tabsVisible','lbl_globalSearch':'globalSearch',
    'lbl_scanPlate':'scanPlate','lbl_langTitle':'langTitle','lbl_langSubtitle':'langSubtitle',
    'lbl_delTitle':'delConfirmTitle','lbl_entryDetail':'entryDetail',
    // Permisos filas — acciones
    'perm_add_lbl':'permAddLbl','perm_edit_lbl':'permEditLbl',
  };
  Object.keys(_modalLabels).forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.textContent=tr(_modalLabels[id]);
  });
  // Labels permisos filas — descripción
  var _permDescs={
    'perm_add_desc':'permAddDesc','perm_edit_desc':'permEditDesc',
  };
  Object.keys(_permDescs).forEach(function(id){
    var el=document.getElementById(id);if(el)el.textContent=tr(_permDescs[id]);
  });
  // Placeholder búsqueda global
  var _gs=document.getElementById('globalSearchPh');if(_gs)_gs.placeholder="'+'Buscar posición, matrícula, nombre, empresa, referencia...'+'";
  // Primera configuración — actualizar si está visible
  var _frTitle=document.querySelector('#firstRunWrap [style*="font-size:20px"]');
  if(_frTitle)_frTitle.textContent='Primera configuración';
  var _frSub=document.querySelector('#firstRunWrap [style*="font-size:12px"]');
  if(_frSub)_frSub.textContent='Crea el usuario SuperAdmin inicial';
  var _frBtn=document.querySelector('#firstRunWrap .btn-p');
  if(_frBtn)_frBtn.textContent='✓ Crear SuperAdmin y continuar';
  // Labels primera config
  var _frLabels={'fr_nom':'frNomLbl','fr_user':'frUserLbl','fr_email':'frEmailLbl','fr_pin':'frPinLbl'};
  Object.keys(_frLabels).forEach(function(id){
    var inp=document.getElementById(id);
    if(inp){var lbl=inp.closest('.fg')?.querySelector('.flbl');if(lbl){lbl.childNodes[0].textContent=tr(_frLabels[id])+' ';}}
  });
  // ── Actualizar elementos con data-i18n (textContent) ──
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    var k=el.getAttribute('data-i18n');
    if(!k)return;
    var val=tr(k);
    if(val && val!==k){
      // Preservar elementos hijos (span.freq etc)
      var firstChild=el.firstChild;
      if(firstChild && firstChild.nodeType===3){firstChild.textContent=val+' ';}
      else if(!el.children.length){el.textContent=val;}
    }
  });
  // ── Actualizar TODOS los inputs con data-i18n-ph (placeholder traducible) ──
  document.querySelectorAll('[data-i18n-ph]').forEach(function(el){
    var k=el.getAttribute('data-i18n-ph');
    if(k)el.placeholder=tr(k);
  });
  // Placeholders inputs modales y formularios
  var _phs={
    'fiMat':null,'fiPais':'phCountry','agChoferSearch':'phSearchDriver',
    'agPuertaHall':'phHallDoor','agReqInput':'phRequirement',
    'fcEncargado':'phManager','fcEncEmail':'phManagerEmail',
    'evNom':'phEventName','fuEmail':'phAdminEmail',
    'fuPass':'phLeaveEmpty','fuPass2':'phRepeatPass',
    'fpNewPass':'phMinPass','fpNewPass2':'phRepeatPass',
    'fr_nom':'phAdminName','fr_user':'phUsername',
    'fr_email':'phAdminEmail','fr_pass':'phMinPass',
    'fr_pass2':'phRepeatPass','fr_pin':'phQuickPin',
    'fuUsername':'phUsername'
  };
  // Labels modal usuario
  var _userLabels={};
  // flbl de cada fg en modal usuario — se hace vía IDs de spans que ya existen (lbl_loginIdent etc)
  // Confirmar contraseña en modal usuario
  var _fuP2=document.getElementById('fuPass2');
  if(_fuP2){var _lbl=_fuP2.closest && _fuP2.closest('.fg');if(_lbl){var _sp=_lbl.querySelector('.flbl');if(_sp)_sp.childNodes[0] && (_sp.childNodes[0].textContent='Confirmar contraseña'+' ');}}
  Object.keys(_phs).forEach(function(id){
    var key=_phs[id];if(!key)return;
    var el=document.getElementById(id);
    if(el)el.placeholder=tr(key);
  });
  // Búsqueda referencia (fiMatResults input)
  var _fiMatInput=document.querySelector('#fiMatResults input,[id^=fiMat]');
  var _refSearch=document.getElementById('fiMat');
  if(_refSearch)_refSearch.placeholder="'+'🔍 Matrícula, nombre o empresa...'+'";
}

function openLangPicker(){pendingLangCode=CUR_LANG;buildLangGrid('langGrid',pendingLangCode,'selectLang2');document.getElementById('mLangPicker').classList.add('open');}

function buildLangGrid(gid,sel,fn){
  var el=document.getElementById(gid);if(!el)return;
  el.innerHTML='';
  LANGS_UI.forEach(function(l){
    var d=document.createElement('div');
    d.className='lang-item'+(l.code===sel?' sel':'');
    d.title=l.name;
    if(l.code===sel){d.style.background='#1e3a5f';d.style.borderColor='#1e3a5f';d.style.color='#fff';}
    var inner=document.createElement('div');
    inner.style.cssText='height:22px;display:flex;align-items:center;justify-content:center';
    if(l.flag.includes('<svg')){inner.innerHTML=l.flag;}
    else{var sp=document.createElement('span');sp.style.fontSize='20px';sp.textContent=l.flag;inner.appendChild(sp);}
    var lbl=document.createElement('div');
    lbl.style.cssText='font-size:9px;font-weight:700;margin-top:2px';
    lbl.textContent=l.name;
    d.appendChild(inner);d.appendChild(lbl);
    (function(code,f){d.onclick=function(){(window[f]||function(){})(code);};})(l.code,fn);
    el.appendChild(d);
  });
}

function buildLangDropdown(sel,selected){
  var _svgFallback={'ca':'🏴󠁥󠁳󠁣󠁴󠁿 ','eu':'🏴󠁥󠁳󠁰󠁶󠁿 ','gl':'🏴󠁥󠁳󠁧󠁡󠁿 '};
  sel.innerHTML=LANGS_UI.map(function(l){
    var f=l.flag.includes('<svg')?(_svgFallback[l.code]||''):l.flag+' ';
    return'<option value="'+l.code+'"'+(l.code===selected?' selected':'')+'>'+(f)+l.name+'</option>';
  }).join('');
  sel.value=selected||'es';
}

function selectLang2(c){pendingLangCode=c;buildLangGrid('langGrid',c,'selectLang2');}

function confirmLang(){setLang(pendingLangCode);try{if(pendingLangCode&&pendingLangCode!=='es')localStorage.setItem(SK+'_lang',pendingLangCode);else localStorage.removeItem(SK+'_lang');}catch(e){}if(CU){CU.lang=pendingLangCode;DB.usuarios=DB.usuarios.map(u=>u.id===CU.id?{...u,lang:pendingLangCode}:u);saveDB();saveSession();}applyLang();closeOv('mLangPicker');const l=LANGS_UI.find(x=>x.code===pendingLangCode);toast(('Idioma guardado'||'OK')+' '+(l?l.flag:''),'var(--text2)');renderHdr();}

function fillIdiomaSelect(){const el=document.getElementById('fcIdioma');if(!el)return;el.innerHTML=`<option value="">--</option>`+LANGS_UI.map(l=>`<option value="${l.code}">${l.flag.includes('<svg')?'🏴':l.flag} ${l.name}</option>`).join('');}

function fillLangIng(){const el=document.getElementById('fiLang');if(!el)return;el.innerHTML=Object.entries(LANGS).map(([k,v])=>`<option value="${k}">${v.n}</option>`).join('');}

function ptr(k){var lang=_regLang||CUR_LANG||'es';return(PI18N[lang]&&PI18N[lang][k])||(PI18N.es&&PI18N.es[k])||k;}

function applyTheme(theme){
  _curTheme = theme;
  var root = document.documentElement;
  if(theme === 'light') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  // Update button icon
  var icon = document.getElementById('themeIcon');
  if(icon) icon.textContent = THEME_ICONS[theme]||'☀️';

  // Update portal header logo color if dark
  var logotxt = document.querySelector('.logo span[style*="color:#0f172a"]');
  // Save
  try{var _sk=typeof SK!=='undefined'?SK:'cu1';localStorage.setItem(_sk+'_theme', theme);}catch(e){}
}

function toggleThemeMenu(){
  var menu = document.getElementById('themeMenu');
  if(!menu) return;
  if(menu.style.display !== 'none'){menu.style.display='none'; return;}
  updateThemeMenuLabels();
  menu.style.display = 'block';
  setTimeout(function(){
    document.addEventListener('click', function _tc(e){
      if(!e.target.closest('#themeMenu') && !e.target.closest('#btnTheme')){
        menu.style.display='none';
        document.removeEventListener('click',_tc);
      }
    });
  },10);
}

function updateThemeMenuLabels(){
  var menu = document.getElementById('themeMenu');
  if(!menu) return;
  var t = function(k){return (I18N[CUR_LANG||'es']&&I18N[CUR_LANG||'es'][k])||(I18N.es&&I18N.es[k])||k;};
  // Update the visible label on the button itself
  var lbl = document.getElementById('themeLbl');
  if(lbl) lbl.textContent = t('tema');

  var icon = document.getElementById('themeIcon');
  if(icon) icon.textContent = THEME_ICONS[_curTheme]||'☀️';
  menu.innerHTML = THEME_ORDER.map(function(th){
    var active = th === _curTheme;
    return '<div onclick="selectTheme(\''+th+'\');" style="display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:6px;cursor:pointer;font-size:12px;color:var(--text);background:'+(active?'var(--bll)':'transparent')+';font-weight:'+(active?'700':'400')+'" onmouseover="this.style.background=\'var(--bg3)\'" onmouseout="this.style.background=\''+(active?'var(--bll)':'transparent')+'\'">'+
      '<span style="font-size:14px">'+THEME_ICONS[th]+'</span>'+
      '<span>'+t(THEME_KEYS[th])+'</span>'+
      (active?'<span style="margin-left:auto;color:#4a5568;font-size:10px">✓</span>':'')+
      '</div>';
  }).join('');
}

function selectTheme(theme){
  document.getElementById('themeMenu').style.display='none';
  applyTheme(theme);
  // Re-render header button label in current language
  updateThemeMenuLabels();
}

function applyLang(){
  _origApplyLang.apply(this, arguments);
  // Update theme button tooltip/label in current language
  var btn = document.getElementById('btnTheme');
  var t = function(k){return (I18N[CUR_LANG||'es']&&I18N[CUR_LANG||'es'][k])||(I18N.es&&I18N.es[k])||k;};
  if(btn) btn.title = t('tema');
}

function _buildRegLangGrid(){
  var g=document.getElementById('regLangGrid');if(!g)return;
  g.innerHTML=LANGS_UI.map(function(l){
    return'<div class="lang-item-p'+(l.code===_regLang?' sel':'')+'" onclick="regSelLang(\''+l.code+'\',this)">'+
      '<span class="lf">'+(l.flag.includes('<svg')?l.flag:'<span style="font-size:17px">'+l.flag+'</span>')+'</span>'+
      '<span class="ln">'+l.name+'</span></div>';
  }).join('');
  var cb=document.getElementById('regLangContinueBtn');
  if(cb)cb.textContent='→ '+_regLang.toUpperCase();
}

function _applyRegI18n(){
  var t=function(k){return ptr(k);};
  var ids={regTxtDatosEmpresa:'datosEmp',regTxtSiguiente:'siguiente',regTxtScroll:'scroll',
    regTxtEnviarOTP:'enviarOTP',regTxtCodigoEnviado:'codigoEnv',regTxtOTPDesc:'otpDesc',
    regTxtReenviar:'reenviar',regTxtConfirmarFirma:'confirmarFirma',regTxtVolver:'volver',
    regBackLbl:'backLbl',regTxtEntrar:'entrar',regTxtC1:'c1',regTxtC2:'c2'};
  Object.keys(ids).forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=t(ids[id]);});
  var cb=document.getElementById('regContinueLbl');if(cb)cb.textContent='→ '+_regLang.toUpperCase();
  var doc=document.getElementById('regRgpdDoc');if(doc)doc.innerHTML=RGPD_DOC[_regLang]||RGPD_DOC.en;
}

