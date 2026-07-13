const fs = require('fs');
const path = require('path');

const files = [
  'AdminSuratSKPH.tsx',
  'AdminSuratSPH.tsx',
  'AdminSuratNikah.tsx',
  'AdminSuratSKTM.tsx',
  'AdminSuratSKD.tsx',
  'AdminSuratSKU.tsx',
  'AdminSuratBuat.tsx',
  'AdminSuratSKM.tsx',
  'AdminSuratSKP.tsx',
];

for (const file of files) {
  const filePath = path.join('src/components/admin/surat', file);
  let code = fs.readFileSync(filePath, 'utf8');
  
  if (!code.includes('import { showToast }')) {
    code = code.replace(
      "import { getPrintSignatureHTML } from '../../../utils/signature';",
      "import { getPrintSignatureHTML } from '../../../utils/signature';\nimport { showToast } from '../../../utils/toast';"
    );
  }

  code = code.replace(/alert\("([^"]+)"\);/g, "showToast(\"$1\", 'error');");
  code = code.replace(/alert\('([^']+)'\);/g, "showToast('$1', 'success');");
  
  fs.writeFileSync(filePath, code);
}
console.log('Fixed alerts!');
