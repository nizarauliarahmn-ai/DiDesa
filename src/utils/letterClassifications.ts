export interface LetterClassification {
  id: string;
  jenis: string;
  klasifikasi: string; // The abbreviation (e.g. SKD, SKU)
  kodeKlasifikasi: string;
    deskripsi?: string; // The numeric archive classification (e.g. "145", "400")
  noUrutTerakhir: number;
  isVisible?: boolean;
  isSaaSDisabled?: boolean;
}

export const INITIAL_CLASSIFICATIONS: LetterClassification[] = [
  { id: '1', jenis: 'SURAT UMUM', klasifikasi: 'SU', kodeKlasifikasi: '000', noUrutTerakhir: 5, isVisible: true },
  { id: '2', jenis: 'UNDANGAN', klasifikasi: 'UND', kodeKlasifikasi: '005', noUrutTerakhir: 12, isVisible: true },
  { id: '3', jenis: 'SK KEMATIAN', klasifikasi: 'SKM', kodeKlasifikasi: '474.2', noUrutTerakhir: 3, isVisible: true },
  { id: '4', jenis: 'SK AHLI WARIS', klasifikasi: 'SKAW', kodeKlasifikasi: '474', deskripsi: 'Surat Keterangan & Pernyataan Ahli Waris', noUrutTerakhir: 2, isVisible: true },
  { id: '5', jenis: 'SK DOMISILI PERORANGAN', klasifikasi: 'SDP', kodeKlasifikasi: '145', noUrutTerakhir: 18, isVisible: true },
  { id: '6', jenis: 'SURAT KETERANGAN UMUM', klasifikasi: 'SKUM', kodeKlasifikasi: '400', noUrutTerakhir: 4, isVisible: true },
  { id: '7', jenis: 'SK NIKAH', klasifikasi: 'SKN', kodeKlasifikasi: '474', noUrutTerakhir: 8, isVisible: true },
  { id: '8', jenis: 'SKTM', klasifikasi: 'SKTM', kodeKlasifikasi: '400', noUrutTerakhir: 15, isVisible: true },
  { id: '9', jenis: 'SK KEPEMILIKAN TANAH', klasifikasi: 'SKKT', kodeKlasifikasi: '593', noUrutTerakhir: 1, isVisible: true },
  { id: '10', jenis: 'SK BELUM MENIKAH', klasifikasi: 'SKBM', kodeKlasifikasi: '474', deskripsi: 'Surat Keterangan Belum Pernah Menikah', noUrutTerakhir: 6, isVisible: true },
  { id: '11', jenis: 'SK KEHILANGAN', klasifikasi: 'SKH', kodeKlasifikasi: '331', deskripsi: 'Surat Pengantar Keterangan Kehilangan', noUrutTerakhir: 9, isVisible: true },
  { id: '12', jenis: 'SURAT KETERANGAN PINDAH', klasifikasi: 'SKP', kodeKlasifikasi: '475', deskripsi: 'Surat Pengantar Keterangan Pindah Antar Daerah', noUrutTerakhir: 0, isVisible: true },
  { id: '14', jenis: 'SURAT REKOMENDASI', klasifikasi: 'SRI', kodeKlasifikasi: '100', deskripsi: 'Surat Rekomendasi / Pengantar Izin', noUrutTerakhir: 3, isVisible: true },
  { id: '15', jenis: 'SK USAHA', klasifikasi: 'SKU', kodeKlasifikasi: '500', deskripsi: 'Surat Keterangan Tempat Usaha', noUrutTerakhir: 11, isVisible: true },
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
  const stored = localStorage.getItem('global_letter_sequence_number');
  if (stored !== null) {
    return parseInt(stored, 10);
  }
  
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
  localStorage.setItem('global_letter_sequence_number', String(maxVal));
  return maxVal;
}

export function saveGlobalSequenceNumber(num: number) {
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
        const saasMatch = saasTemplates.find(s => s.id === item.id);
        if (saasMatch) {
          const isSaaSDisabled = saasMatch.isVisible === false;
          let newIsVisible = item.isVisible;
          if (isSaaSDisabled) {
            newIsVisible = false;
          }

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
  // Check if any classification has a different noUrutTerakhir than the current global sequence
  const currentGlobal = getGlobalSequenceNumber();
  const changedClass = classifications.find(c => c.noUrutTerakhir !== currentGlobal);
  if (changedClass) {
    // A classification's noUrutTerakhir was manually updated or set in the modal
    localStorage.setItem('global_letter_sequence_number', String(changedClass.noUrutTerakhir));
    // Make sure all classifications in this list use the same updated value
    classifications = classifications.map(c => ({ ...c, noUrutTerakhir: changedClass.noUrutTerakhir }));
  }
  localStorage.setItem('letter_classifications', JSON.stringify(classifications));
}

export function getNextSequenceNumber(klasifikasi: string): number {
  const autoReset = localStorage.getItem('surat_autoreset') !== 'false';
  const currentYear = new Date().getFullYear();
  const lastYear = localStorage.getItem(`last_year_global`);

  if (autoReset && lastYear && parseInt(lastYear) !== currentYear) {
    return 1;
  }
  
  return getGlobalSequenceNumber() + 1;
}

export function incrementSequenceNumber(klasifikasi: string) {
  const currentYear = new Date().getFullYear();
  const lastYear = localStorage.getItem(`last_year_global`);
  
  const autoReset = localStorage.getItem('surat_autoreset') !== 'false';
  let nextVal = getGlobalSequenceNumber() + 1;
  
  if (autoReset && lastYear && parseInt(lastYear) !== currentYear) {
    nextVal = 1;
  }
  
  localStorage.setItem(`last_year_global`, String(currentYear));
  saveGlobalSequenceNumber(nextVal);
  
  // Dispatch event to refresh UI
  window.dispatchEvent(new Event('letter_classifications_updated'));
}

export function generateLetterNumber(klasifikasi: string, kodeKlasifikasi: string, nextNoVal?: number): string {
  const formatTemplate = localStorage.getItem('surat_format') || '[NO KODE SURAT]/[NO URUT SURAT]/WHi-[KODE]/[TAHUN]';
  
  const date = new Date();
  const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const romanMonth = romanMonths[date.getMonth()];
  const numericMonth = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const year2D = String(year).slice(-2);
  
  const villageName = localStorage.getItem('kop_desa') || 'Desa Sukamakmur';
  const kecamatan = localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur';
  const kabupaten = localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan';
  
  const getDesaInitial = (name: string) => {
    if (name.toLowerCase().includes('Sukamakmur')) return 'WHi';
    if (name.toLowerCase().includes('sukamaju')) return 'DS-SKM';
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
  const nextNoStr = String(finalNoSeq).padStart(3, '0');

  return formatTemplate
    .replace(/\[NO KODE SURAT\]/g, kodeKlasifikasi || '140')
    .replace(/\[KODE KLASIFIKASI\]/g, kodeKlasifikasi || '140')
    .replace(/\[NO URUT SURAT\]/g, nextNoStr)
    .replace(/\[NO\]/g, nextNoStr)
    .replace(/\[KODE\]/g, klasifikasi)
    .replace(/\[SINGKATAN SURAT\]/g, klasifikasi)
    .replace(/\[BULAN\]/g, romanMonth)
    .replace(/\[BULAN_ANGKA\]/g, numericMonth)
    .replace(/\[TAHUN\]/g, String(year))
    .replace(/\[TAHUN_2D\]/g, year2D)
    .replace(/\[NAMA_DESA\]/g, villageName.replace(/desa\s+/gi, ''))
    .replace(/\[KECAMATAN\]/g, kecamatan)
    .replace(/\[KABUPATEN\]/g, kabupaten)
    .replace(/\[DESA\]/g, desaInitial);
}


