const fs = require('fs');
const path = require('path');

const dir = 'src/components/admin/surat';
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx') && !['AdminSuratBuat.tsx', 'AdminSuratDashboard.tsx', 'AdminSuratInbox.tsx', 'AdminSuratMasterTemplate.tsx', 'AdminSuratPenomoran.tsx'].includes(f));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Ensure ResidentStatusBadge import
  if (!content.includes('ResidentStatusBadge')) {
    content = content.replace(
      /import\s+QuickAddResidentModal\s+from\s+['"]\.\.\/penduduk\/QuickAddResidentModal['"];?/,
      `import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';\nimport { ResidentStatusBadge } from '../penduduk/ResidentStatusBadge';`
    );
    if (!content.includes('ResidentStatusBadge')) {
      content = `import { ResidentStatusBadge } from '../penduduk/ResidentStatusBadge';\n` + content;
    }
    changed = true;
  }

  // 2. Ensure checkResidentDetailedStatus import
  if (!content.includes('checkResidentDetailedStatus')) {
    content = content.replace(
      /import\s+\{\s*checkResidentExists\s*\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/utils\/residentSync['"];?/,
      `import { checkResidentExists, checkResidentDetailedStatus } from '../../../utils/residentSync';`
    );
    changed = true;
  }

  // 3. Add ResidentStatusBadge JSX under NIK input if not already present
  if (!content.includes('<ResidentStatusBadge')) {
    // Look for NIK input onChange pattern
    const nikRegex = /(<input[^>]*value=\{\s*(?:formData|formDataPemohon|data)\.nik\s*\}[^>]*\/>)/;
    if (nikRegex.test(content)) {
      content = content.replace(
        nikRegex,
        `$1\n                  <ResidentStatusBadge nik={formData.nik} name={formData.nama} onOpenQuickAdd={() => setShowQuickAddModal(true)} />`
      );
      changed = true;
    }
  }

  // 4. Ensure showQuickAddModal state
  if (!content.includes('showQuickAddModal')) {
    content = content.replace(
      /(const\s+\[loading,\s*setLoading\]\s*=\s*useState\(false\);)/,
      `$1\n  const [showQuickAddModal, setShowQuickAddModal] = useState(false);`
    );
    changed = true;
  }

  // 5. Ensure QuickAddResidentModal import and render for files missing it (SKL, SKP)
  if (!content.includes('QuickAddResidentModal')) {
    content = `import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';\n` + content;
    content = content.replace(
      /(<\/div>\s*\);\s*\}\s*$)/,
      `  <QuickAddResidentModal isOpen={showQuickAddModal} onClose={() => setShowQuickAddModal(false)} onSuccess={() => { setShowQuickAddModal(false); handlePrint(true); }} initialData={formData} />\n$1`
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
