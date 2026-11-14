# Constant Modul

Aplikasi web satu halaman untuk **regularity rally**: menjadwalkan sub A–J, lalu menghitung jarak tempuh secara real-time dari kecepatan dan jam mulai. Bisa dipasang sebagai aplikasi (PWA) dan bekerja offline setelah dibuka sekali.

- Situs: <https://teethzeronine.github.io/constant-module/>
- Versi dokumen ini: **1.3**

## Fitur

- **10 sub (A–J)**, masing-masing menyimpan kecepatan, jam mulai, dan jarak.
- **Dua mode input**
  - **Jadwalkan mulai**: isi delay `0`, lalu isi jam mulai. Sub standby dan aktif otomatis pada jam tersebut.
  - **Mulai sekarang**: isi delay lebih dari `0` (menit). Jarak awal = `kecepatan × delay ÷ 60`.
- **Hitung jarak real-time** dengan resolusi meter (3 desimal km).
- **Bunyi hitung mundur** 3 detik sebelum start + **alarm start** (3 nada + getar + kilat hijau).
- **Jam master manual** (`Set Jam`) untuk mencocokkan jam acuan juri.
- **Hentikan sub** tanpa menghapus datanya (jarak berhenti di nilai terakhir).
- **PWA/offline**: service worker menyimpan shell aplikasi; data disimpan di `localStorage`.
- **Aktivasi per perangkat** dengan kode 16 karakter (percobaan) atau kode panjang ECDSA.
- **Lapor bug** langsung ke WhatsApp admin, membawa versi, ID perangkat, dan info lisensi.

## Struktur file

| File | Fungsi |
| --- | --- |
| `index.html` | Seluruh aplikasi (UI, logika, lisensi). |
| `sw.js` | Service worker: cache offline. **Naikkan `CACHE` setiap kali file aplikasi berubah.** |
| `manifest.webmanifest` | Metadata PWA (nama, ikon, warna, mode standalone). |
| `config.json` | Kunci publik lisensi, nomor WhatsApp admin, nama penjual. |
| `icon-192.png`, `icon-512.png` | Ikon aplikasi. |

## Cara pakai singkat

1. Buka aplikasi. Jika terkunci, salin **ID Perangkat** dan minta kode aktivasi ke admin.
2. Pilih sub di kartu **Semua Sub** (atau tekan **Sub berikut**).
3. Isi **Kecepatan (km/jam)**.
4. Pilih salah satu:
   - **Jadwalkan mulai** — delay `0`, isi **Jam mulai** `HH:MM:SS` (boleh `HH:MM`). Gunakan tombol **Sekarang** untuk mengisi jam saat ini.
   - **Mulai sekarang** — isi **Delay** dalam menit.
5. Tekan **Mulai**.
6. Saat sub aktif, kartu besar menampilkan jarak berjalan. Tekan **Hentikan** untuk menghentikan hitungan tanpa menghapus data, atau **Reset sub** untuk menghapus sub tersebut.

### Perilaku penting

- **Satu sub aktif pada satu waktu.** Saat sub baru aktif, sub yang lama otomatis menjadi *Selesai* dengan jarak terakhirnya.
- **Batas 99,99 km.** Jika jarak sub aktif mencapai 99,99 km, semua sub di-reset otomatis (mengikuti perilaku modul Arduino).
- **Jadwal lebih dari 6 jam yang lalu** dianggap kedaluwarsa dan dihapus saat aplikasi dibuka.
- **Mengubah jam mengikuti rumus modul Arduino.** Jarak sub aktif = jarak lama + `kecepatan ÷ 3600 × selisih jam`. Jadi jam dimajukan membuat jarak bertambah, sedangkan jam dimundurkan tidak mengurangi jarak yang sudah ditempuh. Jadwal mulai mengikuti jam baru (tidak digeser).
- **Layar tetap menyala** memakai Screen Wake Lock (Chrome/Android). Di iOS/browser yang tidak mendukung, atur waktu layar mati lebih lama secara manual.
- **Data dan lisensi tersimpan di browser perangkat.** Menghapus data situs/aplikasi akan menghilangkan ID perangkat dan lisensi.

## Menjalankan dan menguji secara lokal

Aktivasi memakai `crypto.subtle`, yang hanya tersedia di **HTTPS** atau **localhost** — membuka `index.html` lewat `file://` akan menampilkan pesan "Aktivasi butuh koneksi aman".

Contoh server lokal:

```bash
# Node.js
npx serve .

# Python
python -m http.server 8137
```

Lalu buka `http://localhost:8137/`.

Untuk pengujian tanpa kode aktivasi, buat kode percobaan memakai `kodeKey` di `config.json` (lihat catatan keamanan di bawah), atau minta kode ke admin.

## Deploy ke GitHub Pages

1. Ganti file di repositori `teethzeronine/constant-modul` (`main`).
2. **Setiap kali `index.html`, `manifest.webmanifest`, ikon, atau `config.json` berubah, naikkan angka `CACHE` di `sw.js`** (mis. `constant-modul-v8` → `v9`). Tanpa ini, sebagian pengguna bisa tetap menerima file lama dari cache.
3. Commit dan push. GitHub Pages akan memperbarui situs dalam beberapa saat.
4. Di perangkat yang sudah memasang aplikasi, tutup lalu buka ulang aplikasi. Jika masih terlihat versi lama, buka di browser biasa dan lakukan hard refresh, atau hapus/pasang ulang aplikasi.

## Lisensi dan keamanan

`config.json` berisi:

- `publicKey` — kunci publik ECDSA P-256 untuk memverifikasi **kode panjang**. Aman dipublikasikan.
- `kodeKey` — kunci HMAC untuk **kode 16 karakter (termasuk kode percobaan)**. **Ini rahasia bersama, tetapi ikut terkirim ke browser.**
- `wa` — nomor WhatsApp admin untuk aktivasi dan laporan bug.
- `namaPenjual` — nama yang dipakai pada pesan WhatsApp.

> **Penting:** siapa pun yang membuka `config.json` dapat membaca `kodeKey` dan membuat kode 16 karakter sendiri untuk ID perangkat apa pun. Kode panjang ECDSA tidak terkena masalah ini karena hanya membutuhkan kunci publik. Untuk lisensi berbayar, gunakan **kode panjang** dan anggap kode 16 karakter hanya sebagai percobaan yang bisa disalahgunakan. Detail ada di `CATATAN-PERBAIKAN.md`.

Jangan pernah mengunggah kunci privat pembuat kode ke repositori atau ke perangkat pengguna.

## Changelog

### 1.3

- Perhitungan jarak saat **Set Jam** disamakan dengan modul Arduino: jarak sub aktif bertambah sesuai `kecepatan ÷ 3600 × selisih jam`. Jam dimajukan = jarak lebih panjang.
- Jam dimundurkan tidak mengurangi jarak yang sudah ditempuh (menghindari lompatan reset akibat selisih waktu negatif).
- Jadwal mulai tidak lagi ikut digeser saat jam diubah; sub standby mengikuti jam baru seperti RTC pada modul.
- `CACHE` service worker dinaikkan ke `v8`.

### 1.2

- Perbaikan performa: grid tidak lagi dirender ulang 10×/detik; hanya angka jarak sub aktif yang diperbarui.
- Perbaikan bug jadwal lebih dari 6 jam yang dulu dihapus diam-diam; sekarang ditolak dengan pesan jelas.
- Mengubah jam sekarang menggeser jadwal dan jangkar sehingga jarak tidak melompat.
- Alarm start baru: 3 nada, getar, dan kilat hijau saat sub mulai otomatis.
- Input waktu lebih toleran (`7:30`, `730`, `073000`, `07:30:00`).
- Validasi kecepatan (maks. 300 km/jam), delay (maks. 1440 menit), dan jarak awal.
- Tombol **Hentikan** dan **Sekarang**; Enter untuk mengirim form.
- Service worker: fallback offline yang benar, timeout jaringan 4 detik, cache `v7`.
- iOS: unlock audio lebih andal, petunjuk pemasangan, peringatan wake lock.
- Aksesibilitas: label ARIA pada tombol sub, `aria-pressed`, `role="status"` pada toast, fokus terlihat.
- Tampilan: teks lebih rapi pada layar kecil, mode gerak berkurang dihormati.

## Lisensi perangkat lunak

Hak cipta pemilik aplikasi. Repositori ini bersifat publik untuk hosting GitHub Pages, bukan lisensi sumber terbuka.
