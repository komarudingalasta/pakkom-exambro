'use strict';
window.PAKKOM_MODULES=window.PAKKOM_MODULES||[];window.PAKKOM_MODULES.push('builder-core');
window.PAKKOM_BUILDER_VERSION='20.1.4';
var app=document.getElementById('builderApp');
var auth=null,db=null,classes=[],step='info',timer=null;
var draft={title:'',subject:'',classes:[],startAt:'',endAt:'',pin:'',shuffleQuestions:false,shuffleOptions:false,allowBack:true,showScore:false,questions:[]};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(s){var x=document.createElement('div');x.className='b20-toast';x.textContent=s;document.body.appendChild(x);setTimeout(function(){x.remove()},1800)}
function nq(type){return{id:'q_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),type:type||'multiple_choice',question:'',imageUrl:'',points:1,required:true,options:['','','',''],correctIndex:0,correctIndexes:[],answer:''}}
function save(){clearTimeout(timer);var s=document.getElementById('saveState');if(s)s.textContent='Menyimpan…';timer=setTimeout(function(){sessionStorage.setItem('pakkom_v201_draft',JSON.stringify(draft));var x=document.getElementById('saveState');if(x)x.textContent='✓ Tersimpan otomatis'},400)}
function points(){return draft.questions.reduce(function(a,q){return a+(Number(q.points)||0)},0)}
async function hash(s){var b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b)).map(function(x){return x.toString(16).padStart(2,'0')}).join('')}
function denied(){app.innerHTML='<div class="v20-loading"><div><h2>Akses Admin Diperlukan</h2><p>Login dari dashboard PakKom Exambro terlebih dahulu.</p><button class="b20-btn primary" onclick="location.href=\'index.html\'">Kembali</button></div></div>'}

async function builderStart(){
 if(typeof firebase==='undefined'||!window.FIREBASE_CONFIG){
  app.innerHTML='<div class="v20-loading">Konfigurasi Firebase tidak ditemukan.</div>';
  return;
 }
 try{
  if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);
  auth=firebase.auth();db=firebase.firestore();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function(){});
 }catch(e){
  app.innerHTML='<div class="v20-loading">Firebase gagal dimuat: '+esc(e.message)+'</div>';
  return;
 }
 auth.onAuthStateChanged(async function(u){
  if(!u)return denied();
  try{
   var a=await db.collection('admins').doc(u.uid).get();
   if(!a.exists||a.data().active!==true||a.data().role!=='admin')return denied();
   classes=(await db.collection('classes').get()).docs.map(function(d){return Object.assign({id:d.id},d.data())}).filter(function(x){return x.active!==false});
   try{
    var s=JSON.parse(sessionStorage.getItem('pakkom_v201_draft')||'null');
    if(s)draft=s;
   }catch(e){}
   if(!draft.questions||!draft.questions.length)draft.questions=[nq()];
   render();
  }catch(e){
   app.innerHTML='<div class="v20-loading">Exam Builder gagal dimuat: '+esc(e.code||e.message)+'</div>';
  }
 });
}
