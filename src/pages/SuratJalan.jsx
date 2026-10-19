import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVal, list, fmtDate } from '../util.js';
import { Loading } from '../components.jsx';

const days = (e) => Math.round((new Date(e.selesai) - new Date(e.mulai)) / 864e5) + 1;

// Surat Jalan + Berita Acara Serah Terima Pelayanan, siap cetak (format form TST).
export default function SuratJalan() {
  const { id } = useParams();
  const ev = useVal('events/' + id);
  const serah = useVal('serahTerima/' + id);
  const [veh, setVeh] = useState('');
  if (ev === undefined || serah === undefined) return <Loading />;
  if (ev === null) return <p>Event tidak ditemukan.</p>;
  const rows = list(ev.kebutuhan);
  const layanan = rows.filter((k) => k.grup === 'Layanan (Surat Jalan)');
  const alat = rows.filter((k) => k.grup !== 'Layanan (Surat Jalan)');
  const kirim = list(serah).filter((r) => r.tipe === 'keluar').sort((a, b) => b.waktu - a.waktu)[0];
  const dur = days(ev) + (days(ev) > 1 ? ' DAYS' : ' DAY');
  const qty = (k) => (k.siap > 0 ? k.siap : k.jumlah);
  const th = { border: '1px solid #000', padding: '4px 8px', textAlign: 'left' };
  const Table = ({ items, pad }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 14 }}>
      <thead><tr><th style={{ ...th, width: 36 }}>No</th><th style={th}>Equipment</th><th style={{ ...th, width: 60 }}>QTT</th><th style={{ ...th, width: 90 }}>Duration</th><th style={th}>Description</th></tr></thead>
      <tbody>{items.map((k, i) => <tr key={k.id}><td style={th}>{i + 1}</td><td style={th}>{k.kategori}</td><td style={th}>{qty(k)}</td><td style={th}>{dur}</td><td style={th}>{k.ket || ''}</td></tr>)}
        {Array.from({ length: Math.max(0, pad - items.length) }).map((_, i) => <tr key={'p' + i}>{[0, 1, 2, 3, 4].map((c) => <td key={c} style={{ ...th, height: 24 }} />)}</tr>)}</tbody>
    </table>
  );
  return (
    <div className="pad">
      <p className="no-print row"><Link to={'/event/' + id}>← Kembali ke event</Link>
        <input placeholder="Nomor kendaraan" value={veh} onChange={(e) => setVeh(e.target.value)} />
        <button onClick={() => window.print()}>Cetak / simpan PDF</button></p>
      <div className="print-area card" style={{ maxWidth: 820, background: '#fff', color: '#000' }}>
        <h3 style={{ textAlign: 'center', margin: 0 }}>PT. TST INDONESIA</h3>
        <h4 style={{ textAlign: 'center', textDecoration: 'underline', margin: '6px 0 14px' }}>Surat Jalan</h4>
        <table style={{ width: '100%', fontSize: 14, marginBottom: 12 }}><tbody>
          <tr><td style={{ width: 130 }}>Event</td><td>: {ev.nama}</td><td style={{ width: 130 }}>Vehicle Number</td><td>: {veh}</td></tr>
          <tr><td>Venue</td><td>: {ev.lokasi || ''}</td><td>Date</td><td>: {fmtDate(ev.mulai)}</td></tr>
          <tr><td>Interpreter Name</td><td colSpan="3">: {Object.values(ev.teknisi || {}).join(', ')}</td></tr>
        </tbody></table>
        <Table items={layanan} pad={10} />
        {alat.length > 0 && <><b style={{ fontSize: 14 }}>Perlengkapan</b><Table items={alat} pad={0} /></>}
        <h4 style={{ textAlign: 'center', textDecoration: 'underline', margin: '10px 0' }}>Berita Acara Serah Terima Pelayanan</h4>
        <Table items={[]} pad={5} />
        <p style={{ fontSize: 12 }}><u>Note: This letter is official documentation of the services provided and will be included as a supporting document with the Invoice.</u></p>
        <p style={{ fontSize: 14 }}>The services have been received and accepted in good condition and to our satisfaction,</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginTop: 10 }}>
          <div>Received by,<div style={{ height: 70 }} />PIC<br />(...........................)</div>
          <div>Delivered by,<div style={{ height: 70 }} />Technician<br />({Object.values(ev.teknisi || {})[0] || '...........................'})</div>
          <div>Prepared by,<div style={{ height: 70 }} />Warehouse<br />({kirim?.nama || '...........................'})</div>
        </div>
      </div>
    </div>
  );
}
