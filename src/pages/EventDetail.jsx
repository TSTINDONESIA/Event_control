import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ref, push, set, remove } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, range, audit, fmt } from '../util.js';
import { siapkan, batalSiapkan, kirim, terimaKembali, selesaikanEvent, selesaiSiapkan, bukaPenyiapan, terimaTeknisi, kembalikanKeGudang } from '../flow.js';
import { norm, TAHAP } from './status.js';
import { kirimPdf, bagikanPdf, fileName } from '../pdf.js';
import { Band, Badge, Loading } from '../components.jsx';
import Assign from '../Assign.jsx';
import Scanner, { findAsset } from '../Scanner.jsx';
import { PRESET_NAMES, isKabel } from '../presets.js';
import { rekap, permintaanText } from '../rekap.js';

const CSS = `
.stp{list-style:none;margin:0 0 16px;padding:0;border:2px solid #000;background:#fff}
.stp li{display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border-bottom:1px solid #e5e5e0}
.stp li:last-child{border-bottom:0}
.stp .dot{flex:0 0 26px;height:26px;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px}
.stp li.done .dot{background:#000;color:var(--yellow,#fae24a)}
.stp li.now{background:var(--yellow,#fae24a)}
.stp li.now .dot{background:#000;color:#fff}
.stp b{display:block}
.stp small{color:#555}
.act{border:2px solid #000;border-left-width:8px;border-left-color:var(--yellow,#fae24a);background:#fff;padding:12px;margin-bottom:16px}
.act p{margin:0 0 10px}
`;

const ORDER = ['rencana', 'siap', 'dikirim', 'diterima', 'kembali', 'selesai'];

export default function EventDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin';
  const isGudang = profile.role === 'warehouse' || isAdmin;
  const raw = useVal('events/' + id);
  const assets = useVal('assets');
  const serah = useVal('serahTerima/' + id);
  const cl = useVal('checklist/' + id);
  const users = useVal(isAdmin ? 'users' : 'users/' + profile.uid);
  const [mode, setMode] = useState('');            // '' | 'siapkan' | 'kembali'
  const [rusak, setRusak] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [need, setNeed] = useState({ kategori: '', jumlah: 1 });
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [teks, setTeks] = useState(null);          // null = tidak sedang mengedit kebutuhan
  const [conf, setConf] = useState('');           // tombol yang menunggu ketukan konfirmasi

  if (raw === undefined || assets === undefined) return <div className="pad"><Loading /></div>;
  if (raw === null) return <div className="pad"><p>Event tidak ditemukan. <Link to="/event">Kembali</Link></p></div>;
  const ev = { id, ...raw };
  const tahap = ORDER.includes(ev.tahap) ? ev.tahap : 'rencana';
  const at = ORDER.indexOf(tahap);
  const all = list(assets).map((a) => ({ ...a, status: norm(a.status) }));
  const siap = all.filter((a) => a.eventId === id && a.status === 'disiapkan').sort((a, b) => a.kode.localeCompare(b.kode));
  const dikirimIds = new Set(list(serah).flatMap((r) => (r.tipe === 'keluar' ? Object.keys(r.units || {}) : [])));
  const sent = all.filter((a) => dikirimIds.has(a.id)).sort((a, b) => a.kode.localeCompare(b.kode));
  const masihDiTeknisi = sent.filter((a) => a.status === 'keluar' && a.eventId === id);
  const sudahKembali = sent.filter((a) => !(a.status === 'keluar' && a.eventId === id));
  const tambahan = list(ev.tambahan);
  const permintaan = permintaanText(ev);
  const planned = [...siap, ...masihDiTeknisi];
  const scanned = planned.concat(sudahKembali);
  const rows = rekap(scanned, tambahan);   // ber-QR: otomatis dari scan; kabel: manual
  const isTek = !!ev.teknisi?.[profile.uid];
  const canTek = isTek || isAdmin;               // aksi teknisi (admin boleh menggantikan)
  const canEditKb = isGudang && tahap === 'rencana';
  const checked = (a) => !!cl?.[a.id]?.ok;
  const allChecked = sent.length > 0 && sent.every(checked);

  // konfirmasi ketuk dua kali (confirm() bawaan browser sering diblokir di HP)
  const tap = (key, fn) => () => { if (conf === key) { setConf(''); fn(); } else { setConf(key); setMsg(''); setOk(''); } };
  const lbl = (key, text) => (conf === key ? 'Ketuk lagi untuk konfirmasi' : text);

  async function run(fn, okText) {
    setConf(''); setBusy(true); setMsg(''); setOk('');
    try { await fn(); if (okText) setOk(okText); } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  async function onScan(text) {
    const a = findAsset(assets, text);
    if (!a) { setMsg('QR / kode tidak dikenali: ' + text); setOk(''); return; }
    setMsg(''); setOk('');
    try {
      if (mode === 'siapkan') {
        if (tahap !== 'rencana') throw new Error('Penyiapan sudah ditutup.');
        await siapkan(a, ev, profile);
        setOk(`✓ ${a.kode} ${a.nama} siap.`);
      } else if (mode === 'kembali') {
        if (tahap !== 'kembali') throw new Error('Teknisi belum menekan “Kembalikan ke gudang”.');
        if (norm(a.status) !== 'keluar' || a.eventId !== id) throw new Error(`${a.kode} tidak sedang dikirim untuk event ini.`);
        await terimaKembali(a, ev, profile, { rusak, catatan });
        setOk(`✓ ${a.kode} ${a.nama} kembali ke stok${rusak ? ' (rusak, dicatat ke laporan)' : ''}.`);
        setRusak(false); setCatatan('');
        if (masihDiTeknisi.length === 1) { await selesaikanEvent(ev, profile); setMode(''); }
      }
    } catch (e) { setMsg(e.message); }
  }

  // ---- gudang ----
  const buatPdf = (units, waktu, oleh) => kirimPdf({
    nama: ev.nama, lokasi: ev.lokasi || '-', tanggal: range(ev),
    teknisi: Object.values(ev.teknisi || {}).join(', ') || '-',
    gudang: oleh || profile.nama, waktu: fmt(waktu || Date.now()),
    permintaan, rows: rows.map((r) => ({ alat: r.nama, jumlah: r.jumlah })),
    units: units.map((u) => ({ kode: u.kode, nama: u.nama, kategori: u.kategori })),
  });
  const pdfName = `Kirim-${fileName(ev.nama)}.pdf`;

  const doSudahSiap = () => run(async () => {
    if (siap.length === 0) throw new Error('Scan minimal satu alat dulu.');
    await selesaiSiapkan(ev, profile);
    setMode('');
  }, 'Penyiapan ditutup. Tekan “PDF Kirim ke teknisi”.');

  const doBukaLagi = () => run(() => bukaPenyiapan(ev, profile), 'Penyiapan dibuka lagi.');

  const doKirim = () => run(async () => {
    const items = Object.fromEntries(rows.map((r, i) => ['r' + i, { nama: r.nama, diminta: '-', disiapkan: r.jumlah }]));
    const r = await kirim(siap, ev, profile, items);
    if (r.gagal.length) throw new Error(r.gagal.join(' '));
    await bagikanPdf(buatPdf(r.ok, Date.now(), profile.nama), pdfName, 'Alat ' + ev.nama);
  }, 'Terkirim ke teknisi. PDF dibuat, kirim lewat WhatsApp bila perlu.');

  const doUlangPdf = () => run(() => bagikanPdf(buatPdf(sent, ev.dikirimWaktu, ev.dikirimOleh), pdfName, 'Alat ' + ev.nama));

  // ---- teknisi ----
  const toggle = (a, v) => run(() => set(ref(db, `checklist/${id}/${a.id}`), { ok: v, uid: profile.uid, nama: profile.nama, waktu: Date.now() }));
  const doTerima = () => run(async () => {
    await terimaTeknisi(ev, sent.length, profile);
  }, 'Alat lengkap diterima. Selamat bertugas.');
  const doKembalikan = () => run(async () => {
    await kembalikanKeGudang(ev, profile);
  }, 'Sudah dikembalikan. Gudang akan scan barang kembali.');

  // ---- kabel / barang tanpa barcode (manual, gudang) ----
  const addNeed = (e) => { e.preventDefault(); run(async () => {
    await set(push(ref(db, `events/${id}/tambahan`)), { nama: need.kategori.trim(), jumlah: Math.max(1, parseInt(need.jumlah, 10) || 1) });
    setNeed({ kategori: '', jumlah: 1 });
  }); };
  const simpanTeks = () => run(async () => {
    await set(ref(db, `events/${id}/kebutuhanTeks`), teks.trim() || null);
    await audit(profile.uid, 'kebutuhan_event', ev.nama);
    setTeks(null);
  });

  const t = TAHAP[tahap] || TAHAP.rencana;
  const steps = [
    ['Event dibuat admin', true, ev.dibuatOleh ? `${ev.dibuatOleh}${ev.dibuat ? ' · ' + fmt(ev.dibuat) : ''}` : ''],
    ['Gudang menyiapkan & kirim PDF ke teknisi', at >= 2, ev.dikirimWaktu ? `${ev.dikirimOleh || ''} · ${fmt(ev.dikirimWaktu)}` : at === 1 ? 'Sudah disiapkan, tinggal kirim PDF' : ''],
    ['Teknisi: alat lengkap diterima', at >= 3, ev.diterimaWaktu ? `${ev.diterimaOleh || ''} · ${fmt(ev.diterimaWaktu)}` : ''],
    ['Teknisi: kembalikan ke gudang', at >= 4, ev.kembaliWaktu ? `${ev.kembaliOleh || ''} · ${fmt(ev.kembaliWaktu)}` : ''],
    ['Gudang: scan barang kembali, masuk stok', at >= 5, ev.selesaiWaktu ? fmt(ev.selesaiWaktu) : at === 4 ? `${masihDiTeknisi.length} unit belum di-scan` : ''],
  ];
  const nowIdx = steps.findIndex((s) => !s[1]);

  return (
    <>
      <style>{CSS}</style>
      <Band title={ev.nama} sub={`${range(ev)}${ev.lokasi ? ' · ' + ev.lokasi : ''}`}>
        <span className={'badge ' + t.cls}>{t.label}</span>
        <Link className="btn ghost" to={'/surat-jalan/' + id} style={{ color: '#fff' }}>Surat Jalan</Link>
        <Link className="btn ghost" to="/event" style={{ color: '#fff' }}>← Semua tugas</Link>
      </Band>
      <div className="pad">
        <ol className="stp">{steps.map(([label, done, info], i) => (
          <li key={label} className={done ? 'done' : i === nowIdx ? 'now' : ''}>
            <span className="dot">{done ? '✓' : i + 1}</span>
            <span><b>{label}</b>{info && <small>{info}</small>}</span>
          </li>
        ))}</ol>

        {msg && <p className="err" role="alert">{msg}</p>}
        {ok && <p className="okmsg" role="status">{ok}</p>}

        {/* ===== Aksi gudang ===== */}
        {isGudang && (
          <>
            {tahap === 'rencana' && (
              <div className="act">
                <p><b>Gudang: siapkan alat.</b> Scan QR tiap alat, lalu tekan “Sudah disiapkan”.</p>
                <div className="row">
                  <button className={'big' + (mode === 'siapkan' ? ' dark' : '')} onClick={() => setMode(mode === 'siapkan' ? '' : 'siapkan')}>{mode === 'siapkan' ? 'Selesai scan' : 'Siapkan (scan QR)'}</button>
                  <button className={'big' + (conf === 'siap' ? ' dark' : '')} disabled={busy || siap.length === 0} onClick={tap('siap', doSudahSiap)}>{lbl('siap', `Sudah disiapkan (${siap.length})`)}</button>
                </div>
                {mode === 'siapkan' && <><p><small>Alat yang di-scan masuk daftar “disiapkan”.</small></p><Scanner onScan={onScan} /></>}
              </div>
            )}
            {tahap === 'siap' && (
              <div className="act">
                <p><b>Penyiapan selesai ({siap.length} unit).</b> Kirim daftar alat ke teknisi lewat PDF.</p>
                <div className="row">
                  <button className={'big' + (conf === 'kirim' ? ' dark' : '')} disabled={busy || siap.length === 0} onClick={tap('kirim', doKirim)}>{lbl('kirim', 'PDF Kirim ke teknisi')}</button>
                  <button className="ghost" disabled={busy} onClick={doBukaLagi}>Buka lagi penyiapan</button>
                </div>
              </div>
            )}
            {tahap === 'dikirim' && (
              <div className="act"><p><b>Menunggu teknisi</b> menekan “Alat lengkap diterima”.</p>
                <button className="ghost" disabled={busy} onClick={doUlangPdf}>Unduh / kirim ulang PDF</button></div>
            )}
            {tahap === 'diterima' && <div className="act"><p><b>Alat sedang bersama teknisi.</b> Menunggu teknisi menekan “Kembalikan ke gudang”.</p></div>}
            {tahap === 'kembali' && (
              <div className="act">
                <p><b>Teknisi sudah mengembalikan.</b> Scan setiap alat yang kembali ({masihDiTeknisi.length} belum di-scan).</p>
                {masihDiTeknisi.length > 0 && <button className={'big' + (mode === 'kembali' ? ' dark' : '')} onClick={() => setMode(mode === 'kembali' ? '' : 'kembali')}>{mode === 'kembali' ? 'Selesai scan' : 'Scan barang kembali'}</button>}
                {mode === 'kembali' && (
                  <>
                    <div className="card row">
                      <label><input type="checkbox" checked={rusak} onChange={(e) => setRusak(e.target.checked)} /> Alat berikutnya rusak</label>
                      {rusak && <input aria-label="Catatan kerusakan" placeholder="Catatan kerusakan" value={catatan} onChange={(e) => setCatatan(e.target.value)} style={{ flex: 1 }} />}
                    </div>
                    <Scanner onScan={onScan} />
                  </>
                )}
                {masihDiTeknisi.length === 0 && <button disabled={busy} onClick={() => run(() => selesaikanEvent(ev, profile), 'Event selesai.')}>Tandai event selesai</button>}
              </div>
            )}
          </>
        )}

        {/* ===== Aksi teknisi ===== */}
        {canTek && tahap === 'dikirim' && (
          <div className="act">
            <p><b>Cek alat yang dikirim gudang</b> (centang tiap unit di daftar bawah), lalu terima.</p>
            <button className={'big' + (conf === 'terima' ? ' dark' : '')} disabled={busy || !allChecked} onClick={tap('terima', doTerima)}>{lbl('terima', `Alat lengkap diterima (${sent.filter(checked).length}/${sent.length})`)}</button>
            {!allChecked && <p><small>Tombol aktif setelah semua unit dicentang. Ada yang kurang? Hubungi gudang.</small></p>}
          </div>
        )}
        {canTek && tahap === 'diterima' && (
          <div className="act">
            <p><b>Event selesai?</b> Kembalikan semua alat ke gudang.</p>
            <button className={'big' + (conf === 'kembali' ? ' dark' : '')} disabled={busy} onClick={tap('kembali', doKembalikan)}>{lbl('kembali', 'Kembalikan ke gudang')}</button>
          </div>
        )}
        {!isGudang && isTek && ['rencana', 'siap'].includes(tahap) && <div className="act"><p><b>Gudang sedang menyiapkan alat.</b> Daftar lengkap muncul setelah PDF dikirim.</p></div>}
        {!isGudang && isTek && tahap === 'kembali' && <div className="act"><p><b>Menunggu gudang</b> scan barang kembali.</p></div>}

        <div className="card">
          <b>Teknisi bertugas</b>
          <div style={{ marginTop: 8 }}><Assign ev={ev} users={users} isAdmin={isAdmin} />
            {!Object.keys(ev.teknisi || {}).length && <small>Belum ada teknisi ditugaskan.</small>}</div>
        </div>

        <h2>Kebutuhan alat</h2>
        <div className="card">
          {isAdmin && teks !== null ? (
            <>
              <textarea rows="5" aria-label="Kebutuhan alat" style={{ width: '100%', boxSizing: 'border-box' }} value={teks} onChange={(e) => setTeks(e.target.value)} placeholder="Tulis bebas, mis. 1 booth, 25 receiver" />
              <div className="row" style={{ marginTop: 8 }}><button disabled={busy} onClick={simpanTeks}>Simpan</button><button className="ghost" onClick={() => setTeks(null)}>Batal</button></div>
            </>
          ) : (
            <>
              {permintaan ? <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{permintaan}</p> : <p className="empty" style={{ margin: 0 }}>Admin belum mengisi kebutuhan alat.</p>}
              {isAdmin && tahap !== 'selesai' && <p style={{ margin: '10px 0 0' }}><button className="ghost" onClick={() => setTeks(permintaan)}>Edit</button></p>}
            </>
          )}
        </div>

        <h2>Disiapkan gudang</h2>
        <p><small>Alat ber-QR terhitung otomatis dari scan (menurut kategori unit). Kabel tidak punya barcode: isi manual di bawah.</small></p>
        {canEditKb && (
          <form className="card row" onSubmit={addNeed}>
            <input list="katN" aria-label="Kabel / barang tanpa barcode" placeholder="Kabel / barang tanpa barcode" value={need.kategori} onChange={(e) => setNeed({ ...need, kategori: e.target.value })} required />
            <datalist id="katN">{PRESET_NAMES.filter(isKabel).map((k) => <option key={k} value={k} />)}</datalist>
            <input type="number" min="1" aria-label="Jumlah" value={need.jumlah} onChange={(e) => setNeed({ ...need, jumlah: e.target.value })} style={{ width: 90 }} />
            <button disabled={busy}>Tambah</button>
          </form>
        )}
        {rows.length === 0 ? <p className="empty">Belum ada alat yang disiapkan.</p> : (
          <div className="tbl"><table><thead><tr><th>Alat</th><th>Jumlah</th><th></th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.key}><td>{r.nama}<small>{r.manual ? ' · manual' : ' · scan QR'}</small></td><td>{r.jumlah}</td>
                <td>{canEditKb && r.manual && <button className="danger" disabled={busy} onClick={() => run(() => remove(ref(db, `events/${id}/tambahan/${r.id}`)))}>Hapus</button>}</td></tr>
            ))}</tbody></table></div>
        )}

        {siap.length > 0 && (
          <>
            <h2>Disiapkan gudang ({siap.length})</h2>
            <div className="tbl"><table><thead><tr><th>Unit</th><th>Nama</th><th>Kategori</th>{isGudang && tahap === 'rencana' && <th></th>}</tr></thead>
              <tbody>{siap.map((u) => (
                <tr key={u.id}><td><Link to={'/aset/' + u.id}>{u.kode}</Link></td><td>{u.nama}</td><td>{u.kategori || '-'}</td>
                  {isGudang && tahap === 'rencana' && <td><button className="ghost" disabled={busy} onClick={() => run(() => batalSiapkan(u, ev, profile))}>Batal</button></td>}</tr>
              ))}</tbody></table></div>
          </>
        )}
        {siap.length === 0 && sent.length === 0 && <p className="empty">Belum ada alat yang disiapkan.</p>}

        {sent.length > 0 && (
          <>
            <h2>Alat yang dikirim ke teknisi ({sent.length})</h2>
            <div className="tbl"><table><thead><tr><th>Unit</th><th>Nama</th><th>Kategori</th><th>Status</th>{canTek && tahap === 'dikirim' && <th>Dicek</th>}</tr></thead>
              <tbody>{sent.map((u) => (
                <tr key={u.id}><td><Link to={'/aset/' + u.id}>{u.kode}</Link></td><td>{u.nama}</td><td>{u.kategori || '-'}</td>
                  <td>{u.status === 'keluar' && u.eventId === id ? <Badge s="keluar" /> : <><Badge s={u.status} /> <small>kembali</small></>}</td>
                  {canTek && tahap === 'dikirim' && <td><input type="checkbox" aria-label={'Cek ' + u.kode} disabled={busy} checked={checked(u)} onChange={(e) => toggle(u, e.target.checked)} /></td>}</tr>
              ))}</tbody></table></div>
            <p><small>{list(serah).filter((r) => r.tipe === 'keluar').map((r) => `Dikirim ${fmt(r.waktu)} oleh ${r.nama} (${r.jumlah} unit)`).join(' · ')}</small></p>
          </>
        )}
      </div>
    </>
  );
}
