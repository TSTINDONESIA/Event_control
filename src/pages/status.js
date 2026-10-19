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
export const TAHAP = {
  rencana: { label: 'Belum disiapkan', cls: 'dialokasikan' },
  siap:    { label: 'Sedang disiapkan', cls: 'disiapkan' },
  dikirim: { label: 'Sudah dikirim', cls: 'keluar' },
  selesai: { label: 'Selesai', cls: 'tersedia' },
};
