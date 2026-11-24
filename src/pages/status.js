// Status unit. Alur: tersedia -> disiapkan -> keluar (dikirim ke teknisi) -> tersedia / servis
export const STATUS = {
  tersedia:  { label: 'Tersedia',         desc: 'Di gudang, siap dipakai' },
  disiapkan: { label: 'Siap kirim',       desc: 'Sudah di-scan gudang untuk event' },
  keluar:    { label: 'Di teknisi',       desc: 'Sudah dikirim ke teknisi' },
  servis:    { label: 'Servis / rusak',   desc: 'Rusak atau dalam servis' },
  hilang:    { label: 'Hilang',           desc: 'Tidak ditemukan' },
  pensiun:   { label: 'Tidak digunakan',  desc: 'Dipensiunkan' },
};
export const STATUS_LIST = Object.keys(STATUS);
// data lama dari versi 8 langkah dipetakan ke status baru
const LEGACY = { rusak: 'servis', dialokasikan: 'tersedia', diterima: 'keluar', digunakan: 'keluar', menunggu_kembali: 'keluar' };
export const norm = (s) => LEGACY[s] || s;

export const TIPE = {
  siapkan: 'Disiapkan', batal: 'Batal siap', keluar: 'Dikirim ke teknisi', masuk: 'Kembali ke gudang',
  rusak: 'Ditandai rusak', pulih: 'Tersedia lagi', hilang: 'Ditandai hilang',
};

// tahap event
// rencana  : admin buat event, gudang menyiapkan alat (scan QR)
// siap     : gudang menekan "Sudah disiapkan" (penyiapan dikunci)
// dikirim  : gudang menekan "PDF Kirim ke teknisi"; teknisi hanya melihat, gudang menerima barang kembali (scan / centang)
// diterima, kembali : tahap lama (data lama), diperlakukan sama seperti dikirim
// selesai  : semua barang kembali diterima gudang, unit masuk stok
export const TAHAP = {
  rencana:  { label: 'Gudang menyiapkan',        cls: 'dialokasikan' },
  siap:     { label: 'Sudah disiapkan',          cls: 'disiapkan' },
  dikirim:  { label: 'Di teknisi (belum kembali)',  cls: 'keluar' },
  diterima: { label: 'Diterima teknisi',         cls: 'digunakan' },
  kembali:  { label: 'Dikembalikan, tunggu dicek gudang', cls: 'menunggu_kembali' },
  selesai:  { label: 'Selesai',                  cls: 'tersedia' },
};
