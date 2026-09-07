'use strict';
window.PAKKOM_MODULES.push('bootstrap');
if(PAKKOM_BOOT_OK){
['click','touchstart','keydown','scroll','pointerdown'].forEach(function(evt){document.addEventListener(evt,markActivity,{passive:true});});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')registerExamViolation();else checkIdle();});window.addEventListener('focus',checkIdle);window.addEventListener('offline',function(){networkWasOffline=true;showNetworkState(true);});window.addEventListener('online',function(){if(networkWasOffline){networkWasOffline=false;showNetworkState(false);if(state.currentExam)getAttempt(state.currentExam.id).then(function(at){if(at&&at.status==='in_progress')saveActiveExam(state.currentExam.id);});}});setInterval(checkIdle,30000);

auth.onAuthStateChanged(function(){if(!window.__pakkom_started){window.__pakkom_started=true;home();}});
}
