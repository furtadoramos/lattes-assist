let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;document.getElementById('installBanner')?.classList.add('on');});
window.addEventListener('appinstalled',()=>{document.getElementById('installBanner')?.classList.remove('on');deferredInstallPrompt=null;});
document.getElementById('installAppBtn')?.addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();try{await deferredInstallPrompt.userChoice}catch{}deferredInstallPrompt=null;document.getElementById('installBanner')?.classList.remove('on');});
document.getElementById('dismissInstall')?.addEventListener('click',()=>document.getElementById('installBanner')?.classList.remove('on'));