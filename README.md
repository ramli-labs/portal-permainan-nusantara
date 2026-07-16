# Portal Permainan Nusantara v2.2.0 Final
## IFP Offline Edition

Portal PWA tanpa login untuk Interactive Flat Panel. Pemain cukup memilih game, memilih Solo atau Berdua, memasukkan nama, lalu bermain. Data disimpan pada perangkat menggunakan IndexedDB.

## Lima game final

1. **Gobak Sodor Nusantara**
   - Solo dan Co-op.
   - Tiga kesulitan.
   - Enam soal pada perjalanan pergi dan pulang.
   - Peta lima pulau, shield, combo, nyawa, timer, dan rapor.

2. **Jelajah Nusantara**
   - Solo dan Berdua bergantian.
   - Ekspedisi 15 soal pada lima kawasan.
   - Target berbeda menurut kesulitan.
   - Rapor kategori dan soal tidak berulang sampai siklus bank habis.

3. **Congklak Cerdas**
   - Papan 7 lubang dan 2 lumbung.
   - Solo melawan AI atau Berdua.
   - Giliran tambahan, tangkapan biji, akhir permainan, dan soal matematika.

4. **Engklek Pintar**
   - Solo dan Berdua bergantian.
   - Petak gacuk berubah setiap ronde.
   - Nyawa, timer, target urutan petak, dan soal campuran.

5. **Egrang Nusantara**
   - Solo atau relay Berdua.
   - Ritme kiri-kanan, keseimbangan, rintangan, Langkah Tinggi, dan empat pos soal.

## Fitur final v2.2.0

- IndexedDB untuk profil pemain, hasil, pengaturan, dan set soal.
- PIN Guru lokal dengan sesi 45 menit.
- Editor soal untuk seluruh game.
- Set soal custom dapat diaktifkan, diimpor, dan diekspor melalui JSON.
- Pencegahan pengulangan soal sampai bank soal selesai satu siklus.
- Statistik guru per game, pemain, dan kategori pelajaran.
- Pengelolaan profil pemain dan koreksi salah ketik nama.
- Riwayat hasil dengan filter game, mode, hasil, kesulitan, nama, kelas, dan tanggal.
- Ekspor CSV berdasarkan hasil yang sedang difilter.
- Backup dan restore seluruh data melalui JSON.
- Leaderboard lintas-game memakai indeks seimbang; filter per game memakai skor asli.
- Skor tersimpan dibatasi maksimal 10.000 poin, sedangkan skor mentah tetap dicatat pada metadata.
- Service worker v2.2.0 dengan cache seluruh aset portal dan lima game.
- Pemeriksaan kesiapan offline, sentuh, fullscreen, ruang penyimpanan, dan instalasi PWA.
- Checklist uji IFP yang tersimpan pada perangkat.
- Tidak memakai Supabase, login, Google Fonts, CDN, atau API eksternal saat runtime.

## Menjalankan lokal

```bash
npm test
npm run build
python -m http.server 8000 -d dist
```

Buka `http://localhost:8000`.

Jangan membuka `index.html` langsung melalui `file://`, karena service worker dan modul JavaScript membutuhkan HTTP atau HTTPS.

## Deployment Vercel

- Framework Preset: `Other`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: tidak diperlukan

Setelah deploy, buka `/offline-check.html`, pasang PWA, lalu lakukan uji dengan Wi-Fi dimatikan.

## Mode Guru

Saat pertama kali dibuka, guru membuat PIN 4–8 angka. Mode Guru menyediakan:

- editor soal semua game;
- statistik hasil;
- pengelolaan pemain;
- ekspor CSV;
- backup dan restore JSON;
- perubahan PIN;
- penghapusan data pemain dan hasil.

PIN lokal merupakan penghalang operasional pada perangkat bersama, bukan autentikasi server. Bila PIN terlupa, data browser harus dipulihkan dari backup atau penyimpanan situs direset.

## Penyimpanan

- **IndexedDB:** profil, sesi, hasil, set soal, PIN hash, dan pengaturan data.
- **Local Storage:** tema, nama terakhir, dan checklist uji manual.
- **Session Storage:** sesi permainan aktif dan sesi Mode Guru.

Backup JSON mencakup data IndexedDB. Lakukan backup berkala ke USB, terutama sebelum reset browser, pembaruan perangkat, atau servis IFP.

## Pengujian otomatis

```bash
npm test
```

Mencakup:

- validitas lima bank soal;
- registry lima game;
- mesin Congklak;
- kontrak DOM game;
- editor soal dan backup;
- rumus indeks leaderboard;
- daftar cache PWA;
- pemeriksaan file runtime.

## Dokumentasi

- `docs/USER-GUIDE-V2.2.0.md`
- `docs/IFP-DEPLOYMENT-V2.2.0.md`
- `docs/TESTING-V2.2.0.md`
- `docs/FINAL-ACCEPTANCE-CHECKLIST.md`
- `docs/RELEASE-V2.2.0.md`

## Batas final yang tetap memerlukan perangkat nyata

Kode, struktur, dan build sudah diaudit. Status final sekolah tetap memerlukan satu acceptance test pada IFP yang akan dipakai, terutama untuk akurasi sentuhan, keyboard virtual, suara, fullscreen, restart perangkat, dan persistensi data browser.
