const fs = require('fs');

let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const m = code.match(/onClick=\{\(\) => setSelectedSurat\(surat\)\}/g);
console.log(m ? m.length : 0);
