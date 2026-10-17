import { useState } from 'react';
import { ref, push, set } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit } from '../util.js';
import Assign from '../Assign.jsx';

export default function Events() {
  const { profile } = useAuth();
  const events = useVal('events');
  const bookings = useVal('assetBookings');
  const [f, setF] = useState({ nama: '', lokasi: '', mulai: '', selesai: '' });
  const [msg, setMsg] = useState('');
  const isAdmin = profile.role === 'admin';
  const users = useVal(isAdmin ? 'users' : 'users/' + profile.uid);
  const count = (eid) => Object.values(bookings || {}).filter((b) => b && b[eid]).length;

  async function add(e) {
    e.preventDefault(); setMsg('');
    if (f.selesai < f.mulai) { setMsg('Tanggal selesai harus sama/setelah mulai.'); return; }
    try {
      const r = push(ref(db, 'events'));
      await set(r, { nama: f.nama.trim(), lokasi: f.lokasi.trim(), mulai: f.mulai, selesai: f.selesai, dibuat: Date.now() });
      await audit(profile.uid, 'event_baru', f.nama);
      setF({ nama: '', lokasi: '', mulai: '', selesai: '' });
    } catch (e2) { setMsg(e2.message); }
  }
  return (
    <>
      <h2>Event</h2>
      {isAdmin && (
        <form className="card row" onSubmit={add}>
          <input placeholder="Nama event" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} required />
          <input placeholder="Lokasi" value={f.lokasi} onChange={(e) => setF({ ...f, lokasi: e.target.value })} />
          <input type="date" value={f.mulai} onChange={(e) => setF({ ...f, mulai: e.target.value })} required />
          <input type="date" value={f.selesai} onChange={(e) => setF({ ...f, selesai: e.target.value })} required />
          <button>Tambah</button>
          {msg && <p className="err">{msg}</p>}
        </form>
      )}
      {events === undefined ? <p>Memuat…</p> : (
        <table><thead><tr><th>Event</th><th>Lokasi</th><th>Mulai</th><th>Selesai</th><th>Aset</th><th>Teknisi</th></tr></thead>
          <tbody>{list(events).sort((a, b) => b.mulai.localeCompare(a.mulai)).map((e) => (
            <tr key={e.id}><td>{e.nama}</td><td>{e.lokasi || '-'}</td><td>{e.mulai}</td><td>{e.selesai}</td><td>{count(e.id)}</td><td><Assign ev={e} users={users} isAdmin={isAdmin} /></td></tr>
          ))}</tbody></table>
      )}
    </>
  );
}
