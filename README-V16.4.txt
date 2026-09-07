PakKom Exambro V16.4 - Admin Password View

Perubahan:
- Admin dapat melihat password kelas yang disimpan sejak V16.4.
- Edit kelas termasuk mengganti password kelas.
- Admin dapat melihat password siswa yang dibuat/import/reset oleh admin sejak V16.4.
- Password tetap tidak disimpan plaintext pada students/classes; plaintext admin-only disimpan pada classCredentials/studentCredentials.
- Password lama yang hanya berupa SHA-256 hash tidak dapat dipulihkan. Admin perlu Edit/Reset sekali agar password dapat ditampilkan.
- Jika siswa mengganti sandinya sendiri, admin menampilkan status 'Diubah siswa'; admin dapat Reset Password untuk menetapkan password baru yang kembali dapat dilihat.
- Firestore Rules V16.4 wajib dipublish.
