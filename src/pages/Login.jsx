import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase.js';
import { Logo, Footer, HERO_IMG } from '../components.jsx';
import { Icon, Reveal } from '../ui.jsx';
import { QR } from '../components.jsx';

const FEATS = [
  ['calendar', 'Event & Penugasan', 'Atur jadwal, lokasi, kebutuhan alat, dan penugasan teknisi.', 'var(--blue)'],
  ['box', 'Inventaris Peralatan', 'Satu QR per unit, kategori, dan status peralatan.', 'var(--violet)'],
  ['qr', 'Scan QR', 'Scan kamera atau input manual untuk cek dan serah terima unit.', 'var(--cyan)'],
  ['warehouse', 'Gudang & Stok', 'Pantau stok per kategori, unit siap kirim, dan unit servis.', 'var(--gold)'],
  ['truck', 'Pengiriman & Pengembalian', 'Keluar, terima teknisi, kembali ke gudang, Surat Jalan PDF.', 'var(--amber)'],
  ['chart', 'Laporan & Ekspor', 'Laporan stok dan kerusakan, ekspor CSV, riwayat audit.', 'var(--blue)'],
];
const ROLES = {
  teknisi: { icon: 'tools', title: 'Selamat Datang, Teknisi!', desc: 'Lihat jadwal dan alat yang harus disiapkan untuk event Anda.', list: ['Lihat tugas & jadwal event', 'Checklist setup per unit', 'Konfirmasi terima & kembalikan alat', 'Laporkan kerusakan unit'], tag: 'Kerja Lebih Mudah Bersama TST' },
  admin: { icon: 'chart', title: 'Selamat Datang, Admin!', desc: 'Kelola seluruh data, pantau operasional, dan akses laporan lengkap.', list: ['Buat event & tugaskan teknisi', 'Kelola inventaris & kategori', 'Kelola pengguna & peran', 'Laporan, ekspor, dan audit log'], tag: 'Semua Data Dalam Satu Sistem' },
  warehouse: { icon: 'warehouse', title: 'Selamat Datang, Gudang!', desc: 'Siapkan, keluarkan, dan terima kembali peralatan dengan scan QR.', list: ['Siapkan & keluarkan alat (scan)', 'Terima kembali & cek kondisi', 'Stok gudang per kategori', 'Cetak label QR & Surat Jalan'], tag: 'Stok Akurat, Gudang Terkontrol' },
};

// ilustrasi hero: flight case + QR + sorot lampu (ilustrasi, bukan data operasional)
function HeroVisual() {
  return (
    <div className="hv" aria-hidden="true">
      <svg className="scene" viewBox="0 0 560 440">
        <defs>
          <linearGradient id="bm1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFC629" stopOpacity=".55" /><stop offset="1" stopColor="#FFC629" stopOpacity="0" /></linearGradient>
          <linearGradient id="bm2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#25D9F2" stopOpacity=".5" /><stop offset="1" stopColor="#168BFF" stopOpacity="0" /></linearGradient>
          <linearGradient id="bm3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7957FF" stopOpacity=".55" /><stop offset="1" stopColor="#7957FF" stopOpacity="0" /></linearGradient>
          <linearGradient id="cf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22324f" /><stop offset="1" stopColor="#0b1424" /></linearGradient>
          <linearGradient id="ct" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#34476b" /><stop offset="1" stopColor="#1b2a47" /></linearGradient>
          <radialGradient id="floor" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFC629" stopOpacity=".55" /><stop offset="1" stopColor="#FFC629" stopOpacity="0" /></radialGradient>
        </defs>
        <line x1="20" y1="26" x2="540" y2="26" stroke="#3a4f78" strokeWidth="5" />
        <line x1="20" y1="38" x2="540" y2="38" stroke="#2a3b5c" strokeWidth="3" />
        {[[130, 'bm1', 300], [290, 'bm2', 330], [450, 'bm3', 340]].map(([x, g, tx]) => (
          <g key={x}>
            <polygon className="beam" points={`${x - 12},44 ${x + 12},44 ${tx + 90},380 ${tx - 90},380`} fill={`url(#${g})`} />
            <rect x={x - 14} y="38" width="28" height="18" rx="5" fill="#16233d" stroke="#4a6190" />
            <circle cx={x} cy="58" r="6" fill="#fff" opacity=".9" />
          </g>
        ))}
        <ellipse cx="270" cy="384" rx="230" ry="34" fill="url(#floor)" />
        {/* case kecil di atas */}
        <polygon points="150,170 310,170 350,150 190,150" fill="url(#ct)" stroke="#4a6190" strokeWidth="1" />
        <rect x="150" y="170" width="160" height="40" fill="url(#cf)" stroke="#4a6190" />
        <polygon points="310,170 350,150 350,190 310,210" fill="#0d1830" stroke="#4a6190" />
        {/* case utama */}
        <polygon points="110,210 350,210 430,170 190,170" fill="url(#ct)" stroke="#5a72a3" strokeWidth="1.2" />
        <rect x="110" y="210" width="240" height="160" rx="4" fill="url(#cf)" stroke="#5a72a3" strokeWidth="1.2" />
        <polygon points="350,210 430,170 430,330 350,370" fill="#0a1426" stroke="#5a72a3" strokeWidth="1.2" />
        {[130, 150, 330].map((x) => <line key={x} x1={x} y1="214" x2={x} y2="366" stroke="#fff" opacity=".05" />)}
        {[[110, 210], [338, 210], [110, 358], [338, 358]].map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width="12" height="12" fill="#8fa3c8" opacity=".85" />)}
        {[150, 290].map((x) => <g key={x}><rect x={x} y="206" width="30" height="22" rx="3" fill="#9aa9c6" /><rect x={x + 6} y="212" width="18" height="10" rx="2" fill="#2a3b5c" /></g>)}
        <rect x="185" y="238" width="96" height="116" rx="6" fill="#0a1426" stroke="#FFC629" strokeWidth="1.4" opacity=".95" />
        <text x="233" y="348" textAnchor="middle" fill="#F4F7FF" fontSize="11" fontWeight="800" fontFamily="Montserrat,sans-serif">EVT-0427</text>
        <path d="M110 340 L350 340" stroke="#FFC629" opacity=".35" strokeWidth="1" />
        <path d="M20 410 C150 380 260 420 420 392 S520 392 548 380" fill="none" stroke="#FFC629" strokeWidth="1.6" opacity=".7" />
        <path d="M10 424 C160 396 300 432 440 404 S520 408 550 396" fill="none" stroke="#168BFF" strokeWidth="1.2" opacity=".6" />
      </svg>
      <div className="hv-qr"><QR text="TST Event Control – contoh label" size={120} /></div>
      <div className="fcard a">
        <span className="mini"><Icon n="qr" size={18} /></span>
        <div><b>Scan QR</b>Unit #EVT-0427<br /><span className="tag">Tersedia</span><span className="demo">Contoh tampilan</span></div>
      </div>
      <div className="fcard b">
        <small>Unit aktif</small>
        <div className="ring"><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" /><circle cx="30" cy="30" r="24" fill="none" stroke="#25D9F2" strokeWidth="7" strokeLinecap="round" strokeDasharray="118 151" /></svg></div>
        <b>78%</b><span className="demo">Contoh tampilan</span>
      </div>
      <div className="light-lines" />
    </div>
  );
}

export default function Login({ error }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState('teknisi');
  const [open, setOpen] = useState(false);
  const [sec, setSec] = useState('beranda');
  const R = ROLES[role];

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setSec(e.target.id)), { rootMargin: '-45% 0px -50% 0px' });
    ['beranda', 'fitur', 'masuk', 'kontak'].forEach((id) => { const n = document.getElementById(id); n && io.observe(n); });
    return () => io.disconnect();
  }, []);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await signInWithEmailAndPassword(auth, email.trim(), pw); }
    catch { setErr('Email atau password salah.'); }
    setBusy(false);
  }
  const go = (id) => (e) => { e.preventDefault(); setOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <div className="lp">
      <header className={'lp-head' + (open ? ' open' : '')}>
        <div className="lp-head-in">
          <a href="#beranda" className="brand" onClick={go('beranda')} aria-label="TST Event Control"><Logo /></a>
          <nav className="lp-nav" aria-label="Navigasi utama">
            {[['beranda', 'Beranda'], ['fitur', 'Fitur'], ['masuk', 'Peran'], ['kontak', 'Kontak']].map(([id, l]) => <a key={id} href={'#' + id} className={sec === id ? 'on' : ''} onClick={go(id)}>{l}</a>)}
          </nav>
          <div className="lp-cta"><a href="#masuk" className="btn" onClick={go('masuk')}>Masuk</a></div>
          <button className="icon-btn lp-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon n={open ? 'x' : 'menu'} /></button>
        </div>
      </header>

      <section className="hero" id="beranda">
        <div className="hero-photo" style={{ backgroundImage: `url(${HERO_IMG})` }} />
        <div className="hero-in">
          <div>
            <div className="kick">Solusi Lengkap Pengelolaan</div>
            <h1><span className="g1">Event, Inventaris &amp; Operasional Teknisi</span><br /><span className="g2">TST Event Control</span></h1>
            <p className="lead">Kelola jadwal event, peralatan, stok gudang, penugasan teknisi, dan serah terima barang melalui satu sistem yang terintegrasi.</p>
            <div className="hero-cta">
              <a className="btn" href="#masuk" onClick={go('masuk')}>Mulai Sekarang <Icon n="arrow" size={18} /></a>
              <a className="btn ghost" href="#fitur" onClick={go('fitur')}>Pelajari Lebih Lanjut</a>
            </div>
            <div className="hero-chips">
              {[['calendar', 'Event & Tugas'], ['box', 'Inventaris'], ['qr', 'Scan QR'], ['warehouse', 'Gudang'], ['chart', 'Laporan']].map(([i, l]) => <span key={l}><i><Icon n={i} /></i>{l}</span>)}
            </div>
          </div>
          <HeroVisual />
        </div>
      </section>

      <section className="lp-sec" id="fitur">
        <Reveal><h2 className="sec-title">Semua yang Anda butuhkan, dalam satu platform</h2><p className="sec-sub">Satu Sistem – Satu Data – Semua Terhubung. Lebih teratur, akurat, dan terpercaya.</p></Reveal>
        <div className="feat-strip">
          {FEATS.map(([i, t, d, c], k) => (
            <Reveal key={t} delay={k * 70} className="fcard-f" style={{ '--fc': c }}>
              <div className="fi"><Icon n={i} size={22} /></div><h3>{t}</h3><p>{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="lp-sec" id="masuk">
        <div className="role-wrap">
          <Reveal wipe className="role-panel">
            <div className="role-tabs" role="tablist">
              {[['teknisi', 'Teknisi'], ['admin', 'Admin'], ['warehouse', 'Gudang']].map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={role === k} className={role === k ? 'on' : ''} onClick={() => setRole(k)}>{l}</button>)}
            </div>
            <div className="role-body" key={role}>
              <div>
                <h2>{R.title}</h2>
                <p>{R.desc}</p>
                <ul className="role-list">{R.list.map((x) => <li key={x}><Icon n="check" size={18} />{x}</li>)}</ul>
                <span className="tagline">{R.tag}</span>
              </div>
              <div className="role-art"><span className="corner c1" /><span className="corner c2" /><span className="corner c3" /><span className="corner c4" /><div className="big-ico"><Icon n={R.icon} size={46} sw={1.5} /></div></div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <form className="login-card" onSubmit={submit}>
              <h2>Masuk</h2>
              <p className="sub">Gunakan akun yang diberikan admin. Hak akses mengikuti peran akun Anda.</p>
              <label htmlFor="em">Email</label>
              <div className="field"><Icon n="users" size={18} className="lead" /><input id="em" type="email" autoComplete="username" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              <label htmlFor="pw">Password</label>
              <div className="field"><Icon n="key" size={18} className="lead" /><input id="pw" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required />
                <button type="button" className="eye" aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} onClick={() => setShow(!show)}><Icon n={show ? 'eyeOff' : 'eye'} size={18} /></button></div>
              <button className="big" disabled={busy}>{busy ? 'Masuk…' : 'Masuk'}</button>
              {(err || error) && <p className="err" role="alert">{err || error}</p>}
              <small>Lupa password? Hubungi admin untuk reset.</small>
            </form>
          </Reveal>
        </div>
      </section>

      <div className="lp-foot-band" id="kontak"><div className="tagrow"><b>Event Sukses, Operasional Lancar</b><small>Real-time · Akurat &amp; terkontrol · Terintegrasi · Laporan lengkap</small></div></div>
      <Footer />
    </div>
  );
}
