import { useState } from 'react';
import { ref, push, set, remove } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit } from '../util.js';
import { Loading } from '../components.jsx';

export default function Kategori() {
  const { profile } = useAuth();
  const kat = useVal('kategori');
  const assets = useVal('assets');
  const [n, setN] = useState('');
  const [msg, setMsg] = useState('');
  const used = (nama) => list(assets).filter((a) => a.kategori === nama).length;
  async function add(e) {
    e.preventDefault(); setMsg('');
    const nama = n.trim();
    if (list(kat).some((k) => k.nama.toLowerCase() === nama.toLowerCase())) { setMsg('Kategori sudah ada.'); return; }
    try { await set(push(ref(db, 'kategori')), { nama }); await audit(profile.uid, 'kategori_baru', nama); setN(''); }
    catch (x) { setMsg(x.message); }
  }
  async function del(k) {
    if (used(k.nama) > 0) { setMsg(`Kategori "${k.nama}" masih dipakai ${used(k.nama)} unit.`); return; }
    if (!confirm(`Hapus kategori "${k.nama}"?`)) return;
    try { await remove(ref(db, 'kategori/' + k.id)); await audit(profile.uid, 'kategori_hapus', k.nama); } catch (x) { setMsg(x.message); }
  }
  if (kat === undefined) return <Loading />;
  return (
    <>
      <form className="card flag row" onSubmit={add}>
        <input aria-label="Nama kategori" placeholder="Nama kategori" value={n} onChange={(e) => setN(e.target.value)} required />
        <button>Tambah</button>
      </form>
      {msg && <p className="err" role="alert">{msg}</p>}
      <div className="tbl"><table><thead><tr><th>Kategori</th><th>Unit</th><th></th></tr></thead>
        <tbody>{list(kat).sort((a, b) => a.nama.localeCompare(b.nama)).map((k) => (
          <tr key={k.id}><td>{k.nama}</td><td>{used(k.nama)}</td><td><button className="danger" onClick={() => del(k)}>Hapus</button></td></tr>
        ))}</tbody></table></div>
    </>
  );
}
