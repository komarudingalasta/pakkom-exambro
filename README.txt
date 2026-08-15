PAKKOM EXAMBRO V12.7 LITE - CONSISTENT UI

Perubahan tampilan V12.7:
- Seluruh halaman menggunakan sistem ukuran, jarak, radius, warna, dan lebar konten yang sama.
- Halaman kelas, login, daftar mandiri, dashboard siswa, kartu ujian, halaman ujian, dashboard admin, kelola kelas, kelola siswa, kelola ujian, dan hasil ujian diselaraskan.
- Dashboard admin menggunakan kartu dengan tinggi dan posisi tombol yang seragam.
- Form Tambah Ujian memakai grid yang stabil pada PC/tablet dan otomatis menjadi satu kolom pada HP.
- Kartu ujian dibuat sama tinggi pada layar lebar dan satu kolom pada layar kecil.
- Tabel dibungkus konsisten dan tetap dapat digeser horizontal pada HP tanpa merusak layout.
- Dialog PakKom Exambro, tombol aksi, badge status, dan form dibuat konsisten.
- Halaman ujian tetap memaksimalkan iframe dan toolbar secara proporsional di HP/tablet/PC.
- Cache version dinaikkan menjadi 12.6.0.

FITUR V12.5 DAN SEBELUMNYA TETAP:
- Pendaftaran mandiri menunggu approval admin.
- Import Excel siswa.
- Sesi bertahan saat refresh dan logout otomatis setelah 60 menit tidak aktif.
- Refresh saat ujian kembali ke halaman soal.
- Ujian selesai menjadi 'Sudah Ujian' dan terkunci.
- Admin dapat melihat hasil pengerjaan per kelas dan mengaktifkan ulang akses siswa.
- Jadwal ujian berdasarkan tanggal, jam mulai, dan jam selesai.

UPLOAD KE GITHUB PAGES:
1. Ganti index.html
2. Ganti app.js
3. Ganti style.css
4. config.js boleh tetap dari versi aktif karena project Firebase sama.
5. firestore.rules tetap kompatibel dengan V12.5/V12.4 dan disertakan dalam paket.


V12.7 UI POLISH:
- Status admin sekarang membedakan Belum Ujian, Sedang Mengerjakan, dan Sudah Ujian.
- Belum Ujian hanya berlaku jika siswa belum pernah membuat examAttempt.
- Sedang Mengerjakan hanya berlaku jika examAttempt berstatus in_progress.
- Sudah Ujian hanya berlaku jika examAttempt berstatus completed.
- Hasil ujian tampil sebagai tabel di desktop dan kartu siswa di HP.
- Polesan visual login, dashboard siswa, kartu ujian, jadwal, hasil admin, dan layar ujian.
