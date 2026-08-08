const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/admin/surat');
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx') && f !== 'AdminSuratMasterTemplate.tsx');

let patchedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove the Pencarian Warga section (including variations like Ayah/Pelapor)
  const searchRegex = /\{\/\*\s*Pencarian Warga[\s\S]*?\*\/\}\s*<section[\s\S]*?<\/section>\s*/g;
  content = content.replace(searchRegex, '');

  // 2. Replace the Nama Lengkap and NIK fields pair with UnifiedResidentSearch
  const unifiedReplacement = `                <UnifiedResidentSearch
                  formData={formData}
                  setFormData={setFormData}
                  residents={residents}
                  onOpenQuickAdd={() => setShowQuickAddModal(true)}
                />`;

  // Regex matching Nama Lengkap div + NIK div (with optional ResidentStatusBadge inside)
  const pairRegex = /<div className="space-y-2">\s*<label[^>]*>Nama Lengkap<\/label>[\s\S]*?<\/div>\s*<div className="space-y-2">\s*<label[^>]*>NIK<\/label>[\s\S]*?<\/div>/;

  if (pairRegex.test(content)) {
    content = content.replace(pairRegex, unifiedReplacement);
    console.log(`Successfully replaced inputs in ${file}`);
  } else {
    console.log(`Could NOT match pairRegex in ${file}`);
  }

  // 3. Import UnifiedResidentSearch
  if (!content.includes('UnifiedResidentSearch')) {
     const importReplacement = `import { UnifiedResidentSearch } from '../penduduk/UnifiedResidentSearch';`;
     if (content.includes(`import { ResidentStatusBadge } from '../penduduk/ResidentStatusBadge';`)) {
       content = content.replace(`import { ResidentStatusBadge } from '../penduduk/ResidentStatusBadge';`, importReplacement);
     } else if (content.includes(`import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';`)) {
       content = content.replace(`import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';`, `import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';\n${importReplacement}`);
     } else {
       content = `import { UnifiedResidentSearch } from '../penduduk/UnifiedResidentSearch';\n` + content;
     }
  }

  // 4. Remove unneeded imports if left over
  content = content.replace(/import { ResidentStatusBadge } from '\.\.\/penduduk\/ResidentStatusBadge';\n?/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  patchedCount++;
}

console.log(`Finished patching ${patchedCount} files.`);
