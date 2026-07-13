const fs = require('fs');

let code = fs.readFileSync('src/components/admin/surat/AdminSuratBuat.tsx', 'utf8');

// Add onOpenSKH to props
code = code.replace(
  "onOpenSPH?: () => void, onOpenSKP?: () => void }) {",
  "onOpenSPH?: () => void, onOpenSKP?: () => void, onOpenSKH?: () => void }) {"
);

// Add SKH routing logic
code = code.replace(
  `                      if (t.klasifikasi === 'SKPH') {`,
  `                      if (t.klasifikasi === 'SKH') {
                        if (onOpenSKH) onOpenSKH();
                        return;
                      }
                      if (t.klasifikasi === 'SKPH') {`
);

// Add SKH middle paragraph logic
code = code.replace(
  `                      } else if (selectedTemplate === 'SKTM') {`,
  `                      } else if (selectedTemplate === 'SKTM') {
                        middleParagraph = \`Adalah benar nama tersebut di atas merupakan warga berdomisili sah di wilayah kami yang tergolong dalam keluarga prasejahtera (tidak mampu). Surat keterangan ini diterbitkan untuk memenuhi keperluan:\`;
                      } else if (selectedTemplate === 'SKH') {
                        middleParagraph = \`Adalah benar nama tersebut di atas berdasarkan keterangan yang bersangkutan telah kehilangan surat / dokumen penting. Surat keterangan kehilangan ini diterbitkan untuk memenuhi keperluan:\`;`
);

fs.writeFileSync('src/components/admin/surat/AdminSuratBuat.tsx', code);
console.log('Patched AdminSuratBuat.tsx');
