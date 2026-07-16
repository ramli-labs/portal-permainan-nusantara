# Pengujian Portal v2.2.0

## Pengujian otomatis

Perintah:

```bash
npm test
npm run build
```

Hasil yang harus muncul:

- Smoke test Portal v2.2.0: PASS
- Congklak engine tests: PASS
- Game DOM contracts: PASS
- Final hardening v2.2.0: PASS
- Build menghasilkan folder `dist`

## Cakupan

- 5 game tersedia pada registry.
- 100 soal Gobak Sodor.
- 30 soal pada masing-masing empat game lain.
- ID soal unik dan empat pilihan valid.
- Mesin Congklak menjaga jumlah biji dan aturan tangkap.
- Elemen DOM penting tersedia.
- Set soal custom minimal enam soal.
- Backup tervalidasi sebelum restore.
- Indeks leaderboard dibatasi 10.000.
- Service worker memuat halaman dan modul final.
- Tidak ada dependensi Supabase atau secret frontend.

## Pemeriksaan statis tambahan

- seluruh JavaScript lolos `node --check`;
- seluruh tautan lokal tersedia;
- seluruh import modul tersedia;
- seluruh JSON valid;
- tidak ada ID HTML ganda;
- CSS tidak menghasilkan parser error.

## Uji manual wajib

Gunakan `offline-check.html` dan selesaikan checklist IFP. Fokus pada:

- sentuhan;
- mode Berdua;
- keyboard virtual;
- audio;
- fullscreen;
- offline setelah restart;
- backup dan restore;
- hasil lima game.
