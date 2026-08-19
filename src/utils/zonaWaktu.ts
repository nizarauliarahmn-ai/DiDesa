export const WAKTU_ZONA_OPTIONS = ['WIB', 'WITA', 'WIT'] as const;
export type ZonaWaktu = typeof WAKTU_ZONA_OPTIONS[number];

export const WAKTU_ZONA_LABEL: Record<ZonaWaktu, string> = {
  WIB: 'WIB (UTC+7)',
  WITA: 'WITA (UTC+8)',
  WIT: 'WIT (UTC+9)',
};

// Deteksi zona waktu Indonesia dari offset perangkat (UTC+7 WIB, UTC+8 WITA, UTC+9 WIT)
export const detectZonaWaktu = (): ZonaWaktu => {
  const offsetHours = -new Date().getTimezoneOffset() / 60;
  if (offsetHours === 9) return 'WIT';
  if (offsetHours === 8) return 'WITA';
  if (offsetHours === 7) return 'WIB';
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (/^Asia\/(Jayapura)/.test(tz)) return 'WIT';
    if (/^Asia\/(Makassar|Ujung_Pandang)/.test(tz)) return 'WITA';
    if (/^Asia\/(Jakarta|Pontianak)/.test(tz)) return 'WIB';
  } catch {
    // abaikan, pakai fallback
  }
  return 'WITA';
};

// Zona waktu dari profil desa (kop_waktu), fallback auto-detect perangkat
export const getZonaWaktu = (): ZonaWaktu => {
  try {
    const stored = (localStorage.getItem('kop_waktu') || '').trim().toUpperCase();
    if ((WAKTU_ZONA_OPTIONS as readonly string[]).includes(stored)) return stored as ZonaWaktu;
  } catch {
    // localStorage tidak tersedia
  }
  return detectZonaWaktu();
};
