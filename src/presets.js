// Daftar nama peralatan standar (dari form Check List KELUAR/MASUK Barang Gudang).
export const PRESET = {
  'Layanan (Surat Jalan)': ['Booth Interpreter', 'Digital SIS Service / Portable UHF', 'Teleconference Service', 'Hybrid Service', 'Hosting', 'Projector', 'TV Matador', 'Delegate Mic', 'Wireless Mic', 'Ext Cable'],
  'Penerjemah (SIS)': ['Controller Taiden', 'Pemancar Taiden', 'Mixer', 'Konsul', 'Exhaust', 'Lampu', 'Kabel Extension', 'Kabel Serial', 'Kabel Pemancar', 'Kabel Audio Panjang', 'Kabel Audio Pendek', 'Kabel Gender', 'Tripod', 'T', 'Booth', 'Baut', 'Receiver + Headset'],
  'Sound System': ['Mixer', 'Mikrofon', 'Clip On', 'Delegate', 'Controller Delegate', 'Speaker', 'Kabel Extension', 'Kabel Audio Panjang', 'Kabel Audio Pendek', 'Kabel Gender', 'Kabel Gender 3.5 Cowok', 'Kabel Gender 3.5 Cewek', 'Stand Speaker', 'Stand Mic'],
  'Teleconference & Multimedia': ['Kamera', 'Tripod Kamera', 'RGB Link', 'Atem', 'Switcher LAN', 'Joystick', 'Laptop', 'TV', 'Splitter HDMI', 'Capture', 'PC Host', 'Monitor', 'Keyboard', 'Mouse', 'Kabel HDMI Panjang', 'Kabel Extension', 'Kabel LAN Panjang', 'Kabel LAN Coax', 'Kabel LAN Pendek', 'Kabel Audio Panjang', 'Kabel Audio Pendek', 'Kabel Gender', 'Kabel Codec', 'Orbit', 'Clicker', 'Benghinger', 'HDMI Pendek', 'Stand TV / Matador', 'Konverter HDMI to VGA', 'Proyektor', 'Kabel VGA', 'Stream Deck', 'Extender LAN', 'Kabel Gender 3.5 Cowok', 'Kabel Gender 3.5 Cewek', 'Display to VGA', 'VGA'],
};
export const PRESET_NAMES = [...new Set(Object.values(PRESET).flat())];

// Kabel tidak punya barcode: jumlah disiapkan diisi manual. Alat lain dihitung otomatis dari scan QR.
export const isKabel = (n) => /kabel|cable/i.test(String(n || ''));
