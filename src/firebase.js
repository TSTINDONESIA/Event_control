import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';
import cfg from './firebaseConfig.js';

export const configured = !!cfg.apiKey && !cfg.apiKey.startsWith('ISI');
export const REGION = 'asia-southeast1';
let app = null, auth = null, db = null, fn = null;
if (configured) {
  app = initializeApp(cfg);
  auth = getAuth(app);
  db = getDatabase(app);
  fn = getFunctions(app, REGION);
}
export { app, auth, db, fn };
