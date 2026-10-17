import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, push, update, runTransaction } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, overlap, assetUrl, audit } from '../util.js';
import { QR, Badge } from '../components.jsx';
import DamageReport from '../DamageReport.jsx';

export default function Asset() {
  const { id } = useParams();
  const { profile } = useAuth();
  const a = useVal('assets/' + id);
  const events = useVal('events');
  const bookings = useVal('assetBookings/' + id);
  const [alokEv, setAlokEv] = useState('');
  const [outEv, setOutEv] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);
  const kat = useVal('kategori');
  const canWrite = profile.role !== 'teknisi';

  if (a === undefined || events === undefined) return <p>Memuat…</p>;
  if (a === null) return <p>Aset tidak ditemukan. <Link to="/inventaris">Kembali</Link></p>;
  const evs = list(events);
  const booked = list(bookings).map((b) => ({ ...b, nama: events?.[b.id]?.nama || b.id }));

  async function run(fn) {
    setBusy(true); setMsg('');
    try { await fn(); } catch (e) { setMsg(e.message); }
    setBusy(false);
  }
  async function change(from, to, tipe, extra = {}) {
    const r = await runTransaction(ref(db, 'assets/' + id), (cur) => {
      if (cur === null) return cur;
      if (!from.includes(cur.status)) return; // abort: status sudah berubah
      const n = { ...cur, status: to };
      if (extra.eventId) n.eventId = extra.eventId; else delete n.eventId;
      return n;
    });
    if (!r.committed || r.snapshot.val()?.status !== to) throw new Error('Status aset sudah berubah. Muat ulang halaman.');
    await push(ref(db, 'transactions'), {
      tipe, assetId: id, kode: a.kode, petugas: profile.uid, petugasNama: profile.nama, waktu: Date.now(), ...extra,
    });
    await audit(profile.uid, tipe, a.kode);
  }
  const alokasi = () => run(async () => {
    const ev = events[alokEv];
    if (!ev) throw new Error('Pilih event.');
    let conflict = '';
    const r = await runTransaction(ref(db, 'assetBookings/' + id), (cur) => {
      conflict = '';
      const c = cur || {};
      for (const [eid, b] of Object.entries(c)) {
        if (eid !== alokEv && overlap(b, ev)) { conflict = events[eid]?.nama || eid; return; }
      }
      c[alokEv] = { mulai: ev.mulai, selesai: ev.selesai };
      return c;
    });
    if (!r.committed) throw new Error(`Bentrok jadwal dengan event "${conflict}". Alokasi ditolak.`);
    if (a.status === 'tersedia') await update(ref(db, 'assets/' + id), { status: 'dialokasikan' });
    await audit(profile.uid, 'alokasi', `${a.kode} -> ${ev.nama}`);
  });
  const keluar = () => run(async () => {
    if (!outEv) throw new Error('Pilih event tujuan (aset harus dialokasikan dulu).');
    if (!confirm(`Keluarkan ${a.kode} untuk "${events[outEv]?.nama}"?`)) return;
    await change(['tersedia', 'dialokasikan'], 'keluar', 'keluar', { eventId: outEv });
  });
  const masuk = (baik) => run(async () => {
    if (!confirm(`Terima kembali ${a.kode} dalam kondisi ${baik ? 'BAIK' : 'RUSAK'}?`)) return;
    await change(['keluar', 'digunakan'], baik ? 'tersedia' : 'rusak', 'masuk', { kondisi: baik ? 'baik' : 'rusak' });
  });
  const pulih = (to, tipe) => run(() => change(['rusak', 'servis', 'hilang'], to, tipe));

  return (
    <>
      <p><Link to="/inventaris">← Inventaris</Link></p>
      <div className="card detail">
        <div className="print-area label">
          <QR text={assetUrl(id)} size={180} />
          <div><b>{a.kode}</b><br />{a.nama}<br /><small>{a.kategori}</small></div>
        </div>
        <div>
          <h2>{a.kode} — {a.nama}</h2>
          <p>Status: <Badge s={a.status} />{a.eventId && ` · event: ${events?.[a.eventId]?.nama || a.eventId}`}</p>
          <button onClick={() => window.print()}>Cetak label</button>
        </div>
      </div>
      {canWrite && (edit ? (
        <form className="card row" onSubmit={(e) => { e.preventDefault(); run(async () => {
          await update(ref(db, 'assets/' + id), { nama: edit.nama.trim(), kategori: edit.kategori.trim() });
          await audit(profile.uid, 'edit_aset', a.kode); setEdit(null);
        }); }}>
          <input value={edit.nama} onChange={(e) => setEdit({ ...edit, nama: e.target.value })} required />
          <input list="kat2" value={edit.kategori} onChange={(e) => setEdit({ ...edit, kategori: e.target.value })} placeholder="Kategori" />
          <datalist id="kat2">{list(kat).map((k) => <option key={k.id} value={k.nama} />)}</datalist>
          <button disabled={busy}>Simpan</button>
          <button type="button" onClick={() => setEdit(null)}>Batal</button>
        </form>
      ) : <button onClick={() => setEdit({ nama: a.nama, kategori: a.kategori || '' })}>Edit data</button>)}
      <h3>Alokasi event</h3>
      {booked.length === 0 ? <p>Belum dialokasikan.</p> : (
        <ul>{booked.map((b) => <li key={b.id}>{b.nama} ({b.mulai} s/d {b.selesai})</li>)}</ul>
      )}
      {msg && <p className="err">{msg}</p>}
      {canWrite && (
        <div className="card row">
          <select value={alokEv} onChange={(e) => setAlokEv(e.target.value)}>
            <option value="">— alokasikan ke event —</option>
            {evs.map((e) => <option key={e.id} value={e.id}>{e.nama} ({e.mulai}–{e.selesai})</option>)}
          </select>
          <button disabled={busy || !alokEv} onClick={alokasi}>Alokasikan</button>
        </div>
      )}
      {canWrite && ['tersedia', 'dialokasikan'].includes(a.status) && (
        <div className="card row">
          <select value={outEv} onChange={(e) => setOutEv(e.target.value)}>
            <option value="">— keluarkan untuk event —</option>
            {booked.map((b) => <option key={b.id} value={b.id}>{b.nama}</option>)}
          </select>
          <button disabled={busy || !outEv} onClick={keluar}>Keluarkan</button>
        </div>
      )}
      {canWrite && ['keluar', 'digunakan'].includes(a.status) && (
        <div className="card row">
          <button disabled={busy} onClick={() => masuk(true)}>Terima kembali (baik)</button>
          <button disabled={busy} onClick={() => masuk(false)}>Terima kembali (rusak)</button>
        </div>
      )}
      {canWrite && ['rusak', 'servis', 'hilang'].includes(a.status) && (
        <div className="card row">
          {a.status === 'rusak' && <button disabled={busy} onClick={() => pulih('servis', 'servis')}>Kirim servis</button>}
          <button disabled={busy} onClick={() => pulih('tersedia', 'pulih')}>Tandai tersedia</button>
        </div>
      )}
      {canWrite && ['tersedia', 'dialokasikan', 'keluar', 'digunakan'].includes(a.status) && (
        <div className="card row">
          <button disabled={busy} onClick={() => run(async () => {
            if (!confirm(`Tandai ${a.kode} RUSAK?`)) return;
            await change(['tersedia', 'dialokasikan', 'keluar', 'digunakan'], 'rusak', 'rusak', { kondisi: 'rusak' });
          })}>Tandai rusak</button>
        </div>
      )}
      <DamageReport assetId={id} kode={a.kode} />
    </>
  );
}
