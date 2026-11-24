# Perubahan v2.0.0 (persiapan pemakaian kantor)

**Repo**: hapus ±30 file mati/duplikat (folder `interpreter/`, halaman lama, salinan config di `src/pages/`, `SuratJalan.jsx` root, `google-services.json`). `package.json` dilengkapi (react-router-dom, Capacitor). README ditulis ulang.
**Bug**: Surat Jalan kini membaca `kebutuhanTeks` (event baru), bukan hanya format lama.
**Keamanan**: rules diperketat (notifikasi/transaksi/audit tidak bisa ditulis sembarang akun, teknisi tidak bisa menulis `assets`, laporan kerusakan hanya dibaca staf, node fitur lama dihapus, validasi tipe/panjang). Akun dibuat/dihapus lewat Cloud Function (akun login ikut terhapus). Password awal tidak lagi terlihat; minimal 8 karakter. Tombol *Reset semua data* diganti *Unduh cadangan*. Config Firebase pribadi dihapus; `google-services.json` dari secret.
**Fitur**: Lupa password di layar login. Nama instance database di Functions tidak lagi tertanam.
**Kualitas**: CI (rules + test + build), 9 unit test, build APK hanya manual.
