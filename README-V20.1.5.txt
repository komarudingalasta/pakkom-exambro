PakKom Exambro V20.1.5 — Load Order Fix

Akar masalah V20.1.4:
index.html memuat js/core/core.js, core berhasil mengatur window.PAKKOM_BOOT_OK=true,
tetapi sesudah itu inline script di index.html mengatur window.PAKKOM_BOOT_OK=false lagi.
Akibatnya bootstrap selalu menganggap core belum siap.

V20.1.5:
- BOOT flag diinisialisasi SEBELUM config.js dan core.js.
- Tidak pernah di-reset setelah core berhasil.
- Cache seluruh modular script dinaikkan ke v20.1.5.
- Delayed diagnostic yang dapat menampilkan error palsu dihapus.
- Tidak ada perubahan Firestore schema/rules.

UPLOAD SELURUH ISI ZIP ke root repository, termasuk folder js.
