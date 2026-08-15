function sectionForOperation(op,title=''){
  const s=(op+' '+title).toLowerCase();
  if(s.includes('artigo')||s.includes('producao')||s.includes('produção'))return 'Produções > Produção bibliográfica';
  if(s.includes('banca'))return 'Bancas';
  if(s.includes('orienta'))return 'Orientações';
  if(s.includes('evento'))return 'Eventos';
  if(s.includes('projeto'))return 'Projetos';
  if(s.includes('formacao')||s.includes('formação'))return 'Formação complementar';
  if(s.includes('premio')||s.includes('prêmio'))return 'Prêmios e títulos';
  if(s.includes('institucional')||s.includes('gestao')||s.includes('gestão'))return 'Atuação profissional';
  if(s.includes('tecnica')||s.includes('técnica'))return 'Produção técnica';
  return 'Revisar categoria no Lattes';
}
function workflowFields(q){
  const p=q.patch||{}, fields=[];
  const add=(label,val)=>{if(val!==undefined&&val!==null&&String(val).trim()!=='')fields.push({label,value:val})};
  add('Título',q.title);add('Ano',p.year);add('DOI',p.doi);add('Periódico/Editora',p.venue);add('Tipo',p.type);
  if(Array.isArray(p.authors)&&p.authors.length)add('Autores',p.authors.join('; '));
  if(p.classification)add('Classificação',p.classification);
  if(p.fields){
    Object.entries(p.fields).forEach(([k,v])=>{if(Array.isArray(v)&&v.length)add(k,v.join('; '));else add(k,v)})
  }
  return fields.slice(0,20);
}
function buildAssistedPackage(){
  const items=state.queue.map((q,i)=>{
    const needsReview=q.operation.includes('REVISAR_') || !q.title;
    return {
      order:i+1,queueId:q.id,operation:q.operation,title:q.title||'',section:sectionForOperation(q.operation,q.title),
      status:needsReview?'review':'ready',fields:workflowFields(q),targetId:q.targetId||null,
      evidence:q.evidence||{},instructions:[
        `Abrir a seção "${sectionForOperation(q.operation,q.title)}" no Currículo Lattes.`,
        q.targetId?'Localizar o registro correspondente antes de alterar qualquer campo.':'Criar novo registro apenas após confirmar que não existe duplicata.',
        'Conferir os campos abaixo contra as evidências registradas.',
        'Salvar no Lattes somente depois da conferência final.'
      ]
    };
  });
  state.assistedPackage={
    schema:'lattes-assist.assisted.v1.6',
    generatedAt:new Date().toISOString(),
    cv:state.cv,
    adapter:'ASSISTED_PREFILL',
    items
  };
  return state.assistedPackage;
}
function renderWorkflow(){
  const p=state.assistedPackage;
  $('#wPending').textContent=state.queue.length;$('#exportAuditXml').disabled=!state.queue.length;$('#exportPatchXml').disabled=!state.queue.length;
  $('#buildAssisted').disabled=!state.queue.length;
  if(!p){renderGuidedFill();$('#wReady').textContent=0;$('#wNeedsReview').textContent=0;$('#wSteps').textContent=0;$('#exportAssisted').disabled=true;$('#workflowMeta').textContent='';$('#workflowList').innerHTML=state.queue.length?'<div class="empty">Há operações na fila. Gere o pacote assistido para ordenar os passos.</div>':'<div class="empty">A fila ainda não possui operações aprovadas.</div>';return}
  const ready=p.items.filter(x=>x.status==='ready').length, review=p.items.filter(x=>x.status==='review').length;
  $('#wReady').textContent=ready;$('#wNeedsReview').textContent=review;$('#wSteps').textContent=p.items.length;$('#exportAssisted').disabled=!p.items.length;$('#workflowMeta').textContent=`${p.items.length} passo(s) · adaptador ${p.adapter}`;
  renderGuidedFill();$('#workflowList').innerHTML=p.items.map(x=>`<div class="doc-card"><div class="doc-head"><div class="doc-title"><strong>${x.order}. ${esc(x.title||x.operation)}</strong><div class="doc-meta"><span class="badge ${x.status==='ready'?'ok':'warn'}">${x.status==='ready'?'pronto':'revisar'}</span><span class="badge neutral">${esc(x.section)}</span><span class="badge neutral">${esc(x.operation)}</span></div></div></div><div class="small" style="margin-top:8px">${x.instructions.map(s=>`• ${esc(s)}`).join('<br>')}</div><div class="fields">${x.fields.map(f=>`<span class="field"><strong>${esc(f.label)}:</strong> ${esc(Array.isArray(f.value)?f.value.join('; '):f.value)}</span>`).join('')}</div></div>`).join('');
}
function generateAssisted(){buildAssistedPackage();renderWorkflow()}
function exportAssisted(){
  const p=state.assistedPackage||buildAssistedPackage();
  download('lattes-assist-pacote-atualizacao-assistida.json',JSON.stringify(p,null,2));
  const rows=['# Lattes Assist — Pacote de Atualização Assistida','',`Gerado em: ${new Date(p.generatedAt).toLocaleString('pt-BR')}`,''];
  p.items.forEach(x=>{rows.push(`## ${x.order}. ${x.title||x.operation}`,`Seção: ${x.section}`,`Operação: ${x.operation}`,`Status: ${x.status==='ready'?'pronto':'revisar'}`,'');x.instructions.forEach(s=>rows.push(`- ${s}`));if(x.fields.length){rows.push('','Campos:');x.fields.forEach(f=>rows.push(`- ${f.label}: ${Array.isArray(f.value)?f.value.join('; '):f.value}`))}rows.push('')});
  download('lattes-assist-pacote-atualizacao-assistida.md',rows.join('\n'),'text/markdown');
}


function xmlEsc(v){
  return clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function buildAuditXml(){
  buildDecisions();buildAssistedPackage();
  const items=state.decisions.map(d=>`  <DECISAO id="${xmlEsc(d.id)}" recomendacao="${xmlEsc(d.recommendation)}" confianca="${Math.round((d.confidence||0)*100)}">
    <TITULO>${xmlEsc(d.title||'')}</TITULO>
    <CATEGORIA>${xmlEsc(d.category||'')}</CATEGORIA>
    <REGISTRO-LATTES-ID>${xmlEsc(d.lattesRecordId||'')}</REGISTRO-LATTES-ID>
    <JUSTIFICATIVAS>${(d.rationale||[]).map(x=>`<JUSTIFICATIVA>${xmlEsc(x)}</JUSTIFICATIVA>`).join('')}</JUSTIFICATIVAS>
    <EVIDENCIAS>${(d.evidence||[]).map(x=>`<DOCUMENTO>${xmlEsc(x)}</DOCUMENTO>`).join('')}${(d.external||[]).map(x=>`<FONTE-EXTERNA>${xmlEsc(x)}</FONTE-EXTERNA>`).join('')}</EVIDENCIAS>
  </DECISAO>`).join('\n');
  const ops=(state.assistedPackage?.items||[]).map(x=>`  <OPERACAO ordem="${x.order}" tipo="${xmlEsc(x.operation)}" status="${xmlEsc(x.status)}">
    <SECAO>${xmlEsc(x.section)}</SECAO>
    <TITULO>${xmlEsc(x.title)}</TITULO>
    <CAMPOS>${(x.fields||[]).map(f=>`<CAMPO nome="${xmlEsc(f.label)}">${xmlEsc(Array.isArray(f.value)?f.value.join('; '):f.value)}</CAMPO>`).join('')}</CAMPOS>
  </OPERACAO>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<LATTES-ASSIST-AUDITORIA schema="1.1" gerado-em="${new Date().toISOString()}">
  <CURRICULO nome="${xmlEsc(state.cv?.name||'')}" identificador="${xmlEsc(state.cv?.lattesId||'')}" atualizacao="${xmlEsc(state.cv?.updated||'')}"/>
  <DECISOES>
${items}
  </DECISOES>
  <OPERACOES-CONFIRMADAS>
${ops}
  </OPERACOES-CONFIRMADAS>
</LATTES-ASSIST-AUDITORIA>`;
}
function buildPatchXml(){
  const p=state.assistedPackage||buildAssistedPackage();
  return `<?xml version="1.0" encoding="UTF-8"?>
<LATTES-ASSIST-PATCH schema="1.1" gerado-em="${new Date().toISOString()}" formato-destino="Plataforma Lattes">
  <AVISO>Este arquivo descreve alterações confirmadas pelo usuário. Não é apresentado como XML oficialmente importável pelo CNPq.</AVISO>
  <CURRICULO-ALVO identificador="${xmlEsc(state.cv?.lattesId||'')}" nome="${xmlEsc(state.cv?.name||'')}"/>
  <ALTERACOES>
${p.items.map(x=>`    <ALTERACAO ordem="${x.order}" operacao="${xmlEsc(x.operation)}" status="${xmlEsc(x.status)}" alvo="${xmlEsc(x.targetId||'')}">
      <SECAO>${xmlEsc(x.section)}</SECAO>
      <TITULO>${xmlEsc(x.title)}</TITULO>
      <CAMPOS>${(x.fields||[]).map(f=>`<CAMPO nome="${xmlEsc(f.label)}">${xmlEsc(Array.isArray(f.value)?f.value.join('; '):f.value)}</CAMPO>`).join('')}</CAMPOS>
      <EVIDENCIA fonte="${xmlEsc(x.evidence?.source||'')}">${xmlEsc(x.evidence?.documentName||x.evidence?.external||'')}</EVIDENCIA>
    </ALTERACAO>`).join('\n')}
  </ALTERACOES>
</LATTES-ASSIST-PATCH>`;
}
function exportAuditXml(){
  download('lattes-assist-pos-auditoria.xml',buildAuditXml(),'application/xml');
}
function exportPatchXml(){
  download('lattes-assist-alteracoes-confirmadas.xml',buildPatchXml(),'application/xml');
}
async function copyGuided(value,btn){
  try{
    await navigator.clipboard.writeText(String(value??''));
    const old=btn.textContent;btn.textContent='Copiado';setTimeout(()=>btn.textContent=old,1200);
  }catch{
    const ta=document.createElement('textarea');ta.value=String(value??'');document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
  }
}
