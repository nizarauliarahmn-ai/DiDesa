const fs = require('fs');

let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const oldKlasifikasi = `    const getKlasifikasiFromSurat = (s: LetterHistory) => {
      const typeLower = s.jenis.toLowerCase();
      if (typeLower.includes('kematian') || s.nomor.includes('/SKM/')) return 'SKM';
      if (typeLower.includes('ahli waris') || s.nomor.includes('/SKAW/')) return 'SKAW';
      if (typeLower.includes('tidak mampu') || typeLower.includes('sktm') || s.nomor.includes('/SKTM/')) return 'SKTM';
      if (typeLower.includes('usaha') || s.nomor.includes('/SKU/')) return 'SKU';
      if (typeLower.includes('penghasilan') || s.nomor.includes('/SKPH/')) return 'SKPH';
      if (typeLower.includes('belum menikah') || typeLower.includes('belum kawin') || s.nomor.includes('/SKBM/')) return 'SKBM';
      if (typeLower.includes('kelahiran') || typeLower.includes('lahir') || s.nomor.includes('/SKL/')) return 'SKL';
      if (typeLower.includes('pindah') || s.nomor.includes('/SPH/')) return 'SPH';
      if (typeLower.includes('kehilangan') || s.nomor.includes('/SKH/')) return 'SKH';
      if (typeLower.includes('undangan') || s.nomor.includes('/UND/')) return 'UND';
      if (s.nomor.includes('/SU/') || typeLower.includes('umum') || typeLower.includes('dinas')) return 'SU';
      return '';
    };`;

const newKlasifikasi = `    const getKlasifikasiFromSurat = (s: LetterHistory) => {
      const typeLower = s.jenis.toLowerCase();
      if (typeLower.includes('kematian') || typeLower === 'skm' || s.nomor.includes('/SKM/')) return 'SKM';
      if (typeLower.includes('ahli waris') || typeLower === 'skaw' || s.nomor.includes('/SKAW/')) return 'SKAW';
      if (typeLower.includes('tidak mampu') || typeLower.includes('sktm') || s.nomor.includes('/SKTM/')) return 'SKTM';
      if (typeLower.includes('usaha') || typeLower === 'sku' || s.nomor.includes('/SKU/')) return 'SKU';
      if (typeLower.includes('penghasilan') || typeLower === 'skph' || s.nomor.includes('/SKPH/')) return 'SKPH';
      if (typeLower.includes('belum menikah') || typeLower.includes('belum kawin') || typeLower === 'skbm' || s.nomor.includes('/SKBM/')) return 'SKBM';
      if (typeLower.includes('kelahiran') || typeLower.includes('lahir') || typeLower === 'skl' || s.nomor.includes('/SKL/')) return 'SKL';
      if (typeLower.includes('pindah') || typeLower === 'sph' || s.nomor.includes('/SPH/')) return 'SPH';
      if (typeLower.includes('kehilangan') || typeLower === 'skh' || s.nomor.includes('/SKH/')) return 'SKH';
      if (typeLower.includes('undangan') || typeLower === 'und' || s.nomor.includes('/UND/')) return 'UND';
      if (typeLower === 'su' || s.nomor.includes('/SU/') || typeLower.includes('umum') || typeLower.includes('dinas')) return 'SU';
      if (typeLower.includes('domisili') || typeLower === 'skd' || s.nomor.includes('/SKD/')) return 'SKD';
      if (typeLower.includes('pengantar') || typeLower === 'skp' || s.nomor.includes('/SKP/')) return 'SKP';
      return typeLower.toUpperCase();
    };`;

code = code.replace(oldKlasifikasi, newKlasifikasi);

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Patched Klasifikasi');
