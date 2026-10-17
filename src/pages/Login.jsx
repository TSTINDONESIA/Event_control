import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js';
import { Logo, HERO_IMG } from '../components.jsx';

const FEAT = [
  ['Real-time', 'Data stok & status terupdate secara real-time.'],
  ['Akurat & terkontrol', 'Setiap unit dengan QR Code dan riwayat transaksi.'],
  ['Terintegrasi', 'Event, Warehouse dan Teknisi saling terkoneksi.'],
  ['Laporan lengkap', 'Riwayat, penggunaan, kondisi dan stok tersedia.'],
];

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
    <div className="login-hero" style={{ backgroundImage: `url(${HERO_IMG})` }}>
      <div className="login-in">
        <div className="login-copy">
          <div className="brand"><Logo /></div>
          <h1>TST Event <span className="y">Control</span></h1>
          <p>Kontrol peralatan event secara real-time, akurat, dan terintegrasi.</p>
        </div>
        <form className="login-card" onSubmit={submit}>
          <h2>Masuk</h2>
          <label htmlFor="em">Email</label>
          <input id="em" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
          <button className="big" disabled={busy}>{busy ? 'Masuk…' : 'Masuk'}</button>
          {(err || error) && <p className="err" role="alert">{err || error}</p>}
        </form>
      </div>
      <div className="feat"><div className="feat-in">
        {FEAT.map(([t, d]) => <div key={t}><b>{t}</b><span>{d}</span></div>)}
      </div></div>
    </div>
  );
}
