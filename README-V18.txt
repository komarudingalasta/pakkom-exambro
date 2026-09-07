PakKom Exambro V18.0 — Quiz Builder / Bank Soal

FITUR:
- Menu Bank Soal.
- Soal Pilihan Ganda, Benar/Salah, Isian Singkat, Uraian.
- Bobot, mapel, kelas, topik, tingkat kesulitan.
- Edit/hapus soal.
- Gambar soal: Upload ke Google Drive via Apps Script atau tempel URL.
- Browser mengompresi gambar menjadi WebP kualitas 78%, maksimal sisi 1200 px sebelum upload.
- Firestore hanya menyimpan imageUrl, bukan file gambar.
- GoogleAppsScript-QuestionMedia.gs disertakan.

SETUP GAMBAR:
1. Buat folder Drive khusus gambar soal.
2. Buka GoogleAppsScript-QuestionMedia.gs.
3. Ganti DRIVE_FOLDER_ID.
4. Buat project Apps Script, paste file tersebut.
5. Deploy sebagai Web App.
6. Copy URL /exec.
7. Admin > Bank Soal > Media > paste URL > Simpan.

FIRESTORE:
Publish firestore.rules V18 karena ada collection questionBank.

CATATAN:
V18.0 ini membangun Bank Soal/editor/media. Mesin ujian internal yang menyusun soal dari Bank Soal
menjadi paket ujian dapat dilanjutkan pada V18.1 setelah Bank Soal stabil.
