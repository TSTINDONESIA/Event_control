import test from 'node:test';
import assert from 'node:assert/strict';
import { cropSquare, outSize } from '../src/qrCrop.js';

test('crop 70% tengah, terpusat', () => {
  const { sx, sy, side } = cropSquare(1920, 1080);
  assert.equal(Math.round(side), 756);
  assert.equal(Math.round(sx), Math.round((1920 - side) / 2));
  assert.equal(Math.round(sy), Math.round((1080 - side) / 2));
});
test('zoom digital mempersempit area baca, zoom ~1 diabaikan', () => {
  assert.ok(cropSquare(1000, 1000, 2).side < cropSquare(1000, 1000, 1).side);
  assert.equal(cropSquare(1000, 1000, 1.005).side, cropSquare(1000, 1000, 1).side);
});
test('ukuran baca selang-seling 360 / 560 dan tidak melebihi area', () => {
  assert.equal(outSize(1, 756), 360);
  assert.equal(outSize(2, 756), 560);
  assert.equal(outSize(2, 200), 200);
});
