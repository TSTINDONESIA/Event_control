import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { useVal, list, fmt } from './util.js';
import { siapkanSemua, keluarkanSemua, terimaSemua, kembalikanSemua } from './flow.js';
import { Badge } from './components.jsx';

// Panel serah terima per event: gudang (Siapkan/Keluarkan semua) dan teknisi (Terima/Kembalikan semua)
export default function Serah({ ev, units }) {
  const { profile } = useAuth();
  const catatan = useVal('serahTerima/' + ev.id);
  const [exc, setExc] = useState({});   // { assetId: alasan }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState('');

  const staff = profile.role !== 'teknisi';
  const isTech = profile.role === 'admin' || !!ev.teknisi?.[profile.uid];
  const mine = units.filter((u) => u.eventId === ev.id);
  const by = (...s) => mine.filter((u) => s.includes(u.status));
  const prepable = units.filter((u) => ['tersedia', 'dialokasikan'].includes(u.status));
  const prepared = by('disiapkan');
  const sent = by('keluar');
  const using = by('diterima', 'digunakan');
  const back = by('menunggu_kembali');
  const rec = list(catatan).sort((a, b) => b.waktu - a.waktu);
  const lastOut = rec.find((r) => r.tipe === 'keluar');

  async function run(fn, done) {
    setBusy(true); setMsg(''); setOk('');
    try {
      const r = await fn();
      if (r?.gagal?.length) setMsg('Sebagian gagal: ' + r.gagal.join(' | '));
      if (r?.ok?.length || !r) setOk(done(r));
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  const doPrep = () => {
    if (!confirm(`Siapkan ${prepable.length} unit untuk event ini?\n\nPastikan semua barang sudah Anda ambil dan cek secara fisik.`)) return;
    run(() => siapkanSemua(prepable, ev, profile), (r) => `${r.ok.length} unit disiapkan.`);
  };
  const doOut = () => {
    const sisa = units.filter((u) => u.eventId !== ev.id || u.status !== 'disiapkan').length;
    const extra = sisa ? `\n\nCatatan: ${sisa} unit lain belum berstatus “Disiapkan” dan tidak ikut dikeluarkan.` : '';
    if (!confirm(`Keluarkan ${prepared.length} unit dari gudang?${extra}`)) return;
    run(() => keluarkanSemua(prepared, ev, profile), (r) => `${r.ok.length} unit dikeluarkan. Surat Jalan siap dibagikan.`);
  };
  const doIn = () => {
    const n = sent.length - Object.keys(exc).length;
    if (!confirm(`Terima ${n} unit?\n\nPastikan Anda sudah mengecek barang secara fisik. Unit yang dicentang kurang/rusak TIDAK ikut diterima dan dicatat sebagai selisih.`)) return;
    run(() => terimaSemua(sent, ev, profile, exc), (r) => `${r.ok.length} unit diterima. Status otomatis “Sedang digunakan”.`).then(() => setExc({}));
  };
  const doBack = () => {
    if (!confirm(`Kembalikan ${using.length} unit ke gudang? Gunakan ini hanya setelah event selesai.`)) return;
    run(() => kembalikanSemua(using, ev, profile), (r) => `${r.ok.length} unit dikembalikan. Menunggu dicek gudang.`);
  };
  const toggle = (id, on) => setExc((p) => { const n = { ...p }; if (on) n[id] = ''; else delete n[id]; return n; });

  if (!mine.length && !prepable.length) return null;

  return (
    <>
      <h2>Serah terima event</h2>
      <div className="card flag">
        <div className="row">
          <span><b>{prepared.length}</b> disiapkan</span>
          <span><b>{sent.length}</b> sudah keluar</span>
          <span><b>{using.length}</b> dipakai</span>
          <span><b>{back.length}</b> menunggu dicek gudang</span>
          <span className="sp" />
          {lastOut && <Link className="btn dark" to={'/surat-jalan/' + ev.id}>Surat Jalan (PDF)</Link>}
        </div>
        {lastOut && <small>Dikeluarkan oleh {lastOut.nama}, {fmt(lastOut.waktu)}.</small>}
        {msg && <p className="err" role="alert">{msg}</p>}
        {ok && <p role="status"><b>{ok}</b></p>}

        {staff && (
          <div className="row" style={{ marginTop: 12 }}>
            <button disabled={busy || !prepable.length} onClick={doPrep}>Siapkan semua ({prepable.length})</button>
            <button disabled={busy || !prepared.length} onClick={doOut}>Keluarkan semua ({prepared.length})</button>
          </div>
        )}
        {staff && <small>Untuk pemeriksaan teliti, scan unit satu per satu di menu Scan QR. Tombol massal ini mempercepat bila semua sudah dicek.</small>}

        {isTech && sent.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <b>Terima barang</b>
            <p><small>Cek barang secara fisik. Centang hanya unit yang <b>kurang atau rusak</b>; sisanya otomatis diterima.</small></p>
            {sent.map((u) => (
              <div className="check" key={u.id}>
                <input type="checkbox" id={'x' + u.id} checked={u.id in exc} onChange={(e) => toggle(u.id, e.target.checked)} />
                <label htmlFor={'x' + u.id} style={{ flex: 1 }}><b>{u.kode}</b> {u.nama} <small>{u.kategori || ''}</small></label>
                {u.id in exc
                  ? <input aria-label={'Alasan ' + u.kode} placeholder="Kurang / rusak?" value={exc[u.id]} onChange={(e) => setExc({ ...exc, [u.id]: e.target.value })} style={{ maxWidth: 180 }} />
                  : <Badge s={u.status} />}
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <button className="big" disabled={busy || sent.length === Object.keys(exc).length} onClick={doIn}>Terima semua ({sent.length - Object.keys(exc).length} unit)</button>
            </div>
          </div>
        )}

        {isTech && using.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <b>Setelah event selesai</b>
            <div style={{ marginTop: 8 }}><button className="big" disabled={busy} onClick={doBack}>Kembalikan semua ({using.length} unit)</button></div>
          </div>
        )}
      </div>
    </>
  );
}
