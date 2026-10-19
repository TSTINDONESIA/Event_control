import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, push, set, update } from 'firebase/database';
import { db } from '../firebase.js';
import { useAuth } from '../AuthContext.jsx';
import { useVal, list, audit, range } from '../util.js';
import { TAHAP, STATUS, norm } from './status.js';
import { eventPdf, savePdf, fileName } from '../pdf.js';
import Assign from '../Assign.jsx';
import { Loading } from '../components.jsx';


const CSS = `
.kb summary{cursor:pointer;font-weight:800;padding:10px 12px;background:#000;color:#fff;list-style:none;display:flex;justify-content:space-between;gap:12px;user-select:none}
.kb summary::-webkit-details-marker{display:none}
.kb summary::after{content:"▾"}
.kb[open] summary::after{content:"▴"}
.kb-body{border:1px solid #000;border-top:0;background:#fff;padding:0 12px 12px;text-align:left}
.kb-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #e5e5e0;font-size:15px}
.kb-row b{font-weight:800}
.kb-row small{display:block;color:#666;font-weight:500}
.kb-row .n{text-align:right;white-space:nowrap}
.kb-row .n i{font-style:normal;color:#666;font-size:12px;display:block}
.kb .dl{width:100%;margin-top:12px}
@media screen and (max-width:720px){
  table td.kb-cell{display:block!important;text-align:left!important}
  table td.kb-cell::before{display:block!important;margin-bottom:6px;flex:none!important}
}
`;

// Detail peralatan satu event: lipat ke bawah + unduh PDF
function Detail({ e, units }) {
  const kb = list(e.kebutuhan);
  const siapOf = (k) => { const n = units.filter((u) => u.kategori === k.kategori).length; return n > 0 ? n : (k.siap || 0); };
  const pdf = () => savePdf(eventPdf({
    nama: e.nama, lokasi: e.lokasi || '-', tanggal: range(e),
    teknisi: Object.values(e.teknisi || {}).join(', ') || '-',
    rows: kb.map((k) => ({ alat: k.kategori, minta: k.jumlah, siap: siapOf(k), ket: [k.grup, k.ket].filter(Boolean).join(' - ') })),
    units: units.map((u) => ({ kode: u.kode, nama: u.nama, kategori: u.kategori, status: STATUS[norm(u.status)]?.label || u.status })),
  }), `Peralatan-${fileName(e.nama)}.pdf`);
  return (
    <details className="kb">
      <summary>Detail peralatan ({kb.length})</summary>
      <div className="kb-body">
        {kb.length === 0 ? <p className="empty">Belum ada permintaan alat.</p> : kb.map((k) => (
          <div className="kb-row" key={k.id}>
            <span><b>{k.kategori}</b>{(k.grup || k.ket) && <small>{[k.grup, k.ket].filter(Boolean).join(' · ')}</small>}</span>
            <span className="n"><b>{siapOf(k)}</b> / {k.jumlah}<i>disiapkan / diminta</i></span>
          </div>
        ))}
        {units.length > 0 && <p><small>{units.length} unit ber-QR sudah disiapkan / dikirim.</small></p>}
        <button className="dl" onClick={pdf}>Download PDF</button>
      </div>
    </details>
  );
}

const empty = { nama: '', lokasi: '', mulai: '', selesai: '' };

// Daftar tugas: admin membuat event & menugaskan teknisi; gudang mengerjakan; teknisi melihat tugasnya.
export default function Events() {
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin';
  const events = useVal('events');
  const assets = useVal('assets');
  const serah = useVal('serahTerima');
  const users = useVal(isAdmin ? 'users' : 'users/' + profile.uid);
  const [f, setF] = useState(empty);
  const [ed, setEd] = useState(null);
  const [msg, setMsg] = useState('');
  const [all, setAll] = useState(false);

  // unit ber-QR milik satu event: yang sudah dikirim (dari catatan serah terima) + yang masih "siap kirim"
  const unitsOfEvent = (eid) => {
    const sent = new Set(list(serah?.[eid]).flatMap((r) => (r.tipe === 'keluar' ? Object.keys(r.units || {}) : [])));
    return list(assets).map((a) => ({ ...a, status: norm(a.status) }))
      .filter((a) => sent.has(a.id) || (a.eventId === eid && a.status === 'disiapkan'))
      .sort((a, b) => (a.kode || '').localeCompare(b.kode || ''));
  };
  const busyUnits = (eid) => list(assets).filter((a) => a.eventId === eid && ['disiapkan', 'keluar'].includes(norm(a.status)));
  async function add(e) {
    e.preventDefault(); setMsg('');
    if (f.selesai < f.mulai) { setMsg('Tanggal selesai harus sama/setelah mulai.'); return; }
    try {
      await set(push(ref(db, 'events')), { nama: f.nama.trim(), lokasi: f.lokasi.trim(), mulai: f.mulai, selesai: f.selesai, tahap: 'rencana', dibuat: Date.now() });
      await audit(profile.uid, 'event_baru', f.nama);
      setF(empty);
    } catch (x) { setMsg(x.message); }
  }
  async function save(e) {
    e.preventDefault(); setMsg('');
    if (ed.selesai < ed.mulai) { setMsg('Tanggal selesai harus sama/setelah mulai.'); return; }
    try {
      const up = {};
      for (const k of ['nama', 'lokasi', 'mulai', 'selesai']) up[`events/${ed.id}/${k}`] = String(ed[k] || '').trim();
      await update(ref(db), up);
      setEd(null);
    } catch (x) { setMsg(x.message); }
  }
  async function del(ev) {
    setMsg('');
    if (busyUnits(ev.id).length) { setMsg(`Tidak bisa dihapus: ${busyUnits(ev.id).length} unit masih disiapkan/di teknisi.`); return; }
    if (!confirm(`Hapus event "${ev.nama}"?`)) return;
    try { await update(ref(db), { ['events/' + ev.id]: null }); await audit(profile.uid, 'hapus_event', ev.nama); } catch (x) { setMsg(x.message); }
  }
  const fields = (v, set_) => (
    <>
      <input aria-label="Nama event" placeholder="Nama event" value={v.nama} onChange={(e) => set_({ ...v, nama: e.target.value })} required />
      <input aria-label="Lokasi" placeholder="Lokasi" value={v.lokasi || ''} onChange={(e) => set_({ ...v, lokasi: e.target.value })} />
      <input aria-label="Tanggal mulai" type="date" value={v.mulai} onChange={(e) => set_({ ...v, mulai: e.target.value })} required />
      <input aria-label="Tanggal selesai" type="date" value={v.selesai} onChange={(e) => set_({ ...v, selesai: e.target.value })} required />
    </>
  );
  const mine = list(events).filter((e) => profile.role !== 'teknisi' || e.teknisi?.[profile.uid]);
  const shown = mine.filter((e) => all || (e.tahap || 'rencana') !== 'selesai').sort((a, b) => a.mulai.localeCompare(b.mulai));
  return (
    <>
      <style>{CSS}</style>
      {isAdmin && !ed && <form className="card flag row" onSubmit={add}><b>Event baru</b>{fields(f, setF)}<button>Buat event</button></form>}
      {isAdmin && ed && (
        <form className="card flag row" onSubmit={save}><b>Edit event</b>{fields(ed, setEd)}
          <button>Simpan</button><button type="button" className="ghost" onClick={() => setEd(null)}>Batal</button></form>
      )}
      {msg && <p className="err" role="alert">{msg}</p>}
      <p><label><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Tampilkan yang sudah selesai</label></p>
      {events === undefined ? <Loading /> : shown.length === 0 ? <p className="empty">Belum ada tugas.</p> : (
        <div className="tbl"><table><thead><tr><th>Event</th><th>Lokasi</th><th>Tanggal</th><th>Teknisi</th><th>Status</th><th>Peralatan</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>{shown.map((e) => {
            const t = TAHAP[e.tahap || 'rencana'] || TAHAP.rencana;
            const siap = busyUnits(e.id).filter((a) => norm(a.status) === 'disiapkan').length;
            return (
              <tr key={e.id}>
                <td><Link to={'/event/' + e.id}><b>{e.nama}</b></Link></td>
                <td>{e.lokasi || '-'}</td><td>{range(e)}</td>
                <td><Assign ev={e} users={users} isAdmin={isAdmin} /></td>
                <td><span className={'badge ' + t.cls}>{t.label}</span>{siap > 0 && (e.tahap || 'rencana') !== 'dikirim' && <small> {siap} unit siap</small>}</td>
                <td className="kb-cell"><Detail e={e} units={unitsOfEvent(e.id)} /></td>
                {isAdmin && <td><div className="row">
                  <button className="ghost" onClick={() => setEd({ id: e.id, nama: e.nama, lokasi: e.lokasi || '', mulai: e.mulai, selesai: e.selesai })}>Edit</button>
                  <button className="danger" onClick={() => del(e)}>Hapus</button></div></td>}
              </tr>
            );
          })}</tbody></table></div>
      )}
    </>
  );
}
