const fs = require('fs');
const files = [
  { path: 'src/components/dashboard/LayananMandiri.tsx', depth: 2 },
  { path: 'src/components/dashboard/StatCards.tsx', depth: 2 },
  { path: 'src/components/admin/surat/AdminSuratBuat.tsx', depth: 3 },
  { path: 'src/components/admin/surat/AdminSuratNikah.tsx', depth: 3 },
  { path: 'src/components/admin/surat/AdminSuratDashboard.tsx', depth: 3 },
  { path: 'src/components/admin/surat/AdminSuratSKTM.tsx', depth: 3 },
  { path: 'src/components/admin/AdminPenduduk.tsx', depth: 2 },
  { path: 'src/components/admin/AdminDashboard.tsx', depth: 2 }
];

files.forEach(f => {
  let content = fs.readFileSync(f.path, 'utf8');
  if (!content.includes('import { fetchResidentsCached }')) {
    let relativePath = f.depth === 2 ? '../../utils/apiCache' : '../../../utils/apiCache';
    content = `import { fetchResidentsCached } from '${relativePath}';\n` + content;
    fs.writeFileSync(f.path, content, 'utf8');
    console.log(`Added import to ${f.path}`);
  }
});
