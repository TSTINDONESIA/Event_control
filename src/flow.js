// Mesin alur: satu tempat untuk semua perpindahan status unit.
import { ref, push, set, update, runTransaction } from 'firebase/database';
import { db } from './firebase.js';
import { audit, overlap } from './util.js';
import { norm, IN_EVENT } from './pages/status.js';

const ALL = ['tersedia', 'dialokasikan', 'disiapkan', 'keluar', 'diterima', 'digunakan', 'menunggu_kembali'];
const WH = ['admin', 'warehouse'];
const both = (list) => ({ admin: list, warehouse: list });

// `from[role]` = status asal yang boleh dikerjakan role tsb.  Role yang tidak tercantum = tidak boleh.
export const ACTIONS = {
  // ----- alur utama (langkah 3–8) -----
  siapkan:    { step: 3, to: 'disiapkan', tipe: 'siapkan', label: 'Siapkan barang', hint: 'Scan saat barang diambil dari rak dan dikemas untuk event.', from: both(['tersedia', 'dialokasikan']), needsEvent: true },
  keluarkan:  { step: 4, to: 'keluar', tipe: 'keluar', label: 'Keluarkan barang', hint: 'Scan saat barang meninggalkan gudang. Status menjadi “Sudah keluar”.', from: both(['disiapkan']) },
  terima:     { step: 5, to: 'diterima', tipe: 'terima', label: 'Konfirmasi terima', hint: 'Scan untuk menyatakan barang sudah Anda terima.', from: { admin: ['keluar'], teknisi: ['keluar'] }, note: true },
  mulai:      { step: 6, to: 'digunakan', tipe: 'setup', label: 'Setup selesai, mulai digunakan', hint: 'Tandai setelah barang terpasang dan siap dipakai. Checklist setup ikut tercentang.', from: { admin: ['diterima'], teknisi: ['diterima'] }, note: true },
  kembalikan: { step: 7, to: 'menunggu_kembali', tipe: 'kembali', label: 'Kembalikan ke gudang', hint: 'Event selesai: barang dikembalikan dan menunggu dicek gudang.', from: { admin: ['keluar', 'diterima', 'digunakan'], warehouse: ['keluar', 'diterima', 'digunakan'], teknisi: ['diterima', 'digunakan'] }, note: true },
  masukBaik:  { step: 8, to: 'tersedia', tipe: 'masuk', kondisi: 'baik', label: 'Terima gudang: kondisi baik', hint: 'Cek fisik barang. Jika baik, status kembali “Tersedia”.', from: both(['menunggu_kembali']), note: true },
  masukRusak: { step: 8, to: 'servis', tipe: 'masuk', kondisi: 'rusak', label: 'Terima gudang: rusak / perlu servis', hint: 'Jika ada kerusakan, barang masuk “Servis / rusak”. Isi catatan kerusakan.', from: both(['menunggu_kembali']), note: true, danger: true },
  // ----- tindakan lain -----
  tandaiServis: { other: true, to: 'servis', tipe: 'rusak', kondisi: 'rusak', label: 'Tandai servis / rusak', from: both(ALL), confirm: true },
  pulih:        { other: true, to: 'tersedia', tipe: 'pulih', label: 'Selesai servis / ditemukan: tandai tersedia', from: both(['servis', 'hilang']), confirm: true },
  tandaiHilang: { other: true, to: 'hilang', tipe: 'hilang', label: 'Tandai hilang', from: both(ALL), confirm: true, danger: true },
  pensiunkan:   { other: true, to: 'pensiun', tipe: 'pensiun', label: 'Pensiunkan unit (tidak digunakan)', from: { admin: ['tersedia', 'servis', 'hilang'] }, confirm: true, danger: true },
  aktifkan:     { other: true, to: 'tersedia', tipe: 'aktif', label: 'Aktifkan kembali unit', from: { admin: ['pensiun'] }, confirm: true },
};

// aksi yang boleh dilakukan `role` pada unit `a` (ev = event unit tsb bila ada)
export function actionsFor(a, role, ev, uid) {
  const s = norm(a.status);
  return Object.entries(ACTIONS)
    .filter(([, x]) => x.from[role]?.includes(s))
    .filter(([, x]) => role !== 'teknisi' || !!ev?.teknisi?.[uid]) // teknisi hanya untuk event yang ditugaskan
    .map(([key, x]) => ({ key, ...x }));
}

export async function move(a, fromList, x, profile, extra = {}) {
  const id = a.id;
  const keep = extra.eventId;
  const prev = { status: a.status, eventId: a.eventId || null };
  const r = await runTransaction(ref(db, 'assets/' + id), (cur) => {
    if (cur === null) return cur;
    if (!fromList.includes(norm(cur.status))) return; // abort: status sudah berubah
    const n = { ...cur, status: x.to };
    if (keep) n.eventId = keep; else delete n.eventId;
    return n;
  });
  if (!r.committed || r.snapshot.val()?.status !== x.to) throw new Error('Status unit sudah berubah. Muat ulang halaman.');
  const rec = { tipe: x.tipe, assetId: id, kode: a.kode, petugas: profile.uid, petugasNama: profile.nama, waktu: Date.now(), ...extra };
  let ok = false;
  for (let i = 0; i < 3 && !ok; i++) {
    try { await push(ref(db, 'transactions'), rec); ok = true; } catch { await new Promise((res) => setTimeout(res, 600)); }
  }
  if (!ok) {
    // transaksi gagal dicatat: kembalikan status agar data tetap konsisten
    await runTransaction(ref(db, 'assets/' + id), (cur) => {
      if (cur === null) return cur;
      const n = { ...cur, status: prev.status };
      if (prev.eventId) n.eventId = prev.eventId; else delete n.eventId;
      return n;
    });
    throw new Error('Gagal mencatat transaksi, status dikembalikan. Coba lagi.');
  }
  audit(profile.uid, x.tipe, a.kode).catch(() => {});
}

export async function runAction(key, a, profile, opts = {}) {
  const x = ACTIONS[key];
  const fromList = x.from[profile.role];
  if (!fromList) throw new Error('Peran Anda tidak diizinkan untuk langkah ini.');
  const eventId = IN_EVENT.includes(x.to) ? (opts.eventId || a.eventId) : null;
  if (x.needsEvent && !eventId) throw new Error('Pilih event tujuan (unit harus dialokasikan dulu).');
  const extra = {};
  if (eventId) extra.eventId = eventId;
  if (x.kondisi) extra.kondisi = x.kondisi;
  if (opts.catatan && opts.catatan.trim()) extra.catatan = opts.catatan.trim();
  await move(a, fromList, x, profile, extra);
  if (key === 'mulai' && eventId) { // langkah 6: checklist setup otomatis tercentang
    try { await set(ref(db, `checklist/${eventId}/${a.id}`), { ok: true, uid: profile.uid, nama: profile.nama, waktu: Date.now() }); } catch { /* checklist opsional */ }
  }
  if (key === 'masukRusak' && opts.catatan && opts.catatan.trim()) { // catatan kerusakan masuk ke laporan rusak
    try { await set(push(ref(db, 'laporanRusak')), { assetId: a.id, kode: a.kode, uid: profile.uid, nama: profile.nama, catatan: opts.catatan.trim(), waktu: Date.now() }); } catch { /* opsional */ }
  }
}

// Langkah 2: alokasi unit ke event, menolak jadwal bentrok
export async function allocate(a, ev, events, uid) {
  let conflict = '';
  const r = await runTransaction(ref(db, 'assetBookings/' + a.id), (cur) => {
    conflict = '';
    const c = cur || {};
    for (const [eid, b] of Object.entries(c)) {
      if (eid !== ev.id && overlap(b, ev)) { conflict = events?.[eid]?.nama || eid; return; }
    }
    c[ev.id] = { mulai: ev.mulai, selesai: ev.selesai };
    return c;
  });
  if (!r.committed) throw new Error(`${a.kode}: bentrok jadwal dengan event "${conflict}".`);
  if (norm(a.status) === 'tersedia') await update(ref(db, 'assets/' + a.id), { status: 'dialokasikan' });
  await audit(uid, 'alokasi', `${a.kode} -> ${ev.nama}`);
}

export async function release(a, evId, bookingsOfAsset, uid, evNama) {
  const s = norm(a.status);
  if (!['tersedia', 'dialokasikan', 'disiapkan'].includes(s)) throw new Error(`${a.kode}: sudah keluar gudang, tidak bisa dilepas dari event.`);
  const rest = Object.keys(bookingsOfAsset || {}).filter((k) => k !== evId).length;
  const up = { [`assetBookings/${a.id}/${evId}`]: null };
  if (s === 'dialokasikan' && rest === 0) up[`assets/${a.id}/status`] = 'tersedia';
  if (s === 'disiapkan' && a.eventId === evId) { up[`assets/${a.id}/status`] = rest ? 'dialokasikan' : 'tersedia'; up[`assets/${a.id}/eventId`] = null; }
  await update(ref(db), up);
  await audit(uid, 'lepas_alokasi', `${a.kode} <- ${evNama}`);
}

// ---------- Serah terima per event (massal) ----------
// Menjalankan satu aksi untuk banyak unit, satu per satu. Unit yang gagal dilaporkan, yang lain tetap lanjut.
async function many(units, fn) {
  const ok = []; const gagal = [];
  for (const u of units) {
    try { await fn(u); ok.push(u); } catch (e) { gagal.push(`${u.kode || u.nama}: ${e.message}`); }
  }
  return { ok, gagal };
}

// Catatan serah terima per event: siapa, kapan, apa saja (tidak bisa diubah setelah dibuat)
export async function catatSerah(eventId, profile, data) {
  const rec = { uid: profile.uid, nama: profile.nama, waktu: Date.now(), ...data };
  await set(push(ref(db, `serahTerima/${eventId}`)), rec);
  return rec;
}

// ---------- Barang jumlah (kabel, konektor, stand, dll): dicatat per jumlah, tanpa QR ----------
export const bulkList = (be) => Object.entries(be || {}).map(([bid, v]) => ({ bid, ...v }));
const clampN = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));

// stok barang jumlah yang masih bebas di tanggal event (dikurangi event lain yang beririsan dan belum selesai)
export function bulkAvail(bid, item, allBE, ev) {
  let used = 0;
  Object.entries(allBE || {}).forEach(([eid, m]) => {
    const e = m?.[bid];
    if (eid !== ev.id && e && e.tahap !== 'selesai' && overlap(e, ev)) used += e.qty || 0;
  });
  return Math.max(0, (item.total || 0) - used);
}

export async function bulkAllocate(bid, item, qty, ev, allBE, profile) {
  const n = Math.floor(Number(qty));
  if (!(n > 0)) throw new Error('Jumlah harus lebih dari 0.');
  const cur = allBE?.[ev.id]?.[bid];
  if (cur && cur.tahap !== 'rencana') throw new Error(`${item.nama}: sudah dikeluarkan, jumlah tidak bisa diubah.`);
  const free = bulkAvail(bid, item, allBE, ev);
  if (n > free) throw new Error(`${item.nama}: stok tersedia di tanggal ini hanya ${free}.`);
  await set(ref(db, `bulkEvent/${ev.id}/${bid}`), { nama: item.nama, kategori: item.kategori || '', qty: n, mulai: ev.mulai, selesai: ev.selesai, tahap: 'rencana' });
  await audit(profile.uid, 'alokasi_jumlah', `${item.nama} x${n} -> ${ev.nama}`);
}

export async function bulkRelease(bid, item, ev, profile) {
  await set(ref(db, `bulkEvent/${ev.id}/${bid}`), null);
  await audit(profile.uid, 'lepas_jumlah', `${item.nama || bid} <- ${ev.nama}`);
}

export async function keluarkanSemua(units, ev, profile, bulk = []) {
  const r = await many(units, (u) => runAction('keluarkan', u, profile, { eventId: ev.id }));
  const b = await many(bulk, (e) => update(ref(db, `bulkEvent/${ev.id}/${e.bid}`), { tahap: 'keluar', qtyKeluar: e.qty }));
  if (r.ok.length || b.ok.length) {
    await catatSerah(ev.id, profile, {
      tipe: 'keluar', jumlah: r.ok.length,
      ...(r.ok.length ? { units: Object.fromEntries(r.ok.map((u) => [u.id, true])) } : {}),
      ...(b.ok.length ? { bulk: Object.fromEntries(b.ok.map((e) => [e.bid, { nama: e.nama, kategori: e.kategori || '', qty: e.qty }])) } : {}),
    });
    audit(profile.uid, 'keluarkan_semua', `${ev.nama}: ${r.ok.length} unit, ${b.ok.length} jenis jumlah`).catch(() => {});
  }
  return { ok: r.ok, gagal: [...r.gagal, ...b.gagal], bulk: b.ok.length };
}

// pengecualian = { [assetId]: alasan } untuk unit; bulkQty = { [bid]: jumlah yang benar-benar diterima }
export async function terimaSemua(units, ev, profile, pengecualian = {}, bulk = [], bulkQty = {}) {
  const terima = units.filter((u) => !(u.id in pengecualian));
  const r = await many(terima, async (u) => {
    await runAction('terima', u, profile, { eventId: ev.id });
    await runAction('mulai', { ...u, status: 'diterima' }, profile, { eventId: ev.id }); // otomatis "Sedang digunakan"
  });
  const exc = {};
  units.filter((u) => u.id in pengecualian).forEach((u) => { exc[u.id] = { kode: u.kode, nama: u.nama || '', alasan: pengecualian[u.id] || '' }; });
  const sum = {};
  const b = await many(bulk, async (e) => {
    const n = clampN(bulkQty[e.bid] ?? e.qtyKeluar, e.qtyKeluar);
    await update(ref(db, `bulkEvent/${ev.id}/${e.bid}`), { tahap: 'diterima', qtyTerima: n, terimaOleh: profile.nama, terimaWaktu: Date.now() });
    sum[e.bid] = { nama: e.nama, dikirim: e.qtyKeluar, diterima: n };
  });
  await catatSerah(ev.id, profile, {
    tipe: 'terima',
    diterima: Object.fromEntries(r.ok.map((u) => [u.id, true])),
    jumlah: r.ok.length,
    ...(Object.keys(exc).length ? { pengecualian: exc } : {}),
    ...(Object.keys(sum).length ? { bulk: sum } : {}),
  });
  audit(profile.uid, 'terima_semua', `${ev.nama}: ${r.ok.length} unit, ${Object.keys(exc).length} pengecualian, ${b.ok.length} jenis jumlah`).catch(() => {});
  return { ok: r.ok, gagal: [...r.gagal, ...b.gagal], bulk: b.ok.length };
}

export async function kembalikanSemua(units, ev, profile, bulk = []) {
  const r = await many(units, (u) => runAction('kembalikan', u, profile, { eventId: ev.id }));
  const b = await many(bulk, (e) => update(ref(db, `bulkEvent/${ev.id}/${e.bid}`), { tahap: 'kembali', qtyKembali: e.qtyTerima ?? 0, kembaliOleh: profile.nama, kembaliWaktu: Date.now() }));
  if (r.ok.length || b.ok.length) {
    await catatSerah(ev.id, profile, { tipe: 'kembali', jumlah: r.ok.length, ...(r.ok.length ? { units: Object.fromEntries(r.ok.map((u) => [u.id, true])) } : {}) });
    audit(profile.uid, 'kembalikan_semua', `${ev.nama}: ${r.ok.length} unit, ${b.ok.length} jenis jumlah`).catch(() => {});
  }
  return { ok: r.ok, gagal: [...r.gagal, ...b.gagal], bulk: b.ok.length };
}

// Gudang menghitung barang jumlah yang benar-benar kembali (titik pemeriksaan resmi)
export async function bulkTerimaGudang(bulk, ev, profile, qtyMap) {
  const b = await many(bulk, async (e) => {
    const n = clampN(qtyMap[e.bid] ?? e.qtyKembali, e.qtyKeluar);
    await update(ref(db, `bulkEvent/${ev.id}/${e.bid}`), { tahap: 'selesai', qtyGudang: n, hilang: (e.qtyKeluar || 0) - n, gudangOleh: profile.nama, gudangWaktu: Date.now() });
  });
  if (b.ok.length) audit(profile.uid, 'terima_gudang_jumlah', `${ev.nama}: ${b.ok.length} jenis`).catch(() => {});
  return { ok: [], gagal: b.gagal, bulk: b.ok.length };
}

export async function siapkanSemua(units, ev, profile) {
  const r = await many(units, (u) => runAction('siapkan', u, profile, { eventId: ev.id }));
  if (r.ok.length) { audit(profile.uid, 'siapkan_semua', `${ev.nama}: ${r.ok.length} unit`).catch(() => {}); }
  return r;
}
