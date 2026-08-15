function buildDecisions(){
  const out=[];

  // 1) Document-based cases
  state.documents.forEach(d=>{
    const r=d.reconciliation||{},cls=d.classification?.type||'';
    if(r.status==='matched'){
      out.push({
        id:`dec-doc-${d.id}`,sourceType:'document',documentId:d.id,title:d.fields?.title||d.name,
        category:d.classification?.label||'Documento',recommendation:'LINK',
        confidence:decisionConfidence([{value:Math.max(.7,r.score||.8),weight:1},{value:d.reviewed?1:(d.classification?.confidence||.5),weight:.5}]),
        rationale:['evidência documental corresponde a registro existente','ação proposta evita duplicação curricular'],
        lattesRecordId:r.recordId||null,evidence:[d.name],external:[]
      });
    } else if(r.status==='candidate-missing'){
      const reviewedBoost=d.reviewed?1:(d.classification?.confidence||.4);
      out.push({
        id:`dec-doc-${d.id}`,sourceType:'document',documentId:d.id,title:d.fields?.title||d.name,
        category:d.classification?.label||'Documento',recommendation:reviewedBoost>=.75?'CREATE':'MANUAL_REVIEW',
        confidence:decisionConfidence([{value:reviewedBoost,weight:.55},{value:1-(r.score||0),weight:.45}]),
        rationale:['evidência documental suficientemente informativa','nenhuma correspondência segura localizada no XML',reviewedBoost>=.75?'classificação/documento revisado':'classificação ainda requer validação'],
        lattesRecordId:null,evidence:[d.name],external:[]
      });
    } else {
      out.push({
        id:`dec-doc-${d.id}`,sourceType:'document',documentId:d.id,title:d.fields?.title||d.name,
        category:d.classification?.label||'Documento',recommendation:'MANUAL_REVIEW',
        confidence:.4,rationale:['correspondência documental insuficiente ou incerta'],lattesRecordId:r.recordId||null,evidence:[d.name],external:[]
      });
    }
  });

  // 2) External candidates
  state.externalCandidates.forEach(x=>{
    const idScore=x.identity?.score||0, rec=x.reconciliation||{};
    let recommendation='MANUAL_REVIEW',confidence=.35,rationale=[];
    if(rec.status==='matched'){
      recommendation='NO_ACTION';confidence=decisionConfidence([{value:rec.score||.8,weight:.6},{value:idScore,weight:.4}]);
      rationale=['metadado externo já corresponde a registro do XML','não criar duplicata'];
    } else if(rec.status==='likely-new' && idScore>=.72){
      recommendation='CREATE';confidence=decisionConfidence([{value:idScore,weight:.6},{value:1-(rec.score||0),weight:.4}]);
      rationale=['identidade autoral em alta confiança','produção externa sem correspondência segura no XML'];
    } else if(rec.status==='uncertain' && idScore>=.72){
      recommendation='UPDATE';confidence=decisionConfidence([{value:idScore,weight:.45},{value:rec.score||.5,weight:.55}]);
      rationale=['identidade autoral forte','há registro semelhante que pode estar incompleto ou divergente'];
    } else {
      rationale=['identidade e/ou correspondência insuficientes para decisão automática'];
    }
    out.push({
      id:`dec-ext-${x.id}`,sourceType:'external',externalId:x.id,title:x.title||'Produção externa',
      category:'Produção bibliográfica',recommendation,confidence,rationale,
      lattesRecordId:rec.record?.id||null,evidence:[],external:x.sources||[],identity:x.identity
    });
  });

  // 3) Missing DOI updates suggested by Crossref
  state.updates.filter(u=>u.status==='found').forEach(u=>{
    const a=state.articles.find(x=>x.id===u.articleId);if(!a)return;
    out.push({
      id:`dec-upd-${u.articleId}`,sourceType:'metadata',title:a.title,category:'Produção bibliográfica',
      recommendation:'UPDATE',confidence:Math.min(1,u.score||0),rationale:['artigo existente sem DOI','Crossref encontrou correspondência bibliográfica segura'],
      lattesRecordId:u.articleId,evidence:[],external:['Crossref'],patch:{doi:u.doi}
    });
  });

  // 4) Duplicates from audit
  state.audit.filter(f=>String(f.type||'').includes('duplicate')).forEach((f,i)=>{
    const x=f.article||f.record||{};
    out.push({
      id:`dec-dup-${i}`,sourceType:'audit',title:x.title||x.subtypeLabel||'Registro',category:x.categoryLabel||'Currículo',
      recommendation:'MERGE_REVIEW',confidence:.85,rationale:[f.message||'possível duplicidade detectada','nenhuma exclusão deve ocorrer sem revisão'],
      lattesRecordId:x.id||null,evidence:[],external:[]
    });
  });

  // dedupe equivalent decisions by title/recommendation
  const seen=new Set();
  state.decisions=out.filter(d=>{
    const k=[d.recommendation,normalizeTitle(d.title),d.lattesRecordId||''].join('|');
    if(seen.has(k))return false;seen.add(k);return true;
  });
  return state.decisions;
}
function decisionLabel(rec){
  return {
    CREATE:['ok','criar'],
    UPDATE:['warn','atualizar'],
    LINK:['ok','vincular evidência'],
    MERGE_REVIEW:['bad','revisar duplicidade'],
    NO_ACTION:['neutral','não agir'],
    MANUAL_REVIEW:['warn','revisão manual']
  }[rec]||['neutral',rec];
}
function renderDecisions(){
  buildDecisions();
  const f=state.runtime.decisionFilter||'';
  const rows=state.decisions.filter(d=>!f||d.recommendation===f);
  const count=r=>state.decisions.filter(d=>d.recommendation===r).length;
  $('#dCreate').textContent=count('CREATE');$('#dUpdate').textContent=count('UPDATE');$('#dLink').textContent=count('LINK');$('#dMerge').textContent=count('MERGE_REVIEW');$('#dNoAction').textContent=count('NO_ACTION');$('#dManual').textContent=count('MANUAL_REVIEW');
  $('#decisionCount').textContent=state.decisions.length?`${rows.length} de ${state.decisions.length} caso(s)`:'';
  $('#exportDecisions').disabled=!state.decisions.length;
  if(!rows.length){$('#decisionList').innerHTML='<div class="empty">Nenhum caso nesta recomendação.</div>';return}
  $('#decisionList').innerHTML=rows.sort((a,b)=>b.confidence-a.confidence).map(d=>{
    const [cls,label]=decisionLabel(d.recommendation);
    return `<div class="doc-card"><div class="doc-head"><div class="doc-title"><strong>${esc(d.title)}</strong><div class="doc-meta"><span class="badge ${cls}">${label}</span><span class="badge neutral">${Math.round((d.confidence||0)*100)}% confiança</span><span class="badge neutral">${esc(d.category||'')}</span></div></div><div class="doc-actions">${d.recommendation!=='NO_ACTION'&&d.recommendation!=='MANUAL_REVIEW'?`<button class="btn primary" onclick="approveDecision('${d.id}')">Aprovar</button>`:''}<button class="btn" onclick="inspectDecision('${d.id}')">Examinar</button></div></div><div class="small" style="margin-top:8px">${esc((d.rationale||[]).join(' · '))}</div></div>`;
  }).join('');
}
function inspectDecision(id){
  const d=state.decisions.find(x=>x.id===id);if(!d)return;
  $('#dialogTitle').textContent='Decisão curricular';
  const [cls,label]=decisionLabel(d.recommendation);
  $('#dialogBody').innerHTML=`<p><span class="badge ${cls}">${label}</span> <span class="badge neutral">${Math.round((d.confidence||0)*100)}% confiança</span></p><p><strong>${esc(d.title)}</strong></p><p class="small">${esc(d.category||'')}</p><h4>Justificativa</h4><ul>${(d.rationale||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><h4>Fontes</h4><p class="small">Documentos: ${esc((d.evidence||[]).join(', ')||'—')}<br>Externas: ${esc((d.external||[]).join(', ')||'—')}</p>`;
  $('#detailDialog').showModal();
}
function approveDecision(id){
  const d=state.decisions.find(x=>x.id===id);if(!d)return;
  if(state.queue.some(q=>q.evidence?.decisionId===id))return alert('Esta decisão já foi enviada à fila.');
  const op={
    CREATE:'CRIAR_REGISTRO_REVISADO',
    UPDATE:'ATUALIZAR_REGISTRO_REVISADO',
    LINK:'VINCULAR_EVIDENCIA_A_REGISTRO',
    MERGE_REVIEW:'REVISAR_POSSIVEL_DUPLICIDADE'
  }[d.recommendation];
  if(!op)return alert('Esta recomendação exige revisão manual ou nenhuma ação.');
  state.assistedPackage=null;state.rebuiltXml=null;state.rebuildReport=null;state.diffReport=null;state.semanticDiff=[];state.stableIdentityReport=null;state.queue.push({
    id:crypto.randomUUID?crypto.randomUUID():'q'+Date.now(),operation:op,targetId:d.lattesRecordId||null,title:d.title,
    patch:d.patch||{},evidence:{source:'Central de Decisão v1.6',decisionId:id,documents:d.evidence||[],external:d.external||[],confidence:d.confidence,rationale:d.rationale,retrievedAt:new Date().toISOString()},
    approvedAt:new Date().toISOString(),status:'pending'
  });
  save();renderAll();
}
function exportDecisions(){
  buildDecisions();
  download('lattes-assist-decisoes.json',JSON.stringify({schema:'lattes-assist.decisions.v1.6',generatedAt:new Date().toISOString(),cv:state.cv,decisions:state.decisions},null,2));
}


