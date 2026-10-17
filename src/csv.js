export const toCSV = (rows, cols) =>
  [cols.join(','), ...rows.map((r) => cols.map((c) => {
    const v = String(r[c] ?? '');
    return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(','))].join('\n');

export function download(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv' }));
  a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

export function parseCSV(text) {
  const t = text.replace(/^\ufeff/, '');
  const rows = []; let row = [], cur = '', q = false;
  const end = () => { row.push(cur); cur = ''; if (row.some((x) => x.trim())) rows.push(row); row = []; };
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',' || c === ';') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; end(); }
    else cur += c;
  }
  end();
  return rows;
}
