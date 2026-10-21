// Kirim push ke HP setiap ada notifikasi baru di database.
import { onValueCreated } from 'firebase-functions/v2/database';
import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';

initializeApp();
const opt = (path) => ({ ref: path, region: 'asia-southeast1', instance: 'tsteventcontrol-default-rtdb' });
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
