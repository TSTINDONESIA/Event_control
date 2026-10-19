import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext.jsx';
import App from './App.jsx';
import './styles.css';

// ---- Tampilan HP: semua tabel berubah jadi kartu menurun (tidak perlu geser ke samping) ----
const HP_CSS = `
@media screen and (max-width:720px){
  html,body{overflow-x:hidden}
  img{max-width:100%}
  .tbl,.pad>table{display:block!important;overflow:visible!important;border:0!important}
  table:not(.sj-table),table:not(.sj-table) tbody{display:block;width:100%}
  table:not(.sj-table) thead{display:none}
  table:not(.sj-table) tr{display:block;border:2px solid #000;margin:0 0 12px;padding:6px 12px}
  table:not(.sj-table) td{display:flex;justify-content:space-between;align-items:center;gap:12px;border:0;border-bottom:1px solid #e5e5e0;padding:9px 0;text-align:right;min-width:0;font-size:15px}
  table:not(.sj-table) td:last-child{border-bottom:0}
  table:not(.sj-table) td::before{content:attr(data-label);flex:0 0 36%;text-align:left;font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#666}
  table:not(.sj-table) td[data-label=""]::before{content:none}
  table:not(.sj-table) td:empty{display:none}
  table:not(.sj-table) td input,table:not(.sj-table) td select{min-width:0!important;width:100%}
}
`;
const st = document.createElement('style');
st.textContent = HP_CSS;
document.head.appendChild(st);

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
