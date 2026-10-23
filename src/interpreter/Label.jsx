import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';

// Label receiver 30 x 35 mm. Isi QR = HANYA nomor unit (mis. "A001"), bukan link.
// QR dipakai khusus untuk scan oleh Usher; tamu tetap mengetik nomor sendiri.
const MAX = 100;
const pad = (n, w = 3) => String(n).padStart(w, '0');

export const buatDaftar = (awalan, dari, sampai) => {
  const a = String(awalan || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  const d = parseInt(dari, 10);
  const s = parseInt(sampai, 10);
  if (!a || !(d >= 0) || !(s >= d)) return [];
  return Array.from({ length: Math.min(MAX, s - d + 1) }, (_, i) => a + pad(d + i));
};

const qrUrl = (teks) => QRCode.toDataURL(teks, { errorCorrectionLevel: 'M', margin: 1, width: 400 });

export default function LabelPrint() {
  const [awalan, setAwalan] = useState('A');
  const [dari, setDari] = useState('1');
  const [sampai, setSampai] = useState('100');
  const [img, setImg] = useState({});
  const [busy, setBusy] = useState(false);

  const total = Math.max(0, (parseInt(sampai, 10) || 0) - (parseInt(dari, 10) || 0) + 1);
  const daftar = useMemo(() => buatDaftar(awalan, dari, sampai), [awalan, dari, sampai]);
  const kepotong = total > MAX;

  useEffect(() => {
    let batal = false;
    (async () => {
      const m = {};
      for (const no of daftar) m[no] = await qrUrl(no);
      if (!batal) setImg(m);
    })().catch(() => {});
    return () => { batal = true; };
  }, [daftar]);

  const simpanPdf = async () => {
    if (!daftar.length) return;
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const COL = 6, ROW = 8, W = 30, H = 35;
      const mx = (210 - COL * W) / 2, my = (297 - ROW * H) / 2;
      doc.setDrawColor(190); doc.setLineWidth(0.1);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
      for (let i = 0; i < daftar.length; i++) {
        const per = COL * ROW;
        if (i > 0 && i % per === 0) doc.addPage();
        const k = i % per;
        const x = mx + (k % COL) * W;
        const y = my + Math.floor(k / COL) * H;
        const no = daftar[i];
        doc.rect(x, y, W, H);
        doc.addImage(img[no] || (await qrUrl(no)), 'PNG', x + 2.5, y + 2, 25, 25);
        doc.setTextColor(0, 0, 0);
        doc.text(no, x + W / 2, y + 32.5, { align: 'center' });
      }
      doc.save(`label-receiver-${daftar[0]}-${daftar[daftar.length - 1]}.pdf`);
    } catch (e) {
      alert('Gagal membuat PDF (' + (e?.message || '?') + ').');
    }
    setBusy(false);
  };

  return (
    <div className="card">
      <h3>🏷️ Cetak barcode label receiver</h3>
      <p className="muted">
        Satu label = satu alat, nomor permanen untuk semua event. Isi QR hanya nomor unit (mis. A001), <b>bukan link</b>, dan dipakai untuk scan oleh Usher.
        Ukuran label 30 × 35 mm, 48 label per lembar A4. Maksimal {MAX} label sekali cetak.
      </p>
      <div className="lblform">
        <label>Awalan
          <input value={awalan} maxLength={3} autoCapitalize="characters" onChange={(e) => setAwalan(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
        </label>
        <label>Dari nomor
          <input value={dari} inputMode="numeric" onChange={(e) => setDari(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </label>
        <label>Sampai nomor
          <input value={sampai} inputMode="numeric" onChange={(e) => setSampai(e.target.value.replace(/\D/g, '').slice(0, 4))} />
        </label>
      </div>
      <div className={kepotong ? 'err' : 'muted'}>
        {daftar.length
          ? `${daftar.length} label: ${daftar[0]} sampai ${daftar[daftar.length - 1]}${kepotong ? ` (rentang ${total} dipotong jadi ${MAX}; cetak sisanya di putaran berikutnya)` : ''}`
          : 'Isi awalan huruf dan rentang nomor yang benar.'}
      </div>
      <div className="actions">
        <button className="btn primary" disabled={!daftar.length} onClick={() => window.print()}>🖨️ Cetak</button>
        <button className="btn" disabled={!daftar.length || busy} onClick={simpanPdf}>{busy ? 'Membuat…' : '⬇ Simpan PDF'}</button>
      </div>
      <p className="muted">Cetak ulang satu label (rusak/hilang): isi nomor yang sama di <b>Dari</b> dan <b>Sampai</b>. Nomornya tetap sama.</p>
      <p className="muted">Pratinjau (bagian ini yang tercetak):</p>
      <div className="lbl-scroll">
        <div className="lbl-sheet">
          {daftar.map((no) => (
            <div className="lbl" key={no}>
              {img[no] ? <img src={img[no]} alt={`QR ${no}`} /> : <div className="lbl-ph" />}
              <b>{no}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
