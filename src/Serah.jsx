import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { useVal, list, fmt } from './util.js';
import { siapkanSemua, keluarkanSemua, terimaSemua, kembalikanSemua, bulkTerimaGudang, bulkList } from './flow.js';
import { Badge } from './components.jsx';

// Panel serah terima per event: gudang (Siapkan/Keluarkan semua) dan teknisi (Terima semua / Kembalikan semua)
export default function Serah({ ev, units }) {
  const { profile } = useAuth();
  const catatan = useVal('serahTerima/' + ev.id);
  const bE = useVal('bulkEvent/' + ev.id);
  const [exc, setExc] = useState({});   // unit pengecualian { assetId: alasan }
  const [bq, setBq] = useState({});     // jumlah barang jumlah { bid: angka }
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
  const bl = bulkList(bE);
  const bPlan = bl.filter((e) => e.tahap === 'rencana');
  const bSent = bl.filter((e) => e.tahap === 'keluar');
  const bUse = bl.filter((e) => e.tahap === 'diterima');
  const bBack = bl.filter((e) => e.tahap === 'kembali');
  const rec = list(catatan).sort((a, b) => b.waktu - a.waktu);
  const lastOut = rec.find((r) => r.tipe === 'keluar');
  const nTerima = sent.length - Object.keys(exc).length + bSent.length;

  async function run(fn, done) {
    setBusy(true); setMsg(''); setOk('');
    try {
      const r = await fn();
      if (r?.gagal?.length) setMsg('Sebagian gagal: ' + r.gagal.join(' | '));
      if (r?.ok?.length || r?.bulk) setOk(done(r));
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }
  const txt = (r, a) => `${r.ok.length} unit${r.bulk ? ` dan ${r.bulk} jenis barang jumlah` : ''} ${a}`;

  const doPrep = () => {
    if (!confirm(`Siapkan ${prepable.length} unit untuk event ini?\n\nPastikan semua barang sudah Anda ambil dan cek secara fisik.`)) return;
    run(() => siapkanSemua(prepable, ev, profile), (r) => `${r.ok.length} unit disiapkan.`);
  };
  const doOut = () => {
    if (!confirm(`Keluarkan ${prepared.length} unit dan ${bPlan.length} jenis barang jumlah dari gudang?`)) return;
    run(() => keluarkanSemua(prepared, ev, profile, bPlan), (r) => txt(r, 'dikeluarkan. Surat Jalan siap dibagikan.'));
  };
  const doIn = () => {
    if (!confirm(`Terima barang?\n\nPastikan Anda sudah mengecek barang secara fisik. Unit yang dicentang dan jumlah yang kurang akan dicatat sebagai selisih.`)) return;
    run(() => terimaSemua(sent, ev, profile, exc, bSent, bq), (r) => txt(r, 'diterima. Status otomatis “Sedang digunakan”.')).then(() => { setExc({}); setBq({}); });
  };
  const doBack = () => {
    if (!confirm(`Kembalikan ${using.length} unit dan ${bUse.length} jenis barang jumlah ke gudang? Gunakan ini hanya setelah event selesai.`)) return;
    run(() => kembalikanSemua(using, ev, profile, bUse), (r) => txt(r, 'dikembalikan. Menunggu dicek gudang.'));
  };
  const doGudang = () => run(() => bulkTerimaGudang(bBack, ev, profile, bq), (r) => `${r.bulk} jenis barang jumlah selesai dihitung gudang.`).then(() => setBq({}));
  const toggle = (id, on) => setExc((p) => { const n = { ...p }; if (on) n[id] = ''; else delete n[id]; return n; });
  const qv = (e, def) => (bq[e.bid] ?? def);

  if (!mine.length && !prepable.length && !bl.length) return null;

  return (
    <>
      <h2>Serah terima event</h2>
      <div className="card flag">
        <div className="row">
          <span><b>{prepared.length}</b> disiapkan</span>
          <span><b>{sent.length + bSent.length}</b> sudah keluar</span>
          <span><b>{using.length + bUse.length}</b> dipakai</span>
          <span><b>{back.length + bBack.length}</b> menunggu dicek gudang</span>
          <span className="sp" />
          {lastOut && <Link className="btn dark" to={'/surat-jalan/' + ev.id}>Surat Jalan (PDF)</Link>}
        </div>
        {lastOut && <small>Dikeluarkan oleh {lastOut.nama}, {fmt(lastOut.waktu)}.</small>}
        {msg && <p className="err" role="alert">{msg}</p>}
        {ok && <p role="status"><b>{ok}</b></p>}

        {staff && (
          <div className="row" style={{ marginTop: 12 }}>
            <button disabled={busy || !prepable.length} onClick={doPrep}>Siapkan semua ({prepable.length})</button>
            <button disabled={busy || (!prepared.length && !bPlan.length)} onClick={doOut}>Keluarkan semua ({prepared.length + bPlan.length})</button>
          </div>
        )}
        {staff && <small>Barang per unit bisa di-scan satu per satu di menu Scan QR untuk pemeriksaan teliti. Barang jumlah ikut keluar sesuai angka yang direncanakan.</small>}

        {isTech && (sent.length > 0 || bSent.length > 0) && (
          <div style={{ marginTop: 16 }}>
            <b>Terima barang</b>
            <p><small>Cek barang secara fisik. Centang unit yang <b>kurang atau rusak</b>. Untuk barang jumlah, ubah angka bila yang sampai lebih sedikit.</small></p>
            {sent.map((u) => (
              <div className="check" key={u.id}>
                <input type="checkbox" id={'x' + u.id} checked={u.id in exc} onChange={(e) => toggle(u.id, e.target.checked)} />
                <label htmlFor={'x' + u.id} style={{ flex: 1 }}><b>{u.kode}</b> {u.nama} <small>{u.kategori || ''}</small></label>
                {u.id in exc
                  ? <input aria-label={'Alasan ' + u.kode} placeholder="Kurang / rusak?" value={exc[u.id]} onChange={(e) => setExc({ ...exc, [u.id]: e.target.value })} style={{ maxWidth: 180 }} />
                  : <Badge s={u.status} />}
              </div>
            ))}
            {bSent.map((e) => (
              <div className="check" key={e.bid}>
                <label style={{ flex: 1 }}><b>{e.nama}</b> <small>dikirim {e.qtyKeluar}</small></label>
                <input type="number" min="0" max={e.qtyKeluar} aria-label={'Jumlah diterima ' + e.nama} value={qv(e, e.qtyKeluar)} onChange={(x) => setBq({ ...bq, [e.bid]: x.target.value })} style={{ width: 90 }} />
              </div>
            ))}
            <div style={{ marginTop: 12 }}>
              <button className="big" disabled={busy || nTerima <= 0} onClick={doIn}>Terima semua ({nTerima})</button>
            </div>
          </div>
        )}

        {isTech && (using.length > 0 || bUse.length > 0) && (
          <div style={{ marginTop: 16 }}>
            <b>Setelah event selesai</b>
            <div style={{ marginTop: 8 }}><button className="big" disabled={busy} onClick={doBack}>Kembalikan semua ({using.length + bUse.length})</button></div>
          </div>
        )}

        {staff && bBack.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <b>Terima gudang: hitung barang jumlah</b>
            <p><small>Hitung barang yang benar-benar kembali. Bila kurang, selisih tercatat di Dashboard.</small></p>
            {bBack.map((e) => (
              <div className="check" key={e.bid}>
                <label style={{ flex: 1 }}><b>{e.nama}</b> <small>keluar {e.qtyKeluar}, dilaporkan kembali {e.qtyKembali}</small></label>
                <input type="number" min="0" max={e.qtyKeluar} aria-label={'Jumlah kembali ' + e.nama} value={qv(e, e.qtyKembali)} onChange={(x) => setBq({ ...bq, [e.bid]: x.target.value })} style={{ width: 90 }} />
              </div>
            ))}
            <div style={{ marginTop: 12 }}><button disabled={busy} onClick={doGudang}>Simpan hitungan gudang</button></div>
          </div>
        )}
      </div>
    </>
  );
}
