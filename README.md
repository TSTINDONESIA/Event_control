# TST EVENT CONTROL (base v0.1)

React + Vite + Firebase (Auth + Realtime Database), deploy ke GitHub Pages.
Status: **kerangka awal, belum diuji online.** Anda perlu mengisi config Firebase sendiri.

## Sudah ada
Login/logout, dashboard status stok, event, inventory + QR per unit, cetak label satu unit,
scan QR kamera + input manual, alokasi dengan cek bentrok tanggal (transaksi atomik),
keluar/masuk dengan konfirmasi, transaksi & audit log (hanya bisa dibuat, tidak bisa diubah).

## Belum ada (tahap berikutnya)
Halaman Laporan, Audit log viewer, manajemen pengguna & kategori, penugasan teknisi +
checklist/laporan kerusakan oleh teknisi, cetak QR massal, impor/ekspor CSV.

## Setup
1. https://console.firebase.google.com → buat proyek (paket Spark/gratis).
2. Build → Authentication → Get started → aktifkan **Email/Password**.
3. Build → Realtime Database → Create database → mode **locked**.
4. Project settings → Your apps → tambah **Web app** → salin config ke `src/firebaseConfig.js`.
5. Realtime Database → tab **Rules** → tempel isi `database.rules.json` → Publish.
6. Authentication → Authorized domains → tambahkan `USERNAME.github.io`.

## Akun admin pertama (aman)
1. Authentication → Users → Add user (email + password). Salin **User UID**.
2. Realtime Database → tambah node `users/<UID>` berisi:
   `nama: "Nama Anda"`, `email: "..."`, `role: "admin"`, `aktif: true`.
3. Hanya admin yang bisa menulis `users/*` (diatur Rules), jadi tidak ada cara naik role dari aplikasi.
4. Untuk karyawan lain: ulangi langkah yang sama dengan role `warehouse` atau `teknisi`.

## Jalankan lokal
`npm install` lalu `npm run dev`. Kamera HP butuh HTTPS (GitHub Pages sudah HTTPS).

## Deploy GitHub Pages
1. Unggah semua file ke repo GitHub (branch `main`).
2. Settings → Pages → Source: **GitHub Actions**.
3. Push ke `main`; workflow `deploy.yml` membangun dan menerbitkan.
4. Alamat: `https://USERNAME.github.io/NAMA-REPO/`. URL QR otomatis memakai alamat ini,
   jadi **cetak label QR setelah deploy**, bukan saat `localhost`.

## Uji fungsional
- Login: akun benar masuk; password salah ditolak; user tanpa node `users/<uid>` ditolak.
- Scan: buka alamat deploy di HP → Scan QR → izinkan kamera → arahkan ke label. Tolak izin → harus muncul pesan + input manual.
- Keluar-masuk: unit `tersedia` → Keluarkan (pilih event) → status `keluar` → Terima kembali (baik) → `tersedia`. Klik dua kali cepat: hanya satu transaksi tercatat.
- Bentrok: buat 2 event dengan tanggal beririsan, alokasikan aset yang sama ke keduanya → event kedua harus ditolak.

## Uji keamanan sebelum operasional
- Login sebagai teknisi: coba ubah `users/<uid>/role` lewat console browser → harus ditolak.
- Teknisi tidak boleh menulis `assets`, `events`, `transactions`.
- Edit/hapus data di `transactions` dan `audit` harus ditolak untuk semua role (kecuali lewat Console).
- Tanpa login, baca/tulis semua node harus ditolak (Rules Playground).
- Akun `aktif:false` tidak bisa membaca data.
- Pastikan tidak ada service account/private key di repo.

## Batasan yang perlu Anda tahu
- Security Rules tidak bisa memvalidasi bentrok tanggal; pengecekan ada di transaksi klien.
  Pengguna warehouse yang berniat curang bisa menulis langsung ke database. Untuk jaminan penuh dibutuhkan backend tepercaya.
- Update status aset dan pencatatan transaksi adalah dua langkah; jika koneksi putus di antaranya, status berubah tanpa catatan transaksi.
- Semua pengguna aktif bisa membaca semua event (belum dibatasi per teknisi).
