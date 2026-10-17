import { useEffect, useState } from 'react';
import { ref, onValue, push } from 'firebase/database';
import { db } from './firebase.js';

export const overlap = (a, b) => a.mulai <= b.selesai && b.mulai <= a.selesai; // yyyy-mm-dd
export const assetUrl = (id) => `${location.origin}${location.pathname}#/aset/${id}`;
export const fmt = (t) => new Date(t).toLocaleString('id-ID');
export const list = (o) => Object.entries(o || {}).map(([id, v]) => ({ id, ...v }));

// undefined = memuat, null = kosong/ditolak
export function useVal(path) {
  const [v, setV] = useState(undefined);
  useEffect(() => {
    setV(undefined);
    return onValue(ref(db, path), (s) => setV(s.val()), () => setV(null));
  }, [path]);
  return v;
}

export const audit = (uid, aksi, detail) =>
  push(ref(db, 'audit'), { uid, aksi, detail: String(detail || ''), waktu: Date.now() });
