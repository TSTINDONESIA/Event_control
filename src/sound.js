// Bunyi beep (WebAudio, tanpa file audio). Di iPhone harus "dibuka" lewat sentuhan: panggil unlockBeep dari event sentuh/klik.
let actx = null;
export function unlockBeep() {
  try {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); }
    if (actx && actx.state === 'suspended') actx.resume();
  } catch { /* abaikan */ }
  return actx;
}

// nada: [[frekuensi Hz, mulai (detik), lama (detik)], ...]
function play(tones, vibrate) {
  try {
    const c = unlockBeep();
    if (c) {
      const t0 = c.currentTime;
      const comp = c.createDynamicsCompressor();     // keras tapi tidak pecah
      comp.connect(c.destination);
      tones.forEach(([f, d, len]) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'square'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(1, t0 + d + 0.01);
        g.gain.setValueAtTime(1, t0 + d + len - 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + len);
        o.connect(g); g.connect(comp);
        o.start(t0 + d); o.stop(t0 + d + len + 0.01);
      });
    }
  } catch { /* abaikan */ }
  try { navigator.vibrate && navigator.vibrate(vibrate); } catch { /* iPhone/Safari tidak mendukung getar */ }
}

export const bunyi = {
  scan: () => play([[1500, 0, 0.13], [2200, 0.14, 0.13]], [200, 60, 200]),   // "bip-biip" naik, sama seperti SIS
  ok: () => play([[1900, 0, 0.1]], 40),
  gagal: () => play([[280, 0, 0.32]], [80, 40, 80]),
};
