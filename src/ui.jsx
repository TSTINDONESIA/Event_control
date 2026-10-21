import { useEffect, useRef, useState } from 'react';

// ---- ikon (stroke, 24x24) — satu set konsisten untuk seluruh aplikasi ----
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  calendar: 'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01',
  warehouse: 'M3 21V9l9-5 9 5v12M7 21v-7h10v7M7 17h10',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3M20 16V6',
  users: 'M16 20v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 18.5V20M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1.5a3.5 3.5 0 00-2.5-3.3M15.5 4.2a3.5 3.5 0 010 6.6',
  search: 'M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3',
  bell: 'M6 9a6 6 0 1112 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9zM10 20a2 2 0 004 0',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  tools: 'M14.7 6.3a4 4 0 005 5l-8.4 8.4a2.1 2.1 0 01-3-3l8.4-8.4zM15 7l2-2',
  truck: 'M2 6h11v10H2zM13 9h4l3 3v4h-7zM6.5 19a2 2 0 100-4 2 2 0 000 4zM17.5 19a2 2 0 100-4 2 2 0 000 4z',
  logout: 'M9 4H5a1 1 0 00-1 1v14a1 1 0 001 1h4M16 8l4 4-4 4M20 12H9',
  key: 'M14 9a4 4 0 11-3.4 6L4 21v-3l2-1v-2l2-1 2.6-2.6A4 4 0 0114 9z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A9.8 9.8 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3 3.9M6.6 6.6A16.6 16.6 0 002 12s3.5 7 10 7a9.6 9.6 0 004.2-1M9.9 9.9a3 3 0 004.2 4.2',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  plus: 'M12 5v14M5 12h14',
};
export function Icon({ n, size = 20, sw = 1.8, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={P[n] || P.box} />
    </svg>
  );
}

// ---- scroll reveal (IntersectionObserver); tanpa IO atau reduced-motion = langsung tampil ----
export function Reveal({ as: T = 'div', delay = 0, wipe = false, className = '', children, ...rest }) {
  const el = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setOn(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return <T ref={el} className={`reveal${wipe ? ' wipe' : ''}${on ? ' in' : ''} ${className}`} style={{ '--d': delay + 'ms' }} {...rest}>{children}</T>;
}

// ---- kartu statistik ----
export function StatCard({ n, l, icon = 'box', tone = 'cyan' }) {
  return (
    <div className={'tile c-' + tone}>
      <div className="ti"><Icon n={icon} size={22} /></div>
      <div><div className="num">{n}</div><div className="lbl">{l}</div></div>
    </div>
  );
}

export function EmptyState({ icon = 'box', children }) {
  return <div className="empty"><Icon n={icon} size={28} className="ico" />{children}</div>;
}

// ---- donut SVG (data nyata dikirim lewat props) ----
export function Donut({ parts, total, centerLabel, centerSmall }) {
  const R = 54, C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={centerSmall || 'Ringkasan'}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="14" />
        {total > 0 && parts.filter((p) => p.v > 0).map((p) => {
          const len = (p.v / total) * C;
          const el = <circle key={p.k} cx="70" cy="70" r={R} fill="none" stroke={p.c} strokeWidth="14" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-off} strokeLinecap="round" />;
          off += len;
          return el;
        })}
      </svg>
      <div className="mid"><b>{centerLabel}</b><small>{centerSmall}</small></div>
    </div>
  );
}
