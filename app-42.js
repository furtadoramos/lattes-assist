const PASSWORD_RECOVERY_BETA2='1.8.1-beta2';
const PASSWORD_RECOVERY_REDIRECT_BETA2='https://furtadoramos.github.io/lattes-assist/beta/?password-reset=1';

function recoveryRequestStatus(message,kind=''){
  const el=document.getElementById('recoveryRequestStatus');
  if(el){el.textContent=message;el.dataset.kind=kind;}
}
function ensureRecoveryRequestDialog(){
  if(typeof document==='undefined')return null;
  let d=document.getElementById('recoveryRequestDialog');
  if(d)return d;
  const style=document.createElement('style');
  style.id='recoveryRequestStyle';
  style.textContent=`#recoveryRequestDialog{border:0;padding:0;background:transparent;max-width:none}#recoveryRequestDialog::backdrop{background:rgba(16,28,25,.55);backdrop-filter:blur(3px)}#recoveryRequestDialog .recovery-card{width:min(460px,calc(100vw - 32px));box-sizing:border-box;background:#fff;color:#182724;border:1px solid #d8d7cf;border-radius:20px;box-shadow:0 24px 80px rgba(24,39,36,.28);padding:28px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#recoveryRequestDialog h2{margin:0 0 8px;font-size:24px}#recoveryRequestDialog p{line-height:1.5;color:#68716d}#recoveryRequestDialog label{display:block;font-size:13px;font-weight:700;margin:14px 0 6px}#recoveryRequestDialog input{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #c9ccc7;border-radius:11px;font:inherit}#recoveryRequestDialog .actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}#recoveryRequestDialog button{border:1px solid #aeb7b2;border-radius:11px;padding:11px 16px;background:#fff;font-weight:700;cursor:pointer}#recoveryRequestDialog button.primary{background:#182724;color:#fff;border-color:#182724}#recoveryRequestStatus{min-height:20px;margin-top:12px;font-size:13px}#recoveryRequestStatus[data-kind="error"]{color:#9b342c}#recoveryRequestStatus[data-kind="ok"]{color:#23674f}`;
  document.head.appendChild(style);
  d=document.createElement('dialog');
  d.id='recoveryRequestDialog';
  d.innerHTML=`<div class="recovery-card"><h2>Recuperar senha de acesso</h2><p>Informe o e-mail usado na sua conta do Lattes Assist. Enviaremos um link para você definir uma nova senha.</p><label for="recoveryRequestEmail">E-mail</label><input id="recoveryRequestEmail" type="email" autocomplete="email" placeholder="nome@exemplo.com"><div id="recoveryRequestStatus"></div><div class="actions"><button id="recoveryRequestClose">Cancelar</button><button class="primary" id="recoveryRequestSend">Enviar link de recuperação</button></div><p style="font-size:12px;margin-top:16px">A senha do Lattes Assist é independente da senha da Plataforma Lattes/CNPq.</p></div>`;
  document.body.appendChild(d);
  document.getElementById('recoveryRequestClose').addEventListener('click',()=>d.close());
  document.getElementById('recoveryRequestSend').addEventListener('click',sendRecoveryRequestDialog);
  document.getElementById('recoveryRequestEmail').addEventListener('keydown',e=>{if(e.key==='Enter')sendRecoveryRequestDialog()});
  return d;
}
function openRecoveryRequestDialog(){
  const d=ensureRecoveryRequestDialog();if(!d)return;
  const email=cloudSession?.user?.email||document.getElementById('authGateEmail')?.value||'';
  const input=document.getElementById('recoveryRequestEmail');if(input)input.value=email;
  recoveryRequestStatus('');
  if(!d.open)d.showModal();
  setTimeout(()=>input?.focus(),0);
}
async function sendRecoveryRequestDialog(){
  const email=String(document.getElementById('recoveryRequestEmail')?.value||'').trim();
  if(!email)return recoveryRequestStatus('Informe o e-mail da sua conta.','error');
  const b=document.getElementById('recoveryRequestSend');if(b)b.disabled=true;
  recoveryRequestStatus('Solicitando link de recuperação…');
  try{
    const c=await loadSupabaseClient();
    const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:PASSWORD_RECOVERY_REDIRECT_BETA2});
    if(error)throw error;
    recoveryRequestStatus('Se existir uma conta para este e-mail, enviaremos uma mensagem com o link de recuperação. Verifique também spam e lixo eletrônico.','ok');
  }catch{
    recoveryRequestStatus('Não foi possível solicitar a recuperação agora. Tente novamente em alguns minutos.','error');
  }finally{if(b)b.disabled=false}
}
function ensureRecoveryLaunchers(){
  if(typeof document==='undefined')return;
  const gateActions=document.querySelector('#authGate .auth-actions');
  if(gateActions){
    let b=document.getElementById('authGateForgotPassword');
    if(!b){b=document.createElement('button');b.id='authGateForgotPassword';b.type='button';gateActions.appendChild(b)}
    b.textContent='Esqueci minha senha';
    b.onclick=openRecoveryRequestDialog;
  }
  const stripActions=document.querySelector('#rc5AccountStrip .rc5-actions');
  if(stripActions&&!document.getElementById('rc5RecoverPassword')){
    const b=document.createElement('button');b.id='rc5RecoverPassword';b.type='button';b.textContent='Recuperar senha';b.addEventListener('click',openRecoveryRequestDialog);stripActions.appendChild(b);
  }
  const cloudRow=document.querySelector('#cloudAccountCard #cloudSignedIn .row');
  if(cloudRow&&!document.getElementById('cloudRecoverPassword')){
    const b=document.createElement('button');b.id='cloudRecoverPassword';b.type='button';b.className='btn';b.textContent='Recuperar senha';b.addEventListener('click',openRecoveryRequestDialog);cloudRow.appendChild(b);
  }
}
function directRecoveryRequestRequested(){
  try{const u=new URL(location.href);return['1','true','yes'].includes(String(u.searchParams.get('recover')||u.searchParams.get('recovery')||'').toLowerCase())}catch{return false}
}
function directPasswordResetRequested(){
  try{const u=new URL(location.href);return['1','true','yes'].includes(String(u.searchParams.get('password-reset')||'').toLowerCase())}catch{return false}
}
async function openPasswordResetIfReady(){
  if(!directPasswordResetRequested())return;
  try{
    const c=await loadSupabaseClient();
    for(let i=0;i<12;i++){
      const {data}=await c.auth.getSession();
      if(data?.session){
        cloudSession=data.session;
        if(typeof showPasswordRecoveryDialog==='function'){showPasswordRecoveryDialog();return}
      }
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(typeof gateStatus==='function')gateStatus('O link de recuperação não pôde ser validado ou expirou. Solicite um novo link.','error');
  }catch{
    if(typeof gateStatus==='function')gateStatus('Não foi possível validar o link de recuperação. Solicite um novo link.','error');
  }
}
function recoveryBeta2Branding(){
  if(typeof document==='undefined')return;
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.8.1 beta';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.8.1 beta';
  const meta=document.querySelector('#rc5AccountStrip .rc5-meta div:last-child');if(meta)meta.textContent='v1.8.1 beta';
  document.title='Lattes Assist v1.8.1 beta';
}

globalThis.LattesPasswordRecoveryBeta2={directRecoveryRequestRequested,directPasswordResetRequested};
if(typeof document!=='undefined'){
  ensureRecoveryRequestDialog();
  ensureRecoveryLaunchers();
  recoveryBeta2Branding();
  if(directRecoveryRequestRequested())setTimeout(openRecoveryRequestDialog,250);
  if(directPasswordResetRequested())setTimeout(openPasswordResetIfReady,250);
  const obs=new MutationObserver(()=>{ensureRecoveryLaunchers();recoveryBeta2Branding()});
  obs.observe(document.documentElement,{subtree:true,childList:true});
  setTimeout(()=>{ensureRecoveryLaunchers();recoveryBeta2Branding()},700);
  setTimeout(()=>{ensureRecoveryLaunchers();recoveryBeta2Branding()},1800);
}
