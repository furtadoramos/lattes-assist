const RC7_VERSION='1.7 RC7';

function validateCloudVaultPayloadRc7(manifest,prepared){
  if(!manifest||manifest.schema!==RC3_CLOUD_PAYLOAD_SCHEMA)throw new Error('Manifesto do cofre remoto não reconhecido.');
  if(!manifest.state||typeof manifest.state!=='object')throw new Error('Cofre incompleto: estado curricular ausente ou inválido.');
  if(!manifest.indexedDB||typeof manifest.indexedDB!=='object')throw new Error('Cofre incompleto: índice documental ausente.');
  const docs=Array.isArray(manifest.indexedDB.documents)?manifest.indexedDB.documents:null;
  const files=Array.isArray(manifest.indexedDB.files)?manifest.indexedDB.files:null;
  if(!docs||!files)throw new Error('Cofre incompleto: documentos ou descritores de arquivos inválidos.');
  if(!prepared||!Array.isArray(prepared.documents)||!Array.isArray(prepared.files))throw new Error('Cofre incompleto: arquivos descriptografados não foram preparados corretamente.');
  const docIds=new Set(),fileIds=new Set(),preparedFileIds=new Set();
  for(const d of docs){if(!d?.id)throw new Error('Cofre inválido: documento sem identificador.');if(docIds.has(d.id))throw new Error('Cofre inválido: documento duplicado ('+d.id+').');docIds.add(d.id)}
  for(const f of files){if(!f?.id)throw new Error('Cofre inválido: descritor de arquivo sem identificador.');if(fileIds.has(f.id))throw new Error('Cofre inválido: descritor de arquivo duplicado ('+f.id+').');fileIds.add(f.id)}
  for(const f of prepared.files){if(!f?.id||!f.blob)throw new Error('Cofre inválido: arquivo descriptografado incompleto.');if(preparedFileIds.has(f.id))throw new Error('Cofre inválido: arquivo descriptografado duplicado ('+f.id+').');preparedFileIds.add(f.id)}
  for(const id of fileIds){if(!preparedFileIds.has(id))throw new Error('Cofre incompleto: arquivo '+id+' não foi recuperado.');}
  return manifest;
}

async function applyCloudVaultPayloadRc7(manifest,prepared){
  validateCloudVaultPayloadRc7(manifest,prepared);
  const rollbackDb=await captureEvidenceRollbackRc2();
  const rollbackStorage=localStorageSnapshot();
  const rollbackState=cloneSerializableStateRc2();
  const rollbackRawXml=state.runtime.rawXml||'',rollbackRawXsd=state.runtime.rawXsd||'';
  try{
    await atomicReplaceEvidenceDbRc2(prepared);
    restoreScopedLocalStorageRc2(manifest.localStorage||{});
    restoreStateSnapshot(manifest.state||{});
    state.runtime.rawXml=manifest.session?.rawXml||'';
    state.runtime.rawXsd=manifest.session?.rawXsd||'';
    save();
    await loadDocuments();
    renderAll();
    if(typeof renderBackupInfo==='function')renderBackupInfo();
  }catch(err){
    let rollbackError=null;
    try{
      await atomicReplaceEvidenceDbRc2(rollbackDb);
      restoreScopedLocalStorageRc2(rollbackStorage);
      restoreStateSnapshot(rollbackState);
      state.runtime.rawXml=rollbackRawXml;state.runtime.rawXsd=rollbackRawXsd;
      save();await loadDocuments();renderAll();
      if(typeof renderBackupInfo==='function')renderBackupInfo();
    }catch(e){rollbackError=e}
    if(rollbackError)throw new Error('A recuperação do cofre falhou e o rollback também falhou: '+rollbackError.message);
    throw new Error('A recuperação do cofre não foi aplicada; o estado anterior foi recuperado: '+err.message);
  }
}

async function rc7LoadEncryptedCloud(){
  if(!cloudSession?.user)return;
  const pass=$('#cloudVaultRestorePassword')?.value||'';
  if(!pass)return cloudStatus('Redigite a senha do cofre para recuperar os dados.','error');
  cloudStatus('Baixando e descriptografando o cofre no navegador…');
  try{
    const client=await loadSupabaseClient();
    const {data:pointer,error}=await client.from('user_cloud_vaults').select('vault_id,updated_at').eq('user_id',cloudSession.user.id).maybeSingle();
    if(error)throw error;
    if(!pointer?.vault_id)return cloudStatus('Ainda não existe cofre criptografado nesta conta.','warn');
    const {manifest,prepared}=await rc3DownloadVault(client,pass,pointer.vault_id);
    validateCloudVaultPayloadRc7(manifest,prepared);
    if(!confirm(`Recuperar o cofre criptografado salvo em ${new Date(pointer.updated_at).toLocaleString('pt-BR')}?\n\nO estado curricular local e os documentos locais serão substituídos pelo conteúdo descriptografado do cofre.`))return;
    cloudStatus('Aplicando conteúdo do cofre em restauração transacional…');
    await applyCloudVaultPayloadRc7(manifest,prepared);
    cloudStatus(`Cofre recuperado com segurança: ${prepared.files.length} arquivo(s) original(is) restaurado(s).`,'ok');
  }catch(e){
    cloudStatus('Falha ao recuperar o cofre: '+e.message,'error');
  }finally{
    if($('#cloudVaultRestorePassword'))$('#cloudVaultRestorePassword').value='';
  }
}

function rc7RebindCloudLoad(){
  const old=$('#cloudLoad');if(!old)return;
  const b=old.cloneNode(true);old.replaceWith(b);b.disabled=!cloudSession?.user;b.addEventListener('click',rc7LoadEncryptedCloud);
  loadCloudSnapshot=rc7LoadEncryptedCloud;
  rc3LoadEncryptedCloud=rc7LoadEncryptedCloud;
}
function rc7Branding(){
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.7 RC7';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.7 RC7';
  const meta=document.querySelector('#rc5AccountStrip .rc5-meta div:last-child');if(meta)meta.textContent='v1.7 RC7';
  const footer=document.querySelector('.footer');if(footer)footer.textContent=footer.textContent.replace(/Lattes Assist v1\.7 RC6|Lattes Assist v1\.7 RC5|Lattes Assist v1\.7 RC4|Lattes Assist v1\.7 RC3|Lattes Assist v1\.6/g,'Lattes Assist v1.7 RC7');
}
rc7RebindCloudLoad();rc7Branding();setTimeout(()=>{rc7RebindCloudLoad();rc7Branding()},700);
