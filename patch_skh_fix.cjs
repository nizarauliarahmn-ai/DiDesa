const fs = require('fs');

let code = fs.readFileSync('src/components/admin/surat/AdminSuratBuat.tsx', 'utf8');

code = code.replace(
  "onOpenSKD, onOpenSKM, onOpenSPH, onOpenSKP }: {",
  "onOpenSKD, onOpenSKM, onOpenSPH, onOpenSKP, onOpenSKH }: {"
);

fs.writeFileSync('src/components/admin/surat/AdminSuratBuat.tsx', code);
console.log('Fixed onOpenSKH destructured prop');
