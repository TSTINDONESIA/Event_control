import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js';
import { Logo } from '../components.jsx';

export default function Login({ error }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await signInWithEmailAndPassword(auth, email.trim(), pw); }
    catch { setErr('Email atau password salah.'); }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 20, paddingTop: 'max(20px, env(safe-area-inset-top))', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', background: 'var(--bg)' }}>
      <form className="login-card" onSubmit={submit} style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><Logo size={72} /></div>
        <h2 style={{ textAlign: 'center', margin: 0 }}>Masuk</h2>
        <input type="email" autoComplete="username" inputMode="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div style={{ position: 'relative' }}>
          <input type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required style={{ width: '100%', paddingRight: 70 }} />
          <button type="button" className="ghost" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 4, top: 4, bottom: 4, padding: '0 12px' }}>{show ? 'Sembunyi' : 'Lihat'}</button>
        </div>
        {(err || error) && <p className="err" role="alert" style={{ margin: 0 }}>{err || error}</p>}
        <button className="big" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
      </form>
    </div>
  );
}
