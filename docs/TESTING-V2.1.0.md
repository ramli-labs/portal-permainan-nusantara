# Pengujian Portal v2.1.0

## Otomatis

- Registry memuat 5 game berstatus tersedia.
- Bank soal: Gobak Sodor 100, empat game lain masing-masing 30.
- ID soal unik dan indeks jawaban valid.
- Seluruh JavaScript lolos pemeriksaan sintaks.
- Seluruh tautan, import modul, kontrak elemen DOM, dan aset cache tersedia.
- Mesin Congklak diuji untuk konservasi jumlah biji, giliran tambahan, tangkapan, akhir permainan, dan pemindahan sisa biji.
- Build menghasilkan folder `dist`.
- Runtime tidak memiliki ketergantungan Supabase atau layanan autentikasi.
- Endpoint statis utama memberikan HTTP 200 melalui server Node lokal.

## Manual wajib pada IFP

1. **Gobak Sodor**: uji Solo dan Co-op sampai hasil tersimpan.
2. **Jelajah**: uji 15 soal, pergantian pemain, nyawa, dan rapor kategori.
3. **Congklak**: uji Solo vs AI, Berdua, tangkapan, giliran tambahan, dan akhir papan.
4. **Engklek**: uji gacuk, urutan petak, nyawa, soal, dan pergantian pemain.
5. **Egrang**: uji langkah alternatif, rintangan, relay 50 meter, pos soal, dan batas waktu.
6. Periksa kelima hasil pada leaderboard dan riwayat.
7. Putuskan Wi-Fi, tutup aplikasi, buka dari ikon PWA, lalu ulangi satu sesi setiap game.

Chromium headless pada lingkungan pembuatan tidak berhasil digunakan karena proses browser macet. Karena itu, validasi sentuhan, ukuran layar, audio, dan perilaku fullscreen harus dilakukan langsung pada IFP target.
