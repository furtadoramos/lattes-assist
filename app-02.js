function collectRelations(xml,records){
  const out=[];
  const recordBySearch=records;
  const findParentId=(node)=>{
    let p=node.parentElement;
    while(p){
      const rec=recordBySearch.find(r=>r.xmlTag===p.tagName && r.searchText===recordSearchText(p));
      if(rec)return rec.id;
      p=p.parentElement;
    }
    return null;
  };
  const specs=[
    ['BANCA_PARTICIPANTE','PARTICIPANTE-BANCA'],
    ['PROJETO_INTEGRANTE','INTEGRANTES-DO-PROJETO'],
    ['PROJETO_FINANCIADOR','FINANCIADOR-DO-PROJETO'],
    ['EVENTO_PARTICIPANTE','PARTICIPANTE-DE-EVENTOS-CONGRESSOS'],
    ['PROJETO_PRODUCAO','PRODUCAO-CT-DO-PROJETO'],
    ['FORMACAO_INFO','INFORMACAO-ADICIONAL-CURSO'],
    ['INSTITUICAO_INFO','INFORMACAO-ADICIONAL-INSTITUICAO']
  ];
  for(const [kind,tag] of specs){
    xml.querySelectorAll(tag).forEach(node=>{
      const parentId=findParentId(node);
      out.push(relationEntity(kind,node,parentId));
    });
  }
  return out;
}
function computeCoverage(xml,records,relations){
  const major={
    'Produção bibliográfica':['ARTIGO-PUBLICADO','ARTIGO-ACEITO-PARA-PUBLICACAO','LIVRO-PUBLICADO-OU-ORGANIZADO','CAPITULO-DE-LIVRO-PUBLICADO','TEXTO-EM-JORNAL-OU-REVISTA','TRABALHO-EM-EVENTOS','APRESENTACAO-DE-TRABALHO','OUTRA-PRODUCAO-BIBLIOGRAFICA'],
    'Produção técnica':['TRABALHO-TECNICO','ORGANIZACAO-DE-EVENTO','EDITORACAO','PRODUTO-TECNOLOGICO','OUTRA-PRODUCAO-TECNICA','DESENVOLVIMENTO-DE-MATERIAL-DIDATICO-OU-INSTRUCIONAL','CURSO-DE-CURTA-DURACAO-MINISTRADO','PROGRAMA-DE-RADIO-OU-TV','DEMAIS-TIPOS-DE-PRODUCAO-TECNICA'],
    'Bancas':['PARTICIPACAO-EM-BANCA-DE-MESTRADO','PARTICIPACAO-EM-BANCA-DE-DOUTORADO','PARTICIPACAO-EM-BANCA-DE-EXAME-QUALIFICACAO','PARTICIPACAO-EM-BANCA-DE-GRADUACAO','PARTICIPACAO-EM-BANCA-DE-APERFEICOAMENTO-ESPECIALIZACAO','OUTRAS-PARTICIPACOES-EM-BANCA'],
    'Orientações':['ORIENTACOES-CONCLUIDAS-PARA-MESTRADO','ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO','OUTRAS-ORIENTACOES-CONCLUIDAS','ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO','ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO','ORIENTACAO-EM-ANDAMENTO-DE-INICIACAO-CIENTIFICA','OUTRAS-ORIENTACOES-EM-ANDAMENTO'],
    'Eventos':['PARTICIPACAO-EM-CONGRESSO','PARTICIPACAO-EM-SEMINARIO','PARTICIPACAO-EM-SIMPOSIO','PARTICIPACAO-EM-ENCONTRO','PARTICIPACAO-EM-OFICINA','PARTICIPACAO-EM-OUTRO-EVENTO','OUTRAS-PARTICIPACOES-EM-EVENTOS-CONGRESSOS'],
    'Projetos':['PROJETO-DE-PESQUISA'],
    'Formação':['FORMACAO-ACADEMICA-TITULACAO','FORMACAO-COMPLEMENTAR'],
    'Gestão e distinções':['DIRECAO-E-ADMINISTRACAO','CONSELHO-COMISSAO-E-CONSULTORIA','PREMIO-TITULO']
  };
  const detail=[];
  let totalPresent=0,totalMapped=0;
  for(const [label,tags] of Object.entries(major)){
    const present=tags.reduce((n,t)=>n+xml.querySelectorAll(t).length,0);
    const mapped=records.filter(r=>{
      if(label==='Bancas')return r.category==='BANCA';
      if(label==='Orientações')return r.category==='ORIENTACAO';
      if(label==='Eventos')return r.category==='EVENTO';
      if(label==='Projetos')return r.category==='PROJETO';
      if(label==='Formação')return r.category==='FORMACAO';
      if(label==='Produção bibliográfica')return r.category==='PRODUCAO_BIBLIOGRAFICA';
      if(label==='Produção técnica')return r.category==='PRODUCAO_TECNICA';
      return ['GESTAO','PREMIO'].includes(r.category);
    }).length;
    totalPresent+=present; totalMapped+=Math.min(mapped,present||mapped);
    detail.push({label,present,mapped});
  }
  const pct=totalPresent?Math.round(totalMapped/totalPresent*100):100;
  return {pct,totalPresent,totalMapped,detail,relations:relations.length};
}
function renderCoverage(){
  const c=state.coverage;
  $('#mCoverage').textContent=c?c.pct+'%':'—';
  $('#mRelations').textContent=state.relations.length;
  if(!c){$('#coverageSummary').innerHTML='';$('#coverageDetails').textContent='Importe um XML para calcular a cobertura.';$('#coverageMeta').textContent='';return}
  $('#coverageMeta').textContent=`${c.totalMapped} de ${c.totalPresent} registros principais representados`;
  $('#coverageSummary').innerHTML=c.detail.map(x=>`<div class="card metric"><div class="n">${x.present?Math.round(Math.min(x.mapped,x.present)/x.present*100):100}%</div><div class="label">${esc(x.label)} · ${x.mapped}/${x.present}</div></div>`).join('');
  $('#coverageDetails').innerHTML=`Relações internas mapeadas: <strong>${state.relations.length}</strong>. A porcentagem mede cobertura estrutural das categorias presentes no XML, não qualidade nem completude acadêmica do currículo.`;
}

function categoryForDocument(type){return {BANCA:'BANCA',EVENTO:'EVENTO',ORIENTACAO:'ORIENTACAO',FORMACAO:'FORMACAO',PREMIO:'PREMIO',GESTAO:'GESTAO',PROJETO:'PROJETO',PRODUCAO_BIBLIOGRAFICA:'PRODUCAO_BIBLIOGRAFICA',PARECER:'PRODUCAO_TECNICA'}[type]||''}
function recordSimilarity(doc,rec){const f=doc.fields||{};let score=0;const title=f.title||'';if(f.doi&&rec.doi&&normalizeTitle(f.doi)===normalizeTitle(rec.doi))return 1;
 if(title){score=Math.max(score,jaccard(title,rec.title||''),jaccard(title,rec.searchText||'')*.92)}
 const years=f.years||[];if(years.length&&rec.year&&years.includes(String(rec.year)))score+=.12;
 const inst=(f.institutions||[]).join(' ');if(inst&&rec.institution)score+=Math.min(.1,jaccard(inst,rec.institution)*.14);
 if(f.beneficiary&&rec.person)score+=Math.min(.1,jaccard(f.beneficiary,rec.person)*.14);
 if(doc.classification?.type==='PARECER'&&/parecer|avaliador|revisor/i.test(rec.searchText||''))score+=.08;
 return Math.min(1,score)}

function parseLattes(text,sourceName='curriculo.xml'){
  state.runtime.rawXml=text;const xml=new DOMParser().parseFromString(text,'application/xml');
  if(xml.querySelector('parsererror')) throw new Error('O arquivo não pôde ser interpretado como XML.');
  const root=xml.querySelector('CURRICULO-VITAE')||xml.documentElement;
  const dg=xml.querySelector('DADOS-GERAIS');
  const name=attr(dg,'NOME-COMPLETO')||'Pesquisador(a)';
  const updated=attr(root,'DATA-ATUALIZACAO');
  const lattesId=attr(root,'NUMERO-IDENTIFICADOR');
  const nodes=[...xml.querySelectorAll('ARTIGO-PUBLICADO')];
  state.cv={name,updated,lattesId,sourceName,importedAt:new Date().toISOString(),parserVersion:'0.5'};
  state.articles=nodes.map((node,idx)=>{const b=node.querySelector('DADOS-BASICOS-DO-ARTIGO')||node,d=node.querySelector('DETALHAMENTO-DO-ARTIGO')||node;const authors=[...node.querySelectorAll('AUTORES')].map(a=>attr(a,'NOME-COMPLETO-DO-AUTOR','NOME-PARA-CITACAO')).filter(Boolean);return {id:'art-'+idx,title:attr(b,'TITULO-DO-ARTIGO'),year:attr(b,'ANO-DO-ARTIGO'),doi:attr(b,'DOI'),nature:attr(b,'NATUREZA'),journal:attr(d,'TITULO-DO-PERIODICO-OU-REVISTA'),issn:attr(d,'ISSN'),volume:attr(d,'VOLUME'),issue:attr(d,'FASCICULO'),pageStart:attr(d,'PAGINA-INICIAL'),pageEnd:attr(d,'PAGINA-FINAL'),authors,source:'Lattes XML'};}).filter(a=>a.title);
  state.records=parseIntegralRecords(xml);
  state.updates=[];
  state.documents.forEach(d=>d.reconciliation=reconcileDocument(d));
  runAudit();persistParsed();renderAll();
}
function persistParsed(){try{localStorage.setItem('lattesAssist.cv',JSON.stringify({cv:state.cv,articles:state.articles,records:state.records,relations:state.relations,coverage:state.coverage,schema:'lattes-assist.cv.v1.6'}));}catch{}}
function restoreParsed(){try{const x=JSON.parse(localStorage.getItem('lattesAssist.cv'));if(x?.cv){state.cv=x.cv;state.articles=x.articles||[];state.records=x.records||[];state.relations=x.relations||[];state.coverage=x.coverage||null;runAudit();}}catch{}}

function runAudit(){
  const findings=[]; const keyMap=new Map(); const doiMap=new Map();
  state.articles.forEach(a=>{if(!a.doi)findings.push({type:'missing-doi',severity:'warn',article:a,message:'DOI ausente'});if(!a.issn)findings.push({type:'missing-issn',severity:'warn',article:a,message:'ISSN ausente'});if(!a.journal)findings.push({type:'missing-journal',severity:'warn',article:a,message:'Periódico ausente'});const k=normalizeTitle(a.title)+'|'+a.year;if(keyMap.has(k))findings.push({type:'duplicate',severity:'bad',article:a,other:keyMap.get(k),message:'Possível duplicidade por título e ano'});else keyMap.set(k,a);const d=normalizeTitle(a.doi);if(d){if(doiMap.has(d))findings.push({type:'duplicate-doi',severity:'bad',article:a,other:doiMap.get(d),message:'DOI repetido em mais de um registro'});else doiMap.set(d,a)}});
  const rmap=new Map();state.records.filter(r=>r.category!=='PRODUCAO_BIBLIOGRAFICA'||r.subtype!=='ARTIGO-PUBLICADO').forEach(r=>{const k=[r.category,r.subtype,normalizeTitle(r.title),r.year].join('|');if(r.title&&rmap.has(k))findings.push({type:'duplicate-record',severity:'bad',record:r,otherRecord:rmap.get(k),message:`Possível duplicidade em ${r.categoryLabel}`});else rmap.set(k,r)});
  state.audit=findings;
}


