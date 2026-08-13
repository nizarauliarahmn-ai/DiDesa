import { createWorker } from 'tesseract.js';

// ============================================================================
// Util OCR KTP (Tesseract.js + Canvas Preprocessing) - tanpa biaya API eksternal
// ============================================================================

export interface KtpOcrResult {
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan' | '';
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  alamat: string;
  rtRw: string;
  kelDesa: string;
  kecamatan: string;
  raw: string;
}

export const emptyKtpResult = (): KtpOcrResult => ({
  nik: '',
  nama: '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: '',
  agama: '',
  statusPerkawinan: '',
  pekerjaan: '',
  alamat: '',
  rtRw: '',
  kelDesa: '',
  kecamatan: '',
  raw: ''
});

// Normalisasi 16 digit NIK dari hasil OCR (bisa terpisah spasi / baris)
export const extractNik = (text: string): string => {
  const joined = text.replace(/[^\d]/g, '');
  const matches = joined.match(/\d{16}/g);
  if (matches && matches.length) return matches[0];
  // Fallback: gabung 2 kelompok yang total 16 digit (contoh: "6307 0123..." terpotong)
  const tokens = text.split(/\s+/);
  let buf = '';
  for (const tok of tokens) {
    const clean = tok.replace(/\D/g, '');
    buf += clean;
    if (buf.length >= 16) {
      const hit = buf.replace(/\D/g, '').match(/\d{16}/);
      if (hit) return hit[0];
      buf = buf.slice(buf.length - 8);
    }
  }
  return '';
};

// Preprocessing: grayscale + contrast + threshold untuk hasil OCR lebih tajam
export const preprocessImage = (file: File | Blob): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let w = img.width;
      let h = img.height;
      if (Math.max(w, h) > MAX) {
        const s = MAX / Math.max(w, h);
        w = Math.round(w * s);
        h = Math.round(h * s);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas tidak didukung')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;
      // Grayscale + kontras sederhana
      for (let i = 0; i < d.length; i += 4) {
        const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
        const contrasted = (gray - 128) * 1.35 + 128;
        const v = Math.min(255, Math.max(0, contrasted));
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal memuat gambar')); };
    img.src = url;
  });
};

const cleanField = (raw: string): string => {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/[|_=+*#~`"']/g, '')
    .replace(/[.,;:\-]{2,}/g, ' ')
    .trim();
};

const parseTanggalLahir = (raw: string): string => {
  // Format umum: 12-06-1985 / 12/06/1985 / 12 Juni 1985
  const m = raw.match(/(\d{1,2})[\-\/\.\s]+(\d{1,2})[\-\/\.\s]+(\d{4})/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    return `${day}-${month}-${m[3]}`;
  }
  const idn = raw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (idn) return `${idn[1].padStart(2, '0')}-${idn[2]}-${idn[3]}`;
  return raw.trim();
};

/**
 * Jalankan OCR pada file KTP (gambar) dan parsing field-field penting.
 */
export const runKtpOcr = async (file: File | Blob, onProgress?: (pct: number) => void): Promise<KtpOcrResult> => {
  const worker = await createWorker('ind');
  try {
    const canvas = await preprocessImage(file);
    onProgress?.(0.35);
    const { data } = await worker.recognize(canvas);
    onProgress?.(0.9);
    const text = data.text || '';
    return parseKtpText(text);
  } finally {
    onProgress?.(1);
    await worker.terminate();
  }
};

export const parseKtpText = (text: string): KtpOcrResult => {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const full = lines.join(' ');
  const result = emptyKtpResult();
  result.raw = text;

  // NIK
  result.nik = extractNik(full);

  // Nama (setelah label "Nama")
  const namaMatch = full.match(/nama\s*[:\-]?\s*([A-Za-z'\.\s]+?)(?=\s*(tempat|ttl|lahir|jenis|j\.\s*kel|jk|alamat|agama|status|pekerjaan))/i);
  if (namaMatch) result.nama = cleanField(namaMatch[1]);

  // Tempat / Tanggal Lahir
  const ttlMatch = full.match(/(?:tempat\/?\s*tgl|ttl|lahir|tempat,\s*tgl)[:\-\s]*([A-Za-z]+)\s*,?\s*(\d{1,2}[\-\/\.\s]+\d{1,2}[\-\/\.\s]+\d{4})/i);
  if (ttlMatch) {
    result.tempatLahir = cleanField(ttlMatch[1]);
    result.tanggalLahir = parseTanggalLahir(ttlMatch[2]);
  }

  // Jenis Kelamin
  if (/laki|perempuan/i.test(full)) {
    const jk = full.match(/jenis\s*kelamin[:\-\s]*([A-Za-z\s]+?)(?=\s*(alamat|agama|status|pekerjaan))/i)
      || full.match(/(laki[\-\s]*laki|perempuan)/i);
    result.jenisKelamin = jk ? (jk[0].toLowerCase().includes('laki') ? 'Laki-laki' : 'Perempuan') : '';
  }

  // Alamat (RT/RW, kel/desa, kecamatan)
  const alamatMatch = full.match(/alamat[:\-\s]*(.+?)(?=\s*(rt\/rw|rt\s*\d|kel|desa|kecamatan|agama|status))/i);
  if (alamatMatch) result.alamat = cleanField(alamatMatch[1]);

  const rtRwMatch = full.match(/rt\s*[\/\-\s]*rw[:\-\s]*(\d+\s*\/\s*\d+)/i) || full.match(/(\d{1,3}\s*\/\s*\d{1,3})/i);
  if (rtRwMatch) result.rtRw = rtRwMatch[1].replace(/\s+/g, '');

  const kelDesaMatch = full.match(/kel\s*\/?\s*desa[:\-\s]*([A-Za-z\s]+?)(?=\s*(kecamatan|agama|status|pekerjaan))/i);
  if (kelDesaMatch) result.kelDesa = cleanField(kelDesaMatch[1]);

  const kecMatch = full.match(/kecamatan[:\-\s]*([A-Za-z\s]+?)(?=\s*(agama|status|pekerjaan|kewarganegaraan))/i);
  if (kecMatch) result.kecamatan = cleanField(kecMatch[1]);

  // Agama
  const agamaMatch = full.match(/agama[:\-\s]*([A-Za-z\s]+?)(?=\s*(status|pekerjaan|kewarganegaraan))/i);
  if (agamaMatch) result.agama = cleanField(agamaMatch[1]);

  // Status Perkawinan
  const statusMatch = full.match(/status\s*perkawinan[:\-\s]*([A-Za-z\s]+?)(?=\s*(pekerjaan|kewarganegaraan))/i);
  if (statusMatch) result.statusPerkawinan = cleanField(statusMatch[1]);

  // Pekerjaan
  const jobMatch = full.match(/pekerjaan[:\-\s]*([A-Za-z\s]+?)(?=\s*(kewarganegaraan|berlaku))/i);
  if (jobMatch) result.pekerjaan = cleanField(jobMatch[1]);

  return result;
};

/**
 * Cek apakah hasil OCR cukup valid untuk diproses (mengandung NIK 16 digit).
 */
export const isKtpResultValid = (r: KtpOcrResult): boolean => {
  return /^\d{16}$/.test(r.nik);
};
