# TST Event Control

Aplikasi internal untuk mengelola event, inventaris alat ber-QR, pengiriman ke teknisi, dan pengembalian.
React + Vite + Firebase (Auth + Realtime Database + Cloud Functions). Web (PWA) dan APK Android (Capacitor).

## Alur kerja
1. **Admin** membuat event, menugaskan teknisi, mengisi kebutuhan alat (teks bebas, mis. `5 Delegate Mic`).
2. **Gudang** menyiapkan alat dengan scan QR, lalu **Kirim ke teknisi** (tercatat + PDF).
3. **Teknisi** cukup menekan *Alat lengkap diterima* (tanpa checklist), lalu *Kembalikan ke gudang*; boleh melapor alat rusak.
4. **Gudang** mengecek fisik dan **mencentang** alat yang kembali di daftar (tanpa scan; tandai *Rusak* + catatan bila perlu), lalu *Terima ke stok*. Semua kembali, event selesai.
5. **Admin** memantau lewat Dashboard dan Laporan; *Surat Jalan* siap cetak dari halaman event.

| | admin | warehouse | teknisi |
|---|:-:|:-:|:-:|
| Buat/ubah/hapus event, tugaskan teknisi | ✓ | | |
| Siapkan (scan), kirim, terima kembali (checklist) | ✓ | ✓ | |
| Inventaris, daftar unit, cetak QR | ✓ | ✓ | |
| Laporan, kelola pengguna, cadangan | ✓ | | |
| Lihat event, tekan terima/kembali, lapor alat | ✓ | ✓ | ✓ |

## Pemasangan (project Firebase milik perusahaan)
Gunakan project Firebase atas nama akun perusahaan (bukan akun pribadi), dengan paket **Blaze** (Cloud Functions mewajibkannya; pemakaian kecil biasanya tetap hampir gratis).

1. **Firebase Console** -> buat project. Aktifkan *Authentication -> Email/Password* dan *Realtime Database* (region Singapore).
2. **Web app**: Project settings -> Add web app -> salin config ke `src/firebaseConfig.js` (termasuk `databaseURL`).
3. **Aturan database**: tempel `database.rules.json` ke Realtime Database -> Rules -> Publish (atau `firebase deploy --only database`).
4. **Admin pertama** (sekali saja): Authentication -> Add user, lalu di Realtime Database tambahkan
   `users/<UID>` = `{ nama, email, role: "admin", aktif: true }` (aktif berupa boolean). Admin lain dan semua akun berikutnya dibuat dari menu **Pengguna**.
5. **Cloud Functions** (push notifikasi + kelola akun): `firebase deploy --only functions`. Bila database *bukan* di region Singapore/instance default, set env `DB_INSTANCE`.
6. **Hosting**: workflow `deploy.yml` memakai GitHub Pages (butuh repo Public atau akun berbayar). Untuk data internal lebih baik **Firebase Hosting** atau server kantor dengan domain perusahaan. Tambahkan domain itu di Authentication -> Settings -> Authorized domains.
7. **Batasi API key** di Google Cloud Console -> Credentials: HTTP referrer = domain aplikasi; untuk Android, package `id.tst.eventcontrol` + SHA-1.

### Secrets / variables GitHub (bila memakai workflow)
| Nama | Jenis | Dipakai untuk |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | secret | deploy functions + rules |
| `FIREBASE_PROJECT_ID` | variable | deploy functions + rules |
| `GOOGLE_SERVICES_JSON_B64` | secret | build APK (`base64 -w0 google-services.json`) |

Workflow **Build APK** hanya jalan manual (Actions -> Run workflow) dan menghasilkan APK *debug*. Untuk dibagikan ke karyawan, buat build *release* bertanda tangan (keystore disimpan di secret, jangan di repo).

## Pengembangan
```
npm install
npm run dev          # lokal
npm test             # unit test (parser kebutuhan, kalender, status)
npm run check:rules  # validasi database.rules.json
npm run build
```
Kamera/scan QR butuh HTTPS (atau `localhost`).

## Pemindai QR (cepat, dari SIS)
Semua scan (menyiapkan, cek unit, daftar unit) memakai `src/QrCamera.jsx`:
- Kamera dibuka langsung dan dibaca tiap frame video; hanya bingkai tengah (±70%) yang dibaca.
- Decoder berurutan: BarcodeDetector bawaan browser (Android/Chrome) -> ZXing WebAssembly (`barcode-detector`, untuk iPhone/Safari) -> `jsqr`.
- Fokus kontinu, ketuk layar untuk fokus ulang, zoom (cubit/tombol/slider), beep dua nada + getar.
- Mengenali QR, serta Code 128 / EAN-13 / Code 39 bila decoder mendukung.
- Catatan: ZXing WebAssembly diunduh dari CDN saat pertama dipakai di perangkat tanpa BarcodeDetector (iPhone). Perlu internet; bila gagal otomatis memakai jsQR.

## Operasional
- **Backup**: menu Pengguna -> *Unduh cadangan (JSON)*, lakukan rutin; aktifkan juga backup otomatis Realtime Database di Firebase.
- **Akun**: password awal dari admin wajib diganti saat login pertama (minimal 8 karakter). Pengguna dihapus lewat menu Pengguna (akun login ikut terhapus). Lupa password: tombol di layar login.
- **Gudang 2** (receiver, headset, laptop) dan daftar nama alat standar diatur di `src/presets.js`.

## Batasan yang diketahui
- Teknisi masih bisa *membaca* semua event dan unit (bukan hanya tugasnya); penulisan sudah dibatasi. Pembatasan baca per teknisi butuh perubahan struktur data.
- Notifikasi push hanya Android (APK). Di web, notifikasi muncul di dalam aplikasi.
- Kabel/barang tanpa QR dihitung manual oleh gudang.
- Test otomatis baru mencakup fungsi murni (pemindai kamera sendiri belum diuji di perangkat nyata: coba di HP Android dan iPhone); alur Firebase belum diuji dengan Firebase Emulator.
- Belum diuji build/jalan di lingkungan nyata: jalankan `npm install && npm test && npm run build` lebih dulu.
