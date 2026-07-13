const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const printCssTarget = /<style type="text\/css" media="print">\s*\{`\s*table \{ width: 100%; border-collapse: collapse; \}\s*th, td \{ border: 1px solid #ddd; padding: 12px; text-align: left; \}\s*th \{ background-color: #f8f9fa; font-weight: bold; \}\s*\.print\\\\:hidden \{ display: none !important; \}\s*`\}\s*<\/style>/g;

const newPrintCss = `<style type="text/css" media="print">
            {\`
              @page { size: A4 portrait; margin: 1.5cm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              table { width: 100%; border-collapse: collapse; font-size: 10px !important; }
              th, td { border: 1px solid #ddd; padding: 6px 8px !important; text-align: left; }
              th { background-color: #f8f9fa !important; font-weight: bold; }
              .print\\\\:hidden { display: none !important; }
              .printable-table-content { overflow: visible !important; }
              .printable-table-area { box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; }
            \`}
          </style>`;

code = code.replace(printCssTarget, newPrintCss);

// Add print footer at the end of the table wrapper
const targetTableEnd = /<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>/g;
const newTableEnd = `</tbody>
            </table>
            {isPrintingTable && (
              <div className="hidden print:block mt-8 text-[10px] text-gray-500 text-left pt-4 border-t border-gray-300" dangerouslySetInnerHTML={{__html: SAAS_CONFIG.globalFooterHTML}} />
            )}
          </div>
        </div>`;

code = code.replace(targetTableEnd, newTableEnd);

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Patched arsip print layout');
