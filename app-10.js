function exportDiff(){
  if(!state.diffReport)return;
  const rows=['# Diff XML — Lattes Assist v1.6','',`Gerado em: ${new Date().toLocaleString('pt-BR')}`,''];
  const max=Math.max(state.diffReport.left.length,state.diffReport.right.length);
  for(let i=0;i<max;i++){
    const l=state.diffReport.left[i],r=state.diffReport.right[i];
    if(l?.s==='del')rows.push(`- ${l.t}`);
    if(r?.s==='add')rows.push(`+ ${r.t}`);
  }
  download('lattes-assist-diff-xml.txt',rows.join('\n'),'text/plain');download('lattes-assist-diff-semantico.json',JSON.stringify({schema:'lattes-assist.semantic-diff.v1.6',generatedAt:new Date().toISOString(),stableIdentity:state.stableIdentityReport,changes:state.semanticDiff},null,2),'application/json');
}



function stableSignature(el){
  const tag=el.tagName||'';
  const preferred=[
    'DOI','ISBN','ISSN',
    'TITULO-DO-ARTIGO','TITULO','TITULO-DO-TRABALHO','TITULO-DA-DISSERTACAO-TESE',
    'NOME-DO-PROJETO','NOME-DO-PREMIO-OU-TITULO','NOME-CURSO','NOME-DO-EVENTO',
    'NOME-DO-ORIENTANDO','NOME-DO-ORIENTADO','NOME-DO-CANDIDATO',
    'NOME-DA-INSTITUICAO','NOME-INSTITUICAO',
    'ANO','ANO-DO-ARTIGO','ANO-DE-INICIO','ANO-INICIO','ANO-DE-CONCLUSAO'
  ];
  const parts=[tag];
  preferred.forEach(a=>{const v=el.getAttribute?.(a);if(v)parts.push(a+'='+normalizeTitle(v).slice(0,120))});
  if(parts.length===1){
    const attrs=[...el.attributes||[]].map(a=>[a.name,normalizeTitle(a.value)]).filter(([k,v])=>v).sort((a,b)=>a[0].localeCompare(b[0])).slice(0,5);
    attrs.forEach(([k,v])=>parts.push(k+'='+v.slice(0,80)));
  }
  return parts.join('|');
}
function hash32(s){
  let h=2166136261>>>0;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16).padStart(8,'0');
}
function elementIdentity(el,index){
  const sig=stableSignature(el);
  const substantive=sig.includes('=');
  return substantive?`${el.tagName}[sid=${hash32(sig)}]`:`${el.tagName}[idx=${index}]`;
}
function flattenXmlTree(xmlText){
  const doc=new DOMParser().parseFromString(xmlText,'application/xml');
  if(doc.querySelector('parsererror'))return {nodes:new Map(),attrs:new Map(),stableCount:0,fallbackCount:0,error:true};
  const nodes=new Map(),attrs=new Map();let stableCount=0,fallbackCount=0;
  function walk(el,path){
    const siblings=el.parentElement?[...el.parentElement.children].filter(x=>x.tagName===el.tagName):[el];
    const idx=Math.max(0,siblings.indexOf(el));
    const sig=stableSignature(el),substantive=sig.includes('=');
    substantive?stableCount++:fallbackCount++;
    const seg=elementIdentity(el,idx);
    const p=path?`${path}/${seg}`:`/${seg}`;
    nodes.set(p,{tag:el.tagName,text:clean([...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join(' ')),stable:substantive,signature:sig});
    [...el.attributes||[]].forEach(a=>attrs.set(`${p}/@${a.name}`,a.value));
    [...el.children].forEach(ch=>walk(ch,p));
  }
  walk(doc.documentElement,'');
  return {nodes,attrs,stableCount,fallbackCount,error:false};
}
function computeSemanticDiff(original,rebuilt){
  const A=flattenXmlTree(original),B=flattenXmlTree(rebuilt);
  state.stableIdentityReport={original:{stable:A.stableCount,fallback:A.fallbackCount},rebuilt:{stable:B.stableCount,fallback:B.fallbackCount}};
  if(A.error||B.error)return [];
  const out=[];
  const nodeKeys=new Set([...A.nodes.keys(),...B.nodes.keys()]);
  nodeKeys.forEach(k=>{
    const a=A.nodes.get(k),b=B.nodes.get(k);
    if(!a&&b)out.push({type:'NODE_ADDED',path:k,field:b.tag,before:'',after:b.text||''});
    else if(a&&!b)out.push({type:'NODE_REMOVED',path:k,field:a.tag,before:a.text||'',after:''});
    else if(a&&b&&a.text!==b.text)out.push({type:'TEXT_CHANGED',path:k,field:'#text',before:a.text,after:b.text});
  });
  const attrKeys=new Set([...A.attrs.keys(),...B.attrs.keys()]);
  attrKeys.forEach(k=>{
    const a=A.attrs.get(k),b=B.attrs.get(k);
    const path=k.replace(/\/@[^/]+$/,''),field=k.match(/@([^/]+)$/)?.[1]||'';
    if(a===undefined&&b!==undefined)out.push({type:'ATTRIBUTE_ADDED',path,field,before:'',after:b});
    else if(a!==undefined&&b===undefined)out.push({type:'ATTRIBUTE_REMOVED',path,field,before:a,after:''});
    else if(a!==b)out.push({type:'ATTRIBUTE_CHANGED',path,field,before:a||'',after:b||''});
  });
  return out;
}

function renderStableIdentity(){
  const r=state.stableIdentityReport;
  if(!r){$('#dfStableIds').textContent=0;$('#stableMeta').textContent='';$('#stableList').innerHTML='<div class="empty">Reconstrua o XML para calcular as identidades persistentes.</div>';return}
  $('#dfStableIds').textContent=r.rebuilt.stable||0;
  const total=(r.rebuilt.stable||0)+(r.rebuilt.fallback||0);
  const pct=total?Math.round((r.rebuilt.stable/total)*100):0;
  $('#stableMeta').textContent=`${r.rebuilt.stable} estáveis · ${r.rebuilt.fallback} por posição · ${pct}% com identidade substantiva`;
  $('#stableList').innerHTML=`<div class="source"><div><strong>XML original</strong><span class="small">${r.original.stable} nós com chave substantiva · ${r.original.fallback} por posição</span></div></div><div class="source"><div><strong>XML reconstruído</strong><span class="small">${r.rebuilt.stable} nós com chave substantiva · ${r.rebuilt.fallback} por posição</span></div></div>`;
}

function semanticBadge(t){
  if(t.includes('ADDED'))return '<span class="badge ok">adicionado</span>';
  if(t.includes('REMOVED'))return '<span class="badge bad">removido</span>';
  return '<span class="badge warn">alterado</span>';
}
function renderSemanticDiff(){
  if(!state.runtime.rawXml||!state.rebuiltXml){
    state.semanticDiff=[];state.stableIdentityReport=null;renderStableIdentity();$('#dfSemantic').textContent=0;$('#semanticMeta').textContent='';$('#semanticDiffBody').innerHTML='<tr><td colspan="5" class="empty">Reconstrua o XML para gerar o diff semântico.</td></tr>';return;
  }
  state.semanticDiff=computeSemanticDiff(state.runtime.rawXml,state.rebuiltXml);renderStableIdentity();
  $('#dfSemantic').textContent=state.semanticDiff.length;
  $('#semanticMeta').textContent=`${state.semanticDiff.length} mudança(s) estrutural(is) detectada(s)`;
  $('#semanticDiffBody').innerHTML=state.semanticDiff.length?state.semanticDiff.slice(0,1500).map(x=>`<tr><td>${semanticBadge(x.type)}</td><td class="mono">${esc(x.path)}</td><td class="mono">${esc(x.field)}</td><td>${esc(x.before||'—')}</td><td>${esc(x.after||'—')}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Nenhuma mudança semântica detectada.</td></tr>';
}

function renderAll(){
  const cv=state.cv; $('#researcherName').textContent=cv?.name||'Nenhum currículo importado';
  $('#cvMeta').textContent=cv?`XML: ${cv.sourceName}${cv.updated?' · atualização Lattes: '+cv.updated:''}${cv.lattesId?' · ID: '+cv.lattesId:''}`:'Importe o XML exportado do Lattes para iniciar a auditoria.';
  const missing=state.audit.filter(x=>x.type==='missing-doi').length,dup=state.audit.filter(x=>x.type.includes('duplicate')).length;
  $('#mRecords').textContent=state.records.length;$('#mArticles').textContent=state.articles.length;$('#mDocs').textContent=state.documents.length;$('#mDoi').textContent=missing;$('#mDup').textContent=dup;$('#mQueue').textContent=state.queue.length;$('#articleCount').textContent=state.articles.length?`${state.articles.length} registro(s)`:'';
  $('#articleBody').innerHTML=state.articles.length?[...state.articles].sort((a,b)=>(b.year||'').localeCompare(a.year||'')).map(a=>`<tr><td>${esc(a.year)}</td><td class="titlecell"><strong>${esc(a.title)}</strong><div class="small">${esc(a.authors.join('; '))}</div></td><td>${esc(a.journal)||'<span class="small">ausente</span>'}</td><td>${a.doi?`<span class="badge ok">${esc(a.doi)}</span>`:'<span class="badge warn">ausente</span>'}</td><td>${articleStatus(a)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Nenhum artigo encontrado no XML.</td></tr>';
  renderIntegralRecords();renderCoverage();renderAudit();renderUpdates();renderDocuments();renderRetrospective();renderTimeline();renderIdentity();renderExternal();renderDecisions();renderWorkflow();renderSchema();renderRebuild();renderDiff();renderSemanticDiff();renderStableIdentity();renderQueue();
  $('#crossrefAll').disabled=!state.articles.some(a=>!a.doi);$('#exportAudit').disabled=!state.audit.length&&!state.documents.length;$('#exportQueue').disabled=!state.queue.length;$('#clearQueue').disabled=!state.queue.length;
}
function articleStatus(a){const f=state.audit.filter(x=>x.article?.id===a.id);return !f.length?'<span class="badge ok">consistente</span>':f.some(x=>x.severity==='bad')?'<span class="badge bad">revisar</span>':'<span class="badge warn">incompleto</span>'}
