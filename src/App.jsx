import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate, Link } from 'react-router-dom';
import { configured } from './firebase.js';
import { useAuth } from './AuthContext.jsx';
import { Band, Footer, Logo, Loading } from './components.jsx';
import { Icon } from './ui.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Inventory from './pages/Inventory.jsx';
import Stok from './pages/Stok.jsx';
import Asset from './pages/Asset.jsx';
import Scan from './pages/Scan.jsx';
import Report from './pages/Report.jsx';
import Labels from './pages/Labels.jsx';
import Users from './pages/Users.jsx';
import Password from './pages/Password.jsx';
import Daftar from './pages/Daftar.jsx';
import SuratJalan from './pages/SuratJalan.jsx';
import Notifikasi, { Bell, NotifBridge } from './Notif.jsx';

const TITLES = {
  '/dashboard': ['Dashboard', 'Ringkasan aktivitas operasional hari ini.'],
  '/event': ['Tugas', 'Event, teknisi, dan alat yang harus disiapkan.'],
  '/stok': ['Stok gudang', 'Berapa alat stand by, keluar, dan rusak.'],
  '/inventaris': ['Inventaris', 'Stok alat, satu QR per unit.'],
  '/scan': ['Cek unit', 'Scan label untuk melihat status unit.'],
  '/laporan': ['Laporan', 'Pengiriman ke teknisi, kerusakan, dan stok.'],
  '/label': ['Cetak QR', 'Label QR massal per kategori.'],
  '/daftar': ['Daftarkan unit via scan', 'Tempel label, scan, isi nama. Unit langsung masuk stok.'],
  '/notifikasi': ['Notifikasi', 'Info tugas dan status alat untuk akun Anda.'],
  '/password': ['Ganti password', 'Jaga kerahasiaan akun Anda.'],
  '/pengguna': ['Pengguna & peran', 'Kelola akun Admin, Warehouse, dan Teknisi.'],
};

function Setup() {
  return (
    <div className="pad">
      <h2>TST Event Control</h2>
      <p>Config Firebase belum diisi. Buka <code>src/firebaseConfig.js</code>, isi dengan config Web App dari Firebase Console, lalu build ulang / push ke GitHub.</p>
    </div>
  );
}

// transisi halaman: fade-out + wipe-out halaman lama, lalu wipe-in + fade-in halaman baru
function usePageFx(loc) {
  const [shown, setShown] = useState(loc);
  const [phase, setPhase] = useState('in');
  useEffect(() => {
    if (loc.pathname === shown.pathname) { if (loc !== shown) setShown(loc); return; }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setShown(loc); return; }
    setPhase('out');
    const t = setTimeout(() => { setShown(loc); setPhase('in'); }, 220);
    return () => clearTimeout(t);
  }, [loc]); // eslint-disable-line react-hooks/exhaustive-deps
  return [shown, phase];
}

export default function App() {
  const { loading, user, profile, error, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { pathname } = useLocation();
  const nav = useNavigate();
  const loc = useLocation();
  const [shown, phase] = usePageFx(loc);
  useEffect(() => { setOpen(false); }, [pathname]);
  if (!configured) return <Setup />;
  if (loading) return <div className="pad"><Loading /></div>;
  if (!user) return <Login error={error} />;
  const role = profile.role;
  const staff = role !== 'teknisi';
  const close = () => setOpen(false);
  const band = TITLES[pathname];
  const tgl = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const items = [
    ['/dashboard', 'Dashboard', 'home', true],
    ['/event', 'Event & Tugas', 'calendar', true],
    ['/stok', 'Stok Gudang', 'warehouse', staff],
    ['/inventaris', 'Inventaris', 'box', staff],
    ['/scan', 'Scan QR', 'qr', staff],
    ['/laporan', 'Laporan', 'chart', role === 'admin'],
    ['/pengguna', 'Pengguna', 'users', role === 'admin'],
  ].filter((x) => x[3]);
  const bottom = staff
    ? [['/dashboard', 'Beranda', 'home'], ['/event', 'Event', 'calendar'], ['/scan', 'Scan', 'qr', true], ['/inventaris', 'Inventaris', 'box'], ['/stok', 'Gudang', 'warehouse']]
    : [['/dashboard', 'Beranda', 'home'], ['/event', 'Tugas', 'calendar'], ['/password', 'Akun', 'key']];
  const initial = (profile.nama || '?').trim().charAt(0).toUpperCase();
  const search = (e) => { e.preventDefault(); nav('/inventaris?q=' + encodeURIComponent(q.trim())); };
  return (
    <div className={'app' + (open ? ' open' : '')}>
      <NotifBridge />
      <aside className="sidebar" aria-label="Menu utama">
        <div className="side-brand"><Link to="/" className="brand" onClick={close} aria-label="TST Event Control"><Logo /></Link><small>Event Control</small></div>
        <nav className="side-nav">
          {items.map(([to, l, i]) => <NavLink key={to} to={to} onClick={close}><Icon n={i} />{l}</NavLink>)}
        </nav>
        <div className="side-user">
          <span className="avatar">{initial}</span>
          <span><span className="nm">{profile.nama}</span><span className="rl">{role}</span></span>
        </div>
        <div className="side-act">
          <Link to="/password" className="btn ghost" onClick={close}><Icon n="key" size={16} />Password</Link>
          <button className="ghost" onClick={logout}><Icon n="logout" size={16} />Keluar</button>
        </div>
      </aside>
      <div className="side-scrim" onClick={close} />
      <div className="main-col">
        <header className="topbar">
          <button className="icon-btn burger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}><Icon n={open ? 'x' : 'menu'} /></button>
          {staff ? (
            <form className="top-search" onSubmit={search} role="search"><Icon n="search" size={18} /><input aria-label="Cari unit di inventaris" placeholder="Cari unit, kategori, atau kode…" value={q} onChange={(e) => setQ(e.target.value)} /></form>
          ) : <span className="top-title">TST Event Control</span>}
          <span className="sp" />
          <span className="top-date">{tgl}</span>
          <Bell />
        </header>
        {profile.wajibGanti === true && pathname !== '/password' && (
          <div className="notice" role="alert"><b>Akun Anda baru dibuat.</b> Demi privasi, ganti password dari admin dengan password pribadi Anda. <Link to="/password" className="btn dark">Ganti password sekarang</Link></div>
        )}
        {band && <Band key={pathname} title={band[0]} sub={band[1]} />}
        <main className={'pad fx-' + phase}>
          <Routes location={shown}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/event" element={<Events />} />
            <Route path="/event/:id" element={<EventDetail />} />
            <Route path="/surat-jalan/:id" element={<SuratJalan />} />
            <Route path="/password" element={<Password />} />
            <Route path="/notifikasi" element={<Notifikasi />} />
            {staff && <Route path="/stok" element={<Stok />} />}
            {staff && <Route path="/inventaris" element={<Inventory />} />}
            {staff && <Route path="/aset/:id" element={<Asset />} />}
            {staff && <Route path="/scan" element={<Scan />} />}
            {staff && <Route path="/daftar" element={<Daftar />} />}
            {staff && <Route path="/label" element={<Labels />} />}
            {role === 'admin' && <Route path="/laporan" element={<Report />} />}
            {role === 'admin' && <Route path="/pengguna" element={<Users />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <nav className={'bottom-nav' + (bottom.length === 3 ? ' n4' : '')} aria-label="Navigasi bawah" style={bottom.length === 3 ? { gridTemplateColumns: 'repeat(3,1fr)' } : undefined}>
        {bottom.map(([to, l, i, fab]) => <NavLink key={to} to={to} className={fab ? 'fab' : ''} aria-label={l}><Icon n={i} size={fab ? 26 : 21} />{!fab && l}</NavLink>)}
      </nav>
    </div>
  );
}
