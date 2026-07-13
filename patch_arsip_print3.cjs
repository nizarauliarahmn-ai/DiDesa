const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

// Update CSS for Landscape, Margins, and thead repeating
const printCssTarget = /<style type="text\/css" media="print">\s*\{\`\s*@page \{ size: A4 portrait; margin: 1\.5cm; \}\s*body \{ -webkit-print-color-adjust: exact; print-color-adjust: exact; \}\s*table \{ width: 100%; border-collapse: collapse; font-size: 10px !important; \}\s*th, td \{ border: 1px solid #ddd; padding: 6px 8px !important; text-align: left; \}\s*th \{ background-color: #f8f9fa !important; font-weight: bold; \}\s*\.print\\\\:hidden \{ display: none !important; \}\s*\.printable-table-content \{ overflow: visible !important; \}\s*\.printable-table-area \{ box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; \}\s*\`\}\s*<\/style>/g;

const newPrintCss = `<style type="text/css" media="print">
            {\`
              @page { size: A4 landscape; margin: 1cm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              table { width: 100%; border-collapse: collapse; font-size: 11px !important; }
              thead { display: table-header-group; }
              tfoot { display: table-footer-group; }
              th, td { border: 1px solid #333; padding: 6px 8px !important; text-align: left; }
              th { background-color: #f8f9fa !important; font-weight: bold; }
              .print\\\\:hidden { display: none !important; }
              .printable-table-content { overflow: visible !important; }
              .printable-table-area { box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; }
            \`}
          </style>`;
          
if (printCssTarget.test(code)) {
  code = code.replace(printCssTarget, newPrintCss);
  console.log('Replaced landscape css!');
} else {
  console.log('regex mismatch print css');
}

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
