import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

// ---- bunyi beep (di iPhone harus "dibuka" lewat sentuhan) ----
let actx = null;
function unlockBeep() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!actx) actx = new AC();
    if (actx.state === 'suspended') actx.resume();
  } catch { /* abaikan */ }
}
function beep(freq, ms, vib) {
  try {
    unlockBeep();
    if (actx) {
      const o = actx.createOscillator(); const g = actx.createGain();
      o.type = 'square'; o.frequency.value = freq; g.gain.value = 0.2;
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + ms / 1000);
    }
  } catch { /* abaikan */ }
  try { navigator.vibrate && navigator.vibrate(vib); } catch { /* abaikan */ }
}
const bunyi = { scan: () => beep(1400, 120, 50), ok: () => beep(1900, 80, 30), gagal: () => beep(280, 300, [80, 40, 80]) };

// QR label hanya berisi nomor unit, contoh "A001". Selain itu ditolak.
const NOMOR = /^[A-Za-z0-9-]{1,8}$/;

// resolve(nomor) -> { title, sub, actions: [{ label, primary, run }] }  atau melempar Error
// run() boleh mengembalikan 'tutup' untuk menutup pemindai.
export default function ScanAlat({ judul, resolve, onClose }) {
  const rid = 'sc' + useId().replace(/[^A-Za-z0-9]/g, '');
  const res = useRef(resolve); res.current = resolve;
  const stage = useRef('scan');
  const last = useRef({ t: '', at: 0 });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [camErr, setCamErr] = useState('');
  const [manual, setManual] = useState('');

  const handle = async (raw) => {
    if (stage.current !== 'scan') return;
    const teks = String(raw || '').trim();
    const now = Date.now();
    if (last.current.t === teks && now - last.current.at < 2500) { last.current.at = now; return; }
    last.current = { t: teks, at: now };
    stage.current = 'wait'; setErr('');
    try {
      if (!NOMOR.test(teks)) throw new Error('QR ini bukan label alat TST (isinya harus nomor unit seperti A001).');
      const info = await res.current(teks.toUpperCase());
      bunyi.scan();
      setPending({ ...info, teks });
    } catch (e) { bunyi.gagal(); setErr(e.message); stage.current = 'scan'; }
  };
  const hr = useRef(handle); hr.current = handle;

  const jalankan = async (a) => {
    if (busy) return;
    setBusy(true); setErr('');
    let tutup = false;
    try { tutup = (await a.run()) === 'tutup'; bunyi.ok(); } catch (e) { bunyi.gagal(); setErr(e.message || 'Gagal.'); }
    last.current = { t: pending?.teks || '', at: Date.now() };
    setPending(null); setBusy(false); stage.current = 'scan';
    if (tutup) onClose();
  };
  const batal = () => { last.current = { t: pending.teks, at: Date.now() }; setPending(null); stage.current = 'scan'; };

  useEffect(() => {
    const q = new Html5Qrcode(rid, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false });
    let dead = false, on = false;
    q.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.75); return { width: s, height: s }; } },
      (t) => hr.current(t),
      () => {},
    )
      .then(() => { on = true; if (dead) q.stop().then(() => q.clear()).catch(() => {}); })
      .catch((e) => setCamErr('Kamera tidak bisa dibuka (' + (e?.message || e) + '). Izinkan kamera, atau ketik nomor alat di bawah.'));
    return () => { dead = true; if (on) q.stop().then(() => q.clear()).catch(() => {}); };
  }, [rid]);

  return (
    <div className="scan-modal" onPointerDown={unlockBeep}>
      <div className="wrap">
        <div className="head">
          <div><h1>📷 {judul}</h1><span className="muted">Arahkan kamera ke QR di belakang receiver.</span></div>
          <button className="btn" onClick={onClose}>Tutup</button>
        </div>

        {pending && (
          <div className="card scan-ok" role="alert">
            <span className="muted">TERBACA</span>
            <b className="scan-title">{pending.title}</b>
            <span className="muted">{pending.sub}</span>
            <div className="actions">
              {pending.actions.map((a, i) => (
                <button key={i} className={'btn' + (a.primary ? ' primary' : '')} disabled={busy} onClick={() => jalankan(a)}>{busy ? 'Menyimpan…' : a.label}</button>
              ))}
              <button className="btn" disabled={busy} onClick={batal}>Batal</button>
            </div>
          </div>
        )}
        {err && <div className="err" role="alert">{err}</div>}

        <div className={'scan-box' + (pending ? ' paused' : '')}><div id={rid} /></div>
        {camErr && <div className="err" role="alert">{camErr}</div>}

        <form className="card" onSubmit={(e) => { e.preventDefault(); const v = manual.trim(); if (v) { last.current = { t: '', at: 0 }; setManual(''); hr.current(v); } }}>
          <label>Atau ketik nomor alat (tulisan di bawah QR)
            <input value={manual} onChange={(e) => setManual(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))} maxLength={8} placeholder="A001" autoCapitalize="characters" autoComplete="off" />
          </label>
          <button className="btn">OK</button>
        </form>
      </div>
    </div>
  );
}
