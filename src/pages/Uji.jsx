import { useState } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, audit } from '../util.js';

const DALAM_ALUR = ['dialokasikan', 'disiapkan', 'keluar', 'diterima', 'digunakan', 'menunggu_kembali'];
const SEMUA = ['assets', 'assetBookings', 'checklist', 'events', 'serahTerima', 'bulk', 'bulkEvent', 'transactions', 'audit', 'laporanRusak', 'kategori'];
const GRUP = [
  { judul: 'Semua event & jadwal', ket: 'Event, alokasi, checklist, serah terima, dan jumlah per event. Unit yang sedang dalam alur dikembalikan ke Tersedia.', nodes: ['events', 'assetBookings', 'checklist', 'serahTerima', 'bulkEvent'], resetUnit: true },
  { judul: 'Semua riwayat transaksi, audit & laporan kerusakan', ket: 'Log saja. Unit dan event tidak berubah.', nodes: ['transactions', 'audit', 'laporanRusak'] },
  { judul: 'Semua unit (aset)', ket: 'Seluruh unit beserta alokasi dan checklist-nya.', nodes: ['assets', 'assetBookings', 'checklist'] },
  { judul: 'Semua barang jumlah', ket: 'Stok barang jumlah beserta alokasinya per event.', nodes: ['bulk', 'bulkEvent'] },
  { judul: 'RESET TOTAL data uji', ket: 'Semua data di atas sekaligus. Akun pengguna dan kategori tetap ada.', nodes: ['events', 'assetBookings', 'checklist', 'serahTerima', 'bulkEvent', 'bulk', 'assets', 'transactions', 'audit', 'laporanRusak'], total: true },
];
const n = (v) => Object.keys(v || {}).length;

export default function Uji() {
  const { profile } = useAuth();
  const [txt, setTxt] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const c = { Event: useVal('events'), Unit: useVal('assets'), Transaksi: useVal('transactions'), Audit: useVal('audit'), 'Lap. rusak': useVal('laporanRusak'), 'Barang jumlah': useVal('bulk') };

  async function cadangan() {
    setBusy(true); setMsg('');
    try {
      const out = {};
      for (const k of SEMUA) out[k] = (await get(ref(db, k))).val();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
      a.download = `cadangan-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
      setMsg('Cadangan diunduh.');
    } catch (e) { setMsg('Gagal: ' + e.message); }
    setBusy(false);
  }
  async function hapus(g) {
    if (txt !== 'HAPUS') return;
    if (!confirm(`Hapus PERMANEN: ${g.judul}? Tidak bisa dibatalkan.`)) return;
    setBusy(true); setMsg('');
    try {
      const up = {};
      g.nodes.forEach((k) => { up[k] = null; });
      if (g.resetUnit) {
        const s = (await get(ref(db, 'assets'))).val() || {};
        Object.entries(s).forEach(([id, a]) => {
          if (DALAM_ALUR.includes(a.status)) { up[`assets/${id}/status`] = 'tersedia'; up[`assets/${id}/eventId`] = null; }
        });
      }
      await update(ref(db), up);
      audit(profile.uid, 'reset_data', g.judul).catch(() => {});
      setMsg(`Selesai: ${g.judul} dihapus.`); setTxt('');
    } catch (e) { setMsg('Gagal: ' + e.message); }
    setBusy(false);
  }
  return (
    <>
      <div className="card flag">
        <b>Mode uji coba.</b> Halaman ini hanya untuk akun kontrol utama. Penghapusan bersifat permanen dan tidak ada tombol undo, jadi unduh cadangan dulu.
      </div>
      <div className="grid">
        {Object.entries(c).map(([k, v]) => <div className="card" key={k}><small>{k}</small><div style={{ fontSize: 28, fontWeight: 800 }}>{v === undefined ? '…' : n(v)}</div></div>)}
      </div>
      <p><button className="dark" disabled={busy} onClick={cadangan}>Unduh cadangan semua data (JSON)</button></p>
      <div className="card row">
        <label>Ketik <b>HAPUS</b> untuk membuka tombol hapus: <input value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="HAPUS" /></label>
      </div>
      {msg && <p role="alert">{msg}</p>}
      {GRUP.map((g) => (
        <div className="card" key={g.judul}>
          <b>{g.judul}</b><p><small>{g.ket}</small></p>
          <button className={g.total ? 'danger' : 'ghost'} disabled={busy || txt !== 'HAPUS'} onClick={() => hapus(g)}>Hapus</button>
        </div>
      ))}
    </>
  );
}
