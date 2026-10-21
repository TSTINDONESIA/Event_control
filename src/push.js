// Push notification (FCM) untuk Android: tetap masuk saat aplikasi ditutup.
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { ref, set, remove } from 'firebase/database';
import { db, auth } from './firebase.js';

let wired = false;

export async function initPush() {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    let p = await PushNotifications.checkPermissions();
    if (p.receive !== 'granted') p = await PushNotifications.requestPermissions();
    if (p.receive !== 'granted') return false;
    await PushNotifications.createChannel({ id: 'default', name: 'Notifikasi TST', description: 'Tugas dan status alat', importance: 5, visibility: 1, vibration: true });
    if (!wired) {
      wired = true;
      PushNotifications.addListener('registration', async (t) => {
        localStorage.setItem('fcmToken', t.value);
        const u = auth.currentUser;
        if (u) { try { await set(ref(db, `fcmTokens/${u.uid}/${t.value}`), Date.now()); } catch { /* ulangi saat login berikutnya */ } }
      });
      PushNotifications.addListener('pushNotificationActionPerformed', (a) => {
        const id = a.notification?.data?.eventId;
        location.hash = id ? '#/event/' + id : '#/notifikasi';
      });
    }
    await PushNotifications.register();
    return true;
  } catch { return false; }
}

// dipanggil saat keluar: HP ini berhenti menerima notifikasi akun tersebut
export async function unregisterPush() {
  const t = localStorage.getItem('fcmToken');
  const u = auth.currentUser;
  if (t && u) { try { await remove(ref(db, `fcmTokens/${u.uid}/${t}`)); } catch { /* abaikan */ } }
}
