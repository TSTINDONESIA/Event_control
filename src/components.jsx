import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { STATUS, norm } from './pages/status.js';

export const LOGO = 'https://tstindonesia.id/wp-content/uploads/2019/10/tst-logo-350x200.png';
export const HERO_IMG = 'https://tstindonesia.id/wp-content/uploads/2019/10/davide-ragusa-gcDwzUGuUoI-unsplash.jpg';

export function QR({ text, size = 200 }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(text, { width: size, margin: 1 }).then(setSrc); }, [text, size]);
  return src ? <img src={src} width={size} height={size} alt="QR" /> : null;
}

export function Logo() {
  const [bad, setBad] = useState(false);
  return bad
    ? <span className="brand-txt"><b>TST</b> INDONESIA</span>
    : <img src={LOGO} alt="TST Indonesia" onError={() => setBad(true)} />;
}

export const Badge = ({ s }) => {
  const k = norm(s);
  return <span className={'badge ' + k} title={STATUS[k]?.desc}>{STATUS[k]?.label || s}</span>;
};

// judul halaman: pita hitam + garis kuning, seperti pita judul di situs TST
export function Band({ title, sub, children }) {
  return (
    <div className="band"><div className="band-in">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      <span className="sp" />{children}
    </div></div>
  );
}

export function Progress({ value, max, label, yellow }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      {label !== false && <div className="bar-l"><span>{label || 'Progres'}</span><span>{value}/{max} · {pct}%</span></div>}
      <div className={'bar' + (yellow ? ' y' : '')} role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: pct + '%' }} /></div>
    </div>
  );
}

export const Loading = () => <p className="empty" role="status">Memuat…</p>;

export function Footer() {
  return (
    <footer className="foot">
      <div className="foot-in">
        <div><Logo /><p>Satu Sistem – Satu Data – Semua Terhubung.<br />Lebih teratur, akurat, dan terpercaya.</p></div>
        <div><h4>Menu</h4>
          <Link to="/event">Tugas</Link><br /><Link to="/inventaris">Inventaris</Link></div>
        <div><h4>Kantor</h4>TST INDONESIA<br />23rd floor, ANZ Tower<br />Jl. Jend. Sudirman kav. 33a<br />Jakarta, Indonesia<br /><a href="mailto:john@tstindonesia.id">john@tstindonesia.id</a></div>
        <div><h4>Hubungi kami</h4><a href="tel:+6281383777226">+62 81383777226</a><br /><a href="https://tstindonesia.id" target="_blank" rel="noreferrer">tstindonesia.id</a></div>
      </div>
      <div className="copy">© {new Date().getFullYear()} TST Indonesia. Semua hak dilindungi.</div>
    </footer>
  );
}
