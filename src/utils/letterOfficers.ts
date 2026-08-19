export interface OfficerOption {
  name: string;
  role: string;
  nip: string;
}

/** Baca daftar aparatur dari localStorage secara aman. */
function readOfficers(): OfficerOption[] {
  try {
    const stored = localStorage.getItem('village_officers');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map((o: any) => ({
          name: o.name || '',
          role: o.role || 'Kepala Desa',
          nip: o.nip || '-'
        }));
      }
    }
  } catch (e) {}
  return [];
}

const isKadesRole = (role: string) => String(role || '').toLowerCase().includes('kepala desa');
const normalize = (n: string) => n.toLowerCase().replace(/\s+/g, '');

/**
 * Nama Kepala Desa / Penandatangan Utama resmi tenant ini.
 * Prioritas:
 *  1. `kop_kades` (sudah diatur eksplisit sebagai Penandatangan Utama)
 *  2. Otomatis dari daftar aparatur: officer ber-role "Kepala Desa"
 *  3. Kosong (TIDAK pernah fallback ke kades desa lain)
 */
export function resolveKadesName(): string {
  const explicit = (localStorage.getItem('kop_kades') || '').trim();
  if (explicit) return explicit;

  const officers = readOfficers();
  const kadesOfficer = officers.find((o) => isKadesRole(o.role) && o.name.trim());
  if (kadesOfficer) return kadesOfficer.name.trim();

  return '';
}

/** Ambil data lengkap (role + nip) officer yang menjadi Penandatangan Utama. */
export function resolveKadesOfficer(): OfficerOption | null {
  const explicit = (localStorage.getItem('kop_kades') || '').trim();
  if (explicit) {
    const officers = readOfficers();
    const found = officers.find((o) => normalize(o.name) === normalize(explicit));
    if (found) return found;
    return { name: explicit, role: 'Kepala Desa', nip: '-' };
  }

  const officers = readOfficers();
  const kadesOfficer = officers.find((o) => isKadesRole(o.role) && o.name.trim());
  return kadesOfficer || null;
}

/**
 * Daftar pejabat untuk dropdown penandatangan surat.
 * Menjamin nama kades dari `kop_kades` (pengaturan resmi per tenant)
 * SELALU menjadi opsi pertama, apa pun isi village_officers.
 * Mencegah nama kades desa lain (yang tertinggal di village_officers) muncul
 * sebagai default saat kades sudah diatur ulang di menu Aparatur.
 */
export function getOfficerOptions(): OfficerOption[] {
  let list = readOfficers();
  const kades = resolveKadesName();

  if (kades) {
    const kadesNormalized = normalize(kades);

    // Buang baris "Kepala Desa" lama yang berbeda dari kades terkini.
    list = list.filter((o: OfficerOption) => {
      return !(isKadesRole(o.role) && normalize(o.name) !== kadesNormalized);
    });

    const kadesIdx = list.findIndex((o) => normalize(o.name) === kadesNormalized);
    if (kadesIdx === -1) {
      list = [{ name: kades, role: 'Kepala Desa', nip: '-' }, ...list];
    } else if (kadesIdx !== 0) {
      const [kadesOfficer] = list.splice(kadesIdx, 1);
      list = [kadesOfficer, ...list];
    }
  }

  return list;
}

/**
 * Pastikan Penandatangan Utama selalu terisi:
 *  - Jika `kop_kades` belum diatur, tetapkan otomatis dari officer ber-role
 *    "Kepala Desa" di daftar aparatur desa ini sendiri.
 *  - Bersihkan baris "Kepala Desa" yang bukan kades terkini dari village_officers.
 */
export function ensureKadesInOfficers() {
  const explicit = (localStorage.getItem('kop_kades') || '').trim();

  let list = readOfficers();
  const autoKades = explicit || list.find((o) => isKadesRole(o.role) && o.name.trim())?.name || '';

  if (autoKades) {
    // Tetapkan kop_kades jika masih kosong (default otomatis = Kepala Desa desa ini).
    if (!explicit) {
      localStorage.setItem('kop_kades', autoKades);
    }
  }

  const kades = (localStorage.getItem('kop_kades') || '').trim();
  if (!kades) return;

  const kadesNormalized = normalize(kades);
  const filtered = list.filter((o) => {
    return !(isKadesRole(o.role) && normalize(o.name || '') !== kadesNormalized);
  });

  const exists = filtered.some((o) => normalize(o.name || '') === kadesNormalized);
  if (!exists) {
    filtered.unshift({ name: kades, role: 'Kepala Desa', nip: '-' });
  }

  // Selalu tulis ulang agar baris kades lama (mis. kades desa lain) hilang
  // dari localStorage, sehingga dropdown pejabat form surat benar-benar bersih.
  localStorage.setItem('village_officers', JSON.stringify(filtered));
}