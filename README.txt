PAKKOM EXAMBRO V7 AWAL

ALUR:
Kelas -> Password Kelas -> Daftar/Login Siswa -> NIS + Password -> Ujian

FILE:
- Ganti index.html
- Ganti assets/app.js
- Ganti assets/style.css
- PERTAHANKAN assets/config.js dari V4/V5/V6

KOLEKSI FIRESTORE:
classes/{kelas}
students/{id}
examPublic/{id}
examSecrets/{id}
admins/{uid}

FITUR:
- Admin mengatur password setiap kelas
- Siswa registrasi mandiri setelah berhasil masuk kelas
- NIS unik
- Login siswa menggunakan NIS + password
- Admin reset/nonaktifkan akun siswa
- Admin kelola ujian dan link
- Ujian dapat diarahkan ke Google Form, Quizizz, dll.
- PIN ujian terpisah di examSecrets

PENTING:
Versi ini adalah V7 AWAL/prototipe. Password siswa dan password kelas masih berada di Firestore dan belum ideal untuk produksi. Jangan membuat Rules Firestore menjadi allow read/write publik. Tahap berikutnya sebaiknya memindahkan autentikasi ke Firebase Authentication/Cloud Functions dan menambahkan import Excel.
