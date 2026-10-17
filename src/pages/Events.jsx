import { useState } from 'react';
import { ref, push, set, update } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit, overlap } from '../util.js';
import Assign from '../Assign.jsx';

const empty = { nama: '', lokasi: '', mulai: '', selesai: '' };

export default function Events() {
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin';
  const events = useVal('events');
  const bookings = useVal('assetBookings');
  const assets = useVal('assets');
  const users = useVal(isAdmin ? 'users' : 'users/' + profile.uid);
  const [f, setF] = useState(empty);
  const [ed, setEd] = useState(null);
  const [msg, setMsg] = useState('');
  const count = (eid) => Object.values(bookings || {}).filter((b) => b && b[eid]).length;
  const bookedIds = (eid) => Object.keys(bookings || {}).filter((aid) => bookings[aid]?.[eid]);

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
    const out = list(assets).filter((a) => a.eventId === ev.id && ['keluar', 'digunakan'].includes(a.status));
    if (out.length) { setMsg(`Tidak bisa dihapus: ${out.length} unit masih keluar untuk event ini.`); return; }
    if (!confirm(`Hapus event "${ev.nama}" beserta alokasi dan checklist-nya?`)) return;
    try {
      const up = { ['events/' + ev.id]: null, ['checklist/' + ev.id]: null };
      bookedIds(ev.id).forEach((aid) => {
        up[`assetBookings/${aid}/${ev.id}`] = null;
        const rest = Object.keys(bookings[aid]).filter((k) => k !== ev.id).length;
        if (rest === 0 && assets?.[aid]?.status === 'dialokasikan') up[`assets/${aid}/status`] = 'tersedia';
      });
      await update(ref(db), up);
      await audit(profile.uid, 'hapus_event', ev.nama);
    } catch (x) { setMsg(x.message); }
  }
  const fields = (v, set_) => (
    <>
      <input placeholder="Nama event" value={v.nama} onChange={(e) => set_({ ...v, nama: e.target.value })} required />
      <input placeholder="Lokasi" value={v.lokasi || ''} onChange={(e) => set_({ ...v, lokasi: e.target.value })} />
      <input type="date" value={v.mulai} onChange={(e) => set_({ ...v, mulai: e.target.value })} required />
      <input type="date" value={v.selesai} onChange={(e) => set_({ ...v, selesai: e.target.value })} required />
    </>
  );
  return (
    <>
      <h2>Event</h2>
      {isAdmin && !ed && <form className="card row" onSubmit={add}>{fields(f, setF)}<button>Tambah</button></form>}
      {isAdmin && ed && (
        <form className="card row" onSubmit={save}>{fields(ed, setEd)}
          <button>Simpan</button><button type="button" onClick={() => setEd(null)}>Batal</button></form>
      )}
      {msg && <p className="err">{msg}</p>}
      {events === undefined ? <p>Memuat…</p> : (
        <table><thead><tr><th>Event</th><th>Lokasi</th><th>Mulai</th><th>Selesai</th><th>Aset</th><th>Teknisi</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>{list(events).sort((a, b) => b.mulai.localeCompare(a.mulai)).map((e) => (
            <tr key={e.id}><td>{e.nama}</td><td>{e.lokasi || '-'}</td><td>{e.mulai}</td><td>{e.selesai}</td><td>{count(e.id)}</td>
              <td><Assign ev={e} users={users} isAdmin={isAdmin} /></td>
              {isAdmin && <td><button onClick={() => setEd({ id: e.id, nama: e.nama, lokasi: e.lokasi || '', mulai: e.mulai, selesai: e.selesai })}>Edit</button>{' '}
                <button onClick={() => del(e)}>Hapus</button></td>}</tr>
          ))}</tbody></table>
      )}
    </>
  );
}
