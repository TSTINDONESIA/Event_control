import { useCallback, useEffect, useRef, useState } from 'react';
import { cropSquare, outSize } from './qrCrop.js';

// Pemindai kamera cepat (porting dari SIS Interpreter Control).
//  - Kamera dibuka langsung (getUserMedia) dan frame dibaca tiap frame video (requestVideoFrameCallback),
//    bukan polling tetap seperti html5-qrcode.
//  - Decoder: BarcodeDetector bawaan browser (Android/Chrome) -> ZXing WebAssembly (iPhone/Safari, cepat dan tahan blur)
//    -> jsQR sebagai cadangan terakhir.
//  - Hanya area tengah (bingkai) yang dibaca; ukuran dibaca selang-seling 360/560 px.
//  - Fokus kontinu, ketuk layar = fokus ulang, zoom hardware (atau digital): cubit 2 jari, tombol +/−, slider, scroll mouse.
//
// Props:
//  onCode(text)  dipanggil tiap kode baru terbaca (kode yang sama diabaikan 2,5 detik selama masih di depan kamera)
//  paused        true = kamera tetap menyala tetapi tidak membaca (lanjut instan, tanpa menyalakan ulang kamera)
//  hint          teks petunjuk di bawah kamera (opsional)
const FORMATS = ['qr_code', 'code_128', 'ean_13', 'code_39'];
const DEDUP_MS = 2500;

const CSS = `
.qrc{display:flex;flex-direction:column;gap:10px;max-width:440px}
.qrc .scan-box{aspect-ratio:1/1;max-height:60vh;width:100%;touch-action:none}
.qrc video{width:100%;height:100%;object-fit:cover;display:block}
.qrc .qrc-wait{position:absolute;inset:0;display:grid;place-items:center;color:#fff;background:rgba(2,7,15,.6);z-index:4;font-size:14px}
.qrc .qrc-zoom{display:flex;align-items:center;gap:8px}
.qrc .qrc-zoom button{width:44px;height:44px;flex:0 0 44px;padding:0;border-radius:10px;font-size:24px;line-height:1}
.qrc .qrc-zoom input{flex:1;min-width:0;height:32px;accent-color:var(--gold)}
.qrc .qrc-zoom output{min-width:44px;text-align:right;font-size:13px;font-variant-numeric:tabular-nums;color:var(--cyan)}
`;

async function makeDetector() {
  const tryNative = () => {
    if (!('BarcodeDetector' in window)) return null;
    try { return new window.BarcodeDetector({ formats: FORMATS }); } catch { /* format tidak didukung */ }
    try { return new window.BarcodeDetector({ formats: ['qr_code'] }); } catch { return null; }
  };
  const native = tryNative();
  if (native) return native;
  try {
    const m = await import('barcode-detector/ponyfill');
    try { return new m.BarcodeDetector({ formats: FORMATS }); } catch { return new m.BarcodeDetector({ formats: ['qr_code'] }); }
  } catch { return null; }
}

export default function QrCamera({ onCode, paused = false, hint }) {
  const vref = useRef(null);
  const box = useRef(null);
  const trk = useRef(null);
  const zref = useRef({ v: 1, r: { min: 1, max: 4, step: 0.1, hw: false } });
  const cb = useRef(onCode); cb.current = onCode;
  const pz = useRef(paused); pz.current = paused;
  const [err, setErr] = useState('');
  const [on, setOn] = useState(false);
  const [zr, setZr] = useState({ min: 1, max: 4, step: 0.1, hw: false });
  const [zoom, setZoomState] = useState(1);

  const setZoom = useCallback((val) => {
    const { min, max, hw } = zref.current.r;
    const v = Math.max(min, Math.min(max, val));
    zref.current.v = v;
    setZoomState(v);
    if (hw && trk.current) trk.current.applyConstraints({ advanced: [{ zoom: v }] }).catch(() => {});
  }, []);

  useEffect(() => {
    let stop = false, stream = null, handle = null, det = null, jsQR = null;
    const last = { t: '', at: 0 };
    const cancel = () => {
      if (!handle) return;
      try {
        if (handle.k === 'v' && vref.current?.cancelVideoFrameCallback) vref.current.cancelVideoFrameCallback(handle.id);
        else if (handle.k === 'a') cancelAnimationFrame(handle.id);
        else clearTimeout(handle.id);
      } catch { /* abaikan */ }
      handle = null;
    };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('kamera tidak tersedia (perlu HTTPS)');
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        }
        if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = vref.current;
        if (!v) return;
        v.srcObject = stream;
        v.setAttribute('playsinline', 'true');
        v.muted = true;
        await v.play();

        // fokus kontinu + zoom hardware (bila perangkat mendukung)
        const track = stream.getVideoTracks()[0];
        trk.current = track;
        let range = { min: 1, max: 4, step: 0.1, hw: false };
        try {
          const cap = (track.getCapabilities && track.getCapabilities()) || {};
          if (cap.focusMode && cap.focusMode.includes('continuous')) await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
          if (cap.zoom && cap.zoom.max > cap.zoom.min) range = { min: cap.zoom.min, max: Math.min(cap.zoom.max, 10), step: cap.zoom.step || 0.1, hw: true };
        } catch { /* perangkat tidak mendukung */ }
        zref.current = { v: range.min, r: range };
        setZr(range); setZoomState(range.min); setOn(true);

        det = await makeDetector();
        if (stop) return;
        const cv = document.createElement('canvas');
        const cx = cv.getContext('2d', { willReadFrequently: true });
        let frame = 0;

        const next = (slow) => {
          if (stop) return;
          if (slow) handle = { k: 't', id: setTimeout(tick, 200) };           // saat jeda: hemat baterai
          else if (v.requestVideoFrameCallback) handle = { k: 'v', id: v.requestVideoFrameCallback(() => tick()) };
          else handle = { k: 'a', id: requestAnimationFrame(() => tick()) };
        };
        const tick = async () => {
          if (stop) return;
          if (pz.current) { next(true); return; }
          let text = null;
          if (v.readyState >= 2 && v.videoWidth) {
            try {
              const z = zref.current;
              const { sx, sy, side } = cropSquare(v.videoWidth, v.videoHeight, !z.r.hw ? z.v : 1);
              frame += 1;
              const out = outSize(frame, side);
              cv.width = out; cv.height = out;
              cx.drawImage(v, sx, sy, side, side, 0, 0, out, out);
              if (det) {
                const r = await det.detect(cv);
                if (r && r[0]) text = r[0].rawValue;
              } else {
                if (!jsQR) jsQR = (await import('jsqr')).default;
                const d = cx.getImageData(0, 0, out, out);
                const q = jsQR(d.data, d.width, d.height, { inversionAttempts: 'dontInvert' });
                if (q) text = q.data;
              }
            } catch { det = null; }       // decoder gagal (mis. WebAssembly tidak termuat): pakai jsQR untuk frame berikutnya
          }
          if (text && !stop) {
            const now = Date.now();
            const baru = !(last.t === text && now - last.at < DEDUP_MS);
            last.t = text; last.at = now;
            if (baru) { try { await cb.current(text); } catch { /* penangan kode mengurus galatnya sendiri */ } }
          }
          next(false);
        };
        tick();
      } catch (e) {
        setErr('Kamera tidak bisa dibuka (' + ((e && (e.message || e.name)) || 'error') + '). Izinkan akses kamera di browser, atau ketik kodenya manual.');
      }
    })();
    return () => {
      stop = true; cancel(); trk.current = null;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // cubit 2 jari = zoom, ketuk = fokus ulang, scroll mouse = zoom
  useEffect(() => {
    const el = box.current;
    if (!el || !on) return;
    const pts = new Map();
    let d0 = 0, z0 = 1, moved = false, downT = 0;
    const dist = () => { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    const refocus = async () => {
      const t = trk.current;
      if (!t) return;
      try {
        const modes = (t.getCapabilities ? t.getCapabilities() : {}).focusMode || [];
        if (modes.includes('single-shot')) {
          await t.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] });
          setTimeout(() => { trk.current && modes.includes('continuous') && trk.current.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {}); }, 1200);
        } else if (modes.includes('continuous')) {
          await t.applyConstraints({ advanced: [{ focusMode: 'manual' }] }).catch(() => {});
          await t.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
        }
      } catch { /* perangkat tidak mendukung */ }
    };
    const down = (e) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { moved = false; downT = Date.now(); }
      if (pts.size === 2) { d0 = dist(); z0 = zref.current.v; moved = true; }
    };
    const move = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && d0) setZoom(z0 * (dist() / d0));
    };
    const up = (e) => {
      const was = pts.has(e.pointerId);
      pts.delete(e.pointerId);
      if (was && pts.size === 0 && !moved && Date.now() - downT < 350) refocus();
    };
    const wheel = (e) => { e.preventDefault(); setZoom(zref.current.v * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [on, setZoom]);

  const bump = (dir) => setZoom(zoom + dir * (zr.hw ? Math.max(zr.step, (zr.max - zr.min) / 10) : 0.5));

  return (
    <div className="qrc">
      <style>{CSS}</style>
      <div className={'scan-box' + (paused ? ' paused' : '')} ref={box}>
        <video ref={vref} muted playsInline style={!zr.hw ? { transform: `scale(${zoom})`, transformOrigin: 'center center' } : undefined} />
        {!paused && on && !err && <span className="scan-line" />}
        {!on && !err && <div className="qrc-wait">Menyalakan kamera…</div>}
      </div>
      {on && (
        <div className="qrc-zoom">
          <button type="button" className="ghost" aria-label="Zoom out" onClick={() => bump(-1)}>−</button>
          <input type="range" aria-label="Zoom kamera" min={zr.min} max={zr.max} step={zr.step} value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} />
          <button type="button" className="ghost" aria-label="Zoom in" onClick={() => bump(1)}>+</button>
          <output>{zoom.toFixed(1)}×</output>
        </div>
      )}
      {hint && !err ? <p className="scan-hint" style={{ margin: 0 }}>{hint} Cubit layar atau pakai +/− untuk zoom, ketuk layar untuk fokus.</p> : null}
      {err && <p className="err" role="alert">{err}</p>}
    </div>
  );
}
