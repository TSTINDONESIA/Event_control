import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKebutuhan } from '../src/kebutuhan.js';

test('angka di depan', () => assert.deepEqual(parseKebutuhan('5 Delegate Mic'), [{ kategori: 'Delegate Mic', jumlah: 5 }]));
test('format 5x dan x5', () => {
  assert.deepEqual(parseKebutuhan('5x Booth\nMixer x2'), [{ kategori: 'Booth', jumlah: 5 }, { kategori: 'Mixer', jumlah: 2 }]);
});
test('bullet dan penomoran daftar diabaikan', () => {
  assert.deepEqual(parseKebutuhan('- 2 Tripod\n1. Mixer'), [{ kategori: 'Tripod', jumlah: 2 }, { kategori: 'Mixer', jumlah: null }]);
});
test('baris kosong dilewati, teks kosong aman', () => {
  assert.deepEqual(parseKebutuhan('\n\n'), []);
  assert.deepEqual(parseKebutuhan(undefined), []);
});
