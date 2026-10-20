import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

// ---- bunyi beep (Web Audio; di iPhone harus "dibuka" lewat sentuhan, lihat unlockBeep) ----
let actx = null;
export function unlockBeep() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!actx) actx = new AC();
    if (actx.state === 'suspended') actx.resume();
  } catch { /* abaikan */ }
}
function beep(freq, ms, vibrate) {
  try {
    unlockBeep();
    if (actx) {
      const o = actx.createOscillator(); const g = actx.createGain();
      o.type = 'square'; o.frequency.value = freq; g.gain.value = 0.25;
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + ms / 1000);
    }
  } catch { /* abaikan */ }
  try { navigator.vibrate && navigator.vibrate(vibrate); } catch { /* abaikan */ }
}
const bunyi = { scan: () => beep(1400, 130, 60), ok: () => beep(1900, 90, 40), gagal: () => beep(280, 320, [80, 40, 80]) };

const CSS = `
.scan-box.paused{opacity:.2;filter:grayscale(1)}
.scan-hint{margin:8px 0;font-size:14px;color:#555}
.scan-confirm{max-width:420px;border:2px solid #000;border-left:8px solid var(--yellow,#fae24a);background:#fff;padding:12px;margin:10px 0}
.scan-confirm small{display:block;font-weight:800;letter-spacing:.06em;color:#555}
.scan-confirm b{display:block;font-size:20px;margin:2px 0}
.scan-confirm span{display:block;margin-bottom:10px}
`;

// Alur satu unit: scan -> BEEP -> muncul nama -> tekan Input (simpan) -> kamera siap lagi -> scan berikutnya.
//  check(teks)    -> { title, sub, data } atau melempar Error (unit tidak valid)
//  onConfirm(data) -> menyimpan; melempar Error bila gagal
export default function Scanner({ check, onConfirm, confirmLabel = 'Input', placeholder = 'Input manual: kode unit (mis. LAM-0001)' }) {
  const rid = 'rd' + useId().replace(/[^A-Za-z0-9]/g, '');
  const chk = useRef(check); chk.current = check;
  const cnf = useRef(onConfirm); cnf.current = onConfirm;
  const stage = useRef('scan');                       // 'scan' | 'wait'
  const last = useRef({ t: '', at: 0 });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [camErr, setCamErr] = useState('');
  const [manual, setManual] = useState('');

  const handle = async (text) => {
    if (stage.current !== 'scan') return;
    const now = Date.now();
    if (last.current.t === text && now - last.current.at < 2500) { last.current.at = now; return; } // QR yang sama masih di depan kamera
    last.current = { t: text, at: now };
    stage.current = 'wait'; setErr('');
    try {
      const info = await chk.current(text);
      bunyi.scan();
      setPending({ ...info, text });
    } catch (e) { bunyi.gagal(); setErr(e.message); stage.current = 'scan'; }
  };
  const hr = useRef(handle); hr.current = handle;

  const input = async () => {
    if (!pending || busy) return;
    setBusy(true); setErr('');
    try { await cnf.current(pending.data); bunyi.ok(); } catch (e) { bunyi.gagal(); setErr(e.message); }
    last.current = { t: pending.text, at: Date.now() };
    setPending(null); setBusy(false); stage.current = 'scan';
  };
  const batal = () => { last.current = { t: pending.text, at: Date.now() }; setPending(null); stage.current = 'scan'; };

  useEffect(() => {
    const q = new Html5Qrcode(rid);
    let dead = false, on = false;
    q.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, (t) => hr.current(t), () => {})
      .then(() => { on = true; if (dead) q.stop().then(() => q.clear()).catch(() => {}); })
      .catch((e) => setCamErr('Kamera tidak bisa dibuka (' + (e?.message || e) + '). Izinkan kamera atau pakai input manual.'));
    return () => { dead = true; if (on) q.stop().then(() => q.clear()).catch(() => {}); };
  }, [rid]);

  return (
    <div onPointerDown={unlockBeep}>
      <style>{CSS}</style>
      {pending && (
        <div className="scan-confirm" role="alert">
          <small>TERBACA</small>
          <b>{pending.title}</b>
          <span>{pending.sub}</span>
          <div className="row">
            <button className="big" disabled={busy} onClick={input}>{busy ? 'Menyimpan…' : confirmLabel}</button>
            <button className="ghost" disabled={busy} onClick={batal}>Batal</button>
          </div>
        </div>
      )}
      {err && <p className="err" role="alert">{err}</p>}
      <div className={'scan-box' + (pending ? ' paused' : '')}><div id={rid} /></div>
      {!pending && !camErr && <p className="scan-hint">Arahkan kamera ke QR. Setelah bunyi beep, cek nama lalu tekan {confirmLabel}.</p>}
      {camErr && <p className="err" role="alert">{camErr}</p>}
      <form className="card row" onSubmit={(e) => { e.preventDefault(); const v = manual.trim(); if (v) { last.current = { t: '', at: 0 }; setManual(''); hr.current(v); } }}>
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
