'use strict';
window.PAKKOM_MODULES=window.PAKKOM_MODULES||[];window.PAKKOM_MODULES.push('student');
async function home(){
 disableExamGuard();
 if(await restoreStudent()){studentDashboard();return;}
 var u=auth.currentUser;if(u&&!u.isAnonymous&&await isAdmin()){await loadBranding();await syncServerClock();admin();return;}
 try{if(u&&!u.isAnonymous){await auth.signOut();}await ensureAnon();}catch(e){}
 await loadBranding();await syncServerClock();renderHome('');
}
function renderHome(note){
 var logo=branding.logoDataUrl?'<div class="home-brand-logo uploaded"><img src="'+esc(branding.logoDataUrl)+'" alt="Logo"></div>':'<div class="home-brand-logo">P</div>';
 app.innerHTML='<main class="home-page simple-home"><section class="simple-login-shell"><div class="simple-brand">'+logo+'<div><h1>'+esc(brandName())+'</h1>'+(branding.schoolName?'<p>'+esc(branding.schoolName)+'</p>':'')+'</div></div><div class="card simple-login-card"><h2>Masuk</h2><p class="muted">Gunakan NIS siswa atau email admin.</p>'+(note?'<div class="notice">'+esc(note)+'</div>':'')+'<label>NIS / Email Admin</label><input id="unifiedAccount" class="input" autocomplete="username" placeholder="NIS atau email"><label>Password</label><input id="unifiedPass" class="input" type="password" autocomplete="current-password" placeholder="Password"><button class="btn block" id="unifiedLogin">Masuk</button><button class="btn gray block" id="newStudent" style="margin-top:8px">Daftar Siswa Baru</button><div id="unifiedMsg"></div></div><div class="home-version">PakKom Exambro V18.0.1</div></section></main>';
 el('unifiedLogin').onclick=doUnifiedLogin;el('newStudent').onclick=classGate;el('unifiedPass').onkeydown=function(e){if(e.key==='Enter')doUnifiedLogin();};
}
async function doUnifiedLogin(){
 var account=el('unifiedAccount').value.trim(),p=el('unifiedPass').value;if(!account||!p){msg('unifiedMsg','Akun dan password wajib diisi.');return;}msg('unifiedMsg','Memeriksa akun…','info');
 if(account.indexOf('@')>=0){try{if(auth.currentUser)await auth.signOut();await auth.signInWithEmailAndPassword(account,p);if(!(await isAdmin())){await auth.signOut();await ensureAnon();msg('unifiedMsg','Akun admin tidak aktif atau tidak memiliki akses.');return;}await loadBranding();admin();}catch(e){try{await ensureAnon();}catch(_){}msg('unifiedMsg','Login admin gagal. Periksa email dan password.');}return;}
 try{await ensureAnon();var q=await db.collection('students').where('nis','==',account).limit(2).get();if(q.empty){msg('unifiedMsg','NIS tidak ditemukan.');return;}var d=q.docs[0],x=d.data();if(x.approved!==true){msg('unifiedMsg','Pendaftaran masih menunggu persetujuan admin.','info');return;}if(x.active!==true){msg('unifiedMsg','Akun siswa sedang tidak aktif.');return;}var ok=x.passwordHash?(await sha256(p))===String(x.passwordHash):String(x.password||'')===String(p);if(!ok){msg('unifiedMsg','Password siswa salah.');return;}state.classId=String(x.classId||'');state.student=Object.assign({id:d.id},x);studentClassAccessGate();}catch(e){msg('unifiedMsg','Login siswa gagal: '+(e.code||e.message));}
}

async function studentClassAccessGate(){
 if(!state.student||!state.classId)return home();
 app.innerHTML='<div class="login card"><h1>Masuk Kelas</h1><p class="muted">Akun siswa berhasil diverifikasi. Masukkan password kelas untuk membuka halaman siswa.</p><div class="notice"><b>'+esc(state.student.name)+'</b><br>Kelas '+esc(state.classId)+'</div><label>Password Kelas</label><input id="studentClassPass" class="input" type="password" autocomplete="current-password" placeholder="Password kelas"><button class="btn block" id="verifyStudentClass">Lanjut ke Halaman Siswa</button><button class="btn gray block" id="cancelStudentClass" style="margin-top:8px">Keluar</button><div id="studentClassMsg"></div></div>';
 el('verifyStudentClass').onclick=verifyStudentClassAccess;el('cancelStudentClass').onclick=studentLogout;el('studentClassPass').onkeydown=function(e){if(e.key==='Enter')verifyStudentClassAccess();};
}
async function verifyStudentClassAccess(){
 var p=el('studentClassPass').value;if(!p)return msg('studentClassMsg','Password kelas wajib diisi.');
 msg('studentClassMsg','Memeriksa password kelas…','info');
 try{
  var d=await db.collection('classes').doc(state.classId).get();
  if(!d.exists)return msg('studentClassMsg','Kelas belum terdaftar. Hubungi admin.');
  var x=d.data()||{};if(x.active===false)return msg('studentClassMsg','Kelas sedang dinonaktifkan oleh admin.');
  var ok=x.passwordHash?(await sha256(p))===String(x.passwordHash):String(x.password||x.demoPassword||'')===String(p);
  if(!ok)return msg('studentClassMsg','Password kelas salah.');
  saveSession();studentDashboard();
 }catch(e){msg('studentClassMsg','Kelas tidak dapat diverifikasi: '+(e.code||e.message));}
}

async function loadClasses(){
 await ensureAnon();
 try{var s=await db.collection('classes').where('active','==',true).get();classList=s.docs.map(function(d){return Object.assign({id:d.id},d.data());}).sort(function(a,b){return String(a.id).localeCompare(String(b.id),undefined,{numeric:true});});return true;}catch(e){console.error(e);classList=[];return false;}
}
async function classGate(){
 app.innerHTML='<div class="login card"><h1>Masuk Kelas</h1><label>Kelas</label><select id="kelas"><option>Memuat…</option></select><label>Password Kelas</label><input id="kpw" class="input" type="password"><button class="btn block" id="goClass">Lanjut</button><button class="btn gray block" id="backHome" style="margin-top:8px">Kembali</button><div id="classMsg"></div></div>';
 el('backHome').onclick=home;el('goClass').onclick=verifyClass;
 var ok=await loadClasses();var s=el('kelas');if(ok&&classList.length)s.innerHTML='<option value="">-- Pilih kelas --</option>'+classList.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.name||x.id)+'</option>';}).join('');else{s.innerHTML='<option value="">-- Kelas belum tersedia --</option>';msg('classMsg','Kelas gagal dimuat. Pastikan Anonymous Authentication aktif dan Firestore Rules V18.0 sudah dipublish.');}
}
async function verifyClass(){
 var id=el('kelas').value,p=el('kpw').value;if(!id||!p){msg('classMsg','Pilih kelas dan masukkan password.');return;}
 msg('classMsg','Memeriksa kelas…','info');
 try{var d=await db.collection('classes').doc(id).get();if(!d.exists){msg('classMsg','Kelas tidak ditemukan.');return;}var x=d.data();if(x.active===false){msg('classMsg','Kelas sedang dinonaktifkan.');return;}var ok=false;if(x.passwordHash)ok=(await sha256(p))===String(x.passwordHash);else ok=String(x.password||x.demoPassword||'')===String(p);if(!ok){msg('classMsg','Password kelas salah.');return;}state.classId=id;registerStudent();}catch(e){msg('classMsg','Kelas tidak dapat diperiksa: '+(e.code||e.message));}
}
function studentChoice(){registerStudent();}
function loginStudent(){app.innerHTML='<div class="login card"><h1>Login Siswa</h1><span class="pill">Kelas '+esc(state.classId)+'</span><label>NIS</label><input id="lnis" class="input" inputmode="numeric"><label>Password</label><input id="lpw" class="input" type="password"><button class="btn block" id="doSL">Masuk</button><button class="btn gray block" id="bkSL" style="margin-top:8px">Kembali</button><div id="loginMsg"></div></div>';el('doSL').onclick=doStudentLogin;el('bkSL').onclick=studentChoice;}
async function doStudentLogin(){
 var nis=el('lnis').value.trim(),p=el('lpw').value;if(!nis||!p){msg('loginMsg','NIS dan password wajib.');return;}msg('loginMsg','Memeriksa akun…','info');
 try{await ensureAnon();var q=await db.collection('students').where('nis','==',nis).where('classId','==',state.classId).limit(1).get();if(q.empty){msg('loginMsg','NIS tidak ditemukan di kelas ini.');return;}var d=q.docs[0],x=d.data();if(x.approved!==true){msg('loginMsg','Pendaftaran masih menunggu persetujuan admin.','info');return;}if(x.active!==true){msg('loginMsg','Akun siswa belum aktif atau dinonaktifkan.');return;}var ok=x.passwordHash?(await sha256(p))===String(x.passwordHash):String(x.password||'')===String(p);if(!ok){msg('loginMsg','Password siswa salah.');return;}state.student=Object.assign({id:d.id},x);saveSession();studentDashboard();}catch(e){msg('loginMsg','Login gagal: '+(e.code||e.message));}
}
function registerStudent(){app.innerHTML='<div class="login card"><h1>Daftar Mandiri</h1><span class="pill">Kelas '+esc(state.classId)+'</span><label>NIS</label><input id="rnis" class="input" inputmode="numeric"><label>Nama Lengkap</label><input id="rname" class="input"><label>Password</label><input id="rpw" class="input" type="password"><label>Konfirmasi Password</label><input id="rcpw" class="input" type="password"><button class="btn green block" id="doReg">Daftar</button><button class="btn gray block" id="bkReg" style="margin-top:8px">Kembali</button><div id="regMsg"></div></div>';el('doReg').onclick=doRegister;el('bkReg').onclick=home;}
async function doRegister(){
 var nis=el('rnis').value.trim(),name=el('rname').value.trim(),p=el('rpw').value,cp=el('rcpw').value;if(!nis||!name||!p){msg('regMsg','Semua data wajib diisi.');return;}if(p.length<6){msg('regMsg','Password minimal 6 karakter.');return;}if(p!==cp){msg('regMsg','Konfirmasi password tidak sama.');return;}msg('regMsg','Mendaftarkan…','info');
 try{await ensureAnon();var q=await db.collection('students').where('nis','==',nis).limit(1).get();if(!q.empty){msg('regMsg','NIS sudah terdaftar.');return;}var h=await sha256(p);await db.collection('students').add({nis:nis,name:name,classId:state.classId,passwordHash:h,active:false,approved:false,registrationSource:'self',createdByAuthUid:auth.currentUser.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()});app.innerHTML='<div class="login card"><h1>Pendaftaran Berhasil</h1><div class="notice"><b>'+esc(name)+'</b>, akun Anda sudah dikirim dan <b>menunggu persetujuan admin/guru</b>.</div><p class="muted">Setelah disetujui, kembali ke halaman masuk menggunakan NIS dan password yang dibuat.</p><button class="btn block" id="toLogin">Ke Halaman Masuk</button></div>';el('toLogin').onclick=home;}catch(e){msg('regMsg','Pendaftaran gagal: '+(e.code||e.message));}
}

async function studentDashboard(){
 stopExamTimer();checkIdle();if(!state.student)return;
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
 await syncServerClock();var now=nowDate(),todayCount=0,completedCount=0,pendingToday=0;
 state.exams.forEach(function(x){var at=attempts[x.id],sd=toDate(x.startAt);if(at&&at.status==='completed')completedCount++;if(sd&&sameDay(sd,now)){todayCount++;if(!at||at.status!=='completed')pendingToday++;}});
 var groups=groupByExamDate(state.exams),cards='';
 groups.forEach(function(g){cards+='<section class="student-exam-day"><div class="student-exam-day-title"><div class="exam-date-badge"><strong>'+esc(g.info.date)+'</strong><span>'+esc(g.info.month||'Jadwal')+'</span></div><div><b>'+esc(g.info.day)+'</b><span>'+esc(g.info.full)+'</span></div></div><div class="exam-grid">'+g.items.map(function(x){return examCard(x,attempts[x.id]);}).join('')+'</div></section>';});
 if(!cards)cards='<div class="empty">Belum ada ujian aktif untuk kelas ini.</div>';
 var hero='<section class="student-hero"><div><span class="eyebrow">PORTAL SISWA</span><h1>Halo, '+esc(state.student.name)+'</h1><p>Kelas '+esc(state.classId)+' • NIS '+esc(state.student.nis)+'</p></div><div class="student-hero-actions"><div class="student-session"><span class="session-dot"></span>Sesi aktif</div><button class="btn outline small" id="studentScoresBtn">Nilai Saya</button><button class="btn gray small" id="changeStudentPassword">Ganti Sandi</button></div></section>';
 var stats='<section class="student-stats"><div class="student-stat"><span>Ujian Hari Ini</span><b>'+todayCount+'</b></div><div class="student-stat"><span>Belum Selesai Hari Ini</span><b>'+pendingToday+'</b></div><div class="student-stat"><span>Total Sudah Ujian</span><b>'+completedCount+'</b></div></section>';
 top('PakKom Exambro','<div class="wrap student-dashboard">'+hero+stats+'<div class="card schedule-card"><div class="section-head"><div><h2>Jadwal Ujian</h2><p class="muted">Pilih ujian sesuai jadwal. Status pengerjaan akan tetap tersimpan meskipun halaman direfresh.</p></div><span class="pill gray">'+state.exams.length+' ujian • '+serverClockLabel()+'</span></div>'+cards+'</div></div>',studentLogout,'Keluar');
 Array.prototype.forEach.call(document.querySelectorAll('.exam-start'),function(b){b.onclick=function(){examPin(b.dataset.id);};});
 Array.prototype.forEach.call(document.querySelectorAll('.exam-resume'),function(b){b.onclick=function(){var x=state.exams.find(function(a){return a.id===b.dataset.id;});if(x){state.currentExam=x;saveActiveExam(x.id);resumeExam(x);}};});
 if(el('studentScoresBtn'))el('studentScoresBtn').onclick=studentScores;if(el('changeStudentPassword'))el('changeStudentPassword').onclick=studentChangePassword;
}
function examCard(x,attempt){
 var n=nowMs(),sd=toDate(x.startAt),ed=toDate(x.endAt),st=sd?sd.getTime():0,en=ed?ed.getTime():0,future=st&&n<st,past=en&&n>en;
 var meta='<div class="exam-meta">'+(sd?'<span class="time-chip">Mulai '+esc(timeOnly(x.startAt))+'</span>':'')+(ed?'<span class="time-chip">Selesai '+esc(timeOnly(x.endAt))+'</span>':'')+'</div>';
 if(attempt&&attempt.status==='completed'){
  var violation=attempt.completionReason==='left_exam_twice'||attempt.autoCompleted===true;
  return '<div class="exam-card-modern"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill '+(violation?'red':'orange')+'">Sudah Ujian</span></div>'+meta+'<div class="notice '+(violation?'violation-note':'')+'">'+(violation?'<b>Diakhiri otomatis karena pelanggaran.</b><br>Sistem mencatat siswa keluar/pindah tab sebanyak 2 kali.':'Ujian sudah selesai dan terkunci.')+'</div><button class="btn '+(violation?'red':'orange')+' block" disabled>Sudah Ujian</button></div>';
 }
 if(attempt&&attempt.status==='in_progress')return '<div class="exam-card-modern"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill orange">Sedang dikerjakan</span></div>'+meta+'<button class="btn block exam-resume" data-id="'+esc(x.id)+'">Lanjutkan Ujian</button></div>';
 if(past)return '<div class="exam-card-modern missed-exam"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill gray">Tidak Ujian</span></div>'+meta+'<div class="notice">Jadwal ujian telah berakhir dan tidak ada aktivitas pengerjaan.</div><button class="btn gray block" disabled>Tidak Ujian</button></div>';
 var disabled=future;
 return '<div class="exam-card-modern"><div class="row"><div><h3>'+esc(x.name)+'</h3><div class="muted">'+esc(x.subject||'Ujian online')+'</div></div><span class="pill '+(disabled?'orange':'green')+'">'+(future?'Belum mulai':'Aktif')+'</span></div>'+meta+'<button class="btn block '+(disabled?'gray':'')+' exam-start" data-id="'+esc(x.id)+'" '+(disabled?'disabled':'')+'>'+(disabled?'Belum tersedia':'Mulai Ujian')+'</button></div>';
}

async function studentChangePassword(){
 if(!state.student)return studentDashboard();
 top('Ganti Sandi','<div class="wrap"><div class="card password-card"><h2>Ganti Sandi Siswa</h2><p class="muted">Masukkan sandi saat ini, lalu buat sandi baru minimal 6 karakter.</p><label>Sandi Saat Ini</label><input id="oldStudentPass" class="input" type="password" autocomplete="current-password"><label>Sandi Baru</label><input id="newStudentPass" class="input" type="password" autocomplete="new-password"><label>Ulangi Sandi Baru</label><input id="confirmStudentPass" class="input" type="password" autocomplete="new-password"><button class="btn green block" id="saveStudentPass">Simpan Sandi Baru</button><div id="studentPassMsg"></div></div></div>',studentDashboard,'Kembali');
 el('saveStudentPass').onclick=saveStudentPassword;
}
async function saveStudentPassword(){
 var oldp=el('oldStudentPass').value,newp=el('newStudentPass').value,confirm=el('confirmStudentPass').value;
 if(!oldp||!newp||!confirm)return msg('studentPassMsg','Semua kolom sandi wajib diisi.');
 if(newp.length<6)return msg('studentPassMsg','Sandi baru minimal 6 karakter.');
 if(newp!==confirm)return msg('studentPassMsg','Pengulangan sandi baru tidak sama.');
 var currentHash=state.student.passwordHash?String(state.student.passwordHash):'',oldOk=currentHash?(await sha256(oldp))===currentHash:String(state.student.password||'')===String(oldp);
 if(!oldOk)return msg('studentPassMsg','Sandi saat ini salah.');
 if(oldp===newp)return msg('studentPassMsg','Sandi baru harus berbeda dari sandi saat ini.');
 try{var h=await sha256(newp);await db.collection('students').doc(state.student.id).update({passwordHash:h,password:firebase.firestore.FieldValue.delete(),passwordUpdatedAt:firebase.firestore.FieldValue.serverTimestamp(),passwordAdminVisible:false});state.student.passwordHash=h;state.student.passwordAdminVisible=false;delete state.student.password;saveSession();await pakkomAlert('Sandi berhasil diganti. Gunakan sandi baru saat login berikutnya.');studentDashboard();}catch(e){msg('studentPassMsg','Sandi gagal diganti: '+(e.code||e.message));}
}

async function examPin(id){
 var x=state.exams.find(function(a){return a.id===id;});if(!x)return;var at=await getAttempt(id);
 if(at&&at.status==='completed'){await pakkomAlert('Ujian ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.');studentDashboard();return;}
 if(at&&at.status==='in_progress'){state.currentExam=x;saveActiveExam(x.id);resumeExam(x);return;}
 state.currentExam=x;
 var inf=dateInfo(x.startAt);
 app.innerHTML='<main class="auth-page"><section class="auth-shell"><div class="auth-brand"><span class="logo large">P</span><div><b>PakKom Exambro</b><span>Verifikasi Ujian</span></div></div><div class="card auth-card"><span class="eyebrow">PIN UJIAN</span><h1>'+esc(x.name)+'</h1><p class="muted">'+esc(x.subject||'Ujian online')+' • '+esc(inf.full)+'</p><label>Masukkan PIN ujian</label><input id="pin" class="input pin-input" inputmode="numeric" type="password" placeholder="••••••"><button class="btn block" id="checkPin">Verifikasi PIN</button><button class="btn gray block" id="bkDash" style="margin-top:8px">Kembali ke Jadwal</button><div id="pinMsg"></div></div></section></main>';
 el('checkPin').onclick=verifyPin;el('bkDash').onclick=studentDashboard;
}
async function verifyPin(){
 var p=el('pin').value.trim();if(!p){msg('pinMsg','PIN wajib diisi.');return;}
 try{var at=await getAttempt(state.currentExam.id);if(at&&at.status==='completed'){msg('pinMsg','Ujian ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.');return;}var d=await db.collection('examSecrets').doc(state.currentExam.id).get();if(!d.exists){msg('pinMsg','PIN ujian belum disetel.');return;}var x=d.data(),ok=x.pinHash?(await sha256(p))===String(x.pinHash):String(x.pin||'')===String(p);if(!ok){msg('pinMsg','PIN salah.');return;}showExamPreparation(state.currentExam);}catch(e){msg('pinMsg','PIN tidak dapat diperiksa: '+(e.code||e.message));}
}
function showExamPreparation(x){
 var info=dateInfo(x.startAt),classes=(x.allowedClasses||[]).join(', ')||'Semua kelas';
 app.innerHTML='<main class="prep-page"><section class="prep-shell"><div class="prep-heading"><span class="eyebrow">PERSIAPAN UJIAN</span><h1>'+esc(x.name)+'</h1><p>'+esc(x.subject||'Ujian online')+'</p></div><div class="prep-grid"><div class="card prep-main"><div class="prep-student"><div class="avatar">'+esc((state.student.name||'S').charAt(0).toUpperCase())+'</div><div><b>'+esc(state.student.name)+'</b><span>NIS '+esc(state.student.nis)+' • Kelas '+esc(state.classId)+'</span></div></div><div class="prep-details"><div><span>Hari & Tanggal</span><b>'+esc(info.full)+'</b></div><div><span>Waktu</span><b>'+esc(timeOnly(x.startAt))+' – '+esc(timeOnly(x.endAt))+'</b></div><div><span>Durasi Jadwal</span><b>'+esc(examDurationText(x))+'</b></div><div><span>Peserta</span><b>'+esc(classes)+'</b></div></div></div><div class="card prep-rules"><h3>Sebelum memulai</h3><ol><li>Pastikan koneksi internet stabil dan perangkat memiliki daya yang cukup.</li><li>Jangan menekan tombol selesai sebelum jawaban pada soal benar-benar sudah dikirim.</li><li>Jika halaman direfresh saat mengerjakan, PakKom Exambro akan mengembalikan Anda ke soal.</li><li>Jangan berpindah tab, membuka aplikasi lain, atau meninggalkan halaman ujian. Pelanggaran pertama mendapat peringatan; pelanggaran kedua membuat ujian otomatis selesai dan terkunci.</li><li>Ujian yang sudah ditandai selesai akan terkunci dan hanya admin yang dapat mengaktifkannya kembali.</li></ol><button class="btn green block big" id="beginExam">Mulai Ujian Sekarang</button><button class="btn gray block" id="cancelPrep" style="margin-top:8px">Kembali</button><div id="prepMsg"></div></div></div></section></main>';
 el('beginExam').onclick=function(){launchExam(x);};el('cancelPrep').onclick=studentDashboard;
}
function embedUrl(url){var u=String(url||'');if(/docs\.google\.com\/forms/i.test(u)){if(u.indexOf('embedded=true')<0)u+=(u.indexOf('?')>=0?'&':'?')+'embedded=true';}return u;}
async function launchExam(x){
 var ref=db.collection('examAttempts').doc(attemptId(x.id)),at=await getAttempt(x.id);if(at&&at.status==='completed'){await pakkomAlert('Ujian ini sudah selesai dikerjakan dan tidak dapat dibuka kembali.');return studentDashboard();}
 var b=el('beginExam');if(b){b.disabled=true;b.textContent='Membuka ujian…';}
 if(!at){try{await ref.set({examId:x.id,studentId:state.student.id,nis:state.student.nis,classId:state.classId,status:'in_progress',createdByAuthUid:auth.currentUser.uid,startedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});}catch(e){if(b){b.disabled=false;b.textContent='Mulai Ujian Sekarang';}msg('prepMsg','Ujian belum dapat dimulai: '+(e.code||e.message));return;}}
 saveActiveExam(x.id);resumeExam(x);
}
function resumeExam(x){
 syncServerClock();state.currentExam=x;saveActiveExam(x.id);var u=embedUrl(x.url),wc=getExamWarningCount(x.id);if(wc>=2){app.innerHTML='<div class="login card"><h2>Mengunci ujian…</h2><p class="muted">Batas pelanggaran perpindahan halaman telah tercapai.</p></div>';disableExamGuard();forceCompleteForViolation(x);return;}
 app.innerHTML='<div class="exam-page"><div class="exam-topbar"><div class="exam-title">'+brandLogo('logo')+'<div><b>'+esc(x.name)+'</b><span>'+esc(x.subject||'Ujian online')+'</span></div></div><div class="exam-timer"><span>Sisa Waktu</span><b id="examCountdown">--:--:--</b></div><button class="btn finish-btn" id="finishExam">Sudah Selesai Mengerjakan</button></div><div class="exam-info-bar"><span><b>'+esc(state.student.name)+'</b> • Kelas '+esc(state.classId)+'</span><span>Jadwal '+esc(timeOnly(x.startAt))+' – '+esc(timeOnly(x.endAt))+'</span><button class="btn gray small" id="fullBtn">Fullscreen</button></div><div class="exam-warning"><b>Mode ujian aktif.</b> Jangan berpindah tab/aplikasi. Pelanggaran '+wc+'/2. Pelanggaran kedua akan otomatis mengakhiri ujian.</div><div class="exam-frame-wrap"><iframe class="exam-frame" src="'+esc(u)+'" allow="fullscreen" referrerpolicy="no-referrer-when-downgrade"></iframe></div></div>';
 el('fullBtn').onclick=function(){var target=document.documentElement;if(target.requestFullscreen)target.requestFullscreen().catch(function(){});};el('finishExam').onclick=finishCurrentExam;startExamTimer(x);startExamSessionHeartbeat();enableExamGuard();
}
async function finishCurrentExam(){
 var x=state.currentExam;if(!x)return;var confirmed=await pakkomConfirm('Pastikan jawaban sudah dikirim. Setelah ditandai selesai, ujian ini tidak dapat dikerjakan lagi. Lanjutkan?');if(!confirmed)return;disableExamGuard();
 var b=el('finishExam');if(b){b.disabled=true;b.textContent='Menyimpan…';}
 try{var ref=db.collection('examAttempts').doc(attemptId(x.id)),at=await getAttempt(x.id);if(at&&at.status==='completed'){stopExamTimer();stopExamSessionHeartbeat();saveActiveExam('');state.currentExam=null;return studentDashboard();}await ref.set({examId:x.id,studentId:state.student.id,nis:state.student.nis,classId:state.classId,status:'completed',createdByAuthUid:(at&&at.createdByAuthUid)||auth.currentUser.uid,completedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});stopExamTimer();stopExamSessionHeartbeat();saveActiveExam('');clearExamWarningCount(x.id);state.currentExam=null;await pakkomAlert('Ujian sudah selesai dan telah dikunci.');studentDashboard();}catch(e){enableExamGuard();if(b){b.disabled=false;b.textContent='Sudah Selesai Mengerjakan';}pakkomAlert('Status selesai gagal disimpan: '+(e.code||e.message));}
}
function studentLogout(){disableExamGuard();stopExamTimer();stopExamSessionHeartbeat();clearSession();home();}
