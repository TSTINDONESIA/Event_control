import { Link } from 'react-router-dom';
import { ref, set } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, range } from '../util.js';
import { norm } from './status.js';
import { Badge, Progress, Loading } from '../components.jsx';

function EventTask({ ev, items, profile }) {
  const cl = useVal('checklist/' + ev.id) || {};
  const done = items.filter((a) => cl[a.id]?.ok).length;
  const canCheck = profile.role !== 'warehouse';
  async function toggle(a, ok) {
    try { await set(ref(db, `checklist/${ev.id}/${a.id}`), { ok, uid: profile.uid, nama: profile.nama, waktu: Date.now() }); }
    catch (e) { alert(e.message); }
  }
  return (
    <div className="card flag">
      <div className="row"><b><Link to={'/event/' + ev.id}>{ev.nama}</Link></b><span className="sp" /><small>{range(ev)}{ev.lokasi ? ' · ' + ev.lokasi : ''}</small></div>
      <div style={{ margin: '12px 0' }}><Progress value={done} max={items.length} label="Checklist setup" yellow /></div>
      {items.length === 0 ? <p>Belum ada unit dialokasikan.</p> : items.map((a) => (
        <div className="check" key={a.id}>
          <input type="checkbox" id={ev.id + a.id} disabled={!canCheck} checked={!!cl[a.id]?.ok} onChange={(e) => toggle(a, e.target.checked)} />
          <label htmlFor={ev.id + a.id} style={{ flex: 1 }}><b>{a.kode}</b> {a.nama}{cl[a.id]?.ok && <small> · dicek {cl[a.id].nama}</small>}</label>
          <Badge s={a.status} /> <Link to={'/aset/' + a.id}>Buka</Link>
        </div>
      ))}
    </div>
  );
}

export default function Tugas() {
  const { profile } = useAuth();
  const events = useVal('events');
  const bookings = useVal('assetBookings');
  const assets = useVal('assets');
  if (events === undefined || bookings === undefined || assets === undefined) return <Loading />;
  const mine = list(events).filter((e) => profile.role !== 'teknisi' || e.teknisi?.[profile.uid])
    .sort((a, b) => b.mulai.localeCompare(a.mulai));
  return (
    <>
      {mine.length === 0 && <p className="empty">Belum ada tugas untuk Anda.</p>}
      {mine.map((e) => {
        const items = Object.entries(bookings || {}).filter(([, b]) => b && b[e.id])
          .map(([aid]) => ({ id: aid, ...(assets?.[aid] || { kode: aid, nama: '?' }), status: norm(assets?.[aid]?.status) }));
        return <EventTask key={e.id} ev={e} items={items} profile={profile} />;
      })}
    </>
  );
}
