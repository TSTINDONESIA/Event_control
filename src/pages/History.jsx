import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, fmt } from '../util.js';

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
        <table><thead><tr><th>Waktu</th><th>Tipe</th><th>Unit</th><th>Petugas</th><th>Ket.</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td>{fmt(r.waktu)}</td><td>{r.tipe}</td><td><Link to={'/aset/' + r.assetId}>{r.kode || r.assetId}</Link></td><td>{r.petugasNama || r.petugas}</td><td>{r.kondisi || ''}</td></tr>
          ))}</tbody></table>
      )}
      {profile.role === 'admin' && (
        <>
          <h2>Audit log</h2>
          <table><thead><tr><th>Waktu</th><th>Aksi</th><th>Detail</th><th>UID</th></tr></thead>
            <tbody>{arows.map((r) => <tr key={r.id}><td>{fmt(r.waktu)}</td><td>{r.aksi}</td><td>{r.detail}</td><td><small>{r.uid}</small></td></tr>)}</tbody></table>
        </>
      )}
    </>
  );
}
