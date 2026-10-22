import { useEffect, useRef, useState } from 'react';

// Opsi kamera bersama (dipakai Scanner.jsx & pages/Scan.jsx):
// resolusi tinggi supaya barcode kecil tetap terbaca, + decoder bawaan browser bila ada.
export const CAMERA_VIDEO = { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } };
export const scanConfig = (qrbox = 240) => ({
  fps: 15,
  qrbox,
  videoConstraints: CAMERA_VIDEO,
  experimentalFeatures: { useBarCodeDetectorIfSupported: true },
});

// ---- ukuran kotak scan (bisa diatur, tersimpan di perangkat) ----
const BOXES = {
  kecil:  { label: 'Kecil',  w: 0.5, h: 0.5 },
  sedang: { label: 'Sedang', w: 0.7, h: 0.7 },
  besar:  { label: 'Besar',  w: 0.92, h: 0.92 },
  lebar:  { label: 'Lebar (barcode)', w: 0.92, h: 0.4 },
};
const LS = 'scanBox';
export function useScanBox() {
  const [key, setKey] = useState(() => { try { const k = localStorage.getItem(LS); return BOXES[k] ? k : 'sedang'; } catch { return 'sedang'; } });
  const pick = (k) => { setKey(k); try { localStorage.setItem(LS, k); } catch { /* abaikan */ } };
  const b = BOXES[key];
  const qrbox = (vw, vh) => ({ width: Math.max(60, Math.floor(vw * b.w)), height: Math.max(60, Math.floor(vh * b.h)) });
  return [key, pick, qrbox];
}
export function ScanBoxPicker({ value, onPick }) {
  return (
    <div className="cam-zoom" style={{ flexWrap: 'wrap' }}>
      <style>{CSS}</style>
      <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Kotak scan:</span>
      {Object.entries(BOXES).map(([k, v]) => (
        <button key={k} type="button" className={value === k ? '' : 'ghost'} style={{ width: 'auto', height: 34, padding: '0 12px', fontSize: 13, borderRadius: 17 }} onClick={() => onPick(k)}>{v.label}</button>
      ))}
    </div>
  );
}

const CSS = `
.cam-zoom{display:flex;align-items:center;gap:10px;max-width:440px;margin:10px 0;padding:8px 12px;border:1px solid var(--line-strong);border-radius:var(--r-lg);background:var(--g-panel)}
.cam-zoom input[type=range]{flex:1;min-width:0;accent-color:var(--gold)}
.cam-zoom button{width:40px;height:40px;padding:0;font-size:22px;line-height:1;border-radius:50%}
.cam-zoom output{min-width:44px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;color:var(--cyan)}
.scan-box{touch-action:pan-y}
`;

// Kontrol zoom kamera: slider, tombol +/-, dan cubit dua jari di area kamera.
//  qr   : ref ke instance Html5Qrcode yang sedang berjalan
//  on   : true setelah kamera berhasil menyala
//  boxRef : ref ke elemen pembungkus kamera (untuk pinch-to-zoom)
export default function CameraZoom({ qr, on, boxRef }) {
  const [cap, setCap] = useState(null);   // { min, max, step } atau null bila perangkat tidak mendukung zoom
  const [val, setVal] = useState(1);
  const cur = useRef(1);
  const saved = useRef(0);          // zoom terakhir, dipasang lagi setelah kamera restart

  const apply = (v) => {
    if (!cap || !qr.current) return;
    const step = cap.step || 0.1;
    const nv = Math.min(cap.max, Math.max(cap.min, Math.round(v / step) * step));
    cur.current = nv; saved.current = nv; setVal(nv);
    qr.current.applyVideoConstraints({ advanced: [{ zoom: nv }] }).catch(() => {});
  };
  const ap = useRef(apply); ap.current = apply;

  // baca kemampuan kamera + nyalakan autofocus terus-menerus
  useEffect(() => {
    if (!on || !qr.current) return;
    try {
      const c = qr.current.getRunningTrackCapabilities?.() || {};
      if (Array.isArray(c.focusMode) && c.focusMode.includes('continuous')) {
        qr.current.applyVideoConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
      }
      if (c.zoom && c.zoom.max > c.zoom.min) {
        const s = qr.current.getRunningTrackSettings?.() || {};
        const z = s.zoom || c.zoom.min;
        const capNew = { min: c.zoom.min, max: c.zoom.max, step: c.zoom.step || 0.1 };
        cur.current = z; setVal(z); setCap(capNew);
        if (saved.current > capNew.min && saved.current <= capNew.max) {
          cur.current = saved.current; setVal(saved.current);
          qr.current.applyVideoConstraints({ advanced: [{ zoom: saved.current }] }).catch(() => {});
        }
      }
    } catch { /* perangkat tidak mendukung: kontrol disembunyikan */ }
  }, [on, qr]);

  // cubit dua jari
  useEffect(() => {
    const el = boxRef?.current;
    if (!el || !cap) return;
    let d0 = 0, z0 = 1;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const ts = (e) => { if (e.touches.length === 2) { d0 = dist(e.touches); z0 = cur.current; } };
    const tm = (e) => { if (e.touches.length === 2 && d0) ap.current(z0 * (dist(e.touches) / d0)); };
    const te = () => { d0 = 0; };
    el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchmove', tm, { passive: true });
    el.addEventListener('touchend', te);
    return () => { el.removeEventListener('touchstart', ts); el.removeEventListener('touchmove', tm); el.removeEventListener('touchend', te); };
  }, [cap, boxRef]);

  if (!cap) return null;
  const st = Math.max(cap.step, (cap.max - cap.min) / 20);
  return (
    <div className="cam-zoom">
      <style>{CSS}</style>
      <button type="button" className="ghost" aria-label="Zoom out" onClick={() => apply(cur.current - st)}>−</button>
      <input type="range" aria-label="Zoom kamera" min={cap.min} max={cap.max} step={cap.step} value={val} onChange={(e) => apply(parseFloat(e.target.value))} />
      <button type="button" className="ghost" aria-label="Zoom in" onClick={() => apply(cur.current + st)}>+</button>
      <output>{val.toFixed(1)}×</output>
    </div>
  );
}
