import { useState } from 'react';
import { ref, push, update } from 'firebase/database';
import { db } from './firebase.js';
import { list, audit } from './util.js';
import { parseWa } from './waParse.js';

const low = (s) => String(s || '').toLowerCase();

// cocokkan nama dari jadwal (mis. "Udin") dengan akun teknisi
function matchTek(names, techs) {
  const ids = {}; const miss = [];
  names.forEach((n) => {
    const q = low(n);
    const words = (t) => low(t.nama).split(/\s+/);
    let hit = techs.filter((t) => words(t).includes(q));
    if (!hit.length) hit = techs.filter((t) => q.length >= 3 && words(t).some((w) => w.startsWith(q)));
    if (hit.length) hit.forEach((t) => { ids[t.id] = true; }); else miss.push(n);
  });
  return { ids, miss };
}

// Admin: tempel jadwal dari WhatsApp -> tiap kegiatan jadi event sendiri (cek dulu, lalu simpan).
export default function WaImport({ users, events, profile, onMsg }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const techs = list(users).filter((x) => x.role === 'teknisi' && x.aktif === true).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

  const baca = () => {
    onMsg(''); setDone('');
    const found = parseWa(text);
    if (!found.length) { onMsg('Tidak ada kegiatan terbaca. Pastikan tiap kegiatan diawali nomor, mis. "1. Standby Keg 19-22 Oct (TST) Culmen".'); setItems([]); return; }
    const exist = list(events);
    setItems(found.map((f) => {
      const { ids, miss } = matchTek(f.names, techs);
      const dup = exist.some((e) => low(e.nama) === low(f.nama) && e.mulai === f.mulai);
      return { ...f, on: !dup, dup, tek: ids, miss };
    }));
  };
  const set_ = (i, patch) => setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function simpan() {
    onMsg(''); setDone('');
    const pick = items.filter((x) => x.on);
    if (!pick.length) { onMsg('Centang minimal satu event.'); return; }
    const bad = pick.find((x) => !x.nama.trim() || !x.mulai || !x.selesai || x.selesai < x.mulai);
    if (bad) { onMsg(`Lengkapi nama dan tanggal dulu: ${bad.nama || bad.label}`); return; }
    setBusy(true);
    try {
      const up = {};
      pick.forEach((x) => {
        const key = push(ref(db, 'events')).key;
        const teknisi = Object.fromEntries(techs.filter((t) => x.tek[t.id]).map((t) => [t.id, t.nama]));
        up['events/' + key] = {
          nama: x.nama.trim(), lokasi: (x.lokasi || '').trim(), mulai: x.mulai, selesai: x.selesai, tahap: 'rencana',
          dibuat: Date.now(), dibuatOleh: profile.nama,
          ...(x.teks.trim() ? { kebutuhanTeks: x.teks.trim() } : {}), ...(Object.keys(teknisi).length ? { teknisi } : {}),
        };
      });
      await update(ref(db), up);
      await audit(profile.uid, 'impor_wa', `${pick.length} event`);
      setDone(`${pick.length} event dibuat. Lihat di daftar tugas di bawah.`);
      setItems([]); setText('');
    } catch (e) { onMsg(e.message); }
    setBusy(false);
  }

  return (
    <details className="card flag" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary><b>Tempel jadwal dari WhatsApp</b></summary>
      <p><small>Salin pesan jadwal dari WA, tempel di sini. Tiap kegiatan jadi event sendiri (sub-jadwal seperti “21-22 Oct” dan “22-23 Oct” dipisah). Periksa dulu sebelum disimpan.</small></p>
      <textarea rows="8" aria-label="Jadwal WhatsApp" placeholder="Tempel jadwal WhatsApp di sini…" value={text} onChange={(e) => setText(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
      <p><button type="button" disabled={!text.trim()} onClick={baca}>Baca jadwal</button></p>
      {done && <p className="okmsg" role="status">{done}</p>}
      {items.length > 0 && (
        <>
          <p><b>{items.length} event terbaca.</b> <small>Ubah bila perlu, hilangkan centang untuk melewati.</small></p>
          {items.map((x, i) => (
            <div className="card" key={i} style={{ opacity: x.on ? 1 : 0.55 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 800 }}>
                <input type="checkbox" checked={x.on} onChange={(e) => set_(i, { on: e.target.checked })} /> {x.label}
              </label>
              {x.dup && <p className="err"><small>Sudah ada event dengan nama dan tanggal mulai yang sama (dilewati secara bawaan).</small></p>}
              <div className="ne-grid" style={{ marginTop: 8 }}>
                <label>Vendor<input value={x.nama} onChange={(e) => set_(i, { nama: e.target.value })} /></label>
                <label>Lokasi<input value={x.lokasi} onChange={(e) => set_(i, { lokasi: e.target.value })} /></label>
                <label>Mulai<input type="date" value={x.mulai} onChange={(e) => set_(i, { mulai: e.target.value })} /></label>
                <label>Selesai<input type="date" value={x.selesai} min={x.mulai} onChange={(e) => set_(i, { selesai: e.target.value })} /></label>
              </div>
              <label style={{ display: 'block', marginTop: 8, fontSize: 12, fontWeight: 800 }}>KEBUTUHAN ALAT & CATATAN
                <textarea rows="5" value={x.teks} onChange={(e) => set_(i, { teks: e.target.value })} style={{ width: '100%', boxSizing: 'border-box', marginTop: 4 }} />
              </label>
              <div style={{ marginTop: 8 }}>
                <b style={{ fontSize: 12 }}>TEKNISI</b>
                {techs.length === 0 ? <p><small>Belum ada akun teknisi aktif.</small></p> : (
                  <div className="ne-tek">{techs.map((t) => <label key={t.id}><input type="checkbox" checked={!!x.tek[t.id]} onChange={(e) => set_(i, { tek: { ...x.tek, [t.id]: e.target.checked } })} /> {t.nama}</label>)}</div>
                )}
                {x.miss.length > 0 && <p><small>Tidak ada akun teknisi untuk: {x.miss.join(', ')}.</small></p>}
              </div>
            </div>
          ))}
          <button disabled={busy} onClick={simpan}>Simpan {items.filter((x) => x.on).length} event</button>
        </>
      )}
    </details>
  );
}
