PAKKOM EXAMBRO V12 LITE
=======================

Tujuan versi Lite:
- Tidak memakai Cloud Functions.
- Tidak membutuhkan paket Blaze untuk fungsi backend.
- Bisa di-host di GitHub Pages.
- Siswa memakai Firebase Anonymous Authentication.
- Login siswa bertahan saat refresh.
- Logout otomatis setelah 60 menit tanpa aktivitas.
- Pendaftaran mandiri wajib approval admin.
- Admin dapat upload Excel (.xlsx/.xls/.csv).
- Password/PIN yang dibuat V12 Lite disimpan sebagai SHA-256 hash.
- Google Form/Quizizz dicoba ditampilkan dalam iframe, dengan tombol buka langsung sebagai cadangan.

PENTING SOAL KEAMANAN
---------------------
Versi Lite melakukan validasi password dan PIN di browser. Hash lebih baik daripada plaintext,
tetapi tetap tidak setara dengan validasi server/Cloud Functions. Untuk ujian berisiko tinggi,
gunakan V12 Secure.

LANGKAH PEMASANGAN
------------------
1. Firebase Console -> Authentication -> Sign-in method -> aktifkan Anonymous.
   Email/Password untuk admin juga harus aktif.
2. Firebase Console -> Firestore Database -> Rules.
   Ganti rules dengan isi firestore.rules lalu Publish.
3. Upload index.html, app.js, style.css, config.js ke folder/root GitHub Pages yang sama.
4. Pastikan akun admin ada di Firebase Authentication dan dokumen admins/{UID} berisi:
   role: "admin"
   active: true

FORMAT EXCEL SISWA
------------------
Kolom minimum:
NIS | Nama | Kelas | Password

Password boleh kosong; default 123456.
Siswa hasil upload admin langsung approved/aktif.
Siswa daftar mandiri tersimpan approved=false dan active=false sampai admin klik Approve.

KOMPATIBILITAS DATA LAMA
------------------------
V12 Lite masih dapat membaca field lama password/demoPassword/pin agar data V11 tidak langsung putus.
Namun data lama tersebut masih plaintext. Sebaiknya admin mengatur ulang password kelas, password siswa,
dan PIN ujian menggunakan V12 Lite agar tersimpan dalam field hash.
