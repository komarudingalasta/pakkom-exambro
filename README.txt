PAKKOM EXAMBRO V16.2 — CLASS ACCESS FLOW

PERUBAHAN:
- Import siswa otomatis membuat kelas yang belum ada.
- Password awal kelas otomatis: 123456.
- Tambah siswa manual juga otomatis membuat kelas jika belum ada.
- Kelola Kelas: admin dapat mengedit nama/tampilan kelas, mengganti password, aktif/nonaktif.
- Login siswa: NIS + sandi siswa -> password kelas -> Dashboard Siswa.
- Kode kelas dipertahankan sebagai ID agar relasi siswa/ujian tidak terputus.

FIRESTORE RULES:
- Tidak ada perubahan izin dari V16.1.
- Rules V16.1 tetap kompatibel karena admin sudah diizinkan create/update dokumen classes.

PASSWORD DEFAULT KELAS: 123456
