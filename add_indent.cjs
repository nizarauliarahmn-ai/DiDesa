const fs = require('fs');
const path = require('path');

const dir = path.join('C:', 'Users', 'Gambar Ibung', '.gemini', 'antigravity', 'scratch', 'DiDesa', 'src', 'components', 'admin', 'surat');
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

for (const f of files) {
  const p = path.join(dir, f);
  let code = fs.readFileSync(p, 'utf-8');
  
  // Replacements
  let newCode = code.replace(
    /style="text-align:justify;line-height:1\.2;margin-bottom:15px;font-size:14px;margin-top:15px;"/g,
    'style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;margin-top:15px;"'
  );
  
  newCode = newCode.replace(
    /style="text-align:justify;line-height:1\.2;margin-bottom:15px;font-size:14px;"/g,
    'style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;"'
  );
  
  newCode = newCode.replace(
    /style="text-align:justify;line-height:1\.2;margin-bottom:40px;font-size:14px;"/g,
    'style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;"'
  );

  if (newCode !== code) {
    fs.writeFileSync(p, newCode, 'utf-8');
    console.log('Updated ' + f);
  }
}
