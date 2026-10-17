import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import cfg from './firebaseConfig.js';

export const configured = !!cfg.apiKey && !cfg.apiKey.startsWith('ISI') && !!cfg.databaseURL && !cfg.databaseURL.includes('ISI');
let auth = null, db = null;
if (configured) {
  const app = initializeApp(cfg);
  auth = getAuth(app);
  db = getDatabase(app);
}
export { auth, db };
