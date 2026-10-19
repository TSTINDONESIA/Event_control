# TST EVENT CONTROL

React + Vite + Firebase (Auth + Realtime Database), dideploy ke GitHub Pages.

## Alur (disederhanakan)

1. **Admin** buat event, tugaskan teknisi, isi kebutuhan alat (kategori + jumlah).
2. **Gudang** buka tugas → **Siapkan** → scan QR tiap alat (status "Siap kirim").
3. **Gudang** klik **Kirim ke teknisi** → alat berstatus "Di teknisi", pengiriman tercatat.
4. **Admin** melihat semuanya di menu **Laporan** (siapa kirim, kapan, ke teknisi siapa, unit apa, kerusakan, stok).
5. Setelah event, **Gudang** klik **Terima kembali** → scan QR (centang "rusak" bila rusak). Semua kembali → event otomatis selesai.

Teknisi hanya melihat tugasnya (tanpa langkah konfirmasi).

## Hak akses
| | admin | warehouse | teknisi |
|---|---|---|---|
| Buat/edit/hapus event, tugaskan teknisi, kebutuhan | ✓ | | |
| Siapkan, kirim, terima kembali (scan) | ✓ | ✓ | |
| Inventaris, daftar unit, label QR | ✓ | ✓ | |
| Laporan, kelola pengguna | ✓ | | |
| Lihat tugasnya | ✓ | ✓ | ✓ |

## Setup
1. Firebase Console → proyek (Spark/gratis) → Authentication → aktifkan **Email/Password**.
2. Realtime Database → buat database → isi `src/firebaseConfig.js` (termasuk `databaseURL` sesuai region).
3. Tab Rules → tempel `database.rules.json` → Publish.
4. Authorized domains → tambahkan `USERNAME.github.io`.
5. Akun admin pertama: buat user di Authentication, lalu tambahkan `users/<UID>` = `nama`, `email`, `role: "admin"`, `aktif: true` (boolean). Akun lain dibuat dari menu Pengguna.
6. GitHub: Settings → Pages → Source **GitHub Actions**; push ke `main`.

Jalankan lokal: `npm install` lalu `npm run dev`. Kamera HP butuh HTTPS (GitHub Pages sudah HTTPS). Cetak label QR setelah deploy, bukan saat localhost.

**WAJIB setelah update:** publish ulang aturan database (`firebase deploy --only database` atau tempel `database.rules.json` di Console). Aturan lama masih mengizinkan teknisi menulis; aturan baru menutupnya.

Data lama aman: status lama (dialokasikan, diterima, digunakan, menunggu_kembali) otomatis dibaca sebagai Tersedia / Di teknisi.

## Dihapus dari versi sebelumnya
Alokasi unit per tanggal + cek bentrok, 8 langkah status, konfirmasi terima/setup teknisi, checklist, serah terima massal, surat jalan PDF, barang jumlah, laporan kerusakan manual, halaman Kategori, Riwayat/Audit terpisah (sekarang di Laporan), Dashboard, mode Kontrol utama (Surat Jalan dikembalikan dalam format form TST, siap cetak).
