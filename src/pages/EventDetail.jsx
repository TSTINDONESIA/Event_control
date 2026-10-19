import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, push, set, remove } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, range, audit, fmt } from '../util.js';
import { siapkan, batalSiapkan, kirim, terimaKembali, selesaikanEvent } from '../flow.js';
import { norm, TAHAP } from './status.js';
import { Band, Badge, Loading } from '../components.jsx';
import Assign from '../Assign.jsx';
import Scanner, { findAsset } from '../Scanner.jsx';
import PresetPicker from '../PresetPicker.jsx';
import { PRESET_NAMES } from '../presets.js';

export default function EventDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin';
  const isGudang = profile.role === 'warehouse' || isAdmin;
  const raw = useVal('events/' + id);
  const assets = useVal('assets');
  const serah = useVal('serahTerima/' + id);
  const users = useVal(isAdmin ? 'users' : 'users/' + profile.uid);
  const [mode, setMode] = useState('');            // '' | 'siapkan' | 'kembali'
  const [rusak, setRusak] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [need, setNeed] = useState({ kategori: '', jumlah: 1 });
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  if (raw === undefined || assets === undefined) return <div className="pad"><Loading /></div>;
  if (raw === null) return <div className="pad"><p>Event tidak ditemukan. <Link to="/event">Kembali</Link></p></div>;
  const ev = { id, ...raw };
  const tahap = ev.tahap || 'rencana';
  const all = list(assets).map((a) => ({ ...a, status: norm(a.status) }));
  const siap = all.filter((a) => a.eventId === id && a.status === 'disiapkan').sort((a, b) => a.kode.localeCompare(b.kode));
  const dikirimIds = new Set(list(serah).flatMap((r) => (r.tipe === 'keluar' ? Object.keys(r.units || {}) : [])));
  const sent = all.filter((a) => dikirimIds.has(a.id));
  const masihDiTeknisi = sent.filter((a) => a.status === 'keluar' && a.eventId === id);
  const sudahKembali = sent.filter((a) => !(a.status === 'keluar' && a.eventId === id));
  const kebutuhan = list(ev.kebutuhan);
  const planned = [...siap, ...masihDiTeknisi];
  // jumlah siap per baris: hitung dari unit ber-QR; bila tidak ada unit QR, pakai angka yang diisi gudang
  const siapOf = (k) => { const n = planned.concat(sudahKembali).filter((u) => u.kategori === k.kategori).length; return n > 0 ? n : (k.siap || 0); };
  const setSiap = (k, v) => run(() => set(ref(db, `events/${id}/kebutuhan/${k.id}/siap`), Math.max(0, parseInt(v, 10) || 0)));

  async function run(fn, okText) {
    setBusy(true); setMsg(''); setOk('');
    try { await fn(); if (okText) setOk(okText); } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  async function onScan(text) {
    const a = findAsset(assets, text);
    if (!a) { setMsg('QR / kode tidak dikenali: ' + text); setOk(''); return; }
    setMsg(''); setOk('');
    try {
      if (mode === 'siapkan') {
        await siapkan(a, ev, profile);
        setOk(`✓ ${a.kode} ${a.nama} siap.` + '');
      } else if (mode === 'kembali') {
        if (norm(a.status) !== 'keluar' || a.eventId !== id) throw new Error(`${a.kode} tidak sedang dikirim untuk event ini.`);
        await terimaKembali(a, ev, profile, { rusak, catatan });
        setOk(`✓ ${a.kode} ${a.nama} kembali${rusak ? ' (rusak, dicatat ke laporan)' : ''}.`);
        setRusak(false); setCatatan('');
        if (masihDiTeknisi.length === 1) await selesaikanEvent(ev, profile);
      }
    } catch (e) { setMsg(e.message); }
  }

  const doKirim = () => run(async () => {
    if (!confirm(`Kirim ${siap.length} unit ber-QR ke teknisi? Ini tercatat di laporan admin.`)) return;
    const items = Object.fromEntries(kebutuhan.map((k) => [k.id, { nama: k.kategori, diminta: k.jumlah, disiapkan: siapOf(k) }]));
    const r = await kirim(siap, ev, profile, items);
    setMode('');
    if (r.gagal.length) throw new Error(r.gagal.join(' '));
  }, 'Terkirim. Tercatat di laporan admin.');

  const addMany = (rows) => run(async () => {
    for (const r of rows) {
      const dup = kebutuhan.find((k) => k.kategori === r.kategori && (k.grup || '') === r.grup);
      if (dup) await set(ref(db, `events/${id}/kebutuhan/${dup.id}/jumlah`), dup.jumlah + r.jumlah);
      else await set(push(ref(db, `events/${id}/kebutuhan`)), { ...r, dari: isAdmin ? 'admin' : 'gudang' });
    }
    await audit(profile.uid, 'kebutuhan_event', `${ev.nama}: ${rows.length} jenis alat`);
  });
  const addNeed = (e) => { e.preventDefault(); run(async () => {
    await set(push(ref(db, `events/${id}/kebutuhan`)), { kategori: need.kategori.trim(), jumlah: Math.max(1, parseInt(need.jumlah, 10) || 1), dari: isAdmin ? 'admin' : 'gudang' });
    await audit(profile.uid, 'kebutuhan_event', `${ev.nama}: ${need.kategori} x${need.jumlah}`);
    setNeed({ kategori: '', jumlah: 1 });
  }); };

  const t = TAHAP[tahap] || TAHAP.rencana;
  return (
    <>
      <Band title={ev.nama} sub={`${range(ev)}${ev.lokasi ? ' · ' + ev.lokasi : ''}`}>
        <span className={'badge ' + t.cls}>{t.label}</span>
        <Link className="btn ghost" to={'/surat-jalan/' + id} style={{ color: '#fff' }}>Surat Jalan</Link>
        <Link className="btn ghost" to="/event" style={{ color: '#fff' }}>← Semua tugas</Link>
      </Band>
      <div className="pad">
        <div className="card">
          <b>Teknisi bertugas</b>
          <div style={{ marginTop: 8 }}><Assign ev={ev} users={users} isAdmin={isAdmin} />
            {!Object.keys(ev.teknisi || {}).length && <small>Belum ada teknisi ditugaskan.</small>}</div>
        </div>
        {msg && <p className="err" role="alert">{msg}</p>}
        {ok && <p className="okmsg" role="status">{ok}</p>}

        <h2>Permintaan alat</h2>
        <p><small>Admin mengisi permintaan sebagai info. Gudang yang menentukan jumlah dan alat yang benar-benar disiapkan; gudang juga boleh menambah baris (alat penunjang lain).</small></p>
        {isGudang && tahap !== 'selesai' && (
          <form className="card row" onSubmit={addNeed}>
            <input list="katN" aria-label="Nama alat / kategori" placeholder="Nama alat / kategori (mis. Receiver)" value={need.kategori} onChange={(e) => setNeed({ ...need, kategori: e.target.value })} required />
            <datalist id="katN">{[...new Set([...PRESET_NAMES, ...all.map((a) => a.kategori).filter(Boolean)])].map((k) => <option key={k} value={k} />)}</datalist>
            <input type="number" min="1" aria-label="Jumlah" value={need.jumlah} onChange={(e) => setNeed({ ...need, jumlah: e.target.value })} style={{ width: 90 }} />
            <button disabled={busy}>Tambah</button>
          </form>
        )}
        {isGudang && tahap !== 'selesai' && <PresetPicker existing={kebutuhan} onAdd={addMany} busy={busy} />}
        {kebutuhan.length === 0 ? <p className="empty">Belum ada permintaan.</p> : (
          <div className="tbl"><table><thead><tr><th>Alat</th><th>Diminta</th><th>Disiapkan gudang</th><th></th></tr></thead>
            <tbody>{kebutuhan.map((k) => {
              const qr = planned.concat(sudahKembali).filter((u) => u.kategori === k.kategori).length;
              return (
                <tr key={k.id}><td>{k.kategori}{k.grup && <small> · {k.grup}</small>}{k.dari === 'gudang' && <small> · tambahan gudang</small>}</td><td>{k.jumlah}</td>
                  <td>{qr > 0 || !isGudang || tahap === 'selesai' ? <>{siapOf(k)}{qr > 0 && <small> (scan QR)</small>}</>
                    : <input type="number" min="0" aria-label={'Disiapkan ' + k.kategori} defaultValue={k.siap || 0} style={{ width: 80 }} onBlur={(e) => setSiap(k, e.target.value)} />}</td>
                  <td>{isGudang && tahap !== 'selesai' && <button className="danger" disabled={busy} onClick={() => run(() => remove(ref(db, `events/${id}/kebutuhan/${k.id}`)))}>Hapus</button>}</td>
                </tr>
              );
            })}</tbody></table></div>
        )}

        {isGudang && tahap !== 'selesai' && (
          <>
            <h2>Kerjakan</h2>
            <div className="row" style={{ marginBottom: 12 }}>
              <button className={'big' + (mode === 'siapkan' ? ' dark' : '')} onClick={() => setMode(mode === 'siapkan' ? '' : 'siapkan')}>{mode === 'siapkan' ? 'Selesai scan' : '1. Siapkan (scan QR)'}</button>
              <button className="big" disabled={busy || siap.length === 0} onClick={doKirim}>2. Kirim ke teknisi ({siap.length})</button>
              {masihDiTeknisi.length > 0 && <button className={'big' + (mode === 'kembali' ? ' dark' : '')} onClick={() => setMode(mode === 'kembali' ? '' : 'kembali')}>{mode === 'kembali' ? 'Selesai scan' : '3. Terima kembali (scan QR)'}</button>}
            </div>
            {mode === 'siapkan' && <p><small>Scan QR setiap alat yang diambil dari rak. Alat langsung masuk daftar “siap kirim”.</small></p>}
            {mode === 'kembali' && (
              <div className="card row">
                <label><input type="checkbox" checked={rusak} onChange={(e) => setRusak(e.target.checked)} /> Alat berikutnya rusak</label>
                {rusak && <input aria-label="Catatan kerusakan" placeholder="Catatan kerusakan" value={catatan} onChange={(e) => setCatatan(e.target.value)} style={{ flex: 1 }} />}
              </div>
            )}
            {mode && <Scanner onScan={onScan} />}
          </>
        )}

        <h2>Siap kirim ({siap.length})</h2>
        {siap.length === 0 ? <p className="empty">Belum ada alat yang disiapkan.</p> : (
          <div className="tbl"><table><thead><tr><th>Unit</th><th>Nama</th><th>Kategori</th>{isGudang && <th></th>}</tr></thead>
            <tbody>{siap.map((u) => (
              <tr key={u.id}><td><Link to={'/aset/' + u.id}>{u.kode}</Link></td><td>{u.nama}</td><td>{u.kategori || '-'}</td>
                {isGudang && <td><button className="ghost" disabled={busy} onClick={() => run(() => batalSiapkan(u, ev, profile))}>Batal</button></td>}</tr>
            ))}</tbody></table></div>
        )}

        {sent.length > 0 && (
          <>
            <h2>Sudah dikirim ke teknisi ({sent.length})</h2>
            <div className="tbl"><table><thead><tr><th>Unit</th><th>Nama</th><th>Kategori</th><th>Status</th></tr></thead>
              <tbody>{sent.sort((a, b) => a.kode.localeCompare(b.kode)).map((u) => (
                <tr key={u.id}><td><Link to={'/aset/' + u.id}>{u.kode}</Link></td><td>{u.nama}</td><td>{u.kategori || '-'}</td>
                  <td>{u.status === 'keluar' && u.eventId === id ? <Badge s="keluar" /> : <><Badge s={u.status} /> <small>kembali</small></>}</td></tr>
              ))}</tbody></table></div>
            <p><small>{list(serah).filter((r) => r.tipe === 'keluar').map((r) => `Dikirim ${fmt(r.waktu)} oleh ${r.nama} (${r.jumlah} unit)`).join(' · ')}</small></p>
          </>
        )}
        {isGudang && tahap === 'dikirim' && masihDiTeknisi.length === 0 && (
          <p><button disabled={busy} onClick={() => run(() => selesaikanEvent(ev, profile))}>Tandai event selesai</button></p>
        )}
      </div>
    </>
  );
}
