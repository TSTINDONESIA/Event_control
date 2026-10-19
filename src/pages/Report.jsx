import { Link } from 'react-router-dom';
import { useVal, list, fmt, range } from '../util.js';
import { STATUS, STATUS_LIST, TAHAP, TIPE, norm } from './status.js';
import { toCSV, download } from '../csv.js';
import { Loading } from '../components.jsx';

// Laporan admin: pengiriman ke teknisi per event, kerusakan, stok, dan riwayat.
export default function Report() {
  const assets = useVal('assets');
  const events = useVal('events');
  const serah = useVal('serahTerima');
  const tx = useVal('transactions');
  const dmg = useVal('laporanRusak');
  if (assets === undefined || events === undefined || serah === undefined) return <Loading />;
  const a = list(assets);
  const cats = [...new Set(a.map((x) => x.kategori || '(tanpa kategori)'))].sort();
  const cnt = (c, s) => a.filter((x) => (x.kategori || '(tanpa kategori)') === c && (!s || norm(x.status) === s)).length;
  const kirimRows = Object.entries(serah || {}).flatMap(([eid, recs]) => list(recs).filter((r) => r.tipe === 'keluar').map((r) => ({ ...r, eid })))
    .sort((x, y) => y.waktu - x.waktu);
  const t = list(tx).sort((x, y) => y.waktu - x.waktu);
  const exportTx = () => download('transaksi.csv', toCSV(
    t.map((r) => ({ ...r, waktu: new Date(r.waktu).toISOString(), event: events?.[r.eventId]?.nama || r.eventId || '' })),
    ['waktu', 'tipe', 'kode', 'petugasNama', 'kondisi', 'event']));
  const exportKirim = () => download('pengiriman.csv', toCSV(
    kirimRows.flatMap((r) => Object.values(r.units || {}).map((u) => ({
      waktu: new Date(r.waktu).toISOString(), event: events?.[r.eid]?.nama || r.eid, gudang: r.nama,
      teknisi: Object.values(r.teknisi || {}).join(', '), kode: u.kode, nama: u.nama, kategori: u.kategori }))),
    ['waktu', 'event', 'gudang', 'teknisi', 'kode', 'nama', 'kategori']));
  return (
    <>
      <h2>Pengiriman ke teknisi</h2>
      {kirimRows.length === 0 ? <p className="empty">Belum ada pengiriman.</p> : (
        <div className="tbl"><table><thead><tr><th>Waktu kirim</th><th>Event</th><th>Dikirim oleh (gudang)</th><th>Teknisi</th><th>Unit</th><th>Status event</th></tr></thead>
          <tbody>{kirimRows.map((r) => {
            const ev = events?.[r.eid];
            const tt = TAHAP[ev?.tahap || 'rencana'] || TAHAP.rencana;
            return (
              <tr key={r.id}>
                <td>{fmt(r.waktu)}</td>
                <td><Link to={'/event/' + r.eid}>{ev?.nama || r.eid}</Link>{ev && <><br /><small>{range(ev)}</small></>}</td>
                <td>{r.nama}</td>
                <td>{Object.values(r.teknisi || {}).join(', ') || '-'}</td>
                <td><details><summary>{r.jumlah} unit QR{r.items ? ` · ${Object.keys(r.items).length} jenis` : ''}</summary>{Object.values(r.items || {}).map((i) => <div key={i.nama}><small><b>{i.nama}</b>: diminta {i.diminta}, disiapkan gudang {i.disiapkan}</small></div>)}{Object.values(r.units || {}).map((u) => <div key={u.kode}><small>{u.kode} · {u.nama}</small></div>)}</details></td>
                <td><span className={'badge ' + tt.cls}>{tt.label}</span></td>
              </tr>
            );
          })}</tbody></table></div>
      )}
      <h2>Kerusakan</h2>
      {list(dmg).length === 0 ? <p className="empty">Tidak ada laporan kerusakan.</p> : (
        <div className="tbl"><table><thead><tr><th>Waktu</th><th>Unit</th><th>Event</th><th>Dicatat oleh</th><th>Catatan</th></tr></thead>
          <tbody>{list(dmg).sort((x, y) => y.waktu - x.waktu).slice(0, 50).map((r) => (
            <tr key={r.id}><td>{fmt(r.waktu)}</td><td><Link to={'/aset/' + r.assetId}>{r.kode}</Link></td><td>{events?.[r.eventId]?.nama || '-'}</td><td>{r.nama}</td><td>{r.catatan}</td></tr>
          ))}</tbody></table></div>
      )}
      <h2>Stok per kategori</h2>
      <div className="tbl"><table><thead><tr><th>Kategori</th><th>Total</th>{STATUS_LIST.map((s) => <th key={s}>{STATUS[s].label}</th>)}</tr></thead>
        <tbody>{cats.map((c) => <tr key={c}><td>{c}</td><td>{cnt(c)}</td>{STATUS_LIST.map((s) => <td key={s}>{cnt(c, s)}</td>)}</tr>)}</tbody></table></div>
      <h2>Riwayat gerakan alat</h2>
      <div className="tbl"><table><thead><tr><th>Waktu</th><th>Tahap</th><th>Unit</th><th>Petugas</th><th>Event</th></tr></thead>
        <tbody>{t.slice(0, 100).map((r) => (
          <tr key={r.id}><td>{fmt(r.waktu)}</td><td>{TIPE[r.tipe] || r.tipe}</td><td><Link to={'/aset/' + r.assetId}>{r.kode}</Link></td><td>{r.petugasNama}</td><td>{events?.[r.eventId]?.nama || '-'}</td></tr>
        ))}</tbody></table></div>
      <div className="row" style={{ margin: '14px 0' }}>
        <button className="dark" onClick={exportKirim}>Ekspor pengiriman CSV</button>
        <button className="dark" onClick={exportTx}>Ekspor riwayat CSV</button>
        <button className="dark" onClick={() => download('aset.csv', toCSV(a, ['kode', 'nama', 'kategori', 'status']))}>Ekspor aset CSV</button>
      </div>
    </>
  );
}
