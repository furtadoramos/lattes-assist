const EXTERNAL_CURATION_VERSION='1.8-beta-pop3';

function externalCandidateFingerprints(candidate){
  const out=[];
  const doi=typeof normalizeDoi==='function'?normalizeDoi(candidate?.doi||''):String(candidate?.doi||'').trim().toLowerCase().replace(/^https?:\/\/(?:dx\.)?doi\.org\//,'');
  if(doi)out.push('doi:'+doi);
  const title=typeof normalizeTitle==='function'?normalizeTitle(candidate?.title||''):String(candidate?.title||'').trim().toLowerCase();
  const year=String(candidate?.year||'').trim();
  if(title)out.push('title:'+title+'|year:'+year);
  return [...new Set(out)];
}
function externalExclusionMatches(candidate,entries){
  const fps=new Set(externalCandidateFingerprints(candidate));
  return (entries||[]).some(e=>(e?.fingerprints||[]).some(fp=>fps.has(fp)));
}
function externalExclusions(){
  if(typeof state==='undefined')return[];
  state.settings=state.settings||{};
  if(!Array.isArray(state.settings.externalExclusions))state.settings.externalExclusions=[];
  return state.settings.externalExclusions;
}
function externalCandidateIsExcluded(candidate){return externalExclusionMatches(candidate,externalExclusions())}
function externalMinimalSnapshot(x){
  const keep=['id','key','title','year','doi','venue','type','authors','sources','manualClassification','classification','publisher','issn','volume','issue','startPage','endPage','abstract','articleUrl','citationUrl','citesUrl','popMetrics','popProvenance','orcidVerified'];
  const s={};for(const k of keep)if(x?.[k]!==undefined){try{s[k]=JSON.parse(JSON.stringify(x[k]))}catch{s[k]=x[k]}}
  return s;
}
function externalTransientCandidate(c){
  const title=String(c?.title||''),year=String(c?.year||''),doi=typeof normalizeDoi==='function'?normalizeDoi(c?.doi||''):String(c?.doi||'');
  const x={id:'excluded-'+Date.now()+'-'+Math.random(),key:[doi,title,year].join('|'),title,year,doi,venue:c?.venue||'',type:c?.type||'',authors:c?.authors||[],sources:[c?.source].filter(Boolean),raw:c?.raw||null,rawBySource:{},__excluded:true};
  if(c?.source)x.rawBySource[c.source]=c.raw||null;
  if(typeof inferExternalProductionType==='function')x.classification=inferExternalProductionType(x);
  return x;
}

const __addExternalCandidateBeforeCuration=typeof addExternalCandidate==='function'?addExternalCandidate:null;
if(__addExternalCandidateBeforeCuration){
  addExternalCandidate=function(c){
    if(externalCandidateIsExcluded(c))return externalTransientCandidate(c);
    return __addExternalCandidateBeforeCuration(c);
  };
}

function relatedQueueItemsForExternal(x){
  if(typeof state==='undefined'||!x)return[];
  return (state.queue||[]).filter(q=>q.evidence?.externalCandidateId===x.id||(x.key&&q.evidence?.externalKey===x.key));
}
function invalidateAfterExternalCuration(){
  if(typeof state==='undefined')return;
  state.assistedPackage=null;state.rebuiltXml=null;state.rebuildReport=null;state.diffReport=null;state.semanticDiff=[];state.stableIdentityReport=null;
}
function excludeExternalCandidate(id){
  const x=(state.externalCandidates||[]).find(c=>c.id===id);if(!x)return;
  const related=relatedQueueItemsForExternal(x);
  const msg=related.length
    ?`Excluir “${x.title||'este registro'}” das Fontes Externas?\n\nHá ${related.length} operação(ões) vinculada(s) na Fila; elas também serão removidas. O registro ficará na lista de excluídos e não reaparecerá em novas importações ou prospecções até ser restaurado.`
    :`Excluir “${x.title||'este registro'}” das Fontes Externas?\n\nO registro ficará na lista de excluídos e não reaparecerá em novas importações ou prospecções até ser restaurado.`;
  if(!confirm(msg))return;
  const fingerprints=externalCandidateFingerprints(x);const list=externalExclusions();
  if(!list.some(e=>(e.fingerprints||[]).some(fp=>fingerprints.includes(fp))))list.push({id:crypto.randomUUID?crypto.randomUUID():'ex-'+Date.now(),fingerprints,title:x.title||'',year:x.year||'',doi:x.doi||'',sources:[...(x.sources||[])],excludedAt:new Date().toISOString(),snapshot:externalMinimalSnapshot(x)});
  state.externalCandidates=(state.externalCandidates||[]).filter(c=>c.id!==id);
  if(related.length){const ids=new Set(related.map(q=>q.id));state.queue=(state.queue||[]).filter(q=>!ids.has(q.id))}
  invalidateAfterExternalCuration();save();renderAll();if(typeof renderExternal==='function')renderExternal();renderExternalExclusionsControl();
}
function restoreExternalExclusion(id){
  const list=externalExclusions(),entry=list.find(e=>e.id===id);if(!entry)return;
  state.settings.externalExclusions=list.filter(e=>e.id!==id);
  const s=entry.snapshot;
  if(s?.title&&!externalExclusionMatches(s,state.settings.externalExclusions)){
    let c=null;
    if(__addExternalCandidateBeforeCuration)c=__addExternalCandidateBeforeCuration({source:(s.sources||[])[0]||'Restaurado',title:s.title,doi:s.doi,year:s.year,venue:s.venue,type:s.type,authors:s.authors||[],raw:null,orcidVerified:Boolean(s.orcidVerified)});
    if(c){for(const k of ['manualClassification','classification','publisher','issn','volume','issue','startPage','endPage','abstract','articleUrl','citationUrl','citesUrl','popMetrics','popProvenance'])if(s[k]!==undefined)c[k]=s[k];c.sources=[...new Set([...(c.sources||[]),...(s.sources||[])])];}
  }
  save();renderAll();if(typeof renderExternal==='function')renderExternal();openExternalExclusionsDialog();
}
function ensureExternalExclusionsDialog(){
  if(typeof document==='undefined'||document.getElementById('externalExclusionsDialog'))return;
  const d=document.createElement('dialog');d.id='externalExclusionsDialog';d.className='dialog';d.innerHTML='<div class="inner"><h3>Registros externos excluídos</h3><p class="hint">Esses registros não reaparecem em novas importações ou prospecções. Restaure um item se quiser voltar a considerá-lo.</p><div id="externalExclusionsList"></div><div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn" id="externalExclusionsClose">Fechar</button></div></div>';document.body.appendChild(d);document.getElementById('externalExclusionsClose').onclick=()=>d.close();
}
function openExternalExclusionsDialog(){
  ensureExternalExclusionsDialog();const d=document.getElementById('externalExclusionsDialog'),box=document.getElementById('externalExclusionsList'),xs=externalExclusions();
  box.innerHTML=xs.length?xs.map(e=>`<div class="source"><div><strong>${esc(e.title||'Registro sem título')}</strong><span class="small">${esc(String(e.year||''))}${e.doi?' · DOI '+esc(e.doi):''}${e.sources?.length?' · '+esc(e.sources.join(', ')):''}</span></div><div class="row"><button class="btn" data-restore-exclusion="${esc(e.id)}">Restaurar</button></div></div>`).join(''):'<div class="empty">Nenhum registro externo excluído.</div>';
  box.querySelectorAll('[data-restore-exclusion]').forEach(b=>b.onclick=()=>restoreExternalExclusion(b.dataset.restoreExclusion));d.showModal();
}
function renderExternalExclusionsControl(){
  if(typeof document==='undefined')return;const panel=document.getElementById('external');if(!panel)return;
  let b=document.getElementById('manageExternalExclusions');if(!b){const row=panel.querySelector('.section.card .row');if(!row)return;b=document.createElement('button');b.className='btn';b.id='manageExternalExclusions';b.onclick=openExternalExclusionsDialog;row.appendChild(b)}
  const n=externalExclusions().length;b.textContent=`Gerenciar excluídos${n?' ('+n+')':''}`;
}
function installExternalDeleteButtons(){
  if(typeof document==='undefined')return;
  [...document.querySelectorAll('#externalList>.source')].forEach(card=>{
    const title=card.querySelector('strong')?.textContent||'';const x=(state.externalCandidates||[]).find(c=>normalizeTitle(c.title||'')===normalizeTitle(title));if(!x)return;
    const row=card.querySelector('.row');if(!row||row.querySelector('.external-delete-wrap'))return;
    row.style.flexWrap='wrap';const wrap=document.createElement('div');wrap.className='external-delete-wrap';wrap.style.flexBasis='100%';wrap.style.width='100%';wrap.style.marginTop='6px';wrap.style.textAlign='right';
    const b=document.createElement('button');b.className='btn danger external-delete';b.textContent='Excluir';b.title='Excluir este registro das Fontes Externas e impedir que reapareça automaticamente';b.onclick=()=>excludeExternalCandidate(x.id);wrap.appendChild(b);row.appendChild(wrap);
  });
}
const __renderExternalBeforeCuration=typeof renderExternal==='function'?renderExternal:null;
if(__renderExternalBeforeCuration){
  renderExternal=function(){const out=__renderExternalBeforeCuration.apply(this,arguments);installExternalDeleteButtons();renderExternalExclusionsControl();return out};
}
function pop3Branding(){
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.8 beta · Publish or Perish';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.8 beta';
  const meta=document.querySelector('#rc5AccountStrip .rc5-meta div:last-child');if(meta)meta.textContent='v1.8 beta';document.title='Lattes Assist v1.8 beta';
}

globalThis.LattesExternalCuration={externalCandidateFingerprints,externalExclusionMatches};
if(typeof document!=='undefined'&&typeof state!=='undefined'){
  ensureExternalExclusionsDialog();installExternalDeleteButtons();renderExternalExclusionsControl();pop3Branding();
  setTimeout(()=>{installExternalDeleteButtons();renderExternalExclusionsControl();pop3Branding()},700);
  setTimeout(()=>{installExternalDeleteButtons();renderExternalExclusionsControl()},1600);
}
