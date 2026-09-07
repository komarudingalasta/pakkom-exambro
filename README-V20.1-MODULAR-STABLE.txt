PakKom Exambro V20.1 — Modular Stable

Versi ini memodularisasi aplikasi utama DAN Exam Builder tanpa npm, bundler, atau hosting berbayar.

Struktur utama:
js/core/core.js
js/student/student.js
js/admin/dashboard.js
js/admin/people.js
js/admin/exams.js
js/admin/scores.js
js/admin/question-bank.js
js/bootstrap.js

Exam Builder:
js/builder/core.js
js/builder/ui.js
js/builder/editor.js
js/builder/bank.js
js/builder/publish.js
js/builder/bootstrap.js

Alasan memakai classic scripts:
- tetap modular per fitur;
- dependency tetap eksplisit lewat urutan script;
- tidak butuh npm/build pipeline;
- lebih aman untuk GitHub Pages dan mudah rollback;
- fungsi lama tetap kompatibel sehingga risiko regresi lebih kecil.

Perbaikan stabilitas:
- Firebase Exam Builder sekarang memakai window.FIREBASE_CONFIG (sesuai config.js).
- Bootstrap/global event listener hanya berjalan setelah seluruh feature module dimuat.
- app.js monolith lama tidak lagi dimuat, hanya disimpan di /legacy untuk rollback.
- builder-v20 monolith juga hanya disimpan di /legacy.
- cache version dinaikkan ke 20.1.0.

Rules:
Secara fungsional sama dengan V20. Publish firestore.rules bila Rules V20 belum aktif.


V20.1.1 FIX:
- Menambahkan rules internalExamQuestions.
- Menambahkan rules internalQuestionSecrets.
- Tidak mengubah behavior fitur lain.
