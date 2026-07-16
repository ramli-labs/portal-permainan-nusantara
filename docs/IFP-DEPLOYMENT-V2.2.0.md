# Deployment IFP Portal Permainan Nusantara v2.2.0

## Persiapan

- IFP memakai Chrome atau Edge versi modern.
- JavaScript, IndexedDB, service worker, dan penyimpanan situs tidak diblokir.
- Perangkat memiliki ruang penyimpanan browser yang memadai.

## Instalasi

1. Deploy portal ke Vercel melalui repository GitHub.
2. Buka URL production pada IFP.
3. Buka `/offline-check.html`.
4. Pastikan service worker dan cache sudah siap.
5. Tekan tombol instalasi PWA atau gunakan menu browser **Install app**.
6. Buka aplikasi dari ikon yang terpasang.
7. Tekan **Simpan Persisten** pada halaman pemeriksaan bila browser mendukungnya.

## Uji offline

1. Buka kelima game satu kali.
2. Tutup aplikasi.
3. Matikan Wi-Fi.
4. Buka kembali PWA.
5. Mainkan satu ronde setiap game.
6. Pastikan hasil tersimpan.
7. Restart IFP dan pastikan data tetap tersedia.

## Pengaturan kelas

- Gunakan fullscreen untuk sesi bermain.
- Uji keyboard virtual sebelum kegiatan.
- Pastikan tombol dapat dijangkau dari posisi siswa.
- Hindari membersihkan data situs browser.
- Nonaktifkan aplikasi pembersih otomatis yang menghapus IndexedDB.

## Backup

Lakukan backup:

- sebelum pembaruan browser;
- sebelum reset perangkat;
- sebelum servis IFP;
- minimal satu kali setiap minggu bila portal digunakan rutin.

## Recovery

Bila data hilang:

1. Buka Mode Guru.
2. Pilih **Pulihkan Backup**.
3. Pilih file JSON terakhir.
4. Tinjau jumlah pemain, sesi, dan set soal.
5. Pilih ganti data atau gabungkan.
