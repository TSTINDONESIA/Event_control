// Pembaca jadwal WhatsApp (tanpa AI, tanpa server): satu kegiatan -> satu atau beberapa event.
// Format yang dikenali:
//   *Kegiatan Selasa, 20 October 2026*                      (tahun / bulan acuan)
//   *1. Standby Keg 19-22 Oct (TST) Culmen (Bali)*          (judul kegiatan)
//   *21-22 Oct*                                             (sub-jadwal -> event terpisah)
//   Venue : ... / Room : ...                                (lokasi)
//   *(Nanda/Udin/Jemss) Driver Rudi*                        (teknisi)
const MONTHS = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4, mei: 5, may: 5,
  jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, agt: 8, agus: 8, agustus: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12, december: 12 };
const mon = (w) => MONTHS[String(w || '').toLowerCase()] || 0;
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const RANGE = /(\d{1,2})\s*([A-Za-z]{3,9})?\s*(?:-|–|—|s\/d|sd)\s*(\d{1,2})\s*([A-Za-z]{3,9})/;
const SINGLE = /(\d{1,2})\s*([A-Za-z]{3,9})/g;

// cari tanggal pertama di teks -> { mulai, selesai, text }
function findDates(str, year, defM) {
  const r = String(str).match(RANGE);
  if (r && mon(r[4])) {
    const m2 = mon(r[4]); const m1 = mon(r[2]) || m2;
    return { mulai: iso(year, m1, +r[1]), selesai: iso(m1 > m2 ? year + 1 : year, m2, +r[3]), text: r[0] };
  }
  for (const s of String(str).matchAll(SINGLE)) {
    const m = mon(s[2]);
    if (m) return { mulai: iso(year, m, +s[1]), selesai: iso(year, m, +s[1]), text: s[0] };
  }
  return null;
}
const onlyDate = (line) => /^\d{1,2}(\s*[A-Za-z]{3,9})?\s*(-|–|—|s\/d|sd)\s*\d{1,2}\s*[A-Za-z]{3,9}$/.test(line) || /^\d{1,2}\s*[A-Za-z]{3,9}$/.test(line);

function parseHeader(raw, year, defM) {
  const t = raw.replace(/\*/g, '').replace(/^\s*\d+\s*[.)]\s*/, '').trim();
  const ki = t.search(/\bkeg(?:iatan)?\b\.?/i);
  const jenis = ki > 0 ? t.slice(0, ki).trim() : '';
  let rest = ki >= 0 ? t.slice(ki).replace(/^keg(?:iatan)?\b\.?\s*/i, '') : t;
  const dates = findDates(rest, year, defM);
  if (dates) rest = rest.replace(dates.text, ' ').replace(/\s+/g, ' ').trim();
  let org = ''; const om = rest.match(/^\(([A-Za-z]{2,6})\)\s*/);
  if (om) { org = om[1]; rest = rest.slice(om[0].length); }
  let kota = ''; const km = rest.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (km) { rest = km[1]; kota = km[2]; }
  return { jenis, org, nama: rest.trim(), kota, dates };
}

export function parseWa(text, now = new Date()) {
  const lines = String(text || '').split(/\r?\n/);
  const firstItem = lines.findIndex((l) => /^\s*\*?\s*\d{1,2}\s*[.)]\s+\S/.test(l));
  const headLines = (firstItem < 0 ? lines : lines.slice(0, firstItem)).join(' ');
  const ym = headLines.match(/\b(20\d{2})\b/);
  const year = ym ? +ym[1] : now.getFullYear();
  const hd = findDates(headLines.replace(/\*/g, ''), year, 0);
  const defM = hd ? +hd.mulai.slice(5, 7) : now.getMonth() + 1;

  // 1) bagi per kegiatan bernomor
  const items = [];
  let cur = null;
  lines.forEach((raw) => {
    if (/^\s*\*?\s*\d{1,2}\s*[.)]\s+\S/.test(raw)) { cur = { head: raw, body: [] }; items.push(cur); }
    else if (cur) cur.body.push(raw);
  });

  const out = [];
  items.forEach((it) => {
    const h = parseHeader(it.head, year, defM);
    const base = { lines: [], techs: [], tail: [] };
    const groups = [];
    let target = base; const itemTechs = [];
    let venue = '', room = '';
    it.body.forEach((raw) => {
      const line = raw.replace(/\*/g, '').trim();
      if (!line) return;
      if (onlyDate(line)) {
        const d = findDates(line, year, defM);
        if (d) { target = { dates: d, lines: [], techs: [], tail: [] }; groups.push(target); return; }
      }
      const tm = line.match(/^\(([^)]+)\)\s*(.*)$/);
      if (tm && !tm[1].includes(',') && tm[1].split('/').every((x) => x.trim().length > 0 && x.trim().length <= 20)) {
        const names = tm[1].split('/').map((x) => x.trim());
        target.techs.push(...names); itemTechs.push(...names);
        if (tm[2].trim()) target.lines.push(tm[2].trim());
        return;
      }
      const v = line.match(/^venue\s*:\s*(.+)$/i); if (v) { venue = v[1].trim(); return; }
      const r = line.match(/^room\s*:\s*(.+)$/i); if (r) { room = r[1].trim(); return; }
      target.lines.push(line);
    });
    const mk = (g) => {
      const d = (g && g.dates) || h.dates || { mulai: '', selesai: '' };
      const techs = [...new Set(((g && g.techs.length) ? g.techs : itemTechs))];
      const head = [h.jenis, h.org && `(${h.org})`].filter(Boolean).join(' ');
      const lokasi = [venue, room].filter(Boolean).join(' · ') || h.kota;
      const body = [...base.lines, ...(g ? g.lines : [])];
      out.push({ nama: h.nama || '(tanpa nama)', lokasi, mulai: d.mulai, selesai: d.selesai,
        teks: [head, ...body].filter(Boolean).join('\n'), names: techs, label: g ? it.head.replace(/\*/g, '').trim().slice(0, 40) + ' · ' + g.dates.text : it.head.replace(/\*/g, '').trim().slice(0, 50) });
    };
    if (groups.length) groups.forEach(mk); else mk(null);
  });
  return out;
}
