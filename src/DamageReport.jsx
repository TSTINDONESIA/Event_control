import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { db } from './firebase.js';
import { useAuth } from './AuthContext.jsx';
import { useVal, list, fmt, audit } from './util.js';

export default function DamageReport({ assetId, kode }) {
  const { profile } = useAuth();
  const all = useVal('laporanRusak');
  const [t, setT] = useState('');
  const [msg, setMsg] = useState('');
  const mine = list(all).filter((r) => r.assetId === assetId).sort((a, b) => b.waktu - a.waktu);
  async function send(e) {
    e.preventDefault(); setMsg('');
    try {
      await set(push(ref(db, 'laporanRusak')), { assetId, kode, uid: profile.uid, nama: profile.nama, catatan: t.trim(), waktu: Date.now() });
      await audit(profile.uid, 'lapor_rusak', kode);
      setT('');
    } catch (x) { setMsg(x.message); }
  }
  return (
    <>
      <h2>Laporan kerusakan</h2>
      {mine.length === 0 ? <p className="empty">Belum ada laporan.</p> : (
        <ul>{mine.map((r) => <li key={r.id}>{fmt(r.waktu)} — {r.nama}: {r.catatan}</li>)}</ul>
      )}
      <form className="card row" onSubmit={send}>
        <input aria-label="Deskripsi kerusakan" placeholder="Deskripsi kerusakan" value={t} onChange={(e) => setT(e.target.value)} required style={{ flex: 1 }} />
        <button>Kirim laporan</button>
        {msg && <p className="err" role="alert">{msg}</p>}
      </form>
    </>
  );
}
