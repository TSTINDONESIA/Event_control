// Jadwal dari Google Calendar tanpa backend:
//  - parseICS: baca file .ics hasil ekspor Google Calendar
//  - gcalLink: tombol "tambah ke Google Calendar" untuk satu event
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const unesc = (s) => String(s || '').replace(/\\[nN]/g, ' ').replace(/\\([,;\\])/g, '$1').trim();

function icsDate(v) {
  const s = String(v || '').trim();
  if (/^\d{8}$/.test(s)) return { d: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`, allDay: true };
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  if (m[7]) return { d: ymd(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]))), allDay: false };
  return { d: `${m[1]}-${m[2]}-${m[3]}`, allDay: false };
}

// -> [{ nama, lokasi, mulai, selesai }] (event berulang hanya kemunculan pertama)
export function parseICS(text) {
  const flat = String(text || '').replace(/\r?\n[ \t]/g, '');
  const out = [];
  flat.split('BEGIN:VEVENT').slice(1).forEach((blk) => {
    const body = blk.split('END:VEVENT')[0];
    const get = (k) => { const m = body.match(new RegExp('^' + k + '(?:;[^:\\r\\n]*)?:(.*)$', 'mi')); return m ? m[1].replace(/\r$/, '') : ''; };
    if (/cancelled/i.test(get('STATUS'))) return;
    const a = icsDate(get('DTSTART'));
    if (!a) return;
    const b = icsDate(get('DTEND'));
    let end = b ? b.d : a.d;
    if (b && b.allDay) end = addDays(end, -1); // DTEND hari penuh bersifat eksklusif
    if (end < a.d) end = a.d;
    out.push({ nama: unesc(get('SUMMARY')) || '(tanpa judul)', lokasi: unesc(get('LOCATION')), mulai: a.d, selesai: end });
  });
  return out.sort((x, y) => x.mulai.localeCompare(y.mulai));
}

export function gcalLink(ev) {
  const c = (s) => String(s).replace(/-/g, '');
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: ev.nama || '', location: ev.lokasi || '',
    dates: `${c(ev.mulai)}/${c(addDays(ev.selesai || ev.mulai, 1))}`,
    details: ev.teknisi ? 'Teknisi: ' + Object.values(ev.teknisi).join(', ') : '',
  });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}
