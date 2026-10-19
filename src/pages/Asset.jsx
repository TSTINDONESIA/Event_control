import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, useByChild, labelId, list, assetUrl, audit, fmt, katOptions } from '../util.js';
import { tandai } from '../flow.js';
import { QR, Badge, Band, Loading } from '../components.jsx';
import { STATUS, TIPE, norm } from './status.js';

export default function Asset() {
  const { id } = useParams();
  const { profile } = useAuth();
  const nav = useNavigate();
  const a0 = useVal('assets/' + id);
  const events = useVal('events');
  const assetsAll = useVal('assets');
  const staff = profile.role !== 'teknisi';
  const tx = useByChild('transactions', 'assetId', id, staff);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);

  if (a0 === undefined || events === undefined) return <div className="pad"><Loading /></div>;
  if (a0 === null) return (
    <div className="pad">
      {profile.role !== 'teknisi' && labelId(id) ? (
        <div className="next"><h3>Label ini belum terdaftar</h3><p>Isi nama dan kategori barang agar masuk ke stok.</p><Link className="btn big" to={'/daftar?id=' + id}>Daftarkan unit ini</Link></div>
      ) : <p>Unit tidak ditemukan. <Link to="/inventaris">Kembali</Link></p>}
    </div>
  );
  const a = { id, ...a0, status: norm(a0.status) };
  async function run(fn, okText) {
    setBusy(true); setMsg(''); setOk('');
    try { await fn(); if (okText) setOk(okText); } catch (e) { setMsg(e.message); }
    setBusy(false);
  }
  const ubah = (ke, label) => run(async () => {
    if (!confirm(`${label}: ${a.kode}?`)) return;
    await tandai(a, ke, profile, note.trim());
    setNote('');
  }, 'Tersimpan.');

  return (
    <>
      <Band title={a.kode} sub={`${a.nama}${a.kategori ? ' · ' + a.kategori : ''}`}>
        <Badge s={a.status} /><Link className="btn ghost" to="/inventaris" style={{ color: '#fff' }}>← Inventaris</Link>
      </Band>
      <div className="pad">
        {msg && <p className="err" role="alert">{msg}</p>}
        {ok && <p className="okmsg" role="status">{ok}</p>}

        <h2>Unit</h2>
        <div className="card detail">
          <div className="print-area label">
            <QR text={assetUrl(id)} size={170} />
            <div><b>{a.kode}</b><br />{a.nama}<br /><small>{a.kategori}</small></div>
          </div>
          <dl className="kv" style={{ flex: 1, minWidth: 220 }}>
            <dt>Status</dt><dd><Badge s={a.status} /></dd>
            <dt>Event</dt><dd>{a.eventId ? <Link to={'/event/' + a.eventId}>{events?.[a.eventId]?.nama || a.eventId}</Link> : '-'}</dd>
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
                  <datalist id="kat2">{katOptions(assetsAll).map((k) => <option key={k} value={k} />)}</datalist>
                  <button disabled={busy}>Simpan</button>
                  <button type="button" className="ghost" onClick={() => setEdit(null)}>Batal</button>
                </form>
              ) : <button className="ghost" onClick={() => setEdit({ nama: a.nama, kategori: a.kategori || '' })}>Edit data unit</button>}
            </div>

            <h2>Tindakan manual</h2>
            <div className="card row">
              <input aria-label="Catatan" placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: 1 }} />
              {a.status !== 'servis' && <button className="ghost" disabled={busy} onClick={() => ubah('servis', 'Tandai servis / rusak')}>Tandai rusak</button>}
              {a.status !== 'hilang' && <button className="danger" disabled={busy} onClick={() => ubah('hilang', 'Tandai hilang')}>Tandai hilang</button>}
              {['servis', 'hilang'].includes(a.status) && <button disabled={busy} onClick={() => ubah('tersedia', 'Tandai tersedia')}>Tandai tersedia</button>}
            </div>
            {profile.role === 'admin' && a.status === 'tersedia' && (
              <p><button className="danger" disabled={busy} onClick={() => run(async () => {
                if (!confirm(`Hapus ${a.kode} permanen? Riwayat transaksi tetap tersimpan.`)) return;
                await update(ref(db), { ['assets/' + id]: null });
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
      </div>
    </>
  );
}
