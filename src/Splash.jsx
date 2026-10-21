import './styles/intro.css';
import { Logo } from './components.jsx';

export const Beams = () => <div className="intro-beams" aria-hidden="true"><i /><i /><i /></div>;

// layar pembuka (bumper) saat aplikasi dibuka
export default function Splash() {
  return (
    <div className="intro" role="status" aria-label="TST Event Control">
      <Beams />
      <div className="intro-logo"><Logo size={132} /></div>
      <div className="intro-name"><b>TST Event Control</b>Satu Sistem · Satu Data</div>
      <div className="intro-bar" />
    </div>
  );
}
