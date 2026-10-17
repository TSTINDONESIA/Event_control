import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { ref, runTransaction } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit, labelId } from '../util.js';

// Pendaftaran unit baru: tempel label kosong → scan → isi nama → masuk stok (status Tersedia)
export default function Daftar() {
  const { profile } = useAuth();
  const [sp, setSp] = useSearchParams();
  const assets = useVal('assets');
  const kat = useVal('kategori');
  const latest = useRef({});
  latest.current = assets || {};
  const [cur, setCur] = useState(sp.get('id') || ''); // id label yang sedang diisi
  const curRef = useRef(cur);
  curRef.current = cur;
  const [known, setKnown] = useState(null);
  const [err, setErr] = useState('');
  const [camErr, setCamErr] = useState('');
  const [f, setF] = useState({ nama: '', kategori: '' }); // diingat untuk unit berikutnya
  const [done, setDone] = useState([]);
  const [busy, setBusy] = useState(false);
  const seq = useRef({});
  const last = useRef({ t: '', at: 0 });
  const scanRef = useRef(null);

  scanRef.current = (text) => {
    const now = Date.now();
    if (last.current.t === text && now - last.current.at < 3000) { last.current.at = now; return; } // QR yang sama masih di depan kamera
    last.current = { t: text, at: now };
    if (curRef.current) return; // sedang mengisi form
    const id = labelId(text);
    if (!id) { setKnown(null); setErr('Bukan label TST: ' + String(text).slice(0, 40)); return; }
    const hit = latest.current[id];
    if (hit) { setErr(''); setKnown({ id, kode: hit.kode, nama: hit.nama }); return; }
    setErr(''); setKnown(null); setCur(id);
  };

  useEffect(() => {
    const q = new Html5Qrcode('reader-daftar');
    let dead = false, on = false;
    q.start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 }, (t) => scanRef.current(t), () => {})
      .then(() => { on = true; if (dead) q.stop().then(() => q.clear()).catch(() => {}); })
      .catch((e) => setCamErr('Kamera tidak bisa dibuka (' + (e?.message || e) + '). Izinkan kamera di browser, atau buka label dengan kamera HP biasa.'));
    return () => { dead = true; if (on) q.stop().then(() => q.clear()).catch(() => {}); };
  }, []);

  async function save(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const nama = f.nama.trim(), kategori = f.kategori.trim();
      const prefix = (kategori || nama).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AST';
      const nums = Object.values(latest.current).map((a) => a.kode || '').filter((k) => k.startsWith(prefix + '-')).map((k) => parseInt(k.slice(prefix.length + 1), 10) || 0);
      const next = Math.max(seq.current[prefix] || 0, 0, ...nums) + 1;
      const kode = `${prefix}-${String(next).padStart(4, '0')}`;
      const r = await runTransaction(ref(db, 'assets/' + cur), (c) => (c === null ? { kode, nama, kategori, status: 'tersedia', dibuat: Date.now() } : undefined));
      if (!r.committed) throw new Error('Label ini ternyata sudah terdaftar.');
      seq.current[prefix] = next;
      await audit(profile.uid, 'aset_baru', `${nama} (${kode}) via scan`);
      setDone([{ id: cur, kode, nama }, ...done]);
      setCur(''); setSp({}); last.current = { t: '', at: Date.now() };
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }

  return (
    <div className="reg">
      <div>
        <div className="scan-box"><div id="reader-daftar" /></div>
        {camErr && <p className="err" role="alert">{camErr}</p>}
        <p><small>Arahkan kamera ke label yang sudah ditempel di barang. Label yang belum terdaftar akan memunculkan form.</small></p>
      </div>
      <div>
        {cur ? (
          <form className="card flag pw-card" style={{ maxWidth: 'none' }} onSubmit={save}>
            <b>Label terbaca (…{cur.slice(-6)}): isi data barang</b>
            <label htmlFor="dn">Nama barang</label>
            <input id="dn" autoFocus placeholder="mis. Mic tempel" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} required />
            <label htmlFor="dk">Kategori</label>
            <input id="dk" list="katD" placeholder="mis. Microphone" value={f.kategori} onChange={(e) => setF({ ...f, kategori: e.target.value })} required />
            <datalist id="katD">{list(kat).map((k) => <option key={k.id} value={k.nama} />)}</datalist>
            <div className="row">
              <button disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan unit'}</button>
              <button type="button" className="ghost" onClick={() => { setCur(''); setSp({}); }}>Batal</button>
            </div>
            <small>Nama dan kategori diingat untuk unit berikutnya, jadi untuk barang yang sama tinggal scan lalu simpan.</small>
          </form>
        ) : (
          <div className="card"><b>Siap scan.</b> Scan label berikutnya.</div>
        )}
        {known && <p className="card flag">Label ini sudah terdaftar: <Link to={'/aset/' + known.id}><b>{known.kode}</b></Link> {known.nama}.</p>}
        {err && <p className="err" role="alert">{err}</p>}
        <h2>Terdaftar sesi ini ({done.length})</h2>
        {done.length === 0 ? <p className="empty">Belum ada.</p> : (
          <div className="tbl"><table><thead><tr><th>Kode</th><th>Nama</th></tr></thead>
            <tbody>{done.map((d) => <tr key={d.id}><td><Link to={'/aset/' + d.id}>{d.kode}</Link></td><td>{d.nama}</td></tr>)}</tbody></table></div>
        )}
        <p><small>Tulis kode di label dengan spidol (kolom “Kode”) agar bisa dicari manual bila label rusak.</small></p>
      </div>
    </div>
  );
}
