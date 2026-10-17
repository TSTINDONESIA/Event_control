import { useState } from 'react';
import { useVal, list, assetUrl } from '../util.js';
import { QR } from '../components.jsx';

export default function Labels() {
  const assets = useVal('assets');
  const [cat, setCat] = useState('');
  if (assets === undefined) return <p>Memuat…</p>;
  const all = list(assets).sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
  const cats = [...new Set(all.map((x) => x.kategori || ''))];
  const shown = all.filter((x) => cat === '' || (x.kategori || '') === cat);
  return (
    <>
      <h2>{shown.length} label siap cetak</h2>
      <div className="row">
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Semua kategori</option>
          {cats.map((c) => <option key={c} value={c}>{c || '(tanpa kategori)'}</option>)}
        </select>
        <button className="dark" onClick={() => window.print()}>Cetak</button>
      </div>
      <div className="print-area labels">
        {shown.map((a) => (
          <div className="label" key={a.id}><QR text={assetUrl(a.id)} size={110} /><div><b>{a.kode}</b><br />{a.nama}</div></div>
        ))}
      </div>
    </>
  );
}
