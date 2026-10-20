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

// tahap event (alur 5 langkah)
// rencana  : admin buat event, gudang menyiapkan alat (scan QR)
// siap     : gudang menekan "Sudah disiapkan" (penyiapan dikunci)
// dikirim  : gudang menekan "PDF Kirim ke teknisi"
// diterima : teknisi menekan "Alat lengkap diterima"
// kembali  : teknisi menekan "Kembalikan ke gudang" (menunggu gudang scan)
// selesai  : gudang selesai scan barang kembali, unit masuk stok
export const TAHAP = {
  rencana:  { label: 'Gudang menyiapkan',        cls: 'dialokasikan' },
  siap:     { label: 'Sudah disiapkan',          cls: 'disiapkan' },
  dikirim:  { label: 'Dikirim, tunggu teknisi',  cls: 'keluar' },
  diterima: { label: 'Diterima teknisi',         cls: 'digunakan' },
  kembali:  { label: 'Dikembalikan, tunggu scan', cls: 'menunggu_kembali' },
  selesai:  { label: 'Selesai',                  cls: 'tersedia' },
};
