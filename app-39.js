const EXTERNAL_EXCLUSIONS_MENU_VERSION='1.8-beta-pop4';

function activatePanelSafe(id){
  if(typeof rc3ActivatePanel==='function')return rc3ActivatePanel(id);
  document.querySelectorAll('.nav button[data-panel]').forEach(x=>x.classList.toggle('active',x.dataset.panel===id));
  document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x.id===id));
}

function ensureExternalExclusionsPanel(){
  if(typeof document==='undefined')return null;
  let panel=document.getElementById('external-exclusions');
  if(panel)return panel;
  const external=document.getElementById('external');
  if(!external)return null;
  panel=document.createElement('section');
  panel.id='external-exclusions';
  panel.className='panel';
  panel.innerHTML=`<header class="topbar"><div><div class="eyebrow">Entrada e prospecção</div><h2>Gerenciar excluídos</h2><p class="sub">Revise os candidatos externos descartados e restaure aqueles que quiser voltar a considerar.</p></div><div class="actions"><button class="btn" id="backToExternalSources">Voltar às Fontes Externas</button></div></header><div class="section card"><div class="section-head"><h3>Registros externos excluídos</h3><span class="badge neutral" id="externalExclusionsPanelCount">0</span></div><div class="notice">Um registro excluído não reaparece automaticamente em novas importações ou prospecções enquanto permanecer nesta lista. A restauração remove o bloqueio persistente, mas não o adiciona automaticamente à Fila.</div><div id="externalExclusionsPanelList" style="margin-top:12px"></div></div>`;
  external.insertAdjacentElement('afterend',panel);
  document.getElementById('backToExternalSources')?.addEventListener('click',()=>activatePanelSafe('external'));
  return panel;
}

function renderExternalExclusionsPanel(){
  const panel=ensureExternalExclusionsPanel();if(!panel||typeof externalExclusions!=='function')return;
  const xs=externalExclusions(),count=document.getElementById('externalExclusionsPanelCount'),box=document.getElementById('externalExclusionsPanelList');
  if(count)count.textContent=String(xs.length);
  if(!box)return;
  box.innerHTML=xs.length?xs.map(e=>`<div class="source"><div><strong>${esc(e.title||'Registro sem título')}</strong><span class="small">${esc(String(e.year||''))}${e.doi?' · DOI '+esc(e.doi):''}${e.sources?.length?' · '+esc(e.sources.join(', ')):''}</span><div class="small" style="margin-top:4px">Excluído em ${esc(e.excludedAt?new Date(e.excludedAt).toLocaleString('pt-BR'):'data não registrada')}</div></div><div class="row"><button class="btn" data-panel-restore-exclusion="${esc(e.id)}">Restaurar</button></div></div>`).join(''):'<div class="empty">Nenhum registro externo excluído.</div>';
  box.querySelectorAll('[data-panel-restore-exclusion]').forEach(b=>b.addEventListener('click',()=>{if(typeof restoreExternalExclusion==='function')restoreExternalExclusion(b.dataset.panelRestoreExclusion);setTimeout(renderExternalExclusionsPanel,0)}));
}

function ensureExternalExclusionsNav(){
  if(typeof document==='undefined')return;
  const nav=document.querySelector('.nav'),externalButton=nav?.querySelector('button[data-panel="external"]');if(!nav||!externalButton)return;
  let b=nav.querySelector('button[data-panel="external-exclusions"]');
  if(!b){b=document.createElement('button');b.dataset.panel='external-exclusions';b.addEventListener('click',()=>activatePanelSafe('external-exclusions'));externalButton.insertAdjacentElement('afterend',b)}
  const n=typeof externalExclusions==='function'?externalExclusions().length:0;
  b.textContent=`3.1 Gerenciar excluídos${n?' ('+n+')':''}`;
  b.classList.toggle('active',document.getElementById('external-exclusions')?.classList.contains('active'));
}

function rebindExternalManageButtonToPanel(){
  const b=document.getElementById('manageExternalExclusions');if(!b||b.dataset.panelBound==='1')return;
  const clone=b.cloneNode(true);b.replaceWith(clone);clone.dataset.panelBound='1';clone.addEventListener('click',()=>{ensureExternalExclusionsPanel();renderExternalExclusionsPanel();ensureExternalExclusionsNav();activatePanelSafe('external-exclusions')});
}

function refreshExternalExclusionsNavigation(){
  ensureExternalExclusionsPanel();renderExternalExclusionsPanel();ensureExternalExclusionsNav();rebindExternalManageButtonToPanel();
}

function clarifyQueueRemoveActions(){
  if(typeof document==='undefined')return;
  document.querySelectorAll('#queueList .doc-card .doc-actions').forEach(actions=>{
    actions.style.flexWrap='wrap';
    const danger=[...actions.querySelectorAll('button.btn.danger')].find(b=>/removeQueueItem/.test(b.getAttribute('onclick')||'')||/Remover/i.test(b.textContent||''));
    if(danger){danger.textContent='Remover da Fila';danger.title='Remover somente esta operação da Fila de atualização';danger.classList.add('queue-remove-explicit')}
  });
}

const __renderQueueBeforePop4=typeof renderQueue==='function'?renderQueue:null;
if(__renderQueueBeforePop4){
  renderQueue=function(){const out=__renderQueueBeforePop4.apply(this,arguments);clarifyQueueRemoveActions();return out};
}

const __renderExternalBeforePop4=typeof renderExternal==='function'?renderExternal:null;
if(__renderExternalBeforePop4){
  renderExternal=function(){const out=__renderExternalBeforePop4.apply(this,arguments);refreshExternalExclusionsNavigation();return out};
}

const __excludeExternalBeforePop4=typeof excludeExternalCandidate==='function'?excludeExternalCandidate:null;
if(__excludeExternalBeforePop4){
  excludeExternalCandidate=function(){const out=__excludeExternalBeforePop4.apply(this,arguments);setTimeout(()=>{refreshExternalExclusionsNavigation();clarifyQueueRemoveActions()},0);return out};
}
const __restoreExternalBeforePop4=typeof restoreExternalExclusion==='function'?restoreExternalExclusion:null;
if(__restoreExternalBeforePop4){
  restoreExternalExclusion=function(){const out=__restoreExternalBeforePop4.apply(this,arguments);setTimeout(refreshExternalExclusionsNavigation,0);return out};
}

const __rc3OrganizeNavigationBeforePop4=typeof rc3OrganizeNavigation==='function'?rc3OrganizeNavigation:null;
if(__rc3OrganizeNavigationBeforePop4){
  rc3OrganizeNavigation=function(){const out=__rc3OrganizeNavigationBeforePop4.apply(this,arguments);refreshExternalExclusionsNavigation();return out};
}

function pop4Branding(){
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.8 beta · Publish or Perish';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.8 beta';
  const meta=document.querySelector('#rc5AccountStrip .rc5-meta div:last-child');if(meta)meta.textContent='v1.8 beta';document.title='Lattes Assist v1.8 beta';
}

if(typeof document!=='undefined'&&typeof state!=='undefined'){
  refreshExternalExclusionsNavigation();clarifyQueueRemoveActions();pop4Branding();
  setTimeout(()=>{refreshExternalExclusionsNavigation();clarifyQueueRemoveActions();pop4Branding()},700);
  setTimeout(()=>{refreshExternalExclusionsNavigation();clarifyQueueRemoveActions()},1600);
}
