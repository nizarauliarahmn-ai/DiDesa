export interface LetterHistory {
  id: string;
  nomor: string;
  jenis: string;
  nik: string;
  nama: string;
  tanggal: string;
  keperluan: string;
  status: 'Selesai' | 'Proses' | 'Dibatalkan';
  data?: any;
}

const INITIAL_HISTORY: LetterHistory[] = [
  {
    id: 'h-1',
    nomor: '145/001/DS-SKM/V/2024',
    jenis: 'Surat Keterangan Domisili',
    nik: '3201020405060001', // Ahmad Bukhori's NIK, or fallback matching Budi Santoso
    nama: 'Budi Santoso',
    tanggal: '24 Mei 2024',
    keperluan: 'Persyaratan Administrasi Pernikahan',
    status: 'Selesai'
  },
  {
    id: 'h-2',
    nomor: '400/002/DS-SKM/V/2024',
    jenis: 'SKTM',
    nik: '3201020405060002', // Siti Nurhaliza / Siti Aminah
    nama: 'Siti Aminah',
    tanggal: '23 Mei 2024',
    keperluan: 'Keringanan Biaya Sekolah Anak',
    status: 'Selesai'
  },
  {
    id: 'h-3',
    nomor: '500/003/DS-SKM/V/2024',
    jenis: 'Surat Keterangan Usaha',
    nik: '3201020405060003', // Deddy Setiawan / Ahmad Faisal
    nama: 'Ahmad Faisal',
    tanggal: '22 Mei 2024',
    keperluan: 'Pengajuan Kredit Usaha Rakyat (KUR)',
    status: 'Selesai'
  },
  {
    id: 'h-4',
    nomor: '145/004/DS-SKM/V/2024',
    jenis: 'Surat Keterangan Domisili',
    nik: '3201020405060004', // Rina Wulandari / Ratna Sari
    nama: 'Ratna Sari',
    tanggal: '21 Mei 2024',
    keperluan: 'Persyaratan Pembukaan Rekening Bank',
    status: 'Selesai'
  }
];

export function getLetterHistory(): LetterHistory[] {
  const stored = localStorage.getItem('letter_history');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // fallback
    }
  } else {
    // Save initial history so it persists
    localStorage.setItem('letter_history', JSON.stringify(INITIAL_HISTORY));
  }
  return INITIAL_HISTORY;
}

export function saveLetterHistory(history: LetterHistory[]) {
  localStorage.setItem('letter_history', JSON.stringify(history));
}

export function addLetterHistory(letter: Omit<LetterHistory, 'id'>): LetterHistory {
  const history = getLetterHistory();
  const newLetter: LetterHistory = {
    ...letter,
    id: `letter-${Date.now()}`
  };
  const updated = [newLetter, ...history];
  saveLetterHistory(updated);
  return newLetter;
}

export function getResidentLetters(nik: string, name: string): LetterHistory[] {
  const history = getLetterHistory();
  return history.filter(item => 
    (item.nik && item.nik === nik) || 
    (item.nama && item.nama.toLowerCase() === name.toLowerCase())
  );
}

export function deleteLetterHistory(id: string): LetterHistory[] {
  const history = getLetterHistory();
  const updated = history.filter(item => item.id !== id);
  saveLetterHistory(updated);
  return updated;
}

export function updateLetterHistory(id: string, updatedFields: Partial<LetterHistory>): LetterHistory[] {
  const history = getLetterHistory();
  const updated = history.map(item => {
    if (item.id === id) {
      return { ...item, ...updatedFields };
    }
    return item;
  });
  saveLetterHistory(updated);
  return updated;
}

export function cancelLetterHistory(id: string): LetterHistory[] {
  return updateLetterHistory(id, { status: 'Dibatalkan' });
}

export function getLetterFullData(letter: LetterHistory): any {
  if (letter.data) return letter.data;
  
  // Fallback to searching local riwayat
  const typeMapping: Record<string, string> = {
    'SKP': 'riwayat_surat_skp',
    'SKD': 'riwayat_surat_sktm',
    'SKU': 'riwayat_surat_sku',
    'SKM': 'riwayat_surat_skm',
    'SKTM': 'riwayat_surat_sktm',
    'SPH': 'riwayat_surat_sph',
    'SK PENGHASILAN': 'riwayat_surat_skph',
    'Surat Pengantar Nikah': 'riwayat_surat_nikah'
  };

  const key = typeMapping[letter.jenis];
  if (key) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const found = parsed.find(item => item.nomor === letter.nomor);
          if (found && found.data) {
            return found.data;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Fallback
  return {
    nomorSurat: letter.nomor,
    nama: letter.nama,
    nik: letter.nik,
    keperluan: letter.keperluan
  };
}
