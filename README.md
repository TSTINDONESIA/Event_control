# TST EVENT CONTROL v1.0

React + Vite + Firebase (Auth + Realtime Database), dideploy ke GitHub Pages.

## Fitur
- Login/logout, 3 role: **admin**, **warehouse** (gudang), **teknisi**.
- Dashboard: stok per status, event mendatang, unit terlambat kembali.
- Event: tambah, edit (alokasi ikut menyesuaikan, dicek bentrok), hapus; penugasan teknisi.
- Inventaris: unit dengan QR, kategori, impor/ekspor CSV, edit data, hapus (admin).
- Scan QR kamera + input manual; alokasi dengan cek bentrok tanggal (transaksi atomik).
- Keluar/masuk dengan konfirmasi; status rusak/servis/tersedia; transaksi & audit log tidak bisa diubah.
- Teknisi: menu Tugas dengan checklist per event, laporan kerusakan per unit.
- Laporan stok per kategori + ekspor CSV; cetak label QR satu/massal.
- Pengguna (admin): buat akun, ubah role/aktif/email, kirim reset password.

## Hak akses
| | admin | warehouse | teknisi |
|---|---|---|---|
| Lihat dashboard/event/inventaris | ✓ | ✓ | ✓ |
| Tambah/edit/hapus event, tugaskan teknisi | ✓ | | |
| Alokasi, keluar/masuk, tambah/edit unit, kategori | ✓ | ✓ | |
| Riwayat, laporan, scan, label | ✓ | ✓ | |
| Hapus aset, kelola pengguna, audit log | ✓ | | |
| Checklist tugas, laporan kerusakan | ✓ | | ✓ (event yang ditugaskan) |

## Setup
1. Firebase Console → proyek (Spark/gratis) → Authentication → aktifkan **Email/Password**.
2. Realtime Database → buat database → isi `src/firebaseConfig.js` (termasuk `databaseURL` sesuai region).
3. Tab Rules → tempel `database.rules.json` → Publish.
4. Authorized domains → tambahkan `USERNAME.github.io`.
5. Akun admin pertama: buat user di Authentication, lalu tambahkan `users/<UID>` = `nama`, `email`, `role: "admin"`, `aktif: true` (boolean). Akun lain dibuat dari menu Pengguna.
6. GitHub: Settings → Pages → Source **GitHub Actions**; push ke `main`.

Jalankan lokal: `npm install` lalu `npm run dev`. Kamera HP butuh HTTPS (GitHub Pages sudah HTTPS). Cetak label QR setelah deploy, bukan saat localhost.

## Uji sebelum operasional
- Login: password salah ditolak; user tanpa `users/<uid>` atau `aktif:false` ditolak.
- Bentrok: dua event tanggal beririsan, aset sama dialokasikan ke keduanya → kedua ditolak; edit tanggal event yang membuat bentrok → ditolak.
- Keluar-masuk: tersedia → Keluarkan → keluar → Terima kembali → tersedia; klik ganda hanya satu transaksi.
- Teknisi: tidak ada tombol aksi stok; tidak bisa ubah `users/*/role` lewat console browser.
- Tanpa login, baca/tulis semua node ditolak (Rules Playground).
- Pastikan tidak ada service account/private key di repo.

## Batasan yang perlu diketahui
- Cek bentrok tanggal dilakukan di klien; pengguna gudang yang sengaja curang bisa menulis langsung ke database. Jaminan penuh butuh backend tepercaya.
- Status aset dan catatan transaksi adalah dua penulisan; bila pencatatan gagal setelah 3 percobaan, status otomatis dikembalikan.
- Semua pengguna aktif bisa membaca semua event (belum dibatasi per teknisi).
- Akun lama tidak dihapus dari Authentication saat dinonaktifkan; nonaktifkan lewat menu Pengguna.
