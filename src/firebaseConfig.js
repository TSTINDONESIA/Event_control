// Config Web App Firebase milik project PERUSAHAAN.
// Isi dari Firebase Console -> Project settings -> Your apps -> Web app.
// Selama masih berawalan "ISI", aplikasi menampilkan layar "Config belum diisi".
// (Key web Firebase bukan rahasia, tapi BATASI di Google Cloud Console -> APIs & Services -> Credentials:
//  HTTP referrer = domain aplikasi Anda.)
export default {
  apiKey: 'ISI_API_KEY',
  authDomain: 'ISI_PROJECT_ID.firebaseapp.com',
  projectId: 'ISI_PROJECT_ID',
  storageBucket: 'ISI_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'ISI_SENDER_ID',
  appId: 'ISI_APP_ID',
  // Salin dari Console -> Realtime Database (URL di atas data), mis. region Singapore:
  databaseURL: 'https://ISI_PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app',
};
