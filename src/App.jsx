import { useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { configured } from './firebase.js';
import { useAuth } from './AuthContext.jsx';
import { Band, Footer, Logo, Loading } from './components.jsx';
import Login from './pages/Login.jsx';
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

const TITLES = {
  '/event': ['Tugas', 'Event, teknisi, dan alat yang harus disiapkan.'],
  '/stok': ['Stok gudang', 'Berapa alat stand by, keluar, dan rusak.'],
  '/inventaris': ['Inventaris', 'Stok alat, satu QR per unit.'],
  '/scan': ['Cek unit', 'Scan label untuk melihat status unit.'],
  '/laporan': ['Laporan', 'Pengiriman ke teknisi, kerusakan, dan stok.'],
  '/label': ['Cetak QR', 'Label QR massal per kategori.'],
  '/daftar': ['Daftarkan unit via scan', 'Tempel label, scan, isi nama. Unit langsung masuk stok.'],
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

export default function App() {
  const { loading, user, profile, error, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  if (!configured) return <Setup />;
  if (loading) return <div className="pad"><Loading /></div>;
  if (!user) return <Login error={error} />;
  const role = profile.role;
  const staff = role !== 'teknisi';
  const close = () => setOpen(false);
  const band = TITLES[pathname];
  return (
    <>
      <header className={'site-head' + (open ? ' open' : '')}>
        <div className="head-in">
          <Link to="/" className="brand" onClick={close} aria-label="TST Event Control"><Logo /></Link>
          <button className="burger" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>☰</button>
          <nav className="nav" onClick={(e) => e.target.closest('a') && close()}>
            <NavLink to="/event">Tugas</NavLink>
            {staff && <NavLink to="/stok">Stok</NavLink>}
            {staff && <NavLink to="/inventaris">Inventaris</NavLink>}
            {role === 'admin' && <NavLink to="/laporan">Laporan</NavLink>}
            {role === 'admin' && <NavLink to="/pengguna">Pengguna</NavLink>}
          </nav>
          <div className="who">
            <span><span className="lbl">Masuk sebagai</span><span className="nm">{profile.nama}<i>{role}</i></span></span>
            <Link to="/password" className="btn ghost" onClick={close}>Ganti password</Link>
            <button className="ghost" onClick={logout}>Keluar</button>
          </div>
        </div>
      </header>
      {profile.wajibGanti === true && pathname !== '/password' && (
        <div className="notice" role="alert"><b>Akun Anda baru dibuat.</b> Demi privasi, ganti password dari admin dengan password pribadi Anda. <Link to="/password" className="btn dark">Ganti password sekarang</Link></div>
      )}
      {band && <Band title={band[0]} sub={band[1]} />}
      <main className="pad">
        <Routes>
          <Route path="/" element={<Navigate to="/event" replace />} />
          <Route path="/event" element={<Events />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/surat-jalan/:id" element={<SuratJalan />} />
          <Route path="/password" element={<Password />} />
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
    </>
  );
}
