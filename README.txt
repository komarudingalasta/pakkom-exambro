PAKKOM EXAMBRO V9 STABLE

TUJUAN VERSI INI
- Dibuat ulang dari nol untuk menghindari layar putih/kosong.
- index.html memiliki layar awal sendiri sebelum app.js berjalan.
- Jika Firebase/config/app.js gagal dimuat, pengguna mendapat pesan error yang jelas.
- Semua file utama berada di folder yang sama agar deployment lebih sederhana.

FILE YANG WAJIB DIUNGGAH BERSAMA
1. index.html
2. style.css
3. config.js
4. app.js

Jangan hanya mengunggah index.html.

FITUR SISWA
- Pilih kelas + password kelas
- Daftar siswa mandiri
- Login NIS + password
- Sesi login tersimpan di browser
- Melihat ujian sesuai kelas
- Jadwal mulai/selesai
- PIN ujian
- Fullscreen sebelum membuka ujian bila browser mendukung
- Pencatatan awal ke examAttempts (opsional; jika Rules mengizinkan)

FITUR ADMIN
- Login Firebase Authentication email/password
- Dashboard jumlah kelas, siswa, ujian
- Tambah/ubah/nonaktifkan kelas
- Tambah siswa manual
- Cari/filter siswa
- Reset/nonaktifkan siswa
- Export siswa CSV
- Tambah/nonaktifkan/hapus ujian
- Atur kelas peserta, jadwal, link, dan PIN

STRUKTUR FIRESTORE KOMPATIBEL DENGAN V7
classes/{kelas}
students/{id}
examPublic/{id}
examSecrets/{id}
admins/{uid}
examAttempts/{id} (opsional)

PENTING SOAL KEAMANAN
Versi ini mempertahankan struktur V7 sehingga password kelas/siswa masih berada di Firestore. Ini dibuat agar kompatibel dengan data lama dan mudah diuji, tetapi belum ideal untuk produksi skala besar.
Jangan gunakan Rules Firestore "allow read, write: if true".
Untuk versi produksi, autentikasi siswa dan validasi PIN sebaiknya dipindahkan ke Firebase Authentication + backend/Cloud Functions.

JIKA LAYAR MASIH BERMASALAH
1. Pastikan keempat file di atas berada pada folder yang sama.
2. Buka DevTools/Console bila memakai komputer.
3. Pastikan perangkat memiliki internet karena library Firebase dimuat dari gstatic.com.
4. Pastikan config.js sesuai project Firebase.
5. Pastikan domain hosting diizinkan pada Firebase Authentication bila login admin gagal.
6. Periksa Firestore Rules bila halaman tampil tetapi data tidak bisa dibaca/ditulis.
