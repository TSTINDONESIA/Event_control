import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// Kamera QR + input manual. onScan(teks) dipanggil sekali per scan (QR yang sama ditahan 3 detik).
export default function Scanner({ onScan, placeholder = 'Input manual: kode unit (mis. LAM-0001)' }) {
  const rid = 'rd' + useId().replace(/[^A-Za-z0-9]/g, '');
  const cb = useRef(onScan); cb.current = onScan;
  const last = useRef({ t: '', at: 0 });
  const [err, setErr] = useState('');
  const [manual, setManual] = useState('');
  useEffect(() => {
    const q = new Html5Qrcode(rid);
    let dead = false, on = false;
    q.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, (t) => {
      const now = Date.now();
      if (last.current.t === t && now - last.current.at < 3000) { last.current.at = now; return; }
      last.current = { t, at: now };
      cb.current(t);
    }, () => {})
      .then(() => { on = true; if (dead) q.stop().then(() => q.clear()).catch(() => {}); })
      .catch((e) => setErr('Kamera tidak bisa dibuka (' + (e?.message || e) + '). Izinkan kamera atau pakai input manual.'));
    return () => { dead = true; if (on) q.stop().then(() => q.clear()).catch(() => {}); };
  }, [rid]);
  return (
    <div>
      <div className="scan-box"><div id={rid} /></div>
      {err && <p className="err" role="alert">{err}</p>}
      <form className="card row" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) { cb.current(manual); setManual(''); } }}>
        <input aria-label="Kode unit" style={{ flex: 1, minWidth: 200 }} placeholder={placeholder} value={manual} onChange={(e) => setManual(e.target.value)} />
        <button>OK</button>
      </form>
    </div>
  );
}

// cari unit dari teks QR (#/aset/<id>), id mentah, atau kode unit
export function findAsset(assets, text) {
  const t = String(text || '').trim();
  const m = t.match(/#\/aset\/([^/?\s]+)/);
  const id = m ? m[1] : t;
  const list = Object.entries(assets || {});
  const hit = list.find(([k, a]) => k === id || (a.kode || '').toLowerCase() === t.toLowerCase());
  return hit ? { id: hit[0], ...hit[1] } : null;
}
