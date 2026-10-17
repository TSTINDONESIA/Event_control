import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QR({ text, size = 200 }) {
  const [src, setSrc] = useState('');
  useEffect(() => { QRCode.toDataURL(text, { width: size, margin: 1 }).then(setSrc); }, [text, size]);
  return src ? <img src={src} width={size} height={size} alt="QR" /> : null;
}
export const Badge = ({ s }) => <span className={'badge ' + s}>{s}</span>;
