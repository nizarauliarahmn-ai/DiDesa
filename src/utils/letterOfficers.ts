export interface OfficerOption {
  name: string;
  role: string;
  nip: string;
}

/**
 * Daftar pejabat untuk dropdown penandatangan surat.
 * Menjamin nama kades dari `kop_kades` (pengaturan resmi per tenant)
 * SELALU menjadi opsi pertama, apa pun isi village_officers.
 * Mencegah nama kades desa lain (yang tertinggal di village_officers) muncul
 * sebagai default saat kades sudah diatur ulang di menu Aparatur.
 */
export function getOfficerOptions(): OfficerOption[] {
  let list: OfficerOption[] = [];
  try {
    const stored = localStorage.getItem('village_officers');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        list = parsed.map((o: any) => ({
          name: o.name || '',
          role: o.role || 'Kepala Desa',
          nip: o.nip || '-'
        }));
      }
    }
  } catch (e) {}

  const kades = (localStorage.getItem('kop_kades') || '').trim();
  if (kades) {
    const normalized = (n: string) => n.toLowerCase().replace(/\s+/g, '');
    const kadesNormalized = normalized(kades);

    // Buang baris "Kepala Desa" lama yang berbeda dari kades terkini.
    list = list.filter((o: OfficerOption) => {
      const isKadesRole = String(o.role || '').toLowerCase().includes('kepala desa');
      return !(isKadesRole && normalized(o.name) !== kadesNormalized);
    });

    const kadesIdx = list.findIndex((o) => normalized(o.name) === kadesNormalized);
    if (kadesIdx === -1) {
      list = [{ name: kades, role: 'Kepala Desa', nip: '-' }, ...list];
    } else if (kadesIdx !== 0) {
      const [kadesOfficer] = list.splice(kadesIdx, 1);
      list = [kadesOfficer, ...list];
    }
  }

  return list;
}

/** Perbarui/pertahankan nama kades di village_officers agar selalu sinkron. */
export function ensureKadesInOfficers() {
  const kades = (localStorage.getItem('kop_kades') || '').trim();
  if (!kades) return;

  let list: OfficerOption[] = [];
  try {
    const stored = localStorage.getItem('village_officers');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) list = parsed;
    }
  } catch (e) {}

  const normalized = (n: string) => n.toLowerCase().replace(/\s+/g, '');
  const kadesNormalized = normalized(kades);

  // Buang baris "Kepala Desa" lama yang berbeda dari kades terkini.
  const filtered = list.filter((o: any) => {
    const isKadesRole = String(o.role || '').toLowerCase().includes('kepala desa');
    return !(isKadesRole && normalized(o.name || '') !== kadesNormalized);
  });

  const exists = filtered.some((o: any) => normalized(o.name || '') === kadesNormalized);
  if (!exists) {
    filtered.unshift({ name: kades, role: 'Kepala Desa', nip: '-' });
  }

  // Selalu tulis ulang agar baris kades lama (mis. kades desa lain) hilang
  // dari localStorage, sehingga dropdown pejabat form surat benar-benar bersih.
  localStorage.setItem('village_officers', JSON.stringify(filtered));
}