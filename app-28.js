function validateBackupPayloadRc2(p){
  if(!p||p.schema!==BACKUP_SCHEMA)throw new Error('Arquivo não reconhecido como backup integral do Lattes Assist.');
  if(!p.state||typeof p.state!=='object')throw new Error('Backup incompleto: estado ausente ou inválido.');
  if(!p.indexedDB||typeof p.indexedDB!=='object')throw new Error('Backup incompleto: IndexedDB ausente.');
  const docs=Array.isArray(p.indexedDB.documents)?p.indexedDB.documents:null;
  const files=Array.isArray(p.indexedDB.files)?p.indexedDB.files:null;
  if(!docs||!files)throw new Error('Backup incompleto: documentos ou arquivos do IndexedDB inválidos.');
  const docIds=new Set(),fileIds=new Set();
  for(const d of docs){if(!d||!d.id)throw new Error('Backup inválido: documento sem identificador.');if(docIds.has(d.id))throw new Error('Backup inválido: documento duplicado ('+d.id+').');docIds.add(d.id)}
  for(const f of files){if(!f||!f.id)throw new Error('Backup inválido: arquivo sem identificador.');if(fileIds.has(f.id))throw new Error('Backup inválido: arquivo duplicado ('+f.id+').');fileIds.add(f.id);if(f.blob?.base64!==undefined&&typeof f.blob.base64!=='string')throw new Error('Backup inválido: conteúdo de arquivo não está em base64.')}
  return p;
}

function prepareEvidenceSnapshotRc2(snapshot){
  const docs=(snapshot.documents||[]).map(d=>JSON.parse(JSON.stringify(d)));
  const files=[];
  for(const f of snapshot.files||[]){
    if(!f?.blob?.base64)continue;
    let bytes;
    try{bytes=base64ToBytes(f.blob.base64)}catch{throw new Error('Arquivo '+f.id+' contém base64 inválido.')}
    if(Number.isFinite(Number(f.blob.size))&&Number(f.blob.size)!==bytes.byteLength)throw new Error('Arquivo '+f.id+' não confere com o tamanho registrado no backup.');
    files.push({id:f.id,blob:new Blob([bytes],{type:f.blob.type||'application/octet-stream'})});
  }
  return {documents:docs,files};
}

async function captureEvidenceRollbackRc2(){
  const documents=await dbAll(),files=[];
  for(const d of documents){const blob=await dbGetBlob(d.id);if(blob)files.push({id:d.id,blob})}
  return {documents:documents.map(d=>JSON.parse(JSON.stringify(d))),files};
}

async function atomicReplaceEvidenceDbRc2(prepared){
  const db=await openDb();
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(err)=>{if(settled)return;settled=true;try{db.close()}catch{};err?reject(err):resolve()};
    let tx;
    try{
      tx=db.transaction([STORE,FILE_STORE],'readwrite');
      const docStore=tx.objectStore(STORE),fileStore=tx.objectStore(FILE_STORE);
      docStore.clear();fileStore.clear();
      for(const d of prepared.documents||[]){const meta={...d};delete meta.blob;docStore.put(meta)}
      for(const f of prepared.files||[]){if(f?.id&&f.blob)fileStore.put({id:f.id,blob:f.blob})}
    }catch(e){try{tx?.abort()}catch{};finish(e);return}
    tx.oncomplete=()=>finish();
    tx.onabort=()=>finish(tx.error||new Error('A transação de restauração foi abortada.'));
    tx.onerror=()=>{};
  });
}

function restoreScopedLocalStorageRc2(snapshot){
  Object.keys(localStorage).filter(k=>k.startsWith('lattesAssist.')).forEach(k=>localStorage.removeItem(k));
  for(const [k,v] of Object.entries(snapshot||{})){if(k.startsWith('lattesAssist.'))localStorage.setItem(k,String(v))}
}

function cloneSerializableStateRc2(){return JSON.parse(JSON.stringify(serializableState()))}

validateBackupPayload=validateBackupPayloadRc2;
restoreEvidenceDb=async function(snapshot){const prepared=prepareEvidenceSnapshotRc2(snapshot);await atomicReplaceEvidenceDbRc2(prepared)};

restoreFullBackupFile=async function(file){
  let container;
  try{container=JSON.parse(await file.text())}catch{throw new Error('O arquivo selecionado não contém JSON válido.')}
  let payload=container;
  if(container.schema==='lattes-assist.backup.encrypted.v1'){
    const pass=clean($('#backupPassphrase').value);
    if(!pass)throw new Error('Informe a senha usada para criptografar este backup.');
    try{payload=await decryptBackup(container,pass)}catch{throw new Error('Não foi possível descriptografar o backup. Verifique a senha.')}
  }
  validateBackupPayloadRc2(payload);
  const incoming=prepareEvidenceSnapshotRc2(payload.indexedDB);
  const s=backupSummary(payload);
  const totalBytes=(payload.indexedDB.files||[]).reduce((n,x)=>n+(Number(x.blob?.size)||0),0);
  const sizeNote=totalBytes>50*1024*1024?'\n\nAtenção: este backup contém '+fmtBytes(totalBytes)+' de arquivos originais e pode consumir memória temporária durante a validação segura.':'';
  if(!confirm(`Restaurar este backup substituirá os dados locais atuais.\n\n${s.documents} documento(s) · ${s.files} arquivo(s) · ${s.queue} operação(ões) na fila.${sizeNote}\n\nA restauração será transacional e tentará preservar integralmente o estado atual em caso de falha. Continuar?`))return;

  $('#backupStatus').textContent='Validando e preparando restauração segura…';
  const rollbackDb=await captureEvidenceRollbackRc2();
  const rollbackStorage=localStorageSnapshot();
  const rollbackState=cloneSerializableStateRc2();
  const rollbackRawXml=state.runtime.rawXml||'',rollbackRawXsd=state.runtime.rawXsd||'';

  try{
    $('#backupStatus').textContent='Restaurando documentos em transação atômica…';
    await atomicReplaceEvidenceDbRc2(incoming);
    restoreScopedLocalStorageRc2(payload.localStorage||{});
    restoreStateSnapshot(payload.state||{});
    state.runtime.rawXml=payload.session?.rawXml||'';
    state.runtime.rawXsd=payload.session?.rawXsd||'';
    save();
    await loadDocuments();
    renderAll();renderBackupInfo(payload);
    $('#backupStatus').textContent='Restauração concluída com segurança. Os dados locais foram substituídos pelo backup.';
  }catch(err){
    $('#backupStatus').textContent='Falha detectada. Restaurando o estado anterior…';
    let rollbackError=null;
    try{
      await atomicReplaceEvidenceDbRc2(rollbackDb);
      restoreScopedLocalStorageRc2(rollbackStorage);
      restoreStateSnapshot(rollbackState);
      state.runtime.rawXml=rollbackRawXml;state.runtime.rawXsd=rollbackRawXsd;
      save();await loadDocuments();renderAll();renderBackupInfo();
    }catch(e){rollbackError=e}
    if(rollbackError){
      $('#backupStatus').textContent='Falha crítica: a restauração não concluiu e o rollback automático também encontrou um erro. Não feche a página antes de exportar o que ainda estiver acessível.';
      throw new Error('Restauração falhou ('+err.message+') e o rollback automático também falhou ('+rollbackError.message+').');
    }
    $('#backupStatus').textContent='Restauração cancelada por erro; o estado anterior foi recuperado automaticamente.';
    throw new Error('Restauração não aplicada: '+err.message+'. O estado anterior foi recuperado.');
  }
};
