# Catatan audit & perbaikan — Constant Modul v1.3

Dokumen ini merangkum temuan pada versi 1.1 (situs GitHub Pages) dan perubahan yang sudah diterapkan di folder ini. Tujuannya agar pemilik aplikasi tahu apa yang berubah, apa yang masih perlu keputusan, dan cara mengujinya.

## Ringkasan

Versi 1.1 sudah berfungsi, tetapi ada beberapa bug yang bisa membuat jadwal hilang, jarak melompat, dan tampilan boros baterai. Versi 1.2–1.3 memperbaiki hal-hal tersebut tanpa mengubah format data, kunci lisensi, atau alur aktivasi.

Perubahan utama:

- Grid 10 sub tidak lagi dirender ulang 10×/detik.
- Jadwal yang sudah lewat > 6 jam ditolak dengan pesan jelas (dulu dihapus diam-diam).
- Mengubah jam master mengikuti rumus modul Arduino: jam maju menambah jarak, jam mundur tidak mengurangi jarak.
- Ada alarm start yang jelas (bunyi + getar + kilat hijau).
- Input waktu lebih manusiawi dan validasi input lebih ketat.
- Service worker offline diperbaiki.

## Bug dan perbaikan

### 1. Grid dirender ulang 10×/detik — performa & baterai

**Dulu:** `tick()` berjalan setiap 100 ms dan memanggil `render()`, yang menulis ulang seluruh `innerHTML` grid 10 tombol. Setiap render menghancurkan dan membuat ulang elemen, sehingga fokus, status tekan, dan animasi bisa hilang; ini juga memicu layout berulang.

**Sekarang:**

- `renderClock()`, `renderLive()`, dan `renderGrid()` dipisah.
- Grid hanya dibangun ulang jika status/kecepatan/jam mulai/sub terpilih berubah.
- Angka jarak sub aktif diperbarui langsung pada node teksnya.
- Interval menjadi 200 ms; angka jarak tetap halus karena memakai waktu pecahan (milidetik), bukan detik bulat.

### 2. Jadwal lebih dari 6 jam yang lalu hilang tanpa penjelasan

**Dulu:** mengisi jam mulai 7 jam yang lalu akan memunculkan konfirmasi "sudah lewat 25200 detik". Setelah dikonfirmasi, `runSchedules()` lebih dulu menghapus jadwal yang telat > 6 jam, lalu tidak pernah mengaktifkannya. Pengguna hanya melihat toast "dijadwalkan" padahal sub langsung kosong.

**Sekarang:** input ditolak dengan pesan "Jam mulai lebih dari 6 jam yang lalu. Periksa jam dan tanggal." Konfirmasi hanya muncul untuk keterlambatan 6 detik–6 jam, dan pesannya memakai format `HH:MM:SS`. Keterlambatan ≤ 5 detik (mis. menekan **Sekarang** lalu **Mulai**) langsung dijalankan tanpa dialog.

### 3. Perhitungan jarak saat jam master diubah

**Dulu (1.1):** `S.offset` berubah dan `anchor` tidak digeser, sehingga jarak ikut melompat. Ini sebenarnya sama arahnya dengan modul Arduino, tetapi belum ada penanganan untuk jam mundur.

**Sempat diubah (1.2):** `applyClockOffset()` menggeser `anchor` dan `startAt` agar jarak tidak melompat. Ternyata ini tidak sesuai dengan rumus modul Arduino.

**Sekarang (1.3):** mengikuti rumus Arduino, `totalDistance += (kecepatan / 3600) × selisih waktu`. Saat jam dimajukan, `anchor` dibiarkan sehingga jarak sub aktif langsung bertambah sebesar `kecepatan ÷ 3600 × selisih jam`. Saat jam dimundurkan, jarak yang sudah ditempuh dikunci lebih dulu agar tidak berkurang atau memicu reset karena selisih negatif. `startAt` sub standby tidak digeser, jadi jadwal mengikuti jam baru seperti RTC pada modul.

### 4. Tidak ada tanda saat sub benar-benar mulai

**Dulu:** bunyi hanya berbunyi pada 3 detik terakhir. Saat detik start tiba, tidak ada bunyi/Getar khusus, sehingga pengguna yang sedang berkendara bisa melewatkannya.

**Sekarang:** `startAlert()` berbunyi 3 nada (1400–1600 Hz), bergetar 5 kali, dan memberi kilat hijau pada kartu live. Saat start otomatis dari jadwal, alarm ini dipicu sekali.

### 5. Audio kurang andal di iOS

**Dulu:** `AudioContext` hanya di-`resume()` saat sentuhan pertama. Di sebagian iOS, konteks tetap senyap sampai ada buffer yang benar-benar diputar.

**Sekarang:** saat sentuhan pertama, aplikasi memutar buffer senyap 1 sampel untuk membuka audio, lalu `resume()` bila perlu. Bunyi tetap memerlukan satu sentuhan pengguna (kebijakan browser).

### 6. Input waktu terlalu kaku

**Dulu:** hanya menerima tepat 6 digit, dan formatter mengelompokkan dari kiri (`730` → `73:0`, tidak valid). Pengguna harus mengetik `073000`.

**Sekarang:**

- Formatter mengelompokkan dari kanan: `730` → `7:30`, `73000` → `7:30:00`, `073000` → `07:30:00`.
- Parser menerima `HH:MM`, `HH:MM:SS`, atau digit saja.
- Tombol **Sekarang** mengisi jam saat ini.

### 7. Validasi input lemah

**Dulu:** kecepatan hanya dicek > 0; delay negatif dicek, tetapi delay besar dan jarak awal > 99,99 km tetap diterima lalu memicu reset semua pada tick berikutnya.

**Sekarang:**

- Kecepatan 0–300 km/jam.
- Delay 0–1440 menit (input disaring hanya angka).
- Jarak awal `kecepatan × delay ÷ 60` harus < 99,99 km.
- Data lama dari `localStorage` dinormalisasi saat dimuat (status tidak dikenal, nilai negatif, `startAt` hilang).

### 8. Service worker: fallback salah dan bisa menggantung

**Dulu:** untuk setiap request yang gagal, service worker mengembalikan `index.html` — termasuk untuk `config.json` atau ikon. Selain itu tidak ada timeout, sehingga di jaringan lambat aplikasi bisa menunggu lama sebelum memakai cache.

**Sekarang:**

- Hanya respons 2xx yang disimpan ke cache.
- Fallback `index.html` hanya untuk navigasi.
- Timeout jaringan 4 detik, lalu pakai cache.
- Cache dinaikkan ke `constant-modul-v8`.

### 9. Tombol pasang di iOS tidak melakukan apa-apa

**Dulu:** `beforeinstallprompt` tidak pernah muncul di iOS, sehingga tombol tidak terlihat atau tidak bereaksi.

**Sekarang:** di iPhone/iPad, tombol **Cara pasang** muncul dan menampilkan petunjuk *Bagikan → Tambah ke Layar Utama*. Di browser lain tanpa prompt, muncul petunjuk menu browser.

### 10. Wake lock gagal tanpa pemberitahuan

**Dulu:** `wakeLock` yang tidak didukung atau ditolak hanya menghasilkan `wl=null`, tanpa pesan.

**Sekarang:** saat pengguna menyalakan **Layar nyala**, kegagalan diberitahukan dan disarankan mengatur waktu layar mati di pengaturan HP.

### 11. Aksesibilitas dan tampilan kecil

- `aria-pressed` pada tombol Suara/Layar, `aria-label` pada tombol sub (diperbarui saat jarak berubah), `role="status"` pada toast.
- Fokus keyboard terlihat (`:focus-visible`).
- `prefers-reduced-motion` mematikan animasi kilat.
- `color-scheme: dark` dan `font-size: 16px` pada textarea mencegah zoom otomatis iOS.
- `noscript` dan meta deskripsi ditambahkan.
- Tombol **Hentikan** menghentikan hitungan tanpa menghapus data; **Reset sub** tetap menghapus.

## Temuan yang belum diubah (perlu keputusan pemilik)

### A. `kodeKey` dapat dibaca siapa saja — RISIKO TINGGI

`config.json` ikut diunduh browser. Isinya memuat `kodeKey`, kunci HMAC untuk kode 16 karakter (termasuk kode percobaan). Siapa pun dapat:

1. membuka `config.json`,
2. membaca `kodeKey`,
3. membuat kode 16 karakter untuk ID perangkat apa pun, termasuk kode percobaan dengan tanggal jauh di masa depan.

Verifikasi lisensi penuh memakai ECDSA dan hanya membutuhkan `publicKey`, jadi **kode panjang tetap aman**. Namun jalur kode pendek/percobaan tidak aman secara kriptografis.

Saran:

- Gunakan **kode panjang ECDSA** untuk semua lisensi berbayar.
- Jika kode 16 karakter tetap dipakai, sadari bahwa itu hanya penghalang, bukan pengaman.
- Opsi yang lebih kuat: hapus jalur kode pendek, atau pindahkan verifikasi ke server (butuh internet).
- Jangan pernah mengunggah kunci privat pembuat kode.

### B. Tanggal percobaan di-hardcode ke 2026

`dStr()`/`expEnd()` memakai `new Date(2026,0,1 + N)`. Kode percobaan hanya bermakna untuk tanggal di sekitar 2026–2028. Jika aplikasi masih dipakai setelah itu, ganti tahun dasar atau simpan tanggal build di `config.json`.

### C. ID perangkat dan lisensi hanya di `localStorage`

Menghapus data situs, memakai mode privat, atau pembersihan otomatis browser akan menghilangkan ID perangkat. Lisensi menjadi tidak berlaku dan pengguna harus menghubungi admin lagi. Pertimbangkan:

- tombol **Ekspor/backup ID** dan **Impor ID**;
- catatan yang lebih menonjol di layar kunci (sudah ditambahkan satu baris);
- mekanisme pemulihan lisensi di sisi admin.

### D. Reset otomatis 99,99 km menghapus semua sub

Perilaku ini disengaja agar sama dengan modul Arduino. Dampaknya, seluruh data 10 sub hilang saat satu sub mencapai batas. Alternatif: hentikan sub aktif saja pada 99,99 km dan tampilkan peringatan, atau minta konfirmasi. Saat ini perilaku lama dipertahankan.

### E. Alarm saat aplikasi di latar belakang

Timer browser melambat saat aplikasi tidak terlihat. Wake lock membantu selama layar menyala, tetapi jika layar mati atau aplikasi benar-benar di latar belakang, alarm bisa terlambat. Opsi: izin Notification API + alarm berbasis `setTimeout` cadangan, atau tetap sarankan layar menyala.

### F. Belum ada ekspor/impor data sub

Data hanya tersimpan di satu perangkat. Untuk lomba dengan beberapa perangkat, ekspor JSON dan impor akan membantu. Belum diimplementasikan agar perubahan tetap fokus pada perbaikan.

### G. Proteksi percobaan bersifat lokal

`trueNow()` mencegah jam mundur, tetapi pengguna yang menghapus data akan kehilangan ID dan lisensi sekaligus. Tidak ada verifikasi server, jadi perlindungan offline selalu bisa diakali dengan mengubah JavaScript. Ini keterbatasan wajar aplikasi web offline; jangan mengandalkannya untuk perlindungan kuat.

## Pengujian yang dilakukan

Diuji di Chromium (desktop) melalui `http://localhost:8137`:

- Aktivasi memakai kode percobaan yang dibuat dari `config.json`.
- Mode delay: kecepatan 40 km/jam, delay 1 menit → jarak awal 0,667 km, jarak bertambah.
- Mode jadwal: sub standby, hitung mundur, aktif otomatis, alarm/kilat aktif.
- Tombol Hentikan: status menjadi *Selesai*, jarak berhenti, data tetap ada.
- Jam master +1 menit saat sub aktif: jarak bertambah sesuai `kecepatan ÷ 3600 × 60` (contoh 40 km/jam → +0,667 km).
- Jam master dimundurkan saat sub aktif: jarak tidak berkurang.
- Jam master +30 detik saat sub standby: `startAt` tidak bergeser, hitung mundur mengikuti jam baru.
- Jam mulai 7 jam lalu ditolak; 1 jam lalu memunculkan konfirmasi dan bisa dibatalkan.
- Validasi kecepatan 301, delay 1441, dan jarak awal 100 km.
- Format waktu `730`, `73000`, `073000`.
- Reset otomatis pada 99,99 km.
- Reload saat server dimatikan: aplikasi tetap terbuka dari cache service worker.
- Tidak ada error di console.

Belum diuji di perangkat Android/iOS fisik. Perilaku audio, getaran, wake lock, dan pemasangan PWA bisa berbeda tergantung browser/versi OS.

## Checklist sebelum mengunggah

- [ ] Ganti `index.html`, `sw.js`, dan `README.md` di repositori.
- [ ] Naikkan `CACHE` di `sw.js` jika file shell berubah (saat ini `constant-modul-v8`).
- [ ] Pastikan `config.json` tidak berisi kunci privat.
- [ ] Uji aktivasi dengan kode panjang dan kode percobaan.
- [ ] Uji di satu Android dan satu iPhone jika memungkinkan.
- [ ] Setelah deploy, buka aplikasi dua kali untuk memastikan service worker baru aktif.
