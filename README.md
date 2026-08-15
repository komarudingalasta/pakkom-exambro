# PakKom Exambro V5

Upgrade dari V4:
- Login per kelas
- Daftar kelas aktif dari Firestore
- Dashboard siswa
- Daftar ujian
- Pembatasan kelas per ujian
- Jadwal mulai/selesai
- Link HTTPS Google Form/Quizizz/website
- PIN ujian dipisahkan dari examPublic
- Dashboard admin kelas dan ujian

Catatan:
- Akun Admin Firebase yang sudah ada tetap digunakan.
- Password demo 7A: 123456.
- PIN produksi idealnya diverifikasi server-side. Dengan Rules yang sekarang, examSecrets kemungkinan terkunci; jangan melonggarkan Rules hanya untuk membuat PIN terbuka.
