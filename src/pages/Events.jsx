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
import { parseICS, gcalLink } from '../gcal.js';
import { rekap, permintaanText } from '../rekap.js';
import WaImport from '../WaImport.jsx';


const CSS = `
.ne-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;width:100%}
.ne-grid label{display:block;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
.ne-grid input,.ne-grid input[type=date]{display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;margin-top:4px}
.ne-grid label{min-width:0}
.ne-box{width:100%;border-top:1px solid #e5e5e0;padding-top:10px;margin-top:4px}
.ne-need{display:flex;gap:8px;margin-bottom:6px;width:100%}
.ne-need input:first-child{flex:1;min-width:0}
.ne-tek{display:flex;flex-wrap:wrap;gap:6px 16px}
.ne-ics{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px;text-align:left}
.ne-ics small{display:block;color:var(--text-mute)}

.kb summary{cursor:pointer;font-weight:800;padding:11px 14px;background:rgba(22,139,255,.16);border:1px solid rgba(22,139,255,.35);border-radius:var(--r);color:#fff;list-style:none;display:flex;justify-content:space-between;gap:12px;user-select:none}
.kb summary::-webkit-details-marker{display:none}
.kb summary::after{content:"▾"}
.kb[open] summary::after{content:"▴"}
.kb-body{border:1px solid var(--line);border-top:0;border-radius:0 0 var(--r) var(--r);background:var(--panel-2);padding:0 12px 12px;text-align:left}
.kb-row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);font-size:15px}
.kb-row b{font-weight:800}
.kb-row small{display:block;color:var(--text-mute);font-weight:500}
.kb-row .n{text-align:right;white-space:nowrap}
.kb-row .n i{font-style:normal;color:var(--text-mute);font-size:12px;display:block}
.kb .dl{width:100%;margin-top:12px}
@media screen and (max-width:720px){
  table td.kb-cell{display:block!important;text-align:left!important}
  table td.kb-cell::before{display:block!important;margin-bottom:6px;flex:none!important}
}
`;

// Detail peralatan satu event: teks kebutuhan dari admin + rekap disiapkan gudang, lipat ke bawah + unduh PDF
function Detail({ e, units }) {
  const rows = rekap(units, list(e.tambahan));
  const teks = permintaanText(e);
  const pdf = () => savePdf(eventPdf({
    nama: e.nama, lokasi: e.lokasi || '-', tanggal: range(e),
    teknisi: Object.values(e.teknisi || {}).join(', ') || '-', permintaan: teks,
    rows: rows.map((r) => ({ alat: r.nama, jumlah: r.jumlah })),
    units: units.map((u) => ({ kode: u.kode, nama: u.nama, kategori: u.kategori, status: STATUS[norm(u.status)]?.label || u.status })),
  }), `Peralatan-${fileName(e.nama)}.pdf`);
  return (
    <details className="kb">
      <summary>Detail peralatan</summary>
      <div className="kb-body">
        <p style={{ whiteSpace: 'pre-wrap' }}>{teks || <span className="empty">Admin belum mengisi kebutuhan alat.</span>}</p>
        {rows.map((r) => (
          <div className="kb-row" key={r.key}>
            <span><b>{r.nama}</b></span>
            <span className="n"><b>{r.jumlah}</b><i>disiapkan</i></span>
          </div>
        ))}
        {units.length > 0 && <p><small>{units.length} unit ber-QR sudah disiapkan / dikirim.</small></p>}
        <button className="dl" onClick={pdf}>Download PDF</button>
      </div>
    </details>
  );
}

const empty = { nama: '', lokasi: '', mulai: '', selesai: '' };

// Form event baru (admin): vendor, tanggal (manual / dari Google Calendar), kebutuhan alat, teknisi.
function NewEvent({ users, profile, onMsg }) {
  const [f, setF] = useState(empty);
  const [teks, setTeks] = useState('');
  const [tek, setTek] = useState({});
  const [ics, setIcs] = useState([]);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState(false);
  const techs = list(users).filter((x) => x.role === 'teknisi' && x.aktif === true).sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

  const loadIcs = (text) => {
    const found = parseICS(text);
    setIcs(found);
    onMsg(found.length ? '' : 'Tidak ada acara terbaca. Pastikan file .ics hasil ekspor Google Calendar.');
  };
  const onFile = async (e) => { const file = e.target.files?.[0]; if (file) loadIcs(await file.text()); e.target.value = ''; };
  const pick = (x) => { setF({ ...f, nama: x.nama, lokasi: x.lokasi || f.lokasi, mulai: x.mulai, selesai: x.selesai }); setIcs([]); setPaste(''); };

  async function add(e) {
    e.preventDefault(); onMsg('');
    if (!f.nama.trim()) { onMsg('Isi nama vendor.'); return; }
    if (f.selesai < f.mulai) { onMsg('Tanggal selesai harus sama/setelah mulai.'); return; }
    setBusy(true);
    try {
      const key = push(ref(db, 'events')).key;
      const teknisi = Object.fromEntries(techs.filter((t) => tek[t.id]).map((t) => [t.id, t.nama]));
      await set(ref(db, 'events/' + key), {
        nama: f.nama.trim(), lokasi: f.lokasi.trim(), mulai: f.mulai, selesai: f.selesai, tahap: 'rencana',
        dibuat: Date.now(), dibuatOleh: profile.nama,
        ...(teks.trim() ? { kebutuhanTeks: teks.trim() } : {}), ...(Object.keys(teknisi).length ? { teknisi } : {}),
      });
      await audit(profile.uid, 'event_baru', f.nama);
      setF(empty); setTeks(''); setTek({});
    } catch (x) { onMsg(x.message); }
    setBusy(false);
  }

  return (
    <form className="card flag row" onSubmit={add}>
      <b style={{ width: '100%' }}>Event baru</b>
      <div className="ne-grid">
        <label>Vendor<input placeholder="mis. Royalindo" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} required /></label>
        <label>Lokasi<input placeholder="Lokasi (opsional)" value={f.lokasi} onChange={(e) => setF({ ...f, lokasi: e.target.value })} /></label>
        <label>Mulai<input type="date" value={f.mulai} onChange={(e) => setF({ ...f, mulai: e.target.value, selesai: f.selesai && f.selesai >= e.target.value ? f.selesai : e.target.value })} required /></label>
        <label>Selesai<input type="date" value={f.selesai} min={f.mulai} onChange={(e) => setF({ ...f, selesai: e.target.value })} required /></label>
      </div>
      <details className="ne-box">
        <summary><b>Ambil jadwal dari Google Calendar</b></summary>
        <p><small>Di Google Calendar: Setelan → Impor &amp; ekspor → Ekspor, lalu pilih file .ics (ekstrak dulu bila berbentuk zip). Atau tempel isi file .ics di bawah. Tanggal bisa juga diisi manual di atas.</small></p>
        <input type="file" accept=".ics,text/calendar" onChange={onFile} />
        <textarea rows="3" placeholder="…atau tempel isi .ics di sini" value={paste} onChange={(e) => setPaste(e.target.value)} style={{ width: '100%', marginTop: 8 }} />
        <button type="button" className="ghost" disabled={!paste.trim()} onClick={() => loadIcs(paste)}>Baca</button>
        {ics.slice(0, 40).map((x, i) => (
          <div className="ne-ics" key={i}><span><b>{x.nama}</b><small>{range(x)}{x.lokasi ? ' · ' + x.lokasi : ''}</small></span><button type="button" onClick={() => pick(x)}>Pakai</button></div>
        ))}
      </details>
      <div className="ne-box">
        <b>Kebutuhan alat</b>
        <textarea rows="4" aria-label="Kebutuhan alat" placeholder="Tulis bebas, mis. 1 booth, 25 receiver" value={teks} onChange={(e) => setTeks(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', marginTop: 6 }} />
      </div>
      <div className="ne-box">
        <b>Teknisi</b>
        {techs.length === 0 ? <p><small>Belum ada akun teknisi aktif (buat di menu Pengguna).</small></p> : (
          <div className="ne-tek">{techs.map((t) => <label key={t.id}><input type="checkbox" checked={!!tek[t.id]} onChange={(e) => setTek({ ...tek, [t.id]: e.target.checked })} /> {t.nama}</label>)}</div>
        )}
      </div>
      <button disabled={busy}>Buat event</button>
    </form>
  );
}

// Daftar tugas: admin membuat event & menugaskan teknisi; gudang mengerjakan; teknisi melihat tugasnya.
export default function Events() {
  const { profile } = useAuth();
  const isAdmin = profile.role === 'admin';
  const events = useVal('events');
  const assets = useVal('assets');
  const serah = useVal('serahTerima');
  const users = useVal(isAdmin ? 'users' : 'users/' + profile.uid);
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
  const mine = list(events).filter((e) => profile.role !== 'teknisi' || e.teknisi?.[profile.uid]);
  const shown = mine.filter((e) => all || (e.tahap || 'rencana') !== 'selesai').sort((a, b) => a.mulai.localeCompare(b.mulai));
  return (
    <>
      <style>{CSS}</style>
      {isAdmin && !ed && <WaImport users={users} events={events} profile={profile} onMsg={setMsg} />}
      {isAdmin && !ed && <NewEvent users={users} profile={profile} onMsg={setMsg} />}
      {isAdmin && ed && (
        <form className="card flag row" onSubmit={save}><b>Edit event</b>
          <input aria-label="Vendor" placeholder="Vendor" value={ed.nama} onChange={(e) => setEd({ ...ed, nama: e.target.value })} required />
          <input aria-label="Lokasi" placeholder="Lokasi" value={ed.lokasi || ''} onChange={(e) => setEd({ ...ed, lokasi: e.target.value })} />
          <input aria-label="Tanggal mulai" type="date" value={ed.mulai} onChange={(e) => setEd({ ...ed, mulai: e.target.value })} required />
          <input aria-label="Tanggal selesai" type="date" value={ed.selesai} onChange={(e) => setEd({ ...ed, selesai: e.target.value })} required />
          <button>Simpan</button><button type="button" className="ghost" onClick={() => setEd(null)}>Batal</button></form>
      )}
      {msg && <p className="err" role="alert">{msg}</p>}
      <p><label><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Tampilkan yang sudah selesai</label></p>
      {events === undefined ? <Loading /> : shown.length === 0 ? <p className="empty">Belum ada tugas.</p> : (
        <div className="tbl"><table><thead><tr><th>Vendor</th><th>Lokasi</th><th>Tanggal</th><th>Teknisi</th><th>Status</th><th>Peralatan</th>{isAdmin && <th></th>}</tr></thead>
          <tbody>{shown.map((e) => {
            const tk = e.tahap || 'rencana';
            const t = TAHAP[tk] || TAHAP.rencana;
            const siap = busyUnits(e.id).filter((a) => norm(a.status) === 'disiapkan').length;
            return (
              <tr key={e.id}>
                <td><Link to={'/event/' + e.id}><b>{e.nama}</b></Link></td>
                <td>{e.lokasi || '-'}</td>
                <td>{range(e)}<br /><small><a href={gcalLink(e)} target="_blank" rel="noreferrer">+ Google Calendar</a></small></td>
                <td><Assign ev={e} users={users} isAdmin={isAdmin} /></td>
                <td><span className={'badge ' + t.cls}>{t.label}</span>{siap > 0 && ['rencana', 'siap'].includes(tk) && <small> {siap} unit siap</small>}</td>
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
