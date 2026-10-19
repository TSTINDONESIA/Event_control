import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, push, set, update } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit, range } from '../util.js';
import { TAHAP, norm } from './status.js';
import Assign from '../Assign.jsx';
import { Loading } from '../components.jsx';

const empty = { nama: '', lokasi: '', mulai: '', selesai: '' };

// Daftar tugas: admin membuat event & menugaskan teknisi; gudang mengerjakan; teknisi melihat tugasnya.
export default function Events() {
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin';
  const events = useVal('events');
  const assets = useVal('assets');
  const users = useVal(isAdmin ? 'users' : 'users/' + profile.uid);
  const [f, setF] = useState(empty);
  const [ed, setEd] = useState(null);
  const [msg, setMsg] = useState('');
  const [all, setAll] = useState(false);

  const busyUnits = (eid) => list(assets).filter((a) => a.eventId === eid && ['disiapkan', 'keluar'].includes(norm(a.status)));
  async function add(e) {
    e.preventDefault(); setMsg('');
    if (f.selesai < f.mulai) { setMsg('Tanggal selesai harus sama/setelah mulai.'); return; }
    try {
      await set(push(ref(db, 'events')), { nama: f.nama.trim(), lokasi: f.lokasi.trim(), mulai: f.mulai, selesai: f.selesai, tahap: 'rencana', dibuat: Date.now() });
      await audit(profile.uid, 'event_baru', f.nama);
      setF(empty);
    } catch (x) { setMsg(x.message); }
  }
  async function save(e) {
    e.preventDefault(); setMsg('');
    if (ed.selesai < ed.mulai) { setMsg('Tanggal selesai harus sama/setelah mulai.'); return; }
    try {
      const up = {};
      for (const k of ['nama', 'lokasi', 'mulai', 'selesai']) up[`events/${ed.id}/${k}`] = String(ed[k] || '').trim();
      await update(ref(db), up);
      setEd(null);
    } catch (x) { setMsg(x.message); }
  }
  async function del(ev) {
    setMsg('');
    if (busyUnits(ev.id).length) { setMsg(`Tidak bisa dihapus: ${busyUnits(ev.id).length} unit masih disiapkan/di teknisi.`); return; }
    if (!confirm(`Hapus event "${ev.nama}"?`)) return;
    try { await update(ref(db), { ['events/' + ev.id]: null }); await audit(profile.uid, 'hapus_event', ev.nama); } catch (x) { setMsg(x.message); }
  }
  const fields = (v, set_) => (
    <>
      <input aria-label="Nama event" placeholder="Nama event" value={v.nama} onChange={(e) => set_({ ...v, nama: e.target.value })} required />
      <input aria-label="Lokasi" placeholder="Lokasi" value={v.lokasi || ''} onChange={(e) => set_({ ...v, lokasi: e.target.value })} />
      <input aria-label="Tanggal mulai" type="date" value={v.mulai} onChange={(e) => set_({ ...v, mulai: e.target.value })} required />
      <input aria-label="Tanggal selesai" type="date" value={v.selesai} onChange={(e) => set_({ ...v, selesai: e.target.value })} required />
    </>
  );
  const mine = list(events).filter((e) => profile.role !== 'teknisi' || e.teknisi?.[profile.uid]);
  const shown = mine.filter((e) => all || (e.tahap || 'rencana') !== 'selesai').sort((a, b) => a.mulai.localeCompare(b.mulai));
  return (
    <>
      {isAdmin && !ed && <form className="card flag row" onSubmit={add}><b>Event baru</b>{fields(f, setF)}<button>Buat event</button></form>}
      {isAdmin && ed && (
        <form className="card flag row" onSubmit={save}><b>Edit event</b>{fields(ed, setEd)}
          <button>Simpan</button><button type="button" className="ghost" onClick={() => setEd(null)}>Batal</button></form>
      )}
      {msg && <p className="err" role="alert">{msg}</p>}
      <p><label><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Tampilkan yang sudah selesai</label></p>
      {events === undefined ? <Loading /> : shown.length === 0 ? <p className="empty">Belum ada tugas.</p> : (
        <div className="tbl"><table><thead><tr><th>Event</th><th>Lokasi</th><th>Tanggal</th><th>Teknisi</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>{shown.map((e) => {
            const t = TAHAP[e.tahap || 'rencana'] || TAHAP.rencana;
            const siap = busyUnits(e.id).filter((a) => norm(a.status) === 'disiapkan').length;
            return (
              <tr key={e.id}>
                <td><Link to={'/event/' + e.id}><b>{e.nama}</b></Link></td>
                <td>{e.lokasi || '-'}</td><td>{range(e)}</td>
                <td><Assign ev={e} users={users} isAdmin={isAdmin} /></td>
                <td><span className={'badge ' + t.cls}>{t.label}</span>{siap > 0 && (e.tahap || 'rencana') !== 'dikirim' && <small> {siap} unit siap</small>}</td>
                {isAdmin && <td><div className="row">
                  <button className="ghost" onClick={() => setEd({ id: e.id, nama: e.nama, lokasi: e.lokasi || '', mulai: e.mulai, selesai: e.selesai })}>Edit</button>
                  <button className="danger" onClick={() => del(e)}>Hapus</button></div></td>}
              </tr>
            );
          })}</tbody></table></div>
      )}
    </>
  );
}
