PAKKOM EXAMBRO V8

ALUR SISWA
Kelas -> Password Kelas -> Daftar/Login Siswa -> NIS + Password -> Pilih Ujian -> PIN -> Persiapan Fullscreen -> Link Ujian

FITUR BARU V8
- Tampilan lebih nyaman di HP/tablet.
- Sesi login siswa disimpan di perangkat sehingga tidak perlu login ulang setiap refresh.
- Status ujian: Belum Mulai / Aktif / Berakhir.
- Jadwal mulai dan selesai ditampilkan ke siswa.
- Layar persiapan ujian + tombol fullscreen.
- Catatan awal attempt ke koleksi examAttempts (jika Rules mengizinkan).
- Admin dashboard dengan jumlah kelas, siswa, dan ujian.
- Pencarian dan filter siswa per kelas.
- Import siswa dari XLSX/XLS/CSV.
- Export daftar siswa ke CSV.
- Template import siswa.
- Reset password dan aktivasi/nonaktivasi siswa dengan konfirmasi.
- Kelola kelas lebih rapi.
- Edit ujian dasar, ubah link/kelas/PIN, aktif/nonaktif, hapus.
- Validasi HTTPS dan validasi jadwal selesai > mulai.

FORMAT IMPORT SISWA
Kolom wajib:
- NIS
- Nama
- Kelas
Kolom opsional:
- Password
Jika Password kosong atau kurang dari 6 karakter, digunakan default 123456.
NIS yang sudah ada akan dilewati.

STRUKTUR FIRESTORE KOMPATIBEL V7
classes/{kelas}
students/{id}
examPublic/{id}
examSecrets/{id}
admins/{uid}
examAttempts/{id}   (baru, opsional)

FILE
- index.html
- assets/app.js
- assets/style.css
- assets/config.js (dipertahankan dari file Anda)

CATATAN KEAMANAN PENTING
V8 masih mempertahankan kompatibilitas dengan V7. Artinya password siswa, password kelas, dan PIN masih dapat berada pada Firestore dan validasi dilakukan dari client web. Ini belum ideal untuk produksi dengan risiko tinggi.

Untuk versi produksi yang lebih aman:
1. Gunakan Firebase Authentication untuk identitas siswa/admin.
2. Gunakan Cloud Functions/server untuk validasi password kelas/PIN.
3. Jangan memberikan read/write publik pada Firestore Rules.
4. Pisahkan data rahasia dari data yang dapat dibaca client.
5. Gunakan App Check dan logging server-side.

BATASAN WEB EXAMBRO
Web biasa tidak dapat sepenuhnya memblokir tombol Home, Recent Apps, notifikasi, screenshot, pindah aplikasi, atau browser lain pada Android/iOS. Untuk kunci perangkat yang kuat diperlukan aplikasi native/kiosk mode/managed device.
