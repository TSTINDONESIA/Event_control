import { useState } from 'react';
import { ref, set, remove } from 'firebase/database';
import { db } from './firebase.js';
import { useAuth } from './AuthContext.jsx';
import { list, audit, range } from './util.js';
import { notifUser } from './notify.js';

export default function Assign({ ev, users, isAdmin }) {
  const { profile } = useAuth();
  const [u, setU] = useState('');
  const [msg, setMsg] = useState('');
  const assigned = ev.teknisi || {};
  const techs = isAdmin ? list(users).filter((x) => x.role === 'teknisi' && x.aktif === true && !assigned[x.id]) : [];
  async function add() {
    try {
      const t = techs.find((x) => x.id === u);
      await set(ref(db, `events/${ev.id}/teknisi/${u}`), t.nama);
      await audit(profile.uid, 'tugas_teknisi', `${t.nama} -> ${ev.nama}`);
      notifUser(profile, u, 'Tugas baru: ' + ev.nama, `Anda ditugaskan${ev.lokasi ? ' di ' + ev.lokasi : ''}, ${range(ev)}. Gudang akan menyiapkan alat.`, ev.id);
      setU('');
    } catch (e) { setMsg(e.message); }
  }
  async function del(id) {
    try { await remove(ref(db, `events/${ev.id}/teknisi/${id}`)); notifUser(profile, id, 'Penugasan dibatalkan', `Anda tidak lagi ditugaskan di ${ev.nama}.`, ev.id); } catch (e) { setMsg(e.message); }
  }
  return (
    <div>
      {Object.entries(assigned).map(([id, n]) => (
        <span key={id} className="tech-chip">{n}{isAdmin && <b role="button" aria-label={`Hapus ${n}`} onClick={() => del(id)}>×</b>}</span>
      ))}
      {isAdmin && techs.length > 0 && (
        <span className="row" style={{ display: 'inline-flex', marginTop: 4 }}>
          <select value={u} onChange={(e) => setU(e.target.value)}>
            <option value="">+ Teknisi</option>
            {techs.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
          </select>
          <button disabled={!u} onClick={add}>Tugaskan</button>
        </span>
      )}
      {msg && <p className="err" role="alert">{msg}</p>}
    </div>
  );
}
