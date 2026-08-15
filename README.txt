PAKKOM EXAMBRO V12.2 LITE — EXAM LOCK

PERUBAHAN UTAMA:
- Refresh saat sedang mengerjakan ujian otomatis kembali ke halaman ujian yang sama.
- Tombol Kembali di halaman ujian diganti menjadi "Sudah Selesai Mengerjakan".
- Saat tombol selesai ditekan, ada konfirmasi bahwa jawaban sudah dikirim.
- Status pengerjaan disimpan di Firestore collection examAttempts.
- Setelah status completed, ujian tidak dapat dibuka lagi oleh siswa tersebut.
- Dashboard menampilkan status "Sedang dikerjakan" atau "Selesai".
- Tombol "Lanjutkan Ujian" tersedia jika siswa keluar dari halaman sebelum menandai selesai.
- Semua fitur V12.1 Lite tetap dipertahankan: approval, import Excel, sesi 60 menit, Anonymous Auth, iframe Google Form/Quizizz.

WAJIB SAAT UPDATE:
1. Ganti index.html di GitHub.
2. Ganti app.js di GitHub.
3. Ganti style.css di GitHub (boleh sama, tetapi ikut paket ini).
4. config.js tetap dapat menggunakan yang lama.
5. PENTING: publish firestore.rules V12.2 di Firebase Console. Tanpa rules baru, tombol selesai akan gagal dengan permission-denied.
6. Tunggu GitHub Pages deploy, lalu refresh. Judul harus menjadi PakKom Exambro V12.2 Lite.

CATATAN GOOGLE FORM / QUIZIZZ:
PakKom Exambro hanya mengunci akses dari portal ini. Sistem tidak dapat mengetahui secara otomatis apakah siswa benar-benar sudah menekan Submit pada Google Form/Quizizz. Karena itu siswa harus menekan "Sudah Selesai Mengerjakan" setelah jawaban benar-benar dikirim.
