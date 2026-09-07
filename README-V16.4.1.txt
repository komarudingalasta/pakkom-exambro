PakKom Exambro V16.4.1 - Class Menu Fix

Perbaikan:
- Mengembalikan fungsi syncClassesFromStudents() yang hilang pada V16.4.
- Kelola Kelas kembali dapat dibuka.
- Saat Kelola Kelas dibuka, classId dari data siswa akan disinkronkan ke koleksi classes.
- Kelas yang belum ada dibuat dengan password default 123456.
- Password kelas tetap dapat dilihat admin melalui classCredentials.
- Edit kelas tetap dapat mengganti nama kelas dan password kelas.
- Cache app.js dinaikkan ke 16.4.1.

Firestore Rules:
- Tidak berubah dari V16.4.
- Jika firestore-v16.4.rules sudah dipublish, tidak perlu publish ulang.
