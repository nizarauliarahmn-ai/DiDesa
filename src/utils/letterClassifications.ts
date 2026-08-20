import { supabase } from './supabase';
import { resolveCurrentTenant } from './tenantResolver';
import { DEFAULT_SURAT_FORMAT, formatNomorSurat } from './generateSuratNumber';
import { getMaxActiveNomorUrut, getNextNomorSurat, getNextNomorSuratSync, incrementGlobalSequenceNumber, getGlobalSequenceCounter } from '../services/penomoranSuratService';

export interface LetterField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface LetterClassification {
  id: string;
  jenis: string;
  klasifikasi: string; // The abbreviation (e.g. SKD, SKU)
  kodeKlasifikasi: string;
  deskripsi?: string; // The numeric archive classification (e.g. "145", "400")
  noUrutTerakhir: number;
  isVisible?: boolean;
  isSaaSDisabled?: boolean;
  fields?: LetterField[]; // Dynamic fields for forms
}

export const INITIAL_CLASSIFICATIONS: LetterClassification[] = [
  { id: '1', jenis: 'SURAT UMUM', klasifikasi: 'SU', kodeKlasifikasi: '000', noUrutTerakhir: 5, isVisible: true },
  { id: '2', jenis: 'UNDANGAN', klasifikasi: 'UND', kodeKlasifikasi: '005', noUrutTerakhir: 12, isVisible: true },
  { id: '3', jenis: 'SK KEMATIAN', klasifikasi: 'SKM', kodeKlasifikasi: '474.2', noUrutTerakhir: 3, isVisible: true },
  { id: '4', jenis: 'SK AHLI WARIS', klasifikasi: 'SKAW', kodeKlasifikasi: '474', deskripsi: 'Surat Keterangan & Pernyataan Ahli Waris', noUrutTerakhir: 2, isVisible: true },
  { id: '5', jenis: 'SK DOMISILI PERORANGAN', klasifikasi: 'SDP', kodeKlasifikasi: '145', noUrutTerakhir: 18, isVisible: true },
  { id: '6', jenis: 'SURAT KETERANGAN UMUM', klasifikasi: 'SKUM', kodeKlasifikasi: '400', noUrutTerakhir: 4, isVisible: true },
  { 
    id: '7', jenis: 'SK NIKAH', klasifikasi: 'SKN', kodeKlasifikasi: '474', noUrutTerakhir: 8, isVisible: true,
    fields: [
      { id: 'nama_pasangan', label: 'Nama Calon Pasangan', type: 'text', required: true, placeholder: 'Contoh: Siti Aminah' },
      { id: 'nik_pasangan', label: 'NIK Calon Pasangan', type: 'text', required: true, placeholder: '16 Digit NIK' },
      { id: 'tanggal_nikah', label: 'Rencana Tanggal Menikah', type: 'date', required: true }
    ]
  },
  { 
    id: '8', jenis: 'SKTM', klasifikasi: 'SKTM', kodeKlasifikasi: '400', noUrutTerakhir: 15, isVisible: true,
    fields: [
      { id: 'pekerjaan_ortu', label: 'Pekerjaan Orang Tua / Wali', type: 'text', required: true },
      { id: 'penghasilan', label: 'Rata-rata Penghasilan Per Bulan', type: 'number', required: true, placeholder: 'Dalam Rupiah' },
      { id: 'tujuan', label: 'Tujuan Pembuatan SKTM', type: 'text', required: true, placeholder: 'Contoh: Keringanan Biaya Rumah Sakit / Sekolah' }
    ]
  },
  { id: '9', jenis: 'SK KEPEMILIKAN TANAH', klasifikasi: 'SKKT', kodeKlasifikasi: '593', noUrutTerakhir: 1, isVisible: true },
  { id: '10', jenis: 'SK BELUM MENIKAH', klasifikasi: 'SKBM', kodeKlasifikasi: '474', deskripsi: 'Surat Keterangan Belum Pernah Menikah', noUrutTerakhir: 6, isVisible: true },
  { id: '11', jenis: 'SK KEHILANGAN', klasifikasi: 'SKH', kodeKlasifikasi: '331', deskripsi: 'Surat Pengantar Keterangan Kehilangan', noUrutTerakhir: 9, isVisible: true },
  { id: '12', jenis: 'SURAT KETERANGAN PINDAH', klasifikasi: 'SKP', kodeKlasifikasi: '475', deskripsi: 'Surat Pengantar Keterangan Pindah Antar Daerah', noUrutTerakhir: 0, isVisible: true },
  { id: '14', jenis: 'SURAT REKOMENDASI', klasifikasi: 'SRI', kodeKlasifikasi: '100', deskripsi: 'Surat Rekomendasi / Pengantar Izin', noUrutTerakhir: 3, isVisible: true },
  { 
    id: '15', jenis: 'SK USAHA', klasifikasi: 'SKU', kodeKlasifikasi: '500', deskripsi: 'Surat Keterangan Tempat Usaha', noUrutTerakhir: 11, isVisible: true,
    fields: [
      { id: 'nama_usaha', label: 'Nama Usaha / Toko', type: 'text', required: true, placeholder: 'Contoh: Warung Berkah' },
      { id: 'jenis_usaha', label: 'Jenis Usaha', type: 'text', required: true, placeholder: 'Contoh: Kelontong / Pertanian' },
      { id: 'alamat_usaha', label: 'Alamat Usaha', type: 'textarea', required: true }
    ]
  },
  { id: '16', jenis: 'KEUANGAN', klasifikasi: 'KEU', kodeKlasifikasi: '900', deskripsi: 'Surat Keterangan Laporan Keuangan', noUrutTerakhir: 5, isVisible: true },
  { id: '17', jenis: 'SK LAHIR', klasifikasi: 'SKL', kodeKlasifikasi: '474.1', noUrutTerakhir: 4, isVisible: true },
  { id: '18', jenis: 'JUAL BELI TANAH', klasifikasi: 'JBT', kodeKlasifikasi: '593', noUrutTerakhir: 1, isVisible: true },
  { id: '19', jenis: 'SK PERAWAN', klasifikasi: 'PRW', kodeKlasifikasi: '400', noUrutTerakhir: 0, isVisible: true },
  { id: '20', jenis: 'SK NASAB', klasifikasi: 'NSB', kodeKlasifikasi: '400', noUrutTerakhir: 1, isVisible: true },
  { id: '21', jenis: 'SK KUASA', klasifikasi: 'KSA', kodeKlasifikasi: '100', noUrutTerakhir: 3, isVisible: true },
  { id: '22', jenis: 'SKKB', klasifikasi: 'SKKB', kodeKlasifikasi: '331', noUrutTerakhir: 2, isVisible: true },
  { id: '23', jenis: 'SURAT PENGANTAR', klasifikasi: 'PNG', kodeKlasifikasi: '400', noUrutTerakhir: 14, isVisible: true },
  { id: '24', jenis: 'SURAT PENGUNDURAN DIRI', klasifikasi: 'SPND', kodeKlasifikasi: '800', noUrutTerakhir: 1, isVisible: true },
  { id: '25', jenis: 'SURAT PERJANJIAN', klasifikasi: 'SPJN', kodeKlasifikasi: '100', noUrutTerakhir: 2, isVisible: true },
  { id: '26', jenis: 'SURAT JUAL BELI TANAH', klasifikasi: 'SJBT', kodeKlasifikasi: '593', noUrutTerakhir: 0, isVisible: true },
  { id: '27', jenis: 'SURAT KUASA', klasifikasi: 'SKS', kodeKlasifikasi: '100', noUrutTerakhir: 2, isVisible: true },
  { id: '28', jenis: 'SK PENGHASILAN', klasifikasi: 'SKPH', kodeKlasifikasi: '400', noUrutTerakhir: 4, isVisible: true },
  { id: '29', jenis: 'SURAT PENGURUSAN TASPEN', klasifikasi: 'SPT', kodeKlasifikasi: '474', noUrutTerakhir: 0, isVisible: true },
  { id: '30', jenis: 'SK DOMISILI USAHA', klasifikasi: 'SDU', kodeKlasifikasi: '500', noUrutTerakhir: 0, isVisible: true, deskripsi: 'Surat Keterangan Domisili Usaha' },
  { id: '31', jenis: 'SURAT PERJALANAN DINAS', klasifikasi: 'SPPD', kodeKlasifikasi: '094', deskripsi: 'Surat Perintah & Perjalanan Dinas', noUrutTerakhir: 0, isVisible: true }
];

export function getSaaSTemplates(): LetterClassification[] {
  const stored = localStorage.getItem('saas_global_letter_catalog');
  if (stored) {
    const parsed = JSON.parse(stored) as LetterClassification[];
    let updated = false;
    
    // Merge any missing defaults that might have been added in newer versions
    INITIAL_CLASSIFICATIONS.forEach(init => {
      const idx = parsed.findIndex(p => p.id === init.id);
      if (idx === -1) {
        parsed.push(init);
        updated = true;
      } else if (init.id === '5' && (parsed[idx].klasifikasi !== 'SDP' || parsed[idx].jenis !== 'SK DOMISILI PERORANGAN')) {
        // Migrate legacy SKD template to SDP (SK Domisili Perorangan) for consistency
        parsed[idx].klasifikasi = 'SDP';
        parsed[idx].jenis = 'SK DOMISILI PERORANGAN';
        updated = true;
      }
    });
    
    if (updated) {
      localStorage.setItem('saas_global_letter_catalog', JSON.stringify(parsed));
    }
    return parsed;
  }
  return INITIAL_CLASSIFICATIONS;
}

export function getGlobalSequenceNumber(): number {
  const globalSeq = getGlobalSequenceCounter();
  if (globalSeq > 0) return globalSeq;

  // Let's find the max last number of any classification
  const storedClass = localStorage.getItem('letter_classifications');
  let maxVal = 56; // default fallback matching the screenshot
  if (storedClass) {
    try {
      const parsed = JSON.parse(storedClass) as any[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        maxVal = parsed.reduce((max, c) => Math.max(max, Number(c.noUrutTerakhir) || 0), 0);
      }
    } catch (e) {}
  }
  return maxVal;
}

export function saveGlobalSequenceNumber(num: number) {
  // Delegate ke helper penomoranSuratService yang sudah menulis key per-tenant
  // agar counter tidak tercampur antar desa di browser yang sama.
  localStorage.setItem('global_letter_sequence_number', String(num));

  // Also keep all classifications synced with this global number
  const stored = localStorage.getItem('letter_classifications');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as any[];
      if (Array.isArray(parsed)) {
        const updated = parsed.map(c => ({ ...c, noUrutTerakhir: num }));
        localStorage.setItem('letter_classifications', JSON.stringify(updated));
      }
    } catch (e) {}
  }
}

export function getLetterClassifications(): LetterClassification[] {
  const saasTemplates = getSaaSTemplates();
  const stored = localStorage.getItem('letter_classifications');
  const globalSeq = getGlobalSequenceNumber();
  
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as any[];
      let mapped = parsed.map(item => {
        return {
          ...item,
          noUrutTerakhir: globalSeq
        } as LetterClassification;
      });
      
      let updated = false;

      // Merge new templates from SaaS
      saasTemplates.forEach(saasTpl => {
        const hasId = mapped.some(item => item.id === saasTpl.id);
        if (!hasId) {
          mapped.push({...saasTpl, isVisible: true, noUrutTerakhir: globalSeq});
          updated = true;
        }
      });
      
      // Merge updates from SaaS (jenis, klasifikasi, kodeKlasifikasi, isVisible)
      mapped = mapped.map(item => {
        const saasMatch = saasTemplates.find(s => s.id === item.id || s.klasifikasi === item.klasifikasi);
        if (saasMatch) {
          // Sync visibility: SaaS enabled = force visible; SaaS disabled = force hidden; otherwise keep tenant's choice
          const isSaaSDisabled = saasMatch.isVisible === false;
          const newIsVisible = saasMatch.isVisible === true ? true : isSaaSDisabled ? false : item.isVisible;

          if (item.jenis !== saasMatch.jenis || 
              item.klasifikasi !== saasMatch.klasifikasi || 
              item.kodeKlasifikasi !== saasMatch.kodeKlasifikasi ||
              item.isSaaSDisabled !== isSaaSDisabled ||
              item.isVisible !== newIsVisible) {
            updated = true;
            return {
              ...item,
              jenis: saasMatch.jenis,
              klasifikasi: saasMatch.klasifikasi,
              kodeKlasifikasi: saasMatch.kodeKlasifikasi,
              isVisible: newIsVisible,
              isSaaSDisabled: isSaaSDisabled,
              noUrutTerakhir: globalSeq
            };
          }
        }
        return item;
      });
      
      // Clean up templates that were deleted by SaaS
      const mappedCount = mapped.length;
      mapped = mapped.filter(item => saasTemplates.some(s => s.id === item.id));
      
      // Auto-deduplicate village classifications by klasifikasi to fix legacy duplicates
      const uniqueMap = new Map();
      mapped.forEach(item => {
        if (!uniqueMap.has(item.klasifikasi)) {
          uniqueMap.set(item.klasifikasi, item);
        }
      });
      const deduplicated = Array.from(uniqueMap.values());
      
      if (deduplicated.length !== mappedCount) updated = true;

      if (updated) {
        localStorage.setItem('letter_classifications', JSON.stringify(deduplicated));
      }
      return deduplicated;
    } catch (e) {
      // fallback
    }
  } 
  
  // If no village letter_classifications exist, initialize with SaaS templates
  const initialForVillage = saasTemplates.map(t => ({...t, isVisible: true, noUrutTerakhir: globalSeq}));
  localStorage.setItem('letter_classifications', JSON.stringify(initialForVillage));
  return initialForVillage;
}

export function saveLetterClassifications(classifications: LetterClassification[]) {
  // Optimistic UI update
  const currentGlobal = getGlobalSequenceNumber();
  const changedClass = classifications.find(c => c.noUrutTerakhir !== currentGlobal);
  if (changedClass) {
    localStorage.setItem('global_letter_sequence_number', String(changedClass.noUrutTerakhir));
    classifications = classifications.map(c => ({ ...c, noUrutTerakhir: changedClass.noUrutTerakhir }));
  }
  localStorage.setItem('letter_classifications', JSON.stringify(classifications));
  
  // Background sync to Supabase
  setTimeout(async () => {
    try {
      const tenantId = await resolveCurrentTenant();
      
      if (tenantId) {
        const payload = classifications.map(c => ({
          id: c.id,
          tenant_id: tenantId,
          jenis: c.jenis,
          klasifikasi: c.klasifikasi,
          kode_klasifikasi: c.kodeKlasifikasi,
          deskripsi: c.deskripsi,
          no_urut_terakhir: c.noUrutTerakhir,
          is_visible: c.isVisible,
          is_saas_disabled: c.isSaaSDisabled,
          fields: c.fields || null,
          updated_at: new Date().toISOString()
        }));
        
        await supabase.from('letter_classifications').upsert(payload, { onConflict: 'id' });
      }
    } catch (e) {
      console.error('Failed to sync letter classifications to Supabase:', e);
    }
  }, 10);
}

export function getNextSequenceNumber(klasifikasi: string): number {
  return getNextNomorSuratSync(klasifikasi);
}

// --- Penentuan nomor urut berbasis DB aktif dengan SMART GAP-FILLING ---
// Nomor berikutnya = nomor urut terkecil yang belum dipakai. Jika ada celah
// (mis. 003 dihapus/dibatalkan), celah terkecil otomatis diisi. Jika semua
// lengkap, lanjut ke MAX + 1. Didelegasikan ke layanan terpusat
// `penomoranSuratService` agar konsisten di seluruh modul pembuat surat.

/**
 * Ambil nomor urut tertinggi yang masih aktif (belum dibatalkan / terhapus)
 * untuk klasifikasi & tahun tertentu. Mengembalikan 0 jika query gagal.
 */
export async function getMaxActiveSequenceFromDb(klasifikasi: string, year?: number): Promise<number> {
  return getMaxActiveNomorUrut(klasifikasi, year);
}

/**
 * Nomor urut berikutnya = nomor urut terkecil yang belum dipakai (gap-filling).
 * Jika tidak ada surat aktif -> 1. Jika query gagal -> fallback counter lama.
 */
export async function getNextSequenceNumberAsync(klasifikasi: string, year?: number): Promise<number> {
  return getNextNomorSurat(klasifikasi, year);
}

/** Versi async dari generateLetterNumber untuk pembuatan nomor baru otomatis. */
export async function generateLetterNumberAsync(klasifikasi: string, kodeKlasifikasi: string, customDate?: Date): Promise<string> {
  const year = customDate ? customDate.getFullYear() : new Date().getFullYear();
  const nextNo = await getNextSequenceNumberAsync(klasifikasi, year);
  return generateLetterNumber(klasifikasi, kodeKlasifikasi, nextNo, customDate);
}

export function incrementSequenceNumber(klasifikasi: string) {
  void incrementGlobalSequenceNumber(klasifikasi);
}

export function generateLetterNumber(klasifikasi: string, kodeKlasifikasi: string, nextNoVal?: number | string, customDate?: Date): string {
  const formatTemplate = localStorage.getItem('surat_format') || DEFAULT_SURAT_FORMAT;
  
  const date = customDate || new Date();
  const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const romanMonth = romanMonths[date.getMonth()];
  const numericMonth = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const year2D = String(year).slice(-2);
  
  const villageName = localStorage.getItem('kop_desa') || '';
  const kecamatan = localStorage.getItem('kop_kecamatan') || '';
  const kabupaten = localStorage.getItem('kop_kabupaten') || '';
  
  const getDesaInitial = (name: string) => {
    const words = name.replace(/desa|kelurahan/gi, '').trim().split(/\s+/);
    if (words.length >= 2) {
      return words.map(w => w[0]).join('').toUpperCase();
    } else if (words.length === 1 && words[0].length > 0) {
      return words[0].substring(0, 3).toUpperCase();
    }
    return 'DS';
  };
  const desaInitial = getDesaInitial(villageName);

  const finalNoSeq = nextNoVal !== undefined ? nextNoVal : getNextSequenceNumber(klasifikasi);
  
  // Jika nextNoVal adalah string (seperti 055.1), jangan di-pad 0 di depannya jika sudah ada.
  // Tapi untuk amannya, kita padStart(3, '0') asalkan bukan custom string yang kompleks
  let nextNoStr = String(finalNoSeq);
  if (typeof finalNoSeq === 'number' || !nextNoStr.includes('.')) {
    nextNoStr = nextNoStr.padStart(3, '0');
  } else if (nextNoStr.includes('.') && nextNoStr.split('.')[0].length < 3) {
    const parts = nextNoStr.split('.');
    nextNoStr = `${parts[0].padStart(3, '0')}.${parts[1]}`;
  }

  // ATURAN UNIVERSAL: seluruh segmen dipaksa FULL UPPERCASE via central helper,
  // berlaku untuk SEMUA jenis & format surat tanpa pengondisian per jenis.
  const cleanKode = (kodeKlasifikasi || '140').trim().toUpperCase();
  const cleanDesa = 'WHI';
  const cleanSurat = (klasifikasi || '').trim().toUpperCase();

  // Format standar → gunakan central helper sebagai formatter tunggal.
  if (formatTemplate === DEFAULT_SURAT_FORMAT) {
    return formatNomorSurat({
      kodeKlasifikasi: cleanKode,
      nomorUrut: nextNoStr,
      singkatanDesa: cleanDesa,
      singkatanSurat: cleanSurat,
      tahun: year,
    });
  }

  // Format kustom → tetap paksa FULL UPPERCASE untuk seluruh segmen.
  const raw = formatTemplate
    .replace(/\[NO KODE SURAT\]/g, cleanKode)
    .replace(/\[KODE KLASIFIKASI\]/g, cleanKode)
    .replace(/\[NO URUT SURAT\]/g, nextNoStr)
    .replace(/\[NO\]/g, nextNoStr)
    .replace(/\[KODE\]/g, cleanSurat)
    .replace(/\[SINGKATAN SURAT\]/g, cleanSurat)
    .replace(/\[BULAN\]/g, romanMonth)
    .replace(/\[BULAN_ANGKA\]/g, numericMonth)
    .replace(/\[TAHUN\]/g, String(year))
    .replace(/\[TAHUN_2D\]/g, year2D)
    .replace(/\[NAMA_DESA\]/g, villageName.replace(/desa\s+/gi, '').toUpperCase())
    .replace(/\[KECAMATAN\]/g, kecamatan.toUpperCase())
    .replace(/\[KABUPATEN\]/g, kabupaten.toUpperCase())
    .replace(/\[DESA\]/g, desaInitial.toUpperCase())
    .replace(/WHI-/g, `${cleanDesa}-`);
  
  // Uppercase seluruh nomor surat (angka, /, -, titik tetap dipertahankan sebagai format).
  // Ini memastikan bagian hardcode di template (mis. 'WHI') ikut jadi kapital.
  return raw.toUpperCase();
}


