const fs = require('fs');
const path = require('path');

const dir = path.join('C:', 'Users', 'Gambar Ibung', '.gemini', 'antigravity', 'scratch', 'DiDesa', 'src', 'components', 'admin', 'surat');
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx') && f !== 'AdminSuratSDU.tsx');

for (const f of files) {
  const p = path.join(dir, f);
  let code = fs.readFileSync(p, 'utf-8');
  
  // Use [\s\S]*? instead of [^>]* to handle => inside the input onChange
  const regex = /(<div className="relative">\s*)(<Search className="absolute[\s\S]*?\/>\s*<input[\s\S]*?\/>)/gs;
  
  const newCode = code.replace(regex, '\<div className="relative">\n                \\n              </div>');
  
  if (newCode !== code) {
    fs.writeFileSync(p, newCode, 'utf-8');
    console.log('Updated ' + f);
  }
}
