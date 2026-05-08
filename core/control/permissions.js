/* core/permissions — 25 funciones */

function isSA(){return CU?.rol==='superadmin';}

function canClean(){return isSA()||hasPerm('canClean');}

function toggleCleanPermission(uid){
  const u=DB.usuarios.find(x=>x.id===uid);if(!u||u.rol!=='supervisor')return;
  u.canClean=!u.canClean;saveDB();renderUsuarios();
  toast(u.canClean?'🔓 Permiso limpiar activado':'🔒 Permiso limpiar desactivado',u.canClean?'#4a5568':'var(--amber)');
}

function isSup(){return CU?.rol==='superadmin'||CU?.rol==='supervisor';}

function hasPerm(k){if(!CU)return false;if(isSup())return true;return!!(CU.permisos&&CU.permisos[k]);}

function canAdd(){return hasPerm('canAdd');}

function canEdit(){return hasPerm('canEdit');}

function canDel(){return hasPerm('canDel');}

function canStatus(){return hasPerm('canStatus');}

function canExport(){return hasPerm('canExport');}

function canSpecial(){return hasPerm('canSpecial');}

function canPrint(){return hasPerm('canPrint');}

function canImport(){return hasPerm('canImport');}

function canCampos(){return isSup()||hasPerm('canCampos');}

function canOcr(){return isSA()||hasPerm('canOcr');}

function _setOcrSvc(svc){if(typeof DB==='undefined')return;DB.ocrService=svc;if(typeof saveDB==='function')saveDB();if(window._OCR&&typeof window._OCR.setService==='function')window._OCR.setService(svc);if(typeof renderUsuarios==='function')renderUsuarios();if(typeof _updateOcrSvcToggleUI==='function')_updateOcrSvcToggleUI();}

function canCleanPerm(){return isSA()||hasPerm('canClean');}

function canSaveTpl(){return hasPerm('canSaveTpl');}

function canDelTpl(){return isSA()||hasPerm('canDelTpl');}

function canActivarEvento(){return isSA();}

function canDesactivarEvento(){return isSA();}

function canMensajes(){return hasPerm('canMensajes');}

function canEditEvento(){return isSA()||hasPerm('canEditEvento');}

function updateRolPerms(){const rol=(document.getElementById('fuRol')||{}).value||'editor';const full=rol==='supervisor'||rol==='superadmin';['fpAdd','fpEdit','fpDel','fpStat','fpExp','fpBL','fpPrint','fpImport','fpClean','fpSaveTpl','fpDelTpl','fpEvEdit','fpActivarEv','fpSave','fpMsg'].forEach(id=>{const el=document.getElementById(id);if(el){el.checked=full;el.disabled=full;updTgl(el);}});const pw=document.getElementById('permsWrap');if(pw)pw.style.opacity=full?'.6':'1';}

function updTgl(el){const lbl=el.closest('.tgl');if(!lbl)return;if(el.checked){lbl.classList.add('on');}else{lbl.classList.remove('on');}}

