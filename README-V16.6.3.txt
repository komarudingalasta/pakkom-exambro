PakKom Exambro V16.6.3 - Startup Fix

BUG:
V16.6.2 gagal dimuat dengan:
Uncaught ReferenceError: loadActiveExamId is not defined

PENYEBAB:
Fungsi session yang tersedia bernama readActiveExam(), tetapi checkIdle()
secara keliru memanggil loadActiveExamId().

PERBAIKAN:
- loadActiveExamId() diganti menjadi readActiveExam().
- Session heartbeat V16.6.2 tetap dipertahankan.
- Timeout 60 menit tetap dihapus.
- Cache dinaikkan menjadi 16.6.3.

FIRESTORE RULES:
Tidak berubah dari V16.6.1/V16.6.2.
Tidak perlu publish rules ulang.
