'use strict';
window.PAKKOM_MODULES=window.PAKKOM_MODULES||[];window.PAKKOM_MODULES.push('question-bank');
/* ======================================================================
   V18 — Quiz Builder / Bank Soal + External Media Upload
   ====================================================================== */
var QUESTION_MEDIA_ENDPOINT_KEY='pakkomQuestionMediaEndpoint';

function getQuestionMediaEndpoint(){
 return String(localStorage.getItem(QUESTION_MEDIA_ENDPOINT_KEY)||'').trim();
}
function saveQuestionMediaEndpoint(){
 var v=el('questionMediaEndpoint').value.trim();
 if(v&&!https(v))return pakkomAlert('Endpoint Apps Script harus menggunakan HTTPS.');
 if(v)localStorage.setItem(QUESTION_MEDIA_ENDPOINT_KEY,v);else localStorage.removeItem(QUESTION_MEDIA_ENDPOINT_KEY);
 pakkomAlert('Pengaturan media tersimpan di perangkat admin ini.');
}
async function compressQuestionImage(file){
 return new Promise(function(resolve,reject){
  var img=new Image(),url=URL.createObjectURL(file);
  img.onload=function(){
   try{
    var max=1200,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
    var c=document.createElement('canvas');c.width=w;c.height=h;var ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);
    c.toBlob(function(blob){URL.revokeObjectURL(url);if(!blob)return reject(new Error('Kompresi gambar gagal.'));resolve(blob);},'image/webp',0.78);
   }catch(e){URL.revokeObjectURL(url);reject(e);}
  };
  img.onerror=function(){URL.revokeObjectURL(url);reject(new Error('File gambar tidak dapat dibaca.'));};
  img.src=url;
 });
}
async function uploadQuestionImage(){
 var f=el('questionImageFile').files&&el('questionImageFile').files[0];if(!f)return pakkomAlert('Pilih gambar terlebih dahulu.');
 var endpoint=getQuestionMediaEndpoint();if(!endpoint)return pakkomAlert('Masukkan URL Web App Google Apps Script pada Pengaturan Media terlebih dahulu.');
 try{
  el('questionUploadMsg').innerHTML='<div class="notice">Mengompresi dan mengupload gambar...</div>';
  var blob=await compressQuestionImage(f),reader=new FileReader();
  var base64=await new Promise(function(resolve,reject){reader.onload=function(){resolve(String(reader.result).split(',')[1]);};reader.onerror=reject;reader.readAsDataURL(blob);});
  var payload={action:'uploadQuestionImage',filename:'question-'+Date.now()+'.webp',mimeType:'image/webp',base64:base64};
  var res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
  var data=await res.json();if(!data.ok||!data.url)throw new Error(data.error||'URL gambar tidak diterima.');
  el('questionImageUrl').value=data.url;el('questionImagePreview').innerHTML='<img src="'+esc(data.url)+'" alt="Preview gambar soal">';
  el('questionUploadMsg').innerHTML='<div class="notice success">Gambar berhasil diupload. Firestore hanya menyimpan URL.</div>';
 }catch(e){el('questionUploadMsg').innerHTML='';pakkomAlert('Upload gambar gagal: '+(e.message||e));}
}
function previewQuestionImage(){
 var u=el('questionImageUrl').value.trim();el('questionImagePreview').innerHTML=u&&https(u)?'<img src="'+esc(u)+'" alt="Preview gambar soal">':'';
}
function questionTypeFields(type,data){
 data=data||{};var opts=data.options||['','','',''];
 if(type==='multiple_choice')return '<div class="field"><label>Pilihan Jawaban</label><div class="option-editor">'+opts.map(function(x,i){return '<label class="option-edit-row"><input type="radio" name="correctOption" value="'+i+'" '+(Number(data.correctIndex)===i?'checked':'')+'><span>'+String.fromCharCode(65+i)+'</span><input class="input q-option" value="'+esc(x)+'" placeholder="Pilihan '+String.fromCharCode(65+i)+'"></label>';}).join('')+'</div></div>';
 if(type==='true_false')return '<div class="field"><label>Kunci Jawaban</label><select id="qTrueFalse" class="input"><option value="true" '+(data.answer==='true'?'selected':'')+'>Benar</option><option value="false" '+(data.answer==='false'?'selected':'')+'>Salah</option></select></div>';
 if(type==='short_answer')return '<div class="field"><label>Kunci Jawaban Singkat</label><input id="qShortAnswer" class="input" value="'+esc(data.answer||'')+'" placeholder="Jawaban yang dianggap benar"></div>';
 return '<div class="notice">Soal uraian akan diperiksa manual oleh admin/guru.</div>';
}
async function questionBankAdmin(editId){
 if(!(await isAdmin()))return adminLogin();
 var q=await db.collection('questionBank').get(),list=q.docs.map(function(d){return Object.assign({id:d.id},d.data());}),edit=editId?list.find(function(x){return x.id===editId;}):null;
 var cards=list.sort(function(a,b){return String(a.subject||'').localeCompare(String(b.subject||''));}).map(function(x){
  return '<article class="question-card"><div class="question-card-main">'+(x.imageUrl?'<img src="'+esc(x.imageUrl)+'" alt="">':'')+'<div><span class="eyebrow">'+esc(x.subject||'Tanpa Mapel')+' • '+esc(x.classLevel||'')+'</span><h3>'+esc(x.question||'Soal')+'</h3><p>'+esc(questionTypeLabel(x.type))+' • Bobot '+esc(x.points||1)+'</p></div></div><div class="question-card-actions"><button class="btn small outline qedit" data-id="'+esc(x.id)+'">Edit</button><button class="btn small red qdelete" data-id="'+esc(x.id)+'">Hapus</button></div></article>';
 }).join('')||'<div class="empty">Bank soal masih kosong.</div>';
 var body='<main class="wrap question-bank"><div class="page-title-row"><div><h1>Bank Soal</h1><p class="muted">Soal disimpan di Firestore. Gambar disimpan di Google Drive melalui Apps Script.</p></div><button class="btn outline" id="toggleMediaSettings">⚙ Media</button></div>'+
 '<section id="mediaSettings" class="card media-settings hidden-panel"><div class="section-head"><div><h2>Pengaturan Media Soal</h2><p class="muted">Masukkan URL Web App Apps Script penyimpanan gambar.</p></div></div><div class="field"><label>Apps Script Web App URL</label><input id="questionMediaEndpoint" class="input" value="'+esc(getQuestionMediaEndpoint())+'" placeholder="https://script.google.com/macros/s/.../exec"></div><button class="btn green" id="saveMediaEndpoint">Simpan Pengaturan</button></section>'+
 '<div class="question-layout"><section class="card question-editor"><div class="section-head"><div><h2>'+(edit?'Edit Soal':'Buat Soal')+'</h2><p class="muted">Buat soal langsung di PakKom Exambro.</p></div></div><input type="hidden" id="questionEditId" value="'+esc(edit?edit.id:'')+'"><div class="form-grid-3"><div class="field"><label>Mata Pelajaran</label><input id="qSubject" class="input" value="'+esc(edit?edit.subject:'')+'" placeholder="Matematika"></div><div class="field"><label>Kelas</label><input id="qClass" class="input" value="'+esc(edit?edit.classLevel:'')+'" placeholder="7"></div><div class="field"><label>Bobot</label><input id="qPoints" class="input" type="number" min="0.1" step="0.1" value="'+esc(edit?edit.points||1:1)+'"></div></div><div class="field"><label>Jenis Soal</label><select id="qType" class="input"><option value="multiple_choice">Pilihan Ganda</option><option value="true_false">Benar / Salah</option><option value="short_answer">Isian Singkat</option><option value="essay">Uraian</option></select></div><div class="field"><label>Pertanyaan</label><textarea id="qText" class="input question-text" placeholder="Tuliskan soal...">'+esc(edit?edit.question:'')+'</textarea></div>'+
 '<div class="question-media-box"><div class="field"><label>Gambar Soal (opsional)</label><div class="media-actions"><input id="questionImageFile" class="input" type="file" accept="image/*"><button class="btn outline" id="uploadQuestionImageBtn">Upload ke Drive</button></div><div class="or-line">atau tempel URL gambar</div><input id="questionImageUrl" class="input" value="'+esc(edit?edit.imageUrl||'':'')+'" placeholder="https://..."></div><div id="questionImagePreview" class="question-image-preview">'+(edit&&edit.imageUrl?'<img src="'+esc(edit.imageUrl)+'" alt="Preview">':'')+'</div><div id="questionUploadMsg"></div></div>'+
 '<div id="questionAnswerFields"></div><div class="form-grid-2"><div class="field"><label>Topik/Bab</label><input id="qTopic" class="input" value="'+esc(edit?edit.topic||'':'')+'" placeholder="Bilangan"></div><div class="field"><label>Tingkat Kesulitan</label><select id="qDifficulty" class="input"><option>Mudah</option><option>Sedang</option><option>Sulit</option></select></div></div><button class="btn green block" id="saveQuestionBtn">'+(edit?'Simpan Perubahan':'Simpan ke Bank Soal')+'</button></section>'+
 '<section><div class="question-list-head"><div><h2>Daftar Soal</h2><p class="muted">'+list.length+' soal tersimpan</p></div></div><div class="question-list">'+cards+'</div></section></div></main>';
 top('Bank Soal',body,admin,'Dashboard');
 el('qType').value=edit?edit.type||'multiple_choice':'multiple_choice';el('qDifficulty').value=edit?edit.difficulty||'Sedang':'Sedang';
 function renderFields(){el('questionAnswerFields').innerHTML=questionTypeFields(el('qType').value,edit&&el('questionEditId').value?edit:{});}
 renderFields();el('qType').onchange=function(){edit=null;renderFields();};
 el('questionImageUrl').oninput=previewQuestionImage;el('uploadQuestionImageBtn').onclick=uploadQuestionImage;
 el('toggleMediaSettings').onclick=function(){el('mediaSettings').classList.toggle('hidden-panel');};el('saveMediaEndpoint').onclick=saveQuestionMediaEndpoint;
 el('saveQuestionBtn').onclick=saveQuestion;
 document.querySelectorAll('.qedit').forEach(function(b){b.onclick=function(){questionBankAdmin(b.dataset.id);};});
 document.querySelectorAll('.qdelete').forEach(function(b){b.onclick=function(){deleteQuestion(b.dataset.id);};});
}
function questionTypeLabel(t){return {multiple_choice:'Pilihan Ganda',true_false:'Benar / Salah',short_answer:'Isian Singkat',essay:'Uraian'}[t]||t;}
async function saveQuestion(){
 var id=el('questionEditId').value,type=el('qType').value,text=el('qText').value.trim(),subject=el('qSubject').value.trim();
 if(!text||!subject)return pakkomAlert('Mata pelajaran dan pertanyaan wajib diisi.');
 var data={subject:subject,classLevel:el('qClass').value.trim(),points:Number(el('qPoints').value)||1,type:type,question:text,imageUrl:el('questionImageUrl').value.trim(),topic:el('qTopic').value.trim(),difficulty:el('qDifficulty').value,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
 if(data.imageUrl&&!https(data.imageUrl))return pakkomAlert('URL gambar harus HTTPS.');
 if(type==='multiple_choice'){data.options=[].slice.call(document.querySelectorAll('.q-option')).map(function(x){return x.value.trim();});var c=document.querySelector('input[name="correctOption"]:checked');if(data.options.some(function(x){return !x;})||!c)return pakkomAlert('Lengkapi semua pilihan dan pilih kunci jawaban.');data.correctIndex=Number(c.value);}
 else if(type==='true_false')data.answer=el('qTrueFalse').value;
 else if(type==='short_answer'){data.answer=el('qShortAnswer').value.trim();if(!data.answer)return pakkomAlert('Masukkan kunci jawaban singkat.');}
 else data.manualGrading=true;
 try{if(id)await db.collection('questionBank').doc(id).set(data,{merge:true});else{data.createdAt=firebase.firestore.FieldValue.serverTimestamp();await db.collection('questionBank').add(data);}questionBankAdmin();}catch(e){pakkomAlert('Soal gagal disimpan: '+(e.code||e.message));}
}
async function deleteQuestion(id){if(!confirm('Hapus soal ini dari Bank Soal?'))return;try{await db.collection('questionBank').doc(id).delete();questionBankAdmin();}catch(e){pakkomAlert('Soal gagal dihapus: '+(e.code||e.message));}}
