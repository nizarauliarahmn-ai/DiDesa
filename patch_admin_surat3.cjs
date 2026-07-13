const fs = require('fs');

let code = fs.readFileSync('src/components/admin/AdminSurat.tsx', 'utf8');

code = code.replace(
  "<'dashboard' | 'buat' | 'penomoran' | 'nikah' | 'sktm' | 'skm' | 'sph' | 'sku' | 'skph' | 'skd' | 'skp' | 'master_template'>",
  "<'dashboard' | 'buat' | 'penomoran' | 'nikah' | 'sktm' | 'skh' | 'skm' | 'sph' | 'sku' | 'skph' | 'skd' | 'skp' | 'master_template'>"
);

fs.writeFileSync('src/components/admin/AdminSurat.tsx', code);
console.log('Patched AdminSurat.tsx part 3');
