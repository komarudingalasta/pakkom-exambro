PAKKOM EXAMBRO V15 — STATUS & SECURITY POLISH

PERUBAHAN:
- Nada peringatan diganti alarm singkat 3 pulsa.
- Pelanggaran kedua tetap mengakhiri dan mengunci ujian.
- Status siswa yang dikunci karena pelanggaran diberi keterangan khusus di portal siswa dan admin.
- Jika waktu ujian sudah berakhir dan siswa tidak pernah memulai, status menjadi "Tidak Ujian".
- Siswa dapat mengganti sandi setelah login (wajib memasukkan sandi lama dan konfirmasi sandi baru).
- Tampilan hasil admin menambah status Tidak Ujian dan jumlah Pelanggaran.
- Link Wayground dapat digunakan sebagai link join langsung tanpa menampilkan kode join terpisah di UI PakKom Exambro.

WAYGROUND:
Kode join tidak ditulis atau ditampilkan terpisah kepada siswa. Jika admin memasukkan link langsung Wayground,
siswa hanya melihat konten/link ujian di dalam area ujian. Namun kode yang terkandung di URL tidak dapat dianggap
rahasia mutlak terhadap pengguna yang sengaja memeriksa URL/network browser. Untuk pembatasan lebih kuat gunakan
Wayground Classes / akun siswa.

FIRESTORE RULES BERUBAH:
Ya. V15 menambahkan izin update siswa yang sangat terbatas untuk perubahan passwordHash/password/passwordUpdatedAt.
Arsitektur Lite masih memverifikasi hash password di browser. Untuk penggunaan produksi dengan keamanan tinggi,
migrasi autentikasi siswa ke Firebase Authentication + Cloud Functions direkomendasikan.

DEPLOY:
- Ganti index.html, app.js, style.css
- Pertahankan config.js sesuai project Firebase Anda
- Publish firestore.rules V15
