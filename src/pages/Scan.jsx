import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { useVal, list } from '../util.js';

export default function Scan() {
  const nav = useNavigate();
  const assets = useVal('assets');
  const latest = useRef([]);
  const done = useRef(false);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState('');
  latest.current = list(assets);

  function resolve(text) {
    const t = text.trim();
    const m = t.match(/#\/aset\/([^/?\s]+)/);
    const id = m ? m[1] : null;
    const hit = latest.current.find((a) => a.id === (id || t) || (a.kode || '').toLowerCase() === t.toLowerCase());
    return hit ? hit.id : null;
  }
  function go(text) {
    if (done.current) return;
    const id = resolve(text);
    if (id) { done.current = true; nav('/aset/' + id); } else setErr('QR / kode tidak dikenali: ' + text);
  }
  useEffect(() => {
    const q = new Html5Qrcode('reader');
    let dead = false, on = false;
    q.start({ facingMode: 'environment' }, { fps: 10, qrbox: 240 }, go, () => {})
      .then(() => { on = true; if (dead) q.stop().then(() => q.clear()).catch(() => {}); })
      .catch((e) => setErr('Kamera tidak bisa dibuka (' + (e?.message || e) + '). Izinkan kamera atau pakai input manual.'));
    return () => { dead = true; if (on) q.stop().then(() => q.clear()).catch(() => {}); };
  }, []);
  return (
    <>
      <h2>Scan QR</h2>
      <div id="reader" style={{ maxWidth: 360 }} />
      {err && <p className="err">{err}</p>}
      <form className="card row" onSubmit={(e) => { e.preventDefault(); go(manual); }}>
        <input placeholder="Input manual: kode unit (mis. LAM-0001)" value={manual} onChange={(e) => setManual(e.target.value)} />
        <button>Cari</button>
      </form>
    </>
  );
}
