const fs = require('fs');

let code = fs.readFileSync('src/components/admin/surat/AdminSuratSKH.tsx', 'utf8');

code = code.replace(/SKTM/g, "SKH");
code = code.replace(/sktm/g, "skh");
code = code.replace(/riwayat_surat_skh/g, "riwayat_surat_skh"); // just to be sure it matches correctly

fs.writeFileSync('src/components/admin/surat/AdminSuratSKH.tsx', code);
console.log('Patched SKH again');
