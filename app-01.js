
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={cv:null,articles:[],records:[],relations:[],coverage:null,retrospective:[],externalCandidates:[],externalSources:[],identityProfile:null,decisions:[],assistedPackage:null,schemaMap:[],xsdInfo:null,rebuiltXml:null,rebuildReport:null,diffReport:null,semanticDiff:[],stableIdentityReport:null,audit:[],updates:[],queue:[],documents:[],settings:{email:'',orcid:'',ocrLang:'por'},runtime:{ocrWorker:null,pdfjs:null,currentDoc:null,recordFilter:'',retroFilter:'',timelineCategory:'',decisionFilter:'',batchProcessed:0,batchDuplicates:0,rawXml:'',rawXsd:''}};

function clean(v){return (v||'').toString().trim()}
function attr(el,...names){for(const n of names){if(el?.hasAttribute(n)) return clean(el.getAttribute(n));}return ''}
function normalizeTitle(s){return clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
function tokens(s){return new Set(normalizeTitle(s).split(' ').filter(x=>x.length>2))}
function jaccard(a,b){const A=tokens(a),B=tokens(b);if(!A.size||!B.size)return 0;let i=0;A.forEach(x=>{if(B.has(x))i++});return i/(A.size+B.size-i)}
function esc(s){return clean(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function save(){localStorage.setItem('lattesAssist.settings',JSON.stringify(state.settings));localStorage.setItem('lattesAssist.queue',JSON.stringify(state.queue))}
function loadSaved(){try{state.settings=JSON.parse(localStorage.getItem('lattesAssist.settings'))||state.settings;state.queue=JSON.parse(localStorage.getItem('lattesAssist.queue'))||[];}catch{} $('#crossrefMail').value=state.settings.email||'';$('#orcidId').value=state.settings.orcid||'';if($('#externalOrcid'))$('#externalOrcid').value=state.settings.orcid||''}

const RECORD_CATEGORY_LABELS={
  PRODUCAO_BIBLIOGRAFICA:'Produção bibliográfica',PRODUCAO_TECNICA:'Produção técnica',BANCA:'Banca acadêmica',ORIENTACAO:'Orientação',EVENTO:'Evento / participação',PROJETO:'Projeto',FORMACAO:'Formação',PREMIO:'Prêmio / distinção',GESTAO:'Gestão / atividade institucional',OUTRO:'Outro registro'
};
const RECORD_SPECS=[
  ['PRODUCAO_BIBLIOGRAFICA',['ARTIGO-PUBLICADO','ARTIGO-ACEITO-PARA-PUBLICACAO','LIVRO-PUBLICADO-OU-ORGANIZADO','CAPITULO-DE-LIVRO-PUBLICADO','TEXTO-EM-JORNAL-OU-REVISTA','TRABALHO-EM-EVENTOS','APRESENTACAO-DE-TRABALHO','TRADUCAO','PREFACIO-POSFACIO','OUTRA-PRODUCAO-BIBLIOGRAFICA']],
  ['PRODUCAO_TECNICA',['TRABALHO-TECNICO','CURSO-DE-CURTA-DURACAO-MINISTRADO','DESENVOLVIMENTO-DE-MATERIAL-DIDATICO-OU-INSTRUCIONAL','EDITORACAO','PROGRAMA-DE-RADIO-OU-TV','RELATORIO-DE-PESQUISA','ORGANIZACAO-DE-EVENTO','OUTRA-PRODUCAO-TECNICA','DEMAIS-TIPOS-DE-PRODUCAO-TECNICA','PROCESSOS-OU-TECNICAS','PRODUTO-TECNOLOGICO','SOFTWARE','PATENTE','DESENHO-INDUSTRIAL','CARTAS-MAPAS-OU-SIMILARES']],
  ['BANCA',['PARTICIPACAO-EM-BANCA-DE-MESTRADO','PARTICIPACAO-EM-BANCA-DE-DOUTORADO','PARTICIPACAO-EM-BANCA-DE-EXAME-QUALIFICACAO','PARTICIPACAO-EM-BANCA-DE-APERFEICOAMENTO-ESPECIALIZACAO','PARTICIPACAO-EM-BANCA-DE-GRADUACAO','OUTRAS-PARTICIPACOES-EM-BANCA']],
  ['ORIENTACAO',['ORIENTACOES-CONCLUIDAS-PARA-MESTRADO','ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO','OUTRAS-ORIENTACOES-CONCLUIDAS','ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO','ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO','ORIENTACAO-EM-ANDAMENTO-DE-INICIACAO-CIENTIFICA','OUTRAS-ORIENTACOES-EM-ANDAMENTO']],
  ['EVENTO',['PARTICIPACAO-EM-CONGRESSO','PARTICIPACAO-EM-SEMINARIO','PARTICIPACAO-EM-SIMPOSIO','PARTICIPACAO-EM-ENCONTRO','PARTICIPACAO-EM-OFICINA','PARTICIPACAO-EM-OUTRO-EVENTO','OUTRAS-PARTICIPACOES-EM-EVENTOS-CONGRESSOS']],
  ['PROJETO',['PROJETO-DE-PESQUISA']],
  ['PREMIO',['PREMIO-TITULO']],
  ['GESTAO',['DIRECAO-E-ADMINISTRACAO','CONSELHO-COMISSAO-E-CONSULTORIA']]
];
function attrsDeep(node){const out=[];if(!node)return out;[node,...node.querySelectorAll('*')].forEach(el=>{[...el.attributes||[]].forEach(a=>{const v=clean(a.value);if(v)out.push({name:a.name,value:v,tag:el.tagName})})});return out}
function pickDeep(node,names=[],patterns=[]){const xs=attrsDeep(node);for(const n of names){const x=xs.find(a=>a.name===n);if(x)return x.value}for(const p of patterns){const x=xs.find(a=>p.test(a.name));if(x)return x.value}return ''}
function recordSearchText(node){return attrsDeep(node).map(a=>a.value).join(' ')}
function subtypeLabel(tag){return (tag||'').toLowerCase().split('-').map(x=>x?x[0].toUpperCase()+x.slice(1):'').join(' ')}
function inferStatus(tag,node){const t=(tag+' '+recordSearchText(node)).toLowerCase();if(t.includes('andamento'))return 'em andamento';if(t.includes('conclu')||t.includes('defendid'))return 'concluída';return ''}
function recordFromNode(node,category,idx){const tag=node.tagName;const searchText=recordSearchText(node);const title=pickDeep(node,['TITULO','TITULO-DO-TRABALHO','TITULO-DO-ARTIGO','TITULO-DO-LIVRO','TITULO-DO-CAPITULO-DO-LIVRO','TITULO-DA-PRODUCAO','NOME-DO-EVENTO','NOME-DO-PROJETO','TITULO-DO-PROJETO','NOME-DO-CURSO','NOME-DO-PREMIO-OU-TITULO','DESCRICAO'],[/^TITULO/,/^NOME-DO-(?:EVENTO|PROJETO|CURSO|PREMIO|TRABALHO)/,/DESCRICAO/]);
 const year=pickDeep(node,['ANO','ANO-DO-TRABALHO','ANO-DO-ARTIGO','ANO-DE-PUBLICACAO','ANO-DE-INICIO','ANO-INICIO','ANO-DE-CONCLUSAO','ANO-DA-PREMIACAO','ANO-DA-ORIENTACAO','ANO-DA-PARTICIPACAO'],[/^ANO-(?:DO|DA|DE)/]);
 const institution=pickDeep(node,['NOME-DA-INSTITUICAO','NOME-INSTITUICAO','INSTITUICAO-PROMOTORA-DO-EVENTO','NOME-DA-INSTITUICAO-DO-CURSO','NOME-DA-INSTITUICAO-DO-PROJETO','INSTITUICAO'],[/INSTITUICAO/]);
 const person=pickDeep(node,['NOME-DO-ORIENTANDO','NOME-DO-ORIENTADO','NOME-DO-CANDIDATO','NOME-COMPLETO-DO-AUTOR','NOME-PARA-CITACAO'],[/NOME-DO-(?:ORIENTANDO|ORIENTADO|CANDIDATO)/]);
 const doi=pickDeep(node,['DOI'],[/DOI/]),issn=pickDeep(node,['ISSN'],[/ISSN/]),isbn=pickDeep(node,['ISBN'],[/ISBN/]);
 const role=pickDeep(node,['NATUREZA','TIPO-DE-PARTICIPACAO','TIPO-DE-ORIENTACAO','TIPO','CARGO-OU-FUNCAO'],[/TIPO-DE-/,/NATUREZA/,/CARGO/]);
 return {id:`rec-${idx}`,category,categoryLabel:RECORD_CATEGORY_LABELS[category]||category,subtype:tag,subtypeLabel:subtypeLabel(tag),title:title||role||person||institution||subtypeLabel(tag),year,institution,person,role,status:inferStatus(tag,node),doi,issn,isbn,searchText,source:'Lattes XML',xmlTag:tag};}
function pushUniqueRecord(out,seen,rec){const key=[rec.category,rec.subtype,normalizeTitle(rec.title),rec.year,normalizeTitle(rec.person),normalizeTitle(rec.institution)].join('|');if(!seen.has(key)){seen.add(key);out.push(rec)}}
function parseIntegralRecords(xml){const out=[],seen=new Set();let idx=0;for(const [category,tags] of RECORD_SPECS){for(const tag of tags){xml.querySelectorAll(tag).forEach(node=>pushUniqueRecord(out,seen,recordFromNode(node,category,idx++)))}}
 // Formação varia entre versões do XML; interpretar filhos diretos dessas duas seções é mais tolerante que enumerar todos os graus/cursos.
 ['FORMACAO-ACADEMICA-TITULACAO','FORMACAO-COMPLEMENTAR'].forEach(container=>xml.querySelectorAll(container).forEach(c=>[...c.children].forEach(node=>pushUniqueRecord(out,seen,recordFromNode(node,'FORMACAO',idx++)))));
 // Eventos podem ter nomes de elementos adicionais em diferentes versões; aceitar filhos da seção oficial sem absorver bancas.
 xml.querySelectorAll('PARTICIPACAO-EM-EVENTOS-CONGRESSOS').forEach(c=>[...c.children].forEach(node=>pushUniqueRecord(out,seen,recordFromNode(node,'EVENTO',idx++))));
 return out;
}

function relationEntity(kind,node,parentId){
  const searchText=recordSearchText(node);
  const name=pickDeep(node,
    ['NOME-COMPLETO-DO-AUTOR','NOME-COMPLETO-DO-PARTICIPANTE','NOME-DO-PARTICIPANTE','NOME-COMPLETO','NOME','NOME-DA-INSTITUICAO','NOME-INSTITUICAO','NOME-DA-AGENCIA'],
    [/NOME.*PARTICIPANTE/,/NOME.*INTEGRANTE/,/NOME.*FINANCIADOR/,/NOME.*INSTITUICAO/,/^NOME$/]);
  const role=pickDeep(node,['TIPO-DE-PARTICIPACAO','FLAG-RESPONSAVEL','FUNCAO','CARGO-OU-FUNCAO','NATUREZA'],[/TIPO-DE-/,/FUNCAO/,/RESPONSAVEL/]);
  const institution=pickDeep(node,['NOME-DA-INSTITUICAO','NOME-INSTITUICAO','NOME-DA-AGENCIA'],[/INSTITUICAO/,/AGENCIA/]);
  return {id:`rel-${kind}-${parentId}-${Math.random().toString(36).slice(2,9)}`,kind,parentId,name:name||institution||subtypeLabel(node.tagName),role,institution,searchText,xmlTag:node.tagName};
}
