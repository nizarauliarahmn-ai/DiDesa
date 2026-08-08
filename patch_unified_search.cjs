const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/admin/surat');
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx') && f !== 'AdminSuratMasterTemplate.tsx');

let patchedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Remove the Pencarian Warga section (including variations like Ayah/Pelapor)
  const searchRegex = /\{\/\*\s*Pencarian Warga[\s\S]*?\*\/\}\s*<section[\s\S]*?<\/section>/g;
  if (searchRegex.test(content)) {
    content = content.replace(searchRegex, '');
  }

  // 2. Replace the Nama Lengkap and NIK fields with UnifiedResidentSearch if present
  const unifiedReplacement = `                <UnifiedResidentSearch\n                  formData={formData}\n                  setFormData={setFormData}\n                  residents={residents}\n                  onOpenQuickAdd={() => setShowQuickAddModal(true)}\n                />`;
  
  const altInputsRegex = /<div className="space-y-2">\s*<label[^>]*>Nama Lengkap<\/label>[\s\S]*?<ResidentStatusBadge[\s\S]*?\/>\s*<\/div>/;
  if (altInputsRegex.test(content)) {
    content = content.replace(altInputsRegex, unifiedReplacement);
  }

  // 3. Import UnifiedResidentSearch
  if (!content.includes('UnifiedResidentSearch')) {
     const importReplacement = `import { UnifiedResidentSearch } from '../penduduk/UnifiedResidentSearch';`;
     if (content.includes(`import { ResidentStatusBadge } from '../penduduk/ResidentStatusBadge';`)) {
       content = content.replace(`import { ResidentStatusBadge } from '../penduduk/ResidentStatusBadge';`, importReplacement);
     } else {
       content = content.replace(`import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';`, `import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';\n${importReplacement}`);
     }
  }

  // 4. Remove unneeded imports if left over
  content = content.replace(/import { ResidentStatusBadge } from '\.\.\/penduduk\/ResidentStatusBadge';\n?/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  patchedCount++;
  console.log(`Patched ${file}`);
}

console.log(`Finished patching ${patchedCount} files.`);
