const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');
code = code.replace(/}\)\}/g, '})');
fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
