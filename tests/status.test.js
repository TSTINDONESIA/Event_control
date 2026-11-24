import test from 'node:test';
import assert from 'node:assert/strict';
import { norm, STATUS } from '../src/pages/status.js';

test('status lama dipetakan ke status baru', () => {
  assert.equal(norm('diterima'), 'keluar');
  assert.equal(norm('rusak'), 'servis');
  assert.equal(norm('dialokasikan'), 'tersedia');
});
test('status baru tidak berubah dan terdaftar', () => {
  for (const s of Object.keys(STATUS)) assert.equal(norm(s), s);
});
