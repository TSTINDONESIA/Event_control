import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, push, set, remove } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, overlap, range, unitsOf, audit } from '../util.js';
import { allocate, release } from '../flow.js';
import { FREE, norm } from './status.js';
import { Band, Badge, Progress, Loading } from '../components.jsx';
import Assign from '../Assign.jsx';
import Serah from '../Serah.jsx';

export default function EventDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin';
  const canManage = profile.role !== 'teknisi';
  const raw = useVal('events/' + id);
  const events = useVal('events');
  const assets = useVal('assets');
  const bookings = useVal('assetBookings');
  const kat = useVal('kategori');
  const cl = useVal('checklist/' + id) || {};
  const users = useVal(isAdmin ? 'users' : 'users/' + profile.uid);
  const [need, setNeed] = useState({ kategori: '', jumlah: 1 });
  const [manual, setManual] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  if (raw === undefined || assets === undefined || bookings === undefined || events === undefined) return <div className="pad"><Loading /></div>;
  if (raw === null) return <div className="pad"><p>Event tidak ditemukan. <Link to="/event">Kembali</Link></p></div>;
  const ev = { id, ...raw };
  const all = list(assets).map((a) => ({ ...a, status: norm(a.status) }));
  const units = unitsOf(id, bookings, all).sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
  const mine = (a) => a.eventId === id;
  const free = all.filter((a) => FREE.includes(a.status) && !bookings?.[a.id]?.[id]
    && !Object.entries(bookings?.[a.id] || {}).some(([eid, b]) => eid !== id && overlap(b, ev)));
  const catOf = (a) => a.kategori || '';
  const kebutuhan = list(ev.kebutuhan);
  const stat = {
    all: units.length,
    prep: units.filter((u) => mine(u) && u.status === 'disiapkan').length,
    field: units.filter((u) => mine(u) && ['keluar', 'diterima', 'digunakan'].includes(u.status)).length,
    back: units.filter((u) => mine(u) && u.status === 'menunggu_kembali').length,
  };
  const checked = units.filter((u) => cl[u.id]?.ok).length;

  async function run(fn) { setBusy(true); setMsg(''); try { await fn(); } catch (e) { setMsg(e.message); } setBusy(false); }
  const allocMany = (pick) => run(async () => {
    const errs = [];
    for (const u of pick) { try { await allocate(u, ev, events, profile.uid); } catch (e) { errs.push(e.message); } }
    if (errs.length) throw new Error(errs.join(' '));
  });
  const addNeed = (e) => { e.preventDefault(); run(async () => {
    await set(push(ref(db, `events/${id}/kebutuhan`)), { kategori: need.kategori.trim(), jumlah: Math.max(1, parseInt(need.jumlah, 10) || 1) });
    await audit(profile.uid, 'kebutuhan_event', `${ev.nama}: ${need.kategori} x${need.jumlah}`);
    setNeed({ kategori: '', jumlah: 1 });
  }); };

  return (
    <>
      <Band title={ev.nama} sub={`${range(ev)}${ev.lokasi ? ' · ' + ev.lokasi : ''}`}><Link className="btn ghost" to="/event" style={{ color: '#fff' }}>← Semua event</Link></Band>
      <div className="pad">
        <div className="tiles">
          <div className="tile light"><div className="num">{stat.all}</div><div className="lbl">Unit dialokasikan</div></div>
          <div className="tile light"><div className="num">{stat.prep}</div><div className="lbl">Sedang disiapkan</div></div>
          <div className="tile light"><div className="num">{stat.field}</div><div className="lbl">Di lapangan</div></div>
          <div className="tile light"><div className="num">{stat.back}</div><div className="lbl">Menunggu dicek gudang</div></div>
        </div>
        <div className="card" style={{ marginTop: 18 }}>
          <b>Teknisi bertugas</b><div style={{ marginTop: 8 }}><Assign ev={ev} users={users} isAdmin={isAdmin} />
            {!Object.keys(ev.teknisi || {}).length && !isAdmin && <small>Belum ada teknisi ditugaskan.</small>}</div>
          {stat.all > 0 && <div style={{ marginTop: 14 }}><Progress value={checked} max={stat.all} label="Checklist setup" yellow /></div>}
        </div>
        {msg && <p className="err" role="alert">{msg}</p>}

        <Serah ev={ev} units={units} />

        <h2>Kebutuhan peralatan &amp; cek stok</h2>
        <p><small>Stok dicek berdasarkan tanggal event ({range(ev)}). Unit yang sudah dialokasikan ke event lain pada tanggal yang bertabrakan tidak dihitung tersedia.</small></p>
        {canManage && (
          <form className="card row" onSubmit={addNeed}>
            <input list="katN" aria-label="Kategori" placeholder="Kategori peralatan" value={need.kategori} onChange={(e) => setNeed({ ...need, kategori: e.target.value })} required />
            <datalist id="katN">{list(kat).map((k) => <option key={k.id} value={k.nama} />)}</datalist>
            <input type="number" min="1" aria-label="Jumlah" value={need.jumlah} onChange={(e) => setNeed({ ...need, jumlah: e.target.value })} style={{ width: 90 }} />
            <button disabled={busy}>Tambah kebutuhan</button>
          </form>
        )}
        {kebutuhan.length === 0 ? <p className="empty">Belum ada kebutuhan peralatan. Tambahkan kategori dan jumlah yang diperlukan.</p> : (
          <div className="tbl"><table><thead><tr><th>Kategori</th><th>Butuh</th><th>Teralokasi</th><th>Tersedia di tanggal ini</th><th>Status</th>{canManage && <th></th>}</tr></thead>
            <tbody>{kebutuhan.map((k) => {
              const got = units.filter((u) => catOf(u) === k.kategori).length;
              const fr = free.filter((u) => catOf(u) === k.kategori);
              const gap = Math.max(0, k.jumlah - got);
              const take = Math.min(gap, fr.length);
              return (
                <tr key={k.id}><td>{k.kategori}</td><td>{k.jumlah}</td><td>{got}</td><td>{fr.length}</td>
                  <td>{gap === 0 ? <span className="badge tersedia">Terpenuhi</span> : fr.length < gap ? <span className="badge menunggu_kembali">Kurang {gap - fr.length} unit</span> : <span className="badge dialokasikan">Siap dialokasikan</span>}</td>
                  {canManage && <td><div className="row">
                    <button disabled={busy || take === 0} onClick={() => allocMany(fr.sort((a, b) => (a.kode || '').localeCompare(b.kode || '')).slice(0, take))}>Alokasikan {take || ''}</button>
                    <button className="danger" disabled={busy} onClick={() => run(() => remove(ref(db, `events/${id}/kebutuhan/${k.id}`)))}>Hapus</button></div></td>}
                </tr>
              );
            })}</tbody></table></div>
        )}
        {canManage && free.length > 0 && (
          <div className="card row"><b>Tambah unit manual</b>
            <select aria-label="Pilih unit" value={manual} onChange={(e) => setManual(e.target.value)}>
              <option value="">Pilih unit tersedia…</option>
              {free.sort((a, b) => (a.kode || '').localeCompare(b.kode || '')).map((u) => <option key={u.id} value={u.id}>{u.kode} · {u.nama}</option>)}
            </select>
            <button disabled={busy || !manual} onClick={() => allocMany([free.find((u) => u.id === manual)]).then(() => setManual(''))}>Alokasikan</button>
          </div>
        )}

        <h2>Unit untuk event ini ({units.length})</h2>
        {units.length === 0 ? <p className="empty">Belum ada unit dialokasikan.</p> : (
          <div className="tbl"><table><thead><tr><th>Unit</th><th>Nama</th><th>Kategori</th><th>Status</th><th>Setup</th>{canManage && <th></th>}</tr></thead>
            <tbody>{units.map((u) => (
              <tr key={u.id}><td><Link to={'/aset/' + u.id}>{u.kode}</Link></td><td>{u.nama}</td><td>{u.kategori || '-'}</td>
                <td>{mine(u) || ['tersedia', 'dialokasikan'].includes(u.status) ? <Badge s={u.status} /> : <><Badge s={u.status} /> <small>(dipakai event lain)</small></>}</td>
                <td>{cl[u.id]?.ok ? <small>✓ {cl[u.id].nama}</small> : '-'}</td>
                {canManage && <td>{['tersedia', 'dialokasikan', 'disiapkan'].includes(u.status) && (mine(u) || u.status !== 'disiapkan') &&
                  <button className="ghost" disabled={busy} onClick={() => run(() => release(u, id, bookings?.[u.id], profile.uid, ev.nama))}>Lepas</button>}</td>}
              </tr>
            ))}</tbody></table></div>
        )}
      </div>
    </>
  );
}
