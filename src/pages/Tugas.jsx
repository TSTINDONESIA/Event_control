import { Link } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list } from '../util.js';

function EventTask({ ev, items, profile }) {
  const cl = useVal('checklist/' + ev.id) || {};
  const done = items.filter((a) => cl[a.id]?.ok).length;
  async function toggle(a, ok) {
    try { await set(ref(db, `checklist/${ev.id}/${a.id}`), { ok, uid: profile.uid, nama: profile.nama, waktu: Date.now() }); }
    catch (e) { alert(e.message); }
  }
  return (
    <div className="card">
      <b>{ev.nama}</b> <small>({ev.mulai} s/d {ev.selesai}) — {done}/{items.length} siap</small>
      {items.length === 0 ? <p>Belum ada aset dialokasikan.</p> : (
        <ul style={{ listStyle: 'none', padding: 0 }}>{items.map((a) => (
          <li key={a.id}>
            <label><input type="checkbox" checked={!!cl[a.id]?.ok} onChange={(e) => toggle(a, e.target.checked)} /> {a.kode} — {a.nama}</label>
            {' '}<Link to={'/aset/' + a.id}>detail / lapor rusak</Link>
            {cl[a.id]?.ok && <small> · dicek {cl[a.id].nama}</small>}
          </li>
        ))}</ul>
      )}
    </div>
  );
}

export default function Tugas() {
  const { profile } = useAuth();
  const events = useVal('events');
  const bookings = useVal('assetBookings');
  const assets = useVal('assets');
  if (events === undefined || bookings === undefined || assets === undefined) return <p>Memuat…</p>;
  const mine = list(events).filter((e) => profile.role === 'admin' || e.teknisi?.[profile.uid])
    .sort((a, b) => b.mulai.localeCompare(a.mulai));
  return (
    <>
      <h2>Tugas &amp; checklist</h2>
      {mine.length === 0 && <p>Belum ada tugas untuk Anda.</p>}
      {mine.map((e) => {
        const items = Object.entries(bookings || {}).filter(([, b]) => b && b[e.id])
          .map(([aid]) => ({ id: aid, ...(assets?.[aid] || { kode: aid, nama: '?' }) }));
        return <EventTask key={e.id} ev={e} items={items} profile={profile} />;
      })}
    </>
  );
}
