const fs = require('fs');
const path = require('path');

const suratDir = path.join(__dirname, 'src', 'components', 'admin', 'surat');
const files = fs.readdirSync(suratDir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(suratDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  let changed = false;

  // 1. Remove incorrectly placed imports
  const badImport1 = /import QuickAddResidentModal from '\.\.\/penduduk\/QuickAddResidentModal';\r?\n/g;
  const badImport2 = /import \{ checkResidentExists \} from '\.\.\/\.\.\/\.\.\/utils\/residentSync';\r?\n/g;

  if (badImport1.test(content) || badImport2.test(content)) {
    content = content.replace(badImport1, '');
    content = content.replace(badImport2, '');

    // 2. Add them properly at the top (after the first block of imports)
    const importRegex = /import [^;]+;/g;
    let match;
    let lastImportIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      if (match[0].includes('QuickAddResidentModal') || match[0].includes('checkResidentExists')) continue;
      lastImportIndex = match.index + match[0].length;
    }

    if (lastImportIndex > 0) {
      const before = content.substring(0, lastImportIndex);
      const after = content.substring(lastImportIndex);
      
      const importsToAdd = `\nimport QuickAddResidentModal from '../penduduk/QuickAddResidentModal';\nimport { checkResidentExists } from '../../../utils/residentSync';`;
      content = before + importsToAdd + after;
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Fixed imports in ${file}`);
  }
}
