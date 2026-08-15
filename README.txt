PAKKOM EXAMBRO V13 LITE

FOKUS V13:
- Dashboard siswa profesional dengan ringkasan ujian hari ini, belum selesai, dan total sudah ujian.
- Halaman verifikasi PIN yang lebih rapi.
- Halaman Persiapan Ujian sebelum attempt dibuat.
- Attempt berubah menjadi in_progress hanya setelah siswa menekan Mulai Ujian Sekarang.
- Timer ujian mengikuti endAt di Firestore, sehingga refresh tidak mereset waktu.
- Refresh saat ujian tetap kembali ke halaman soal.
- Status Sudah Ujian tetap terkunci dan dapat diaktifkan ulang admin seperti V12.7.
- Fitur admin V12.7 dipertahankan.

FIRESTORE RULES:
Tidak berubah dari V12.7. Tidak perlu publish ulang jika Rules V12.7 sudah aktif.

UPLOAD KE GITHUB:
Ganti index.html, app.js, style.css. config.js tetap sama.
