const fs = require('fs');

let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const oldVars = `    const name = residentObj?.name || surat.nama;
    const nik = residentObj?.nik || surat.nik || '3275010101700001';
    const birthPlace = residentObj?.birthPlace || 'Wasah Hilir';
    const birthDate = residentObj?.birthDate || '12-06-1985';
    const gender = residentObj?.gender || 'Laki-laki';
    const address = residentObj?.address || 'Dusun Krajan';
    const rtRw = residentObj?.rt_rw ? \`RT/RW \${residentObj.rt_rw}\` : 'RT 02/01';`;

const newVars = `    const sd = surat.data || {};
    const name = sd.nama || residentObj?.name || surat.nama;
    const nik = sd.nik || residentObj?.nik || surat.nik || '-';
    const birthPlace = sd.tempatLahir || residentObj?.birthPlace || '-';
    const birthDate = sd.tanggalLahir || residentObj?.birthDate || '-';
    const gender = sd.jenisKelamin || residentObj?.gender || '-';
    const address = sd.alamat || residentObj?.address || '-';
    const rtRw = (sd.rt && sd.rw) ? \`RT.\${sd.rt} RW.\${sd.rw}\` : (residentObj?.rt_rw ? \`RT/RW \${residentObj.rt_rw}\` : '-');`;

code = code.replace(oldVars, newVars);

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Patched dashboard renderLetterContent');
