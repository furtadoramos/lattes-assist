EXTERNAL_CLASSIFICATIONS.MIDIA={label:'Produção audiovisual / mídia',category:'PRODUCAO_TECNICA',subtype:'OUTRA-PRODUCAO-TECNICA',operation:'CRIAR_PRODUCAO_TECNICA'};
EXTERNAL_CLASSIFICATIONS.NORMA={label:'Norma / padrão técnico',category:'PRODUCAO_TECNICA',subtype:'OUTRA-PRODUCAO-TECNICA',operation:'CRIAR_PRODUCAO_TECNICA'};
EXTERNAL_CLASSIFICATIONS.PROJETO={label:'Projeto / grant',category:'PROJETO',subtype:'PROJETO-DE-PESQUISA',operation:'CRIAR_PROJETO'};
EXTERNAL_CLASSIFICATIONS.ENTRADA={label:'Verbete / entrada de referência',category:'PRODUCAO_BIBLIOGRAFICA',subtype:'OUTRA-PRODUCAO-BIBLIOGRAFICA',operation:'CRIAR_OUTRA_PRODUCAO_BIBLIOGRAFICA'};

inferExternalProductionType=function(x){
  const t=normalizedExternalType(x),compact=t.replace(/\s+/g,''),title=normalizeTitle(x.title||''),venue=normalizeTitle(x.venue||'');
  const has=(...xs)=>xs.some(v=>{const n=normalizeTitle(v),c=n.replace(/\s+/g,'');return t===n||t.includes(n)||compact===c||compact.includes(c)});
  let key='OUTRO',confidence=.52,reasons=[];
  if(has('journal article','journalarticle','journal-article','article-journal','article')){key='ARTIGO';confidence=.96;reasons.push('tipo declarado como artigo')}
  else if(has('book chapter','bookchapter','book-chapter','book section','booksection','section','chapter')){key='CAPITULO';confidence=.95;reasons.push('tipo declarado como capítulo/seção')}
  else if(has('proceedings article','proceedingsarticle','conference paper','conferencepaper','conference proceeding','conferenceproceeding')){key='EVENTO';confidence=.95;reasons.push('tipo declarado como trabalho/anais de evento')}
  else if(has('edited book','editedbook','monograph','book')){key='LIVRO';confidence=.93;reasons.push('tipo declarado como livro')}
  else if(has('preprint','posted content','postedcontent','working paper','workingpaper')){key='PREPRINT';confidence=.91;reasons.push('tipo declarado como preprint/working paper')}
  else if(has('software','computer program','computerprogram','workflow')){key='SOFTWARE';confidence=.95;reasons.push('tipo declarado como software/workflow')}
  else if(has('dataset','data set','datapaper','data paper')){key=has('datapaper','data paper')?'ARTIGO':'DATASET';confidence=key==='ARTIGO'?.86:.95;reasons.push(key==='ARTIGO'?'tipo declarado como data paper':'tipo declarado como dataset')}
  else if(has('report','report component','reportcomponent','technical note','technicalnote','deliverable')){key='RELATORIO';confidence=.9;reasons.push('tipo declarado como relatório/nota técnica')}
  else if(has('patent')){key='PATENTE';confidence=.98;reasons.push('tipo declarado como patente')}
  else if(has('dissertation','thesis')){key='FORMACAO';confidence=.9;reasons.push('tipo declarado como tese/dissertação')}
  else if(has('peer review','peerreview','peer-review')){key='PARECER';confidence=.96;reasons.push('tipo declarado como peer review')}
  else if(has('newspaper article','newspaperarticle','magazine article','magazinearticle')){key='TEXTO';confidence=.91;reasons.push('tipo declarado como texto em jornal/revista')}
  else if(has('editorial','letter','review')&&venue){key='ARTIGO';confidence=.78;reasons.push('tipo editorial/review vinculado a veículo periódico')}
  else if(has('reference entry','referenceentry','encyclopedia entry','encyclopediaentry')){key='ENTRADA';confidence=.84;reasons.push('tipo declarado como entrada de referência/verbete')}
  else if(has('audiovisual','image','sound','interactive resource','interactiveresource','model','physical object','physicalobject')){key='MIDIA';confidence=.82;reasons.push('tipo declarado como produção audiovisual/mídia')}
  else if(has('standard')){key='NORMA';confidence=.9;reasons.push('tipo declarado como norma/padrão')}
  else if(has('grant','project')){key='PROJETO';confidence=.82;reasons.push('tipo declarado como projeto/grant')}
  else if(/\banais\b|proceedings|congress|conference|congresso|seminario|simposio/.test(venue+' '+title)){key='EVENTO';confidence=.7;reasons.push('veículo/título indica evento')}
  else if(/\bcapitulo\b/.test(title)){key='CAPITULO';confidence=.68;reasons.push('título indica capítulo')}
  else if(x.doi&&venue){key='ARTIGO';confidence=.62;reasons.push('DOI + veículo sugerem artigo, requer conferência')}
  const spec=EXTERNAL_CLASSIFICATIONS[key]||EXTERNAL_CLASSIFICATIONS.OUTRO;
  return {key,...spec,confidence,reasons,rawType:x.type||''};
};