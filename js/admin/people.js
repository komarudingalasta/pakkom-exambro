'use strict';
window.PAKKOM_MODULES=window.PAKKOM_MODULES||[];window.PAKKOM_MODULES.push('admin-people');
async function syncClassesFromExistingStudents(){
 if(!(await isAdmin()))return 0;
 var ss=await db.collection('students').get();
 var ids=[...new Set(ss.docs.map(function(d){return String((d.data()||{}).classId||'').trim().toUpperCase();}).filter(Boolean))].sort();
 var created=0;
 for(var i=0;i<ids.length;i++){
  try{if(await ensureClassExists(ids[i]))created++;}catch(e){console.warn('sync class '+ids[i],e);}
 }
 return created;
}


async function syncClassesFromStudents(){
  if(!(await isAdmin())) return 0;
  try{
    var s = await db.collection('students').get();
    var classIds = [...new Set(
      s.docs.map(function(d){
        return String((d.data().classId || '')).trim().toUpperCase();
      }).filter(Boolean)
    )];

    var created = 0;
    for(var i=0;i<classIds.length;i++){
      var id = classIds[i];
      var ref = db.collection('classes').doc(id);
      var d = await ref.get();

      if(!d.exists){
        await ref.set({
          name: id,
          passwordHash: await sha256('123456'),
          active: true,
          createdFrom: 'student-sync',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await saveClassCredential(id, '123456');
        created++;
      }
    }
    return created;
  }catch(e){
    console.error('syncClassesFromStudents failed:', e);
    throw e;
  }
}

async function getClassCredential(id){
 try{
  var d=await db.collection('classCredentials').doc(id).get();
  return d.exists?String(d.data().password||''):'';
 }catch(e){
  console.error('classCredentials read failed',e);
  throw e;
 }
}
async function getStudentCredentials(){
 var map={};
 try{
  var s=await db.collection('studentCredentials').get();
  s.docs.forEach(function(d){map[d.id]=String(d.data().password||'');});
  return map;
 }catch(e){
  console.error('studentCredentials read failed',e);
  throw e;
 }
}
async function saveClassCredential(id,password){await db.collection('classCredentials').doc(id).set({password:String(password),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});}
async function saveStudentCredential(id,password){await db.collection('studentCredentials').doc(id).set({password:String(password),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});}
async function classesAdmin(){
 if(!(await isAdmin()))return adminLogin();
 try{
   await syncClassesFromStudents();
 }catch(e){
   console.error(e);
   return pakkomAlert('Kelola Kelas gagal dibuka: '+(e && e.message ? e.message : 'gagal sinkronisasi kelas.'));
 }
 var s=await db.collection('classes').get();
 var cred={};
 try{
  var credSnap=await db.collection('classCredentials').get();
  credSnap.docs.forEach(function(d){cred[d.id]=String(d.data().password||'');});
 }catch(e){
  return pakkomAlert('Password kelas tidak dapat dimuat. Pastikan Firestore Rules V18.0 sudah dipublish. '+(e.code||e.message));
 }
 var rows=s.docs.sort(function(a,b){return a.id.localeCompare(b.id);}).map(function(d){var x=d.data(),pw=cred[d.id]||'';return '<tr><td><b>'+esc(d.id)+'</b></td><td>'+esc(x.name||d.id)+'</td><td><span class="admin-password">'+(pw?esc(pw):'<span class="muted">Belum tersimpan</span>')+'</span></td><td>'+(x.active===false?'Nonaktif':'Aktif')+'</td><td><button class="btn gray small class-edit" data-id="'+esc(d.id)+'">Edit</button> <button class="btn small '+(x.active===false?'green':'orange')+' class-toggle" data-id="'+esc(d.id)+'" data-active="'+(x.active===false?'0':'1')+'">'+(x.active===false?'Aktifkan':'Nonaktifkan')+'</button></td></tr>';}).join('');
 top('Kelola Kelas','<div class="wrap"><div class="card"><h2>Tambah Kelas</h2><div class="grid"><input id="cid" class="input" placeholder="Kode kelas, contoh 7A"><input id="cname" class="input" placeholder="Nama kelas"><input id="cpass" class="input" value="123456" placeholder="Password kelas"></div><button class="btn green" id="saveClassBtn">Tambah Kelas</button></div><div class="card"><div class="notice"><b>Password kelas</b> hanya ditampilkan kepada admin. Kelas lama yang sebelumnya hanya menyimpan hash akan bertuliskan <b>Belum tersimpan</b>; klik Edit lalu tetapkan password baru agar dapat ditampilkan.</div><div class="table-wrap"><table><thead><tr><th>Kode</th><th>Nama</th><th>Password</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div>',admin,'Admin');
 el('saveClassBtn').onclick=saveClass;document.querySelectorAll('.class-edit').forEach(function(b){b.onclick=function(){editClass(this.dataset.id);};});document.querySelectorAll('.class-toggle').forEach(function(b){b.onclick=function(){toggleClass(this.dataset.id,this.dataset.active==='1');};});
}
async function saveClass(){var id=el('cid').value.trim().toUpperCase(),name=el('cname').value.trim(),p=el('cpass').value;if(!id||p.length<6){alert('Kode kelas dan password minimal 6 karakter wajib.');return;}await db.collection('classes').doc(id).set({name:name||id,passwordHash:await sha256(p),password:firebase.firestore.FieldValue.delete(),demoPassword:firebase.firestore.FieldValue.delete(),active:true,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});await saveClassCredential(id,p);classesAdmin();}
async function editClass(id){
 var d=await db.collection('classes').doc(id).get();if(!d.exists)return pakkomAlert('Kelas tidak ditemukan.');var x=d.data(),current=await getClassCredential(id);
 top('Edit Kelas','<div class="wrap"><div class="card"><h2>'+esc(id)+'</h2><label>Nama Kelas</label><input id="editClassName" class="input" value="'+esc(x.name||id)+'"><label>Password Kelas</label><input id="editClassPass" class="input" type="text" value="'+esc(current)+'" placeholder="Masukkan password baru"><p class="muted">Password yang tersimpan dapat dilihat admin. Jika kosong karena kelas dibuat pada versi lama, masukkan password baru untuk menyimpannya.</p><div class="actions"><button class="btn green" id="saveClassEdit">Simpan</button><button class="btn gray" id="cancelClassEdit">Batal</button></div></div></div>',classesAdmin,'Kelola Kelas');
 el('cancelClassEdit').onclick=classesAdmin;el('saveClassEdit').onclick=async function(){var name=el('editClassName').value.trim()||id,p=el('editClassPass').value;if(p&&p.length<6)return pakkomAlert('Password minimal 6 karakter.');var data={name:name,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};if(p){data.passwordHash=await sha256(p);data.password=firebase.firestore.FieldValue.delete();data.demoPassword=firebase.firestore.FieldValue.delete();}await db.collection('classes').doc(id).update(data);if(p)await saveClassCredential(id,p);await pakkomAlert('Kelas berhasil diperbarui.');classesAdmin();};
}
async function toggleClass(id,active){await db.collection('classes').doc(id).update({active:!active,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});classesAdmin();}
async function ensureClassExists(id){
 id=String(id||'').trim().toUpperCase();if(!id)return false;
 var ref=db.collection('classes').doc(id),d=await ref.get();if(d.exists)return false;
 await ref.set({name:id,passwordHash:await sha256('123456'),active:true,createdFrom:'student-import',createdAt:firebase.firestore.FieldValue.serverTimestamp()});await saveClassCredential(id,'123456');return true;
}

async function studentsAdmin(){
 if(!(await isAdmin()))return adminLogin();
 var s=await db.collection('students').get();
 try{
  window.adminStudentPasswords=await getStudentCredentials();
 }catch(e){
  return pakkomAlert('Password siswa tidak dapat dimuat. Pastikan Firestore Rules V18.0 sudah dipublish. '+(e.code||e.message));
 }
 adminStudents=s.docs.map(function(d){return Object.assign({id:d.id},d.data());}).sort(function(a,b){return String(a.name||'').localeCompare(String(b.name||''));});var classes=[...new Set(adminStudents.map(function(x){return x.classId;}).filter(Boolean))].sort();top('Kelola Siswa','<div class="wrap"><div class="card"><h2>Tambah Manual</h2><div class="grid"><input id="anIS" class="input" placeholder="NIS"><input id="anName" class="input" placeholder="Nama"><input id="anClass" class="input" placeholder="Kelas"><input id="anPass" class="input" placeholder="Password (default 123456)"></div><button class="btn green" id="addManual">Tambah Siswa</button></div><div class="card"><h2>Upload Excel</h2><p class="muted">Kolom: NIS | Nama | Kelas | Password. Password siswa kosong = 123456. Kelas yang belum ada dibuat otomatis dengan password kelas 123456.</p><input id="excelFile" class="input" type="file" accept=".xlsx,.xls,.csv"><div class="actions"><button class="btn" id="importExcel">Upload Data</button><button class="btn gray" id="templateExcel">Download Template</button></div><div id="importMsg"></div></div><div class="card"><div class="grid"><input id="studentSearch" class="input" placeholder="Cari NIS/nama"><select id="studentFilter"><option value="">Semua kelas</option>'+classes.map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select></div><div class="bulk-bar"><span id="bulkCount">0 dipilih</span><div class="actions"><button class="btn green small" id="bulkApprove" disabled>Approve</button><button class="btn gray small" id="bulkActivate" disabled>Aktifkan</button><button class="btn orange small" id="bulkDeactivate" disabled>Nonaktifkan</button><button class="btn red small" id="bulkDelete" disabled>Hapus</button></div></div><div id="studentTable"></div></div></div>',admin,'Admin');el('addManual').onclick=addStudentManual;el('importExcel').onclick=importExcel;el('templateExcel').onclick=downloadTemplate;el('studentSearch').oninput=renderStudents;el('studentFilter').onchange=renderStudents;el('bulkApprove').onclick=function(){bulkStudents('approve');};el('bulkActivate').onclick=function(){bulkStudents('activate');};el('bulkDeactivate').onclick=function(){bulkStudents('deactivate');};el('bulkDelete').onclick=function(){bulkStudents('delete');};renderStudents();}
function selectedStudentIds(){return Array.prototype.map.call(document.querySelectorAll('.student-check:checked'),function(c){return c.dataset.id;});}
function updateBulkBar(){var ids=selectedStudentIds(),c=el('bulkCount');if(c)c.textContent=ids.length+' dipilih';if(el('bulkApprove'))el('bulkApprove').disabled=!ids.length;if(el('bulkDelete'))el('bulkDelete').disabled=!ids.length;if(el('bulkActivate'))el('bulkActivate').disabled=!ids.length;if(el('bulkDeactivate'))el('bulkDeactivate').disabled=!ids.length;}
function renderStudents(){var q=(el('studentSearch')?el('studentSearch').value:'').toLowerCase().trim(),f=el('studentFilter')?el('studentFilter').value:'';var rows=adminStudents.filter(function(x){return (!f||x.classId===f)&&(!q||String(x.nis||'').toLowerCase().includes(q)||String(x.name||'').toLowerCase().includes(q));});el('studentTable').innerHTML='<p class="muted">'+rows.length+' siswa • '+rows.filter(function(x){return x.approved!==true;}).length+' menunggu approval</p><div class="table-wrap"><table class="table"><tr><th><input type="checkbox" id="checkAllStudents" aria-label="Pilih semua"></th><th>NIS</th><th>Nama</th><th>Kelas</th><th>Password</th><th>Approval</th><th>Status</th><th>Aksi</th></tr>'+rows.map(function(x){return '<tr><td><input type="checkbox" class="student-check" data-id="'+esc(x.id)+'"></td><td>'+esc(x.nis)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.classId)+'</td><td>'+(x.passwordAdminVisible===false?'<span class="muted">Diubah siswa</span>':((window.adminStudentPasswords||{})[x.id]?'<span class="admin-password">'+esc((window.adminStudentPasswords||{})[x.id])+'</span>':'<span class="muted">Belum tersimpan</span>'))+'</td><td>'+(x.approved===true?'<span class="pill green">Disetujui</span>':'<span class="pill orange">Menunggu</span>')+'</td><td>'+(x.active===true?'Aktif':'Nonaktif')+'</td><td><div class="actions">'+(x.approved!==true?'<button class="btn green small approve" data-id="'+esc(x.id)+'">Approve</button>':'')+'<button class="btn gray small reset" data-id="'+esc(x.id)+'">Reset Password</button><button class="btn orange small toggle" data-id="'+esc(x.id)+'" data-active="'+(x.active===true?'1':'0')+'">'+(x.active===true?'Nonaktifkan':'Aktifkan')+'</button><button class="btn red small delete-student" data-id="'+esc(x.id)+'" data-name="'+esc(x.name||x.nis)+'">Hapus</button></div></td></tr>';}).join('')+'</table></div>';var all=el('checkAllStudents');if(all)all.onchange=function(){document.querySelectorAll('.student-check').forEach(function(c){c.checked=all.checked;});updateBulkBar();};document.querySelectorAll('.student-check').forEach(function(c){c.onchange=updateBulkBar;});document.querySelectorAll('.approve').forEach(function(b){b.onclick=function(){approveStudent(b.dataset.id);};});document.querySelectorAll('.reset').forEach(function(b){b.onclick=function(){resetStudent(b.dataset.id);};});document.querySelectorAll('.toggle').forEach(function(b){b.onclick=function(){toggleStudent(b.dataset.id,b.dataset.active==='1');};});document.querySelectorAll('.delete-student').forEach(function(b){b.onclick=function(){deleteStudent(b.dataset.id,b.dataset.name);};});updateBulkBar();}
async function deleteStudent(id,name){var ok=await pakkomConfirm('Hapus akun siswa '+name+'? Data akun akan dihapus permanen.');if(!ok)return;try{await db.collection('students').doc(id).delete();try{await db.collection('studentCredentials').doc(id).delete();}catch(_e){}var aq=await db.collection('examAttempts').where('studentId','==',id).get();for(var i=0;i<aq.docs.length;i+=400){var batch=db.batch();aq.docs.slice(i,i+400).forEach(function(d){batch.delete(d.ref);});await batch.commit();}studentsAdmin();}catch(e){pakkomAlert('Siswa gagal dihapus: '+(e.code||e.message));}}
async function bulkStudents(action){var ids=selectedStudentIds();if(!ids.length)return;var label=action==='approve'?'approve':action==='activate'?'aktifkan':action==='deactivate'?'nonaktifkan':'hapus',ok=await pakkomConfirm(label.charAt(0).toUpperCase()+label.slice(1)+' '+ids.length+' siswa terpilih?');if(!ok)return;try{for(var i=0;i<ids.length;i+=400){var batch=db.batch();ids.slice(i,i+400).forEach(function(id){var ref=db.collection('students').doc(id);if(action==='approve')batch.update(ref,{approved:true,active:true,approvedAt:firebase.firestore.FieldValue.serverTimestamp()});else if(action==='activate')batch.update(ref,{active:true});else if(action==='deactivate')batch.update(ref,{active:false});else batch.delete(ref);});await batch.commit();}if(action==='delete'){for(var j=0;j<ids.length;j++){try{await db.collection('studentCredentials').doc(ids[j]).delete();}catch(_e){}var q=await db.collection('examAttempts').where('studentId','==',ids[j]).get();for(var k=0;k<q.docs.length;k+=400){var b2=db.batch();q.docs.slice(k,k+400).forEach(function(d){b2.delete(d.ref);});await b2.commit();}}}studentsAdmin();}catch(e){pakkomAlert('Aksi massal gagal: '+(e.code||e.message));}}
async function approveStudent(id){await db.collection('students').doc(id).update({approved:true,active:true,approvedAt:firebase.firestore.FieldValue.serverTimestamp()});studentsAdmin();}
async function addStudentManual(){var nis=el('anIS').value.trim(),name=el('anName').value.trim(),cls=el('anClass').value.trim().toUpperCase(),p=el('anPass').value||'123456';if(!nis||!name||!cls||p.length<6)return alert('NIS, nama, kelas dan password minimal 6 karakter wajib.');var q=await db.collection('students').where('nis','==',nis).limit(1).get();if(!q.empty)return alert('NIS sudah terdaftar.');await ensureClassExists(cls);var ref=db.collection('students').doc();await ref.set({nis:nis,name:name,classId:cls,passwordHash:await sha256(p),passwordAdminVisible:true,active:true,approved:true,registrationSource:'admin-manual',createdAt:firebase.firestore.FieldValue.serverTimestamp()});await saveStudentCredential(ref.id,p);studentsAdmin();}
async function resetStudent(id){var p=prompt('Password baru:','123456');if(p===null)return;if(p.length<6)return alert('Password minimal 6 karakter.');await db.collection('students').doc(id).update({passwordHash:await sha256(p),password:firebase.firestore.FieldValue.delete(),passwordAdminVisible:true,passwordUpdatedAt:firebase.firestore.FieldValue.serverTimestamp()});await saveStudentCredential(id,p);alert('Password diperbarui dan dapat dilihat admin.');studentsAdmin();}
async function toggleStudent(id,a){await db.collection('students').doc(id).update({active:!a});studentsAdmin();}
function downloadTemplate(){var ws=XLSX.utils.aoa_to_sheet([['NIS','Nama','Kelas','Password'],['10001','Contoh Siswa','7A','123456']]);var wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Siswa');XLSX.writeFile(wb,'Template-Siswa-PakKom.xlsx');}
function normKey(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');}
function pick(r,names){var m={};Object.keys(r).forEach(function(k){m[normKey(k)]=r[k];});for(var i=0;i<names.length;i++){if(m[normKey(names[i])]!==undefined)return m[normKey(names[i])];}return '';}
function importExcel(){var file=el('excelFile').files[0];if(!file)return msg('importMsg','Pilih file Excel/CSV terlebih dahulu.');var rd=new FileReader();rd.onload=async function(ev){var rows;try{var wb=XLSX.read(ev.target.result,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]];rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});}catch(e){return msg('importMsg','File gagal dibaca: '+e.message);}try{await processRows(rows);}catch(e){var detail=(e&&e.code==='permission-denied')?'Izin Firestore menolak penambahan siswa. Pastikan Firestore Rules V16.1 sudah dipublish.':(e.code||e.message);msg('importMsg','Upload data siswa gagal: '+detail);}};rd.onerror=function(){msg('importMsg','File tidak dapat dibuka oleh browser.');};rd.readAsArrayBuffer(file);}
async function processRows(rows){var existing={};adminStudents.forEach(function(x){existing[String(x.nis||'').trim()]=1;});var seen={},valid=[],bad=0,dup=0;for(var i=0;i<rows.length;i++){var r=rows[i],nis=String(pick(r,['NIS','Nomor Induk Siswa','Nomor Induk'])||'').trim(),name=String(pick(r,['Nama','Nama Siswa','Nama Lengkap'])||'').trim(),cls=String(pick(r,['Kelas','Class','ClassId'])||'').trim().toUpperCase(),p=String(pick(r,['Password','Pass','Kata Sandi'])||'').trim()||'123456';if(!nis||!name||!cls||p.length<6){bad++;continue;}if(existing[nis]||seen[nis]){dup++;continue;}seen[nis]=1;valid.push({nis:nis,name:name,classId:cls,passwordHash:await sha256(p),_adminPassword:p,passwordAdminVisible:true,active:true,approved:true,registrationSource:'admin-import'});}if(!valid.length)return msg('importMsg','Tidak ada data baru. Duplikat: '+dup+', tidak valid: '+bad+'.');if(!confirm('Tambahkan '+valid.length+' siswa? Kelas yang belum ada akan dibuat otomatis dengan password 123456.'))return;msg('importMsg','Menyiapkan kelas dan mengunggah '+valid.length+' siswa…','info');var classIds=[...new Set(valid.map(function(x){return x.classId;}))];var newClasses=0;for(var ci=0;ci<classIds.length;ci++){if(await ensureClassExists(classIds[ci]))newClasses++;}for(var start=0;start<valid.length;start+=400){var batch=db.batch();valid.slice(start,start+400).forEach(function(x){var ref=db.collection('students').doc(),studentData=Object.assign({},x,{createdAt:firebase.firestore.FieldValue.serverTimestamp()});delete studentData._adminPassword;batch.set(ref,studentData);batch.set(db.collection('studentCredentials').doc(ref.id),{password:String(x._adminPassword),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});});await batch.commit();}msg('importMsg','Selesai: '+valid.length+' siswa ditambahkan. Kelas baru: '+newClasses+' (password awal 123456). Duplikat: '+dup+', tidak valid: '+bad+'.','success');setTimeout(studentsAdmin,600);}
