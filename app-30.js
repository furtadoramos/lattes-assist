async function rc3DeleteVaultStrict(client,vaultId){
  if(!vaultId||!cloudSession?.user)return;
  const prefix=`${cloudSession.user.id}/${vaultId}`;
  const {data,error}=await client.storage.from(RC3_CLOUD_BUCKET).list(prefix,{limit:1000});
  if(error)throw error;
  const paths=(data||[]).map(x=>`${prefix}/${x.name}`);
  if(paths.length){const {error:removeError}=await client.storage.from(RC3_CLOUD_BUCKET).remove(paths);if(removeError)throw removeError}
}
rc3DeleteVault=rc3DeleteVaultStrict;

rc3SaveEncryptedCloud=async function(){
  if(!cloudSession?.user)return;
  const p1=$('#cloudVaultPassword')?.value||'',p2=$('#cloudVaultPasswordConfirm')?.value||'';
  if(!rc3StrongPass(p1,RC3_CLOUD_MIN_PASSWORD))return cloudStatus(`Use uma senha do cofre com pelo menos ${RC3_CLOUD_MIN_PASSWORD} caracteres.`,'error');
  if(p1!==p2)return cloudStatus('As duas senhas do cofre não coincidem.','error');
  const client=await loadSupabaseClient(),vaultId=`v${Date.now()}-${crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)}`;
  cloudStatus('Criptografando documentos e dados antes do upload…');
  let oldVault='',pointerMoved=false;
  try{
    const {data:old,error:oldErr}=await client.from('user_cloud_vaults').select('vault_id').eq('user_id',cloudSession.user.id).maybeSingle();
    if(oldErr)throw oldErr;
    oldVault=old?.vault_id||'';
    const stats=await rc3BuildAndUploadVault(client,p1,vaultId);
    const {error:pointerError}=await client.from('user_cloud_vaults').upsert({user_id:cloudSession.user.id,vault_id:vaultId,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(pointerError)throw pointerError;
    pointerMoved=true;
    const legacyResults=await Promise.all([
      client.from('user_snapshots').delete().eq('user_id',cloudSession.user.id),
      client.from('user_preferences').delete().eq('user_id',cloudSession.user.id)
    ]);
    const legacyError=legacyResults.map(x=>x.error).find(Boolean);
    if(legacyError){
      if(oldVault)await client.from('user_cloud_vaults').upsert({user_id:cloudSession.user.id,vault_id:oldVault,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      else await client.from('user_cloud_vaults').delete().eq('user_id',cloudSession.user.id);
      pointerMoved=false;
      throw new Error('Não foi possível remover o armazenamento legado não criptografado: '+legacyError.message);
    }
    let cleanupWarning='';
    if(oldVault&&oldVault!==vaultId){try{await rc3DeleteVaultStrict(client,oldVault)}catch{cleanupWarning=' A versão criptografada anterior não pôde ser removida agora, mas permanece cifrada.'}}
    cloudStatus(`Cofre criptografado salvo: ${stats.fileCount} arquivo(s), ${fmtBytes(stats.totalPlainBytes)} protegidos antes do upload.${cleanupWarning}`,'ok');
  }catch(e){
    if(pointerMoved){try{if(oldVault)await client.from('user_cloud_vaults').upsert({user_id:cloudSession.user.id,vault_id:oldVault,updated_at:new Date().toISOString()},{onConflict:'user_id'});else await client.from('user_cloud_vaults').delete().eq('user_id',cloudSession.user.id)}catch{}}
    try{await rc3DeleteVaultStrict(client,vaultId)}catch{}
    cloudStatus('Falha ao salvar o cofre: '+e.message,'error');
  }finally{
    if($('#cloudVaultPassword'))$('#cloudVaultPassword').value='';
    if($('#cloudVaultPasswordConfirm'))$('#cloudVaultPasswordConfirm').value='';
  }
};
saveCloudSnapshot=rc3SaveEncryptedCloud;

function rc3BrandingFinal(){
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.7 RC3';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.7 RC3';
  const footer=document.querySelector('.footer');if(footer)footer.textContent=footer.textContent.replace('Lattes Assist v1.6','Lattes Assist v1.7 RC3');
}
function rc3RebindCloudSave(){
  const old=$('#cloudSave');if(!old)return;
  const b=old.cloneNode(true);old.replaceWith(b);b.disabled=!cloudSession?.user;b.addEventListener('click',rc3SaveEncryptedCloud);
}
rc3BrandingFinal();rc3RebindCloudSave();setTimeout(rc3BrandingFinal,600);