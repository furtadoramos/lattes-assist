const POP2_VERSION='1.8-beta-pop2';

function pop2RefreshExportUi(){
  if(typeof document==='undefined')return;
  const popOnly=document.getElementById('exportPopCandidates');
  const all=document.getElementById('exportAllCandidatesRis');
  const queue=document.getElementById('exportPopQueue');
  if(popOnly)popOnly.disabled=!((typeof popCandidates==='function'?popCandidates():[]).length);
  if(all)all.disabled=!((state?.externalCandidates||[]).length);
  if(queue)queue.disabled=!((state?.queue||[]).length);
}

function pop2InstallExportScopes(){
  if(typeof document==='undefined')return;
  const old=document.getElementById('exportPopCandidates');
  if(!old)return;
  let popOnly=old;
  if(old.dataset.pop2!=='1'){
    popOnly=old.cloneNode(true);
    old.replaceWith(popOnly);
    popOnly.dataset.pop2='1';
    popOnly.textContent='Exportar somente registros PoP em RIS';
    popOnly.addEventListener('click',()=>{
      const xs=typeof popCandidates==='function'?popCandidates():[];
      if(xs.length)download('lattes-assist-registros-publish-or-perish.ris',recordsToPopRis(xs));
    });
  }
  if(!document.getElementById('exportAllCandidatesRis')){
    const b=document.createElement('button');
    b.className='btn';
    b.id='exportAllCandidatesRis';
    b.textContent='Exportar candidatos consolidados em RIS';
    b.addEventListener('click',()=>{
      const xs=state?.externalCandidates||[];
      if(xs.length)download('lattes-assist-candidatos-consolidados-para-publish-or-perish.ris',recordsToPopRis(xs));
    });
    popOnly.insertAdjacentElement('afterend',b);
  }
  const card=document.getElementById('popInteropCard');
  if(card&&!document.getElementById('popExportScopeNote')){
    const note=document.createElement('div');
    note.id='popExportScopeNote';
    note.className='small';
    note.style.marginTop='8px';
    note.textContent='Escopo RIS: “somente registros PoP” reproduz apenas as publicações importadas do Publish or Perish; “candidatos consolidados” inclui também registros reconciliados de Crossref, OpenAlex, DataCite, ORCID e outras fontes.';
    const status=document.getElementById('popImportStatus');
    (status||card).insertAdjacentElement(status?'beforebegin':'beforeend',note);
  }
  pop2RefreshExportUi();
}

function pop2WrapSummary(){
  if(typeof renderPopSummary!=='function'||renderPopSummary.__pop2)return;
  const original=renderPopSummary;
  const wrapped=function(){const out=original.apply(this,arguments);pop2InstallExportScopes();pop2RefreshExportUi();return out};
  wrapped.__pop2=true;
  renderPopSummary=wrapped;
}

function pop2Branding(){
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.8 beta · Publish or Perish';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.8 beta';
  const meta=document.querySelector('#rc5AccountStrip .rc5-meta div:last-child');if(meta)meta.textContent='v1.8 beta';
  document.title='Lattes Assist v1.8 beta';
}

if(typeof document!=='undefined'&&typeof state!=='undefined'){
  pop2WrapSummary();
  pop2InstallExportScopes();
  pop2Branding();
  setTimeout(()=>{pop2WrapSummary();pop2InstallExportScopes();pop2Branding()},700);
  setTimeout(()=>{pop2InstallExportScopes();pop2RefreshExportUi()},1600);
}
