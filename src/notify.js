// Notifikasi per akun (Realtime Database).
//  notifications/<uid>/<id>  -> khusus satu akun (mis. teknisi yang ditugaskan)
//  notifRole/<role>/<id>     -> semua akun dengan peran itu (admin / warehouse)
import { ref, push, set } from 'firebase/database';
import { db, auth } from './firebase.js';

async function tulis(path, from, judul, pesan, eventId) {
  try {
    await set(push(ref(db, path)), {
      judul, pesan, waktu: Date.now(),
      dari: auth.currentUser?.uid || '', dariNama: from?.nama || '',
      ...(eventId ? { eventId } : {}),
    });
  } catch { /* notifikasi tidak boleh menggagalkan aksi utama */ }
}

export const notifUser = (from, uid, judul, pesan, eventId) => tulis(`notifications/${uid}`, from, judul, pesan, eventId);
export const notifRole = (from, role, judul, pesan, eventId) => tulis(`notifRole/${role}`, from, judul, pesan, eventId);
export const notifTeknisi = (from, ev, judul, pesan) =>
  Promise.all(Object.keys(ev.teknisi || {}).map((uid) => notifUser(from, uid, judul, pesan, ev.id)));
