import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useVal, list } from './util.js';
import { bulkAllocate, bulkRelease, bulkAvail, bulkList } from './flow.js';

const TAHAP = { rencana: 'Direncanakan', keluar: 'Sudah keluar', diterima: 'Dipakai', kembali: 'Menunggu dicek gudang', selesai: 'Selesai' };

// Barang jumlah (kabel, konektor, dll) untuk satu event
export default function BulkEvent({ ev, canManage }) {
  const { profile } = useAuth();
  const items = useVal('bulk');
  const allBE = useVal('bulkEvent');
  const [pick, setPick] = useState('');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  if (items === undefined || allBE === undefined) return null;
  const its = list(items).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
  const rows = bulkList(allBE?.[ev.id]);
  if (!canManage && !rows.length) return null;
  async function run(fn) { setBusy(true); setMsg(''); try { await fn(); } catch (e) { setMsg(e.message); } setBusy(false); }
  const free = pick && items?.[pick] ? bulkAvail(pick, items[pick], allBE, ev) : null;
  return (
    <>
      <h2>Barang jumlah untuk event ini</h2>
      {msg && <p className="err" role="alert">{msg}</p>}
      {canManage && (
        <div className="card row">
          <select aria-label="Pilih barang jumlah" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Pilih barang jumlah…</option>
            {its.map((i) => <option key={i.id} value={i.id}>{i.nama} (total {i.total})</option>)}
          </select>
          <input type="number" min="1" aria-label="Jumlah" value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 90 }} />
          <button disabled={busy || !pick} onClick={() => run(() => bulkAllocate(pick, items[pick], qty, ev, allBE, profile))}>Tambah / ubah jumlah</button>
          {free !== null && <small>Tersedia di tanggal ini: {free}</small>}
        </div>
      )}
      {rows.length === 0 ? <p className="empty">Belum ada barang jumlah.{its.length === 0 ? ' Daftarkan dulu di menu Lainnya → Barang jumlah.' : ''}</p> : (
        <div className="tbl"><table><thead><tr><th>Barang</th><th>Jumlah</th><th>Tahap</th><th>Diterima teknisi</th><th>Kembali (gudang)</th>{canManage && <th></th>}</tr></thead>
          <tbody>{rows.map((e) => (
            <tr key={e.bid}><td>{e.nama}</td><td>{e.qty}</td><td>{TAHAP[e.tahap] || e.tahap}</td>
              <td>{e.qtyTerima ?? '-'}</td><td>{e.qtyGudang ?? '-'}</td>
              {canManage && <td>{e.tahap === 'rencana' && <button className="ghost" disabled={busy} onClick={() => run(() => bulkRelease(e.bid, e, ev, profile))}>Lepas</button>}</td>}
            </tr>
          ))}</tbody></table></div>
      )}
    </>
  );
}
