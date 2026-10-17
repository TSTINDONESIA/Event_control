import { Link } from 'react-router-dom';
import { useVal, list, fmt } from '../util.js';
import { STATUS, STATUS_LIST, norm } from './status.js';
import { toCSV, download } from '../csv.js';

export default function Report() {
  const assets = useVal('assets');
  const tx = useVal('transactions');
  const events = useVal('events');
  const dmg = useVal('laporanRusak');
  if (assets === undefined) return <p>Memuat…</p>;
  const a = list(assets);
  const cats = [...new Set(a.map((x) => x.kategori || '(tanpa kategori)'))].sort();
  const cnt = (c, s) => a.filter((x) => (x.kategori || '(tanpa kategori)') === c && (!s || norm(x.status) === s)).length;
  const t = list(tx).sort((x, y) => y.waktu - x.waktu);
  const exportTx = () => download('transaksi.csv', toCSV(
    t.map((r) => ({ ...r, waktu: new Date(r.waktu).toISOString(), event: events?.[r.eventId]?.nama || r.eventId || '' })),
    ['waktu', 'tipe', 'kode', 'petugasNama', 'kondisi', 'event']));
  return (
    <>
      <h2>Stok per kategori</h2>
      <div className="tbl"><table><thead><tr><th>Kategori</th><th>Total</th>{STATUS_LIST.map((s) => <th key={s}>{STATUS[s].label}</th>)}</tr></thead>
        <tbody>{cats.map((c) => <tr key={c}><td>{c}</td><td>{cnt(c)}</td>{STATUS_LIST.map((s) => <td key={s}>{cnt(c, s)}</td>)}</tr>)}</tbody></table></div>
      <div className="row" style={{ margin: '14px 0' }}>
        <button className="dark" onClick={() => download('aset.csv', toCSV(a, ['kode', 'nama', 'kategori', 'status']))}>Ekspor aset CSV</button>
        <button className="dark" onClick={exportTx}>Ekspor transaksi CSV</button>
      </div>
      <h2>Laporan kerusakan terbaru</h2>
      {list(dmg).length === 0 ? <p>Belum ada.</p> : (
        <div className="tbl"><table><thead><tr><th>Waktu</th><th>Unit</th><th>Pelapor</th><th>Catatan</th></tr></thead>
          <tbody>{list(dmg).sort((x, y) => y.waktu - x.waktu).slice(0, 50).map((r) => (
            <tr key={r.id}><td>{fmt(r.waktu)}</td><td><Link to={'/aset/' + r.assetId}>{r.kode}</Link></td><td>{r.nama}</td><td>{r.catatan}</td></tr>
          ))}</tbody></table></div>
      )}
    </>
  );
}
