(function(){
'use strict';
var app=document.getElementById('app'),boot=document.getElementById('boot');
var db,auth;
var SESSION_KEY='pakkom_v12_lite_student';
var ACTIVE_EXAM_KEY='pakkom_v12_lite_active_exam';
var INACTIVITY_LIMIT=60*60*1000, ACTIVITY_WRITE_GAP=15000,lastWrite=0;
var state={classId:'',student:null,exams:[],currentExam:null};
var classList=[],adminStudents=[];

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
function sortExamsBySchedule(list){return list.slice().sort(function(a,b){var ad=toDate(a.startAt),bd=toDate(b.startAt),av=ad?ad.getTime():8640000000000000,bv=bd?bd.getTime():8640000000000000;return av-bv||String(a.name||'').localeCompare(String(b.name||''));});}
function groupByExamDate(list){var groups={},order=[];sortExamsBySchedule(list).forEach(function(x){var k=dateKey(x.startAt);if(!groups[k]){groups[k]=[];order.push(k);}groups[k].push(x);});return order.map(function(k){return {key:k,info:dateInfo(groups[k][0].startAt),items:groups[k]};});}

async function sha256(s){var data=new TextEncoder().encode(String(s));var h=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');}
function top(title,body,backFn,backText){app.innerHTML='<div class="top"><div class="brand"><span class="logo">P</span><b>'+esc(title)+'</b></div><button class="btn gray small" id="topBack">'+esc(backText||'Kembali')+'</button></div>'+body;el('topBack').onclick=backFn||home;}

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

if(typeof firebase==='undefined'){fatal('Firebase tidak berhasil dimuat.');return;}
if(!window.FIREBASE_CONFIG){fatal('FIREBASE_CONFIG tidak ditemukan.');return;}
try{
 if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);
 auth=firebase.auth();db=firebase.firestore();
 auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function(){});
}catch(e){fatal('Firebase gagal: '+e.message);return;}
hideBoot();

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
function clearSession(){localStorage.removeItem(SESSION_KEY);localStorage.removeItem(ACTIVE_EXAM_KEY);state={classId:'',student:null,exams:[],currentExam:null};lastWrite=0;}
function saveActiveExam(examId){if(examId)localStorage.setItem(ACTIVE_EXAM_KEY,String(examId));else localStorage.removeItem(ACTIVE_EXAM_KEY);}
function readActiveExam(){return localStorage.getItem(ACTIVE_EXAM_KEY)||'';}
function attemptId(examId){return String(state.student.id)+'__'+String(examId);}
async function getAttempt(examId){try{var d=await db.collection('examAttempts').doc(attemptId(examId)).get();return d.exists?Object.assign({id:d.id},d.data()):null;}catch(e){console.warn('getAttempt',e);return null;}}
async function getAttemptsForStudent(){try{var q=await db.collection('examAttempts').where('studentId','==',state.student.id).get(),m={};q.docs.forEach(function(d){var x=d.data();m[String(x.examId)]=Object.assign({id:d.id},x);});return m;}catch(e){console.warn('getAttemptsForStudent',e);return {};}}
function expired(s){return !s||!s.lastActivity||Date.now()-Number(s.lastActivity)>=INACTIVITY_LIMIT;}
function markActivity(){if(!state.student)return;var now=Date.now();if(now-lastWrite<ACTIVITY_WRITE_GAP)return;var s=readSession();if(!s||s.id!==state.student.id)return;s.lastActivity=now;localStorage.setItem(SESSION_KEY,JSON.stringify(s));lastWrite=now;}
function checkIdle(){if(!state.student)return;var s=readSession();if(expired(s)){clearSession();renderHome('Sesi berakhir karena 60 menit tidak ada aktivitas.');}}
async function restoreStudent(){
 var s=readSession();if(!s||expired(s)){clearSession();return false;}
 try{await ensureAnon();var d=await db.collection('students').doc(s.id).get();if(!d.exists){clearSession();return false;}var x=d.data();if(x.approved!==true||x.active!==true||String(x.classId)!==String(s.classId)){clearSession();return false;}state.classId=s.classId;state.student=Object.assign({id:d.id},x);lastWrite=Number(s.lastActivity)||Date.now();return true;}catch(e){clearSession();return false;}
}

async function home(){
 if(await restoreStudent()){studentDashboard();return;}
 var u=auth.currentUser;if(u&&!u.isAnonymous&&await isAdmin()){admin();return;}
 try{if(!u||!u.isAnonymous){if(u)await auth.signOut();await ensureAnon();}}catch(e){}
 renderHome('');
}
function renderHome(note){
 app.innerHTML='<main class="home-page"><section class="home-shell"><div class="home-visual"><div class="home-brand"><div class="home-brand-logo">P</div><div class="home-brand-copy"><b>PakKom Exambro</b><span>Sistem ujian sekolah</span></div></div><div class="home-copy"><h1>Ujian lebih tertib, akses lebih mudah.</h1><p>Portal ujian yang dirancang untuk siswa dan guru. Jadwal, akses kelas, status pengerjaan, dan hasil ujian tersusun dalam satu tempat.</p></div><div class="home-points"><div class="home-point"><b>Terjadwal</b><span>Ujian tampil sesuai hari, tanggal, dan waktu.</span></div><div class="home-point"><b>Aman & Terkontrol</b><span>Akses siswa, PIN ujian, dan status selesai tercatat.</span></div><div class="home-point"><b>Responsif</b><span>Nyaman digunakan di HP, tablet, maupun PC.</span></div></div></div><div class="home-actions"><h2>Selamat datang</h2><p class="muted">Pilih portal untuk melanjutkan.</p>'+(note?'<div class="notice">'+esc(note)+'</div>':'')+'<div class="portal-choice"><button class="portal-btn primary" id="studentBtn"><span class="portal-icon">S</span><span class="portal-text"><b>Masuk sebagai Siswa</b><span>Pilih kelas, login, lalu kerjakan ujian yang tersedia.</span></span></button><button class="portal-btn" id="adminBtn"><span class="portal-icon">A</span><span class="portal-text"><b>Masuk sebagai Admin</b><span>Kelola siswa, kelas, jadwal ujian, dan hasil pengerjaan.</span></span></button></div><div class="home-mini"><b>Sesi siswa tetap tersimpan saat refresh.</b><br>Sesi otomatis berakhir setelah 60 menit tanpa aktivitas.</div><div class="home-version">PakKom Exambro V12.7 Lite</div></div></section></main>';
 el('studentBtn').onclick=classGate;el('adminBtn').onclick=adminLogin;
}

async function loadClasses(){
 await ensureAnon();
 try{var s=await db.collection('classes').where('active','==',true).get();classList=s.docs.map(function(d){return Object.assign({id:d.id},d.data());}).sort(function(a,b){return String(a.id).localeCompare(String(b.id),undefined,{numeric:true});});return true;}catch(e){console.error(e);classList=[];return false;}
}
async function classGate(){
 app.innerHTML='<div class="login card"><h1>Masuk Kelas</h1><label>Kelas</label><select id="kelas"><option>Memuat…</option></select><label>Password Kelas</label><input id="kpw" class="input" type="password"><button class="btn block" id="goClass">Lanjut</button><button class="btn gray block" id="backHome" style="margin-top:8px">Kembali</button><div id="classMsg"></div></div>';
 el('backHome').onclick=home;el('goClass').onclick=verifyClass;
 var ok=await loadClasses();var s=el('kelas');if(ok&&classList.length)s.innerHTML='<option value="">-- Pilih kelas --</option>'+classList.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name||x.id)+'</option>';}).join('');else{s.innerHTML='<option value="">-- Kelas belum tersedia --</option>';msg('classMsg','Kelas gagal dimuat. Pastikan Anonymous Authentication aktif dan firestore.rules V12 Lite sudah dipublish.');}
}
async function verifyClass(){
 var id=el('kelas').value,p=el('kpw').value;if(!id||!p){msg('classMsg','Pilih kelas dan masukkan password.');return;}
 msg('classMsg','Memeriksa kelas…','info');
 try{var d=await db.collection('classes').doc(id).get();if(!d.exists){msg('classMsg','Kelas tidak ditemukan.');return;}var x=d.data();if(x.active===false){msg('classMsg','Kelas sedang dinonaktifkan.');return;}var ok=false;if(x.passwordHash)ok=(await sha256(p))===String(x.passwordHash);else ok=String(x.password||x.demoPassword||'')===String(p);if(!ok){msg('classMsg','Password kelas salah.');return;}state.classId=id;studentChoice();}catch(e){msg('classMsg','Kelas tidak dapat diperiksa: '+(e.code||e.message));}
}
function studentChoice(){app.innerHTML='<div class="login card"><h1>Kelas '+esc(state.classId)+'</h1><div class="grid"><button class="btn" id="loginS">Login Siswa</button><button class="btn green" id="regS">Daftar Mandiri</button></div><button class="btn gray block" id="chg" style="margin-top:10px">Ganti Kelas</button></div>';el('loginS').onclick=loginStudent;el('regS').onclick=registerStudent;el('chg').onclick=classGate;}
function loginStudent(){app.innerHTML='<div class="login card"><h1>Login Siswa</h1><span class="pill">Kelas '+esc(state.classId)+'</span><label>NIS</label><input id="lnis" class="input" inputmode="numeric"><label>Password</label><input id="lpw" class="input" type="password"><button class="btn block" id="doSL">Masuk</button><button class="btn gray block" id="bkSL" style="margin-top:8px">Kembali</button><div id="loginMsg"></div></div>';el('doSL').onclick=doStudentLogin;el('bkSL').onclick=studentChoice;}
async function doStudentLogin(){
 var nis=el('lnis').value.trim(),p=el('lpw').value;if(!nis||!p){msg('loginMsg','NIS dan password wajib.');return;}msg('loginMsg','Memeriksa akun…','info');
 try{await ensureAnon();var q=await db.collection('students').where('nis','==',nis).where('classId','==',state.classId).limit(1).get();if(q.empty){msg('loginMsg','NIS tidak ditemukan di kelas ini.');return;}var d=q.docs[0],x=d.data();if(x.approved!==true){msg('loginMsg','Pendaftaran masih menunggu persetujuan admin.','info');return;}if(x.active!==true){msg('loginMsg','Akun siswa belum aktif atau dinonaktifkan.');return;}var ok=x.passwordHash?(await sha256(p))===String(x.passwordHash):String(x.password||'')===String(p);if(!ok){msg('loginMsg','Password siswa salah.');return;}state.student=Object.assign({id:d.id},x);saveSession();studentDashboard();}catch(e){msg('loginMsg','Login gagal: '+(e.code||e.message));}
}
function registerStudent(){app.innerHTML='<div class="login card"><h1>Daftar Mandiri</h1><span class="pill">Kelas '+esc(state.classId)+'</span><label>NIS</label><input id="rnis" class="input" inputmode="numeric"><label>Nama Lengkap</label><input id="rname" class="input"><label>Password</label><input id="rpw" class="input" type="password"><label>Konfirmasi Password</label><input id="rcpw" class="input" type="password"><button class="btn green block" id="doReg">Daftar</button><button class="btn gray block" id="bkReg" style="margin-top:8px">Kembali</button><div id="regMsg"></div></div>';el('doReg').onclick=doRegister;el('bkReg').onclick=studentChoice;}
async function doRegister(){
 var nis=el('rnis').value.trim(),name=el('rname').value.trim(),p=el('rpw').value,cp=el('rcpw').value;if(!nis||!name||!p){msg('regMsg','Semua data wajib diisi.');return;}if(p.length<6){msg('regMsg','Password minimal 6 karakter.');return;}if(p!==cp){msg('regMsg','Konfirmasi password tidak sama.');return;}msg('regMsg','Mendaftarkan…','info');
 try{await ensureAnon();var q=await db.collection('students').where('nis','==',nis).limit(1).get();if(!q.empty){msg('regMsg','NIS sudah terdaftar.');return;}var h=await sha256(p);await db.collection('students').add({nis:nis,name:name,classId:state.classId,passwordHash:h,active:false,approved:false,registrationSource:'self',createdByAuthUid:auth.currentUser.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});app.innerHTML='<div class="login card"><h1>Pendaftaran Berhasil</h1><div class="notice"><b>'+esc(name)+'</b>, akun Anda sudah dikirim dan <b>menunggu persetujuan admin/guru</b>.</div><p class="muted">Setelah disetujui, kembali ke Login Siswa menggunakan NIS dan password yang dibuat.</p><button class="btn block" id="toLogin">Ke Login</button></div>';el('toLogin').onclick=loginStudent;}catch(e){msg('regMsg','Pendaftaran gagal: '+(e.code||e.message));}
}

async function studentDashboard(){
 checkIdle();if(!state.student)return;
 var activeId=readActiveExam();
 if(activeId){
  try{
   var pair=await Promise.all([db.collection('examAttempts').doc(attemptId(activeId)).get(),db.collection('examPublic').doc(activeId).get()]);
   if(pair[0].exists&&pair[0].data().status==='in_progress'&&pair[1].exists){var ax=Object.assign({id:pair[1].id},pair[1].data());var allowed=!Array.isArray(ax.allowedClasses)||!ax.allowedClasses.length||ax.allowedClasses.indexOf(state.classId)>=0;if(allowed){state.currentExam=ax;resumeExam(ax);return;}}
   if(pair[0].exists&&pair[0].data().status==='completed')saveActiveExam('');
  }catch(e){console.warn('restore active exam',e);}
 }
 try{var s=await db.collection('examPublic').where('active','==',true).get();state.exams=sortExamsBySchedule(s.docs.map(function(d){return Object.assign({id:d.id},d.data());}).filter(function(x){return !Array.isArray(x.allowedClasses)||!x.allowedClasses.length||x.allowedClasses.indexOf(state.classId)>=0;}));}catch(e){state.exams=[];}
 var attempts={};
 try{var attemptDocs=await Promise.all(state.exams.map(function(x){return db.collection('examAttempts').doc(attemptId(x.id)).get();}));attemptDocs.forEach(function(d,i){if(d.exists)attempts[String(state.exams[i].id)]=Object.assign({id:d.id},d.data());});}catch(e){console.warn('load direct attempts',e);}
 if(activeId&&attempts[activeId]&&attempts[activeId].status==='in_progress'){var activeExam=state.exams.find(function(x){return x.id===activeId;});if(activeExam){state.currentExam=activeExam;resumeExam(activeExam);return;}}
 var groups=groupByExamDate(state.exams),cards='';
 groups.forEach(function(g){cards+='<section class="student-exam-day"><div class="student-exam-day-title"><div class="exam-date-badge"><strong>'+esc(g.info.date)+'</strong><span>'+esc(g.info.month||'Jadwal')+'</span></div><div><b>'+esc(g.info.day)+'</b><span>'+esc(g.info.full)+'</span></div></div><div class="exam-grid">'+g.items.map(function(x){return examCard(x,attempts[x.id]);}).join('')+'</div></section>';});
 if(!cards)cards='<div class="empty">Belum ada ujian aktif untuk kelas ini.</div>';
 top('PakKom Exambro','<div class="wrap"><div class="card student-profile-card"><div class="row"><div><span class="pill">Kelas '+esc(state.classId)+'</span><h1 style="margin-top:10px">'+esc(state.student.name)+'</h1><p class="muted">NIS: '+esc(state.student.nis)+'</p></div><div class="pill green">Sesi Aktif</div></div></div><div class="card"><div class="section-head"><div><h2>Jadwal Ujian</h2><p class="muted">Ujian dikelompokkan berdasarkan hari, tanggal, dan waktu.</p></div></div>'+cards+'</div></div>',studentLogout,'Keluar');
 Array.prototype.forEach.call(document.querySelectorAll('.exam-start'),function(b){b.onclick=function(){examPin(b.dataset.id);};});
 Array.prototype.forEach.call(document.querySelectorAll('.exam-resume'),function(b){b.onclick=function(){var x=state.exams.find(function(a){return a.id===b.dataset.id;});if(x){state.currentExam=x;saveActiveExam(x.id);resumeExam(x);}};});
}
function examCard(x,attempt){
 var n=Date.now(),sd=toDate(x.startAt),ed=toDate(x.endAt),st=sd?sd.getTime():0,en=ed?ed.getTime():0,future=st&&n<st,past=en&&n>en;
 var meta='<div class="exam-meta">'+(sd?'<span class="time-chip">Mulai '+esc(timeOnly(x.startAt))+'</span>':'')+(ed?'<span class="time-chip">Selesai '+esc(timeOnly(x.endAt))+'</span>':'')+'</div>';
 if(attempt&&attempt.status==='completed')return '<div class="exam-card-modern"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill orange">Sudah Ujian</span></div>'+meta+'<div class="notice">Ujian sudah selesai dan terkunci.</div><button class="btn orange block" disabled>Sudah Ujian</button></div>';
 if(attempt&&attempt.status==='in_progress')return '<div class="exam-card-modern"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill orange">Sedang dikerjakan</span></div>'+meta+'<button class="btn block exam-resume" data-id="'+esc(x.id)+'">Lanjutkan Ujian</button></div>';
 var disabled=future||past;
 return '<div class="exam-card-modern"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill '+(disabled?'orange':'green')+'">'+(future?'Belum mulai':past?'Berakhir':'Aktif')+'</span></div>'+meta+'<button class="btn block '+(disabled?'gray':'')+' exam-start" data-id="'+esc(x.id)+'" '+(disabled?'disabled':'')+'>'+(disabled?'Tidak tersedia':'Mulai Ujian')+'</button></div>';
}
async function examPin(id){var x=state.exams.find(function(a){return a.id===id;});if(!x)return;var at=await getAttempt(id);if(at&&at.status==='completed'){await pakkomAlert('Ujian ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.');studentDashboard();return;}if(at&&at.status==='in_progress'){state.currentExam=x;saveActiveExam(x.id);resumeExam(x);return;}state.currentExam=x;app.innerHTML='<div class="login card"><h1>PIN Ujian</h1><h2>'+esc(x.name)+'</h2><input id="pin" class="input" inputmode="numeric" type="password" placeholder="PIN"><button class="btn block" id="checkPin">Buka Ujian</button><button class="btn gray block" id="bkDash" style="margin-top:8px">Kembali</button><div id="pinMsg"></div></div>';el('checkPin').onclick=verifyPin;el('bkDash').onclick=studentDashboard;}
async function verifyPin(){var p=el('pin').value.trim();if(!p){msg('pinMsg','PIN wajib diisi.');return;}try{var at=await getAttempt(state.currentExam.id);if(at&&at.status==='completed'){msg('pinMsg','Ujian ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.');return;}var d=await db.collection('examSecrets').doc(state.currentExam.id).get();if(!d.exists){msg('pinMsg','PIN ujian belum disetel.');return;}var x=d.data(),ok=x.pinHash?(await sha256(p))===String(x.pinHash):String(x.pin||'')===String(p);if(!ok){msg('pinMsg','PIN salah.');return;}await launchExam(state.currentExam);}catch(e){msg('pinMsg','PIN tidak dapat diperiksa: '+(e.code||e.message));}}
function embedUrl(url){var u=String(url||'');if(/docs\.google\.com\/forms/i.test(u)){if(u.indexOf('embedded=true')<0)u+=(u.indexOf('?')>=0?'&':'?')+'embedded=true';}return u;}
async function launchExam(x){
 var ref=db.collection('examAttempts').doc(attemptId(x.id)),at=await getAttempt(x.id);if(at&&at.status==='completed'){await pakkomAlert('Ujian ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.');return studentDashboard();}
 if(!at){try{await ref.set({examId:x.id,studentId:state.student.id,nis:state.student.nis,classId:state.classId,status:'in_progress',createdByAuthUid:auth.currentUser.uid,startedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});}catch(e){console.warn('attempt create',e);}}
 saveActiveExam(x.id);resumeExam(x);
}
function resumeExam(x){
 state.currentExam=x;saveActiveExam(x.id);var u=embedUrl(x.url);
 app.innerHTML='<div class="top"><div class="brand"><span class="logo">P</span><b>Ujian: '+esc(x.name)+'</b></div><button class="btn green small" id="finishExam">Sudah Selesai Mengerjakan</button></div><div class="exam-shell"><div class="exam-toolbar"><span>'+esc(state.student.name)+' • '+esc(state.classId)+'</span><div class="actions"><button class="btn small" id="fullBtn">Fullscreen</button></div></div><div class="notice smalltext"><b>Jangan menekan Sudah Selesai Mengerjakan sebelum jawaban benar-benar sudah dikirim.</b> Jika halaman direfresh, PakKom Exambro akan tetap mengembalikan siswa ke halaman ujian ini.</div><iframe class="exam-frame" src="'+esc(u)+'" allow="fullscreen" referrerpolicy="no-referrer-when-downgrade"></iframe></div>';
 el('fullBtn').onclick=function(){var target=document.documentElement;if(target.requestFullscreen)target.requestFullscreen().catch(function(){});};el('finishExam').onclick=finishCurrentExam;
}
async function finishCurrentExam(){
 var x=state.currentExam;if(!x)return;var confirmed=await pakkomConfirm('Pastikan jawaban sudah dikirim. Setelah ditandai selesai, ujian ini tidak dapat dikerjakan lagi. Lanjutkan?');if(!confirmed)return;
 var b=el('finishExam');if(b){b.disabled=true;b.textContent='Menyimpan…';}
 try{var ref=db.collection('examAttempts').doc(attemptId(x.id)),at=await getAttempt(x.id);if(at&&at.status==='completed'){saveActiveExam('');state.currentExam=null;return studentDashboard();}await ref.set({examId:x.id,studentId:state.student.id,nis:state.student.nis,classId:state.classId,status:'completed',createdByAuthUid:(at&&at.createdByAuthUid)||auth.currentUser.uid,completedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});saveActiveExam('');state.currentExam=null;await pakkomAlert('Ujian sudah selesai dan telah dikunci.');studentDashboard();}catch(e){if(b){b.disabled=false;b.textContent='Sudah Selesai Mengerjakan';}pakkomAlert('Status selesai gagal disimpan: '+(e.code||e.message));}
}
function studentLogout(){clearSession();home();}

function adminLogin(){app.innerHTML='<div class="login card"><h1>Login Admin</h1><label>Email</label><input id="aemail" class="input" type="email"><label>Password</label><input id="apass" class="input" type="password"><button class="btn block" id="doAdmin">Masuk</button><button class="btn gray block" id="bkAdmin" style="margin-top:8px">Kembali</button><div id="adminMsg"></div></div>';el('doAdmin').onclick=doAdminLogin;el('bkAdmin').onclick=home;}
async function doAdminLogin(){var email=el('aemail').value.trim(),p=el('apass').value;if(!email||!p){msg('adminMsg','Email dan password wajib.');return;}msg('adminMsg','Memeriksa admin…','info');try{if(auth.currentUser)await auth.signOut();await auth.signInWithEmailAndPassword(email,p);if(!(await isAdmin())){await auth.signOut();await ensureAnon();msg('adminMsg','Akun ini bukan admin aktif.');return;}admin();}catch(e){try{await ensureAnon();}catch(_){}msg('adminMsg','Login admin gagal: '+(e.code||e.message));}}
async function admin(){if(!(await isAdmin())){adminLogin();return;}var counts={classes:'-',students:'-',exams:'-'};try{var r=await Promise.all([db.collection('classes').get(),db.collection('students').get(),db.collection('examPublic').get()]);counts={classes:r[0].size,students:r[1].size,exams:r[2].size};}catch(e){}top('PakKom Exambro — Admin','<div class="wrap"><h1>Dashboard Admin</h1><div class="grid"><div class="card"><h3>Kelas</h3><h2>'+counts.classes+'</h2><button class="btn" id="mClass">Kelola Kelas</button></div><div class="card"><h3>Siswa</h3><h2>'+counts.students+'</h2><button class="btn" id="mStudent">Kelola Siswa</button></div><div class="card"><h3>Ujian</h3><h2>'+counts.exams+'</h2><button class="btn" id="mExam">Kelola Ujian</button></div><div class="card"><h3>Hasil Ujian</h3><p class="muted">Lihat siswa yang sudah ujian per kelas dan aktifkan ulang akses.</p><button class="btn orange" id="mResult">Lihat Pengerjaan</button></div></div><div class="notice">V12 Lite: password dan PIN baru disimpan sebagai hash. Validasi tetap dilakukan di browser karena versi ini tanpa Cloud Functions.</div></div>',adminLogout,'Keluar');el('mClass').onclick=classesAdmin;el('mStudent').onclick=studentsAdmin;el('mExam').onclick=examsAdmin;el('mResult').onclick=examResultsAdmin;}
async function adminLogout(){clearSession();try{await auth.signOut();await ensureAnon();}catch(e){}renderHome('');}

async function classesAdmin(){if(!(await isAdmin()))return adminLogin();var s=await db.collection('classes').get();var rows=s.docs.sort(function(a,b){return a.id.localeCompare(b.id);}).map(function(d){var x=d.data();return '<tr><td><b>'+esc(d.id)+'</b></td><td>'+(x.active===false?'Nonaktif':'Aktif')+'</td><td><button class="btn gray small class-pass" data-id="'+esc(d.id)+'">Password</button> <button class="btn small '+(x.active===false?'green':'orange')+' class-toggle" data-id="'+esc(d.id)+'" data-active="'+(x.active===false?'0':'1')+'">'+(x.active===false?'Aktifkan':'Nonaktifkan')+'</button></td></tr>';}).join('');top('Kelola Kelas','<div class="wrap"><div class="card"><h2>Tambah Kelas</h2><input id="cid" class="input" placeholder="7A"><input id="cpass" class="input" type="password" placeholder="Password minimal 6 karakter"><button class="btn green" id="saveClass">Simpan</button></div><div class="card"><div class="table-wrap"><table class="table"><tr><th>Kelas</th><th>Status</th><th>Aksi</th></tr>'+rows+'</table></div></div></div>',admin,'Admin');el('saveClass').onclick=saveClass;document.querySelectorAll('.class-pass').forEach(function(b){b.onclick=function(){changeClassPassword(b.dataset.id);};});document.querySelectorAll('.class-toggle').forEach(function(b){b.onclick=function(){toggleClass(b.dataset.id,b.dataset.active==='1');};});}
async function saveClass(){var id=el('cid').value.trim().toUpperCase(),p=el('cpass').value;if(!id||p.length<6){alert('Kelas dan password minimal 6 karakter wajib.');return;}await db.collection('classes').doc(id).set({name:id,passwordHash:await sha256(p),password:firebase.firestore.FieldValue.delete(),demoPassword:firebase.firestore.FieldValue.delete(),active:true},{merge:true});classesAdmin();}
async function changeClassPassword(id){var p=prompt('Password kelas baru (minimal 6 karakter):');if(p===null)return;if(p.length<6)return alert('Password minimal 6 karakter.');await db.collection('classes').doc(id).update({passwordHash:await sha256(p),password:firebase.firestore.FieldValue.delete(),demoPassword:firebase.firestore.FieldValue.delete()});alert('Password kelas diperbarui.');}
async function toggleClass(id,a){await db.collection('classes').doc(id).update({active:!a});classesAdmin();}

async function studentsAdmin(){if(!(await isAdmin()))return adminLogin();var s=await db.collection('students').get();adminStudents=s.docs.map(function(d){return Object.assign({id:d.id},d.data());}).sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''));});var classes=[...new Set(adminStudents.map(function(x){return x.classId;}).filter(Boolean))].sort();top('Kelola Siswa','<div class="wrap"><div class="card"><h2>Tambah Manual</h2><div class="grid"><input id="anIS" class="input" placeholder="NIS"><input id="anName" class="input" placeholder="Nama"><input id="anClass" class="input" placeholder="Kelas"><input id="anPass" class="input" placeholder="Password (default 123456)"></div><button class="btn green" id="addManual">Tambah Siswa</button></div><div class="card"><h2>Upload Excel</h2><p class="muted">Kolom: NIS | Nama | Kelas | Password. Password kosong = 123456.</p><input id="excelFile" class="input" type="file" accept=".xlsx,.xls,.csv"><div class="actions"><button class="btn" id="importExcel">Upload Data</button><button class="btn gray" id="templateExcel">Download Template</button></div><div id="importMsg"></div></div><div class="card"><div class="grid"><input id="studentSearch" class="input" placeholder="Cari NIS/nama"><select id="studentFilter"><option value="">Semua kelas</option>'+classes.map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select></div><div id="studentTable"></div></div></div>',admin,'Admin');el('addManual').onclick=addStudentManual;el('importExcel').onclick=importExcel;el('templateExcel').onclick=downloadTemplate;el('studentSearch').oninput=renderStudents;el('studentFilter').onchange=renderStudents;renderStudents();}
function renderStudents(){var q=(el('studentSearch')?el('studentSearch').value:'').toLowerCase().trim(),f=el('studentFilter')?el('studentFilter').value:'';var rows=adminStudents.filter(function(x){return (!f||x.classId===f)&&(!q||String(x.nis||'').toLowerCase().includes(q)||String(x.name||'').toLowerCase().includes(q));});el('studentTable').innerHTML='<p class="muted">'+rows.length+' siswa • '+rows.filter(function(x){return x.approved!==true;}).length+' menunggu approval</p><div class="table-wrap"><table class="table"><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Approval</th><th>Status</th><th>Aksi</th></tr>'+rows.map(function(x){return '<tr><td>'+esc(x.nis)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.classId)+'</td><td>'+(x.approved===true?'<span class="pill green">Disetujui</span>':'<span class="pill orange">Menunggu</span>')+'</td><td>'+(x.active===true?'Aktif':'Nonaktif')+'</td><td><div class="actions">'+(x.approved!==true?'<button class="btn green small approve" data-id="'+esc(x.id)+'">Approve</button>':'')+'<button class="btn gray small reset" data-id="'+esc(x.id)+'">Reset Password</button><button class="btn orange small toggle" data-id="'+esc(x.id)+'" data-active="'+(x.active===true?'1':'0')+'">'+(x.active===true?'Nonaktifkan':'Aktifkan')+'</button></div></td></tr>';}).join('')+'</table></div>';document.querySelectorAll('.approve').forEach(function(b){b.onclick=function(){approveStudent(b.dataset.id);};});document.querySelectorAll('.reset').forEach(function(b){b.onclick=function(){resetStudent(b.dataset.id);};});document.querySelectorAll('.toggle').forEach(function(b){b.onclick=function(){toggleStudent(b.dataset.id,b.dataset.active==='1');};});}
async function approveStudent(id){await db.collection('students').doc(id).update({approved:true,active:true,approvedAt:firebase.firestore.FieldValue.serverTimestamp()});studentsAdmin();}
async function addStudentManual(){var nis=el('anIS').value.trim(),name=el('anName').value.trim(),cls=el('anClass').value.trim().toUpperCase(),p=el('anPass').value||'123456';if(!nis||!name||!cls||p.length<6)return alert('NIS, nama, kelas dan password minimal 6 karakter wajib.');var q=await db.collection('students').where('nis','==',nis).limit(1).get();if(!q.empty)return alert('NIS sudah terdaftar.');await db.collection('students').add({nis:nis,name:name,classId:cls,passwordHash:await sha256(p),active:true,approved:true,registrationSource:'admin-manual',createdAt:firebase.firestore.FieldValue.serverTimestamp()});studentsAdmin();}
async function resetStudent(id){var p=prompt('Password baru:','123456');if(p===null)return;if(p.length<6)return alert('Password minimal 6 karakter.');await db.collection('students').doc(id).update({passwordHash:await sha256(p),password:firebase.firestore.FieldValue.delete()});alert('Password diperbarui.');studentsAdmin();}
async function toggleStudent(id,a){await db.collection('students').doc(id).update({active:!a});studentsAdmin();}
function downloadTemplate(){var ws=XLSX.utils.aoa_to_sheet([['NIS','Nama','Kelas','Password'],['10001','Contoh Siswa','7A','123456']]);var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Siswa');XLSX.writeFile(wb,'Template-Siswa-PakKom.xlsx');}
function normKey(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function pick(r,names){var m={};Object.keys(r).forEach(function(k){m[normKey(k)]=r[k];});for(var i=0;i<names.length;i++){if(m[normKey(names[i])]!==undefined)return m[normKey(names[i])];}return '';}
function importExcel(){var file=el('excelFile').files[0];if(!file)return msg('importMsg','Pilih file Excel/CSV terlebih dahulu.');var rd=new FileReader();rd.onload=async function(ev){try{var wb=XLSX.read(ev.target.result,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});await processRows(rows);}catch(e){msg('importMsg','File gagal dibaca: '+e.message);}};rd.readAsArrayBuffer(file);}
async function processRows(rows){var existing={};adminStudents.forEach(function(x){existing[String(x.nis||'').trim()]=1;});var seen={},valid=[],bad=0,dup=0;for(var i=0;i<rows.length;i++){var r=rows[i],nis=String(pick(r,['NIS','Nomor Induk Siswa','Nomor Induk'])||'').trim(),name=String(pick(r,['Nama','Nama Siswa','Nama Lengkap'])||'').trim(),cls=String(pick(r,['Kelas','Class','ClassId'])||'').trim().toUpperCase(),p=String(pick(r,['Password','Pass','Kata Sandi'])||'').trim()||'123456';if(!nis||!name||!cls||p.length<6){bad++;continue;}if(existing[nis]||seen[nis]){dup++;continue;}seen[nis]=1;valid.push({nis:nis,name:name,classId:cls,passwordHash:await sha256(p),active:true,approved:true,registrationSource:'admin-import'});}if(!valid.length)return msg('importMsg','Tidak ada data baru. Duplikat: '+dup+', tidak valid: '+bad+'.');if(!confirm('Tambahkan '+valid.length+' siswa?'))return;msg('importMsg','Mengunggah '+valid.length+' siswa…','info');for(var start=0;start<valid.length;start+=400){var batch=db.batch();valid.slice(start,start+400).forEach(function(x){batch.set(db.collection('students').doc(),Object.assign({},x,{createdAt:firebase.firestore.FieldValue.serverTimestamp()}));});await batch.commit();}msg('importMsg','Selesai: '+valid.length+' siswa ditambahkan. Duplikat: '+dup+', tidak valid: '+bad+'.','success');setTimeout(studentsAdmin,600);}

async function examResultsAdmin(){
 if(!(await isAdmin()))return adminLogin();
 var data=await Promise.all([db.collection('examPublic').get(),db.collection('students').get(),db.collection('examAttempts').get()]);
 var exams=data[0].docs.map(function(d){return Object.assign({id:d.id},d.data());}).sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''));});
 var students=data[1].docs.map(function(d){return Object.assign({id:d.id},d.data());});
 var attempts=data[2].docs.map(function(d){return Object.assign({id:d.id},d.data());});
 var classes=[...new Set(students.map(function(x){return x.classId;}).filter(Boolean))].sort(function(a,b){return String(a).localeCompare(String(b),undefined,{numeric:true});});
 window.__pakkomResultData={exams:exams,students:students,attempts:attempts};
 top('Hasil Pengerjaan Ujian','<div class="wrap"><div class="card result-filter-card"><div class="section-head"><div><h2>Status Pengerjaan Siswa</h2><p class="muted">Belum Ujian = belum pernah membuka soal. Sedang Mengerjakan = sudah mulai tetapi belum menekan selesai.</p></div></div><div class="grid result-filter-grid"><select id="resultExam"><option value="">Semua ujian</option>'+exams.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>';}).join('')+'</select><select id="resultClass"><option value="">Semua kelas</option>'+classes.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>';}).join('')+'</select></div><div id="resultSummary"></div></div><div class="card"><div id="resultTable"></div></div></div>',admin,'Admin');
 el('resultExam').onchange=renderExamResults;el('resultClass').onchange=renderExamResults;renderExamResults();
}
function renderExamResults(){
 var d=window.__pakkomResultData||{exams:[],students:[],attempts:[]},eid=el('resultExam')?el('resultExam').value:'',cls=el('resultClass')?el('resultClass').value:'';
 var attemptMap={};
 d.attempts.forEach(function(a){attemptMap[String(a.studentId)+'__'+String(a.examId)]=a;});
 var selectedExams=d.exams.filter(function(e){return !eid||String(e.id)===eid;});
 var selectedStudents=d.students.filter(function(st){return st.approved===true&&st.active===true&&(!cls||String(st.classId)===cls);});
 var rows=[];
 selectedExams.forEach(function(ex){
   selectedStudents.forEach(function(st){
     var allowed=!Array.isArray(ex.allowedClasses)||!ex.allowedClasses.length||ex.allowedClasses.indexOf(st.classId)>=0;
     if(!allowed)return;
     var at=attemptMap[String(st.id)+'__'+String(ex.id)]||null;
     rows.push({student:st,exam:ex,attempt:at,status:at&&at.status==='completed'?'completed':at&&at.status==='in_progress'?'in_progress':'not_started'});
   });
 });
 rows.sort(function(a,b){return String(a.student.classId||'').localeCompare(String(b.student.classId||''),undefined,{numeric:true})||String(a.student.name||a.student.nis||'').localeCompare(String(b.student.name||b.student.nis||''))||String(a.exam.name||'').localeCompare(String(b.exam.name||''));});
 var completed=rows.filter(function(r){return r.status==='completed';}).length;
 var inprogress=rows.filter(function(r){return r.status==='in_progress';}).length;
 var notstarted=rows.filter(function(r){return r.status==='not_started';}).length;
 if(el('resultSummary'))el('resultSummary').innerHTML='<div class="result-stats result-stats-polish"><div class="stat-chip stat-wait"><b>'+notstarted+'</b><span>Belum Ujian</span></div><div class="stat-chip stat-live"><b>'+inprogress+'</b><span>Sedang Mengerjakan</span></div><div class="stat-chip stat-done"><b>'+completed+'</b><span>Sudah Ujian</span></div><div class="stat-chip stat-total"><b>'+rows.length+'</b><span>Total Peserta</span></div></div>';
 function statusHTML(r){if(r.status==='completed')return '<span class="pill orange">Sudah Ujian</span>';if(r.status==='in_progress')return '<span class="pill green">Sedang Mengerjakan</span>';return '<span class="pill gray">Belum Ujian</span>';}
 function actionHTML(r){return r.status==='completed'&&r.attempt?'<button class="btn green small result-reset" data-id="'+esc(r.attempt.id)+'" data-name="'+esc(r.student.name||r.student.nis||'siswa')+'">Aktifkan Ulang</button>':'<span class="muted">—</span>';}
 var table='<div class="result-desktop"><div class="table-wrap"><table class="table"><tr><th>Kelas</th><th>NIS</th><th>Nama</th><th>Ujian</th><th>Status</th><th>Aksi</th></tr>'+rows.map(function(r){return '<tr><td>'+esc(r.student.classId||'-')+'</td><td>'+esc(r.student.nis||'-')+'</td><td><b>'+esc(r.student.name||'-')+'</b></td><td>'+esc(r.exam.name||'-')+'</td><td>'+statusHTML(r)+'</td><td>'+actionHTML(r)+'</td></tr>';}).join('')+'</table></div></div>';
 var cards='<div class="result-mobile">'+rows.map(function(r){return '<article class="result-student-card '+esc(r.status)+'"><div class="result-card-head"><div><b>'+esc(r.student.name||'-')+'</b><span>NIS '+esc(r.student.nis||'-')+' • Kelas '+esc(r.student.classId||'-')+'</span></div>'+statusHTML(r)+'</div><div class="result-card-exam">'+esc(r.exam.name||'-')+'</div><div class="result-card-action">'+actionHTML(r)+'</div></article>';}).join('')+'</div>';
 var html=rows.length?table+cards:'<div class="empty">Tidak ada peserta untuk ujian/kelas yang dipilih.</div>';
 if(el('resultTable'))el('resultTable').innerHTML=html;
 document.querySelectorAll('.result-reset').forEach(function(b){b.onclick=function(){resetExamAttempt(b.dataset.id,b.dataset.name);};});
}
async function resetExamAttempt(id,name){
 var ok=await pakkomConfirm('Aktifkan kembali akses ujian untuk '+name+'? Status Sudah Ujian akan dihapus sehingga siswa dapat memulai ujian lagi.','PakKom Exambro');if(!ok)return;
 try{await db.collection('examAttempts').doc(id).delete();await pakkomAlert('Akses ujian siswa sudah diaktifkan kembali.');examResultsAdmin();}catch(e){pakkomAlert('Gagal mengaktifkan kembali: '+(e.code||e.message));}
}

async function examsAdmin(){
 if(!(await isAdmin()))return adminLogin();
 var s=await db.collection('examPublic').get(),list=sortExamsBySchedule(s.docs.map(function(d){return Object.assign({id:d.id},d.data());})),groups=groupByExamDate(list),cards='';
 groups.forEach(function(g){cards+='<div class="exam-list-group"><div class="exam-date-head"><div class="exam-date-badge"><strong>'+esc(g.info.date)+'</strong><span>'+esc(g.info.month||'Jadwal')+'</span></div><div class="exam-date-copy"><b>'+esc(g.info.day)+'</b><span>'+esc(g.info.full)+'</span></div></div><div class="exam-grid">'+g.items.map(function(x){var classes=(x.allowedClasses||[]).join(', ')||'Semua kelas';return '<div class="exam-card-modern"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill '+(x.active===false?'red':'green')+'">'+(x.active===false?'Nonaktif':'Aktif')+'</span></div><div class="exam-meta"><span class="time-chip">'+esc(timeOnly(x.startAt))+' - '+esc(timeOnly(x.endAt))+'</span><span class="class-chip">'+esc(classes)+'</span></div><div class="actions"><button class="btn small '+(x.active===false?'green':'orange')+' etoggle" data-id="'+esc(x.id)+'" data-active="'+(x.active===false?'0':'1')+'">'+(x.active===false?'Aktifkan':'Nonaktifkan')+'</button><button class="btn red small edel" data-id="'+esc(x.id)+'">Hapus</button></div></div>';}).join('')+'</div></div>';});
 if(!cards)cards='<div class="empty">Belum ada ujian. Tambahkan jadwal ujian pertama melalui formulir di atas.</div>';
 var today=new Date(),dateVal=today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
 top('Kelola Ujian','<div class="wrap"><div class="card"><div class="section-head"><div><h2>Tambah Ujian</h2><p class="muted">Buat ujian sekaligus atur hari, tanggal, dan jam akses siswa.</p></div><span class="pill">Terjadwal</span></div><div class="form-section"><div class="form-section-title"><span class="form-num">1</span>Informasi Ujian</div><div class="form-grid-2"><div class="field"><label>Nama Ujian</label><input id="ename" class="input" placeholder="Contoh: Penilaian Harian 1"></div><div class="field"><label>Mata Pelajaran</label><input id="esub" class="input" placeholder="Contoh: Matematika"></div></div><div class="field"><label>Link Ujian</label><input id="eurl" class="input" placeholder="https://forms.google.com/... atau link Quizizz"><div class="field-help">Gunakan link HTTPS. Google Form akan dicoba ditampilkan di dalam PakKom Exambro.</div></div></div><div class="form-section"><div class="form-section-title"><span class="form-num">2</span>Peserta & Keamanan</div><div class="form-grid-2"><div class="field"><label>Kelas Peserta</label><input id="eclass" class="input" placeholder="7A,7B,7C atau kosong untuk semua kelas"><div class="field-help">Pisahkan beberapa kelas dengan koma.</div></div><div class="field"><label>PIN Ujian</label><input id="epin" class="input" type="password" inputmode="numeric" placeholder="Masukkan PIN ujian"></div></div></div><div class="form-section"><div class="form-section-title"><span class="form-num">3</span>Jadwal Ujian</div><div class="form-grid-3"><div class="field"><label>Tanggal Ujian</label><input id="edate" class="input" type="date" value="'+dateVal+'"></div><div class="field"><label>Jam Mulai</label><input id="estime" class="input" type="time" value="08:00"></div><div class="field"><label>Jam Selesai</label><input id="eetime" class="input" type="time" value="10:00"></div></div><div id="schedulePreview" class="schedule-preview"></div></div><button class="btn green block" id="saveExam">Simpan & Jadwalkan Ujian</button><div id="examSaveMsg"></div></div><div class="card"><div class="section-head"><div><h2>Daftar Jadwal Ujian</h2><p class="muted">Otomatis dikelompokkan berdasarkan tanggal.</p></div><span class="pill gray">'+list.length+' ujian</span></div>'+cards+'</div></div>',admin,'Admin');
 function updatePreview(){var d=el('edate').value,st=el('estime').value,en=el('eetime').value;if(!d)return el('schedulePreview').innerHTML='Pilih tanggal ujian.';var dt=new Date(d+'T'+(st||'00:00'));el('schedulePreview').innerHTML='<b>'+esc(dt.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))+'</b> • '+esc(st||'--:--')+' sampai '+esc(en||'--:--');}
 ['edate','estime','eetime'].forEach(function(id){el(id).oninput=updatePreview;});updatePreview();
 el('saveExam').onclick=saveExam;document.querySelectorAll('.etoggle').forEach(function(b){b.onclick=function(){toggleExam(b.dataset.id,b.dataset.active==='1');};});document.querySelectorAll('.edel').forEach(function(b){b.onclick=function(){deleteExam(b.dataset.id);};});
}
async function saveExam(){
 var name=el('ename').value.trim(),sub=el('esub').value.trim(),url=el('eurl').value.trim(),pin=el('epin').value.trim(),classes=el('eclass').value.split(',').map(function(x){return x.trim().toUpperCase();}).filter(Boolean),date=el('edate').value,stime=el('estime').value,etime=el('eetime').value;
 if(!name||!sub||!https(url)||!pin||!date||!stime||!etime){msg('examSaveMsg','Nama ujian, mata pelajaran, link HTTPS, PIN, tanggal, jam mulai, dan jam selesai wajib diisi.');return;}
 var start=new Date(date+'T'+stime),end=new Date(date+'T'+etime);if(end<=start){msg('examSaveMsg','Jam selesai harus setelah jam mulai.');return;}
 try{var data={name:name,subject:sub,url:url,allowedClasses:classes,active:true,startAt:start,endAt:end,scheduleDate:date,createdAt:firebase.firestore.FieldValue.serverTimestamp()};var ref=await db.collection('examPublic').add(data);await db.collection('examSecrets').doc(ref.id).set({pinHash:await sha256(pin)});await pakkomAlert('Ujian berhasil dijadwalkan untuk '+start.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+' pukul '+stime+'.');examsAdmin();}catch(e){msg('examSaveMsg','Ujian gagal disimpan: '+(e.code||e.message));}
}
async function toggleExam(id,a){await db.collection('examPublic').doc(id).update({active:!a});examsAdmin();}
async function deleteExam(id){if(!confirm('Hapus ujian?'))return;await db.collection('examPublic').doc(id).delete();await db.collection('examSecrets').doc(id).delete().catch(function(){});examsAdmin();}

['click','touchstart','keydown','scroll','pointerdown'].forEach(function(evt){document.addEventListener(evt,markActivity,{passive:true});});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')checkIdle();});window.addEventListener('focus',checkIdle);setInterval(checkIdle,30000);

auth.onAuthStateChanged(function(){if(!window.__pakkom_started){window.__pakkom_started=true;home();}});
})();
