import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVal, list, fmtDate } from '../util.js';
import { Loading } from '../components.jsx';

const days = (e) => Math.round((new Date(e.selesai) - new Date(e.mulai)) / 864e5) + 1;

// Tampilan: di kertas (cetak/PDF) tetap berupa form TST; di HP berubah jadi kartu per alat yang mudah dibaca.
const CSS = `
.sj-form{max-width:820px;background:#fff;color:#000;min-width:0}
.sj-info{display:grid;grid-template-columns:130px 1fr 130px 1fr;gap:4px 8px;font-size:14px;margin-bottom:12px}
.sj-info .wide{grid-column:span 3}
.sj-table{width:100%;border-collapse:collapse;font-size:14px;margin-bottom:14px}
.sj-table th,.sj-table td{border:1px solid #000;padding:4px 8px;text-align:left}
.sj-table td.blank{height:24px}
.sj-n{display:none}
.sj-sign3{display:flex;justify-content:space-between;font-size:14px;margin-top:10px}
.sj-gap{height:70px}
@media screen and (max-width:720px){
  .sj-bar{flex-direction:column;align-items:stretch;gap:10px}
  .sj-bar input,.sj-bar button{width:100%}
  .sj-form{padding:16px 14px}
  .sj-info{grid-template-columns:1fr;gap:0}
  .sj-info .wide{grid-column:auto}
  .sj-info .lbl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#666;margin-top:10px}
  .sj-info .val{font-size:16px;font-weight:600;border-bottom:1px solid #ddd;padding-bottom:6px}
  .sj-table,.sj-table tbody{display:block}
  .sj-table thead,.sj-table tr.sj-blank,.sj-table td.no,.sj-table td.noket,.sj-blank-table{display:none}
  .sj-table tr{display:block;border:2px solid #000;margin-bottom:10px;padding:8px 12px}
  .sj-table td{display:flex;justify-content:space-between;gap:12px;border:0;padding:3px 0;font-size:15px}
  .sj-table td::before{content:attr(data-label);color:#666;font-weight:600}
  .sj-table td.eq{font-size:18px;font-weight:800;display:block}
  .sj-table td.eq::before{content:none}
  .sj-n{display:inline}
  .sj-sign3{flex-direction:column;gap:18px}
}
`;

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
  const tek = Object.values(ev.teknisi || {}).join(', ');
  const Table = ({ items, pad }) => (
    <table className="sj-table">
      <thead><tr><th style={{ width: 36 }}>No</th><th>Equipment</th><th style={{ width: 60 }}>QTT</th><th style={{ width: 90 }}>Duration</th><th>Description</th></tr></thead>
      <tbody>{items.map((k, i) => (
        <tr key={k.id}>
          <td className="no">{i + 1}</td>
          <td className="eq"><span className="sj-n">{i + 1}. </span>{k.kategori}</td>
          <td data-label="Jumlah">{qty(k)}</td>
          <td data-label="Durasi">{dur}</td>
          <td data-label="Keterangan" className={k.ket ? '' : 'noket'}>{k.ket || ''}</td>
        </tr>
      ))}
        {Array.from({ length: Math.max(0, pad - items.length) }).map((_, i) => <tr key={'p' + i} className="sj-blank">{[0, 1, 2, 3, 4].map((c) => <td key={c} className="blank" />)}</tr>)}</tbody>
    </table>
  );
  return (
    <div className="pad">
      <p className="no-print row sj-bar"><Link to={'/event/' + id}>← Kembali ke event</Link>
        <input placeholder="Nomor kendaraan" value={veh} onChange={(e) => setVeh(e.target.value)} />
        <button onClick={() => window.print()}>Cetak / simpan PDF</button></p>
      <style>{CSS}</style>
      <div className="print-area card sj-form">
        <h3 style={{ textAlign: 'center', margin: 0 }}>PT. TST INDONESIA</h3>
        <h4 style={{ textAlign: 'center', textDecoration: 'underline', margin: '6px 0 14px' }}>Surat Jalan</h4>
        <div className="sj-info">
          <div className="lbl">Event</div><div className="val">: {ev.nama}</div>
          <div className="lbl">Vehicle Number</div><div className="val">: {veh}</div>
          <div className="lbl">Venue</div><div className="val">: {ev.lokasi || ''}</div>
          <div className="lbl">Date</div><div className="val">: {fmtDate(ev.mulai)}</div>
          <div className="lbl">Interpreter Name</div><div className="val wide">: {tek}</div>
        </div>
        <Table items={layanan} pad={10} />
        {alat.length > 0 && <><b style={{ fontSize: 14 }}>Perlengkapan</b><Table items={alat} pad={0} /></>}
        <div className="sj-blank-table">
          <h4 style={{ textAlign: 'center', textDecoration: 'underline', margin: '10px 0' }}>Berita Acara Serah Terima Pelayanan</h4>
          <Table items={[]} pad={5} />
        </div>
        <p style={{ fontSize: 12 }}><u>Note: This letter is official documentation of the services provided and will be included as a supporting document with the Invoice.</u></p>
        <p style={{ fontSize: 14 }}>The services have been received and accepted in good condition and to our satisfaction,</p>
        <div className="sj-sign3">
          <div>Received by,<div className="sj-gap" />PIC<br />(...........................)</div>
          <div>Delivered by,<div className="sj-gap" />Technician<br />({Object.values(ev.teknisi || {})[0] || '...........................'})</div>
          <div>Prepared by,<div className="sj-gap" />Warehouse<br />({kirim?.nama || '...........................'})</div>
        </div>
      </div>
    </div>
  );
}
