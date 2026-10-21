import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, query, orderByChild, limitToLast, set } from 'firebase/database';
import { LocalNotifications } from '@capacitor/local-notifications';
import { db } from './firebase.js';
import { useAuth } from './AuthContext.jsx';
import { fmt } from './util.js';
import { Icon } from './ui.jsx';
import { initPush } from './push.js';

// gabungan notifikasi pribadi + notifikasi per peran, terbaru di atas
export function useNotifs() {
  const { profile } = useAuth();
  const [a, setA] = useState({});
  const [b, setB] = useState({});
  const [seen, setSeen] = useState(0);
  useEffect(() => {
    if (!profile) return;
    const q = (p) => query(ref(db, p), orderByChild('waktu'), limitToLast(40));
    const u1 = onValue(q('notifications/' + profile.uid), (s) => setA(s.val() || {}), () => setA({}));
    const u2 = onValue(q('notifRole/' + profile.role), (s) => setB(s.val() || {}), () => setB({}));
    const u3 = onValue(ref(db, 'notifSeen/' + profile.uid), (s) => setSeen(s.val() || 0), () => {});
    return () => { u1(); u2(); u3(); };
  }, [profile?.uid, profile?.role]); // eslint-disable-line react-hooks/exhaustive-deps
  const items = useMemo(() => [...Object.entries(a), ...Object.entries(b)]
    .map(([id, v]) => ({ id, ...v })).sort((x, y) => y.waktu - x.waktu).slice(0, 60), [a, b]);
  const mine = (n) => n.dari === profile?.uid;
  const unread = items.filter((n) => n.waktu > seen && !mine(n)).length;
  const markRead = () => profile && set(ref(db, 'notifSeen/' + profile.uid), Date.now()).catch(() => {});
  return { items, unread, seen, markRead, mine };
}

// dipasang sekali di App: memunculkan notifikasi HP untuk pesan baru
export function NotifBridge() {
  const { profile } = useAuth();
  const { items, mine } = useNotifs();
  const [push, setPush] = useState(null); // null = belum diketahui
  const t0 = useRef(Date.now());
  useEffect(() => {
    if (!profile) return;
    LocalNotifications.requestPermissions().catch(() => {});
    initPush().then(setPush);
  }, [profile?.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!profile || !items.length || push === null) return;
    const key = 'notifLast_' + profile.uid;
    const last = Number(localStorage.getItem(key) || 0);
    const baru = items.filter((n) => n.waktu > last && !mine(n) && (!push || n.waktu > t0.current)).sort((x, y) => x.waktu - y.waktu);
    const newest = Math.max(last, ...items.map((n) => n.waktu));
    localStorage.setItem(key, String(newest));
    if (!last) return; // pertama kali login di HP ini: jangan banjir notifikasi lama
    baru.slice(-5).forEach((n, i) => {
      LocalNotifications.schedule({
        notifications: [{ id: Math.floor((n.waktu % 2147483000) + i), title: n.judul, body: n.pesan, }],
      }).catch(() => {});
    });
  }, [items, profile?.uid, push]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function Bell() {
  const { unread } = useNotifs();
  return (
    <Link to="/notifikasi" className="icon-btn" aria-label={'Notifikasi' + (unread ? ` (${unread} baru)` : '')} style={{ position: 'relative' }}>
      <Icon n="bell" />
      {unread > 0 && <span style={{ position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, background: 'var(--bad)', color: '#fff', fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', padding: '0 4px' }}>{unread > 99 ? '99+' : unread}</span>}
    </Link>
  );
}

export default function Notifikasi() {
  const { items, seen, markRead, mine } = useNotifs();
  useEffect(() => { const t = setTimeout(markRead, 1500); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!items.length) return <p className="empty">Belum ada notifikasi.</p>;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((n) => {
        const baru = n.waktu > seen && !mine(n);
        const body = (
          <div className="card" style={{ borderLeft: baru ? '3px solid var(--gold)' : undefined }}>
            <b>{n.judul}</b>
            <p style={{ margin: '4px 0' }}>{n.pesan}</p>
            <small>{n.dariNama ? n.dariNama + ' · ' : ''}{fmt(n.waktu)}</small>
          </div>
        );
        return n.eventId ? <Link key={n.id} to={'/event/' + n.eventId} style={{ textDecoration: 'none', color: 'inherit' }}>{body}</Link> : <div key={n.id}>{body}</div>;
      })}
    </div>
  );
}
