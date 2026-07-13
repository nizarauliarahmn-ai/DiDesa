const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const targetKop = /\{\/\* Formal Kop Surat for Printed Document List \*\/\}\s*<div className="hidden print:flex flex-col mb-6 text-black">\s*<div className="flex items-center border-b-\[2\.5px\] border-black pb-3">[\s\S]*?<\/div>\s*<\/div>/;

if (targetKop.test(code)) {
  code = code.replace(targetKop, '');
  console.log('Removed Kop from printed list!');
} else {
  console.log('regex mismatch Kop');
}

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
