import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, push, set, update } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit, overlap, range, today } from '../util.js';
import { IN_EVENT, norm } from './status.js';
import Assign from '../Assign.jsx';
import { Loading } from '../components.jsx';

const empty = { nama: '', lokasi: '', mulai: '', selesai: '' };

export default function Events() {
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin';
  const canManage = profile.role !== 'teknisi'; // admin & warehouse: kelola event
  const events = useVal('events');
  const bookings = useVal('assetBookings');
  const assets = useVal('assets');
  const users = useVal(isAdmin ? 'users' : 'users/' + profile.uid);
  const [f, setF] = useState(empty);
  const [ed, setEd] = useState(null);
  const [msg, setMsg] = useState('');
  const count = (eid) => Object.values(bookings || {}).filter((b) => b && b[eid]).length;
  const bookedIds = (eid) => Object.keys(bookings || {}).filter((aid) => bookings[aid]?.[eid]);
  const t = today();

  async function add(e) {
    e.preventDefault(); setMsg('');
    if (f.selesai < f.mulai) { setMsg('Tanggal selesai harus sama/setelah mulai.'); return; }
    try {
      await set(push(ref(db, 'events')), { nama: f.nama.trim(), lokasi: f.lokasi.trim(), mulai: f.mulai, selesai: f.selesai, dibuat: Date.now() });
      await audit(profile.uid, 'event_baru', f.nama);
      setF(empty);
    } catch (x) { setMsg(x.message); }
  }
  async function save(e) {
    e.preventDefault(); setMsg('');
    if (ed.selesai < ed.mulai) { setMsg('Tanggal selesai harus sama/setelah mulai.'); return; }
    const ids = bookedIds(ed.id);
    for (const aid of ids) {
      for (const [eid, b] of Object.entries(bookings[aid])) {
        if (eid !== ed.id && overlap(b, ed)) {
          setMsg(`Bentrok: ${assets?.[aid]?.kode || aid} sudah dialokasikan ke "${events[eid]?.nama || eid}" pada tanggal baru. Perubahan dibatalkan.`);
          return;
        }
      }
    }
    try {
      const up = {};
      for (const k of ['nama', 'lokasi', 'mulai', 'selesai']) up[`events/${ed.id}/${k}`] = String(ed[k] || '').trim();
      ids.forEach((aid) => { up[`assetBookings/${aid}/${ed.id}/mulai`] = ed.mulai; up[`assetBookings/${aid}/${ed.id}/selesai`] = ed.selesai; });
      await update(ref(db), up);
      await audit(profile.uid, 'edit_event', ed.nama);
      setEd(null);
    } catch (x) { setMsg(x.message); }
  }
  async function del(ev) {
    setMsg('');
    const out = list(assets).filter((a) => a.eventId === ev.id && IN_EVENT.includes(norm(a.status)));
    if (out.length) { setMsg(`Tidak bisa dihapus: ${out.length} unit masih dalam proses untuk event ini.`); return; }
    if (!confirm(`Hapus event "${ev.nama}" beserta alokasi dan checklist-nya?`)) return;
    try {
      const up = { ['events/' + ev.id]: null, ['checklist/' + ev.id]: null };
      bookedIds(ev.id).forEach((aid) => {
        up[`assetBookings/${aid}/${ev.id}`] = null;
        const rest = Object.keys(bookings[aid]).filter((k) => k !== ev.id).length;
        if (rest === 0 && norm(assets?.[aid]?.status) === 'dialokasikan') up[`assets/${aid}/status`] = 'tersedia';
      });
      await update(ref(db), up);
      await audit(profile.uid, 'hapus_event', ev.nama);
    } catch (x) { setMsg(x.message); }
  }
  const fields = (v, set_) => (
    <>
      <input aria-label="Nama event" placeholder="Nama event" value={v.nama} onChange={(e) => set_({ ...v, nama: e.target.value })} required />
      <input aria-label="Lokasi" placeholder="Lokasi" value={v.lokasi || ''} onChange={(e) => set_({ ...v, lokasi: e.target.value })} />
      <input aria-label="Tanggal mulai" type="date" value={v.mulai} onChange={(e) => set_({ ...v, mulai: e.target.value })} required />
      <input aria-label="Tanggal selesai" type="date" value={v.selesai} onChange={(e) => set_({ ...v, selesai: e.target.value })} required />
    </>
  );
  return (
    <>
      {canManage && !ed && <form className="card flag row" onSubmit={add}><b>Event baru</b>{fields(f, setF)}<button>Buat event</button></form>}
      {canManage && ed && (
        <form className="card flag row" onSubmit={save}><b>Edit event</b>{fields(ed, setEd)}
          <button>Simpan</button><button type="button" className="ghost" onClick={() => setEd(null)}>Batal</button></form>
      )}
      {msg && <p className="err" role="alert">{msg}</p>}
      {events === undefined ? <Loading /> : list(events).length === 0 ? <p className="empty">Belum ada event.</p> : (
        <div className="tbl"><table><thead><tr><th>Event</th><th>Lokasi</th><th>Tanggal</th><th>Unit</th><th>Teknisi</th>{canManage && <th></th>}</tr></thead>
          <tbody>{list(events).sort((a, b) => b.mulai.localeCompare(a.mulai)).map((e) => (
            <tr key={e.id}>
              <td><Link to={'/event/' + e.id}>{e.nama}</Link>{e.selesai < t && <small> · selesai</small>}</td>
              <td>{e.lokasi || '-'}</td><td>{range(e)}</td><td>{count(e.id)}</td>
              <td><Assign ev={e} users={users} isAdmin={isAdmin} /></td>
              {canManage && <td><div className="row">
                <button className="ghost" onClick={() => setEd({ id: e.id, nama: e.nama, lokasi: e.lokasi || '', mulai: e.mulai, selesai: e.selesai })}>Edit</button>
                <button className="danger" onClick={() => del(e)}>Hapus</button></div></td>}
            </tr>
          ))}</tbody></table></div>
      )}
    </>
  );
}
