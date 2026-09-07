PakKom Exambro V18.0.3 — Violation Lock + Admin Status Fix

PERBAIKAN UTAMA
1. Pelanggaran kedua tidak lagi berhenti di "Mengunci ujian".
2. Auto-lock memakai update minimal pada examAttempts.
3. Firestore Rules baru secara khusus mengizinkan transisi in_progress -> completed
   untuk completionReason left_exam_twice, autoCompleted=true, violationCount>=2.
4. Jika sinkronisasi gagal, ujian tetap dikunci lokal dan tersedia tombol coba sinkron lagi.
5. Refresh saat pending lock tidak membuka kembali ujian.
6. Jumlah pelanggaran disinkronkan antara localStorage dan Firestore.

STATUS UJIAN OLEH ADMIN
Di Hasil Pengerjaan dan Exam Control Center sekarang admin dapat memilih:
- Belum Ujian / Reset
- Sudah Ujian
- Pelanggaran
- Tidak Ujian

"Sedang Mengerjakan" tetap ditentukan otomatis oleh aktivitas siswa agar status live tidak dapat dipalsukan.

WAJIB:
Publish firestore.rules V18.0.3 di Firebase Console > Firestore Database > Rules.
