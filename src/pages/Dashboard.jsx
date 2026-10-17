import { useVal, list } from '../util.js';
import { STATUS_LIST } from './status.js';
import { Badge } from '../components.jsx';

export default function Dashboard() {
  const assets = useVal('assets');
  const events = useVal('events');
  if (assets === undefined || events === undefined) return <p>Memuat…</p>;
  const a = list(assets);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = list(events).filter((e) => e.selesai >= today).sort((x, y) => x.mulai.localeCompare(y.mulai));
  return (
    <>
      <h2>Status stok ({a.length} unit)</h2>
      <div className="grid">
        {STATUS_LIST.map((s) => (
          <div className="card stat" key={s}><Badge s={s} /><div className="num">{a.filter((x) => x.status === s).length}</div></div>
        ))}
      </div>
      <h2>Event mendatang / berlangsung</h2>
      {upcoming.length === 0 ? <p>Belum ada.</p> : (
        <table><thead><tr><th>Event</th><th>Mulai</th><th>Selesai</th><th>Lokasi</th></tr></thead>
          <tbody>{upcoming.map((e) => <tr key={e.id}><td>{e.nama}</td><td>{e.mulai}</td><td>{e.selesai}</td><td>{e.lokasi || '-'}</td></tr>)}</tbody></table>
      )}
    </>
  );
}
