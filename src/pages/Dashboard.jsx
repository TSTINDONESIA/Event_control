import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, today, range, unitsOf } from '../util.js';
import { STATUS, STATUS_LIST, OUT, IN_EVENT, norm } from './status.js';
import { Badge, Progress, Loading, HERO_IMG } from '../components.jsx';

const Tile = ({ n, l, light }) => <div className={'tile' + (light ? ' light' : '')}><div className="num">{n}</div><div className="lbl">{l}</div></div>;

function LateBox({ late, events }) {
  if (!late.length) return null;
  return (
    <div className="card late"><b className="err">Terlambat kembali ({late.length} unit)</b>
      <ul>{late.map((x) => <li key={x.id}><Link to={'/aset/' + x.id}>{x.kode}</Link> {x.nama}: event “{events[x.eventId].nama}” selesai {events[x.eventId].selesai}, status <Badge s={x.status} /></li>)}</ul></div>
  );
}

function MonthChart({ evs }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { k: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, l: d.toLocaleDateString('id-ID', { month: 'short' }) };
  });
  const c = months.map((m) => evs.filter((e) => (e.mulai || '').startsWith(m.k)).length);
  const max = Math.max(1, ...c);
  return (
    <>
      <div className="chart">{c.map((n, i) => <div key={i}>{n}<i style={{ height: `${(n / max) * 100}%` }} /></div>)}</div>
      <div className="chart-l">{months.map((m) => <span key={m.k}>{m.l}</span>)}</div>
    </>
  );
}

function EventRows({ evs, bookings, assets, empty }) {
  if (!evs.length) return <p className="empty">{empty}</p>;
  return (
    <div className="tbl"><table><thead><tr><th>Event</th><th>Tanggal</th><th>Lokasi</th><th>Unit</th></tr></thead>
      <tbody>{evs.map((e) => <tr key={e.id}><td><Link to={'/event/' + e.id}>{e.nama}</Link></td><td>{range(e)}</td><td>{e.lokasi || '-'}</td><td>{unitsOf(e.id, bookings, assets).length}</td></tr>)}</tbody></table></div>
  );
}

function Admin({ a, evs, t, bookings, assets }) {
  const cnt = (s) => a.filter((x) => x.status === s).length;
  const active = evs.filter((e) => e.mulai <= t && e.selesai >= t);
  const upcoming = evs.filter((e) => e.selesai >= t).sort((x, y) => x.mulai.localeCompare(y.mulai)).slice(0, 6);
  return (
    <>
      <div className="tiles">
        <Tile n={active.length} l="Event aktif" /><Tile n={a.length} l="Total unit" /><Tile n={cnt('tersedia')} l="Tersedia" /><Tile n={cnt('servis')} l="Maintenance" />
      </div>
      <div className="cols">
        <div><h2>Event per bulan</h2><MonthChart evs={evs} /></div>
        <div><h2>Event terdekat</h2><EventRows evs={upcoming} bookings={bookings} assets={assets} empty="Belum ada event. Buat event di menu Event." /></div>
      </div>
    </>
  );
}

function Warehouse({ a, evs, t, bookings, assets, events }) {
  const cnt = (s) => a.filter((x) => x.status === s).length;
  const soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const keluarList = evs.filter((e) => e.selesai >= t && e.mulai <= soon).sort((x, y) => x.mulai.localeCompare(y.mulai));
  const back = a.filter((x) => x.status === 'menunggu_kembali');
  return (
    <>
      <div className="tiles">
        <Tile n={a.length} l="Total unit" /><Tile n={cnt('tersedia')} l="Tersedia" /><Tile n={a.filter((x) => OUT.includes(x.status)).length} l="Dipakai di lapangan" /><Tile n={cnt('servis')} l="Maintenance" />
      </div>
      <h2>Pengeluaran barang (7 hari ke depan)</h2>
      {keluarList.length === 0 ? <p className="empty">Tidak ada event dalam 7 hari ke depan.</p> : (
        <div className="tbl"><table><thead><tr><th>Event</th><th>Tanggal</th><th>Dialokasikan</th><th>Disiapkan</th><th>Sudah keluar</th></tr></thead>
          <tbody>{keluarList.map((e) => {
            const all = unitsOf(e.id, bookings, assets);
            const prep = all.filter((x) => x.eventId === e.id && IN_EVENT.includes(x.status)).length;
            const sent = all.filter((x) => x.eventId === e.id && ['keluar', 'diterima', 'digunakan', 'menunggu_kembali'].includes(x.status)).length;
            return <tr key={e.id}><td><Link to={'/event/' + e.id}>{e.nama}</Link></td><td>{range(e)}</td><td>{all.length}</td>
              <td style={{ minWidth: 140 }}><Progress value={prep} max={all.length} label={false} /></td>
              <td style={{ minWidth: 140 }}><Progress value={sent} max={all.length} label={false} yellow /></td></tr>;
          })}</tbody></table></div>
      )}
      <h2>Pengembalian: menunggu dicek gudang</h2>
      {back.length === 0 ? <p className="empty">Tidak ada unit yang menunggu penerimaan.</p> : (
        <div className="tbl"><table><thead><tr><th>Unit</th><th>Nama</th><th>Event</th><th></th></tr></thead>
          <tbody>{back.map((x) => <tr key={x.id}><td><Link to={'/aset/' + x.id}>{x.kode}</Link></td><td>{x.nama}</td><td>{events?.[x.eventId]?.nama || '-'}</td><td><Link className="btn" to={'/aset/' + x.id}>Terima</Link></td></tr>)}</tbody></table></div>
      )}
    </>
  );
}

function TechEvent({ e, units }) {
  const cl = useVal('checklist/' + e.id) || {};
  const done = units.filter((u) => cl[u.id]?.ok).length;
  const got = units.filter((u) => ['diterima', 'digunakan'].includes(u.status)).length;
  return (
    <div className="card flag">
      <div className="row"><b><Link to={'/event/' + e.id}>{e.nama}</Link></b><span className="sp" /><small>{e.lokasi || ''}</small></div>
      <small>{range(e)}</small>
      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        <Progress value={got} max={units.length} label="Barang sudah diterima" />
        <Progress value={done} max={units.length} label="Checklist setup" yellow />
      </div>
    </div>
  );
}

function Teknisi({ evs, t, bookings, assets, uid }) {
  const mine = evs.filter((e) => e.teknisi?.[uid] && e.selesai >= t).sort((x, y) => x.mulai.localeCompare(y.mulai));
  return (
    <>
      <h2>Tugas saya</h2>
      {mine.length === 0 ? <p className="empty">Belum ada tugas untuk Anda.</p> :
        mine.map((e) => <TechEvent key={e.id} e={e} units={unitsOf(e.id, bookings, assets).map((x) => ({ ...x, status: norm(x.status) }))} />)}
      <p><Link className="btn dark" to="/scan">Scan QR</Link></p>
    </>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const assets = useVal('assets');
  const events = useVal('events');
  const bookings = useVal('assetBookings');
  if (assets === undefined || events === undefined || bookings === undefined) return <div className="pad"><Loading /></div>;
  const a = list(assets).map((x) => ({ ...x, status: norm(x.status) }));
  const evs = list(events);
  const t = today();
  const late = a.filter((x) => OUT.includes(x.status) && events?.[x.eventId] && events[x.eventId].selesai < t);
  const role = profile.role;
  return (
    <>
      <section className="hero" style={{ backgroundImage: `url(${HERO_IMG})` }}>
        <div className="hero-in">
          <div className="kick">TST Indonesia</div>
          <h1>Event <span className="y">Control</span></h1>
          <p>Kontrol peralatan event secara real-time, akurat, dan terintegrasi.</p>
          <div className="row"><Link className="btn" to="/scan">Scan QR</Link><Link className="btn ghost" to={role === 'teknisi' ? '/tugas' : '/event'}>{role === 'teknisi' ? 'Tugas saya' : 'Kelola event'}</Link></div>
        </div>
      </section>
      <div className="pad">
        <LateBox late={late} events={events} />
        {role === 'admin' && <Admin a={a} evs={evs} t={t} bookings={bookings} assets={assets} />}
        {role === 'warehouse' && <Warehouse a={a} evs={evs} t={t} bookings={bookings} assets={assets} events={events} />}
        {role === 'teknisi' && <Teknisi evs={evs} t={t} bookings={bookings} assets={assets} uid={profile.uid} />}
        <h2>Status unit ({a.length})</h2>
        <div className="status-grid">
          {STATUS_LIST.map((s) => (
            <div className="sg" key={s}><Badge s={s} /><span className="num">{a.filter((x) => x.status === s).length}</span><small>{STATUS[s].desc}</small></div>
          ))}
        </div>
      </div>
    </>
  );
}
