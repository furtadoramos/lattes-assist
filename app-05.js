function candidateSimilarity(c){
  if(c.doi){
    const hit=state.records.find(r=>normalizeDoi(r.doi)===normalizeDoi(c.doi));
    if(hit)return {status:'matched',score:1,record:hit};
  }
  let best=null;
  state.records.filter(r=>r.category==='PRODUCAO_BIBLIOGRAFICA').forEach(r=>{
    const s=jaccard(c.title||'',r.title||'') + (c.year&&r.year&&String(c.year)===String(r.year)?0.08:0);
    if(!best||s>best.score)best={score:s,record:r};
  });
  if(best&&best.score>=.72)return {status:'matched',...best};
  if(best&&best.score>=.5)return {status:'uncertain',...best};
  return {status:'likely-new',score:best?.score||0,record:best?.record||null};
}
function addExternalCandidate(c){
  const key=[normalizeDoi(c.doi),normalizeTitle(c.title),String(c.year||'')].join('|');
  const existing=state.externalCandidates.find(x=>x.key===key);
  if(existing){
    existing.sources=[...new Set([...(existing.sources||[]),c.source])];
    if(!existing.doi&&c.doi)existing.doi=c.doi;
    return;
  }
  const rec={id:crypto.randomUUID?crypto.randomUUID():'ext-'+Date.now()+Math.random(),key,title:clean(c.title),year:String(c.year||''),doi:normalizeDoi(c.doi),venue:clean(c.venue),type:clean(c.type),authors:c.authors||[],sources:[c.source],raw:c.raw||null};
  rec.reconciliation=candidateSimilarity(rec);rec.identity=scoreIdentity(rec);
  state.externalCandidates.push(rec);
}
async function queryCrossrefExternal(name){
  const p=new URLSearchParams({'query.author':name,'rows':'50','select':'DOI,title,author,published-print,published-online,container-title,type'});
  if(state.settings.email)p.set('mailto',state.settings.email);
  const r=await fetch('https://api.crossref.org/works?'+p.toString());if(!r.ok)throw new Error('Crossref '+r.status);
  const j=await r.json();
  (j.message?.items||[]).forEach(x=>addExternalCandidate({source:'Crossref',title:(x.title||[])[0]||'',doi:x.DOI||'',year:x['published-print']?.['date-parts']?.[0]?.[0]||x['published-online']?.['date-parts']?.[0]?.[0]||'',venue:(x['container-title']||[])[0]||'',type:x.type||'',authors:(x.author||[]).map(a=>[a.given,a.family].filter(Boolean).join(' ')),raw:x}));
  state.externalSources.push('Crossref');
}
async function queryOpenAlexExternal(name,orcid){
  let url='https://api.openalex.org/works?per-page=50&';
  if(orcid)url+='filter=author.orcid:'+encodeURIComponent('https://orcid.org/'+orcid);
  else url+='search='+encodeURIComponent(name);
  const r=await fetch(url);if(!r.ok)throw new Error('OpenAlex '+r.status);const j=await r.json();
  (j.results||[]).forEach(x=>addExternalCandidate({source:'OpenAlex',title:x.display_name||x.title||'',doi:x.doi||'',year:x.publication_year||'',venue:x.primary_location?.source?.display_name||'',type:x.type||'',authors:(x.authorships||[]).map(a=>a.author?.display_name).filter(Boolean),raw:x}));
  state.externalSources.push('OpenAlex');
}
async function queryDataCiteExternal(name,orcid){
  const p=new URLSearchParams({'page[size]':'50'});
  if(orcid)p.set('query','creators.nameIdentifiers.nameIdentifier:'+orcid);
  else p.set('query',name);
  const r=await fetch('https://api.datacite.org/dois?'+p.toString());if(!r.ok)throw new Error('DataCite '+r.status);const j=await r.json();
  (j.data||[]).forEach(x=>{const a=x.attributes||{};addExternalCandidate({source:'DataCite',title:(a.titles||[])[0]?.title||'',doi:a.doi||x.id||'',year:a.publicationYear||'',venue:a.publisher||'',type:a.types?.resourceTypeGeneral||a.types?.resourceType||'',authors:(a.creators||[]).map(c=>c.name).filter(Boolean),raw:x})});
  state.externalSources.push('DataCite');
}
async function queryOrcidExternal(orcid){
  // Public endpoint may require CORS/credentials depending on deployment; best-effort only.
  const headers={'Accept':'application/json'};
  const r=await fetch(`https://pub.orcid.org/v3.0/${encodeURIComponent(orcid)}/works`,{headers});
  if(!r.ok)throw new Error('ORCID '+r.status);
  const j=await r.json();
  (j.group||[]).forEach(g=>{const s=(g['work-summary']||[])[0]||{};addExternalCandidate({source:'ORCID',title:s.title?.title?.value||'',doi:(s['external-ids']?.['external-id']||[]).find(e=>String(e['external-id-type']).toLowerCase()==='doi')?.['external-id-value']||'',year:s['publication-date']?.year?.value||'',venue:s['journal-title']?.value||'',type:s.type||'',authors:[],raw:s})});
  state.externalSources.push('ORCID');
}
async function scanExternal(){
  const name=clean($('#externalAuthorName').value)||state.cv?.name||'';
  const orcid=clean($('#externalOrcid').value)||state.settings.orcid||'';
  if(!name&&!orcid)return alert('Informe o nome ou ORCID para a prospecção.');
  state.externalCandidates=[];state.externalSources=[];
  const btn=$('#scanExternal');btn.disabled=true;btn.textContent='Prospectando…';
  const errors=[];
  if($('#useCrossref').checked&&name)try{await queryCrossrefExternal(name)}catch(e){errors.push(e.message)}
  if($('#useOpenAlex').checked)try{await queryOpenAlexExternal(name,orcid)}catch(e){errors.push(e.message)}
  if($('#useDataCite').checked)try{await queryDataCiteExternal(name,orcid)}catch(e){errors.push(e.message)}
  if($('#useOrcid').checked&&orcid)try{await queryOrcidExternal(orcid)}catch(e){errors.push(e.message)}
  buildIdentityProfile();state.externalCandidates.forEach(c=>{c.reconciliation=candidateSimilarity(c);c.identity=scoreIdentity(c)});
  renderExternal();
  btn.textContent='Prospectar produção';btn.disabled=!state.cv;
  if(errors.length)alert('Algumas fontes não responderam: '+errors.join(' | '));
}
function renderExternal(){
  const xs=state.externalCandidates;
  $('#xCandidates').textContent=xs.length;$('#xLikelyNew').textContent=xs.filter(x=>x.reconciliation?.status==='likely-new').length;$('#xMatched').textContent=xs.filter(x=>x.reconciliation?.status==='matched').length;$('#xSources').textContent=new Set(state.externalSources).size;$('#xHighIdentity').textContent=xs.filter(x=>(x.identity?.score||0)>=.72).length;
  $('#exportExternal').disabled=!xs.length;$('#externalMeta').textContent=xs.length?`${xs.length} candidato(s) · ${new Set(state.externalSources).size} fonte(s)`:'';$('#scanExternal').disabled=!state.cv;
  if(!xs.length){$('#externalList').innerHTML='<div class="empty">Nenhum candidato externo carregado.</div>';return}
  $('#externalList').innerHTML=xs.sort((a,b)=>(b.year||'').localeCompare(a.year||'')).map(x=>`<div class="source"><div><strong>${esc(x.title||'Sem título')}</strong><span class="small">${esc(x.year||'')} · ${esc(x.venue||'')} · ${esc((x.sources||[]).join(', '))}${x.doi?' · DOI '+esc(x.doi):''}</span><div style="margin-top:6px">${x.reconciliation?.status==='matched'?'<span class="badge ok">já correspondente</span>':x.reconciliation?.status==='uncertain'?'<span class="badge warn">correspondência incerta</span>':'<span class="badge bad">provável ausência</span>'} <span class="badge ${x.identity?.score>=.72?'ok':x.identity?.score>=.5?'warn':'neutral'}">${esc(x.identity?.label||'identidade não avaliada')} ${x.identity?.score?Math.round(x.identity.score*100)+'%':''}</span>${x.reconciliation?.record?.title?` <span class="small">mais próximo: ${esc(x.reconciliation.record.title)}</span>`:''}${x.identity?.signals?.length?`<div class="small" style="margin-top:5px">sinais: ${esc(x.identity.signals.join('; '))}</div>`:''}</div></div><div class="row">${x.reconciliation?.status==='likely-new'&&x.identity?.score>=.5?`<button class="btn primary" onclick="queueExternal('${x.id}')">Adicionar à fila</button>`:x.reconciliation?.status==='likely-new'?'<span class="badge neutral">identidade insuficiente</span>':''}</div></div>`).join('');
}
function queueExternal(id){
  const x=state.externalCandidates.find(c=>c.id===id);if(!x)return;if((x.identity?.score||0)<.5)return alert('A confiança de identidade é insuficiente para colocar este candidato na fila.');
  if(state.queue.some(q=>q.evidence?.externalCandidateId===id))return alert('Este candidato já está na fila.');
  state.assistedPackage=null;state.rebuiltXml=null;state.rebuildReport=null;state.diffReport=null;state.semanticDiff=[];state.stableIdentityReport=null;state.queue.push({id:crypto.randomUUID?crypto.randomUUID():'q'+Date.now(),operation:'REVISAR_PRODUCAO_EXTERNA',targetId:null,title:x.title,patch:{year:x.year,doi:x.doi,venue:x.venue,type:x.type,authors:x.authors},evidence:{source:(x.sources||[]).join(', '),externalCandidateId:id,retrievedAt:new Date().toISOString(),score:x.reconciliation?.score||0},approvedAt:new Date().toISOString(),status:'pending'});
  save();renderAll();
}
function exportExternal(){
  download('lattes-assist-candidatos-externos.json',JSON.stringify({schema:'lattes-assist.external.v1.6',generatedAt:new Date().toISOString(),cv:state.cv,sources:[...new Set(state.externalSources)],candidates:state.externalCandidates},null,2));
}


function decisionConfidence(parts){
  let s=0,w=0;
  for(const p of parts){if(typeof p.value==='number'){s+=p.value*p.weight;w+=p.weight}}
  return w?Math.max(0,Math.min(1,s/w)):0;
}
