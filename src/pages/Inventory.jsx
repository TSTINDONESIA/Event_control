import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, push, update } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit } from '../util.js';
import { Badge, Loading } from '../components.jsx';
import { STATUS, STATUS_LIST, norm } from './status.js';
import ImportCSV from '../ImportCSV.jsx';

export default function Inventory() {
  const { profile } = useAuth();
  const assets = useVal('assets');
  const kat = useVal('kategori');
  const [q, setQ] = useState('');
  const [st, setSt] = useState('');
  const [f, setF] = useState({ nama: '', kategori: '', jumlah: 1 });
  const [msg, setMsg] = useState('');
  const canWrite = profile.role !== 'teknisi';
  const all = list(assets);

  async function add(e) {
    e.preventDefault(); setMsg('');
    try {
      const n = Math.min(50, Math.max(1, parseInt(f.jumlah, 10) || 1));
      const prefix = (f.kategori || f.nama).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AST';
      const start = all.filter((x) => (x.kode || '').startsWith(prefix + '-')).length;
      const up = {};
      for (let i = 0; i < n; i++) {
        const k = push(ref(db, 'assets')).key;
        up['assets/' + k] = {
          kode: `${prefix}-${String(start + i + 1).padStart(4, '0')}`,
          nama: f.nama.trim(), kategori: f.kategori.trim(), status: 'tersedia', dibuat: Date.now(),
        };
      }
      await update(ref(db), up);
      await audit(profile.uid, 'aset_baru', `${f.nama} x${n}`);
      setF({ nama: '', kategori: '', jumlah: 1 });
    } catch (e2) { setMsg(e2.message); }
  }
  const shown = all.filter((a) => (!st || norm(a.status) === st) && `${a.kode} ${a.nama} ${a.kategori}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
  return (
    <>
      {canWrite && <p><Link className="btn dark" to="/daftar">Daftarkan unit via scan</Link> <small>Tempel label, scan, isi nama.</small></p>}
      {canWrite && (
        <form className="card flag row" onSubmit={add}><b>Unit baru</b>
          <input aria-label="Nama aset" placeholder="Nama aset" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} required />
          <input list="kat" aria-label="Kategori" placeholder="Kategori" value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })} />
          <datalist id="kat">{list(kat).map((k) => <option key={k.id} value={k.nama} />)}</datalist>
          <input type="number" min="1" max="50" value={f.jumlah} onChange={(e) => setF({ ...f, jumlah: e.target.value })} title="Jumlah unit" />
          <button>Tambah unit</button>
          {msg && <p className="err" role="alert">{msg}</p>}
        </form>
      )}
      {canWrite && <ImportCSV all={all} />}
      <div className="row" style={{ margin: '14px 0' }}>
        <input style={{ flex: 1, minWidth: 220 }} aria-label="Cari" placeholder="Cari kode / nama / kategori" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter status" value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Semua status</option>{STATUS_LIST.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}</select>
        <small>{shown.length} unit</small>
      </div>
      {assets === undefined ? <Loading /> : (
        <div className="tbl"><table><thead><tr><th>Kode</th><th>Nama</th><th>Kategori</th><th>Status</th></tr></thead>
          <tbody>{shown.map((a) => (
            <tr key={a.id}><td><Link to={'/aset/' + a.id}>{a.kode}</Link></td><td>{a.nama}</td><td>{a.kategori || '-'}</td><td><Badge s={a.status} /></td></tr>
          ))}</tbody></table></div>
      )}
    </>
  );
}
