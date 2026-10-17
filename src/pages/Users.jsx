import { useState } from 'react';
import { ref, set, update } from 'firebase/database';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../firebase.js';
import cfg from '../firebaseConfig.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit } from '../util.js';

export default function Users() {
  const { profile } = useAuth();
  const users = useVal('users');
  const [f, setF] = useState({ nama: '', email: '', password: '', role: 'teknisi' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function patch(id, data) {
    setMsg('');
    try { await update(ref(db, 'users/' + id), data); await audit(profile.uid, 'ubah_user', id + ' ' + JSON.stringify(data)); }
    catch (e) { setMsg(e.message); }
  }
  async function add(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    // Auth kedua supaya admin tidak ter-logout saat membuat akun baru
    const app2 = initializeApp(cfg, 'sec' + Date.now());
    try {
      const a2 = getAuth(app2);
      const c = await createUserWithEmailAndPassword(a2, f.email.trim(), f.password);
      try {
        await set(ref(db, 'users/' + c.user.uid), { nama: f.nama.trim(), email: f.email.trim(), role: f.role, aktif: true });
      } catch (x) { throw new Error(`Akun login dibuat (UID ${c.user.uid}) tapi profil gagal disimpan: ${x.message}`); }
      await audit(profile.uid, 'user_baru', f.email);
      await signOut(a2);
      setF({ nama: '', email: '', password: '', role: 'teknisi' });
      setMsg('Pengguna berhasil dibuat.');
    } catch (x) { setMsg(x.message); }
    await deleteApp(app2);
    setBusy(false);
  }
  if (users === undefined) return <p>Memuat…</p>;
  return (
    <>
      <form className="card flag row" onSubmit={add}>
        <input placeholder="Nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} required />
        <input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input type="text" placeholder="Password (min 6)" minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          <option value="teknisi">teknisi</option><option value="warehouse">warehouse</option><option value="admin">admin</option>
        </select>
        <button disabled={busy}>{busy ? 'Membuat…' : 'Buat pengguna'}</button>
      </form>
      {msg && <p role="status" className={/berhasil|dikirim/.test(msg) ? 'okmsg' : 'err'}>{msg}</p>}
      <div className="tbl"><table><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Aktif</th><th>Reset password</th></tr></thead>
        <tbody>{list(users).sort((a, b) => (a.nama || '').localeCompare(b.nama || '')).map((u) => {
          const me = u.id === profile.uid;
          return (
            <tr key={u.id}><td>{u.nama}{me && ' (Anda)'}</td><td><input defaultValue={u.email} onBlur={(e) => e.target.value.trim() !== (u.email || '') && patch(u.id, { email: e.target.value.trim() })} /></td>
              <td><select disabled={me} value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })}>
                <option>teknisi</option><option>warehouse</option><option>admin</option></select></td>
              <td><input type="checkbox" disabled={me} checked={u.aktif === true} onChange={(e) => patch(u.id, { aktif: e.target.checked })} /></td>
              <td><button className="ghost" onClick={() => sendPasswordResetEmail(auth, u.email).then(() => setMsg('Email reset dikirim ke ' + u.email)).catch((x) => setMsg(x.message))}>Kirim reset</button></td></tr>
          );
        })}</tbody></table></div>
    </>
  );
}
