const fs = require('fs');

let file = 'src/components/admin/AdminPengaturan.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">NIP \(Gunakan '-' jika tidak ada\)<\/label>[\s\S]*?<input [\s\S]*?\/>\s*<\/div>\s*<\/div>\s*<\/div>/;

content = content.replace(regex, (match) => {
  return match.replace(/<\/div>\s*<\/div>\s*<\/div>/, '</div>\n                  </div>');
});

fs.writeFileSync(file, content, 'utf8');
