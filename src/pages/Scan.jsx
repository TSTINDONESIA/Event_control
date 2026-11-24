import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVal, list, labelId } from '../util.js';
import { useAuth } from '../AuthContext.jsx';
import { bunyi, unlockBeep } from '../sound.js';
import QrCamera from '../QrCamera.jsx';

export default function Scan() {
  const nav = useNavigate();
  const { profile } = useAuth();
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
    setErr('');
    const id = resolve(text);
    if (id) { done.current = true; bunyi.scan(); nav('/aset/' + id); return; }
    const lid = labelId(text);
    if (lid && profile.role !== 'teknisi') { done.current = true; bunyi.scan(); nav('/daftar?id=' + lid); return; } // label baru: daftarkan
    bunyi.gagal(); setErr('QR / kode tidak dikenali: ' + text);
  }
  return (
    <div onPointerDown={unlockBeep}>
      <QrCamera onCode={go} hint="Arahkan kamera ke label QR unit." />
      {err && <p className="err" role="alert">{err}</p>}
      <form className="card row" onSubmit={(e) => { e.preventDefault(); go(manual); }}>
        <input aria-label="Kode unit" style={{ flex: 1, minWidth: 220 }} placeholder="Input manual: kode unit (mis. LAM-0001)" value={manual} onChange={(e) => setManual(e.target.value)} />
        <button>Cari</button>
      </form>
    </div>
  );
}
