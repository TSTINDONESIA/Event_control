// Status unit sesuai alur TST Event Control.
// Kunci disimpan di database (Bahasa Indonesia); `en` hanya label teknis.
export const STATUS = {
  tersedia:         { label: 'Tersedia',          en: 'AVAILABLE',       desc: 'Di gudang, siap dialokasikan' },
  dialokasikan:     { label: 'Dialokasikan',      en: 'RESERVED',        desc: 'Dialokasikan ke event' },
  disiapkan:        { label: 'Disiapkan',         en: 'PREPARING',       desc: 'Sedang disiapkan gudang' },
  keluar:           { label: 'Sudah keluar',      en: 'DISPATCHED',      desc: 'Sudah keluar gudang' },
  diterima:         { label: 'Diterima teknisi',  en: 'WITH_TECHNICIAN', desc: 'Dipegang teknisi, setup berjalan' },
  digunakan:        { label: 'Sedang digunakan',  en: 'IN_USE',          desc: 'Dipakai selama event' },
  menunggu_kembali: { label: 'Menunggu kembali',  en: 'RETURN_PENDING',  desc: 'Dikembalikan, belum dicek gudang' },
  servis:           { label: 'Servis / rusak',    en: 'MAINTENANCE',     desc: 'Dalam servis atau rusak' },
  hilang:           { label: 'Hilang',            en: 'MISSING',         desc: 'Tidak ditemukan' },
  pensiun:          { label: 'Tidak digunakan',   en: 'RETIRED',         desc: 'Dipensiunkan' },
};
export const STATUS_LIST = Object.keys(STATUS);
// data lama memakai "rusak"; di alur baru digabung ke "servis / rusak"
export const norm = (s) => (s === 'rusak' ? 'servis' : s);

// Tahap lapangan: unit berada di tangan gudang / lapangan
export const OUT = ['keluar', 'diterima', 'digunakan'];            // belum kembali
export const IN_EVENT = ['disiapkan', 'keluar', 'diterima', 'digunakan', 'menunggu_kembali'];
export const FREE = ['tersedia', 'dialokasikan'];                   // boleh dialokasikan

// 8 langkah proses (sama dengan diagram "Alur Proses Sistem")
export const STEPS = [
  { n: 1, t: 'Perencanaan event' },
  { n: 2, t: 'Cek & alokasi stok' },
  { n: 3, t: 'Persiapan gudang' },
  { n: 4, t: 'Pengeluaran barang' },
  { n: 5, t: 'Terima & setup' },
  { n: 6, t: 'Penggunaan event' },
  { n: 7, t: 'Pengembalian' },
  { n: 8, t: 'Penerimaan gudang' },
];
// langkah yang sedang aktif untuk tiap status (0 = belum masuk alur)
export const ACTIVE_STEP = { tersedia: 0, dialokasikan: 3, disiapkan: 3, keluar: 5, diterima: 5, digunakan: 6, menunggu_kembali: 8 };

export const TIPE = {
  siapkan: 'Persiapan', keluar: 'Pengeluaran', terima: 'Diterima teknisi', setup: 'Setup selesai',
  kembali: 'Dikembalikan teknisi', masuk: 'Diterima gudang', rusak: 'Ditandai rusak', servis: 'Servis',
  pulih: 'Dipulihkan', hilang: 'Ditandai hilang', pensiun: 'Dipensiunkan', aktif: 'Diaktifkan kembali',
};
