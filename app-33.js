const RC6_VERSION='1.7 RC6';
function rc6Branding(){
  const bp=document.querySelector('.brand p');if(bp)bp.textContent='curadoria curricular inteligente · v1.7 RC6';
  const gate=document.querySelector('#authGate .beta');if(gate)gate.textContent='v1.7 RC6';
  const meta=document.querySelector('#rc5AccountStrip .rc5-meta div:last-child');if(meta)meta.textContent='v1.7 RC6';
  const footer=document.querySelector('.footer');if(footer)footer.textContent=footer.textContent.replace(/Lattes Assist v1\.7 RC5|Lattes Assist v1\.7 RC4|Lattes Assist v1\.7 RC3|Lattes Assist v1\.6/g,'Lattes Assist v1.7 RC6');
}
rc6Branding();setTimeout(rc6Branding,650);
