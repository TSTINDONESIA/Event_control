import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, query, limitToLast, onValue } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, today, range } from '../util.js';
import { STATUS, STATUS_LIST, TAHAP, norm } from './status.js';
import { Badge, Progress, Loading } from '../components.jsx';
import { Icon, StatCard, Donut, EmptyState } from '../ui.jsx';

const ST_COLOR = { tersedia: '#2ee59d', disiapkan: '#25D9F2', keluar: '#7957FF', servis: '#FF9D18', hilang: '#ff5d6c', pensiun: '#9BAAC1' };
const unitsOf = (eid, a) => a.filter((x) => x.eventId === eid && ['disiapkan', 'keluar'].includes(x.status));

function LateBox({ late, events }) {
  if (!late.length) return null;
  return (
    <div className="card late"><b className="err">Terlambat kembali ({late.length} unit)</b>
      <ul>{late.map((x) => <li key={x.id}><Link to={'/aset/' + x.id}>{x.kode}</Link> {x.nama}: event “{events[x.eventId].nama}” selesai {events[x.eventId].selesai}, status <Badge s={x.status} /></li>)}</ul></div>
  );
}

// aktivitas terbaru: node audit (aturan database: hanya admin yang boleh membaca)
function Activity() {
  const [rows, setRows] = useState(undefined);
  useEffect(() => onValue(query(ref(db, 'audit'), limitToLast(8)), (s) => setRows(Object.values(s.val() || {}).sort((a, b) => b.waktu - a.waktu)), () => setRows(null)), []);
  if (rows === null) return null;
  return (
    <div className="card"><b>Aktivitas terbaru</b>
      {rows === undefined ? <Loading /> : rows.length === 0 ? <p className="empty">Belum ada aktivitas.</p> : (
        <div className="log">{rows.map((r, i) => <div className="log-item" key={i}><span className="li"><Icon n="activity" size={16} /></span><div><b>{r.aksi}</b> {r.detail}<small>{new Date(r.waktu).toLocaleString('id-ID')}</small></div></div>)}</div>
      )}
    </div>
  );
}

function StatusDonut({ a }) {
  const parts = STATUS_LIST.map((s) => ({ k: s, c: ST_COLOR[s], v: a.filter((x) => x.status === s).length }));
  const total = a.length;
  const ok = parts.find((p) => p.k === 'tersedia').v;
  return (
    <div className="card"><b>Status inventaris</b>
      <div className="row" style={{ marginTop: 12, gap: 18 }}>
        <Donut parts={parts} total={total} centerLabel={total ? Math.round((ok / total) * 100) + '%' : '0%'} centerSmall="tersedia" />
        <div className="legend">{parts.map((p) => <div key={p.k}><i style={{ background: p.c }} />{STATUS[p.k].label}<b>{p.v}</b></div>)}</div>
      </div>
    </div>
  );
}

// grafik area: jumlah event per bulan (6 bulan terakhir) dari data event
function MonthChart({ evs }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { k: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, l: d.toLocaleDateString('id-ID', { month: 'short' }) };
  });
  const c = months.map((m) => evs.filter((e) => (e.mulai || '').startsWith(m.k)).length);
  const max = Math.max(1, ...c);
  const W = 360, H = 150, px = 22, py = 18;
  const pts = c.map((n, i) => [px + (i * (W - px * 2)) / 5, H - py - (n / max) * (H - py * 2)]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  return (
    <svg className="area-chart" viewBox={`0 0 ${W} ${H + 14}`} role="img" aria-label="Jumlah event per bulan">
      <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#168BFF" stopOpacity=".45" /><stop offset="1" stopColor="#7957FF" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2].map((i) => <line key={i} x1={px} x2={W - px} y1={py + (i * (H - py * 2)) / 2} y2={py + (i * (H - py * 2)) / 2} stroke="rgba(140,175,235,.15)" />)}
      <path d={`${line} L${pts[5][0]} ${H - py} L${pts[0][0]} ${H - py} Z`} fill="url(#ag)" />
      <path d={line} fill="none" stroke="#25D9F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => <g key={i}><circle cx={p[0]} cy={p[1]} r="4" fill="#FFC629" /><text x={p[0]} y={p[1] - 9} textAnchor="middle">{c[i]}</text><text x={p[0]} y={H + 8} textAnchor="middle">{months[i].l}</text></g>)}
    </svg>
  );
}

function EventRows({ evs, a, empty }) {
  if (!evs.length) return <EmptyState icon="calendar">{empty}</EmptyState>;
  return (
    <div className="tbl"><table><thead><tr><th>Event</th><th>Tanggal</th><th>Lokasi</th><th>Tahap</th><th>Unit</th></tr></thead>
      <tbody>{evs.map((e) => <tr key={e.id}><td><Link to={'/event/' + e.id}>{e.nama}</Link></td><td>{range(e)}</td><td>{e.lokasi || '-'}</td><td>{e.tahap && TAHAP[e.tahap] ? <span className={'badge ' + TAHAP[e.tahap].cls}>{TAHAP[e.tahap].label}</span> : '-'}</td><td>{unitsOf(e.id, a).length}</td></tr>)}</tbody></table></div>
  );
}

function Admin({ a, evs, t }) {
  const cnt = (s) => a.filter((x) => x.status === s).length;
  const active = evs.filter((e) => e.mulai <= t && e.selesai >= t);
  const upcoming = evs.filter((e) => e.selesai >= t).sort((x, y) => x.mulai.localeCompare(y.mulai)).slice(0, 6);
  return (
    <>
      <div className="tiles stagger">
        <StatCard n={active.length} l="Event aktif" icon="calendar" tone="blue" /><StatCard n={a.length} l="Total unit" icon="box" tone="violet" /><StatCard n={cnt('tersedia')} l="Tersedia" icon="check" tone="cyan" /><StatCard n={cnt('servis')} l="Servis / rusak" icon="tools" tone="gold" />
      </div>
      <div className="cols" style={{ marginTop: 22 }}>
        <div><h2>Event terdekat</h2><EventRows evs={upcoming} a={a} empty="Belum ada event. Buat event di menu Event." /></div>
        <div><h2>Event per bulan</h2><div className="card"><MonthChart evs={evs} /></div></div>
      </div>
      <div className="cols" style={{ marginTop: 20 }}><StatusDonut a={a} /><Activity /></div>
    </>
  );
}

function Warehouse({ a, evs, t }) {
  const cnt = (s) => a.filter((x) => x.status === s).length;
  const soon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const keluarList = evs.filter((e) => e.selesai >= t && e.mulai <= soon).sort((x, y) => x.mulai.localeCompare(y.mulai));
  const back = evs.filter((e) => e.tahap === 'kembali');
  return (
    <>
      <div className="tiles stagger">
        <StatCard n={a.length} l="Total unit" icon="box" tone="violet" /><StatCard n={cnt('tersedia')} l="Tersedia" icon="check" tone="cyan" /><StatCard n={cnt('keluar')} l="Di teknisi / lapangan" icon="truck" tone="blue" /><StatCard n={cnt('servis')} l="Servis / rusak" icon="tools" tone="gold" />
      </div>
      <h2>Pengeluaran barang (7 hari ke depan)</h2>
      {keluarList.length === 0 ? <EmptyState icon="calendar">Tidak ada event dalam 7 hari ke depan.</EmptyState> : (
        <div className="tbl"><table><thead><tr><th>Event</th><th>Tanggal</th><th>Disiapkan</th><th>Sudah keluar</th></tr></thead>
          <tbody>{keluarList.map((e) => {
            const all = a.filter((x) => x.eventId === e.id);
            const prep = all.filter((x) => ['disiapkan', 'keluar'].includes(x.status)).length;
            const sent = all.filter((x) => x.status === 'keluar').length;
            return <tr key={e.id}><td><Link to={'/event/' + e.id}>{e.nama}</Link></td><td>{range(e)}</td>
              <td style={{ minWidth: 150 }}><Progress value={prep} max={Math.max(prep, all.length)} label={false} /></td>
              <td style={{ minWidth: 150 }}><Progress value={sent} max={Math.max(prep, all.length)} label={false} yellow /></td></tr>;
          })}</tbody></table></div>
      )}
      <h2>Pengembalian: menunggu dicek gudang</h2>
      {back.length === 0 ? <EmptyState icon="warehouse">Tidak ada event yang menunggu scan kembali.</EmptyState> : (
        <div className="tbl"><table><thead><tr><th>Event</th><th>Unit di teknisi</th><th></th></tr></thead>
          <tbody>{back.map((e) => <tr key={e.id}><td>{e.nama}</td><td>{a.filter((x) => x.eventId === e.id && x.status === 'keluar').length}</td><td><Link className="btn" to={'/event/' + e.id}>Scan kembali</Link></td></tr>)}</tbody></table></div>
      )}
    </>
  );
}

function TechEvent({ e, units }) {
  const cl = useVal('checklist/' + e.id) || {};
  const done = units.filter((u) => cl[u.id]?.ok).length;
  const got = units.filter((u) => u.status === 'keluar').length;
  return (
    <div className="card flag">
      <div className="row"><b><Link to={'/event/' + e.id}>{e.nama}</Link></b><span className="sp" /><small>{e.lokasi || ''}</small></div>
      <small>{range(e)}</small>
      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        <Progress value={got} max={units.length} label="Barang dari gudang" />
        <Progress value={done} max={units.length} label="Checklist setup" yellow />
      </div>
    </div>
  );
}

function Teknisi({ evs, a, t, uid }) {
  const mine = evs.filter((e) => e.teknisi?.[uid] && e.selesai >= t).sort((x, y) => x.mulai.localeCompare(y.mulai));
  return (
    <>
      <div className="tiles stagger">
        <StatCard n={mine.length} l="Tugas saya" icon="calendar" tone="blue" />
        <StatCard n={mine.reduce((n, e) => n + a.filter((x) => x.eventId === e.id && x.status === 'keluar').length, 0)} l="Unit dipinjam" icon="box" tone="violet" />
      </div>
      <h2>Tugas saya</h2>
      {mine.length === 0 ? <EmptyState icon="calendar">Belum ada tugas untuk Anda.</EmptyState> :
        mine.map((e) => <TechEvent key={e.id} e={e} units={unitsOf(e.id, a)} />)}
      <p><Link className="btn" to="/event">Buka semua tugas</Link></p>
    </>
  );
}

export default function Dashboard() {
  const { profile } = useAuth();
  const assets = useVal('assets');
  const events = useVal('events');
  if (assets === undefined || events === undefined) return <Loading />;
  const a = list(assets).map((x) => ({ ...x, status: norm(x.status) }));
  const evs = list(events);
  const t = today();
  const late = a.filter((x) => x.status === 'keluar' && events?.[x.eventId] && events[x.eventId].selesai < t);
  const role = profile.role;
  return (
    <>
      <section className="dash-welcome">
        <div><h1>Halo, {profile.nama} <span aria-hidden="true">👋</span></h1><p>Berikut ringkasan aktivitas operasional hari ini.</p></div>
        <div className="row">{role !== 'teknisi' && <Link className="btn" to="/scan"><Icon n="qr" size={18} />Scan QR</Link>}<Link className="btn ghost" to="/event">{role === 'teknisi' ? 'Tugas saya' : 'Kelola event'}</Link></div>
      </section>
      <div className="dash-body">
        <LateBox late={late} events={events} />
        {role === 'admin' && <Admin a={a} evs={evs} t={t} />}
        {role === 'warehouse' && <Warehouse a={a} evs={evs} t={t} />}
        {role === 'teknisi' && <Teknisi evs={evs} a={a} t={t} uid={profile.uid} />}
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
