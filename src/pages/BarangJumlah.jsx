import { useState } from 'react';
import { ref, push, set, update, remove } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit } from '../util.js';
import { bulkList } from '../flow.js';
import { Loading } from '../components.jsx';

// Master barang jumlah: dicatat per jumlah (tanpa QR per barang)
export default function BarangJumlah() {
  const { profile } = useAuth();
  const items = useVal('bulk');
  const kat = useVal('kategori');
  const allBE = useVal('bulkEvent');
  const [f, setF] = useState({ nama: '', kategori: '', total: 1 });
  const [msg, setMsg] = useState('');
  if (items === undefined || allBE === undefined) return <Loading />;
  const isAdmin = profile.role === 'admin';
  const out = {}; const plan = {};
  Object.values(allBE || {}).forEach((m) => bulkList(m).forEach((e) => {
    if (['keluar', 'diterima', 'kembali'].includes(e.tahap)) out[e.bid] = (out[e.bid] || 0) + (e.qtyKeluar || 0);
    if (e.tahap === 'rencana') plan[e.bid] = (plan[e.bid] || 0) + (e.qty || 0);
  }));
  async function run(fn) { setMsg(''); try { await fn(); } catch (e) { setMsg(e.message); } }
  const add = (e) => { e.preventDefault(); run(async () => {
    const n = Math.floor(Number(f.total));
    if (!f.nama.trim() || !(n >= 0)) throw new Error('Isi nama dan total stok.');
    await set(push(ref(db, 'bulk')), { nama: f.nama.trim(), kategori: f.kategori.trim(), total: n });
    await audit(profile.uid, 'barang_jumlah', `${f.nama.trim()} total ${n}`);
    setF({ nama: '', kategori: '', total: 1 });
  }); };
  const setTotal = (i) => run(async () => {
    const v = prompt(`Total stok baru untuk ${i.nama}:`, i.total);
    if (v === null) return;
    const n = Math.floor(Number(v));
    if (!(n >= 0)) throw new Error('Angka tidak valid.');
    await update(ref(db, 'bulk/' + i.id), { total: n });
    await audit(profile.uid, 'ubah_total_jumlah', `${i.nama}: ${i.total} -> ${n}`);
  });
  const del = (i) => run(async () => {
    if (out[i.id] || plan[i.id]) throw new Error('Masih dipakai event. Lepas dari event dulu.');
    if (!confirm(`Hapus ${i.nama}?`)) return;
    await remove(ref(db, 'bulk/' + i.id));
  });
  const its = list(items).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  return (
    <>
      <form className="card row" onSubmit={add}>
        <input placeholder="Nama barang (mis. Kabel XLR 5 m)" aria-label="Nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} required />
        <input list="katB" placeholder="Kategori" aria-label="Kategori" value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })} />
        <datalist id="katB">{list(kat).map((k) => <option key={k.id} value={k.nama} />)}</datalist>
        <input type="number" min="0" aria-label="Total stok" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} style={{ width: 100 }} />
        <button>Tambah</button>
      </form>
      {msg && <p className="err" role="alert">{msg}</p>}
      {its.length === 0 ? <p className="empty">Belum ada barang jumlah.</p> : (
        <div className="tbl"><table><thead><tr><th>Nama</th><th>Kategori</th><th>Total</th><th>Sedang keluar</th><th>Direncanakan</th><th>Tersedia sekarang</th><th></th></tr></thead>
          <tbody>{its.map((i) => (
            <tr key={i.id}><td>{i.nama}</td><td>{i.kategori || '-'}</td><td>{i.total}</td><td>{out[i.id] || 0}</td><td>{plan[i.id] || 0}</td><td><b>{Math.max(0, i.total - (out[i.id] || 0))}</b></td>
              <td><div className="row"><button className="ghost" onClick={() => setTotal(i)}>Ubah total</button>{isAdmin && <button className="danger" onClick={() => del(i)}>Hapus</button>}</div></td></tr>
          ))}</tbody></table></div>
      )}
      <p><small>Barang jumlah tidak punya QR per barang. Pergerakannya dicatat per event: keluar, diterima teknisi, dan dihitung gudang saat kembali.</small></p>
    </>
  );
}
