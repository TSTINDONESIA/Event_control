import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db, configured } from './firebase.js';

const Ctx = createContext({});
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [s, setS] = useState({ loading: true, user: null, profile: null });
  const [error, setError] = useState('');
  useEffect(() => {
    if (!configured) { setS({ loading: false, user: null, profile: null }); return; }
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { setS({ loading: false, user: null, profile: null }); return; }
      try {
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Tidak bisa terhubung ke database (10 dtk). Periksa databaseURL di src/firebaseConfig.js.')), 10000));
        const p = (await Promise.race([get(ref(db, 'users/' + u.uid)), timeout])).val();
        if (!p || p.aktif !== true) {
          setError('Akun belum terdaftar di database atau nonaktif. Hubungi admin.');
          await signOut(auth);
          return;
        }
        setError('');
        setS({ loading: false, user: u, profile: { ...p, uid: u.uid } });
      } catch (e) {
        setError('Gagal membaca profil: ' + e.message);
        await signOut(auth);
      }
    });
  }, []);
  return <Ctx.Provider value={{ ...s, error, logout: () => signOut(auth) }}>{children}</Ctx.Provider>;
}
