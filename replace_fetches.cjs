const fs = require('fs');
const files = [
  'src/components/dashboard/LayananMandiri.tsx',
  'src/components/dashboard/StatCards.tsx',
  'src/components/admin/surat/AdminSuratBuat.tsx',
  'src/components/admin/surat/AdminSuratNikah.tsx',
  'src/components/admin/surat/AdminSuratDashboard.tsx',
  'src/components/admin/surat/AdminSuratSKTM.tsx',
  'src/components/admin/AdminPenduduk.tsx',
  'src/components/admin/AdminDashboard.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("fetch('/api/residents')")) {
    content = content.replace(/fetch\('\/api\/residents'\)/g, "fetchResidentsCached()");
    
    // Add import if not present
    if (!content.includes('fetchResidentsCached')) {
      // Need to calculate relative path to src/utils/apiCache.ts
      let relativePath = '../../utils/apiCache'; // default for admin components
      if (file.includes('admin/surat/')) {
        relativePath = '../../../utils/apiCache';
      } else if (file.includes('dashboard/')) {
        relativePath = '../../utils/apiCache';
      }
      
      const importStmt = `import { fetchResidentsCached } from '${relativePath}';\n`;
      content = importStmt + content;
    }
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
