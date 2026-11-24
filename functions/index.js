// Kirim push ke HP setiap ada notifikasi baru di database.
import { onValueCreated } from 'firebase-functions/v2/database';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

initializeApp();
// Nama instance database dibaca dari config Firebase (project ID + region Singapore) supaya tidak tertanam di kode.
// Bila database Anda di region lain, set env DB_INSTANCE saat deploy.
const PROJECT = process.env.GCLOUD_PROJECT || JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId;
const INSTANCE = process.env.DB_INSTANCE || `${PROJECT}-default-rtdb`;
const opt = (path) => ({ ref: path, region: 'asia-southeast1', instance: INSTANCE });
const BAD = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];

async function kirim(uids, n) {
  const db = getDatabase();
  const pairs = [];
  for (const uid of uids) {
    const v = (await db.ref('fcmTokens/' + uid).get()).val() || {};
    Object.keys(v).forEach((t) => pairs.push([uid, t]));
  }
  if (!pairs.length) return;
  const res = await getMessaging().sendEach(pairs.map(([, token]) => ({
    token,
    notification: { title: n.judul, body: n.pesan },
    data: { eventId: n.eventId || '' },
    android: { priority: 'high', notification: { channelId: 'default', sound: 'default', defaultVibrateTimings: true } },
  })));
  await Promise.all(res.responses.map((r, i) =>
    !r.success && BAD.includes(r.error?.code) ? db.ref(`fcmTokens/${pairs[i][0]}/${pairs[i][1]}`).remove() : null));
}

// notifikasi khusus satu akun (mis. teknisi yang ditugaskan)
export const notifPribadi = onValueCreated(opt('/notifications/{uid}/{id}'), async (e) => {
  const n = e.data.val();
  if (!n || n.dari === e.params.uid) return;
  await kirim([e.params.uid], n);
});

// notifikasi per peran (admin / warehouse)
export const notifPeran = onValueCreated(opt('/notifRole/{role}/{id}'), async (e) => {
  const n = e.data.val();
  if (!n) return;
  const users = (await getDatabase().ref('users').get()).val() || {};
  const uids = Object.entries(users)
    .filter(([id, u]) => u.role === e.params.role && u.aktif === true && id !== n.dari).map(([id]) => id);
  await kirim(uids, n);
});

// ---- Kelola akun (hanya admin aktif). Dijalankan di server supaya password tidak lewat form di browser lain
// dan akun login ikut terhapus saat pengguna dihapus. ----
const callOpt = { region: 'asia-southeast1' };

async function wajibAdmin(req) {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Harus login.');
  const p = (await getDatabase().ref('users/' + uid).get()).val();
  if (!p || p.role !== 'admin' || p.aktif !== true) throw new HttpsError('permission-denied', 'Hanya admin.');
  return uid;
}
const audit = (uid, aksi, detail) => getDatabase().ref('audit').push({ uid, aksi, detail, waktu: Date.now() });

export const buatPengguna = onCall(callOpt, async (req) => {
  const admin = await wajibAdmin(req);
  const { nama, email, password, role } = req.data || {};
  if (!nama?.trim() || !/^\S+@\S+\.\S+$/.test(email || '')) throw new HttpsError('invalid-argument', 'Nama dan email wajib diisi dengan benar.');
  if (typeof password !== 'string' || password.length < 8) throw new HttpsError('invalid-argument', 'Password minimal 8 karakter.');
  if (!['admin', 'warehouse', 'teknisi'].includes(role)) throw new HttpsError('invalid-argument', 'Role tidak valid.');
  let u;
  try { u = await getAuth().createUser({ email: email.trim(), password, displayName: nama.trim() }); }
  catch (e) {
    if (e.code === 'auth/email-already-exists') throw new HttpsError('already-exists', 'Email ini sudah punya akun login. Hapus dulu akunnya, atau pakai email lain.');
    throw new HttpsError('internal', e.message);
  }
  try {
    await getDatabase().ref('users/' + u.uid).set({ nama: nama.trim(), email: email.trim(), role, aktif: true, wajibGanti: true });
  } catch (e) { await getAuth().deleteUser(u.uid).catch(() => {}); throw new HttpsError('internal', 'Gagal menyimpan profil: ' + e.message); }
  await audit(admin, 'user_baru', email.trim());
  return { uid: u.uid };
});

export const hapusPengguna = onCall(callOpt, async (req) => {
  const admin = await wajibAdmin(req);
  const uid = req.data?.uid;
  if (!uid || typeof uid !== 'string') throw new HttpsError('invalid-argument', 'uid wajib.');
  if (uid === admin) throw new HttpsError('failed-precondition', 'Akun Anda sendiri tidak bisa dihapus.');
  const p = (await getDatabase().ref('users/' + uid).get()).val();
  await getDatabase().ref().update({ ['users/' + uid]: null, ['fcmTokens/' + uid]: null, ['notifications/' + uid]: null, ['notifSeen/' + uid]: null });
  await getAuth().deleteUser(uid).catch((e) => { if (e.code !== 'auth/user-not-found') throw new HttpsError('internal', e.message); });
  await audit(admin, 'hapus_user', `${p?.nama || uid} ${p?.email || ''}`);
  return { ok: true };
});
