const RC4_VERSION='1.7 RC4';
let rc4VaultStatusSeq=0;

function rc4ProfileName(){
  const cvName=clean(state?.cv?.name||state?.cv?.researcherName||'');
  const screenName=clean($('#researcherName')?.textContent||'');
  if(cvName)return cvName;
  if(screenName&&screenName!=='Nenhum currículo importado')return screenName;
  const email=cloudSession?.user?.email||'';
  return email?email.split('@')[0]:'Usuário';
}
function rc4Initials(name){
  const xs=clean(name).split(/\s+/).filter(Boolean);
  if(!xs.length)return 'LA';
  return ((xs[0]?.[0]||'')+(xs.length>1?(xs[xs.length-1]?.[0]||''):'')).toUpperCase();
}
function rc4EnsureProfileCard(){
  const sidebar=$('.sidebar'),brand=sidebar?.querySelector('.brand');
  if(!sidebar||!brand||$('#userProfileCard'))return;
  const style=document.createElement('style');style.id='rc4ProfileStyle';style.textContent=`
    #userProfileCard{margin:14px 10px 8px;padding:12px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:rgba(255,255,255,.06)}
    #userProfileCard .rc4-profile-head{display:flex;gap:10px;align-items:center;min-width:0}
    #userProfileCard .rc4-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;background:rgba(255,255,255,.14);font-weight:800;font-size:13px;letter-spacing:.04em}
    #userProfileCard .rc4-profile-copy{min-width:0;flex:1}
    #userProfileCard .rc4-profile-name{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #userProfileCard .rc4-profile-email{font-size:10px;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
    #userProfileCard .rc4-profile-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
    #userProfileCard .rc4-pill{font-size:9px;line-height:1;padding:5px 7px;border-radius:999px;background:rgba(255,255,255,.10)}
    #userProfileCard .rc4-pill.ok{background:rgba(79,181,132,.18)}
    #userProfileCard .rc4-pill.warn{background:rgba(232,183,72,.18)}
    #userProfileCard .rc4-vault{font-size:10px;opacity:.78;margin-top:8px;line-height:1.35}
    #userProfileCard .rc4-profile-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}
    #userProfileCard .rc4-profile-actions button{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:inherit;border-radius:9px;padding:7px 8px;font-size:10px;font-weight:750;cursor:pointer}
    #userProfileCard .rc4-profile-actions button:hover{background:rgba(255,255,255,.13)}
    #userProfileCard .rc4-profile-actions button.rc4-signout{border-color:rgba(255,170,160,.25)}
  `;document.head.appendChild(style);
  const card=document.createElement('div');card.id='userProfileCard';card.innerHTML=`
    <div class="rc4-profile-head"><div class="rc4-avatar" id="rc4ProfileInitials">LA</div><div class="rc4-profile-copy"><div class="rc4-profile-name" id="rc4ProfileName">Usuário</div><div class="rc4-profile-email" id="rc4ProfileEmail"></div></div></div>
    <div class="rc4-profile-meta"><span class="rc4-pill ok" id="rc4ProfileSession">Conectado</span><span class="rc4-pill">v1.7 RC4</span></div>
    <div class="rc4-vault" id="rc4ProfileVault">Cofre remoto: verificando…</div>
    <div class="rc4-profile-actions"><button id="rc4OpenAccount">Conta / cofre</button><button class="rc4-signout" id="rc4SignOut">Sair</button></div>`;
  brand.insertAdjacentElement('afterend',card);
  $('#rc4OpenAccount')?.addEventListener('click',()=>{if($('#sources'))rc3ActivatePanel('sources')});
  $('#rc4SignOut')?.addEventListener('click',()=>cloudSignOut());
}
function rc4RenderProfile(){
  rc4EnsureProfileCard();const signed=Boolean(cloudSession?.user),name=rc4ProfileName(),email=cloudSession?.user?.email||'';
  if($('#rc4ProfileInitials'))$('#rc4ProfileInitials').textContent=rc4Initials(name);
  if($('#rc4ProfileName'))$('#rc4ProfileName').textContent=name;
  if($('#rc4ProfileEmail'))$('#rc4ProfileEmail').textContent=email;
  if($('#rc4ProfileSession')){$('#rc4ProfileSession').textContent=signed?'Conectado':'Sessão encerrada';$('#rc4ProfileSession').className='rc4-pill '+(signed?'ok':'warn')}
  if($('#rc4SignOut'))$('#rc4SignOut').disabled=!signed;
  if($('#rc4OpenAccount'))$('#rc4OpenAccount').disabled=!signed;
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.7 RC4';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.7 RC4';
  const footer=document.querySelector('.footer');if(footer)footer.textContent=footer.textContent.replace(/Lattes Assist v1\.7 RC3|Lattes Assist v1\.6/g,'Lattes Assist v1.7 RC4');
  if(signed)rc4RefreshVaultStatus();else if($('#rc4ProfileVault'))$('#rc4ProfileVault').textContent='Cofre remoto: faça login para verificar.';
}
async function rc4RefreshVaultStatus(){
  const user=cloudSession?.user;if(!user||!$('#rc4ProfileVault'))return;const seq=++rc4VaultStatusSeq;$('#rc4ProfileVault').textContent='Cofre remoto: verificando…';
  try{const c=await loadSupabaseClient();const {data,error}=await c.from('user_cloud_vaults').select('vault_id,updated_at').eq('user_id',user.id).maybeSingle();if(error)throw error;if(seq!==rc4VaultStatusSeq)return;
    $('#rc4ProfileVault').textContent=data?.vault_id?`Cofre remoto: protegido · ${new Date(data.updated_at).toLocaleString('pt-BR')}`:'Cofre remoto: ainda não confirmado no servidor.';
  }catch(e){if(seq===rc4VaultStatusSeq)$('#rc4ProfileVault').textContent='Cofre remoto: não foi possível verificar.'}
}

async function rc4VerifyVaultPersistence(client,userId,vaultId){
  const {data:pointer,error:pointerError}=await client.from('user_cloud_vaults').select('vault_id,updated_at').eq('user_id',userId).maybeSingle();
  if(pointerError)throw pointerError;if(pointer?.vault_id!==vaultId)throw new Error('O ponteiro do cofre não foi confirmado pelo servidor.');
  const prefix=`${userId}/${vaultId}`;const {data:objects,error:objectsError}=await client.storage.from(RC3_CLOUD_BUCKET).list(prefix,{limit:1000});
  if(objectsError)throw objectsError;const names=(objects||[]).map(x=>x.name);if(!names.includes('header.bin')||!names.some(x=>/^m-\d+\.bin$/.test(x)))throw new Error('Os objetos criptografados do cofre não foram confirmados no Storage.');
  const [legacySnap,legacyPref]=await Promise.all([
    client.from('user_snapshots').select('id').eq('user_id',userId),
    client.from('user_preferences').select('user_id').eq('user_id',userId)
  ]);
  if(legacySnap.error)throw legacySnap.error;if(legacyPref.error)throw legacyPref.error;
  if((legacySnap.data||[]).length||(legacyPref.data||[]).length)throw new Error('Ainda existem dados curriculares legados não criptografados para esta conta.');
  return {objectCount:names.length,updatedAt:pointer.updated_at};
}

async function rc4SaveEncryptedCloud(){
  if(!cloudSession?.user)return;
  const p1=$('#cloudVaultPassword')?.value||'',p2=$('#cloudVaultPasswordConfirm')?.value||'';
  if(!rc3StrongPass(p1,RC3_CLOUD_MIN_PASSWORD))return cloudStatus(`Use uma senha do cofre com pelo menos ${RC3_CLOUD_MIN_PASSWORD} caracteres.`,'error');
  if(p1!==p2)return cloudStatus('As duas senhas do cofre não coincidem.','error');
  const client=await loadSupabaseClient(),userId=cloudSession.user.id,vaultId=`v${Date.now()}-${crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)}`;
  cloudStatus('Criptografando e enviando o cofre…');let oldVault='',pointerMoved=false;
  try{
    const {data:old,error:oldErr}=await client.from('user_cloud_vaults').select('vault_id').eq('user_id',userId).maybeSingle();if(oldErr)throw oldErr;oldVault=old?.vault_id||'';
    const stats=await rc3BuildAndUploadVault(client,p1,vaultId);
    const {error:pointerError}=await client.from('user_cloud_vaults').upsert({user_id:userId,vault_id:vaultId,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(pointerError)throw pointerError;pointerMoved=true;
    const legacyResults=await Promise.all([client.from('user_snapshots').delete().eq('user_id',userId),client.from('user_preferences').delete().eq('user_id',userId)]);
    const legacyError=legacyResults.map(x=>x.error).find(Boolean);if(legacyError)throw new Error('Não foi possível remover o armazenamento legado não criptografado: '+legacyError.message);
    cloudStatus('Confirmando persistência criptografada no servidor…');const verified=await rc4VerifyVaultPersistence(client,userId,vaultId);
    let cleanupWarning='';if(oldVault&&oldVault!==vaultId){try{await rc3DeleteVaultStrict(client,oldVault)}catch{cleanupWarning=' A versão cifrada anterior permaneceu armazenada, mas continua protegida.'}}
    cloudStatus(`Cofre criptografado confirmado no servidor: ${stats.fileCount} arquivo(s), ${verified.objectCount} objeto(s) cifrado(s), ${fmtBytes(stats.totalPlainBytes)} protegidos antes do upload.${cleanupWarning}`,'ok');
    rc4RefreshVaultStatus();
  }catch(e){
    if(pointerMoved){try{if(oldVault)await client.from('user_cloud_vaults').upsert({user_id:userId,vault_id:oldVault,updated_at:new Date().toISOString()},{onConflict:'user_id'});else await client.from('user_cloud_vaults').delete().eq('user_id',userId)}catch{}}
    try{await rc3DeleteVaultStrict(client,vaultId)}catch{}
    cloudStatus('Falha ao salvar/confirmar o cofre: '+e.message,'error');
  }finally{if($('#cloudVaultPassword'))$('#cloudVaultPassword').value='';if($('#cloudVaultPasswordConfirm'))$('#cloudVaultPasswordConfirm').value=''}
}

function rc4RebindCloudSave(){const old=$('#cloudSave');if(!old)return;const b=old.cloneNode(true);old.replaceWith(b);b.disabled=!cloudSession?.user;b.addEventListener('click',rc4SaveEncryptedCloud);saveCloudSnapshot=rc4SaveEncryptedCloud;rc3SaveEncryptedCloud=rc4SaveEncryptedCloud}
const rc4PreviousRenderCloudUi=renderCloudUi;
renderCloudUi=function(){rc4PreviousRenderCloudUi();rc4RenderProfile()};
rc4EnsureProfileCard();rc4RebindCloudSave();rc4RenderProfile();setTimeout(()=>{rc4RebindCloudSave();rc4RenderProfile()},700);