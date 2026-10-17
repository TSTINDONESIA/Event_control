import { useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { configured } from './firebase.js';
import { useAuth } from './AuthContext.jsx';
import { Band, Footer, Logo, Loading } from './components.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Inventory from './pages/Inventory.jsx';
import Asset from './pages/Asset.jsx';
import Scan from './pages/Scan.jsx';
import History from './pages/History.jsx';
import Report from './pages/Report.jsx';
import Labels from './pages/Labels.jsx';
import Tugas from './pages/Tugas.jsx';
import Kategori from './pages/Kategori.jsx';
import Users from './pages/Users.jsx';
import Password from './pages/Password.jsx';
import Daftar from './pages/Daftar.jsx';
import SuratJalan from './pages/SuratJalan.jsx';
import BarangJumlah from './pages/BarangJumlah.jsx';
import Uji from './pages/Uji.jsx';

const TITLES = {
  '/event': ['Event', 'Jadwal event, kebutuhan peralatan, dan teknisi.'],
  '/inventaris': ['Inventaris', 'Stok & master data peralatan, satu QR per unit.'],
  '/tugas': ['Tugas & checklist', 'Event yang ditugaskan dan checklist setup.'],
  '/scan': ['Scan QR', 'Scan label unit untuk melanjutkan ke langkah berikutnya.'],
  '/riwayat': ['Riwayat & audit', 'Setiap perpindahan unit tercatat dan dapat dipertanggungjawabkan.'],
  '/laporan': ['Laporan', 'Stok per kategori, kerusakan, dan ekspor data.'],
  '/label': ['Cetak QR', 'Label QR massal per kategori.'],
  '/barang-jumlah': ['Barang jumlah', 'Stok kabel, konektor, dan barang sejenis yang dicatat per jumlah.'],
  '/kategori': ['Kategori', 'Master data kategori peralatan.'],
  '/daftar': ['Daftarkan unit via scan', 'Tempel label, scan, isi nama. Unit langsung masuk stok.'],
  '/password': ['Ganti password', 'Jaga kerahasiaan akun Anda.'],
  '/pengguna': ['Pengguna & peran', 'Kelola akun Admin, Warehouse, dan Teknisi.'],
  '/uji': ['Kontrol utama', 'Mode uji coba: hapus data dalam jumlah besar. Hanya akun kontrol utama.'],
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
            <NavLink to="/" end>Dashboard</NavLink>
            <NavLink to="/event">Event</NavLink>
            <NavLink to="/inventaris">Inventaris</NavLink>
            <NavLink to="/tugas">Tugas</NavLink>
            <NavLink to="/scan">Scan QR</NavLink>
            {staff && (
              <details className="more">
                <summary>Lainnya ▾</summary>
                <div className="more-menu">
                  <NavLink to="/barang-jumlah">Barang jumlah</NavLink>
                  <NavLink to="/daftar">Daftar unit (scan)</NavLink>
                  <NavLink to="/riwayat">Riwayat</NavLink>
                  <NavLink to="/laporan">Laporan</NavLink>
                  <NavLink to="/label">Label QR</NavLink>
                  <NavLink to="/kategori">Kategori</NavLink>
                  {role === 'admin' && <NavLink to="/pengguna">Pengguna</NavLink>}
                  {profile.super && <NavLink to="/uji">Kontrol utama</NavLink>}
                </div>
              </details>
            )}
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
      <main className={pathname === '/' ? '' : 'pad'}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/event" element={<Events />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/surat-jalan/:id" element={<SuratJalan />} />
          <Route path="/inventaris" element={<Inventory />} />
          <Route path="/aset/:id" element={<Asset />} />
          <Route path="/tugas" element={<Tugas />} />
          <Route path="/scan" element={<Scan />} />
          <Route path="/password" element={<Password />} />
          {staff && <Route path="/barang-jumlah" element={<BarangJumlah />} />}
          {staff && <Route path="/daftar" element={<Daftar />} />}
          {staff && <Route path="/kategori" element={<Kategori />} />}
          {role === 'admin' && <Route path="/pengguna" element={<Users />} />}
          {profile.super && <Route path="/uji" element={<Uji />} />}
          {staff && <Route path="/riwayat" element={<History />} />}
          {staff && <Route path="/laporan" element={<Report />} />}
          {staff && <Route path="/label" element={<Labels />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
