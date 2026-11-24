// Pemeriksaan cepat database.rules.json: JSON valid, tidak ada node lama, dan root tertutup.
import { readFileSync } from 'node:fs';
const r = JSON.parse(readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8')).rules;
const bad = ['bulk', 'bulkEvent', 'assetBookings', 'kategori', 'superUsers'].filter((k) => k in r);
if (r['.read'] !== false || r['.write'] !== false) throw new Error('Root harus tertutup (.read/.write false).');
if (bad.length) throw new Error('Node lama masih ada: ' + bad.join(', '));
console.log('OK: rules valid,', Object.keys(r).filter((k) => !k.startsWith('.')).length, 'node.');
