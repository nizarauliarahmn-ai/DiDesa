const fs = require('fs');

let code = fs.readFileSync('src/components/admin/AdminSurat.tsx', 'utf8');

code = code.replace(
  `} else if (jenis === 'SK PENGHASILAN' || jenis === 'SKPH') {`,
  `} else if (jenis === 'SK KEHILANGAN' || jenis === 'SKH') {
      setActiveTab('skh');
    } else if (jenis === 'SK PENGHASILAN' || jenis === 'SKPH') {`
);

fs.writeFileSync('src/components/admin/AdminSurat.tsx', code);
console.log('Patched AdminSurat edit');
