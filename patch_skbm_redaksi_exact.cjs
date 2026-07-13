const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratSKBM.tsx', 'utf8');

const targetStr = /sebagai persyaratan administrasi <strong>\$\{v\(formData\.keperluan\)\}<\/strong>\./g;
code = code.replace(targetStr, "sebagai persyaratan administrasi.");

fs.writeFileSync('src/components/admin/surat/AdminSuratSKBM.tsx', code);
console.log('Patched SKBM redaksi exact');
