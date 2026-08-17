PakKom Exambro V16.6.1 - Bug Fix

Perbaikan utama:
- Firestore Rules diselaraskan dengan studentCredentials dan classCredentials.
- Ganti sandi siswa mendukung passwordAdminVisible.
- Buka Arsip mengaktifkan kembali ujian.
- Dashboard hanya menampilkan ujian aktif yang belum berakhir sebagai jadwal utama.
- Jumlah peserta hanya menghitung siswa aktif + approved.
- Label versi login diperbarui menjadi V16.6.1.
- Error credential tidak lagi disembunyikan; admin mendapat pesan jika Rules belum dipublish.

PENTING:
Publish firestore.rules V16.6.1 di Firebase setelah upload file GitHub.
