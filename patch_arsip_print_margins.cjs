const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const targetCss = /@page \{ size: A4 landscape; margin: 1cm; \}/g;
const newCss = `@page { size: A4 landscape; margin: 0; }`;
code = code.replace(targetCss, newCss);

const targetArea = /\.printable-table-area \{ box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; \}/g;
const newArea = `.printable-table-area { box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; padding: 1.5cm !important; }`;
code = code.replace(targetArea, newArea);

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
