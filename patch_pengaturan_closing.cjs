const fs = require('fs');

let file = 'src/components/admin/AdminPengaturan.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the closing `)}` with just the div end.
const regex = /<label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">NIP \(Gunakan '-' jika tidak ada\)<\/label>[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;

content = content.replace(regex, (match) => {
  return match.replace(/<\/div>\s*\)\}/, '</div>\n                  </div>');
});

fs.writeFileSync(file, content, 'utf8');
