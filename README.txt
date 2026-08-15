PAKKOM EXAMBRO V12 SECURE
=========================

VERSI INI BERBEDA DARI V11:
- Password kelas diverifikasi melalui Firebase Cloud Functions, bukan dibaca browser.
- Login siswa diverifikasi melalui Cloud Functions.
- PIN dan URL ujian disimpan di examSecrets dan hanya dikirim setelah PIN benar.
- Pendaftaran mandiri selalu approved=false dan harus di-Approve admin.
- Import Excel oleh admin otomatis approved=true.
- Sesi siswa tetap bertahan saat refresh dan logout setelah 60 menit tanpa aktivitas.
- Sesi admin juga logout setelah 60 menit tanpa aktivitas.
- Ujian dicoba tampil di dalam iframe PakKom Exambro. Situs yang melarang iframe tetap dapat dibuka dengan tombol Buka Langsung.

PERSIAPAN WAJIB FIREBASE
========================
1. Firebase Console > Authentication > Sign-in method:
   - Aktifkan Anonymous.
   - Aktifkan Email/Password untuk admin.

2. Pastikan dokumen admin sudah ada:
   admins/{UID_ADMIN}
   role: "admin"
   active: true

3. Deploy Firestore Rules dari file firestore.rules.

4. Deploy Cloud Functions dari folder functions.
   Jalankan dari folder proyek V12:

   npm install -g firebase-tools
   firebase login
   firebase use pakkom-exambro-643f6
   cd functions
   npm install
   cd ..
   firebase deploy --only functions,firestore:rules

CATATAN CLOUD FUNCTIONS
=======================
Cloud Functions biasanya membutuhkan project Firebase dengan billing Blaze aktif.
GitHub Pages tetap dapat dipakai untuk file web; backend aman berjalan di Firebase Functions.
Region Functions pada V12 adalah asia-southeast2.

UPLOAD KE GITHUB PAGES
======================
Upload file berikut ke root repository:
- index.html
- app.js
- style.css
- config.js

Folder functions, firebase.json, dan firestore.rules tidak perlu diupload ke GitHub Pages; file tersebut dipakai saat deploy Firebase backend.

IMPORT EXCEL SISWA
==================
Kolom yang dikenali:
NIS | Nama | Kelas | Password

Password kosong otomatis: 123456
Akun hasil import admin: approved=true
Akun daftar mandiri: approved=false

DATA V11 LAMA
=============
Cloud Functions V12 dapat membaca password plaintext V11 saat login/verifikasi pertama, lalu otomatis mengubahnya menjadi hash dan menghapus plaintext tersebut.
Password kelas lama juga otomatis dimigrasikan ke hash saat password kelas pertama kali berhasil diverifikasi.

Untuk ujian lama V11, sebaiknya buat ulang ujian melalui Admin V12 agar URL berada di examSecrets. verifyExamPin masih memiliki kompatibilitas terbatas terhadap pin lama bila examSecrets masih berisi field pin.
