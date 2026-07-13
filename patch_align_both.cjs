const fs = require('fs');

function patchFile(file, isReact) {
  let content = fs.readFileSync(file, 'utf8');

  // Fix p2 mistake
  content = content.replace(/<div className=\{\`mt-1 \$\{p2\}\`\}>/g, '<div className={`mt-1 min-h-[45px] leading-relaxed text-xs whitespace-pre-line ${textAlignClass}`}>');
  
  fs.writeFileSync(file, content, 'utf8');
}

patchFile('src/components/admin/surat/AdminSuratBuat.tsx', true);
patchFile('src/components/admin/surat/AdminSuratDashboard.tsx', true);
