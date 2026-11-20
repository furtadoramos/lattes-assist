const PASSWORD_RECOVERY_VERSION='1.8.1-beta';
const PASSWORD_RECOVERY_REDIRECT='https://furtadoramos.github.io/lattes-assist/beta/';
let PASSWORD_RECOVERY_ACTIVE=false;

function recoveryUrlHasIntent(href){
  try{
    const u=new URL(href,'https://furtadoramos.github.io/lattes-assist/beta/');
    const hash=new URLSearchParams(String(u.hash||'').replace(/^#/,''));
    return u.searchParams.get('type')==='recovery'||hash.get('type')==='recovery';
  }catch{return false}
}
function recoveryUrlHasError(href){
  try{
    const u=new URL(href,'https://furtadoramos.github.io/lattes-assist/beta/');
    const hash=new URLSearchParams(String(u.hash||'').replace(/^#/,''));
    return Boolean(u.searchParams.get('error')||hash.get('error')||u.searchParams.get('error_code')||hash.get('error_code'));
  }catch{return false}
}
function validateRecoveryPasswords(password,confirmation){
  if(String(password||'').length<8)return'A nova senha deve ter pelo menos 8 caracteres.';
  if(password!==confirmation)return'As duas senhas não coincidem.';
  return'';
}
function clearRecoveryUrl(){
  try{
    const clean=location.pathname+(location.search&&location.search!=='?'?location.search.replace(/([?&])(type|error|error_code|error_description)=[^&]*/g,'').replace(/^&/,'?').replace(/[?&]$/,''):'');
    history.replaceState({},document.title,clean||location.pathname);
  }catch{}
}
function passwordRecoveryStatus(message,kind=''){
  const el=document.getElementById('passwordRecoveryStatus');
  if(el){el.textContent=message;el.dataset.kind=kind;}
}
function ensurePasswordRecoveryDialog(){
  if(typeof document==='undefined')return null;
  let d=document.getElementById('passwordRecoveryDialog');
  if(d)return d;
  const style=document.createElement('style');
  style.id='passwordRecoveryStyle';
  style.textContent=`#passwordRecoveryDialog{border:0;padding:0;background:transparent;max-width:none}#passwordRecoveryDialog::backdrop{background:rgba(16,28,25,.55);backdrop-filter:blur(3px)}#passwordRecoveryDialog .recovery-card{width:min(460px,calc(100vw - 32px));box-sizing:border-box;background:#fff;color:#182724;border:1px solid #d8d7cf;border-radius:20px;box-shadow:0 24px 80px rgba(24,39,36,.28);padding:28px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}#passwordRecoveryDialog h2{margin:0 0 8px;font-size:24px}#passwordRecoveryDialog p{line-height:1.5;color:#68716d}#passwordRecoveryDialog label{display:block;font-size:13px;font-weight:700;margin:14px 0 6px}#passwordRecoveryDialog input{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #c9ccc7;border-radius:11px;font:inherit}#passwordRecoveryDialog .recovery-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;flex-wrap:wrap}#passwordRecoveryDialog button{border:1px solid #aeb7b2;border-radius:11px;padding:11px 16px;background:#fff;font-weight:700;cursor:pointer}#passwordRecoveryDialog button.primary{background:#182724;color:#fff;border-color:#182724}#passwordRecoveryStatus{min-height:20px;margin-top:12px;font-size:13px}#passwordRecoveryStatus[data-kind="error"]{color:#9b342c}#passwordRecoveryStatus[data-kind="ok"]{color:#23674f}`;
  document.head.appendChild(style);
  d=document.createElement('dialog');
  d.id='passwordRecoveryDialog';
  d.innerHTML=`<div class="recovery-card"><h2>Definir nova senha</h2><p>Crie uma nova senha para sua conta do Lattes Assist. Esta senha é independente da senha da Plataforma Lattes/CNPq.</p><label for="passwordRecoveryNew">Nova senha</label><input id="passwordRecoveryNew" type="password" autocomplete="new-password" minlength="8" placeholder="mínimo de 8 caracteres"><label for="passwordRecoveryConfirm">Confirmar nova senha</label><input id="passwordRecoveryConfirm" type="password" autocomplete="new-password" minlength="8" placeholder="redigite a nova senha"><div id="passwordRecoveryStatus">Use uma senha exclusiva para o Lattes Assist.</div><div class="recovery-actions"><button id="passwordRecoveryContinue" hidden>Continuar</button><button class="primary" id="passwordRecoverySave">Atualizar senha</button></div></div>`;
  document.body.appendChild(d);
  d.addEventListener('cancel',e=>{if(PASSWORD_RECOVERY_ACTIVE)e.preventDefault()});
  document.getElementById('passwordRecoverySave').addEventListener('click',completePasswordRecovery);
  document.getElementById('passwordRecoveryContinue').addEventListener('click',()=>{PASSWORD_RECOVERY_ACTIVE=false;d.close();if(typeof renderAuthState==='function')renderAuthState()});
  document.getElementById('passwordRecoveryConfirm').addEventListener('keydown',e=>{if(e.key==='Enter')completePasswordRecovery()});
  return d;
}
function showPasswordRecoveryDialog(){
  const d=ensurePasswordRecoveryDialog();if(!d)return;
  PASSWORD_RECOVERY_ACTIVE=true;
  const save=document.getElementById('passwordRecoverySave'),cont=document.getElementById('passwordRecoveryContinue');
  if(save){save.disabled=false;save.hidden=false;save.textContent='Atualizar senha'}
  if(cont)cont.hidden=true;
  passwordRecoveryStatus('Digite e confirme a nova senha.','');
  if(!d.open)d.showModal();
  setTimeout(()=>document.getElementById('passwordRecoveryNew')?.focus(),0);
}
async function requestPasswordRecovery(){
  const email=String(document.getElementById('authGateEmail')?.value||'').trim();
  if(!email){if(typeof gateStatus==='function')gateStatus('Informe primeiro o e-mail da sua conta.','warn');document.getElementById('authGateEmail')?.focus();return}
  const b=document.getElementById('authGateForgotPassword');
  if(b)b.disabled=true;
  if(typeof gateStatus==='function')gateStatus('Solicitando link de recuperação…');
  try{
    const c=await loadSupabaseClient();
    const {error}=await c.auth.resetPasswordForEmail(email,{redirectTo:PASSWORD_RECOVERY_REDIRECT});
    if(error)throw error;
    if(typeof gateStatus==='function')gateStatus('Se existir uma conta para este e-mail, você receberá uma mensagem com o link de recuperação. Verifique também spam e lixo eletrônico.','ok');
  }catch{
    if(typeof gateStatus==='function')gateStatus('Não foi possível solicitar a recuperação agora. Aguarde alguns minutos e tente novamente.','error');
  }finally{if(b)b.disabled=false}
}
async function completePasswordRecovery(){
  const p1=document.getElementById('passwordRecoveryNew')?.value||'',p2=document.getElementById('passwordRecoveryConfirm')?.value||'';
  const validation=validateRecoveryPasswords(p1,p2);if(validation)return passwordRecoveryStatus(validation,'error');
  const save=document.getElementById('passwordRecoverySave');if(save)save.disabled=true;
  passwordRecoveryStatus('Atualizando sua senha…');
  try{
    const c=await loadSupabaseClient();
    const {data,error}=await c.auth.updateUser({password:p1});
    if(error)throw error;
    if(data?.user&&typeof cloudSession!=='undefined'){const {data:s}=await c.auth.getSession();cloudSession=s.session||cloudSession}
    document.getElementById('passwordRecoveryNew').value='';
    document.getElementById('passwordRecoveryConfirm').value='';
    clearRecoveryUrl();
    passwordRecoveryStatus('Senha atualizada com sucesso. Você já pode continuar no Lattes Assist.','ok');
    if(save)save.hidden=true;
    const cont=document.getElementById('passwordRecoveryContinue');if(cont){cont.hidden=false;cont.focus()}
  }catch{
    passwordRecoveryStatus('Não foi possível atualizar a senha. O link pode ter expirado; solicite um novo link e tente novamente.','error');
    if(save)save.disabled=false;
  }
}
function installForgotPasswordButton(){
  if(typeof document==='undefined')return false;
  const actions=document.querySelector('#authGate .auth-actions');if(!actions)return false;
  let b=document.getElementById('authGateForgotPassword');
  if(!b){b=document.createElement('button');b.id='authGateForgotPassword';b.type='button';b.textContent='Esqueci minha senha';const reset=document.getElementById('authGateResetLocal');actions.insertBefore(b,reset||null);b.addEventListener('click',requestPasswordRecovery)}
  return true;
}
async function activateRecoveryFromUrl(){
  if(typeof window==='undefined'||(!recoveryUrlHasIntent(window.location.href)&&!recoveryUrlHasError(window.location.href)))return;
  if(recoveryUrlHasError(window.location.href)){
    if(typeof renderAuthState==='function')renderAuthState();
    if(typeof gateStatus==='function')gateStatus('O link de recuperação expirou ou não pôde ser validado. Solicite um novo link em “Esqueci minha senha”.','error');
    clearRecoveryUrl();return;
  }
  try{
    const c=await loadSupabaseClient();
    for(let i=0;i<8;i++){
      const {data}=await c.auth.getSession();
      if(data?.session){cloudSession=data.session;showPasswordRecoveryDialog();return}
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    if(typeof renderAuthState==='function')renderAuthState();
    if(typeof gateStatus==='function')gateStatus('O link de recuperação não pôde ser validado. Solicite um novo link.','error');
  }catch{
    if(typeof gateStatus==='function')gateStatus('Não foi possível validar o link de recuperação. Tente novamente.','error');
  }
}
async function installPasswordRecoveryListener(){
  try{
    const c=await loadSupabaseClient();
    if(!c.__lattesPasswordRecoveryListener){
      c.__lattesPasswordRecoveryListener=true;
      c.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY'){cloudSession=session||cloudSession;showPasswordRecoveryDialog()}
      });
    }
  }catch{}
  activateRecoveryFromUrl();
}
function passwordRecoveryBetaBranding(){
  if(typeof document==='undefined')return;
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.8.1 beta';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.8.1 beta';
  const meta=document.querySelector('#rc5AccountStrip .rc5-meta div:last-child');if(meta)meta.textContent='v1.8.1 beta';
  document.title='Lattes Assist v1.8.1 beta';
}

globalThis.LattesPasswordRecovery={recoveryUrlHasIntent,recoveryUrlHasError,validateRecoveryPasswords};
if(typeof document!=='undefined'){
  ensurePasswordRecoveryDialog();
  installForgotPasswordButton();
  installPasswordRecoveryListener();
  passwordRecoveryBetaBranding();
  setTimeout(()=>{installForgotPasswordButton();passwordRecoveryBetaBranding()},500);
  setTimeout(()=>{installForgotPasswordButton();passwordRecoveryBetaBranding()},1400);
}
