import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext.jsx';
import App from './App.jsx';
import './styles.css';

// Tampilan HP (tabel jadi kartu) ada di styles/components.css
// beri tiap sel tabel label sesuai judul kolomnya (dipakai tampilan kartu di HP)
function labelTables() {
  document.querySelectorAll('table').forEach((t) => {
    const heads = [...t.querySelectorAll('thead th')].map((h) => h.textContent.trim());
    if (!heads.length) return;
    t.querySelectorAll('tbody tr').forEach((tr) => {
      [...tr.children].forEach((td, i) => {
        if (td.tagName === 'TD' && !td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i] || '');
      });
    });
  });
}
let pending = false;
new MutationObserver(() => {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; labelTables(); });
}).observe(document.body, { childList: true, subtree: true });

class Boundary extends React.Component {
  state = { err: null };
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) return <div className="pad"><h2>Terjadi kesalahan</h2><pre>{String(this.state.err.message || this.state.err)}</pre></div>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <Boundary><HashRouter><AuthProvider><App /></AuthProvider></HashRouter></Boundary>
);
