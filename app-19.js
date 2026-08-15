function installEncodingCompatibility(){
  const old=$('#xmlInput');
  if(old){
    const fresh=old.cloneNode(true);
    old.replaceWith(fresh);
    fresh.addEventListener('change',async e=>{
      const f=e.target.files?.[0];if(!f)return;
      try{
        const info=await decodeXmlFile(f);
        parseLattes(info.text,f.name);
        if(state.cv){state.cv.encoding=info.encoding;state.cv.encodingCorrected=info.corrected;state.cv.mojibakeBefore=info.mojibakeBefore;state.cv.mojibakeAfter=info.mojibakeAfter;persistParsed();renderAll();const meta=$('#cvMeta');if(meta)meta.textContent+=(meta.textContent?' · ':'')+encodingDiagnosticLabel(info)}
      }catch(err){alert(err.message)}
      finally{e.target.value=''}
    });
  }
}
async function findDoi(id){
  const a=state.articles.find(x=>x.id===id);if(!a)return;
  try{
    const params=new URLSearchParams({'query.bibliographic':crossrefQueryTitle(a.title),'rows':'5','select':'DOI,title,author,published-print,published-online,container-title,ISSN,volume,issue,page'});if(state.settings.email)params.set('mailto',state.settings.email);
    const r=await fetch('https://api.crossref.org/works?'+params.toString());if(!r.ok)throw new Error('Crossref respondeu '+r.status);const j=await r.json();
    const candidates=(j.message?.items||[]).map(x=>({raw:x,title:(x.title||[])[0]||'',doi:x.DOI||'',year:(x['published-print']?.['date-parts']?.[0]?.[0]||x['published-online']?.['date-parts']?.[0]?.[0]||'').toString()})).map(x=>({...x,score:jaccard(a.title,x.title)+(a.year&&x.year&&a.year===x.year?.toString()?.trim()?0.08:0)})).sort((x,y)=>y.score-x.score);
    const best=candidates[0],safe=best&&best.doi&&best.score>=.68;
    state.updates=state.updates.filter(x=>x.articleId!==id);state.updates.push({articleId:id,status:safe?'found':'none',doi:safe?best.doi:'',score:best?.score||0,candidates:candidates.slice(0,3),checkedAt:new Date().toISOString(),source:'Crossref'});renderUpdates();
  }catch(e){alert('Não foi possível consultar o Crossref: '+e.message)}
}
async function findDoiSilent(id){
  const a=state.articles.find(x=>x.id===id);if(!a)return;
  try{
    const params=new URLSearchParams({'query.bibliographic':crossrefQueryTitle(a.title),'rows':'5','select':'DOI,title,author,published-print,published-online,container-title,ISSN,volume,issue,page'});if(state.settings.email)params.set('mailto',state.settings.email);
    const r=await fetch('https://api.crossref.org/works?'+params.toString());if(!r.ok)throw new Error('Crossref '+r.status);const j=await r.json();
    const cs=(j.message?.items||[]).map(x=>({raw:x,title:(x.title||[])[0]||'',doi:x.DOI||'',year:(x['published-print']?.['date-parts']?.[0]?.[0]||x['published-online']?.['date-parts']?.[0]?.[0]||'').toString()})).map(x=>({...x,score:jaccard(a.title,x.title)+(a.year&&x.year&&a.year===x.year?0.08:0)})).sort((x,y)=>y.score-x.score);const b=cs[0],safe=b&&b.doi&&b.score>=.68;
    state.updates=state.updates.filter(x=>x.articleId!==id);state.updates.push({articleId:id,status:safe?'found':'none',doi:safe?b.doi:'',score:b?.score||0,candidates:cs.slice(0,3),checkedAt:new Date().toISOString(),source:'Crossref'});
  }catch{state.updates=state.updates.filter(x=>x.articleId!==id);state.updates.push({articleId:id,status:'error',doi:'',score:0,candidates:[],source:'Crossref'});}
}
installEncodingCompatibility();