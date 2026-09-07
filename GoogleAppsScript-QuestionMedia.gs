/**
 * PakKom Exambro V18 — Question Media Upload
 * 1. Buat folder Google Drive khusus gambar soal.
 * 2. Ganti DRIVE_FOLDER_ID di bawah.
 * 3. Deploy > New deployment > Web app.
 * 4. Execute as: Me.
 * 5. Who has access: Anyone (sesuaikan kebijakan akun).
 * 6. Salin Web App URL /exec ke Bank Soal > Media.
 */
const DRIVE_FOLDER_ID = 'GANTI_DENGAN_FOLDER_ID_GOOGLE_DRIVE';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action !== 'uploadQuestionImage') throw new Error('Action tidak valid.');
    if (!body.base64 || !body.mimeType) throw new Error('Data gambar tidak lengkap.');

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const bytes = Utilities.base64Decode(body.base64);
    const blob = Utilities.newBlob(bytes, body.mimeType, body.filename || ('question-' + Date.now() + '.webp'));
    const file = folder.createFile(blob);

    // Agar browser siswa dapat menampilkan gambar secara langsung.
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // URL direct-view; file tetap tersimpan di Google Drive, bukan Firebase Storage.
    const url = 'https://drive.google.com/uc?export=view&id=' + file.getId();

    return json_({ok:true, fileId:file.getId(), url:url});
  } catch (err) {
    return json_({ok:false, error:String(err && err.message || err)});
  }
}

function doGet() {
  return json_({ok:true, service:'PakKom Question Media'});
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
