const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratBuat.tsx', 'utf8');

const targetAddHistory = /    addLetterHistory\(\{\n      nomor: nomorSurat,\n      jenis: letterType,\n      nik: selectedResident\?\.nik \|\| '',\n      nama: selectedResident\?\.name \|\| 'Wasah Hilir \/ Umum',\n      tanggal: currentDateFormatted\(\),\n      keperluan: keperluan \|\| 'Persyaratan administrasi kependudukan\.',\n      status: 'Selesai'\n    \}\);/g;

const newAddHistory = `    addLetterHistory({
      nomor: nomorSurat,
      jenis: letterType,
      nik: selectedResident?.nik || '',
      nama: selectedResident?.name || 'Wasah Hilir / Umum',
      tanggal: currentDateFormatted(),
      keperluan: keperluan || 'Persyaratan administrasi kependudukan.',
      status: 'Selesai',
      data: {
        includeCamat: includeCamat,
        nama: selectedResident?.name,
        nik: selectedResident?.nik,
        tempatLahir: selectedResident?.birthPlace,
        tanggalLahir: selectedResident?.birthDate,
        jenisKelamin: selectedResident?.gender,
        alamat: selectedResident?.address,
        agama: selectedResident?.religion,
        pekerjaan: selectedResident?.job,
        statusPerkawinan: selectedResident?.maritalStatus
      }
    });`;

code = code.replace(targetAddHistory, newAddHistory);
fs.writeFileSync('src/components/admin/surat/AdminSuratBuat.tsx', code);
console.log('Patched AdminSuratBuat history');
