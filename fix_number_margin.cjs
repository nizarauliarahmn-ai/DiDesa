const fs = require('fs');
const path = require('path');

const dir = path.join('C:', 'Users', 'Gambar Ibung', '.gemini', 'antigravity', 'scratch', 'DiDesa', 'src', 'components', 'admin', 'surat');
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

for (const f of files) {
  const p = path.join(dir, f);
  let code = fs.readFileSync(p, 'utf-8');
  
  // Replace margin:4px 0; or margin:2px 0; with margin:2px 0 0 0; for the Nomor line
  const regex = /style="margin:[24]px 0;font-size:14px;">Nomor/g;
  let newCode = code.replace(regex, 'style="margin:2px 0 0 0;font-size:14px;">Nomor');

  if (newCode !== code) {
    fs.writeFileSync(p, newCode, 'utf-8');
    console.log('Updated ' + f);
  }
}
