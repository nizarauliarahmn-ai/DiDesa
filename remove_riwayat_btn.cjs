const fs = require('fs');
const path = require('path');

const dir = path.join('C:', 'Users', 'Gambar Ibung', '.gemini', 'antigravity', 'scratch', 'DiDesa', 'src', 'components', 'admin', 'surat');
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

for (const f of files) {
  const p = path.join(dir, f);
  let code = fs.readFileSync(p, 'utf-8');
  
  let newCode = code;
  
  if (f === 'AdminSuratNikah.tsx') {
    // In Nikah, it's onClick={() => setShowRiwayat(true)}
    // Let's replace the button that opens Riwayat Surat
    const btnRegex = /<button[^>]*onClick=\{\(\)\s*=>\s*setShowRiwayat\(true\)\}[\s\S]*?<\/button>/;
    newCode = newCode.replace(btnRegex, '');
  } else {
    // In other files, it's onClick={() => setShowRiwayat(!showRiwayat)}
    const btnRegex = /<button[^>]*onClick=\{\(\)\s*=>\s*setShowRiwayat\(!showRiwayat\)\}[\s\S]*?<\/button>/;
    newCode = newCode.replace(btnRegex, '');
  }

  if (newCode !== code) {
    fs.writeFileSync(p, newCode, 'utf-8');
    console.log('Removed Riwayat button in ' + f);
  }
}
