function buildRetrospective(){
  const rows=[];
  const matchedByRecord=new Map();
  state.documents.forEach(d=>{
    const r=d.reconciliation||{};
    if(r.status==='matched'&&r.recordId){
      if(!matchedByRecord.has(r.recordId))matchedByRecord.set(r.recordId,[]);
      matchedByRecord.get(r.recordId).push(d);
    }
  });

  // Curricular records: confirmed when at least one document points to the record.
  state.records.forEach(rec=>{
    const docs=matchedByRecord.get(rec.id)||[];
    rows.push({
      id:`retro-rec-${rec.id}`,
      status:docs.length?'REGISTERED_CONFIRMED':'REGISTERED_NO_EVIDENCE',
      year:rec.year||'',
      category:rec.categoryLabel||rec.category,
      title:rec.title||rec.subtypeLabel,
      source:'Lattes XML',
      recordId:rec.id,
      evidenceCount:docs.length,
      matchLabel:docs.length?`${docs.length} evidência(s) vinculada(s)`:'nenhuma evidência documental vinculada'
    });
  });

  // Documents not safely matched.
  state.documents.forEach(d=>{
    const r=d.reconciliation||{};
    if(r.status==='candidate-missing'){
      rows.push({
        id:`retro-doc-${d.id}`,
        status:'EVIDENCED_PROBABLY_MISSING',
        year:(d.fields?.years||[])[0]||'',
        category:d.classification?.label||'Documento',
        title:d.fields?.title||d.name,
        source:'Evidência documental',
        documentId:d.id,
        matchLabel:r.nearest?`mais próximo: ${r.nearest}`:'nenhuma correspondência segura'
      });
    } else if(r.status==='uncertain' || r.status==='not-comparable'){
      rows.push({
        id:`retro-doc-${d.id}`,
        status:'UNCERTAIN',
        year:(d.fields?.years||[])[0]||'',
        category:d.classification?.label||'Documento',
        title:d.fields?.title||d.name,
        source:'Evidência documental',
        documentId:d.id,
        matchLabel:r.title||r.nearest||r.label||'evidência insuficiente'
      });
    }
  });

  // Duplicate findings from curricular audit.
  state.audit.filter(f=>String(f.type||'').includes('duplicate')).forEach((f,i)=>{
    const x=f.article||f.record||{};
    rows.push({
      id:`retro-dup-${i}`,
      status:'POSSIBLE_DUPLICATE',
      year:x.year||'',
      category:x.categoryLabel||'Produção bibliográfica',
      title:x.title||x.subtypeLabel||'Registro',
      source:'Auditoria do XML',
      matchLabel:f.message||'possível duplicidade'
    });
  });

  state.retrospective=rows;
}
function retroBadge(status){
  const map={
    REGISTERED_CONFIRMED:['ok','cadastrado e comprovado'],
    REGISTERED_NO_EVIDENCE:['neutral','cadastrado sem evidência'],
    EVIDENCED_PROBABLY_MISSING:['bad','provavelmente ausente'],
    UNCERTAIN:['warn','incerto'],
    POSSIBLE_DUPLICATE:['bad','possível duplicidade']
  };
  const [cls,label]=map[status]||['neutral',status];
  return `<span class="badge ${cls}">${label}</span>`;
}
function renderRetrospective(){
  buildRetrospective();
  const f=state.runtime.retroFilter||'';
  const rows=state.retrospective.filter(x=>!f||x.status===f);
  const count=s=>state.retrospective.filter(x=>x.status===s).length;
  $('#rConfirmed').textContent=count('REGISTERED_CONFIRMED');
  $('#rNoEvidence').textContent=count('REGISTERED_NO_EVIDENCE');
  $('#rProbMissing').textContent=count('EVIDENCED_PROBABLY_MISSING');
  $('#rUncertain').textContent=count('UNCERTAIN');
  $('#rDuplicates').textContent=count('POSSIBLE_DUPLICATE');
  $('#retroCount').textContent=state.retrospective.length?`${rows.length} de ${state.retrospective.length} item(ns)`:'';
  $('#exportRetro').disabled=!state.retrospective.length;
  $('#retroBody').innerHTML=rows.length?rows.slice(0,1200).map(x=>`<tr><td>${retroBadge(x.status)}</td><td>${esc(x.year||'—')}</td><td>${esc(x.category||'—')}</td><td class="titlecell"><strong>${esc(x.title||'—')}</strong><div class="small">${esc(x.source||'')}</div></td><td>${esc(x.matchLabel||'—')}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Nenhum item neste estado.</td></tr>';
}
function exportRetrospective(){
  buildRetrospective();
  download('lattes-assist-retrospectiva.json',JSON.stringify({
    schema:'lattes-assist.retrospective.v1.6',
    generatedAt:new Date().toISOString(),
    cv:state.cv,
    summary:{
      registeredConfirmed:state.retrospective.filter(x=>x.status==='REGISTERED_CONFIRMED').length,
      registeredNoEvidence:state.retrospective.filter(x=>x.status==='REGISTERED_NO_EVIDENCE').length,
      evidencedProbablyMissing:state.retrospective.filter(x=>x.status==='EVIDENCED_PROBABLY_MISSING').length,
      uncertain:state.retrospective.filter(x=>x.status==='UNCERTAIN').length,
      possibleDuplicate:state.retrospective.filter(x=>x.status==='POSSIBLE_DUPLICATE').length
    },
    items:state.retrospective
  },null,2));
}


function yearOfRetro(x){
  const y=String(x.year||'').match(/\b(19|20)\d{2}\b/);
  return y?y[0]:'';
}
function buildTimeline(){
  buildRetrospective();
  const cat=state.runtime.timelineCategory||'';
  const rows=state.retrospective.filter(x=>!cat||x.category===cat);
  const byYear=new Map();
  for(const x of rows){
    const y=yearOfRetro(x); if(!y)continue;
    if(!byYear.has(y))byYear.set(y,{year:y,records:0,confirmed:0,noEvidence:0,probMissing:0,uncertain:0,duplicates:0});
    const r=byYear.get(y);
    if(x.source==='Lattes XML')r.records++;
    if(x.status==='REGISTERED_CONFIRMED')r.confirmed++;
    if(x.status==='REGISTERED_NO_EVIDENCE')r.noEvidence++;
    if(x.status==='EVIDENCED_PROBABLY_MISSING')r.probMissing++;
    if(x.status==='UNCERTAIN')r.uncertain++;
    if(x.status==='POSSIBLE_DUPLICATE')r.duplicates++;
  }
  return [...byYear.values()].sort((a,b)=>Number(a.year)-Number(b.year));
}
function drawLineChart(canvas,series,keys,labels){
  const ctx=canvas.getContext('2d');const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);
  const pad={l:54,r:24,t:24,b:44};const pw=W-pad.l-pad.r,ph=H-pad.t-pad.b;
  const max=Math.max(1,...series.flatMap(r=>keys.map(k=>r[k]||0)));
  ctx.strokeStyle='#cfc8bd';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,H-pad.b);ctx.lineTo(W-pad.r,H-pad.b);ctx.stroke();
  ctx.fillStyle='#6d7478';ctx.font='12px system-ui';
  for(let i=0;i<=4;i++){const v=Math.round(max*i/4);const y=H-pad.b-ph*i/4;ctx.fillText(String(v),8,y+4);ctx.strokeStyle='#ece7df';ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke()}
  if(!series.length){ctx.fillText('Sem dados',pad.l+20,pad.t+30);return}
  const xFor=i=>series.length===1?pad.l+pw/2:pad.l+pw*i/(series.length-1), yFor=v=>H-pad.b-(v/max)*ph;
  const strokePalette=['#1f5f58','#b45d3b','#9a6b17','#4d5d8c','#7a4c72'];
  keys.forEach((k,ki)=>{ctx.strokeStyle=strokePalette[ki%strokePalette.length];ctx.lineWidth=2;ctx.beginPath();series.forEach((r,i)=>{const x=xFor(i),y=yFor(r[k]||0);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.stroke();series.forEach((r,i)=>{ctx.beginPath();ctx.fillStyle=strokePalette[ki%strokePalette.length];ctx.arc(xFor(i),yFor(r[k]||0),3,0,Math.PI*2);ctx.fill()})});
  const step=Math.max(1,Math.ceil(series.length/10));series.forEach((r,i)=>{if(i%step===0||i===series.length-1){ctx.fillStyle='#6d7478';ctx.save();ctx.translate(xFor(i),H-pad.b+18);ctx.rotate(-.5);ctx.fillText(r.year,0,0);ctx.restore()}});
  let lx=pad.l;labels.forEach((lab,i)=>{ctx.fillStyle=strokePalette[i%strokePalette.length];ctx.fillRect(lx,pad.t-12,10,10);ctx.fillStyle='#50565a';ctx.fillText(lab,lx+15,pad.t-3);lx+=15+ctx.measureText(lab).width+20});
}
