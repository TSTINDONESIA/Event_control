import { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { auth, db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { audit } from '../util.js';

export default function Password() {
  const { profile, patchProfile } = useAuth();
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setMsg(''); setOk(false);
    if (pw.length < 6) { setMsg('Password baru minimal 6 karakter.'); return; }
    if (pw !== pw2) { setMsg('Konfirmasi password tidak sama.'); return; }
    if (pw === cur) { setMsg('Password baru harus berbeda dari password lama.'); return; }
    setBusy(true);
    try {
      const u = auth.currentUser;
      await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, cur));
      await updatePassword(u, pw);
      if (profile.wajibGanti === true) {
        try { await set(ref(db, `users/${profile.uid}/wajibGanti`), false); patchProfile({ wajibGanti: false }); } catch { /* tidak kritis */ }
      }
      audit(profile.uid, 'ganti_password', profile.nama).catch(() => {});
      setCur(''); setPw(''); setPw2(''); setOk(true);
    } catch (x) {
      const c = x.code || '';
      setMsg(c.includes('wrong-password') || c.includes('invalid-credential') ? 'Password saat ini salah.'
        : c.includes('too-many') ? 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.'
        : c.includes('weak') ? 'Password terlalu lemah.' : 'Gagal mengganti password: ' + (x.message || c));
    }
    setBusy(false);
  }
  return (
    <form className="card flag pw-card" onSubmit={submit}>
      <p style={{ margin: 0 }}>Akun: <b>{auth.currentUser?.email}</b></p>
      <label htmlFor="cur">Password saat ini</label>
      <input id="cur" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required />
      <label htmlFor="n1">Password baru (min 6 karakter)</label>
      <input id="n1" type="password" autoComplete="new-password" minLength={6} value={pw} onChange={(e) => setPw(e.target.value)} required />
      <label htmlFor="n2">Ulangi password baru</label>
      <input id="n2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
      <button disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan password'}</button>
      {msg && <p className="err" role="alert">{msg}</p>}
      {ok && <p className="okmsg" role="status">Password berhasil diganti. Gunakan password baru saat login berikutnya.</p>}
    </form>
  );
}
