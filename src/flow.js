// Alur 5 langkah: admin buat event -> gudang siapkan (scan) + "Sudah disiapkan" + PDF kirim
// -> teknisi "Alat lengkap diterima" -> teknisi "Kembalikan ke gudang" -> gudang scan kembali -> stok
import { ref, push, set, update, runTransaction } from 'firebase/database';
import { db } from './firebase.js';
import { audit } from './util.js';
import { norm } from './pages/status.js';

async function catat(a, tipe, profile, extra = {}) {
  const rec = { tipe, assetId: a.id, kode: a.kode, petugas: profile.uid, petugasNama: profile.nama, waktu: Date.now(), ...extra };
  for (let i = 0; i < 3; i++) {
    try { await push(ref(db, 'transactions'), rec); return; } catch { await new Promise((r) => setTimeout(r, 600)); }
  }
  throw new Error('Gagal mencatat transaksi. Coba lagi.');
}

// ubah status satu unit secara atomik; gagal bila status asal tidak cocok
async function ubah(a, dari, ke, eventId) {
  const r = await runTransaction(ref(db, 'assets/' + a.id), (cur) => {
    if (cur === null) return cur;
    if (!dari.includes(norm(cur.status))) return;
    const n = { ...cur, status: ke };
    if (eventId) n.eventId = eventId; else delete n.eventId;
    return n;
  });
  if (!r.committed) throw new Error(`${a.kode}: status unit sudah berubah (sekarang bukan ${dari.join('/')}).`);
}

// 1) Gudang scan: unit tersedia -> siap kirim untuk event ini
export async function siapkan(a, ev, profile) {
  if (norm(a.status) !== 'tersedia') {
    throw new Error(`${a.kode} tidak bisa disiapkan: status “${norm(a.status)}”${a.eventId && a.eventId !== ev.id ? ' (dipakai event lain)' : ''}.`);
  }
  await ubah(a, ['tersedia'], 'disiapkan', ev.id);
  await catat(a, 'siapkan', profile, { eventId: ev.id });
}

// salah scan: kembalikan ke tersedia
export async function batalSiapkan(a, ev, profile) {
  await ubah(a, ['disiapkan'], 'tersedia', null);
  await catat(a, 'batal', profile, { eventId: ev.id });
}

// 2) Kirim ke teknisi: semua unit siap kirim -> keluar. Tercatat sebagai laporan untuk admin.
export async function kirim(units, ev, profile, items = {}) {
  const ok = []; const gagal = [];
  for (const u of units) {
    try { await ubah(u, ['disiapkan'], 'keluar', ev.id); await catat(u, 'keluar', profile, { eventId: ev.id }); ok.push(u); }
    catch (e) { gagal.push(e.message); }
  }
  if (ok.length) {
    await set(push(ref(db, `serahTerima/${ev.id}`)), {
      tipe: 'keluar', uid: profile.uid, nama: profile.nama, waktu: Date.now(), jumlah: ok.length,
      teknisi: ev.teknisi || {},
      ...(Object.keys(items).length ? { items } : {}),
      units: Object.fromEntries(ok.map((u) => [u.id, { kode: u.kode, nama: u.nama || '', kategori: u.kategori || '' }])),
    });
    await update(ref(db, 'events/' + ev.id), { tahap: 'dikirim', dikirimWaktu: Date.now(), dikirimOleh: profile.nama });
    audit(profile.uid, 'kirim_teknisi', `${ev.nama}: ${ok.length} unit`).catch(() => {});
  }
  return { ok, gagal };
}

// 3) Gudang scan saat alat kembali: baik -> tersedia, rusak -> servis (masuk laporan kerusakan)
export async function terimaKembali(a, ev, profile, { rusak = false, catatan = '' } = {}) {
  await ubah(a, ['keluar'], rusak ? 'servis' : 'tersedia', null);
  await catat(a, rusak ? 'rusak' : 'masuk', profile, { eventId: ev.id, kondisi: rusak ? 'rusak' : 'baik', ...(catatan.trim() ? { catatan: catatan.trim() } : {}) });
  if (rusak) {
    try { await set(push(ref(db, 'laporanRusak')), { assetId: a.id, kode: a.kode, eventId: ev.id, uid: profile.uid, nama: profile.nama, catatan: catatan.trim() || 'Rusak saat dikembalikan', waktu: Date.now() }); } catch { /* opsional */ }
  }
}

// setelah semua unit kembali, event ditandai selesai
export async function selesaikanEvent(ev, profile) {
  await update(ref(db, 'events/' + ev.id), { tahap: 'selesai', selesaiWaktu: Date.now() });
  audit(profile.uid, 'event_selesai', ev.nama).catch(() => {});
}

// admin/gudang: tindakan manual di halaman unit
export async function tandai(a, ke, profile, catatan) {
  const tipe = { servis: 'rusak', hilang: 'hilang', tersedia: 'pulih' }[ke];
  await ubah(a, ['tersedia', 'disiapkan', 'keluar', 'servis', 'hilang'], ke, null);
  await catat(a, tipe, profile, catatan ? { catatan } : {});
}

// ---- tahap event ----

// Gudang: tutup tahap penyiapan (tombol "Sudah disiapkan")
export async function selesaiSiapkan(ev, profile) {
  await update(ref(db), {
    [`events/${ev.id}/tahap`]: 'siap',
    [`events/${ev.id}/siapWaktu`]: Date.now(),
    [`events/${ev.id}/siapOleh`]: profile.nama,
  });
  audit(profile.uid, 'event_disiapkan', ev.nama).catch(() => {});
}

// Gudang: buka lagi penyiapan (mis. ada alat yang kelupaan) selama belum dikirim
export async function bukaPenyiapan(ev, profile) {
  await update(ref(db), {
    [`events/${ev.id}/tahap`]: 'rencana',
    [`events/${ev.id}/siapWaktu`]: null,
    [`events/${ev.id}/siapOleh`]: null,
    [`events/${ev.id}/siapGudang`]: null,
  });
  audit(profile.uid, 'event_buka_siap', ev.nama).catch(() => {});
}

// Tutup penyiapan satu gudang (g = 1 atau 2). Gudang 2 = serah ke Gudang 1.
// final = gudang lain sudah menutup -> event masuk tahap "siap".
export async function tutupGudang(ev, g, jumlah, final, profile) {
  const up = { [`events/${ev.id}/siapGudang/g${g}`]: { waktu: Date.now(), oleh: profile.nama, jumlah } };
  if (final) {
    up[`events/${ev.id}/tahap`] = 'siap';
    up[`events/${ev.id}/siapWaktu`] = Date.now();
    up[`events/${ev.id}/siapOleh`] = profile.nama;
  }
  await update(ref(db), up);
  audit(profile.uid, 'gudang_tutup', `${ev.nama}: Gudang ${g}, ${jumlah} unit`).catch(() => {});
}

// Buka lagi penyiapan satu gudang (selama belum dikirim)
export async function bukaGudang(ev, g, profile) {
  await update(ref(db), {
    [`events/${ev.id}/siapGudang/g${g}`]: null,
    [`events/${ev.id}/tahap`]: 'rencana',
    [`events/${ev.id}/siapWaktu`]: null,
    [`events/${ev.id}/siapOleh`]: null,
  });
  audit(profile.uid, 'gudang_buka', `${ev.nama}: Gudang ${g}`).catch(() => {});
}

// Teknisi: "Alat lengkap diterima" (dikirim -> diterima)
export async function terimaTeknisi(ev, jumlah, profile) {
  const key = push(ref(db, `serahTerima/${ev.id}`)).key;
  await update(ref(db), {
    [`events/${ev.id}/tahap`]: 'diterima',
    [`events/${ev.id}/diterimaWaktu`]: Date.now(),
    [`events/${ev.id}/diterimaOleh`]: profile.nama,
    [`serahTerima/${ev.id}/${key}`]: { tipe: 'terima', uid: profile.uid, nama: profile.nama, waktu: Date.now(), jumlah },
  });
  audit(profile.uid, 'teknisi_terima', `${ev.nama}: ${jumlah} unit`).catch(() => {});
}

// Teknisi: "Kembalikan ke gudang" (diterima -> kembali)
export async function kembalikanKeGudang(ev, profile) {
  const key = push(ref(db, `serahTerima/${ev.id}`)).key;
  await update(ref(db), {
    [`events/${ev.id}/tahap`]: 'kembali',
    [`events/${ev.id}/kembaliWaktu`]: Date.now(),
    [`events/${ev.id}/kembaliOleh`]: profile.nama,
    [`serahTerima/${ev.id}/${key}`]: { tipe: 'kembali', uid: profile.uid, nama: profile.nama, waktu: Date.now() },
  });
  audit(profile.uid, 'teknisi_kembalikan', ev.nama).catch(() => {});
}
