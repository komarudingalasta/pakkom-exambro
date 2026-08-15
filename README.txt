PAKKOM EXAMBRO V14 — SIMPLE LOGIN & EXAM GUARD

Perubahan utama:
- Halaman awal simpel, satu login untuk admin/siswa. Email => admin, NIS => siswa.
- Siswa baru tetap dapat Daftar Siswa Baru melalui verifikasi kelas.
- Identitas aplikasi, identitas sekolah, dan logo dapat kosong/diubah/upload oleh admin.
- Kelola Siswa: pilih beberapa siswa, approve massal, hapus massal, dan hapus per siswa.
- Saat ujian: pindah tab/keluar halaman memicu bunyi + peringatan. Pelanggaran kedua otomatis menandai ujian selesai.
- Kelola Ujian: edit nama, pelajaran, link, kelas, tanggal, waktu, dan PIN; hapus ujian beserta attempt terkait.

FIRESTORE RULES BERUBAH:
- settings kini boleh READ untuk user yang sudah terautentikasi (termasuk anonymous), agar branding tampil pada halaman masuk.
- WRITE settings tetap hanya admin.

Deploy file:
- index.html
- app.js
- style.css
- firestore.rules (WAJIB publish karena berubah)
- config.js tetap memakai konfigurasi Firebase Anda.

Catatan browser:
Deteksi pindah tab/aplikasi memakai Page Visibility + window blur. Browser dapat memicu blur dan visibility bersamaan; V14 memakai debounce agar satu perpindahan tidak dihitung dua kali.
