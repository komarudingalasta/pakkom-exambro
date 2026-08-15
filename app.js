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
async function sha256(s){var data=new TextEncoder().encode(String(s));var h=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(h)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');}
function top(title,body,backFn,backText){app.innerHTML='<div class="top"><div class="brand"><span class="logo">P</span><b>'+esc(title)+'</b></div><button class="btn gray small" id="topBack">'+esc(backText||'Kembali')+'</button></div>'+body;el('topBack').onclick=backFn||home;}

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
function renderHome(note){app.innerHTML='<div class="login card"><div class="hero"><span class="logo">P</span><h1>PakKom Exambro V12.3 Lite</h1><p class="muted">Portal ujian siswa</p></div>'+(note?'<div class="notice">'+esc(note)+'</div>':'')+'<div class="grid"><button class="btn" id="studentBtn">Siswa</button><button class="btn gray" id="adminBtn">Admin</button></div><div class="notice"><b>Alur:</b> pilih kelas → password kelas → login/daftar → approval admin → ujian → PIN.</div><p class="muted smalltext">Refresh tidak mengeluarkan siswa. Sesi berakhir setelah 60 menit tanpa aktivitas.</p></div>';el('studentBtn').onclick=classGate;el('adminBtn').onclick=adminLogin;}

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
 // PRIORITAS REFRESH: jika ada ujian aktif yang tersimpan, pulihkan langsung
 // dari document examAttempts + examPublic. Tidak bergantung pada query daftar attempt.
 var activeId=readActiveExam();
 if(activeId){
  try{
   var pair=await Promise.all([
    db.collection('examAttempts').doc(attemptId(activeId)).get(),
    db.collection('examPublic').doc(activeId).get()
   ]);
   if(pair[0].exists&&pair[0].data().status==='in_progress'&&pair[1].exists){
    var ax=Object.assign({id:pair[1].id},pair[1].data());
    var allowed=!Array.isArray(ax.allowedClasses)||!ax.allowedClasses.length||ax.allowedClasses.indexOf(state.classId)>=0;
    if(allowed){state.currentExam=ax;resumeExam(ax);return;}
   }
   // Hanya hapus penanda jika attempt memang sudah selesai/tidak valid.
   if(pair[0].exists&&pair[0].data().status==='completed')saveActiveExam('');
  }catch(e){
   console.warn('restore active exam',e);
   // Jika jaringan/Firestore sesaat gagal, jangan hapus ACTIVE_EXAM_KEY.
   // Tampilkan dashboard hanya sebagai fallback; refresh berikutnya masih dapat memulihkan.
  }
 }
 try{var s=await db.collection('examPublic').where('active','==',true).get();state.exams=s.docs.map(function(d){return Object.assign({id:d.id},d.data());}).filter(function(x){return !Array.isArray(x.allowedClasses)||!x.allowedClasses.length||x.allowedClasses.indexOf(state.classId)>=0;});}catch(e){state.exams=[];}
 var attempts=await getAttemptsForStudent();
 // Fallback kedua: jika ACTIVE_EXAM_KEY ada dan query attempt berhasil, pulihkan juga.
 if(activeId&&attempts[activeId]&&attempts[activeId].status==='in_progress'){
  var activeExam=state.exams.find(function(x){return x.id===activeId;});
  if(activeExam){state.currentExam=activeExam;resumeExam(activeExam);return;}
 }
 var cards=state.exams.map(function(x){return examCard(x,attempts[x.id]);}).join('')||'<div class="empty">Belum ada ujian aktif untuk kelas ini.</div>';
 top('PakKom Exambro','<div class="wrap"><div class="card"><span class="pill">Kelas '+esc(state.classId)+'</span><h1>'+esc(state.student.name)+'</h1><p class="muted">NIS: '+esc(state.student.nis)+'</p></div><div class="card"><h2>Ujian Tersedia</h2>'+cards+'</div></div>',studentLogout,'Keluar');
 Array.prototype.forEach.call(document.querySelectorAll('.exam-start'),function(b){b.onclick=function(){examPin(b.dataset.id);};});
 Array.prototype.forEach.call(document.querySelectorAll('.exam-resume'),function(b){b.onclick=function(){var x=state.exams.find(function(a){return a.id===b.dataset.id;});if(x){state.currentExam=x;saveActiveExam(x.id);resumeExam(x);}};});
}
function examCard(x,attempt){var n=Date.now(),st=x.startAt&&x.startAt.toDate?x.startAt.toDate().getTime():0,en=x.endAt&&x.endAt.toDate?x.endAt.toDate().getTime():0,future=st&&n<st,past=en&&n>en;if(attempt&&attempt.status==='completed')return '<div class="exam"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill orange">Sudah Ujian</span></div><div class="notice">Ujian ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.</div><button class="btn orange" disabled>Sudah Ujian</button></div>';if(attempt&&attempt.status==='in_progress')return '<div class="exam"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill orange">Sedang dikerjakan</span></div><button class="btn exam-resume" data-id="'+esc(x.id)+'">Lanjutkan Ujian</button></div>';var disabled=future||past;return '<div class="exam"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill '+(disabled?'orange':'green')+'">'+(future?'Belum mulai':past?'Berakhir':'Aktif')+'</span></div>'+(st?'<p class="smalltext">Mulai: '+esc(fmt(x.startAt))+'</p>':'')+(en?'<p class="smalltext">Selesai: '+esc(fmt(x.endAt))+'</p>':'')+'<button class="btn '+(disabled?'gray':'')+' exam-start" data-id="'+esc(x.id)+'" '+(disabled?'disabled':'')+'>'+(disabled?'Tidak tersedia':'Mulai Ujian')+'</button></div>';}
async function examPin(id){var x=state.exams.find(function(a){return a.id===id;});if(!x)return;var at=await getAttempt(id);if(at&&at.status==='completed'){alert('Ujian ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.');studentDashboard();return;}if(at&&at.status==='in_progress'){state.currentExam=x;saveActiveExam(x.id);resumeExam(x);return;}state.currentExam=x;app.innerHTML='<div class="login card"><h1>PIN Ujian</h1><h2>'+esc(x.name)+'</h2><input id="pin" class="input" inputmode="numeric" type="password" placeholder="PIN"><button class="btn block" id="checkPin">Buka Ujian</button><button class="btn gray block" id="bkDash" style="margin-top:8px">Kembali</button><div id="pinMsg"></div></div>';el('checkPin').onclick=verifyPin;el('bkDash').onclick=studentDashboard;}
async function verifyPin(){var p=el('pin').value.trim();if(!p){msg('pinMsg','PIN wajib diisi.');return;}try{var at=await getAttempt(state.currentExam.id);if(at&&at.status==='completed'){msg('pinMsg','Ujian ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.');return;}var d=await db.collection('examSecrets').doc(state.currentExam.id).get();if(!d.exists){msg('pinMsg','PIN ujian belum disetel.');return;}var x=d.data(),ok=x.pinHash?(await sha256(p))===String(x.pinHash):String(x.pin||'')===String(p);if(!ok){msg('pinMsg','PIN salah.');return;}await launchExam(state.currentExam);}catch(e){msg('pinMsg','PIN tidak dapat diperiksa: '+(e.code||e.message));}}
function embedUrl(url){var u=String(url||'');if(/docs\.google\.com\/forms/i.test(u)){if(u.indexOf('embedded=true')<0)u+=(u.indexOf('?')>=0?'&':'?')+'embedded=true';}return u;}
async function launchExam(x){
 var ref=db.collection('examAttempts').doc(attemptId(x.id)),at=await getAttempt(x.id);if(at&&at.status==='completed'){alert('Ujian ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.');return studentDashboard();}
 if(!at){try{await ref.set({examId:x.id,studentId:state.student.id,nis:state.student.nis,classId:state.classId,status:'in_progress',createdByAuthUid:auth.currentUser.uid,startedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});}catch(e){console.warn('attempt create',e);}}
 saveActiveExam(x.id);resumeExam(x);
}
function resumeExam(x){
 state.currentExam=x;saveActiveExam(x.id);var u=embedUrl(x.url);
 app.innerHTML='<div class="top"><div class="brand"><span class="logo">P</span><b>Ujian: '+esc(x.name)+'</b></div><button class="btn green small" id="finishExam">Sudah Selesai Mengerjakan</button></div><div class="exam-shell"><div class="exam-toolbar"><span>'+esc(state.student.name)+' • '+esc(state.classId)+'</span><div class="actions"><button class="btn small" id="fullBtn">Fullscreen</button></div></div><div class="notice smalltext"><b>Jangan menekan Sudah Selesai Mengerjakan sebelum jawaban benar-benar sudah dikirim.</b> Jika halaman direfresh, PakKom Exambro akan tetap mengembalikan siswa ke halaman ujian ini.</div><iframe class="exam-frame" src="'+esc(u)+'" allow="fullscreen" referrerpolicy="no-referrer-when-downgrade"></iframe></div>';
 el('fullBtn').onclick=function(){var target=document.documentElement;if(target.requestFullscreen)target.requestFullscreen().catch(function(){});};el('finishExam').onclick=finishCurrentExam;
}
async function finishCurrentExam(){
 var x=state.currentExam;if(!x)return;if(!confirm('Pastikan jawaban sudah dikirim. Setelah ditandai selesai, ujian ini tidak dapat dikerjakan lagi. Lanjutkan?'))return;
 var b=el('finishExam');if(b){b.disabled=true;b.textContent='Menyimpan…';}
 try{var ref=db.collection('examAttempts').doc(attemptId(x.id)),at=await getAttempt(x.id);if(at&&at.status==='completed'){saveActiveExam('');state.currentExam=null;return studentDashboard();}await ref.set({examId:x.id,studentId:state.student.id,nis:state.student.nis,classId:state.classId,status:'completed',createdByAuthUid:(at&&at.createdByAuthUid)||auth.currentUser.uid,completedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});saveActiveExam('');state.currentExam=null;alert('Ujian ditandai selesai. Ujian ini tidak dapat dibuka kembali.');studentDashboard();}catch(e){if(b){b.disabled=false;b.textContent='Sudah Selesai Mengerjakan';}alert('Status selesai gagal disimpan: '+(e.code||e.message));}
}
function studentLogout(){clearSession();home();}

function adminLogin(){app.innerHTML='<div class="login card"><h1>Login Admin</h1><label>Email</label><input id="aemail" class="input" type="email"><label>Password</label><input id="apass" class="input" type="password"><button class="btn block" id="doAdmin">Masuk</button><button class="btn gray block" id="bkAdmin" style="margin-top:8px">Kembali</button><div id="adminMsg"></div></div>';el('doAdmin').onclick=doAdminLogin;el('bkAdmin').onclick=home;}
async function doAdminLogin(){var email=el('aemail').value.trim(),p=el('apass').value;if(!email||!p){msg('adminMsg','Email dan password wajib.');return;}msg('adminMsg','Memeriksa admin…','info');try{if(auth.currentUser)await auth.signOut();await auth.signInWithEmailAndPassword(email,p);if(!(await isAdmin())){await auth.signOut();await ensureAnon();msg('adminMsg','Akun ini bukan admin aktif.');return;}admin();}catch(e){try{await ensureAnon();}catch(_){}msg('adminMsg','Login admin gagal: '+(e.code||e.message));}}
async function admin(){if(!(await isAdmin())){adminLogin();return;}var counts={classes:'-',students:'-',exams:'-'};try{var r=await Promise.all([db.collection('classes').get(),db.collection('students').get(),db.collection('examPublic').get()]);counts={classes:r[0].size,students:r[1].size,exams:r[2].size};}catch(e){}top('PakKom Exambro — Admin','<div class="wrap"><h1>Dashboard Admin</h1><div class="grid"><div class="card"><h3>Kelas</h3><h2>'+counts.classes+'</h2><button class="btn" id="mClass">Kelola Kelas</button></div><div class="card"><h3>Siswa</h3><h2>'+counts.students+'</h2><button class="btn" id="mStudent">Kelola Siswa</button></div><div class="card"><h3>Ujian</h3><h2>'+counts.exams+'</h2><button class="btn" id="mExam">Kelola Ujian</button></div></div><div class="notice">V12 Lite: password dan PIN baru disimpan sebagai hash. Validasi tetap dilakukan di browser karena versi ini tanpa Cloud Functions.</div></div>',adminLogout,'Keluar');el('mClass').onclick=classesAdmin;el('mStudent').onclick=studentsAdmin;el('mExam').onclick=examsAdmin;}
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

async function examsAdmin(){if(!(await isAdmin()))return adminLogin();var s=await db.collection('examPublic').get();var cards=s.docs.map(function(d){var x=d.data();return '<div class="exam"><div class="row"><h3>'+esc(x.name)+'</h3><span class="pill '+(x.active===false?'red':'green')+'">'+(x.active===false?'Nonaktif':'Aktif')+'</span></div><p class="muted">'+esc(x.subject||'')+' • '+esc((x.allowedClasses||[]).join(', ')||'Semua kelas')+'</p><div class="actions"><button class="btn small '+(x.active===false?'green':'orange')+' etoggle" data-id="'+esc(d.id)+'" data-active="'+(x.active===false?'0':'1')+'">'+(x.active===false?'Aktifkan':'Nonaktifkan')+'</button><button class="btn red small edel" data-id="'+esc(d.id)+'">Hapus</button></div></div>';}).join('');top('Kelola Ujian','<div class="wrap"><div class="card"><h2>Tambah Ujian</h2><input id="ename" class="input" placeholder="Nama ujian"><input id="esub" class="input" placeholder="Mata pelajaran"><input id="eurl" class="input" placeholder="https://..."><input id="eclass" class="input" placeholder="7A,7B atau kosong"><input id="epin" class="input" placeholder="PIN"><div class="grid"><input id="est" class="input" type="datetime-local"><input id="een" class="input" type="datetime-local"></div><button class="btn green" id="saveExam">Simpan Ujian</button></div><div class="card">'+(cards||'<div class="empty">Belum ada ujian.</div>')+'</div></div>',admin,'Admin');el('saveExam').onclick=saveExam;document.querySelectorAll('.etoggle').forEach(function(b){b.onclick=function(){toggleExam(b.dataset.id,b.dataset.active==='1');};});document.querySelectorAll('.edel').forEach(function(b){b.onclick=function(){deleteExam(b.dataset.id);};});}
async function saveExam(){var name=el('ename').value.trim(),sub=el('esub').value.trim(),url=el('eurl').value.trim(),pin=el('epin').value.trim(),classes=el('eclass').value.split(',').map(function(x){return x.trim().toUpperCase();}).filter(Boolean),st=el('est').value,en=el('een').value;if(!name||!https(url)||!pin)return alert('Nama, link HTTPS, dan PIN wajib.');if(st&&en&&new Date(en)<=new Date(st))return alert('Waktu selesai harus setelah mulai.');var data={name:name,subject:sub,url:url,allowedClasses:classes,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp()};if(st)data.startAt=new Date(st);if(en)data.endAt=new Date(en);var ref=await db.collection('examPublic').add(data);await db.collection('examSecrets').doc(ref.id).set({pinHash:await sha256(pin)});examsAdmin();}
async function toggleExam(id,a){await db.collection('examPublic').doc(id).update({active:!a});examsAdmin();}
async function deleteExam(id){if(!confirm('Hapus ujian?'))return;await db.collection('examPublic').doc(id).delete();await db.collection('examSecrets').doc(id).delete().catch(function(){});examsAdmin();}

['click','touchstart','keydown','scroll','pointerdown'].forEach(function(evt){document.addEventListener(evt,markActivity,{passive:true});});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible')checkIdle();});window.addEventListener('focus',checkIdle);setInterval(checkIdle,30000);

auth.onAuthStateChanged(function(){if(!window.__pakkom_started){window.__pakkom_started=true;home();}});
})();
