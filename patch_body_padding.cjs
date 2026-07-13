const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratMasterTemplate.tsx', 'utf8');

code = code.replace(/body \{\s*font-family: 'Inter', sans-serif;\s*background-color: white;\s*color: black;\s*margin: 0;\s*padding: 0;/g, `body {
          font-family: 'Inter', sans-serif;
          background-color: white;
          color: black;
          margin: 0;
          padding: 15mm 20mm;
          box-sizing: border-box;`);

fs.writeFileSync('src/components/admin/surat/AdminSuratMasterTemplate.tsx', code);
