import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, fmt } from '../util.js';
import { TIPE } from './status.js';

export default function History() {
  const { profile } = useAuth();
  const tx = useVal('transactions');
  const au = useVal(profile.role === 'admin' ? 'audit' : 'users/' + profile.uid + '/_none');
  const rows = list(tx).sort((a, b) => b.waktu - a.waktu).slice(0, 200);
  const arows = list(au).sort((a, b) => b.waktu - a.waktu).slice(0, 200);
  return (
    <>
      <h2>Riwayat transaksi</h2>
      {tx === undefined ? <p>Memuat…</p> : (
        <div className="tbl"><table><thead><tr><th>Waktu</th><th>Tahap</th><th>Unit</th><th>Petugas</th><th>Ket.</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td>{fmt(r.waktu)}</td><td>{TIPE[r.tipe] || r.tipe}</td><td><Link to={'/aset/' + r.assetId}>{r.kode || r.assetId}</Link></td><td>{r.petugasNama || r.petugas}</td><td>{[r.kondisi, r.catatan].filter(Boolean).join(' · ')}</td></tr>
          ))}</tbody></table></div>
      )}
      {profile.role === 'admin' && (
        <>
          <h2>Audit log</h2>
          <div className="tbl"><table><thead><tr><th>Waktu</th><th>Aksi</th><th>Detail</th><th>UID</th></tr></thead>
            <tbody>{arows.map((r) => <tr key={r.id}><td>{fmt(r.waktu)}</td><td>{r.aksi}</td><td>{r.detail}</td><td><small>{r.uid}</small></td></tr>)}</tbody></table></div>
        </>
      )}
    </>
  );
}
