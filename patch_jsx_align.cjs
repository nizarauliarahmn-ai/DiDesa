const fs = require('fs');
const files = [
  'src/components/admin/surat/AdminSuratBuat.tsx',
  'src/components/admin/surat/AdminSuratDashboard.tsx',
  'src/components/admin/AdminPengaturan.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // For AdminSuratBuat & Dashboard
  const invisibleRegex = /<div className="invisible">[\s\S]*?<\/div>\n\s*<div className=\{`mt-1 /g;
  content = content.replace(invisibleRegex, '<div className={`');
  
  // For AdminPengaturan preview (it has invisible block too)
  const invisiblePreviewRegex = /<div className="invisible">[\s\S]*?<\/div>\n\s*<div className=\{`mt-1 /g;
  content = content.replace(invisiblePreviewRegex, '<div className={`');

  fs.writeFileSync(file, content, 'utf8');
}
