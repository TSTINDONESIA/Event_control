import { useState } from 'react';
import { PRESET } from './presets.js';

// Isi jumlah per alat seperti di kertas checklist, lalu tambahkan sekaligus.
export default function PresetPicker({ existing, onAdd, busy }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState({});
  const have = new Set(existing.map((k) => (k.grup || '') + '|' + k.kategori));
  const picked = Object.entries(q).filter(([, v]) => parseInt(v, 10) > 0);
  async function submit() {
    await onAdd(picked.map(([key, v]) => { const [grup, nama] = key.split('|'); return { grup, kategori: nama, jumlah: parseInt(v, 10) }; }));
    setQ({});
  }
  return (
    <div className="card">
      <button type="button" className="ghost" onClick={() => setOpen(!open)}>{open ? 'Tutup daftar alat' : 'Pilih dari daftar alat (seperti checklist kertas)'}</button>
      {open && (
        <>
          {Object.entries(PRESET).map(([grup, items]) => (
            <details key={grup} style={{ marginTop: 10 }}>
              <summary><b>{grup}</b></summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '6px 16px', marginTop: 8 }}>
                {items.map((n) => {
                  const key = grup + '|' + n;
                  return (
                    <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>{n}{have.has(key) && <small> ✓</small>}</span>
                      <input type="number" min="0" style={{ width: 64 }} aria-label={'Jumlah ' + n} value={q[key] || ''} onChange={(e) => setQ({ ...q, [key]: e.target.value })} />
                    </label>
                  );
                })}
              </div>
            </details>
          ))}
          <p><button type="button" disabled={busy || picked.length === 0} onClick={submit}>Tambahkan {picked.length || ''} alat terisi</button></p>
        </>
      )}
    </div>
  );
}
