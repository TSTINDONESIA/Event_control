// Pembuat PDF sederhana tanpa library: teks + tabel (font Helvetica), A4.
const W = 595, H = 842, M = 40;

// PDF standar hanya mengenal karakter Latin; selain itu diganti "?"
const enc = (s) => String(s ?? '')
  .replace(/\u2013/g, '\x96').replace(/\u2014/g, '\x97')
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
  .replace(/[^\x20-\x7E\xA0-\xFF\x96\x97]/g, '?');
const esc = (s) => enc(s).replace(/[\\()]/g, '\\$&');

const wrap = (text, max) => {
  const out = [];
  String(text ?? '').split('\n').forEach((para) => {
    let line = '';
    para.split(/\s+/).filter(Boolean).forEach((w0) => {
      let w = w0;
      while (w.length > max) { if (line) { out.push(line); line = ''; } out.push(w.slice(0, max)); w = w.slice(max); }
      if (!line) line = w;
      else if ((line + ' ' + w).length <= max) line += ' ' + w;
      else { out.push(line); line = w; }
    });
    out.push(line);
  });
  return out.length ? out : [''];
};

export function createPdf() {
  const pages = [];
  let ops; let y;
  const add = () => { ops = []; pages.push(ops); y = H - M; };
  add();
  const need = (h) => { if (y - h < M) add(); };
  const text = (x, yy, s, size = 10, bold = false, white = false) =>
    ops.push(`${white ? '1 g' : '0 g'} BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${yy.toFixed(1)} Td (${esc(s)}) Tj ET`);

  const api = {
    title(s, size = 14) {
      need(size + 8);
      const w = enc(s).length * size * 0.58;
      text(Math.max(M, (W - w) / 2), y - size, s, size, true);
      y -= size + 8;
    },
    kv(label, value) {
      const lines = wrap(value || '-', 75);
      need(lines.length * 13 + 2);
      text(M, y - 10, label, 10, true);
      lines.forEach((ln, i) => text(M + 90, y - 10 - i * 13, (i === 0 ? ': ' : '  ') + ln, 10));
      y -= lines.length * 13 + 2;
    },
    gap(n = 10) { y -= n; },
    heading(s) { need(40); y -= 6; text(M, y - 12, s, 12, true); y -= 22; },
    table(cols, rows) {
      const size = 9, lh = 11, pad = 4;
      const header = () => {
        need(40);
        ops.push(`0 g ${M} ${(y - 18).toFixed(1)} ${W - 2 * M} 18 re f`);
        let x = M;
        cols.forEach((c) => { text(c.right ? x + c.w - pad - enc(c.h).length * size * 0.6 : x + pad, y - 13, c.h, size, true, true); x += c.w; });
        y -= 18;
      };
      header();
      rows.forEach((r) => {
        const cellsRaw = Array.isArray(r) ? r : r.cells;
        const bold = !Array.isArray(r) && r.bold;
        const cells = cellsRaw.map((v, i) => wrap(v, Math.max(1, Math.floor((cols[i].w - 2 * pad) / (size * (bold ? 0.58 : 0.52))))));
        const n = Math.max(...cells.map((c) => c.length));
        const h = n * lh + 2 * pad - 2;
        if (y - h < M) { add(); header(); }
        let x = M;
        cells.forEach((lines, i) => {
          lines.forEach((ln, j) => {
            const tx = cols[i].right ? x + cols[i].w - pad - enc(ln).length * size * 0.52 : x + pad;
            text(tx, y - pad - 7 - j * lh, ln, size, bold);
          });
          x += cols[i].w;
        });
        ops.push(`0.6 G 0.5 w ${M} ${(y - h).toFixed(1)} ${W - 2 * M} ${h.toFixed(1)} re S`);
        let vx = M;
        cols.slice(0, -1).forEach((c) => { vx += c.w; ops.push(`${vx.toFixed(1)} ${(y - h).toFixed(1)} m ${vx.toFixed(1)} ${y.toFixed(1)} l S`); });
        y -= h;
      });
      y -= 8;
    },
    toBlob() {
      const n = pages.length;
      pages.forEach((p, i) => p.push(`0 g BT /F1 8 Tf ${M} 22 Td (${esc(`Halaman ${i + 1} / ${n}`)}) Tj ET`));
      const objs = [];
      objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
      objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
      objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
      const kids = [];
      pages.forEach((p, i) => {
        const pid = 5 + i * 2; const cid = pid + 1;
        kids.push(`${pid} 0 R`);
        const s = p.join('\n');
        objs[pid] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>`;
        objs[cid] = `<< /Length ${s.length} >>\nstream\n${s}\nendstream`;
      });
      objs[2] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${n} >>`;
      let out = '%PDF-1.4\n';
      const off = [];
      for (let i = 1; i < objs.length; i++) { off[i] = out.length; out += `${i} 0 obj\n${objs[i]}\nendobj\n`; }
      const xr = out.length;
      out += `xref\n0 ${objs.length}\n0000000000 65535 f \n${off.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
      out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;
      const bytes = new Uint8Array(out.length);
      for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
      return new Blob([bytes], { type: 'application/pdf' });
    },
  };
  return api;
}

// unduh file ke HP / komputer
export function savePdf(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export const fileName = (s) => String(s || 'file').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'file';

// PDF detail peralatan satu event
export function eventPdf({ nama, lokasi, tanggal, teknisi, permintaan, rows, units }) {
  const d = createPdf();
  d.title('PT. TST INDONESIA');
  d.title('Detail Peralatan Event', 11);
  d.gap(6);
  d.kv('Vendor / Event', nama); d.kv('Lokasi', lokasi); d.kv('Tanggal', tanggal); d.kv('Teknisi', teknisi);
  d.kv('Kebutuhan alat', permintaan || '-');
  d.heading('Disiapkan gudang');
  if (rows.length) {
    d.table([{ h: 'No', w: 30 }, { h: 'Alat', w: 335 }, { h: 'Jumlah', w: 150, right: true }], rows.map((r, i) => [String(i + 1), r.alat, String(r.jumlah)]));
  } else d.kv('', 'Belum ada alat disiapkan.');
  if (units.length) {
    d.heading(`Unit ber-QR (${units.length})`);
    d.table(
      [{ h: 'Kode', w: 90 }, { h: 'Nama', w: 190 }, { h: 'Kategori', w: 135 }, { h: 'Status', w: 100 }],
      units.map((u) => [u.kode, u.nama, u.kategori || '-', u.status]),
    );
  }
  return d.toBlob();
}

// PDF stok gudang per kategori
export function stokPdf(rows, tanggal) {
  const d = createPdf();
  d.title('PT. TST INDONESIA');
  d.title('Stok Peralatan Gudang', 11);
  d.gap(6);
  d.kv('Tanggal', tanggal);
  d.gap(6);
  const sum = (k) => rows.reduce((n, r) => n + r[k], 0);
  d.table(
    [{ h: 'No', w: 30 }, { h: 'Alat', w: 175 }, { h: 'Total', w: 50, right: true }, { h: 'Stand by', w: 60, right: true }, { h: 'Siap kirim', w: 60, right: true }, { h: 'Keluar', w: 50, right: true }, { h: 'Rusak', w: 45, right: true }, { h: 'Hilang', w: 45, right: true }],
    [...rows.map((r, i) => [String(i + 1), r.nama, String(r.total), String(r.tersedia), String(r.disiapkan), String(r.keluar), String(r.servis), String(r.hilang)]),
      { bold: true, cells: ['', 'JUMLAH', String(sum('total')), String(sum('tersedia')), String(sum('disiapkan')), String(sum('keluar')), String(sum('servis')), String(sum('hilang'))] }],
  );
  return d.toBlob();
}

// PDF "Kirim ke teknisi": daftar alat yang sudah disiapkan gudang
export function kirimPdf({ nama, lokasi, tanggal, teknisi, gudang, waktu, permintaan, rows, units }) {
  const d = createPdf();
  d.title('PT. TST INDONESIA');
  d.title('Daftar Alat Dikirim ke Teknisi', 11);
  d.gap(6);
  d.kv('Vendor / Event', nama); d.kv('Lokasi', lokasi); d.kv('Tanggal', tanggal);
  d.kv('Teknisi', teknisi); d.kv('Disiapkan oleh', gudang); d.kv('Waktu kirim', waktu);
  d.kv('Kebutuhan alat', permintaan || '-');
  d.heading('Alat yang disiapkan');
  if (rows.length) {
    d.table([{ h: 'No', w: 30 }, { h: 'Alat', w: 335 }, { h: 'Jumlah', w: 150, right: true }], rows.map((r, i) => [String(i + 1), r.alat, String(r.jumlah)]));
  } else d.kv('', 'Belum ada.');
  d.heading(`Unit ber-QR yang dikirim (${units.length})`);
  d.table(
    [{ h: 'No', w: 30 }, { h: 'Kode', w: 100 }, { h: 'Nama', w: 220 }, { h: 'Kategori', w: 165 }],
    units.map((u, i) => [String(i + 1), u.kode, u.nama || '', u.kategori || '-']),
  );
  d.gap(10);
  d.kv('Catatan', 'Teknisi mengecek alat di aplikasi lalu menekan "Alat lengkap diterima".');
  return d.toBlob();
}

// Bagikan PDF (menu share HP, mis. WhatsApp); bila tidak didukung, unduh biasa
export async function bagikanPdf(blob, name, title) {
  try {
    const file = new File([blob], name, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  savePdf(blob, name);
}
