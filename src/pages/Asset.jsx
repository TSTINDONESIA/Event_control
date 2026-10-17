import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, useByChild, list, assetUrl, audit, fmt, today, range } from '../util.js';
import { allocate, actionsFor, runAction } from '../flow.js';
import { QR, Badge, Band, Stepper, Loading } from '../components.jsx';
import { STATUS, TIPE, norm } from './status.js';
import DamageReport from '../DamageReport.jsx';

export default function Asset() {
  const { id } = useParams();
  const { profile } = useAuth();
  const nav = useNavigate();
  const a0 = useVal('assets/' + id);
  const events = useVal('events');
  const bookings = useVal('assetBookings/' + id);
  const kat = useVal('kategori');
  const staff = profile.role !== 'teknisi';
  const tx = useByChild('transactions', 'assetId', id, staff);
  const [alokEv, setAlokEv] = useState('');
  const [pickEv, setPickEv] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);

  if (a0 === undefined || events === undefined) return <div className="pad"><Loading /></div>;
  if (a0 === null) return <div className="pad"><p>Unit tidak ditemukan. <Link to="/inventaris">Kembali</Link></p></div>;
  const a = { id, ...a0, status: norm(a0.status) };
  const t = today();
  const booked = list(bookings).map((b) => ({ ...b, nama: events?.[b.id]?.nama || b.id }));
  const upcoming = booked.filter((b) => b.selesai >= t).sort((x, y) => x.mulai.localeCompare(y.mulai));
  const curEvId = a.eventId || pickEv || upcoming[0]?.id || '';
  const curEv = curEvId && events?.[curEvId] ? { id: curEvId, ...events[curEvId] } : null;
  const acts = actionsFor(a, profile.role, curEv, profile.uid);
  const main = acts.filter((x) => !x.other && !(x.needsEvent && !upcoming.length));
  const other = acts.filter((x) => x.other);
  const needEventPick = main.some((x) => x.needsEvent) && !a.eventId && upcoming.length > 1;

  async function run(fn, okText) {
    setBusy(true); setMsg(''); setOk('');
    try { await fn(); if (okText) setOk(okText); } catch (e) { setMsg(e.message); }
    setBusy(false);
  }
  const doAct = (x) => run(async () => {
    if (x.confirm && !confirm(`${x.label}: ${a.kode}?`)) return;
    await runAction(x.key, a, profile, { eventId: curEvId, catatan: note });
    setNote('');
  }, 'Tersimpan.');
  const alokasi = () => run(async () => {
    const ev = events[alokEv];
    if (!ev) throw new Error('Pilih event.');
    await allocate(a, { id: alokEv, ...ev }, events, profile.uid);
  }, 'Unit dialokasikan.');

  const final = ['servis', 'hilang', 'pensiun'].includes(a.status);
  const teknisiBlocked = profile.role === 'teknisi' && a.eventId && !curEv?.teknisi?.[profile.uid];

  return (
    <>
      <Band title={a.kode} sub={`${a.nama}${a.kategori ? ' · ' + a.kategori : ''}`}>
        <Badge s={a.status} /><Link className="btn ghost" to="/inventaris" style={{ color: '#fff' }}>← Inventaris</Link>
      </Band>
      <div className="pad">
        {final ? <p className="card flag"><b>{STATUS[a.status].label}</b>: {STATUS[a.status].desc}.</p> : <Stepper status={a.status} />}
        {msg && <p className="err" role="alert">{msg}</p>}
        {ok && <p className="okmsg" role="status">{ok}</p>}

        {main.map((x) => (
          <div className={'next' + (x.danger ? ' warn' : '')} key={x.key}>
            <h3>{x.step ? `${x.step}. ` : ''}{x.label}</h3>
            <p>{x.hint}{curEv && !x.other && <> Event: <b>{curEv.nama}</b> ({range(curEv)}).</>}</p>
            {x.key === 'siapkan' && needEventPick && (
              <p><select aria-label="Event tujuan" value={pickEv || upcoming[0].id} onChange={(e) => setPickEv(e.target.value)}>
                {upcoming.map((b) => <option key={b.id} value={b.id}>{b.nama} ({b.mulai})</option>)}</select></p>
            )}
            {x.note && <p><textarea rows="2" aria-label="Catatan kondisi" placeholder="Catatan kondisi (opsional)" value={note} onChange={(e) => setNote(e.target.value)} /></p>}
            <button className={'big' + (x.danger ? ' danger' : '')} disabled={busy} onClick={() => doAct(x)}>{x.label}</button>
          </div>
        ))}
        {main.length === 0 && !final && (
          <div className="card">
            {a.status === 'tersedia' && !upcoming.length && <p>Unit belum dialokasikan ke event (langkah 2).{staff ? ' Alokasikan di bawah atau dari halaman event.' : ''}</p>}
            {profile.role === 'teknisi' && (teknisiBlocked ? <p>Anda tidak ditugaskan pada event unit ini.</p> : <p>Tidak ada langkah yang perlu Anda kerjakan untuk status “{STATUS[a.status].label}”.</p>)}
            {profile.role === 'warehouse' && ['diterima', 'digunakan'].includes(a.status) && <p>Unit sedang di tangan teknisi. Gudang hanya melihat sampai unit dikembalikan.</p>}
          </div>
        )}

        <h2>Unit</h2>
        <div className="card detail">
          <div className="print-area label">
            <QR text={assetUrl(id)} size={170} />
            <div><b>{a.kode}</b><br />{a.nama}<br /><small>{a.kategori}</small></div>
          </div>
          <dl className="kv" style={{ flex: 1, minWidth: 220 }}>
            <dt>Status</dt><dd><Badge s={a.status} /></dd>
            <dt>Event</dt><dd>{a.eventId ? <Link to={'/event/' + a.eventId}>{events?.[a.eventId]?.nama || a.eventId}</Link> : '-'}</dd>
            <dt>Dialokasikan</dt><dd>{booked.length === 0 ? '-' : booked.map((b) => <div key={b.id}><Link to={'/event/' + b.id}>{b.nama}</Link> <small>{b.mulai} s/d {b.selesai}</small></div>)}</dd>
          </dl>
          <button className="dark" onClick={() => window.print()}>Cetak label</button>
        </div>

        {staff && (
          <>
            <div className="row">
              {edit ? (
                <form className="card row" style={{ flex: 1 }} onSubmit={(e) => { e.preventDefault(); run(async () => {
                  await update(ref(db, 'assets/' + id), { nama: edit.nama.trim(), kategori: edit.kategori.trim() });
                  await audit(profile.uid, 'edit_aset', a.kode); setEdit(null);
                }); }}>
                  <input aria-label="Nama" value={edit.nama} onChange={(e) => setEdit({ ...edit, nama: e.target.value })} required />
                  <input list="kat2" aria-label="Kategori" value={edit.kategori} onChange={(e) => setEdit({ ...edit, kategori: e.target.value })} placeholder="Kategori" />
                  <datalist id="kat2">{list(kat).map((k) => <option key={k.id} value={k.nama} />)}</datalist>
                  <button disabled={busy}>Simpan</button>
                  <button type="button" className="ghost" onClick={() => setEdit(null)}>Batal</button>
                </form>
              ) : <button className="ghost" onClick={() => setEdit({ nama: a.nama, kategori: a.kategori || '' })}>Edit data unit</button>}
            </div>

            {['tersedia', 'dialokasikan'].includes(a.status) && (
              <>
                <h2>Alokasi ke event</h2>
                <div className="card row">
                  <select aria-label="Event" value={alokEv} onChange={(e) => setAlokEv(e.target.value)}>
                    <option value="">Pilih event…</option>
                    {list(events).filter((e) => e.selesai >= t).sort((x, y) => x.mulai.localeCompare(y.mulai)).map((e) => <option key={e.id} value={e.id}>{e.nama} ({e.mulai} – {e.selesai})</option>)}
                  </select>
                  <button disabled={busy || !alokEv} onClick={alokasi}>Alokasikan</button>
                  <small>Jadwal yang bentrok otomatis ditolak.</small>
                </div>
              </>
            )}

            {other.length > 0 && (
              <>
                <h2>Tindakan lain</h2>
                <div className="card row">
                  {other.map((x) => <button key={x.key} className={x.danger ? 'danger' : 'ghost'} disabled={busy} onClick={() => doAct(x)}>{x.label}</button>)}
                </div>
              </>
            )}
            {profile.role === 'admin' && ['tersedia', 'dialokasikan'].includes(a.status) && (
              <p><button className="danger" disabled={busy} onClick={() => run(async () => {
                if (!confirm(`Hapus ${a.kode} permanen? Riwayat transaksi tetap tersimpan.`)) return;
                await update(ref(db), { ['assets/' + id]: null, ['assetBookings/' + id]: null });
                await audit(profile.uid, 'hapus_aset', a.kode);
                nav('/inventaris');
              })}>Hapus unit</button></p>
            )}

            <h2>Riwayat transaksi</h2>
            {tx === undefined ? <Loading /> : list(tx).length === 0 ? <p className="empty">Belum ada transaksi.</p> : (
              <div className="tbl"><table><thead><tr><th>Waktu</th><th>Tahap</th><th>Petugas</th><th>Event</th><th>Catatan</th></tr></thead>
                <tbody>{list(tx).sort((x, y) => y.waktu - x.waktu).map((r) => (
                  <tr key={r.id}><td>{fmt(r.waktu)}</td><td>{TIPE[r.tipe] || r.tipe}</td><td>{r.petugasNama || r.petugas}</td>
                    <td>{events?.[r.eventId]?.nama || '-'}</td><td>{[r.kondisi, r.catatan].filter(Boolean).join(' · ')}</td></tr>
                ))}</tbody></table></div>
            )}
          </>
        )}
        <DamageReport assetId={id} kode={a.kode} />
      </div>
    </>
  );
}
