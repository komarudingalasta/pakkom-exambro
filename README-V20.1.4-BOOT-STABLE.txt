PakKom Exambro V20.1.4 — Boot Stable

Perbaikan utama:
- Menghilangkan ReferenceError PAKKOM_BOOT_OK is not defined.
- Boot flag sekarang selalu didefinisikan dari index.html sebelum modul dimuat.
- core.js mengubah window.PAKKOM_BOOT_OK menjadi true hanya setelah Firebase berhasil siap.
- bootstrap.js tidak lagi membaca variabel global yang mungkin belum ada.
- Jika folder modular belum seluruhnya terunggah / GitHub Pages belum selesai propagasi,
  aplikasi memberi pesan yang lebih jelas, bukan crash.
- Cache query dinaikkan ke v20.1.4 agar browser tidak mencampur file versi lama dan baru.

UPLOAD:
Paling aman: hapus/replace seluruh isi repo web dengan isi ZIP ini,
termasuk folder js beserta seluruh subfoldernya.
Jangan hanya mengganti index.html.

Firestore Rules:
Tetap gunakan Rules V20.1.1/V20.1.4 yang mencakup internalExamQuestions dan internalQuestionSecrets.
