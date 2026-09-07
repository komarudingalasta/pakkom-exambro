PakKom Exambro V18.0.2 — Exam Guard Bug Fix

BUG YANG DIPERBAIKI
1. Pelanggaran kedua dapat berhenti di layar "Mengunci ujian..."
   Penyebab: UI menunggu write Firestore tanpa fallback/time-out yang jelas.
   Perbaikan: layar langsung menjadi "Ujian Dikunci", status disimpan dengan time-out,
   tersedia retry, dan pending lock dipulihkan otomatis saat koneksi kembali/dashboard dibuka.

2. Jumlah pelanggaran sebelumnya hanya mengandalkan localStorage saat resume.
   Sekarang count mengambil nilai maksimum antara localStorage dan Firestore.

3. ACTIVE_EXAM_KEY dapat tertinggal jika ujian dihapus atau siswa tidak lagi berada di kelas peserta.
   Ini dapat membuat sesi dianggap terus aktif. Sekarang key dibersihkan otomatis.

4. Pending lock dipulihkan setelah refresh.
   Siswa tidak dapat kembali masuk ke ujian hanya karena refresh pada saat proses lock belum tersinkron.

CATATAN AUDIT KEAMANAN (BELUM DIUBAH AGAR KOMPATIBILITAS TIDAK RUSAK)
- questionBank saat ini readable oleh semua auth, sehingga jawaban/kunci di dokumen Bank Soal
  belum aman untuk mesin ujian internal.
- examScores juga readable oleh semua auth, termasuk nilai draft.
- examSecrets readable oleh semua auth.
- aturan update students belum mengikat perubahan password ke UID siswa tertentu.
Untuk V18.1 sebaiknya arsitektur autentikasi siswa diperketat sebelum ujian internal diaktifkan.
