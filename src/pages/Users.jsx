import { useState } from 'react';
import { ref, update, get } from 'firebase/database';
import { sendPasswordResetEmail } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { db, auth, fn } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit } from '../util.js';
import { Loading } from '../components.jsx';

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
  async function hapus(u) {
    setMsg('');
    if (u.id === profile.uid) return;
    if (!confirm(`Hapus pengguna "${u.nama}" (${u.email})?\n\nAkun login ikut dihapus dan tidak bisa dibatalkan.`)) return;
    try {
      await httpsCallable(fn, 'hapusPengguna')({ uid: u.id });
      setMsg(`Pengguna ${u.nama} berhasil dihapus.`);
    } catch (e) { setMsg(e.message); }
  }
  async function add(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      await httpsCallable(fn, 'buatPengguna')({ nama: f.nama.trim(), email: f.email.trim(), password: f.password, role: f.role });
      setF({ nama: '', email: '', password: '', role: 'teknisi' });
      setMsg('Pengguna berhasil dibuat.');
    } catch (x) { setMsg(x.message); }
    setBusy(false);
  }
  if (users === undefined) return <Loading />;
  return (
    <>
      <form className="card flag row" onSubmit={add}>
        <input placeholder="Nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} required />
        <input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input type="password" autoComplete="new-password" placeholder="Password awal (min 8)" minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          <option value="teknisi">teknisi</option><option value="warehouse">warehouse</option><option value="admin">admin</option>
        </select>
        <button disabled={busy}>{busy ? 'Membuat…' : 'Buat pengguna'}</button>
      </form>
      <p><small>Akun baru akan diminta mengganti password saat login pertama, jadi password awal ini hanya Anda dan pengguna yang tahu. Pengguna juga bisa mengganti password kapan saja lewat menu “Ganti password”.</small></p>
      {msg && <p role="status" className={/berhasil|dikirim/.test(msg) ? 'okmsg' : 'err'}>{msg}</p>}
      <div className="tbl"><table><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Aktif</th><th>Reset password</th><th>Hapus</th></tr></thead>
        <tbody>{list(users).sort((a, b) => (a.nama || '').localeCompare(b.nama || '')).map((u) => {
          const me = u.id === profile.uid;
          return (
            <tr key={u.id}><td>{u.nama}{me && ' (Anda)'}</td><td><input defaultValue={u.email} onBlur={(e) => e.target.value.trim() !== (u.email || '') && patch(u.id, { email: e.target.value.trim() })} /></td>
              <td><select disabled={me} value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })}>
                <option>teknisi</option><option>warehouse</option><option>admin</option></select></td>
              <td><input type="checkbox" disabled={me} checked={u.aktif === true} onChange={(e) => patch(u.id, { aktif: e.target.checked })} /></td>
              <td><button className="ghost" onClick={() => sendPasswordResetEmail(auth, u.email).then(() => setMsg('Email reset dikirim ke ' + u.email)).catch((x) => setMsg(x.message))}>Kirim reset</button></td>
              <td><button className="danger" disabled={me} title={me ? 'Akun Anda sendiri tidak bisa dihapus' : 'Hapus pengguna'} onClick={() => hapus(u)}>Hapus</button></td></tr>
          );
        })}</tbody></table></div>
      <Backup />
    </>
  );
}

// Cadangan data: unduh semua data penting sebagai satu file JSON (disimpan di tempat aman milik kantor).
function Backup() {
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  async function go() {
    setBusy(true); setMsg('');
    try {
      const nodes = ['users', 'assets', 'events', 'serahTerima', 'checklist', 'transactions', 'laporanRusak', 'audit'];
      const snaps = await Promise.all(nodes.map((n) => get(ref(db, n))));
      const data = Object.fromEntries(nodes.map((n, i) => [n, snaps[i].val() || {}]));
      const blob = new Blob([JSON.stringify({ dibuat: new Date().toISOString(), data }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `backup-event-control-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      try { await audit(profile.uid, 'backup', 'unduh cadangan JSON'); } catch { /* opsional */ }
      setMsg('Cadangan diunduh. Simpan di tempat aman (bukan di perangkat ini saja).');
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }
  return (
    <div className="card" style={{ marginTop: 28 }}>
      <b>Cadangan data</b>
      <p><small>Mengunduh pengguna, inventaris, event, serah terima, riwayat, dan audit dalam satu file JSON. Lakukan rutin (mis. mingguan) di samping backup otomatis Firebase.</small></p>
      {msg && <p role="status" className="okmsg">{msg}</p>}
      <button onClick={go} disabled={busy}>{busy ? 'Menyiapkan…' : 'Unduh cadangan (JSON)'}</button>
    </div>
  );
}
