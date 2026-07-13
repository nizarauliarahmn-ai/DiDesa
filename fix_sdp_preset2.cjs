const fs = require('fs');
let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/if \(presetResident\) \{\n      handleSelectResident\(presetResident\);\n    \}/, `if (presetResident) {
      const res = presetResident;
      setSelectedChild(res);
      const rt_rw = res.rt_rw || '001/001';
      const [rt, rw] = rt_rw.split('/');
      setFormData(prev => ({
        ...prev,
        nama: res.name,
        nik: res.nik,
        tempatLahir: res.birthPlace,
        tanggalLahir: res.birthDate,
        jenisKelamin: res.gender || 'Laki-Laki',
        agama: res.religion || 'Islam',
        pekerjaan: res.job || 'Wiraswasta',
        alamat: res.address,
        rt: rt || '001',
        rw: rw || '001',
      }));
    }`);

fs.writeFileSync(file, content, 'utf8');
