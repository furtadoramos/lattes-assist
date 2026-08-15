const SUPABASE_URL='https://pxdrxyrbjfdrdjzjttif.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable__IRwahP2phSouaoGbsLlxg_44vdQaNN';
const BETA_AUTH_REDIRECT='https://furtadoramos.github.io/lattes-assist/beta/';
const LOCAL_OWNER_KEY='lattesAssist.localOwner';
const CLOUD_STATE_KEYS=['cv','articles','records','relations','coverage','retrospective','identityProfile','decisions','assistedPackage','schemaMap','audit','updates','queue','settings'];
let cloudClient=null,cloudSession=null;

async function loadSupabaseClient(){
  if(cloudClient)return cloudClient;
  if(!window.supabase?.createClient){
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Não foi possível carregar o cliente Supabase.'));
      document.head.appendChild(s);
    });
  }
  cloudClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  return cloudClient;
}

function cloudSnapshotPayload(){
  const payload={};
  for(const k of CLOUD_STATE_KEYS)payload[k]=state[k];
  return {schema:'lattes-assist.cloud-snapshot.v1',createdAt:new Date().toISOString(),appVersion:'1.7-beta',state:payload};
}
function restoreCloudState(payload){
  if(!payload?.state)throw new Error('Snapshot remoto inválido.');
  for(const k of CLOUD_STATE_KEYS){
    if(Object.prototype.hasOwnProperty.call(payload.state,k))state[k]=payload.state[k];
  }
  save();persistParsed();renderAll();
}
function cloudUserLabel(){return cloudSession?.user?.email||''}
function cloudStatus(msg,kind=''){
  const el=$('#cloudStatus');
  if(el){el.textContent=msg;el.dataset.kind=kind;}
}
function gateStatus(msg,kind=''){
  const el=document.getElementById('authGateStatus');
  if(el){el.textContent=msg;el.dataset.kind=kind;}
}
function ensureAuthGate(){
  if(document.getElementById('authGate'))return;
  const style=document.createElement('style');
  style.id='authGateRuntimeStyle';
  style.textContent=`body.auth-locked{overflow:hidden}body.auth-locked .app{visibility:hidden}#authGate{position:fixed;inset:0;z-index:1000000;background:linear-gradient(145deg,#f5f3ee,#e7ece7);display:grid;place-items:center;padding:20px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#182724}#authGate[hidden]{display:none}#authGate .auth-card{width:min(440px,100%);background:#fff;border:1px solid #d8d7cf;border-radius:22px;box-shadow:0 22px 70px rgba(24,39,36,.16);padding:28px}#authGate .auth-brand{display:flex;gap:14px;align-items:center;margin-bottom:20px}#authGate .auth-brand img{width:58px;height:58px;border-radius:15px}#authGate h1{font-size:24px;margin:0 0 2px}#authGate .beta{font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#7b5c23}#authGate label{display:block;font-size:13px;font-weight:650;margin:14px 0 6px}#authGate input{width:100%;box-sizing:border-box;padding:12px 13px;border:1px solid #c9ccc7;border-radius:11px;font:inherit;background:#fff}#authGate .auth-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}#authGate button{border:1px solid #aeb7b2;border-radius:11px;padding:11px 16px;background:#fff;font-weight:700;cursor:pointer}#authGate button.primary{background:#182724;color:#fff;border-color:#182724}#authGate button.danger{color:#8b2f25;border-color:#d8b8b4}#authGate .auth-note{font-size:12px;line-height:1.5;color:#68716d;margin-top:15px}#authGateStatus{min-height:20px;margin-top:13px;font-size:13px}#authGateStatus[data-kind="error"]{color:#9b342c}#authGateStatus[data-kind="ok"]{color:#23674f}#authGateStatus[data-kind="warn"]{color:#8b651d}`;
  document.head.appendChild(style);
  const gate=document.createElement('div');
  gate.id='authGate';
  gate.innerHTML=`<div class="auth-card"><div class="auth-brand"><img src="icons/icon-192.png" alt=""><div><div class="beta">v1.7 beta</div><h1>Lattes Assist</h1><div style="font-size:13px;color:#68716d">Entre para acessar seu espaço curricular.</div></div></div><label for="authGateEmail">E-mail</label><input id="authGateEmail" type="email" autocomplete="email" placeholder="nome@exemplo.com"><label for="authGatePassword">Senha</label><input id="authGatePassword" type="password" autocomplete="current-password" minlength="8" placeholder="mínimo de 8 caracteres"><div class="auth-actions"><button class="primary" id="authGateLogin">Entrar</button><button id="authGateSignup">Criar conta</button><button class="danger" id="authGateResetLocal" hidden>Limpar espaço local e continuar</button></div><div id="authGateStatus">Verificando sessão…</div><div class="auth-note">Esta conta pertence ao Lattes Assist e é independente da senha da Plataforma Lattes/CNPq. O XML só poderá ser importado depois da autenticação.</div></div>`;
  document.body.appendChild(gate);
  const boot=document.getElementById('authBoot');if(boot)boot.style.display='none';
  gate.querySelector('#authGateLogin').addEventListener('click',cloudSignIn);
  gate.querySelector('#authGateSignup').addEventListener('click',cloudSignUp);
  gate.querySelector('#authGateResetLocal').addEventListener('click',resetLocalWorkspaceForCurrentUser);
  gate.querySelector('#authGatePassword').addEventListener('keydown',e=>{if(e.key==='Enter')cloudSignIn()});
}
function lockApplication(message='Entre para acessar o Lattes Assist.'){
  document.body.classList.add('auth-locked');
  const app=document.querySelector('.app');
  if(app){app.setAttribute('inert','');app.setAttribute('aria-hidden','true');}
  const gate=document.getElementById('authGate');if(gate)gate.hidden=false;
  gateStatus(message);
}
function unlockApplication(){
  document.body.classList.remove('auth-boot','auth-locked');
  const app=document.querySelector('.app');
  if(app){app.removeAttribute('inert');app.setAttribute('aria-hidden','false');}
  const gate=document.getElementById('authGate');if(gate)gate.hidden=true;
  document.getElementById('authBoot')?.remove();
  document.getElementById('authBootStyle')?.remove();
}
function workspaceOwnerConflict(){
  const current=cloudSession?.user?.id||'';
  const owner=localStorage.getItem(LOCAL_OWNER_KEY)||'';
  return Boolean(current&&owner&&owner!==current);
}
function claimWorkspaceIfAvailable(){
  const current=cloudSession?.user?.id||'';
  if(!current)return false;
  const owner=localStorage.getItem(LOCAL_OWNER_KEY)||'';
  if(!owner){localStorage.setItem(LOCAL_OWNER_KEY,current);return true;}
  return owner===current;
}
function renderAuthState(){
  ensureAuthGate();
  const signed=Boolean(cloudSession?.user);
  const reset=document.getElementById('authGateResetLocal');
  if(!signed){
    if(reset)reset.hidden=true;
    lockApplication('Informe seu e-mail e senha para entrar.');
  }else if(workspaceOwnerConflict()){
    if(reset)reset.hidden=false;
    lockApplication('Este navegador contém dados locais vinculados a outra conta. Para evitar mistura entre usuários, use outro perfil do navegador ou limpe o espaço local depois de fazer backup.');
    gateStatus('Conta autenticada, mas o espaço local pertence a outro usuário.','warn');
  }else{
    if(reset)reset.hidden=true;
    claimWorkspaceIfAvailable();
    unlockApplication();
  }
  renderCloudUi();
}
async function resetLocalWorkspaceForCurrentUser(){
  if(!cloudSession?.user)return;
  if(!confirm('Esta ação apagará deste navegador o currículo, fila, configurações e documentos locais da conta anterior. Faça backup antes de continuar. Deseja realmente limpar o espaço local?'))return;
  gateStatus('Limpando o espaço local…','warn');
  try{
    if(typeof clearEvidenceDb==='function')await clearEvidenceDb();
    Object.keys(localStorage).filter(k=>k.startsWith('lattesAssist.')).forEach(k=>localStorage.removeItem(k));
    localStorage.setItem(LOCAL_OWNER_KEY,cloudSession.user.id);
    location.reload();
  }catch(e){gateStatus('Não foi possível limpar o espaço local: '+e.message,'error');}
}
function ensureCloudUi(){
  const host=$('#sources');
  if(!host||$('#cloudAccountCard'))return;
  const card=document.createElement('div');
  card.id='cloudAccountCard';
  card.className='section card';
  card.innerHTML=`<div class="section-head"><h3>Conta e sincronização <span class="badge warn">beta</span></h3><span class="small">Supabase Auth + RLS</span></div><div class="notice">O acesso ao aplicativo exige autenticação. A sincronização remota inclui análise curricular, auditorias, decisões, fila e configurações; certificados e arquivos originais continuam locais nesta etapa.</div><div id="cloudSignedIn"><div class="source"><div><strong>Conta autenticada</strong><span class="small" id="cloudUser"></span></div><span class="badge ok">conectado</span></div><div class="row" style="margin-top:12px"><button class="btn primary" id="cloudSave">Salvar análise na nuvem</button><button class="btn" id="cloudLoad">Recuperar análise da nuvem</button><button class="btn" id="cloudLogout">Sair</button></div></div><div class="small" id="cloudStatus" style="margin-top:10px"></div>`;
  host.appendChild(card);
  $('#cloudLogout')?.addEventListener('click',cloudSignOut);
  $('#cloudSave')?.addEventListener('click',saveCloudSnapshot);
  $('#cloudLoad')?.addEventListener('click',loadCloudSnapshot);
}
function renderCloudUi(){
  const signed=Boolean(cloudSession?.user);
  const user=$('#cloudUser');if(user)user.textContent=signed?cloudUserLabel():'';
  if($('#cloudSave'))$('#cloudSave').disabled=!signed;
  if($('#cloudLoad'))$('#cloudLoad').disabled=!signed;
  if($('#cloudLogout'))$('#cloudLogout').disabled=!signed;
}
function gateCredentials(){
  return {email:clean(document.getElementById('authGateEmail')?.value),password:document.getElementById('authGatePassword')?.value||''};
}
async function cloudSignUp(){
  const {email,password}=gateCredentials();
  if(!email||password.length<8)return gateStatus('Informe um e-mail válido e uma senha com pelo menos 8 caracteres.','error');
  gateStatus('Criando conta…');
  try{
    const c=await loadSupabaseClient();
    const {data,error}=await c.auth.signUp({email,password,options:{emailRedirectTo:BETA_AUTH_REDIRECT}});
    if(error)throw error;
    cloudSession=data.session||null;
    if(data.session){gateStatus('Conta criada e sessão iniciada.','ok');}
    else{gateStatus('Conta criada. Confirme o cadastro no e-mail recebido e retorne à beta.','ok');}
    renderAuthState();
  }catch(e){gateStatus('Não foi possível criar a conta: '+e.message,'error');}
}
async function cloudSignIn(){
  const {email,password}=gateCredentials();
  if(!email||!password)return gateStatus('Informe e-mail e senha.','error');
  gateStatus('Entrando…');
  try{
    const c=await loadSupabaseClient();
    const {data,error}=await c.auth.signInWithPassword({email,password});
    if(error)throw error;
    cloudSession=data.session;
    gateStatus('Sessão iniciada.','ok');
    renderAuthState();
  }catch(e){gateStatus('Falha no login: '+e.message,'error');}
}
async function cloudSignOut(){
  try{
    const c=await loadSupabaseClient();
    const {error}=await c.auth.signOut();
    if(error)throw error;
    cloudSession=null;
    cloudStatus('Sessão encerrada.','ok');
    renderAuthState();
  }catch(e){cloudStatus('Não foi possível sair: '+e.message,'error');}
}
async function saveCloudSnapshot(){
  if(!cloudSession?.user)return;
  cloudStatus('Salvando análise…');
  try{
    const c=await loadSupabaseClient(),payload=cloudSnapshotPayload();
    const {data:existing,error:readError}=await c.from('user_snapshots').select('id').eq('user_id',cloudSession.user.id).eq('label','Estado principal').maybeSingle();
    if(readError)throw readError;
    let error;
    if(existing?.id){
      ({error}=await c.from('user_snapshots').update({payload,app_version:'1.7-beta',updated_at:new Date().toISOString()}).eq('id',existing.id));
    }else{
      ({error}=await c.from('user_snapshots').insert({user_id:cloudSession.user.id,label:'Estado principal',payload,app_version:'1.7-beta'}));
    }
    if(error)throw error;
    cloudStatus('Análise sincronizada com sucesso. Arquivos originais permaneceram locais.','ok');
  }catch(e){cloudStatus('Falha ao salvar na nuvem: '+e.message,'error');}
}
async function loadCloudSnapshot(){
  if(!cloudSession?.user)return;
  cloudStatus('Recuperando análise…');
  try{
    const c=await loadSupabaseClient();
    const {data,error}=await c.from('user_snapshots').select('payload,updated_at,app_version').eq('user_id',cloudSession.user.id).eq('label','Estado principal').maybeSingle();
    if(error)throw error;
    if(!data?.payload)return cloudStatus('Ainda não existe uma análise salva nesta conta.','warn');
    if(!confirm(`Substituir o estado curricular local pela análise salva na nuvem em ${new Date(data.updated_at).toLocaleString('pt-BR')}?\n\nCertificados e arquivos originais locais não serão apagados.`))return;
    restoreCloudState(data.payload);
    cloudStatus('Análise recuperada. Documentos locais foram preservados.','ok');
  }catch(e){cloudStatus('Falha ao recuperar a análise: '+e.message,'error');}
}
async function initCloudAuth(){
  ensureAuthGate();
  lockApplication('Verificando sua sessão segura…');
  ensureCloudUi();
  $('#xmlInput')?.addEventListener('change',e=>{
    if(!cloudSession?.user){
      e.preventDefault();e.stopImmediatePropagation();e.target.value='';
      gateStatus('Faça login antes de importar o XML do Currículo Lattes.','warn');
      renderAuthState();
    }
  },true);
  try{
    const c=await loadSupabaseClient();
    const {data}=await c.auth.getSession();
    cloudSession=data.session||null;
    c.auth.onAuthStateChange((_event,session)=>{cloudSession=session;renderAuthState();});
    renderAuthState();
  }catch(e){
    lockApplication('Não foi possível validar a sessão.');
    gateStatus('Autenticação indisponível: '+e.message,'error');
  }
}
initCloudAuth();