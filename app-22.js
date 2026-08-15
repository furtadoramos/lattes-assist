queryOpenAlexExternal=async function(name,orcid){
  const c=await loadSupabaseClient();
  const {data,error}=await c.functions.invoke('openalex-public',{body:{name,orcid}});
  if(error)throw new Error('OpenAlex backend: '+error.message);
  if(!data?.configured)throw new Error('OpenAlex ainda sem chave de API configurada no backend');
  if(!data?.author)throw new Error('OpenAlex: autor não identificado com segurança');
  const author=data.author||{};
  (data.works||[]).forEach(x=>addExternalCandidate({
    source:'OpenAlex',
    title:normalizeDisplayText(x.display_name||x.title||''),
    doi:x.doi||'',
    year:x.publication_year||'',
    venue:normalizeDisplayText(x.primary_location?.source?.display_name||''),
    type:x.type||'',
    authors:(x.authorships||[]).map(a=>a.author?.display_name).filter(Boolean),
    raw:{...x,_matchedAuthor:{id:author.id,display_name:author.display_name,orcid:author.orcid}},
    orcidVerified:Boolean(orcid&&String(author.orcid||'').includes(orcid))
  }));
  state.externalSources.push('OpenAlex');
};

function refreshExternalConnectorStatus(){
  const sources=$('#sources');if(!sources)return;
  const cards=[...sources.querySelectorAll('.source')];
  for(const card of cards){
    const strong=card.querySelector('strong');if(!strong)continue;
    const label=strong.textContent||'',small=card.querySelector('.small'),badge=card.querySelector('.badge');
    if(label.includes('ORCID Public API')){
      if(small)small.textContent='Conector seguro no Supabase para trabalhos públicos e peer reviews. Torna-se operacional após configurar as credenciais ORCID Public API no backend.';
      if(badge){badge.textContent='backend preparado';badge.className='badge warn'}
    }
    if(label.includes('Outras fontes')){
      if(small)small.textContent='DataCite e Crossref funcionam diretamente; OpenAlex usa conector seguro no backend porque a API passou a exigir chave. Registros Zenodo com DOI/ORCID podem aparecer via DataCite.';
      if(badge){badge.textContent='multi-fonte';badge.className='badge ok'}
    }
  }
  const info=document.getElementById('externalProspectingInfo');if(info)info.textContent='Crossref + DataCite · OpenAlex/ORCID via backend';
}
refreshExternalConnectorStatus();