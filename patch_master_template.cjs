const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratMasterTemplate.tsx', 'utf8');

code = code.replace(/@page\s*\{\s*size:\s*A4;\s*margin:\s*15mm 20mm 15mm 20mm;\s*\}/g, `@page {
          size: A4;
          margin: 0;
        }`);
code = code.replace(/@page\s*\{\s*size:\s*A4;\s*margin:\s*15mm 20mm 15mm 20mm;\s*\}/g, `@page { size: A4; margin: 0; }`); // for the second occurrence

// Let's also patch the body inside that template style block
const bodyTarget = `body {
          background-color: white;
          color: black;
          margin: 0;
          padding: 0;`;
const bodyReplacement = `body {
          background-color: white;
          color: black;
          margin: 0;
          padding: 15mm 20mm 15mm 20mm;
          box-sizing: border-box;`;
code = code.replace(bodyTarget, bodyReplacement);

// Fix the .saas-global-footer bottom
const footerTarget = `          .saas-global-footer {
            position: fixed !important;
            bottom: 0 !important;`;
const footerReplacement = `          .saas-global-footer {
            position: fixed !important;
            bottom: 15mm !important;`;
code = code.replace(footerTarget, footerReplacement);

fs.writeFileSync('src/components/admin/surat/AdminSuratMasterTemplate.tsx', code);
