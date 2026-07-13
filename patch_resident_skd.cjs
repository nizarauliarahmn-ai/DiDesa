const fs = require('fs');
let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/await updateResidentData\(formData.nik, \{ \n      name: formData.nama, \n      birthPlace: formData.tempatLahir, \n      birthDate: formData.tanggalLahir, \n      gender: formData.jenisKelamin,\n      religion: formData.agama,\n      job: formData.pekerjaan,\n      address: formData.alamat,\n      rt: formData.rt,\n      rw: formData.rw\n    \}\);/g, `await updateResidentData(formData.nik, { 
      name: formData.nama, 
      birthPlace: formData.tempatLahir, 
      birthDate: formData.tanggalLahir, 
      gender: formData.jenisKelamin,
      religion: formData.agama,
      job: formData.pekerjaan,
      address: formData.sifatDomisili === 'Menetap' ? formData.alamatSekarang : formData.alamat,
      rt: formData.rt,
      rw: formData.rw
    });`);

fs.writeFileSync(file, content, 'utf8');
