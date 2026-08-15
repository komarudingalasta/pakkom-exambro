const app=document.getElementById("app");
firebase.initializeApp(window.FIREBASE_CONFIG);
const auth=firebase.auth(),db=firebase.firestore();
let currentClass=null,currentExams=[];

const DEMO_CLASS={id:"7A",password:"123456",active:true};
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const fmtDate=v=>v?.toDate?v.toDate().toLocaleString("id-ID"):v?new Date(v).toLocaleString("id-ID"):"-";
const isHttps=u=>/^https:\/\//i.test(String(u||""));

function home(){
 currentClass=null;
 app.innerHTML=`<div class="login card">
 <h1>PakKom Exambro V5</h1><p class="muted">Rumah ujian sekolah</p>
 <div class="grid"><button class="btn" onclick="classLogin()">Login Siswa</button><button class="btn gray" onclick="adminLogin()">Login Admin</button></div>
 <p class="notice"><b>V5:</b> login per kelas, daftar ujian, PIN ujian, pembatasan kelas, jadwal, dan dashboard admin.</p>
 </div>`;
}
function top(title,logout=true){return `<div class="top"><div class="brand">PakKom Exambro</div>${logout?'<button class="btn gray small" onclick="home()">Beranda</button>':''}</div><div class="wrap"><h1>${esc(title)}</h1>`}

function classLogin(){
 app.innerHTML=`<div class="login card"><h1>Login Siswa</h1>
 <label>Kelas</label><select id="kelas"><option value="">-- Pilih kelas --</option><option>7A</option></select>
 <label>Password Kelas</label><input id="pw" class="input" type="password" autocomplete="current-password">
 <button class="btn" onclick="loginClass()">MASUK</button> <button class="btn gray" onclick="home()">Kembali</button><p id="msg"></p>
 </div>`;
 loadClassesForLogin();
}
async function loadClassesForLogin(){
 try{
  const s=await db.collection("classes").where("active","==",true).get();
  const list=s.docs.map(d=>d.id).sort();
  const opts=[...new Set(["7A",...list])];
  kelas.innerHTML='<option value="">-- Pilih kelas --</option>'+opts.map(x=>`<option>${esc(x)}</option>`).join("");
 }catch(e){/* demo fallback */}}
async function loginClass(){
 const k=kelas.value,p=pw.value;
 if(!k||!p)return msg.innerHTML='<span class="error">Pilih kelas dan masukkan password.</span>';
 if(k===DEMO_CLASS.id&&p===DEMO_CLASS.password){currentClass=k;return classDashboard(k);}
 try{
  const d=await db.collection("classes").doc(k).get(),x=d.data();
  if(x?.active!==false&&x?.demoPassword===p){currentClass=k;return classDashboard(k);}
 }catch(e){}
 msg.innerHTML='<span class="error">Kelas atau password salah.</span>';
}

async function classDashboard(k){
 let exams=[];
 try{
  const s=await db.collection("examPublic").where("active","==",true).get();
  exams=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>{
   const allowed=x.allowedClasses;
   if(Array.isArray(allowed)&&allowed.length)return allowed.includes(k);
   return true;
  });
 }catch(e){}
 currentExams=exams;
 app.innerHTML=top("Dashboard Kelas "+k)+`
 <div class="card"><div class="row"><div><span class="pill">Kelas ${esc(k)}</span><p class="muted">Pilih ujian yang tersedia untuk kelas Anda.</p></div><button class="btn gray small" onclick="classLogin()">Ganti Kelas</button></div></div>
 <div class="card"><h2>Ujian Tersedia</h2>
 ${exams.length?exams.map(examCard).join(""):'<div class="empty">Belum ada ujian aktif untuk kelas ini.</div>'}</div></div>`;
}
function examCard(x){
 const now=Date.now(),start=x.startAt?.toDate?x.startAt.toDate().getTime():x.startAt?new Date(x.startAt).getTime():0,end=x.endAt?.toDate?x.endAt.toDate().getTime():x.endAt?new Date(x.endAt).getTime():0;
 let status="";
 if(start&&now<start)status=`<span class="pill">Mulai ${esc(fmtDate(x.startAt))}</span>`;
 if(end&&now>end)status=`<span class="pill">Berakhir</span>`;
 const can=!((start&&now<start)||(end&&now>end));
 return `<div class="exam"><div class="row"><h3>${esc(x.name)}</h3>${status}</div><p class="muted">${esc(x.subject||"Ujian online")} ${x.description?"• "+esc(x.description):""}</p>
 <button class="btn ${can?"":"gray"}" ${can?"":"disabled"} onclick="openPin('${esc(x.id)}')">${can?"MULAI UJIAN":"BELUM TERSEDIA"}</button></div>`;
}
async function openPin(id){
 const x=currentExams.find(a=>a.id===id);if(!x)return;
 app.innerHTML=`<div class="login card"><h1>${esc(x.name)}</h1><p class="muted">${esc(x.subject||"Ujian online")}</p>
 <label>PIN Ujian</label><input id="pin" class="input" inputmode="numeric" maxlength="12" placeholder="Masukkan PIN">
 <button class="btn" onclick="verifyPin('${esc(id)}')">MULAI UJIAN</button>
 <button class="btn gray" onclick="classDashboard('${esc(currentClass)}')">Kembali</button>
 <p class="notice">PIN diberikan oleh pengawas/admin.</p><p id="pm"></p></div>`;
}
async function verifyPin(id){
 const p=pin.value.trim(),x=currentExams.find(a=>a.id===id);if(!p)return pm.innerHTML='<span class="error">Masukkan PIN.</span>';
 // V5 keeps secret PIN out of examPublic. A demoPin may be used for testing only.
 if(x?.demoPin&&p===String(x.demoPin))return launchExam(x);
 try{
  const s=await db.collection("examSecrets").doc(id).get();
  // Only works if Firestore Rules permit this read; production should move this check server-side.
  if(s.exists&&String(s.data().pin)===p)return launchExam(x);
 }catch(e){}
 pm.innerHTML='<span class="error">PIN salah.</span>';
}
function launchExam(x){
 if(!isHttps(x.url))return pm.innerHTML='<span class="error">Link ujian tidak valid. Admin harus menggunakan HTTPS.</span>';
 app.innerHTML=`<div class="login card"><h2>PIN benar</h2><p>Anda akan diarahkan ke ujian.</p><button class="btn" onclick="location.href='${esc(x.url)}'">BUKA UJIAN</button></div>`;
}
function adminLogin(){
 app.innerHTML=`<div class="login card"><h1>Login Admin</h1><input id="em" class="input" placeholder="Email admin" autocomplete="username"><input id="ap" class="input" type="password" placeholder="Password" autocomplete="current-password">
 <button class="btn" onclick="doAdmin()">MASUK</button> <button class="btn gray" onclick="home()">Kembali</button><p id="am"></p></div>`;
}
async function doAdmin(){
 try{
  const c=await auth.signInWithEmailAndPassword(em.value.trim(),ap.value);
  const d=await db.collection("admins").doc(c.user.uid).get();
  if(!d.exists||d.data().role!=="admin"||d.data().active!==true){await auth.signOut();return am.innerHTML='<span class="error">Akun bukan Admin.</span>';}
  admin();
 }catch(e){am.innerHTML='<span class="error">Login gagal.</span>';}
}
function admin(){
 app.innerHTML=`<div class="top"><b>PakKom Exambro — Admin</b><button class="btn gray small" onclick="auth.signOut().then(home)">Keluar</button></div>
 <div class="wrap"><h1>Dashboard Admin</h1>
 <div class="grid"><div class="card"><h3>🏫 Kelas</h3><p class="muted">Tambah dan aktif/nonaktifkan kelas.</p><button class="btn" onclick="classes()">Kelola Kelas</button></div>
 <div class="card"><h3>📝 Ujian</h3><p class="muted">Link, kelas, PIN, jadwal, dan status.</p><button class="btn" onclick="exams()">Kelola Ujian</button></div></div>
 <div class="card notice"><b>Keamanan:</b> password kelas dan PIN produksi sebaiknya diverifikasi server-side. V5 menyediakan struktur data dan UI tanpa mengekspos password kelas.</div></div>`;
}
async function classes(){
 let s=await db.collection("classes").get();
 app.innerHTML=`<div class="top"><b>PakKom Exambro</b><button class="btn gray small" onclick="admin()">Admin</button></div><div class="wrap"><h1>Kelola Kelas</h1>
 <div class="card"><h3>Tambah Kelas</h3><input id="cn" class="input" placeholder="Contoh: 7B"><button class="btn green" onclick="addClass()">Simpan Kelas</button></div>
 <div class="card"><table class="table"><thead><tr><th>Kelas</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
 ${s.docs.sort((a,b)=>a.id.localeCompare(b.id)).map(d=>{let x=d.data();return `<tr><td><b>${esc(d.id)}</b></td><td><span class="pill">${x.active===false?"Nonaktif":"Aktif"}</span></td><td><button class="btn ${x.active===false?"green":"gray"} small" onclick="toggleClass('${esc(d.id)}',${x.active!==false})">${x.active===false?"Aktifkan":"Nonaktifkan"}</button></td></tr>`}).join("")}
 </tbody></table></div></div>`;
}
async function addClass(){const id=cn.value.trim().toUpperCase();if(!/^[0-9A-Z-]+$/.test(id))return alert("Nama kelas tidak valid.");await db.collection("classes").doc(id).set({name:id,active:true});classes();}
async function toggleClass(id,active){await db.collection("classes").doc(id).update({active:!active});classes();}

async function exams(){
 let s=await db.collection("examPublic").get();
 app.innerHTML=`<div class="top"><b>PakKom Exambro</b><button class="btn gray small" onclick="admin()">Admin</button></div><div class="wrap"><h1>Kelola Ujian</h1>
 <div class="card"><h3>Tambah Ujian</h3>
 <label>Nama Ujian</label><input id="en" class="input" placeholder="PAS Matematika">
 <label>Mata Pelajaran</label><input id="es" class="input" placeholder="Matematika">
 <label>Deskripsi</label><textarea id="ed" class="input" rows="2" placeholder="Keterangan singkat"></textarea>
 <label>Link Google Form / Quizizz / website</label><input id="eu" class="input" placeholder="https://...">
 <label>Kelas (pisahkan koma, kosong = semua kelas)</label><input id="ec" class="input" placeholder="7A,7B,7C">
 <label>PIN Ujian (demo / sementara)</label><input id="ep" class="input" inputmode="numeric" maxlength="12" placeholder="Contoh: 482913">
 <div class="grid"><div><label>Mulai (opsional)</label><input id="est" class="input" type="datetime-local"></div><div><label>Selesai (opsional)</label><input id="eet" class="input" type="datetime-local"></div></div>
 <button class="btn green" onclick="addExam()">Simpan Ujian</button></div>
 <div class="card"><h3>Daftar Ujian</h3>${s.docs.length?s.docs.map(d=>examAdminCard(d.id,d.data())).join(""):'<div class="empty">Belum ada ujian.</div>'}</div></div>`;
}
function examAdminCard(id,x){return `<div class="exam"><div class="row"><h3>${esc(x.name)}</h3><span class="pill">${x.active===false?"Nonaktif":"Aktif"}</span></div><p>${esc(x.subject||"")} ${x.allowedClasses?.length?"• Kelas: "+esc(x.allowedClasses.join(", ")):"• Semua kelas"}</p><p class="link muted">${esc(x.url)}</p><p class="muted">Jadwal: ${esc(fmtDate(x.startAt))} — ${esc(fmtDate(x.endAt))}</p><button class="btn ${x.active===false?"green":"gray"} small" onclick="toggleExam('${esc(id)}',${x.active!==false})">${x.active===false?"Aktifkan":"Nonaktifkan"}</button> <button class="btn red small" onclick="deleteExam('${esc(id)}')">Hapus</button></div>`}
async function addExam(){
 const name=en.value.trim(),url=eu.value.trim();if(!name||!isHttps(url))return alert("Nama dan link HTTPS wajib.");
 const allowed=ec.value.split(",").map(x=>x.trim().toUpperCase()).filter(Boolean);
 const data={name,subject:es.value.trim(),description:ed.value.trim(),url,allowedClasses:allowed,active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
 const start=est.value?new Date(est.value):null,end=eet.value?new Date(eet.value):null;
 if(start)data.startAt=start;if(end)data.endAt=end;
 const ref=await db.collection("examPublic").add(data);
 // Keep the PIN out of examPublic. This write may be rejected by current rules until a secure backend/rule is added.
 if(ep.value.trim())try{await db.collection("examSecrets").doc(ref.id).set({pin:ep.value.trim()});}catch(e){alert("Ujian dibuat, tetapi PIN rahasia belum tersimpan karena Rules saat ini menguncinya.");}
 exams();
}
async function toggleExam(id,active){await db.collection("examPublic").doc(id).update({active:!active});exams();}
async function deleteExam(id){if(!confirm("Hapus ujian ini?"))return;await db.collection("examPublic").doc(id).delete();try{await db.collection("examSecrets").doc(id).delete()}catch(e){}exams();}
home();