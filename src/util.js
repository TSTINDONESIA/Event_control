import { useEffect, useState } from 'react';
import { ref, onValue, push, query, orderByChild, equalTo } from 'firebase/database';
import { db } from './firebase.js';
import { PRESET_NAMES } from './presets.js';

export const assetUrl = (id) => `${location.origin}${location.pathname}#/aset/${id}`;
export const fmt = (t) => new Date(t).toLocaleString('id-ID');
export const list = (o) => Object.entries(o || {}).map(([id, v]) => ({ id, ...v }));
// tanggal lokal (WIB) yyyy-mm-dd, bukan UTC
export const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
export const fmtDate = (s) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
export const range = (e) => (e.mulai === e.selesai ? fmtDate(e.mulai) : `${fmtDate(e.mulai)} – ${fmtDate(e.selesai)}`);

// undefined = memuat, null = kosong/ditolak
export function useVal(path) {
  const [v, setV] = useState(undefined);
  useEffect(() => {
    setV(undefined);
    return onValue(ref(db, path), (s) => setV(s.val()), () => setV(null));
  }, [path]);
  return v;
}

// baca anak-anak yang child-nya = value (butuh .indexOn di rules)
export function useByChild(path, child, value, enabled = true) {
  const [v, setV] = useState(undefined);
  useEffect(() => {
    if (!enabled) { setV(null); return; }
    setV(undefined);
    return onValue(query(ref(db, path), orderByChild(child), equalTo(value)), (s) => setV(s.val()), () => setV(null));
  }, [path, child, value, enabled]);
  return v;
}

// daftar kategori yang sudah dipakai unit (untuk saran isian)
export const katOptions = (assets) => [...new Set([...PRESET_NAMES, ...Object.values(assets || {}).map((a) => a.kategori).filter(Boolean)])].sort();

export const audit = (uid, aksi, detail) =>
  push(ref(db, 'audit'), { uid, aksi, detail: String(detail || ''), waktu: Date.now() });

// id label dari teks QR (#/aset/<id>) atau id mentah; null bila bukan format label
export function labelId(text) {
  const t = String(text || '').trim();
  const m = t.match(/#\/aset\/([^/?\s]+)/);
  const id = m ? m[1] : t;
  return /^[-_A-Za-z0-9]{15,30}$/.test(id) ? id : null;
}
