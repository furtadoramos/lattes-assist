const POP_SOURCE='Publish or Perish';
const POP_INTEROP_VERSION='1.8-beta-pop1';

function popStripBom(text){return String(text??'').replace(/^\uFEFF/,'')}
function popCleanText(v){return String(v??'').replace(/\u0000/g,'').trim()}
function popNum(v){if(v===null||v===undefined||v==='')return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null}
function popYear(v){const m=String(v??'').match(/(?:19|20)\d{2}/);return m?m[0]:''}
function popSplitAuthors(v){if(Array.isArray(v))return v.map(popCleanText).filter(Boolean);const s=popCleanText(v);if(!s)return[];if(s.includes(';'))return s.split(';').map(popCleanText).filter(Boolean);if(/\s+and\s+/i.test(s))return s.split(/\s+and\s+/i).map(popCleanText).filter(Boolean);if(s.includes('|'))return s.split('|').map(popCleanText).filter(Boolean);return[s]}
function popGet(obj,...names){if(!obj||typeof obj!=='object')return undefined;for(const name of names){if(Object.prototype.hasOwnProperty.call(obj,name))return obj[name]}const entries=Object.entries(obj),lower=names.map(x=>String(x).toLowerCase());for(const [k,v] of entries){if(lower.includes(String(k).toLowerCase()))return v}return undefined}

function parsePopJson(text){const data=JSON.parse(popStripBom(text));if(Array.isArray(data))return data;if(Array.isArray(data?.results))return data.results;if(Array.isArray(data?.publications))return data.publications;throw new Error('JSON do Publish or Perish deve conter uma lista de publicações.')}
function parsePopJsonl(text){const out=[];for(const [i,line] of popStripBom(text).split(/\r?\n/).entries()){const s=line.trim();if(!s)continue;try{out.push(JSON.parse(s))}catch{throw new Error(`JSON Lines inválido na linha ${i+1}.`)}}return out}
function popCountDelimiter(line,delimiter){let q=false,n=0;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(q&&line[i+1]==='"'){i++;continue}q=!q}else if(ch===delimiter&&!q)n++}return n}
function popGuessDelimiter(text){const first=popStripBom(text).split(/\r?\n/,1)[0]||'';const ds=[',',';','\t'].map(d=>[d,popCountDelimiter(first,d)]).sort((a,b)=>b[1]-a[1]);return ds[0][1]>0?ds[0][0]:','}
function parseDelimited(text,delimiter=popGuessDelimiter(text)){
  const src=popStripBom(text),rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<src.length;i++){
    const ch=src[i];
    if(quoted){if(ch==='"'){if(src[i+1]==='"'){cell+='"';i++}else quoted=false}else cell+=ch;continue}
    if(ch==='"'){quoted=true;continue}
    if(ch===delimiter){row.push(cell);cell='';continue}
    if(ch==='\r'||ch==='\n'){if(ch==='\r'&&src[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(x=>String(x).length))rows.push(row);row=[];continue}
    cell+=ch;
  }
  if(cell.length||row.length){row.push(cell);if(row.some(x=>String(x).length))rows.push(row)}
  if(rows.length<2)throw new Error('CSV sem registros de dados.');
  const headers=rows[0].map(popCleanText);return rows.slice(1).map(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]??'');return o});
}
function parsePopCsv(text){const rows=parseDelimited(text);if(!rows.length)return[];const sample=rows[0];if(popGet(sample,'Title','title')===undefined)throw new Error('CSV não contém a coluna Title esperada do Publish or Perish.');return rows}
function parsePopRis(text){
  const records=[];let rec={},lastTag='';const push=()=>{if(Object.keys(rec).length){records.push(rec);rec={};lastTag=''}};
  const add=(tag,val)=>{if(rec[tag]===undefined)rec[tag]=val;else if(Array.isArray(rec[tag]))rec[tag].push(val);else rec[tag]=[rec[tag],val]};
  for(const rawLine of popStripBom(text).split(/\r?\n/)){
    const m=rawLine.match(/^([A-Z0-9]{2})\s{0,2}-\s?(.*)$/);if(m){const tag=m[1],val=m[2]||'';if(tag==='ER'){push();continue}add(tag,val);lastTag=tag;continue}
    if(rawLine.trim()&&lastTag){const prev=rec[lastTag];if(Array.isArray(prev))prev[prev.length-1]+=' '+rawLine.trim();else rec[lastTag]=String(prev||'')+' '+rawLine.trim()}
  }push();if(!records.length)throw new Error('RIS sem registros reconhecíveis.');return records;
}
function detectPopFormat(fileName,text){const ext=String(fileName||'').toLowerCase().split('.').pop(),s=popStripBom(text).trim();if(ext==='jsonl'||ext==='ndjson')return'jsonl';if(ext==='json')return'json';if(ext==='csv')return'csv';if(ext==='ris')return'ris';if(/^TY\s*-\s/m.test(s)||/\nER\s*-\s/m.test(s))return'ris';if(s.startsWith('['))return'json';if(s.startsWith('{')&&s.split(/\r?\n/).filter(Boolean).length>1)return'jsonl';if(/(^|[,;\t])Title([,;\t]|$)/i.test(s.split(/\r?\n/,1)[0]||''))return'csv';throw new Error('Formato não reconhecido. Use JSON, JSONL, CSV ou RIS exportado pelo Publish or Perish.')}
function parsePopFileText(format,text){if(format==='json')return parsePopJson(text);if(format==='jsonl')return parsePopJsonl(text);if(format==='csv')return parsePopCsv(text);if(format==='ris')return parsePopRis(text);throw new Error('Formato Publish or Perish não suportado.')}

function normalizePopRecord(raw,format='json'){
  const ris=format==='ris';const m1=[popGet(raw,'M1')].flat().filter(Boolean).join(' | '),n1=[popGet(raw,'N1')].flat().filter(Boolean).join(' | ');
  const citesFromNotes=(()=>{const m=(m1+' '+n1).match(/(?:cited\s*by[^:]*:\s*|\b)(\d+)\s+cites?\b/i)||(m1+' '+n1).match(/cited\s*by[^:]*:\s*(\d+)/i);return m?Number(m[1]):null})();
  const queryDate=popCleanText(popGet(raw,'query_date','QueryDate'))||((m1.match(/Query date:\s*(.+?)(?:\s*\||$)/i)||[])[1]||'');
  const authors=ris?[popGet(raw,'AU','A1')].flat().filter(v=>v!==undefined).map(popCleanText).filter(Boolean):popSplitAuthors(popGet(raw,'authors','Authors'));
  const title=popCleanText(popGet(raw,'title','Title','TI','T1'));
  const venue=popCleanText(popGet(raw,'source','Source','Publication','JF','JO','T2'));
  const type=popCleanText(popGet(raw,'type','Type','M3','TY'));
  const year=popYear(popGet(raw,'year','Year','PY','Y1'));
  const doi=popCleanText(popGet(raw,'doi','DOI','DO'));
  const cites=popNum(popGet(raw,'cites','Cites'))??citesFromNotes;
  const out={
    title,authors,venue,type,year,doi,
    publisher:popCleanText(popGet(raw,'publisher','Publisher','PB')),
    issn:popCleanText(popGet(raw,'issn','ISSN','SN')),
    volume:popCleanText(popGet(raw,'volume','Volume','VL')),
    issue:popCleanText(popGet(raw,'issue','Issue','IS')),
    startPage:popCleanText(popGet(raw,'startpage','StartPage','SP')),
    endPage:popCleanText(popGet(raw,'endpage','EndPage','EP')),
    abstract:popCleanText(popGet(raw,'abstract','Abstract','AB')),
    articleUrl:popCleanText(popGet(raw,'article_url','ArticleURL','UR')),
    citationUrl:popCleanText(popGet(raw,'citation_url','CitationURL')),
    citesUrl:popCleanText(popGet(raw,'cites_url','CitesURL')),
    cites,ecc:popNum(popGet(raw,'ecc','ECC')),rank:popNum(popGet(raw,'rank','GSRank')),
    citesPerYear:popNum(popGet(raw,'CitesPerYear','cites_per_year')),
    citesPerAuthor:popNum(popGet(raw,'CitesPerAuthor','cites_per_author')),
    authorCount:popNum(popGet(raw,'AuthorCount','author_count')),
    age:popNum(popGet(raw,'Age','age')),queryDate:popCleanText(queryDate),
    use:popGet(raw,'use','Use')===false||String(popGet(raw,'use','Use')).toLowerCase()==='false'?false:true,
    raw
  };
  return out;
}

function popRisClean(v){return popCleanText(v).replace(/[\r\n]+/g,' ')}
function popRisType(item){const key=item?.classification?.key||item?.patch?.classification?.key||'';const declared=popCleanText(item?.type||item?.patch?.type);if(declared&&/^[A-Z]{3,4}$/.test(declared))return declared;return({ARTIGO:'JOUR',LIVRO:'BOOK',CAPITULO:'CHAP',EVENTO:'CONF',PREPRINT:'UNPB',TEXTO:'NEWS',SOFTWARE:'COMP',DATASET:'DATA',RELATORIO:'RPRT',PARECER:'GEN',PATENTE:'PAT',FORMACAO:'THES'}[key]||'GEN')}
function popRisRecord(item){
  const p=item?.patch||item||{},metrics=item?.popMetrics||{};const authors=Array.isArray(p.authors)?p.authors:popSplitAuthors(p.authors);const lines=[];const add=(tag,val)=>{const s=popRisClean(val);if(s)lines.push(`${tag}  - ${s}`)};
  add('TY',popRisType(item));for(const a of authors)add('AU',a);add('TI',item?.title||p.title);add('JF',p.venue||p.source);add('PB',p.publisher);add('DO',p.doi);add('SN',p.issn);add('UR',p.articleUrl||p.article_url);if(p.year)add('PY',`${popYear(p.year)}///`);add('VL',p.volume);add('IS',p.issue);add('SP',p.startPage||p.startpage);add('EP',p.endPage||p.endpage);add('AB',p.abstract);add('M3',p.type||item?.classification?.label||p.classification?.label);add('M1',`Query date: ${new Date().toISOString().slice(0,19).replace('T',' ')}`);if(Number.isFinite(Number(metrics.cites??p.cites))){const n=Number(metrics.cites??p.cites);add('M1',`${n} cites${metrics.citesUrl||p.citesUrl?': '+(metrics.citesUrl||p.citesUrl):''}`)}lines.push('ER  - ');return lines.join('\r\n')}
function recordsToPopRis(items){return '\uFEFF'+(items||[]).map(popRisRecord).join('\r\n\r\n')+'\r\n'}

async function readPopFile(file){const bytes=new Uint8Array(await file.arrayBuffer());try{return{text:new TextDecoder('utf-8',{fatal:true}).decode(bytes),encoding:'UTF-8'}}catch{try{return{text:new TextDecoder('windows-1252').decode(bytes),encoding:'Windows-1252'}}catch{return{text:new TextDecoder().decode(bytes),encoding:'UTF-8 (substituição)'}}}}
function popHIndex(xs){const cites=xs.map(x=>Number(x.popMetrics?.cites)||0).sort((a,b)=>b-a);let h=0;cites.forEach((c,i)=>{if(c>=i+1)h=i+1});return h}
function popCandidates(){return (state?.externalCandidates||[]).filter(x=>(x.sources||[]).includes(POP_SOURCE))}
function decoratePopCandidate(candidate,r,meta){
  candidate.publisher=candidate.publisher||r.publisher;candidate.issn=candidate.issn||r.issn;candidate.volume=candidate.volume||r.volume;candidate.issue=candidate.issue||r.issue;candidate.startPage=candidate.startPage||r.startPage;candidate.endPage=candidate.endPage||r.endPage;candidate.abstract=candidate.abstract||r.abstract;candidate.articleUrl=candidate.articleUrl||r.articleUrl;candidate.citationUrl=candidate.citationUrl||r.citationUrl;candidate.citesUrl=candidate.citesUrl||r.citesUrl;
  const old=candidate.popMetrics||{},numbers=['cites','ecc','citesPerYear','citesPerAuthor','authorCount','age'];const next={...old};for(const k of numbers){if(r[k]!==null&&r[k]!==undefined){if(k==='cites'||k==='ecc')next[k]=Math.max(Number(old[k])||0,Number(r[k])||0);else next[k]=Number(r[k])}}if(r.rank!==null&&r.rank!==undefined)next.rank=old.rank===undefined?Number(r.rank):Math.min(Number(old.rank)||Infinity,Number(r.rank));next.queryDate=r.queryDate||old.queryDate||'';next.articleUrl=r.articleUrl||old.articleUrl||'';next.citationUrl=r.citationUrl||old.citationUrl||'';next.citesUrl=r.citesUrl||old.citesUrl||'';candidate.popMetrics=next;
  const prov=candidate.popProvenance||{files:[],formats:[],encodings:[]};if(meta.fileName&&!prov.files.includes(meta.fileName))prov.files.push(meta.fileName);if(meta.format&&!prov.formats.includes(meta.format))prov.formats.push(meta.format);if(meta.encoding&&!prov.encodings.includes(meta.encoding))prov.encodings.push(meta.encoding);prov.lastImportedAt=new Date().toISOString();candidate.popProvenance=prov;
}
function restorePopCandidate(snapshot){const c=addExternalCandidate({source:POP_SOURCE,title:snapshot.title,doi:snapshot.doi,year:snapshot.year,venue:snapshot.venue,type:snapshot.type,authors:snapshot.authors||[],raw:snapshot.rawBySource?.[POP_SOURCE]||snapshot.raw||null});if(snapshot.popMetrics)c.popMetrics=snapshot.popMetrics;if(snapshot.popProvenance)c.popProvenance=snapshot.popProvenance;for(const k of ['publisher','issn','volume','issue','startPage','endPage','abstract','articleUrl','citationUrl','citesUrl'])if(snapshot[k]&&!c[k])c[k]=snapshot[k];return c}

function renderPopSummary(){if(typeof document==='undefined')return;const xs=popCandidates(),sum=xs.reduce((n,x)=>n+(Number(x.popMetrics?.cites)||0),0),missing=xs.filter(x=>x.reconciliation?.status==='likely-new').length,withDoi=xs.filter(x=>x.doi).length;const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=String(v)};set('popCount',xs.length);set('popCites',sum);set('popH',popHIndex(xs));set('popLikelyNew',missing);const meta=document.getElementById('popSummaryMeta');if(meta){const last=state.settings?.popInterop;meta.textContent=xs.length?`${withDoi} com DOI · ${last?.files?.length||0} arquivo(s) na última importação · métricas mantidas separadas dos campos Lattes`:'Nenhum resultado do Publish or Perish importado.'}const ec=document.getElementById('exportPopCandidates');if(ec)ec.disabled=!(state.externalCandidates||[]).length;const eq=document.getElementById('exportPopQueue');if(eq)eq.disabled=!(state.queue||[]).length;const rm=document.getElementById('removePopImport');if(rm)rm.disabled=!xs.length}
function ensurePopUi(){
  if(typeof document==='undefined'||document.getElementById('popInteropCard'))return;const panel=document.getElementById('external');if(!panel)return;const card=document.createElement('div');card.id='popInteropCard';card.className='section card';card.innerHTML=`<div class="section-head"><h3>Publish or Perish</h3><span class="badge ok">interoperabilidade por arquivo</span></div><div class="notice"><strong>Integração bibliométrica.</strong> Importe exportações do Publish or Perish em JSON, JSON Lines, CSV ou RIS. JSON é recomendado por preservar o conjunto mais completo de campos. Citações, rank e URLs permanecem como metadados externos e não são tratados como campos do Currículo Lattes.</div><div class="row"><label class="btn primary filebtn">Importar resultados do PoP<input id="popImportFiles" type="file" multiple accept=".json,.jsonl,.ndjson,.csv,.ris,application/json,text/csv,text/plain"></label><button class="btn" id="exportPopCandidates">Exportar candidatos em RIS</button><button class="btn" id="exportPopQueue">Exportar fila em RIS</button><button class="btn danger" id="removePopImport">Remover dados PoP</button></div><div class="grid" style="margin-top:14px"><div class="card metric"><div class="n" id="popCount">0</div><div class="label">registros PoP</div></div><div class="card metric"><div class="n" id="popCites">0</div><div class="label">citações do conjunto</div></div><div class="card metric"><div class="n" id="popH">0</div><div class="label">h-index do conjunto</div></div><div class="card metric"><div class="n" id="popLikelyNew">0</div><div class="label">prováveis ausências no Lattes</div></div></div><div class="small" id="popSummaryMeta" style="margin-top:10px"></div><div class="small" id="popImportStatus" style="margin-top:6px"></div>`;
  const first=panel.querySelector('.section.card');if(first)first.insertAdjacentElement('afterend',card);else panel.appendChild(card);
  document.getElementById('popImportFiles')?.addEventListener('change',handlePopImport);
  document.getElementById('exportPopCandidates')?.addEventListener('click',()=>{const xs=state.externalCandidates||[];if(xs.length)download('lattes-assist-para-publish-or-perish.ris',recordsToPopRis(xs))});
  document.getElementById('exportPopQueue')?.addEventListener('click',()=>{const xs=state.queue||[];if(xs.length)download('lattes-assist-fila-para-publish-or-perish.ris',recordsToPopRis(xs))});
  document.getElementById('removePopImport')?.addEventListener('click',removePopImport);
  const info=document.getElementById('externalProspectingInfo');if(info&&!info.textContent.includes('Publish or Perish'))info.textContent+=' · Publish or Perish';renderPopSummary();
}
async function handlePopImport(e){
  const files=[...(e.target.files||[])],status=document.getElementById('popImportStatus');if(!files.length)return;if(status)status.textContent='Lendo e validando arquivos do Publish or Perish…';const batches=[],errors=[];
  for(const file of files){try{const read=await readPopFile(file),format=detectPopFormat(file.name,read.text),raw=parsePopFileText(format,read.text),records=raw.map(x=>normalizePopRecord(x,format));batches.push({file,format,encoding:read.encoding,records})}catch(err){errors.push(`${file.name}: ${err.message}`)}}
  let imported=0,skipped=0;for(const batch of batches){for(const r of batch.records){if(!r.title||r.use===false){skipped++;continue}const candidate=addExternalCandidate({source:POP_SOURCE,title:typeof normalizeDisplayText==='function'?normalizeDisplayText(r.title):r.title,doi:r.doi,year:r.year,venue:typeof normalizeDisplayText==='function'?normalizeDisplayText(r.venue):r.venue,type:r.type,authors:r.authors,raw:r.raw});decoratePopCandidate(candidate,r,{fileName:batch.file.name,format:batch.format,encoding:batch.encoding});imported++}}
  if(imported){if(!state.externalSources.includes(POP_SOURCE))state.externalSources.push(POP_SOURCE);state.settings=state.settings||{};state.settings.popInterop={lastImportedAt:new Date().toISOString(),files:batches.map(x=>x.file.name),formats:[...new Set(batches.map(x=>x.format))],records:imported,skipped,errors};save();if(typeof renderAll==='function')renderAll();if(typeof renderExternal==='function')renderExternal();renderPopSummary()}
  if(status)status.textContent=`Importação concluída: ${imported} registro(s) processado(s), ${skipped} ignorado(s).${errors.length?' Atenção: '+errors.join(' | '):''}`;e.target.value='';
}
function removePopImport(){if(!confirm('Remover a proveniência e os registros que existem somente por importação do Publish or Perish? Registros que também vieram de outras fontes serão preservados.'))return;const kept=[];for(const c of state.externalCandidates||[]){if(!(c.sources||[]).includes(POP_SOURCE)){kept.push(c);continue}c.sources=(c.sources||[]).filter(s=>s!==POP_SOURCE);if(c.rawBySource)delete c.rawBySource[POP_SOURCE];delete c.popMetrics;delete c.popProvenance;if(c.sources.length)kept.push(c)}state.externalCandidates=kept;state.externalSources=(state.externalSources||[]).filter(s=>s!==POP_SOURCE);if(state.settings?.popInterop)delete state.settings.popInterop;save();renderAll();renderExternal();renderPopSummary()}

function rebindExternalScanPreservingPop(){const old=document.getElementById('scanExternal');if(!old||old.dataset.popPreserve==='1'||typeof scanExternal!=='function')return;const original=scanExternal,b=old.cloneNode(true);b.dataset.popPreserve='1';old.replaceWith(b);b.addEventListener('click',async()=>{const snapshots=popCandidates().map(x=>JSON.parse(JSON.stringify(x)));await original();for(const s of snapshots)restorePopCandidate(s);if(snapshots.length&&!state.externalSources.includes(POP_SOURCE))state.externalSources.push(POP_SOURCE);save();renderAll();renderExternal();renderPopSummary()})}
function enhancePopRender(){if(typeof renderExternal!=='function'||renderExternal.__popEnhanced)return;const original=renderExternal;const wrapped=function(){const out=original.apply(this,arguments);ensurePopUi();renderPopSummary();return out};wrapped.__popEnhanced=true;renderExternal=wrapped}
function popBetaBranding(){const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.8 beta · Publish or Perish';const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.8 beta';const meta=document.querySelector('#rc5AccountStrip .rc5-meta div:last-child');if(meta)meta.textContent='v1.8 beta';document.title='Lattes Assist v1.8 beta'}

globalThis.LattesPopInterop={parsePopJson,parsePopJsonl,parsePopCsv,parsePopRis,detectPopFormat,parsePopFileText,normalizePopRecord,recordsToPopRis,popRisRecord};
if(typeof document!=='undefined'&&typeof state!=='undefined'){
  enhancePopRender();ensurePopUi();rebindExternalScanPreservingPop();popBetaBranding();setTimeout(()=>{ensurePopUi();rebindExternalScanPreservingPop();popBetaBranding();renderPopSummary()},900);setTimeout(popBetaBranding,1800);
}
