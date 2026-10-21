import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js';
import { Logo } from '../components.jsx';
import { Icon } from '../ui.jsx';
import { Beams } from '../Splash.jsx';

const Svg = ({ d }) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

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
    <div className="lg">
      <Beams />
      <div className="lg-top">
        <div className="intro-logo"><Logo size={104} /></div>
        <h1>TST Event Control</h1>
        <p>Event, alat, dan tugas dalam satu aplikasi</p>
      </div>
      <form className="lg-card" onSubmit={submit}>
        <h2>Masuk ke akun Anda</h2>
        <div className="lg-f">
          <Svg d="M3 6h18v12H3zM3 7l9 6 9-6" />
          <input type="email" autoComplete="username" inputMode="email" autoCapitalize="none" placeholder="Email" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="lg-f">
          <Svg d="M6 11h12v9H6zM8 11V8a4 4 0 018 0v3" />
          <input type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" aria-label="Password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          <button type="button" className="lg-eye" aria-label={show ? 'Sembunyikan password' : 'Lihat password'} onClick={() => setShow(!show)}><Icon n={show ? 'eyeOff' : 'eye'} /></button>
        </div>
        {(err || error) && <p className="lg-err" role="alert">{err || error}</p>}
        <button className="lg-btn" disabled={busy}>{busy ? 'Masuk…' : <>Masuk <Icon n="arrow" size={20} /></>}</button>
      </form>
      <div className="lg-chips" aria-hidden="true">
        <span><Icon n="calendar" size={14} />Event &amp; Tugas</span>
        <span><Icon n="qr" size={14} />Scan QR</span>
        <span><Icon n="bell" size={14} />Notifikasi</span>
      </div>
      <p className="lg-foot">© TST Indonesia</p>
    </div>
  );
}
