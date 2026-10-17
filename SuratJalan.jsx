import { Link, useParams } from 'react-router-dom';
import { useVal, list, range, fmt } from '../util.js';
import { QR, Loading, Badge } from '../components.jsx';
import { norm } from './status.js';

export default function SuratJalan() {
  const { id } = useParams();
  const ev = useVal('events/' + id);
  const assets = useVal('assets');
  const catatan = useVal('serahTerima/' + id);
  const bE = useVal('bulkEvent/' + id);
  if (ev === undefined || assets === undefined || catatan === undefined || bE === undefined) return <Loading />;
  if (ev === null) return <p className="empty">Event tidak ditemukan.</p>;

  const out = list(catatan).filter((r) => r.tipe === 'keluar').sort((a, b) => b.waktu - a.waktu)[0];
  const url = `${location.origin}${location.pathname}#/event/${id}`;
  if (!out) return (
    <div className="card"><p>Surat Jalan belum ada. Gudang perlu menekan <b>Keluarkan semua</b> di halaman event lebih dulu.</p><Link className="btn" to={'/event/' + id}>Ke halaman event</Link></div>
  );

  const rows = Object.keys(out.units || {}).map((aid) => ({ id: aid, ...(assets?.[aid] || { kode: aid, nama: '(unit dihapus)' }) }))
    .sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
  const bulk = Object.entries(out.bulk || {}).map(([bid, b]) => ({ bid, ...b })).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  const last = (t) => list(catatan).filter((r) => r.tipe === t).sort((a, b) => b.waktu - a.waktu)[0];
  const trm = last('terima'); const kmb = last('kembali');
  const exc = Object.values(trm?.pengecualian || {});
  const bulkShort = Object.values(bE || {}).filter((e) => e.qtyTerima !== undefined && e.qtyTerima < e.qtyKeluar);
  const teknisi = Object.values(ev.teknisi || {}).join(', ') || '-';
  const wa = 'https://wa.me/?text=' + encodeURIComponent(`Surat Jalan event "${ev.nama}" (${range(ev)}). ${rows.length} unit${bulk.length ? ` + ${bulk.length} jenis barang jumlah` : ''}. Buka, cek barang, lalu klik "Terima semua": ${url}`);

  return (
    <div className="sj">
      <div className="row no-print" style={{ marginBottom: 12 }}>
        <button onClick={() => window.print()}>Simpan arsip PDF</button>
        <a className="btn dark" href={wa} target="_blank" rel="noreferrer">Bagikan lewat WhatsApp</a>
        <Link className="btn ghost" to={'/event/' + id}>← Kembali ke event</Link>
      </div>
      <p className="no-print"><small>Untuk PDF: tekan “Simpan arsip PDF”, lalu pilih “Simpan sebagai PDF” di pilihan printer.</small></p>
      <div className="card">
        <div className="row"><h2 style={{ margin: 0 }}>SURAT JALAN PERALATAN</h2><span className="sp" /><QR text={url} size={110} /></div>
        <table className="sj-meta"><tbody>
          <tr><td>Event</td><td><b>{ev.nama}</b></td></tr>
          <tr><td>Lokasi</td><td>{ev.lokasi || '-'}</td></tr>
          <tr><td>Tanggal</td><td>{range(ev)}</td></tr>
          <tr><td>Teknisi</td><td>{teknisi}</td></tr>
          <tr><td>Petugas gudang</td><td>{out.nama}</td></tr>
          <tr><td>Waktu keluar</td><td>{fmt(out.waktu)}</td></tr>
          <tr><td>Jumlah unit</td><td><b>{rows.length}</b>{bulk.length > 0 && ` + ${bulk.length} jenis barang jumlah`}</td></tr>
        </tbody></table>
        <div className="tbl"><table>
          <thead><tr><th>No</th><th>Kode</th><th>Nama</th><th>Kategori</th><th>Status</th></tr></thead>
          <tbody>{rows.map((u, i) => <tr key={u.id}><td>{i + 1}</td><td>{u.kode}</td><td>{u.nama}</td><td>{u.kategori || '-'}</td><td><Badge s={norm(u.status)} /></td></tr>)}</tbody>
        </table></div>
        {bulk.length > 0 && (
          <div className="tbl" style={{ marginTop: 12 }}><table>
            <thead><tr><th>No</th><th>Barang jumlah</th><th>Kategori</th><th>Jumlah</th><th>Diterima</th></tr></thead>
            <tbody>{bulk.map((b, i) => <tr key={b.bid}><td>{i + 1}</td><td>{b.nama}</td><td>{b.kategori || '-'}</td><td>{b.qty}</td><td>{bE?.[b.bid]?.qtyTerima ?? '-'}</td></tr>)}</tbody>
          </table></div>
        )}
        <h3 style={{ marginTop: 16 }}>Status serah terima</h3>
        {trm ? (
          <p><b>Diterima oleh {trm.nama}</b>, {fmt(trm.waktu)}.{exc.length > 0 && <> Tidak diterima: {exc.map((x) => `${x.kode}${x.alasan ? ' (' + x.alasan + ')' : ''}`).join(', ')}.</>}{bulkShort.length > 0 && <> Barang jumlah kurang: {bulkShort.map((e) => `${e.nama} ${e.qtyKeluar - e.qtyTerima}`).join(', ')}.</>}</p>
        ) : <p>Belum diterima teknisi. Buka halaman event lalu klik <b>Terima semua</b>.</p>}
        {kmb && <p><b>Dikembalikan oleh {kmb.nama}</b>, {fmt(kmb.waktu)}.</p>}
        <small>Dokumen ini tanpa tanda tangan: penerimaan tercatat otomatis oleh sistem (nama dan waktu). Scan QR untuk membuka halaman event.</small>
      </div>
    </div>
  );
}
