function renderTimeline(){
  const cats=[...new Set(state.retrospective.map(x=>x.category).filter(Boolean))].sort();
  const sel=$('#timelineCategory'),cur=state.runtime.timelineCategory||'';
  sel.innerHTML='<option value="">Todas as categorias</option>'+cats.map(c=>`<option ${c===cur?'selected':''} value="${esc(c)}">${esc(c)}</option>`).join('');
  const s=buildTimeline();
  $('#tYears').textContent=s.length;
  const peak=s.reduce((a,b)=>(b.records+b.probMissing)>(a.records+a.probMissing)?b:a,{year:'—',records:0,probMissing:0});
  $('#tPeakYear').textContent=peak.year||'—';
  $('#tEvidenceGap').textContent=s.reduce((n,r)=>n+r.noEvidence,0);
  $('#tRecovered').textContent=s.reduce((n,r)=>n+r.probMissing,0);
  $('#timelineCount').textContent=s.length?`${s.length} ano(s)`:'';
  $('#exportTimeline').disabled=!s.length;
  $('#timelineBody').innerHTML=s.length?s.map(r=>`<tr><td>${r.year}</td><td>${r.records}</td><td>${r.confirmed}</td><td>${r.noEvidence}</td><td>${r.probMissing}</td><td>${r.uncertain}</td></tr>`).join(''):'<tr><td colspan="6" class="empty">Nenhum dado temporal disponível.</td></tr>';
  drawLineChart($('#timelineChart'),s,['records','confirmed','probMissing'],['registros','comprovados','prov. ausentes']);
  drawLineChart($('#gapChart'),s,['noEvidence','uncertain','duplicates'],['sem evidência','incertos','duplicidades']);
  const totalRegs=s.reduce((n,r)=>n+r.records,0), totalNo=s.reduce((n,r)=>n+r.noEvidence,0), totalProb=s.reduce((n,r)=>n+r.probMissing,0);
  const gapPct=totalRegs?Math.round(totalNo/totalRegs*100):0;
  const worst=[...s].sort((a,b)=>b.noEvidence-a.noEvidence)[0];
  const recovered=[...s].sort((a,b)=>b.probMissing-a.probMissing)[0];
  const insights=[];
  if(totalRegs)insights.push(`Há ${totalRegs} registro(s) curriculares com ano identificável nesta seleção; ${totalNo} estão sem evidência documental vinculada (${gapPct}%).`);
  if(worst?.noEvidence)insights.push(`O maior volume de registros ainda sem evidência vinculada ocorre em ${worst.year}, com ${worst.noEvidence} item(ns).`);
  if(recovered?.probMissing)insights.push(`O ano com maior número de evidências classificadas como provavelmente ausentes do XML é ${recovered.year}, com ${recovered.probMissing} item(ns).`);
  if(peak?.year&&peak.year!=='—')insights.push(`A maior concentração combinada de registros curriculares e evidências provavelmente ausentes ocorre em ${peak.year}. Isso descreve concentração documental, não produtividade ou mérito acadêmico.`);
  if(!insights.length)insights.push('Ainda não há dados suficientes para produzir uma leitura temporal.');
  $('#timelineInsights').innerHTML=insights.map(x=>`<div class="insight">${esc(x)}</div>`).join('');
  $('#timelineMeta').textContent=cur?`categoria: ${cur}`:'todas as categorias';
}
function exportTimeline(){
  const series=buildTimeline();
  download('lattes-assist-serie-temporal.json',JSON.stringify({
    schema:'lattes-assist.timeline.v1.6',
    generatedAt:new Date().toISOString(),
    cv:state.cv,
    category:state.runtime.timelineCategory||null,
    series
  },null,2));
}



function canonicalPersonName(s){
  return normalizeTitle(s).replace(/\b(de|da|do|das|dos|e)\b/g,' ').replace(/\s+/g,' ').trim();
}
function buildIdentityProfile(){
  if(!state.cv){state.identityProfile=null;return null}
  const aliases=new Map(),coauthors=new Map(),institutions=new Map(),years=[];
  const add=(m,k,w=1)=>{k=clean(k);if(!k)return;m.set(k,(m.get(k)||0)+w)};
  add(aliases,state.cv.name,5);

  // Names appearing in authorship positions on bibliographic production
  state.articles.forEach(a=>{
    (a.authors||[]).forEach(n=>{
      const can=canonicalPersonName(n), self=canonicalPersonName(state.cv.name);
      if(!can)return;
      if(can===self || can.split(' ').slice(-1)[0]===self.split(' ').slice(-1)[0] && jaccard(can,self)>.55) add(aliases,n,2);
      else add(coauthors,n,1);
    });
    if(a.year)years.push(Number(a.year));
  });

  state.records.forEach(r=>{
    if(r.year && /^(19|20)\d{2}$/.test(String(r.year)))years.push(Number(r.year));
    if(r.institution)add(institutions,r.institution,1);
    if(r.person && canonicalPersonName(r.person)!==canonicalPersonName(state.cv.name)){
      if(r.category==='PRODUCAO_BIBLIOGRAFICA')add(coauthors,r.person,1);
    }
  });
  state.relations.forEach(rel=>{
    if(rel.institution)add(institutions,rel.institution,1);
    if(rel.kind==='PROJETO_INTEGRANTE' || rel.kind==='BANCA_PARTICIPANTE' || rel.kind==='EVENTO_PARTICIPANTE'){
      if(rel.name && canonicalPersonName(rel.name)!==canonicalPersonName(state.cv.name))add(coauthors,rel.name,.5);
    }
  });

  const aliasesArr=[...aliases.entries()].sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count}));
  const coArr=[...coauthors.entries()].sort((a,b)=>b[1]-a[1]).slice(0,80).map(([name,count])=>({name,count}));
  const instArr=[...institutions.entries()].sort((a,b)=>b[1]-a[1]).slice(0,50).map(([name,count])=>({name,count}));
  const minYear=years.length?Math.min(...years):null,maxYear=years.length?Math.max(...years):null;
  state.identityProfile={aliases:aliasesArr,coauthors:coArr,institutions:instArr,minYear,maxYear,orcid:state.settings.orcid||'',builtAt:new Date().toISOString()};
  return state.identityProfile;
}
function scoreIdentity(c){
  const p=state.identityProfile||buildIdentityProfile();
  if(!p)return {score:0,label:'sem perfil',signals:[]};
  let score=0,signals=[];
  const selfNames=p.aliases.map(x=>canonicalPersonName(x.name)).filter(Boolean);
  const candAuthors=(c.authors||[]).map(canonicalPersonName).filter(Boolean);

  // Exact DOI/title match in XML is the strongest signal.
  const recon=candidateSimilarity(c);
  if(recon.status==='matched'){score+=.55;signals.push('correspondência bibliográfica no XML')}

  // Name signal from author list
  let nameHit=0;
  for(const a of candAuthors)for(const n of selfNames)nameHit=Math.max(nameHit,jaccard(a,n));
  if(nameHit>=.9){score+=.22;signals.push('nome autoral fortemente compatível')}
  else if(nameHit>=.65){score+=.12;signals.push('nome autoral compatível')}

  // ORCID in raw payload, when available
  const rawText=JSON.stringify(c.raw||{}).toLowerCase();
  if(p.orcid && rawText.includes(p.orcid.toLowerCase())){score+=.3;signals.push('ORCID coincidente')}

  // Coauthor recurrence
  const knownCo=p.coauthors.map(x=>canonicalPersonName(x.name));
  let coHits=0;
  for(const a of candAuthors){
    if(selfNames.some(n=>jaccard(a,n)>=.8))continue;
    if(knownCo.some(k=>jaccard(a,k)>=.86))coHits++;
  }
  if(coHits>=2){score+=.16;signals.push(`${coHits} coautores recorrentes`)}
  else if(coHits===1){score+=.08;signals.push('1 coautor recorrente')}

  // Institution evidence from venue/raw
  const instText=(clean(c.venue)+' '+rawText);
  const instHit=p.institutions.some(x=>normalizeTitle(instText).includes(normalizeTitle(x.name)));
  if(instHit){score+=.08;signals.push('instituição compatível')}

  // Temporal coherence: allow margin around observed career years
  const y=Number(c.year||0);
  if(y&&p.minYear&&p.maxYear){
    if(y<p.minYear-8 || y>p.maxYear+3){score-=.15;signals.push('ano pouco coerente com a janela observada')}
    else if(y>=p.minYear-2 && y<=p.maxYear+2){score+=.04;signals.push('ano coerente com a trajetória')}
  }

  score=Math.max(0,Math.min(1,score));
  const label=score>=.72?'alta confiança':score>=.5?'confiança moderada':score>=.3?'baixa confiança':'muito baixa confiança';
  return {score,label,signals};
}
function renderIdentity(){
  const p=buildIdentityProfile();
  if(!p){$('#exportIdentity').disabled=true;return}
  $('#exportIdentity').disabled=false;
  $('#iAliases').textContent=p.aliases.length;$('#iCoauthors').textContent=p.coauthors.length;$('#iInstitutions').textContent=p.institutions.length;$('#iRange').textContent=p.minYear&&p.maxYear?`${p.minYear}–${p.maxYear}`:'—';
  $('#identityAliases').innerHTML=p.aliases.length?p.aliases.slice(0,20).map(x=>`<div class="source"><div><strong>${esc(x.name)}</strong><span class="small">peso ${x.count}</span></div></div>`).join(''):'<div class="empty">Nenhuma variante detectada.</div>';
  $('#identityCoauthors').innerHTML=p.coauthors.length?p.coauthors.slice(0,20).map(x=>`<div class="source"><div><strong>${esc(x.name)}</strong><span class="small">recorrência ${x.count}</span></div></div>`).join(''):'<div class="empty">Nenhuma coautoria recorrente detectada.</div>';
  $('#identityInstitutions').innerHTML=p.institutions.length?p.institutions.slice(0,20).map(x=>`<div class="source"><div><strong>${esc(x.name)}</strong><span class="small">recorrência ${x.count}</span></div></div>`).join(''):'<div class="empty">Nenhuma instituição recorrente detectada.</div>';
}
function exportIdentity(){
  const p=buildIdentityProfile();if(!p)return;
  download('lattes-assist-identidade.json',JSON.stringify({schema:'lattes-assist.identity.v1.6',cv:state.cv,profile:p},null,2));
}

function normalizeDoi(x){return clean(x).toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//,'')}
