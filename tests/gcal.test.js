import test from 'node:test';
import assert from 'node:assert/strict';
import { parseICS, gcalLink } from '../src/gcal.js';

const ics = (body) => `BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\n${body}\r\nEND:VEVENT\r\nEND:VCALENDAR`;

test('acara sehari penuh: DTEND eksklusif dikurangi satu hari', () => {
  const r = parseICS(ics('SUMMARY:Rapat\r\nDTSTART;VALUE=DATE:20261201\r\nDTEND;VALUE=DATE:20261203'));
  assert.deepEqual(r, [{ nama: 'Rapat', lokasi: '', mulai: '2026-12-01', selesai: '2026-12-02' }]);
});
test('acara batal dilewati', () => assert.equal(parseICS(ics('STATUS:CANCELLED\r\nSUMMARY:X\r\nDTSTART:20261201T090000')).length, 0));
test('link kalender memakai tanggal selesai + 1 hari', () => {
  assert.match(gcalLink({ nama: 'A', mulai: '2026-12-01', selesai: '2026-12-02' }), /dates=20261201%2F20261203/);
});
