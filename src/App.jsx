import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { configured } from './firebase.js';
import { useAuth } from './AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Events from './pages/Events.jsx';
import Inventory from './pages/Inventory.jsx';
import Asset from './pages/Asset.jsx';
import Scan from './pages/Scan.jsx';
import History from './pages/History.jsx';
import Report from './pages/Report.jsx';
import Labels from './pages/Labels.jsx';

function Setup() {
  return (
    <div className="pad">
      <h2>TST EVENT CONTROL</h2>
      <p>Config Firebase belum diisi. Buka <code>src/firebaseConfig.js</code>, isi dengan config Web App dari Firebase Console, lalu build ulang / push ke GitHub.</p>
    </div>
  );
}

export default function App() {
  const { loading, user, profile, error, logout } = useAuth();
  if (!configured) return <Setup />;
  if (loading) return <p className="pad">Memuat…</p>;
  if (!user) return <Login error={error} />;
  const staff = profile.role !== 'teknisi';
  return (
    <>
      <header className="top">
        <b>TST EVENT CONTROL</b>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/event">Event</NavLink>
          <NavLink to="/inventaris">Inventaris</NavLink>
          {staff && <NavLink to="/scan">Scan</NavLink>}
          {staff && <NavLink to="/riwayat">Riwayat</NavLink>}
          {staff && <NavLink to="/laporan">Laporan</NavLink>}
          {staff && <NavLink to="/label">Label</NavLink>}
        </nav>
        <span className="who">{profile.nama} ({profile.role}) <button onClick={logout}>Keluar</button></span>
      </header>
      <main className="pad">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/event" element={<Events />} />
          <Route path="/inventaris" element={<Inventory />} />
          <Route path="/aset/:id" element={<Asset />} />
          {staff && <Route path="/scan" element={<Scan />} />}
          {staff && <Route path="/riwayat" element={<History />} />}
          {staff && <Route path="/laporan" element={<Report />} />}
          {staff && <Route path="/label" element={<Labels />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
