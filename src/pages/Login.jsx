import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js';

export default function Login({ error }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await signInWithEmailAndPassword(auth, email.trim(), pw); }
    catch { setErr('Email atau password salah.'); }
    setBusy(false);
  }
  return (
    <form className="card login" onSubmit={submit}>
      <h2>TST EVENT CONTROL</h2>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required />
      <button disabled={busy}>{busy ? 'Masuk…' : 'Masuk'}</button>
      {(err || error) && <p className="err">{err || error}</p>}
    </form>
  );
}
