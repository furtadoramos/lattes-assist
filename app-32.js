const RC5_VERSION='1.7 RC5';

function rc5AccountName(){
  const cvName=clean(state?.cv?.name||state?.cv?.researcherName||'');
  const screenName=clean($('#researcherName')?.textContent||'');
  if(cvName)return cvName;
  if(screenName&&screenName!=='Nenhum currículo importado')return screenName;
  const email=cloudSession?.user?.email||'';
  return email?email.split('@')[0]:'Usuário';
}
function rc5Initials(name){
  const parts=clean(name).split(/\s+/).filter(Boolean);
  return parts.length?((parts[0][0]||'')+(parts.length>1?(parts[parts.length-1][0]||''):'')).toUpperCase():'LA';
}
function rc5EnsureAccountStrip(){
  const sidebar=$('.sidebar'),brand=sidebar?.querySelector('.brand');
  if(!sidebar||!brand)return;
  const old=$('#userProfileCard');if(old)old.style.display='none';
  let strip=$('#rc5AccountStrip');
  if(!strip){
    const style=document.createElement('style');style.id='rc5AccountStyle';style.textContent=`
      #rc5AccountStrip{position:sticky;top:8px;z-index:100;margin:12px 10px 10px;padding:13px;border:1px solid rgba(255,255,255,.24);border-radius:14px;background:#203833;box-shadow:0 8px 24px rgba(0,0,0,.16);color:#fff}
      #rc5AccountStrip .rc5-head{display:flex;align-items:center;gap:10px;min-width:0}
      #rc5AccountStrip .rc5-avatar{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.16);font-size:12px;font-weight:800;flex:0 0 auto}
      #rc5AccountStrip .rc5-copy{min-width:0;flex:1}
      #rc5AccountStrip .rc5-name{font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #rc5AccountStrip .rc5-email{font-size:10px;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
      #rc5AccountStrip .rc5-meta{margin-top:8px;font-size:10px;line-height:1.45;opacity:.9}
      #rc5AccountStrip .rc5-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}
      #rc5AccountStrip button{border-radius:9px;padding:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:10px;font-weight:800;cursor:pointer}
      #rc5AccountStrip button:hover{background:rgba(255,255,255,.15)}
      #rc5AccountStrip #rc5SignOut{background:#fff;color:#6f2b24;border-color:#fff}
      #rc5AccountStrip #rc5SignOut:disabled{opacity:.45;cursor:not-allowed}
    `;document.head.appendChild(style);
    strip=document.createElement('div');strip.id='rc5AccountStrip';strip.innerHTML=`
      <div class="rc5-head"><div class="rc5-avatar" id="rc5Initials">LA</div><div class="rc5-copy"><div class="rc5-name" id="rc5Name">Usuário</div><div class="rc5-email" id="rc5Email"></div></div></div>
      <div class="rc5-meta"><div id="rc5Session">Sessão: verificando…</div><div id="rc5Vault">Cofre: verificando…</div><div>v1.7 RC5</div></div>
      <div class="rc5-actions"><button id="rc5OpenAccount">Conta / cofre</button><button id="rc5SignOut">Sair da conta</button></div>`;
    brand.insertAdjacentElement('afterend',strip);
    $('#rc5OpenAccount')?.addEventListener('click',()=>{if($('#sources'))rc3ActivatePanel('sources')});
    $('#rc5SignOut')?.addEventListener('click',async()=>{const b=$('#rc5SignOut');if(b)b.disabled=true;try{await cloudSignOut()}finally{if(b)b.disabled=false}});
  }
  return strip;
}
async function rc5RenderAccountStrip(){
  rc5EnsureAccountStrip();
  const signed=Boolean(cloudSession?.user),name=rc5AccountName(),email=cloudSession?.user?.email||'';
  if($('#rc5Initials'))$('#rc5Initials').textContent=rc5Initials(name);
  if($('#rc5Name'))$('#rc5Name').textContent=name;
  if($('#rc5Email'))$('#rc5Email').textContent=email;
  if($('#rc5Session'))$('#rc5Session').textContent=signed?'Sessão: conectada':'Sessão: encerrada';
  if($('#rc5SignOut'))$('#rc5SignOut').disabled=!signed;
  if($('#rc5OpenAccount'))$('#rc5OpenAccount').disabled=!signed;
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.7 RC5';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.7 RC5';
  if(!signed){if($('#rc5Vault'))$('#rc5Vault').textContent='Cofre: faça login para verificar.';return;}
  if($('#rc5Vault'))$('#rc5Vault').textContent='Cofre: verificando servidor…';
  try{const c=await loadSupabaseClient();const {data,error}=await c.from('user_cloud_vaults').select('vault_id,updated_at').eq('user_id',cloudSession.user.id).maybeSingle();if(error)throw error;if($('#rc5Vault'))$('#rc5Vault').textContent=data?.vault_id?'Cofre: confirmado no servidor':'Cofre: ainda não confirmado no servidor';}catch{if($('#rc5Vault'))$('#rc5Vault').textContent='Cofre: verificação indisponível';}
}
const rc5PreviousRenderCloudUi=renderCloudUi;
renderCloudUi=function(){rc5PreviousRenderCloudUi();rc5RenderAccountStrip()};
rc5EnsureAccountStrip();rc5RenderAccountStrip();setTimeout(rc5RenderAccountStrip,600);
