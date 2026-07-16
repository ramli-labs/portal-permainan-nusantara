# Release v2.2.0 — Final School Edition

## Status

Release Candidate final untuk deployment sekolah dan acceptance test pada Interactive Flat Panel.

## Perubahan dari v2.1.0

- Editor soal lintas-game.
- Set soal aktif tersimpan di IndexedDB.
- Integrasi set custom ke lima game.
- Riwayat soal lintas sesi untuk mengurangi pengulangan.
- Statistik guru per game, pemain, dan kategori.
- Pengelolaan profil pemain.
- Filter hasil lengkap dan CSV terfilter.
- Backup validation dan restore preview.
- PIN Guru dengan sesi terbatas.
- Hasil detail dilindungi PIN.
- Leaderboard lintas-game memakai indeks seimbang.
- Skor tersimpan dibatasi 10.000.
- Diagnostik offline diperluas.
- Permintaan persistent storage.
- Service worker mengabaikan query string saat membuka halaman offline.
- Cache final `ppn-ifp-v2.2.0`.

## Keputusan arsitektur

- Offline-first.
- Tanpa login dan backend.
- IndexedDB sebagai sumber data utama.
- Vercel hanya untuk distribusi dan pembaruan.
- Backup USB sebagai mekanisme pemulihan.
