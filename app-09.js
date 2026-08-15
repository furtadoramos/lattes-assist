function applyKnownOperation(doc,q){
  const op=q.operation,p=q.patch||{},result={queueId:q.id,operation:op,title:q.title||'',applied:false,changes:[],reason:''};
  if(op==='ATUALIZAR_ARTIGO' && q.targetId){
    const idx=Number(String(q.targetId).replace('art-',''));
    const nodes=[...doc.querySelectorAll('ARTIGO-PUBLICADO')];
    const node=nodes[idx];
    if(!node){result.reason='Artigo-alvo não localizado pela posição original.';return result}
    const basic=node.querySelector('DADOS-BASICOS-DO-ARTIGO')||node;
    if(p.doi){basic.setAttribute('DOI',p.doi);result.changes.push(`DOI=${p.doi}`)}
    if(p.year){basic.setAttribute('ANO-DO-ARTIGO',p.year);result.changes.push(`ANO-DO-ARTIGO=${p.year}`)}
    if(q.title){basic.setAttribute('TITULO-DO-ARTIGO',q.title);result.changes.push('TITULO-DO-ARTIGO atualizado')}
    result.applied=result.changes.length>0;
    if(!result.applied)result.reason='Nenhum campo aplicável encontrado.';
    return result;
  }

  const root=doc.querySelector('CURRICULO-VITAE')||doc.documentElement;
  if(op==='CRIAR_BANCA'){
    const dc=ensureChild(doc,root,'DADOS-COMPLEMENTARES');
    const cont=ensureChild(doc,dc,'PARTICIPACAO-EM-BANCA-TRABALHOS-CONCLUSAO');
    const item=doc.createElement('OUTRAS-PARTICIPACOES-EM-BANCA');
    const basic=doc.createElement('DADOS-BASICOS-DE-OUTRAS-PARTICIPACOES-EM-BANCA');
    setAttrSafe(basic,'TITULO',q.title);setAttrSafe(basic,'ANO',p.year||p.fields?.years?.[0]);
    item.appendChild(basic);cont.appendChild(item);
    result.applied=true;result.changes.push('Nova OUTRAS-PARTICIPACOES-EM-BANCA adicionada');return result;
  }
  if(op==='CRIAR_PARTICIPACAO_EVENTO'){
    const dc=ensureChild(doc,root,'DADOS-COMPLEMENTARES');
    const cont=ensureChild(doc,dc,'PARTICIPACAO-EM-EVENTOS-CONGRESSOS');
    const item=doc.createElement('OUTRAS-PARTICIPACOES-EM-EVENTOS-CONGRESSOS');
    const basic=doc.createElement('DADOS-BASICOS-DE-OUTRAS-PARTICIPACOES-EM-EVENTOS-CONGRESSOS');
    setAttrSafe(basic,'TITULO',q.title);setAttrSafe(basic,'ANO',p.year||p.fields?.years?.[0]);
    item.appendChild(basic);cont.appendChild(item);
    result.applied=true;result.changes.push('Nova OUTRAS-PARTICIPACOES-EM-EVENTOS-CONGRESSOS adicionada');return result;
  }
  if(op==='CRIAR_PROJETO'){
    let ap=doc.querySelector('ATUACAO-PROFISSIONAL');
    if(!ap){ap=doc.createElement('ATUACAO-PROFISSIONAL');root.appendChild(ap)}
    const ativ=ensureChild(doc,ap,'ATIVIDADES-DE-PARTICIPACAO-EM-PROJETO');
    const part=doc.createElement('PARTICIPACAO-EM-PROJETO');
    const proj=doc.createElement('PROJETO-DE-PESQUISA');
    setAttrSafe(proj,'NOME-DO-PROJETO',q.title);setAttrSafe(proj,'ANO-INICIO',p.year||p.fields?.years?.[0]);
    part.appendChild(proj);ativ.appendChild(part);
    result.applied=true;result.changes.push('Novo PROJETO-DE-PESQUISA adicionado');return result;
  }
  if(op==='CRIAR_OU_ATUALIZAR_ORIENTACAO'){
    const outra=ensureChild(doc,root,'OUTRA-PRODUCAO');
    const cont=ensureChild(doc,outra,'ORIENTACOES-CONCLUIDAS');
    const item=doc.createElement('OUTRAS-ORIENTACOES-CONCLUIDAS');
    const basic=doc.createElement('DADOS-BASICOS-DE-OUTRAS-ORIENTACOES-CONCLUIDAS');
    setAttrSafe(basic,'TITULO',q.title);setAttrSafe(basic,'ANO',p.year||p.fields?.years?.[0]);
    item.appendChild(basic);cont.appendChild(item);
    result.applied=true;result.changes.push('Nova OUTRAS-ORIENTACOES-CONCLUIDAS adicionada');return result;
  }
  if(op==='CRIAR_FORMACAO_COMPLEMENTAR'){
    const dg=doc.querySelector('DADOS-GERAIS')||ensureChild(doc,root,'DADOS-GERAIS');
    const cont=ensureChild(doc,dg,'FORMACAO-COMPLEMENTAR');
    const item=doc.createElement('FORMACAO-COMPLEMENTAR-CURSO-DE-CURTA-DURACAO');
    setAttrSafe(item,'NOME-CURSO',q.title);setAttrSafe(item,'ANO-DE-INICIO',p.year||p.fields?.years?.[0]);
    cont.appendChild(item);
    result.applied=true;result.changes.push('Nova FORMACAO-COMPLEMENTAR-CURSO-DE-CURTA-DURACAO adicionada');return result;
  }
  if(op==='CRIAR_PREMIO'){
    const dg=doc.querySelector('DADOS-GERAIS')||ensureChild(doc,root,'DADOS-GERAIS');
    const cont=ensureChild(doc,dg,'PREMIOS-TITULOS');
    const item=doc.createElement('PREMIO-TITULO');
    setAttrSafe(item,'NOME-DO-PREMIO-OU-TITULO',q.title);setAttrSafe(item,'ANO-DA-PREMIACAO',p.year||p.fields?.years?.[0]);
    cont.appendChild(item);
    result.applied=true;result.changes.push('Novo PREMIO-TITULO adicionado');return result;
  }
  if(op==='CRIAR_ATIVIDADE_TECNICA'){
    const pt=ensureChild(doc,root,'PRODUCAO-TECNICA');
    const item=doc.createElement('OUTRA-PRODUCAO-TECNICA');
    const basic=doc.createElement('DADOS-BASICOS-DE-OUTRA-PRODUCAO-TECNICA');
    setAttrSafe(basic,'TITULO',q.title);setAttrSafe(basic,'ANO',p.year||p.fields?.years?.[0]);
    item.appendChild(basic);pt.appendChild(item);
    result.applied=true;result.changes.push('Nova OUTRA-PRODUCAO-TECNICA adicionada');return result;
  }

  result.reason='Operação não aplicada automaticamente por ausência de mapeamento XML conservador.';
  return result;
}
function serializeXml(doc){
  const s=new XMLSerializer().serializeToString(doc);
  return `<?xml version="1.0" encoding="UTF-8"?>\n`+s.replace(/^<\?xml[^>]*>\s*/,'');
}
function buildRebuiltXml(){
  if(!state.runtime.rawXml)return alert('Importe novamente o XML original do Currículo Lattes nesta sessão.');
  const base=new DOMParser().parseFromString(state.runtime.rawXml,'application/xml');
  if(base.querySelector('parsererror'))return alert('O XML original não pôde ser reinterpretado.');
  const reports=[];
  state.queue.forEach(q=>reports.push(applyKnownOperation(base,q)));
  state.rebuiltXml=serializeXml(base);
  state.rebuildReport={generatedAt:new Date().toISOString(),applied:reports.filter(x=>x.applied),skipped:reports.filter(x=>!x.applied)};
  renderRebuild();renderDiff();
}
function renderRebuild(){
  const r=state.rebuildReport;
  $('#buildRebuiltXml').disabled=!state.queue.length||!state.runtime.rawXml;
  $('#exportRebuiltXml').disabled=!state.rebuiltXml;
  $('#sApplied').textContent=r?.applied?.length||0;$('#sSkipped').textContent=r?.skipped?.length||0;
  if(!r){$('#rebuildMeta').textContent='Nenhuma reconstrução executada.';$('#rebuildList').innerHTML='<div class="empty">Aprove operações e clique em “Reconstruir XML”.</div>';return}
  $('#rebuildMeta').textContent=`${r.applied.length} aplicada(s) · ${r.skipped.length} não aplicada(s)`;
  const all=[...r.applied.map(x=>({...x,status:'applied'})),...r.skipped.map(x=>({...x,status:'skipped'}))];
  $('#rebuildList').innerHTML=all.map(x=>`<div class="source"><div><strong>${esc(x.title||x.operation)}</strong><span class="small">${esc(x.operation)} · ${x.status==='applied'?esc(x.changes.join('; ')):esc(x.reason)}</span></div><span class="badge ${x.status==='applied'?'ok':'warn'}">${x.status==='applied'?'aplicada':'não aplicada'}</span></div>`).join('');
}
function exportRebuiltXml(){
  if(!state.rebuiltXml)return;
  download('lattes-assist-curriculo-reconstruido.xml',state.rebuiltXml,'application/xml');
  download('lattes-assist-relatorio-reconstrucao.json',JSON.stringify({schema:'lattes-assist.rebuild.v1.6',cv:state.cv,report:state.rebuildReport},null,2));
}


function normalizeXmlLines(xml){
  return clean(xml).replace(/></g,'>\n<').split('\n').map(x=>x.trim()).filter(Boolean);
}
function computeSimpleDiff(a,b){
  const A=normalizeXmlLines(a),B=normalizeXmlLines(b);
  const max=Math.max(A.length,B.length),left=[],right=[];
  let added=0,removed=0,changed=0;
  for(let i=0;i<max;i++){
    const x=A[i]||'',y=B[i]||'';
    if(x===y){left.push({t:x,s:'same'});right.push({t:y,s:'same'});}
    else{
      if(x){left.push({t:x,s:'del'});removed++} else left.push({t:'',s:'same'});
      if(y){right.push({t:y,s:'add'});added++} else right.push({t:'',s:'same'});
      changed++;
    }
  }
  return {left,right,added,removed,changed};
}
function renderDiff(){
  $('#refreshDiff').disabled=!state.runtime.rawXml||!state.rebuiltXml;
  $('#exportDiff').disabled=!state.diffReport;
  if(!state.runtime.rawXml||!state.rebuiltXml){
    $('#dfAdded').textContent=0;$('#dfRemoved').textContent=0;$('#dfChanged').textContent=0;renderSemanticDiff();
    $('#diffOriginal').textContent='Reconstrua o XML para gerar a comparação.';$('#diffRebuilt').textContent='Reconstrua o XML para gerar a comparação.';return;
  }
  state.diffReport=computeSimpleDiff(state.runtime.rawXml,state.rebuiltXml);renderSemanticDiff();
  const d=state.diffReport;$('#dfAdded').textContent=d.added;$('#dfRemoved').textContent=d.removed;$('#dfChanged').textContent=d.changed;$('#exportDiff').disabled=false;
  $('#diffOriginal').innerHTML=d.left.map(x=>`<div class="diffline ${x.s}">${esc(x.t)}</div>`).join('');
  $('#diffRebuilt').innerHTML=d.right.map(x=>`<div class="diffline ${x.s}">${esc(x.t)}</div>`).join('');
}
