const STABLE_VERSION_V18='1.8';
function stableBrandingV18(){
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.8';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.8';
  const meta=document.querySelector('#rc5AccountStrip .rc5-meta div:last-child');if(meta)meta.textContent='v1.8';
  const footer=document.querySelector('.footer');if(footer)footer.textContent=footer.textContent.replace(/Lattes Assist v1\.8 b[e]ta|Lattes Assist v1\.7 RC7|Lattes Assist v1\.7 RC6|Lattes Assist v1\.7 RC5|Lattes Assist v1\.7 RC4|Lattes Assist v1\.7 RC3|Lattes Assist v1\.7|Lattes Assist v1\.6/g,'Lattes Assist v1.8');
  document.title='Lattes Assist v1.8';
}
try{if(typeof popBetaBranding==='function')popBetaBranding=stableBrandingV18}catch{}
try{if(typeof pop2Branding==='function')pop2Branding=stableBrandingV18}catch{}
try{if(typeof pop3Branding==='function')pop3Branding=stableBrandingV18}catch{}
try{if(typeof pop4Branding==='function')pop4Branding=stableBrandingV18}catch{}
stableBrandingV18();
setTimeout(stableBrandingV18,800);
setTimeout(stableBrandingV18,1200);
setTimeout(stableBrandingV18,2200);
