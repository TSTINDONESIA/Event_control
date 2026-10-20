// Kebutuhan alat = teks bebas dari admin (events/<id>/kebutuhanTeks).
// Rekap "disiapkan": alat ber-QR dihitung otomatis per kategori; kabel tanpa barcode diisi manual gudang (events/<id>/tambahan).
import { list } from './util.js';

const kk = (s) => String(s || '').trim().toLowerCase();

// event lama masih punya kebutuhan terstruktur: tampilkan sebagai teks
export const permintaanText = (ev) => ev.kebutuhanTeks || list(ev.kebutuhan).map((k) => `${k.jumlah} ${k.kategori}`).join('\n');

export function rekap(units, tambahan) {
  const m = new Map();
  units.forEach((u) => {
    const nama = (u.kategori || '').trim() || 'Tanpa kategori';
    const r = m.get(kk(nama)) || { key: 'q' + kk(nama), nama, jumlah: 0, manual: false };
    r.jumlah++; m.set(kk(nama), r);
  });
  const out = [...m.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  (tambahan || []).forEach((t) => out.push({ key: 't' + t.id, id: t.id, nama: t.nama, jumlah: t.jumlah || 0, manual: true }));
  return out;
}
