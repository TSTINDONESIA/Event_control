// Ubah teks kebutuhan alat (events/<id>/kebutuhanTeks, ditulis admin) menjadi baris tabel.
// Contoh baris yang dikenali: "5 Delegate Mic", "5x Delegate Mic", "Delegate Mic x5", "- 2 Booth", "1. Mixer".
// Baris tanpa angka -> jumlah null (tetap ditampilkan, kolom jumlah dikosongkan).
export function parseKebutuhan(text) {
  return String(text || '').split(/\r?\n/).map((raw) => {
    let s = raw.trim().replace(/^[-•*]\s+/, '').replace(/^\d+[.)]\s+/, '').trim();
    if (!s) return null;
    let m = s.match(/^(\d+)\s*[xX×]?\s+(.+)$/);
    if (m) return { kategori: m[2].trim(), jumlah: Number(m[1]) };
    m = s.match(/^(.+?)\s*[xX×]\s*(\d+)$/);
    if (m) return { kategori: m[1].trim(), jumlah: Number(m[2]) };
    return { kategori: s, jumlah: null };
  }).filter(Boolean);
}
