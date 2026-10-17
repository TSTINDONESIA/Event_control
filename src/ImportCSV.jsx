import { useState } from 'react';
import { ref, push, update } from 'firebase/database';
import { db } from './firebase.js';
import { useAuth } from './AuthContext.jsx';
import { audit } from './util.js';
import { parseCSV, toCSV, download } from './csv.js';

export default function ImportCSV({ all }) {
  const { profile } = useAuth();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFile(e) {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    setBusy(true); setMsg('');
    try {
      const rows = parseCSV(await file.text());
      const head = rows.shift().map((h) => h.trim().toLowerCase());
      const ix = (n) => head.indexOf(n);
      if (ix('nama') < 0) throw new Error('Kolom "nama" wajib ada. Kolom lain: kategori, jumlah.');
      const count = {};
      all.forEach((x) => { const p = (x.kode || '').split('-')[0]; count[p] = (count[p] || 0) + 1; });
      const up = {}; let total = 0;
      for (const r of rows) {
        const nama = (r[ix('nama')] || '').trim(); if (!nama) continue;
        const kategori = ix('kategori') >= 0 ? (r[ix('kategori')] || '').trim() : '';
        const n = Math.min(50, Math.max(1, parseInt(ix('jumlah') >= 0 ? r[ix('jumlah')] : 1, 10) || 1));
        const prefix = (kategori || nama).replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AST';
        for (let i = 0; i < n; i++) {
          count[prefix] = (count[prefix] || 0) + 1; total++;
          if (total > 500) throw new Error('Maksimal 500 unit per impor.');
          up['assets/' + push(ref(db, 'assets')).key] = {
            kode: `${prefix}-${String(count[prefix]).padStart(4, '0')}`, nama, kategori, status: 'tersedia', dibuat: Date.now(),
          };
        }
      }
      if (!total) throw new Error('Tidak ada baris valid.');
      await update(ref(db), up);
      await audit(profile.uid, 'impor_csv', total + ' unit');
      setMsg(total + ' unit berhasil diimpor.');
    } catch (x) { setMsg('Gagal: ' + x.message); }
    setBusy(false);
  }
  return (
    <div className="card row">
      <label>Impor CSV (kolom: nama, kategori, jumlah) <input type="file" accept=".csv" disabled={busy} onChange={onFile} /></label>
      <button type="button" onClick={() => download('aset.csv', toCSV(all, ['kode', 'nama', 'kategori', 'status']))}>Ekspor CSV</button>
      {msg && <p>{msg}</p>}
    </div>
  );
}
