function renderGuidedFill(){
  const p=state.assistedPackage;
  if(!p?.items?.length){$('#guidedFillList').innerHTML='<div class="empty">Gere um pacote assistido para habilitar os campos.</div>';return}
  $('#guidedFillList').innerHTML=p.items.map((x,i)=>`<div class="doc-card"><div class="doc-head"><div class="doc-title"><strong>${i+1}. ${esc(x.title||x.operation)}</strong><div class="small">${esc(x.section)}</div></div></div><div class="fields">${(x.fields||[]).map((f,fi)=>`<span class="field"><strong>${esc(f.label)}:</strong> ${esc(Array.isArray(f.value)?f.value.join('; '):f.value)} <button class="btn" style="padding:4px 7px;margin-left:5px" data-copy-item="${i}" data-copy-field="${fi}">Copiar</button></span>`).join('')}</div></div>`).join('');
  $$('#guidedFillList button[data-copy-item]').forEach(btn=>btn.addEventListener('click',()=>{
    const i=Number(btn.dataset.copyItem),fi=Number(btn.dataset.copyField),f=p.items[i]?.fields?.[fi];if(f)copyGuided(Array.isArray(f.value)?f.value.join('; '):f.value,btn);
  }));
}


const LATTES_OPERATION_MAP={
  ATUALIZAR_ARTIGO:{tag:'ARTIGO-PUBLICADO',section:'PRODUCAO-BIBLIOGRAFICA/ARTIGOS-PUBLICADOS',fields:{'Título':'TITULO-DO-ARTIGO','Ano':'ANO-DO-ARTIGO','DOI':'DOI','Periódico/Editora':'TITULO-DO-PERIODICO-OU-REVISTA'}},
  ATUALIZAR_REGISTRO_REVISADO:{tag:null,section:null,fields:{}},
  CRIAR_REGISTRO_REVISADO:{tag:null,section:null,fields:{}},
  CRIAR_BANCA:{tag:'PARTICIPACAO-EM-BANCA-DE-*',section:'DADOS-COMPLEMENTARES/PARTICIPACAO-EM-BANCA-TRABALHOS-CONCLUSAO',fields:{'Título':'TITULO','Ano':'ANO'}},
  CRIAR_PARTICIPACAO_EVENTO:{tag:'PARTICIPACAO-EM-*',section:'DADOS-COMPLEMENTARES/PARTICIPACAO-EM-EVENTOS-CONGRESSOS',fields:{'Título':'TITULO','Ano':'ANO'}},
  CRIAR_OU_ATUALIZAR_ORIENTACAO:{tag:'ORIENTACAO-*',section:'OUTRA-PRODUCAO/ORIENTACOES',fields:{'Título':'TITULO','Ano':'ANO'}},
  CRIAR_PROJETO:{tag:'PROJETO-DE-PESQUISA',section:'ATUACAO-PROFISSIONAL/ATIVIDADES-DE-PARTICIPACAO-EM-PROJETO',fields:{'Título':'NOME-DO-PROJETO','Ano':'ANO-INICIO'}},
  CRIAR_FORMACAO_COMPLEMENTAR:{tag:'FORMACAO-COMPLEMENTAR-*',section:'DADOS-GERAIS/FORMACAO-COMPLEMENTAR',fields:{'Título':'NOME-CURSO','Ano':'ANO-DE-INICIO'}},
  CRIAR_PREMIO:{tag:'PREMIO-TITULO',section:'DADOS-GERAIS/PREMIOS-TITULOS',fields:{'Título':'NOME-DO-PREMIO-OU-TITULO','Ano':'ANO-DA-PREMIACAO'}},
  CRIAR_ATIVIDADE_INSTITUCIONAL:{tag:'DIRECAO-E-ADMINISTRACAO|CONSELHO-COMISSAO-E-CONSULTORIA',section:'ATUACAO-PROFISSIONAL',fields:{}},
  CRIAR_ATIVIDADE_TECNICA:{tag:'TRABALHO-TECNICO|OUTRA-PRODUCAO-TECNICA',section:'PRODUCAO-TECNICA',fields:{'Título':'TITULO-DO-TRABALHO','Ano':'ANO'}},
  CRIAR_OU_ATUALIZAR_PRODUCAO:{tag:'PRODUCAO-BIBLIOGRAFICA/*',section:'PRODUCAO-BIBLIOGRAFICA',fields:{'Título':'TITULO','Ano':'ANO','DOI':'DOI','Periódico/Editora':'TITULO-DO-PERIODICO-OU-REVISTA'}},
  VINCULAR_EVIDENCIA_A_REGISTRO:{tag:null,section:null,fields:{},note:'A evidência é interna ao Lattes Assist e não corresponde a um elemento nativo do XML Lattes.'},
  REVISAR_POSSIVEL_DUPLICIDADE:{tag:null,section:null,fields:{},note:'Operação de auditoria; não deve gerar elemento XML automaticamente.'},
  REVISAR_PRODUCAO_EXTERNA:{tag:null,section:null,fields:{},note:'Requer classificação antes do mapeamento XSD.'}
};
function buildSchemaMap(){
  const items=(state.assistedPackage||buildAssistedPackage()).items||[];
  state.schemaMap=items.map(x=>{
    const m=LATTES_OPERATION_MAP[x.operation]||{tag:null,section:null,fields:{}};
    const mappedFields=(x.fields||[]).map(f=>({label:f.label,value:f.value,xsdAttribute:m.fields?.[f.label]||null,mapped:Boolean(m.fields?.[f.label])}));
    return {order:x.order,operation:x.operation,title:x.title,section:x.section,lattesTag:m.tag,lattesSection:m.section,note:m.note||'',mapped:Boolean(m.tag),fields:mappedFields};
  });
  return state.schemaMap;
}
function parseXsd(text,name='schema.xsd'){
  state.runtime.rawXsd=text;
  const xml=new DOMParser().parseFromString(text,'application/xml');
  if(xml.querySelector('parsererror'))throw new Error('O XSD não pôde ser interpretado como XML.');
  const elements=[...xml.querySelectorAll('element')].map(e=>e.getAttribute('name')).filter(Boolean);
  const attrs=[...xml.querySelectorAll('attribute')].map(e=>e.getAttribute('name')).filter(Boolean);
  state.xsdInfo={name,loadedAt:new Date().toISOString(),elements:[...new Set(elements)],attributes:[...new Set(attrs)]};
  renderSchema();
}
function tagCompatible(pattern,elements){
  if(!pattern)return false;
  const parts=pattern.split('|');
  return parts.some(p=>{
    if(p.includes('*')){
      const re=new RegExp('^'+p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace('\\*','.*')+'$');
      return elements.some(e=>re.test(e));
    }
    return elements.includes(p);
  });
}
function renderSchema(){
  const rows=buildSchemaMap(),x=state.xsdInfo;
  const mapped=rows.filter(r=>r.mapped).length,unmapped=rows.length-mapped;
  $('#sMapped').textContent=mapped;$('#sUnmapped').textContent=unmapped;$('#sXsdElements').textContent=x?.elements?.length||0;$('#exportMapping').disabled=!rows.length;
  let compatible=0,checkable=0;
  if(x){rows.filter(r=>r.lattesTag).forEach(r=>{checkable++;if(tagCompatible(r.lattesTag,x.elements))compatible++})}
  $('#sCompatibility').textContent=x&&checkable?Math.round(compatible/checkable*100)+'%':'—';
  $('#xsdMeta').textContent=x?`${x.name} · ${x.elements.length} elementos · ${x.attributes.length} atributos`:'Nenhum XSD carregado.';
  $('#mappingMeta').textContent=rows.length?`${mapped} mapeadas · ${unmapped} requerem tratamento adicional`:'';
  $('#mappingList').innerHTML=rows.length?rows.map(r=>`<div class="doc-card"><div class="doc-head"><div class="doc-title"><strong>${r.order}. ${esc(r.title||r.operation)}</strong><div class="doc-meta"><span class="badge ${r.mapped?'ok':'warn'}">${r.mapped?'mapeado':'não mapeado'}</span>${r.lattesTag?`<span class="badge neutral">${esc(r.lattesTag)}</span>`:''}${x&&r.lattesTag?`<span class="badge ${tagCompatible(r.lattesTag,x.elements)?'ok':'bad'}">${tagCompatible(r.lattesTag,x.elements)?'presente no XSD':'não localizado no XSD'}</span>`:''}</div></div></div>${r.lattesSection?`<div class="small" style="margin-top:7px">Seção Lattes: ${esc(r.lattesSection)}</div>`:''}${r.note?`<div class="small" style="margin-top:7px">${esc(r.note)}</div>`:''}<div class="fields">${r.fields.map(f=>`<span class="field"><strong>${esc(f.label)}:</strong> ${esc(Array.isArray(f.value)?f.value.join('; '):f.value)} ${f.xsdAttribute?`→ <span class="mono">${esc(f.xsdAttribute)}</span>`:'→ sem campo seguro'}</span>`).join('')}</div></div>`).join(''):'<div class="empty">Nenhuma operação disponível para mapear.</div>';
}
function exportMapping(){
  buildSchemaMap();
  download('lattes-assist-mapeamento-xsd.json',JSON.stringify({schema:'lattes-assist.xsd-map.v1.6',generatedAt:new Date().toISOString(),cv:state.cv,xsd:state.xsdInfo?{name:state.xsdInfo.name,loadedAt:state.xsdInfo.loadedAt,elements:state.xsdInfo.elements.length,attributes:state.xsdInfo.attributes.length}:null,map:state.schemaMap},null,2));
}


function ensureChild(doc,parent,tag){
  let el=[...parent.children].find(x=>x.tagName===tag);
  if(!el){el=doc.createElement(tag);parent.appendChild(el)}
  return el;
}
function setAttrSafe(el,name,value){
  if(!el||!name||value===undefined||value===null||String(value).trim()==='')return false;
  el.setAttribute(name,String(value));return true;
}
