PAKKOM EXAMBRO V16 — EXAM CONTROL CENTER

FOKUS V16
- Dashboard monitoring ujian real-time per ujian dan kelas.
- Status: Belum Ujian / Sedang Mengerjakan / Selesai / Tidak Ujian / Pelanggaran.
- Waktu mulai & selesai pada monitoring admin.
- Log pelanggaran pindah tab disimpan pada examAttempts.violationLog.
- Admin dapat mengizinkan ujian ulang langsung dari Control Center.
- Gangguan internet tidak dihitung sebagai pelanggaran dan muncul banner reconnect.
- Refresh/restart tetap melanjutkan attempt in_progress yang tersimpan.
- Sinkronisasi waktu server melalui koleksi timeSync agar status jadwal tidak hanya bergantung jam perangkat.
- Duplikat ujian; salinan dibuat Nonaktif agar aman diedit sebelum digunakan.
- Multi-kelas tetap didukung melalui allowedClasses (contoh: 7A,7B,7C).
- Status admin otomatis: Draft/Nonaktif, Akan Datang, Berlangsung, Selesai, Diarsipkan.
- Ujian dapat diarsipkan tanpa menghapus data pengerjaan.
- Kelola siswa: pencarian/filter + bulk Approve/Aktifkan/Nonaktifkan/Hapus.
- Ganti sandi siswa tetap tersedia.

PENTING
1. Publish firestore.rules V16 karena ada aturan baru untuk timeSync dan log pelanggaran.
2. Pertahankan config.js yang berisi konfigurasi Firebase proyek Anda.
3. Firebase Anonymous Authentication harus aktif untuk alur siswa versi Lite.
4. Untuk keamanan produksi penuh, PIN/login siswa idealnya dipindahkan ke server/Cloud Functions pada versi Secure berikutnya.
