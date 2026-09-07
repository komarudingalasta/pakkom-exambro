'use strict';
window.PAKKOM_MODULES=window.PAKKOM_MODULES||[];window.PAKKOM_MODULES.push('core');
window.PAKKOM_VERSION='20.1';
var app=document.getElementById('app'),boot=document.getElementById('boot');
var db,auth;
var SESSION_KEY='pakkom_v12_lite_student';
var ACTIVE_EXAM_KEY='pakkom_v12_lite_active_exam';
var EXAM_WARN_KEY='pakkom_v16_exam_warnings';
var SERVER_OFFSET_MS=0,SERVER_TIME_SYNCED=false,monitorUnsubs=[];
var INACTIVITY_LIMIT=12*60*60*1000, ACTIVITY_WRITE_GAP=15000,EXAM_SESSION_HEARTBEAT=60000,lastWrite=0,examSessionHeartbeatHandle=null;
var state={classId:'',student:null,exams:[],currentExam:null};
var classList=[],adminStudents=[],examTimerHandle=null,examGuardActive=false,lastExamViolationAt=0,networkWasOffline=false;
var branding={appName:'PakKom Exambro',schoolName:'',logoDataUrl:''};

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function el(id){return document.getElementById(id);}
function msg(id,text,type){var n=el(id);if(n)n.innerHTML='<div class="'+(type||'error')+'">'+esc(text)+'</div>';}
function hideBoot(){if(boot)boot.classList.add('hide');}
function fatal(s){if(window.PAKKOM_BOOT_ERROR)window.PAKKOM_BOOT_ERROR(s);}
function https(u){return /^https:\/\//i.test(String(u||''));}
function fmt(ts){try{var d=ts&&ts.toDate?ts.toDate():(ts instanceof Date?ts:null);return d?d.toLocaleString('id-ID'):'-';}catch(e){return '-';}}
function toDate(ts){try{return ts&&ts.toDate?ts.toDate():(ts instanceof Date?ts:null);}catch(e){return null;}}
function dateKey(ts){var d=toDate(ts);if(!d)return '9999-99-99';return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function dateInfo(ts){var d=toDate(ts);if(!d)return {key:'9999-99-99',day:'Tanpa jadwal',date:'-',month:'',full:'Jadwal belum ditentukan',short:'Tanpa jadwal'};return {key:dateKey(ts),day:d.toLocaleDateString('id-ID',{weekday:'long'}),date:String(d.getDate()),month:d.toLocaleDateString('id-ID',{month:'short'}),full:d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),short:d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})};}
function timeOnly(ts){var d=toDate(ts);return d?d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}).replace('.',':'):'--:--';}
function nowMs(){return Date.now()+SERVER_OFFSET_MS;}
function nowDate(){return new Date(nowMs());}
async function syncServerClock(){try{if(!auth.currentUser)return;var ref=db.collection('timeSync').doc(auth.currentUser.uid);await ref.set({serverAt:firebase.firestore.FieldValue.serverTimestamp()});var d=await ref.get({source:'server'});var st=d.exists&&d.data().serverAt&&d.data().serverAt.toDate?d.data().serverAt.toDate():null;if(st){SERVER_OFFSET_MS=st.getTime()-Date.now();SERVER_TIME_SYNCED=true;}}catch(e){console.warn('server clock',e);} }
function serverClockLabel(){return SERVER_TIME_SYNCED?'Waktu server':'Waktu perangkat';}
function stopRealtimeMonitor(){monitorUnsubs.forEach(function(u){try{u();}catch(e){}});monitorUnsubs=[];}
function formatClock(ts){var d=toDate(ts);return d?d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).replace(/\./g,':'):'-';}
function sortExamsBySchedule(list){return list.slice().sort(function(a,b){var ad=toDate(a.startAt),bd=toDate(b.startAt),av=ad?ad.getTime():8640000000000000,bv=bd?bd.getTime():8640000000000000;return av-bv||String(a.name||'').localeCompare(String(b.name||''));});}
function groupByExamDate(list){var groups={},order=[];sortExamsBySchedule(list).forEach(function(x){var k=dateKey(x.startAt);if(!groups[k]){groups[k]=[];order.push(k);}groups[k].push(x);});return order.map(function(k){return {key:k,info:dateInfo(groups[k][0].startAt),items:groups[k]};});}
function sameDay(a,b){return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();}
function formatDuration(ms){if(ms<=0)return '00:00:00';var total=Math.floor(ms/1000),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),sec=total%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
function examDurationText(x){var st=toDate(x.startAt),en=toDate(x.endAt);if(!st||!en)return 'Durasi mengikuti penyelenggara';var mins=Math.max(0,Math.round((en-st)/60000));return mins+' menit';}
function stopExamTimer(){if(examTimerHandle){clearInterval(examTimerHandle);examTimerHandle=null;}}
function startExamTimer(x){stopExamTimer();var node=el('examCountdown');function tick(){if(!node)return stopExamTimer();var en=toDate(x.endAt);if(!en){node.textContent='Tanpa batas waktu';return;}var left=en.getTime()-nowMs();node.textContent=left>0?formatDuration(left):'00:00:00';node.classList.toggle('danger-time',left<=10*60*1000);if(left<=0)stopExamTimer();}tick();examTimerHandle=setInterval(tick,1000);}

async function sha256(s){var data=new TextEncoder().encode(String(s));var h=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');}
function brandName(){return branding.appName||'PakKom Exambro';}
function brandLogo(cls){var c=cls||'logo';return branding.logoDataUrl?'<span class="'+c+' brand-logo-img"><img src="'+esc(branding.logoDataUrl)+'" alt="Logo"></span>':'<span class="'+c+'">P</span>'; }
async function loadBranding(){try{var d=await db.collection('settings').doc('branding').get();if(d.exists){var x=d.data()||{};branding={appName:String(x.appName||'PakKom Exambro').trim()||'PakKom Exambro',schoolName:String(x.schoolName||'').trim(),logoDataUrl:String(x.logoDataUrl||'')};}}catch(e){console.warn('branding',e);}return branding;}
function examWarnMap(){try{return JSON.parse(localStorage.getItem(EXAM_WARN_KEY)||'{}')||{};}catch(e){return {};}}
function getExamWarningCount(examId){var m=examWarnMap();return Number(m[attemptId(examId)]||0);}
function setExamWarningCount(examId,n){var m=examWarnMap();m[attemptId(examId)]=Number(n)||0;localStorage.setItem(EXAM_WARN_KEY,JSON.stringify(m));}
function clearExamWarningCount(examId){var m=examWarnMap();delete m[attemptId(examId)];localStorage.setItem(EXAM_WARN_KEY,JSON.stringify(m));}
function beepWarning(){try{var C=window.AudioContext||window.webkitAudioContext;if(!C)return;var c=new C(),master=c.createGain();master.gain.setValueAtTime(.22,c.currentTime);master.connect(c.destination);[[0,1080],[.18,760],[.36,1080]].forEach(function(p){var o=c.createOscillator(),g=c.createGain(),t=c.currentTime+p[0];o.type='square';o.frequency.setValueAtTime(p[1],t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.55,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+.13);o.connect(g);g.connect(master);o.start(t);o.stop(t+.14);});setTimeout(function(){c.close().catch(function(){});},750);}catch(e){}}
function enableExamGuard(){examGuardActive=true;lastExamViolationAt=0;}
function disableExamGuard(){examGuardActive=false;}
async function appendViolationLog(x,count,type){
 try{
  var ref=db.collection('examAttempts').doc(attemptId(x.id)),at=await getAttempt(x.id);if(!at||at.status!=='in_progress')return;
  var item={type:type||'visibility_hidden',count:Number(count)||1,at:new Date(nowMs()).toISOString(),label:'Keluar/pindah tab'};
  await ref.set({violationCount:Number(count)||1,violationLog:firebase.firestore.FieldValue.arrayUnion(item),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});
 }catch(e){console.warn('violation log',e);}
}
async function registerExamViolation(){
 if(!examGuardActive||!state.currentExam||!state.student)return;
 if(!navigator.onLine){networkWasOffline=true;return;}
 var now=nowMs();if(now-lastExamViolationAt<1400)return;lastExamViolationAt=now;
 var x=state.currentExam,count=getExamWarningCount(x.id)+1;setExamWarningCount(x.id,count);beepWarning();
 await appendViolationLog(x,count,'visibility_hidden');
 if(count>=2){disableExamGuard();await forceCompleteForViolation(x);return;}
 await pakkomAlert('Peringatan 1 dari 2. Anda terdeteksi keluar dari halaman ujian atau membuka tab/aplikasi lain. Jika terjadi sekali lagi, ujian otomatis dianggap selesai dan dikunci.','Peringatan Ujian');
}
async function forceCompleteForViolation(x){
 try{
  var ref=db.collection('examAttempts').doc(attemptId(x.id)),at=await getAttempt(x.id);
  await ref.set({examId:x.id,studentId:state.student.id,nis:state.student.nis,classId:state.classId,status:'completed',createdByAuthUid:(at&&at.createdByAuthUid)||auth.currentUser.uid,completedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp(),autoCompleted:true,completionReason:'left_exam_twice',violationCount:Math.max(2,Number(at&&at.violationCount||2))},{merge:true});
  stopExamTimer();stopExamSessionHeartbeat();saveActiveExam('');clearExamWarningCount(x.id);state.currentExam=null;
  await pakkomAlert('Anda terdeteksi keluar dari halaman ujian sebanyak 2 kali. Ujian otomatis dianggap selesai dan telah dikunci.','Ujian Dikunci');studentDashboard();
 }catch(e){examGuardActive=true;pakkomAlert('Pelanggaran terdeteksi, tetapi status ujian gagal dikunci: '+(e.code||e.message));}
}

function uiIcon(name){
 var p={
  classes:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  students:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  exam:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  monitor:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18M7 16l4-5 4 3 5-8"/></svg>',
  result:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>',
  settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.12.36.33.7.6 1 .3.27.68.4 1.1.4h.1v4h-.1c-.42 0-.8.13-1.1.4-.27.3-.48.64-.6 1z"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
  clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  people:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/></svg>'
 };
 return '<span class="ui-icon">'+(p[name]||p.settings)+'</span>';
}

function top(title,body,backFn,backText){var view=String(title||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');document.body.dataset.view=view;app.innerHTML='<div class="top"><div class="brand">'+brandLogo('logo')+'<div class="top-brand-copy"><b>'+esc(title)+'</b>'+(branding.schoolName?'<span>'+esc(branding.schoolName)+'</span>':'')+'</div></div><button class="btn gray small" id="topBack">'+esc(backText||'Kembali')+'</button></div>'+body;el('topBack').onclick=backFn||home;}

function pakkomAlert(message,title){
 return new Promise(function(resolve){
  var old=document.getElementById('pakkomModal');if(old)old.remove();
  var wrap=document.createElement('div');wrap.id='pakkomModal';wrap.className='modal-backdrop';
  wrap.innerHTML='<div class="modal-card"><div class="modal-title">'+esc(title||'PakKom Exambro')+'</div><div class="modal-message">'+esc(message)+'</div><div class="modal-actions"><button class="btn" id="pakkomModalOk">Oke</button></div></div>';
  document.body.appendChild(wrap);
  document.getElementById('pakkomModalOk').onclick=function(){wrap.remove();resolve(true);};
 });
}
function pakkomConfirm(message,title){
 return new Promise(function(resolve){
  var old=document.getElementById('pakkomModal');if(old)old.remove();
  var wrap=document.createElement('div');wrap.id='pakkomModal';wrap.className='modal-backdrop';
  wrap.innerHTML='<div class="modal-card"><div class="modal-title">'+esc(title||'PakKom Exambro')+'</div><div class="modal-message">'+esc(message)+'</div><div class="modal-actions"><button class="btn gray" id="pakkomModalCancel">Batal</button><button class="btn" id="pakkomModalOk">Ya, Lanjutkan</button></div></div>';
  document.body.appendChild(wrap);
  document.getElementById('pakkomModalCancel').onclick=function(){wrap.remove();resolve(false);};
  document.getElementById('pakkomModalOk').onclick=function(){wrap.remove();resolve(true);};
 });
}

var PAKKOM_BOOT_OK=true;
if(typeof firebase==='undefined'){
 PAKKOM_BOOT_OK=false;
 fatal('Firebase tidak berhasil dimuat.');
}else if(!window.FIREBASE_CONFIG){
 PAKKOM_BOOT_OK=false;
 fatal('FIREBASE_CONFIG tidak ditemukan.');
}else{
 try{
  if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);
  auth=firebase.auth();db=firebase.firestore();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function(){});
  hideBoot();
 }catch(e){
  PAKKOM_BOOT_OK=false;
  fatal('Firebase gagal: '+e.message);
 }
}

async function ensureAnon(){
 var u=auth.currentUser;
 if(u)return u;
 var c=await auth.signInAnonymously();return c.user;
}
async function isAdmin(){
 var u=auth.currentUser;if(!u||u.isAnonymous)return false;
 try{var d=await db.collection('admins').doc(u.uid).get();return d.exists&&d.data().role==='admin'&&d.data().active===true;}catch(e){return false;}
}
function readSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch(e){return null;}}
function saveSession(){if(!state.student)return;var now=Date.now();localStorage.setItem(SESSION_KEY,JSON.stringify({id:state.student.id,classId:state.classId,lastActivity:now}));lastWrite=now;}
function stopExamSessionHeartbeat(){if(examSessionHeartbeatHandle){clearInterval(examSessionHeartbeatHandle);examSessionHeartbeatHandle=null;}}
function startExamSessionHeartbeat(){
 stopExamSessionHeartbeat();
 markActivity();
 examSessionHeartbeatHandle=setInterval(function(){
  if(!state.student||!state.currentExam){stopExamSessionHeartbeat();return;}
  var s=readSession();
  if(!s||s.id!==state.student.id)return;
  s.lastActivity=Date.now();
  localStorage.setItem(SESSION_KEY,JSON.stringify(s));
  lastWrite=Date.now();
 },EXAM_SESSION_HEARTBEAT);
}
function clearSession(){stopExamSessionHeartbeat();localStorage.removeItem(SESSION_KEY);localStorage.removeItem(ACTIVE_EXAM_KEY);state={classId:'',student:null,exams:[],currentExam:null};lastWrite=0;}
function saveActiveExam(examId){if(examId)localStorage.setItem(ACTIVE_EXAM_KEY,String(examId));else localStorage.removeItem(ACTIVE_EXAM_KEY);}
function readActiveExam(){return localStorage.getItem(ACTIVE_EXAM_KEY)||'';}
function attemptId(examId){return String(state.student.id)+'__'+String(examId);}
async function getAttempt(examId){try{var d=await db.collection('examAttempts').doc(attemptId(examId)).get();return d.exists?Object.assign({id:d.id},d.data()):null;}catch(e){console.warn('getAttempt',e);return null;}}
async function getAttemptsForStudent(){try{var q=await db.collection('examAttempts').where('studentId','==',state.student.id).get(),m={};q.docs.forEach(function(d){var x=d.data();m[String(x.examId)]=Object.assign({id:d.id},x);});return m;}catch(e){console.warn('getAttemptsForStudent',e);return {};}}
function expired(s){return !s||!s.lastActivity||Date.now()-Number(s.lastActivity)>=INACTIVITY_LIMIT;}
function markActivity(){if(!state.student)return;var now=Date.now();if(now-lastWrite<ACTIVITY_WRITE_GAP)return;var s=readSession();if(!s||s.id!==state.student.id)return;s.lastActivity=now;localStorage.setItem(SESSION_KEY,JSON.stringify(s));lastWrite=now;}
function checkIdle(){
 if(!state.student)return;
 // Jangan pernah mengeluarkan siswa hanya karena aktivitas di iframe
 // tidak terdeteksi selama ujian masih berlangsung.
 if(state.currentExam||readActiveExam()){
  markActivity();
  return;
 }
 var s=readSession();
 if(expired(s)){
  clearSession();
  renderHome('Sesi siswa telah berakhir. Silakan masuk kembali.');
 }
}
async function restoreStudent(){
 var s=readSession();if(!s||expired(s)){clearSession();return false;}
 try{await ensureAnon();var d=await db.collection('students').doc(s.id).get();if(!d.exists){clearSession();return false;}var x=d.data();if(x.approved!==true||x.active!==true||String(x.classId)!==String(s.classId)){clearSession();return false;}state.classId=s.classId;state.student=Object.assign({id:d.id},x);lastWrite=Number(s.lastActivity)||Date.now();return true;}catch(e){clearSession();return false;}
}
