import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useVal, list } from '../util.js';
import { Badge, Loading } from '../components.jsx';
import { norm } from './status.js';
import { gudangOf } from '../presets.js';
import { stokPdf, savePdf } from '../pdf.js';

const CSS = `
.st-tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}
.st-tile{background:var(--g-panel);border:1px solid var(--line);border-radius:var(--r-lg);padding:14px 16px;position:relative;box-shadow:var(--shadow);transition:transform var(--t) var(--ease)}
.st-tile:hover{transform:translateY(-3px)}
.st-tile::after{content:"";position:absolute;left:14%;right:14%;bottom:-1px;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}
.st-tile b{display:block;font-size:32px;line-height:1;color:#fff;font-weight:800}
.st-tile span{font-size:12px;font-weight:600;color:var(--text-mute)}
.st-card{border:1px solid var(--line);border-radius:var(--r-lg);margin-bottom:12px;background:var(--g-panel);overflow:hidden;transition:border-color var(--t)}
.st-card:hover,.st-card[open]{border-color:var(--line-strong)}
.st-card summary{list-style:none;cursor:pointer;padding:14px}
.st-card summary::-webkit-details-marker{display:none}
.st-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:10px}
.st-head b{font-size:17px;font-weight:800}
.st-head small{color:var(--text-mute);white-space:nowrap}
.st-head small::after{content:" ▾"}
.st-card[open] .st-head small::after{content:" ▴"}
.st-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;text-align:center}
.st-grid div{border:1px solid var(--line);border-radius:10px;padding:7px 2px;background:rgba(255,255,255,.03)}
.st-grid b{display:block;font-size:21px;line-height:1.1;font-weight:800}
.st-grid span{font-size:10px;font-weight:600;color:var(--text-mute)}
.st-grid .ok{background:rgba(46,229,157,.1);border-color:rgba(46,229,157,.3)}.st-grid .out{background:rgba(255,198,41,.1);border-color:rgba(255,198,41,.35)}.st-grid .bad{background:rgba(255,93,108,.1);border-color:rgba(255,93,108,.35)}
.st-units{border-top:1px solid var(--line);padding:4px 14px 8px}
.st-u{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px}
.st-u:last-child{border-bottom:0}
.st-u small{display:block}
@media (min-width:721px){.st-tiles{grid-template-columns:repeat(4,1fr)}}
`;

// Stok gudang: jumlah unit per kategori alat (stand by, siap kirim, keluar, rusak, hilang)
export default function Stok() {
  const assets = useVal('assets');
  const events = useVal('events');
  const [q, setQ] = useState('');
  const [gf, setGf] = useState('0');
  if (assets === undefined) return <Loading />;

  // unit "Tidak digunakan" (pensiun) tidak dihitung
  const all = list(assets).map((a) => ({ ...a, status: norm(a.status) })).filter((a) => a.status !== 'pensiun');
  const g = {};
  all.forEach((a) => {
    const nama = (a.kategori || '').trim() || 'Tanpa kategori';
    const r = g[nama] || (g[nama] = { nama, total: 0, tersedia: 0, disiapkan: 0, keluar: 0, servis: 0, hilang: 0, units: [] });
    r.total++; r[a.status] = (r[a.status] || 0) + 1; r.units.push(a);
  });
  const rows = Object.values(g).sort((a, b) => a.nama.localeCompare(b.nama));
  const shown = rows.filter((r) => r.nama.toLowerCase().includes(q.toLowerCase()) && (gf === '0' || gudangOf(r.nama) === Number(gf)));
  const sum = (k) => rows.reduce((n, r) => n + (r[k] || 0), 0);
  const tgl = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <style>{CSS}</style>
      <div className="st-tiles">
        <div className="st-tile"><b>{sum('total')}</b><span>Total unit</span></div>
        <div className="st-tile"><b>{sum('tersedia')}</b><span>Stand by</span></div>
        <div className="st-tile"><b>{sum('keluar') + sum('disiapkan')}</b><span>Keluar / disiapkan</span></div>
        <div className="st-tile"><b>{sum('servis')}</b><span>Rusak</span></div>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input style={{ flex: 1, minWidth: 180 }} aria-label="Cari alat" placeholder="Cari alat (mis. Receiver)" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Gudang" value={gf} onChange={(e) => setGf(e.target.value)}>
          <option value="0">Semua gudang</option><option value="1">Gudang 1</option><option value="2">Gudang 2</option>
        </select>
        <button onClick={() => savePdf(stokPdf(rows, tgl), 'Stok-Gudang.pdf')}>Download PDF</button>
      </div>
      {rows.length === 0 ? <p className="empty">Belum ada unit. Tambah unit di menu Inventaris.</p> : shown.length === 0 ? <p className="empty">Alat tidak ditemukan.</p> : shown.map((r) => (
        <details className="st-card" key={r.nama}>
          <summary>
            <div className="st-head"><b>{r.nama}</b><small>Total {r.total}</small></div>
            <div className="st-grid">
              <div className="ok"><b>{r.tersedia}</b><span>Stand by</span></div>
              <div><b>{r.disiapkan}</b><span>Siap kirim</span></div>
              <div className="out"><b>{r.keluar}</b><span>Keluar</span></div>
              <div className="bad"><b>{r.servis}</b><span>Rusak</span></div>
              <div><b>{r.hilang}</b><span>Hilang</span></div>
            </div>
          </summary>
          <div className="st-units">
            {r.units.sort((a, b) => (a.kode || '').localeCompare(b.kode || '')).map((u) => (
              <div className="st-u" key={u.id}>
                <span><Link to={'/aset/' + u.id}><b>{u.kode}</b></Link>{u.nama && <small>{u.nama}{u.eventId && events?.[u.eventId] ? ' · ' + events[u.eventId].nama : ''}</small>}</span>
                <Badge s={u.status} />
              </div>
            ))}
          </div>
        </details>
      ))}
    </>
  );
}
