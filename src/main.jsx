import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext.jsx';
import App from './App.jsx';
import './styles.css';

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
