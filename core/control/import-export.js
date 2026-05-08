/* core/import-export — 6 funciones */

function importXlsxCond(inp){if(!canImport()){toast('Sin permiso para importar','var(--red)');return;};const file=inp.files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>{try{const wb=XLSX.read(e.target.result,{type:'binary'});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});let added=0,updated=0;rows.forEach((row,idx)=>{const allEmpty=Object.values(row).every(v=>String(v).trim()==='');if(allEmpty)return;const nom=String(row['Nombre']||'').trim()||('Conductor '+(idx+1));const ape=String(row['Apellido']||'').trim()||'–';const c={id:uid(),nombre:nom,apellido:ape,empresa:String(row['Empresa']||'').trim(),matricula:String(row['Matricula']||'').trim().toUpperCase(),remolque:String(row['Remolque']||'').trim().toUpperCase(),telefono:String(row['Telefono']||'').trim(),hall:String(row['Hall']||'').trim(),tipoVehiculo:String(row['TipoVehiculo']||'').trim(),idioma:String(row['Idioma']||'').trim()};const ei=DB.conductores.findIndex(x=>x.nombre===nom&&x.apellido===ape);if(ei>=0){DB.conductores[ei]={...DB.conductores[ei],...c,id:DB.conductores[ei].id};updated++;}else{DB.conductores.push(c);added++;}});saveDB();renderConductores();toast('✅ '+added+' añadidos, '+updated+' actualizados');}catch(err){toast('❌ Error: '+err.message,'var(--red)');}inp.value='';};reader.readAsBinaryString(file);}

function importXlsxIng(inp){if(!canImport()){toast('Sin permiso para importar','var(--red)');return;};const file=inp.files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>{try{const wb=XLSX.read(e.target.result,{type:'binary'});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});let added=0,updated=0;rows.forEach((row,idx)=>{const allEmpty=Object.values(row).every(v=>String(v).trim()==='');if(allEmpty)return;const mat=String(row['Matricula']||row['Matrícula']||'').trim().toUpperCase();const hall=String(row['Hall']||'').trim();const ing={id:uid(),pos:String(row['Pos']||'').trim(),matricula:mat,llamador:String(row['Llamador']||'').trim(),referencia:String(row['Referencia']||row['Ref']||'').trim().toUpperCase(),nombre:String(row['Nombre']||'').trim(),apellido:String(row['Apellido']||'').trim(),empresa:String(row['Empresa']||'').trim(),montador:String(row['Montador']||'').trim(),expositor:String(row['Expositor']||'').trim(),hall,halls:hall?[hall]:[],stand:String(row['Stand']||'').trim(),remolque:String(row['Remolque']||'').trim().toUpperCase(),pasaporte:String(row[tr('pasaporte')]||'').trim(),telefono:String(row['Telefono']||'').trim(),email:String(row['Email']||'').trim(),comentario:String(row['Comentario']||'').trim(),descargaTipo:String(row[tr('descarga')]||'').trim(),tipoVehiculo:String(row['TipoVehiculo']||'').trim(),eventoNombre:String(row['Evento']||'').trim(),lang:String(row['Idioma']||'es').trim(),entrada:row['Entrada']||nowL(),salida:row['Salida']&&row['Salida']!=='En recinto'?row['Salida']:null,creadoPor:'Importación'};const ei=DB.ingresos.findIndex(x=>x.matricula===mat&&x.entrada?.slice(0,10)===ing.entrada?.slice(0,10));if(ei>=0){DB.ingresos[ei]={...DB.ingresos[ei],...ing,id:DB.ingresos[ei].id};updated++;}else{DB.ingresos.push(ing);added++;}});saveDB();renderIngresos();renderHdr();toast('✅ '+added+' importados, '+updated+' actualizados');}catch(err){toast('❌ Error: '+err.message,'var(--red)');}inp.value='';};reader.readAsBinaryString(file);}

function importXlsxAg(inp){if(!canImport()){toast('Sin permiso para importar','var(--red)');return;};const file=inp.files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>{try{const wb=XLSX.read(e.target.result,{type:'binary'});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});let added=0;rows.forEach((row,idx)=>{const allEmpty=Object.values(row).every(v=>String(v).trim()==='');if(allEmpty)return;const mat=String(row['Matricula']||row['Matrícula']||'').trim().toUpperCase();// Saltar filas de cabecera/descripción de plantilla (tienen espacios o acentos en mat)
if(mat&&(/ /.test(mat)||mat.length>12||/[ÁÉÍÓÚÑ]/.test(mat)))return;const fecha=String(row['Fecha']||new Date().toISOString().slice(0,10)).trim();const hora=String(row['HoraPlan']||row['Hora']||'00:00').trim();const _evNomRow=String(row['Evento']||'').trim();const _workEv=getUserWorkEvent()||getActiveEvent();const _evMatch=_evNomRow?(DB.eventos||[]).find(e=>e.nombre===_evNomRow||e.nombre.toUpperCase()===_evNomRow.toUpperCase()):null;const _ev=_evMatch||_workEv||null;const a={id:uid(),fecha,hora,matricula:mat,eventoId:_ev?_ev.id:null,remolque:String(row['Remolque']||'').trim().toUpperCase(),conductor:String(row['Conductor']||'').trim(),empresa:String(row['Empresa']||'').trim(),referencia:String(row['Referencia']||'').trim().toUpperCase(),montador:String(row['Montador']||'').trim(),expositor:String(row['Expositor']||'').trim(),hall:String(row['Hall']||'').trim(),stand:String(row['Stand']||'').trim(),tipoCarga:String(row[tr('carga')]||'').trim(),telefono:String(row['Telefono']||'').trim(),notas:String(row['Notas']||'').trim(),eventoNombre:_ev?_ev.nombre:(String(row['Evento']||'').trim()),descargaTipo:String(row[tr('descarga')]||'').trim(),tipoVehiculo:String(row['TipoVehiculo']||'').trim(),puertaHall:String(row['PuertaHall']||'').trim(),estado:String(row['Estado']||'PENDIENTE').trim()||'PENDIENTE',creadoPor:'Importación'};DB.agenda.push(a);added++;});saveDB();renderAgenda();renderHdr();toast('✅ '+added+' citas importadas');}catch(err){toast('❌ Error: '+err.message,'var(--red)');}inp.value='';};reader.readAsBinaryString(file);}

function importXlsxIng2(inp){if(!canImport()){toast('Sin permiso para importar','var(--red)');return;};const file=inp.files[0];if(!file)return;const reader=new FileReader();reader.onload=e=>{try{const wb=XLSX.read(e.target.result,{type:'binary'});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});if(!DB.ingresos2)DB.ingresos2=[];let added=0;rows.forEach((row,idx)=>{const allEmpty=Object.values(row).every(v=>String(v).trim()==='');if(allEmpty)return;const mat=String(row['Matricula']||row['Matrícula']||'').trim().toUpperCase();const hall=String(row['Hall']||'').trim();const ing={id:uid(),pos:String(row['Pos']||'').trim(),matricula:mat,nombre:String(row['Nombre']||'').trim(),apellido:String(row['Apellido']||'').trim(),empresa:String(row['Empresa']||'').trim(),hall,halls:hall?[hall]:[],stand:String(row['Stand']||'').trim(),remolque:String(row['Remolque']||'').trim().toUpperCase(),telefono:String(row['Telefono']||'').trim(),referencia:String(row['Referencia']||'').trim().toUpperCase(),descargaTipo:String(row[tr('descarga')]||'').trim(),tipoVehiculo:String(row['TipoVehiculo']||'').trim(),eventoNombre:String(row['Evento']||'').trim(),comentario:String(row['Comentario']||'').trim(),entrada:row['Entrada']||nowL(),salida:row['Salida']&&row['Salida']!=='En recinto'?row['Salida']:null,lang:'es',creadoPor:'Importación'};DB.ingresos2.push(ing);updateVehiculos(ing);added++;});saveDB();renderIngresos2();renderHdr();toast('✅ '+added+' importados');}catch(err){toast('❌ Error: '+err.message,'var(--red)');}inp.value='';};reader.readAsBinaryString(file);}

function _buildTemplate(col){
  const ck=_getCamposKey(col);
  const campos=(DB.camposCfg&&DB.camposCfg[ck]&&DB.camposCfg[ck].current)||{};
  const ev=getUserWorkEvent()||getActiveEvent();
  const evNom=ev?ev.nombre:'';

  // Definición completa: clave interna → {col: nombre columna Excel, desc: descripción, ej: ejemplo}
  const DEF={
    matricula:  {col:'Matricula',   desc:'Matrícula',                         ej:'1234ABC'},
    posicion:   {col:'Pos',         desc:'Nº posición',                       ej:'1'},
    llamador:   {col:'Llamador',    desc:'Llamador/Número',                   ej:'12345'},
    ref:        {col:'Referencia',  desc:'Referencia / Booking',              ej:'REF-001'},
    empresa:    {col:'Empresa',     desc:'Empresa',                           ej:'ACME SL'},
    hall:       {col:'Hall',        desc:'Hall',                              ej:'H1'},
    stand:      {col:'Stand',       desc:'Stand',                             ej:'A101'},
    puertaHall: {col:'PuertaHall',  desc:'Puerta del hall',                  ej:'P3'},
    acceso:     {col:'Acceso',      desc:'Acceso/Puerta',                     ej:'P1'},
    montador:   {col:'Montador',    desc:'Montador',                          ej:'MontajeXL'},
    expositor:  {col:'Expositor',   desc:'Expositor',                         ej:'ExpoDemo'},
    remolque:   {col:'Remolque',    desc:'Matrícula remolque',                ej:'REM001'},
    tipoVehiculo:{col:'TipoVehiculo',desc:'trailer / semiremolque / camion / furgoneta',ej:'trailer'},
    descargaTipo:{col:tr('descarga'),   desc:'mano / maquinaria',                 ej:'mano'},
    nombre:     {col:'Nombre',      desc:'Nombre conductor',                  ej:'Juan'},
    apellido:   {col:'Apellido',    desc:'Apellido conductor',                ej:'García'},
    pasaporte:  {col:tr('pasaporte'),   desc:'Pasaporte/DNI',                     ej:'12345678Z'},
    fechaNacimiento:{col:'FechaNac',desc:'YYYY-MM-DD',                        ej:'1985-03-15'},
    fechaExpiracion:{col:'FechaExp',desc:'YYYY-MM-DD',                        ej:'2030-01-01'},
    pais:       {col:'Pais',        desc:tr('phCountryName'),                              ej:'España'},
    telefono:   {col:'Telefono',    desc:'Teléfono',                          ej:'600123456'},
    email:      {col:'Email',       desc:'Email',                             ej:'demo@empresa.com'},
    comentario: {col:'Comentario',  desc:'Comentario libre',                  ej:''},
    horario:    {col:'HoraPlan',    desc:'HH:MM',                             ej:'09:00'},
    // Agenda-specific
    fecha:      {col:'Fecha',       desc:'YYYY-MM-DD',                        ej:new Date().toISOString().slice(0,10)},
    conductor:  {col:'Conductor',   desc:'Nombre conductor',                  ej:'Juan García'},
    carga:      {col:tr('carga'),       desc:'EF / SUNDAY / PRIORITY / GOODS / EMPTY', ej:'GOODS'},
    notas:      {col:'Notas',       desc:'Notas libres',                      ej:''},
    estado:     {col:'Estado',      desc:'PENDIENTE / LLEGADO / SALIDA',      ej:'PENDIENTE'},
    // Embalaje-specific
    tipoCarga:  {col:'TipoCarga',   desc:'EF / SUNDAY / PRIORITY / GOODS / EMPTY', ej:'GOODS'},
    status:     {col:'Status',      desc:'ALMACEN / SOT / FIRA / FINAL',      ej:'ALMACEN'},
    tacografo:  {col:'Tacografo',   desc:'HH:MM (hora tacógrafo)',            ej:'08:00'},
  };

  // Campos por tab — en orden, filtrando por visibilidad (siempre incluir matricula)
  const COLS_BY_TAB={
    ingresos:   ['matricula','posicion','llamador','ref','empresa','hall','stand','puertaHall','montador','expositor','remolque','tipoVehiculo','descargaTipo','nombre','apellido','pasaporte','fechaNacimiento','fechaExpiracion','pais','telefono','email','comentario'],
    ingresos2:  ['matricula','posicion','ref','empresa','hall','stand','remolque','tipoVehiculo','descargaTipo','nombre','apellido','pasaporte','pais','telefono','comentario'],
    agenda:     ['matricula','fecha','horario','ref','empresa','conductor','hall','stand','puertaHall','montador','expositor','remolque','tipoVehiculo','descargaTipo','carga','telefono','notas','estado'],
    flota:      ['matricula','posicion','remolque','nombre','apellido','empresa','hall','tipoCarga','status','tacografo'],
    conductores:['matricula','nombre','apellido','empresa','hall','remolque','tipoVehiculo','telefono','email','pais'],
  };

  const allCols=COLS_BY_TAB[col]||COLS_BY_TAB['ingresos'];

  // Filtrar: matricula siempre, el resto según visibilidad (show/required = visible, off = oculto)
  const visibles=allCols.filter(k=>{
    if(k==='matricula'||k==='fecha'||k==='horario'||k==='status'||k==='tipoCarga'||k==='carga'||k==='tacografo'||k==='conductor'||k==='notas'||k==='estado')return true;
    const v=campos[k]||'show';
    return v!=='off';
  });

  // Siempre añadir Evento al final
  const headerRow=visibles.map(k=>DEF[k]?DEF[k].col:k).concat(['Evento']);
  const descRow=visibles.map(k=>DEF[k]?DEF[k].desc:k).concat([evNom||'Nombre del evento']);
  const exRow=visibles.map(k=>DEF[k]?DEF[k].ej:'').concat([evNom]);

  return{headerRow,descRow,exRow,evNom};
}

function _exportPreregistros(){
  var pres=DB.preregistros||[];
  var rows=pres.map(function(p){return{Empresa:p.empresaNombre||p.empresa||'',Evento:p.eventoNombre||'',Matricula:p.matricula||'',Remolque:p.remolque||'',Conductor:p.nombre||'',Referencia:p.ref||'',Expositor:p.expositor||'',Hall:p.hall||'',Stand:p.stand||'',FechaPlan:p.fechaPlan||'',HoraPlan:p.horaPlan||'',Descarga:p.descargaTipo||'',Estado:p.estado||'',Creado:(p.creadoTs||'').slice(0,16)};});
  var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Preregistros');
  XLSX.writeFile(wb,'preregistros_'+new Date().toISOString().slice(0,10)+'.xlsx');
}


function exportHistorialExcel(){if(!isSA()&&!canExport()){toast('Sin permiso para exportar','var(--red)');return;};var h=DB.editHistory||[];if(!h.length){toast('Sin historial','var(--amber)');return;}var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(h),'Historial');XLSX.writeFile(wb,'historial_'+new Date().toISOString().slice(0,10)+'.xlsx');toast('📥 Exportado','#4a5568');}


function importHistorialExcel(inp){var file=inp.files[0];if(!file)return;var r=new FileReader();r.onload=function(e){try{var wb=XLSX.read(e.target.result,{type:'binary'});var rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});DB.editHistory=[].concat(rows,DB.editHistory||[]).slice(0,500);saveDB();renderIngresos();toast('✅ '+rows.length+' importados','var(--text2)');}catch(err){toast('❌ '+err.message,'var(--red)');}inp.value='';};r.readAsBinaryString(file);}

