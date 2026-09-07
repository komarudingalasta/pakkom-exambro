'use strict';
window.PAKKOM_MODULES=window.PAKKOM_MODULES||[];window.PAKKOM_MODULES.push('admin-dashboard');
function adminLogin(){app.innerHTML='<div class="login card"><h1>Login Admin</h1><label>Email</label><input id="aemail" class="input" type="email"><label>Password</label><input id="apass" class="input" type="password"><button class="btn block" id="doAdmin">Masuk</button><button class="btn gray block" id="bkAdmin" style="margin-top:8px">Kembali</button><div id="adminMsg"></div></div>';el('doAdmin').onclick=doAdminLogin;el('bkAdmin').onclick=home;}
async function doAdminLogin(){var email=el('aemail').value.trim(),p=el('apass').value;if(!email||!p){msg('adminMsg','Email dan password wajib.');return;}msg('adminMsg','Memeriksa admin…','info');try{if(auth.currentUser)await auth.signOut();await auth.signInWithEmailAndPassword(email,p);if(!(await isAdmin())){await auth.signOut();await ensureAnon();msg('adminMsg','Akun ini bukan admin aktif.');return;}admin();}catch(e){try{await ensureAnon();}catch(_){}msg('adminMsg','Login admin gagal: '+(e.code||e.message));}}
async function admin(){
 if(!(await isAdmin())){adminLogin();return;}
 await loadBranding();
 var counts={classes:0,students:0,exams:0},examList=[],attempts=[];
 try{
  var r=await Promise.all([
   db.collection('classes').get(),
   db.collection('students').get(),
   db.collection('examPublic').get(),
   db.collection('examAttempts').get()
  ]);
  counts={classes:r[0].size,students:r[1].size,exams:r[2].size};
  examList=sortExamsBySchedule(r[2].docs.map(function(d){return Object.assign({id:d.id},d.data());}));
  attempts=r[3].docs.map(function(d){return Object.assign({id:d.id},d.data());});
 }catch(e){console.warn(e);}
 var upcoming=examList.filter(function(x){
   if(x.archived===true||x.active===false)return false;
   var en=toDate(x.endAt);
   return !en||en.getTime()>=nowMs();
  }).slice(0,4);
 var violations=attempts.filter(function(a){return a.completionReason==='left_exam_twice'||a.autoCompleted===true;}).length;
 var upcomingHtml=upcoming.length?upcoming.map(function(x,i){
   var dt=toDate(x.startAt),day=dt?String(dt.getDate()).padStart(2,'0'):'--',mon=dt?dt.toLocaleDateString('id-ID',{month:'short'}).replace('.','').toUpperCase():'';
   var cls=['blue','green','purple','orange'][i%4];
   return '<button class="dash-exam-row" data-exam-open="1"><span class="dash-date '+cls+'"><b>'+esc(day)+'</b><small>'+esc(mon)+'</small></span><span class="dash-exam-copy"><b>'+esc(x.name||'Ujian')+' • '+esc(x.subject||'')+'</b><small>'+esc(dt?dt.toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'Jadwal belum diatur')+' · '+esc(timeOnly(x.startAt))+'–'+esc(timeOnly(x.endAt))+'</small></span><span class="dash-chevron">›</span></button>';
 }).join(''):'<div class="empty compact">Belum ada jadwal ujian.</div>';

 var body='<main class="wrap admin-dashboard-v166">'+
  '<div class="dash-heading"><div><h1>Dashboard</h1><p class="muted">Ringkasan cepat pengelolaan ujian sekolah.</p></div><button class="btn outline mobile-admin-menu" id="adminQuickMenu">☰ Menu</button></div>'+
  '<div class="admin-summary-grid">'+
   '<button class="summary-tile tile-blue" id="mClass"><span class="summary-icon">'+uiIcon('classes')+'</span><span class="summary-copy"><b>Kelas</b><small>Kelola data kelas</small></span><strong>'+counts.classes+'</strong><span class="dash-chevron">›</span></button>'+
   '<button class="summary-tile tile-green" id="mStudent"><span class="summary-icon">'+uiIcon('students')+'</span><span class="summary-copy"><b>Siswa</b><small>Kelola data siswa</small></span><strong>'+counts.students+'</strong><span class="dash-chevron">›</span></button>'+
   '<button class="summary-tile tile-purple" id="mExam"><span class="summary-icon">'+uiIcon('exam')+'</span><span class="summary-copy"><b>Ujian</b><small>Kelola jadwal ujian</small></span><strong>'+counts.exams+'</strong><span class="dash-chevron">›</span></button>'+
   '<button class="summary-tile tile-orange" id="mMonitor"><span class="summary-icon">'+uiIcon('monitor')+'</span><span class="summary-copy"><b>Control Center</b><small>Monitoring real-time</small></span><strong class="summary-word">Buka</strong><span class="dash-chevron">›</span></button>'+
  '</div>'+
  '<div class="dashboard-lower-grid">'+
   '<section class="card clean-card"><div class="card-headline"><div><h2>Jadwal Ujian</h2><p class="muted">Akses cepat ke jadwal yang tersedia.</p></div><button class="text-action" id="seeAllExam">Lihat semua</button></div><div class="dash-exam-list">'+upcomingHtml+'</div></section>'+
   '<section class="card clean-card admin-shortcuts"><div class="card-headline"><div><h2>Menu Admin</h2><p class="muted">Pengaturan dan riwayat.</p></div></div>'+
    '<button class="shortcut-row" id="mResult"><span>'+uiIcon('result')+'</span><span><b>Hasil Ujian</b><small>Status pengerjaan & akses ulang</small></span><span>›</span></button>'+
    '<button class="shortcut-row" id="mScores"><span>'+uiIcon('exam')+'</span><span><b>Kelola Nilai</b><small>Input, import & publikasi nilai</small></span><span>›</span></button>'+'<button class="shortcut-row" id="mQuestions"><span>'+uiIcon('result')+'</span><span><b>Bank Soal</b><small>Buat soal & media gambar</small></span><span>›</span></button>'+'<button class="shortcut-row" id="mBuilder"><span>'+uiIcon('exam')+'</span><span><b>Buat Ujian Internal</b><small>Editor soal ala formulir</small></span><span>›</span></button>'+
    '<button class="shortcut-row" id="mBrand"><span>'+uiIcon('settings')+'</span><span><b>Identitas Sekolah</b><small>Nama aplikasi, sekolah & logo</small></span><span>›</span></button>'+
    '<div class="shortcut-row static"><span class="status-dot green"></span><span><b>Sinkronisasi sistem</b><small>Waktu server dan database aktif</small></span><span class="pill green">Aktif</span></div>'+
    '<div class="shortcut-row static"><span class="status-dot '+(violations?'red':'green')+'"></span><span><b>Pelanggaran tercatat</b><small>Ujian dihentikan otomatis</small></span><strong>'+violations+'</strong></div>'+
   '</section>'+
  '</div>'+
  '<div class="admin-footer">© 2026 '+esc(brandName())+'</div>'+
 '</main>';
 top(brandName()+' — Admin',body,adminLogout,'Keluar');
 el('mClass').onclick=classesAdmin;el('mStudent').onclick=studentsAdmin;el('mExam').onclick=examsAdmin;el('mMonitor').onclick=examControlCenter;
 el('mResult').onclick=examResultsAdmin;el('mScores').onclick=scoresAdmin;el('mQuestions').onclick=questionBankAdmin;el('mBuilder').onclick=function(){location.href='builder.html';};el('mBrand').onclick=brandingAdmin;el('seeAllExam').onclick=examsAdmin;
 document.querySelectorAll('[data-exam-open]').forEach(function(b){b.onclick=examsAdmin;});
 if(el('adminQuickMenu'))el('adminQuickMenu').onclick=openAdminQuickMenu;
}
function openAdminQuickMenu(){
 var d=document.createElement('div');d.className='mobile-sheet-backdrop';d.innerHTML='<div class="mobile-sheet admin-nav-sheet"><div class="sheet-handle"></div><div class="sheet-title-row"><div><h2>Menu Admin</h2><p class="muted">Pilih menu pengelolaan.</p></div><button class="sheet-close" aria-label="Tutup">×</button></div><button data-go="class">'+uiIcon('classes')+'<span><b>Kelas</b><small>Data dan password kelas</small></span><span>›</span></button><button data-go="student">'+uiIcon('students')+'<span><b>Siswa</b><small>Akun, import, approval</small></span><span>›</span></button><button data-go="exam">'+uiIcon('exam')+'<span><b>Ujian</b><small>Jadwal dan pengaturan</small></span><span>›</span></button><button data-go="monitor">'+uiIcon('monitor')+'<span><b>Control Center</b><small>Monitoring real-time</small></span><span>›</span></button><button data-go="result">'+uiIcon('result')+'<span><b>Hasil Ujian</b><small>Riwayat pengerjaan</small></span><span>›</span></button><button data-go="scores">'+uiIcon('exam')+'<span><b>Kelola Nilai</b><small>Input, import & publikasi</small></span><span>›</span></button><button data-go="questions">'+uiIcon('result')+'<span><b>Bank Soal</b><small>Buat soal & gambar</small></span><span>›</span></button><button data-go="builder">'+uiIcon('exam')+'<span><b>Buat Ujian Internal</b><small>Susun & terbitkan soal</small></span><span>›</span></button><button data-go="brand">'+uiIcon('settings')+'<span><b>Identitas</b><small>Logo dan nama sekolah</small></span><span>›</span></button><button class="sheet-logout" data-go="logout">Keluar</button></div>';
 document.body.appendChild(d);
 function close(){d.remove();}
 d.onclick=function(e){if(e.target===d)close();};d.querySelector('.sheet-close').onclick=close;
 var go={class:classesAdmin,student:studentsAdmin,exam:examsAdmin,monitor:examControlCenter,result:examResultsAdmin,scores:scoresAdmin,questions:questionBankAdmin,builder:function(){location.href='builder.html';},brand:brandingAdmin,logout:adminLogout};
 d.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){var fn=go[b.dataset.go];close();if(fn)fn();};});
}
async function adminLogout(){clearSession();try{await auth.signOut();await ensureAnon();}catch(e){}renderHome('');}

async function brandingAdmin(){if(!(await isAdmin()))return adminLogin();await loadBranding();top('Identitas & Logo','<div class="wrap"><div class="card branding-admin-card"><div class="section-head"><div><h2>Identitas Aplikasi</h2><p class="muted">Semua kolom boleh dikosongkan. Logo dapat diganti kapan saja.</p></div></div><div class="branding-editor"><div class="branding-preview">'+(branding.logoDataUrl?'<img id="brandPreview" src="'+esc(branding.logoDataUrl)+'" alt="Logo">':'<div id="brandPreview" class="brand-placeholder">P</div>')+'</div><div class="branding-fields"><label>Nama Aplikasi</label><input id="brandAppName" class="input" value="'+esc(branding.appName==='PakKom Exambro'?'':branding.appName)+'" placeholder="PakKom Exambro"><label>Nama / Identitas Sekolah</label><input id="brandSchool" class="input" value="'+esc(branding.schoolName)+'" placeholder="Contoh: SMP Negeri ... (boleh kosong)"><label>Upload Logo</label><input id="brandLogoFile" class="input" type="file" accept="image/png,image/jpeg,image/webp"><div class="actions"><button class="btn green" id="saveBrand">Simpan Identitas</button><button class="btn red" id="removeLogo">Hapus Logo</button></div><div id="brandMsg"></div></div></div></div></div>',admin,'Admin');el('brandLogoFile').onchange=previewBrandLogo;el('saveBrand').onclick=saveBranding;el('removeLogo').onclick=removeBrandLogo;}
async function resizeLogo(file){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var max=256,scale=Math.min(1,max/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*scale)),h=Math.max(1,Math.round(im.height*scale)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);resolve(c.toDataURL('image/png'));};im.onerror=reject;im.src=r.result;};r.onerror=reject;r.readAsDataURL(file);});}
async function previewBrandLogo(){var f=el('brandLogoFile').files[0];if(!f)return;try{var data=await resizeLogo(f),old=el('brandPreview');if(old){var img=document.createElement('img');img.id='brandPreview';img.src=data;img.alt='Logo';old.replaceWith(img);}el('brandLogoFile').dataset.preview=data;}catch(e){msg('brandMsg','Logo tidak dapat dibaca.');}}
async function saveBranding(){var appName=el('brandAppName').value.trim()||'PakKom Exambro',school=el('brandSchool').value.trim(),preview=el('brandLogoFile').dataset.preview||branding.logoDataUrl;try{await db.collection('settings').doc('branding').set({appName:appName,schoolName:school,logoDataUrl:preview,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});await loadBranding();await pakkomAlert('Identitas aplikasi berhasil disimpan.');brandingAdmin();}catch(e){msg('brandMsg','Gagal menyimpan: '+(e.code||e.message));}}
async function removeBrandLogo(){var ok=await pakkomConfirm('Hapus logo dari aplikasi?');if(!ok)return;try{await db.collection('settings').doc('branding').set({logoDataUrl:'',updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});await loadBranding();brandingAdmin();}catch(e){pakkomAlert('Logo gagal dihapus: '+(e.code||e.message));}}
