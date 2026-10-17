import { useState } from 'react';
import { ref, push } from 'firebase/database';
import { db } from '../firebase.js';
import { useVal, list, assetUrl } from '../util.js';
import { QR, Loading } from '../components.jsx';

export default function Labels() {
  const assets = useVal('assets');
  const [mode, setMode] = useState('kosong');
  const [cat, setCat] = useState('');
  const [n, setN] = useState(24);
  const [blank, setBlank] = useState([]);
  if (assets === undefined) return <Loading />;
  const all = list(assets).sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
  const cats = [...new Set(all.map((x) => x.kategori || ''))];
  const shown = all.filter((x) => cat === '' || (x.kategori || '') === cat);
  // push() hanya membuat kunci unik di sisi klien; belum menulis apa pun ke database
  const make = () => setBlank(Array.from({ length: Math.min(120, Math.max(1, parseInt(n, 10) || 1)) }, () => push(ref(db, 'assets')).key));
  return (
    <>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className={mode === 'kosong' ? '' : 'ghost'} onClick={() => setMode('kosong')}>Label kosong (unit baru)</button>
        <button className={mode === 'unit' ? '' : 'ghost'} onClick={() => setMode('unit')}>Label unit terdaftar</button>
      </div>
      {mode === 'kosong' ? (
        <>
          <p>Cetak label kosong, tempel ke barang baru, lalu daftarkan lewat menu <b>Daftar unit (scan)</b>. Cetak dari alamat aplikasi yang sudah online (bukan localhost) agar QR bisa dibuka di HP lain.</p>
          <div className="row">
            <input type="number" min="1" max="120" aria-label="Jumlah label" value={n} onChange={(e) => setN(e.target.value)} style={{ width: 100 }} />
            <button onClick={make}>Buat lembar label</button>
            <button className="dark" disabled={!blank.length} onClick={() => window.print()}>Cetak</button>
            <small>{blank.length ? `${blank.length} label siap cetak` : 'Maksimal 120 label sekali buat.'}</small>
          </div>
          <div className="print-area labels">
            {blank.map((id) => (
              <div className="label blank" key={id}><QR text={assetUrl(id)} size={110} />
                <div><b>TST INDONESIA</b><br /><small>Kode:</small><div className="line" /></div></div>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2>{shown.length} label siap cetak</h2>
          <div className="row">
            <select aria-label="Kategori" value={cat} onChange={(e) => setCat(e.target.value)}>
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
      )}
    </>
  );
}
