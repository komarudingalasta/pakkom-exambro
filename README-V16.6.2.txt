PakKom Exambro V16.6.2 - Student Session Fix

BUG DIPERBAIKI:
Siswa dapat logout setelah 60 menit walaupun masih aktif mengerjakan Google Form/Wayground
di dalam iframe. Aktivitas di iframe tidak selalu diterima oleh parent page sehingga sistem
salah menganggap siswa tidak aktif.

PERBAIKAN:
- Auto logout 60 menit dihapus.
- Batas idle di luar ujian menjadi 12 jam.
- Selama ujian aktif/in_progress, idle timeout tidak mengeluarkan siswa.
- Heartbeat lokal sesi berjalan setiap 60 detik selama ujian aktif.
- Heartbeat berhenti saat ujian selesai atau siswa logout.
- Pesan '60 menit tidak ada aktivitas' dihapus.
- Refresh tetap memulihkan attempt ujian yang sama.

FIRESTORE RULES:
Tidak berubah dari V16.6.1.
