import { useRef, useState } from 'react';
import QrCamera from './QrCamera.jsx';
import { bunyi, unlockBeep } from './sound.js';

// bunyi dan unlockBeep tetap bisa diimpor dari sini (kompatibel dengan kode lama)
export { bunyi, unlockBeep };

const CSS = `
.qrc .scan-box.paused{opacity:.25;filter:grayscale(1)}
.scan-hint{margin:10px 0;font-size:14px;color:var(--text-mute)}
.scan-confirm{max-width:440px;border:1px solid rgba(255,198,41,.45);border-left:4px solid var(--gold);border-radius:var(--r-lg);background:var(--g-panel);padding:14px;margin:10px 0;box-shadow:var(--shadow);animation:fadeUp .3s var(--ease)}
.scan-confirm small{display:block;font-weight:700;letter-spacing:.1em;color:var(--cyan)}
.scan-confirm b{display:block;font-size:20px;margin:2px 0}
.scan-confirm span{display:block;margin-bottom:10px;color:var(--text-mute)}
`;

// Alur satu unit: scan -> BEEP -> muncul nama -> tekan Input (simpan) -> kamera siap lagi -> scan berikutnya.
//  check(teks)    -> { title, sub, data } atau melempar Error (unit tidak valid)
//  onConfirm(data) -> menyimpan; melempar Error bila gagal
export default function Scanner({ check, onConfirm, confirmLabel = 'Input', placeholder = 'Input manual: kode unit (mis. LAM-0001)' }) {
  const chk = useRef(check); chk.current = check;
  const cnf = useRef(onConfirm); cnf.current = onConfirm;
  const stage = useRef('scan');                       // 'scan' | 'wait'
  const last = useRef({ t: '', at: 0 });
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [manual, setManual] = useState('');

  const handle = async (text) => {
    if (stage.current !== 'scan') return;
    const now = Date.now();
    if (last.current.t === text && now - last.current.at < 2500) { last.current.at = now; return; } // kode yang sama masih di depan kamera
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
      <QrCamera onCode={(t) => hr.current(t)} paused={!!pending} hint={!pending ? `Arahkan kamera ke QR. Setelah bunyi beep, cek nama lalu tekan ${confirmLabel}.` : ''} />
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
