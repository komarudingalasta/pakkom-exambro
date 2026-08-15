const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
admin.initializeApp();
const db = admin.firestore();
const REGION = 'asia-southeast2';

function sha256(v){return crypto.createHash('sha256').update(String(v)).digest('hex');}
function hashSecret(secret,salt){return sha256(String(salt)+'|'+String(secret));}
function requireAuth(req){if(!req.auth) throw new HttpsError('unauthenticated','Autentikasi diperlukan.');}
async function isAdmin(uid){
  if(!uid) return false;
  const d=await db.collection('admins').doc(uid).get();
  return d.exists && d.data().role==='admin' && d.data().active===true;
}
function cleanClassId(v){return String(v||'').trim().toUpperCase();}
function cleanNis(v){return String(v||'').trim();}

exports.verifyClass = onCall({region:REGION}, async (req)=>{
  requireAuth(req);
  const classId=cleanClassId(req.data&&req.data.classId), password=String(req.data&&req.data.password||'');
  if(!classId||!password) throw new HttpsError('invalid-argument','Kelas dan password wajib.');
  const ref=db.collection('classes').doc(classId), d=await ref.get();
  if(!d.exists) throw new HttpsError('not-found','Kelas belum dibuat.');
  const x=d.data();
  if(x.active===false) throw new HttpsError('failed-precondition','Kelas sedang dinonaktifkan.');
  let ok=false;
  if(x.passwordHash && x.passwordSalt) ok=hashSecret(password,x.passwordSalt)===x.passwordHash;
  else if(String(x.password||x.demoPassword||'')===password){
    ok=true;
    const salt=crypto.randomBytes(16).toString('hex');
    await ref.set({passwordHash:hashSecret(password,salt),passwordSalt:salt,password:admin.firestore.FieldValue.delete(),demoPassword:admin.firestore.FieldValue.delete()},{merge:true});
  }
  if(!ok) throw new HttpsError('permission-denied','Password kelas salah.');
  const accessId=req.auth.uid+'_'+sha256(classId).slice(0,16);
  await db.collection('classAccess').doc(accessId).set({uid:req.auth.uid,classId,expiresAt:admin.firestore.Timestamp.fromMillis(Date.now()+10*60*1000),createdAt:admin.firestore.FieldValue.serverTimestamp()});
  return {ok:true,classId,name:x.name||classId};
});

exports.registerStudent = onCall({region:REGION}, async (req)=>{
  requireAuth(req);
  const classId=cleanClassId(req.data&&req.data.classId), nis=cleanNis(req.data&&req.data.nis), name=String(req.data&&req.data.name||'').trim(), password=String(req.data&&req.data.password||'');
  if(!classId||!nis||!name||password.length<6) throw new HttpsError('invalid-argument','NIS, nama, kelas, dan password minimal 6 karakter wajib.');
  const accessId=req.auth.uid+'_'+sha256(classId).slice(0,16), access=await db.collection('classAccess').doc(accessId).get();
  if(!access.exists || access.data().expiresAt.toMillis()<Date.now()) throw new HttpsError('permission-denied','Akses kelas sudah kedaluwarsa. Masukkan password kelas kembali.');
  const dup=await db.collection('students').where('nis','==',nis).limit(1).get();
  if(!dup.empty) throw new HttpsError('already-exists','NIS sudah terdaftar.');
  const salt=crypto.randomBytes(16).toString('hex');
  const ref=await db.collection('students').add({nis,name,classId,passwordHash:hashSecret(password,salt),passwordSalt:salt,active:true,approved:false,registrationSource:'self',createdAt:admin.firestore.FieldValue.serverTimestamp()});
  return {ok:true,id:ref.id,status:'pending'};
});

exports.studentLogin = onCall({region:REGION}, async (req)=>{
  requireAuth(req);
  const classId=cleanClassId(req.data&&req.data.classId), nis=cleanNis(req.data&&req.data.nis), password=String(req.data&&req.data.password||'');
  if(!classId||!nis||!password) throw new HttpsError('invalid-argument','NIS dan password wajib.');
  const q=await db.collection('students').where('nis','==',nis).where('classId','==',classId).limit(1).get();
  if(q.empty) throw new HttpsError('not-found','NIS tidak ditemukan di kelas ini.');
  const d=q.docs[0], x=d.data();
  if(x.active===false) throw new HttpsError('permission-denied','Akun siswa dinonaktifkan.');
  if(x.approved===false) throw new HttpsError('failed-precondition','Pendaftaran masih menunggu persetujuan admin.');
  let ok=false;
  if(x.passwordHash && x.passwordSalt) ok=hashSecret(password,x.passwordSalt)===x.passwordHash;
  else if(String(x.password||'')===password){
    ok=true; const salt=crypto.randomBytes(16).toString('hex');
    await d.ref.set({passwordHash:hashSecret(password,salt),passwordSalt:salt,password:admin.firestore.FieldValue.delete()},{merge:true});
  }
  if(!ok) throw new HttpsError('permission-denied','Password siswa salah.');
  await db.collection('studentSessions').doc(req.auth.uid).set({studentId:d.id,classId,active:true,lastLoginAt:admin.firestore.FieldValue.serverTimestamp()});
  return {ok:true,student:{id:d.id,nis:x.nis,name:x.name,classId:x.classId}};
});

exports.getStudentSession = onCall({region:REGION}, async (req)=>{
  requireAuth(req);
  const s=await db.collection('studentSessions').doc(req.auth.uid).get();
  if(!s.exists||s.data().active!==true) return {active:false};
  const d=await db.collection('students').doc(s.data().studentId).get();
  if(!d.exists) return {active:false};
  const x=d.data();
  if(x.active===false||x.approved===false) return {active:false};
  return {active:true,student:{id:d.id,nis:x.nis,name:x.name,classId:x.classId}};
});

exports.endStudentSession = onCall({region:REGION}, async (req)=>{
  requireAuth(req);
  await db.collection('studentSessions').doc(req.auth.uid).delete().catch(()=>{});
  return {ok:true};
});

exports.verifyExamPin = onCall({region:REGION}, async (req)=>{
  requireAuth(req);
  const examId=String(req.data&&req.data.examId||''), pin=String(req.data&&req.data.pin||'');
  if(!examId||!pin) throw new HttpsError('invalid-argument','PIN wajib.');
  const sess=await db.collection('studentSessions').doc(req.auth.uid).get();
  if(!sess.exists||sess.data().active!==true) throw new HttpsError('permission-denied','Sesi siswa tidak aktif.');
  const stu=await db.collection('students').doc(sess.data().studentId).get();
  if(!stu.exists||stu.data().active===false||stu.data().approved===false) throw new HttpsError('permission-denied','Akun siswa tidak aktif.');
  const pub=await db.collection('examPublic').doc(examId).get();
  if(!pub.exists||pub.data().active===false) throw new HttpsError('not-found','Ujian tidak tersedia.');
  const e=pub.data(), allowed=e.allowedClasses||[];
  if(Array.isArray(allowed)&&allowed.length&&!allowed.includes(stu.data().classId)) throw new HttpsError('permission-denied','Ujian tidak tersedia untuk kelas Anda.');
  const now=Date.now();
  if(e.startAt&&now<e.startAt.toMillis()) throw new HttpsError('failed-precondition','Ujian belum dimulai.');
  if(e.endAt&&now>e.endAt.toMillis()) throw new HttpsError('failed-precondition','Ujian sudah berakhir.');
  const sec=await db.collection('examSecrets').doc(examId).get();
  if(!sec.exists) throw new HttpsError('failed-precondition','Data rahasia ujian belum tersedia.');
  const x=sec.data(); let ok=false;
  if(x.pinHash&&x.pinSalt) ok=hashSecret(pin,x.pinSalt)===x.pinHash;
  else if(String(x.pin||'')===pin){
    ok=true; const salt=crypto.randomBytes(16).toString('hex');
    await sec.ref.set({pinHash:hashSecret(pin,salt),pinSalt:salt,pin:admin.firestore.FieldValue.delete()},{merge:true});
  }
  if(!ok) throw new HttpsError('permission-denied','PIN salah.');
  const url=String(x.url||e.url||'');
  if(!/^https:\/\//i.test(url)) throw new HttpsError('failed-precondition','Link ujian belum valid.');
  await db.collection('examAttempts').add({examId,studentId:stu.id,classId:stu.data().classId,startedAt:admin.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
  return {ok:true,url,name:e.name||'Ujian',subject:e.subject||''};
});
