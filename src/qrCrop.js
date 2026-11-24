// Hitung area frame video yang dibaca decoder (murni, bisa diuji).
// Hanya ±70% bagian tengah yang dibaca (sesuai bingkai di layar), dipersempit oleh zoom digital.
// Ini membuat decoder lebih cepat dan QR tetangga yang terpotong di tepi tidak ikut terbaca.
export function cropSquare(vw, vh, digitalZoom = 1, ratio = 0.7) {
  const dz = digitalZoom > 1.01 ? digitalZoom : 1;
  const side = (Math.min(vw, vh) / dz) * ratio;
  return { sx: (vw - side) / 2, sy: (vh - side) / 2, side };
}
// Selang-seling ukuran kecil (cepat) dan sedang (lebih teliti) tiap frame.
export const outSize = (frame, side) => Math.round(Math.min(side, frame % 2 ? 360 : 560));
