const fs = require('fs');
const path = require('path');

const suratDir = path.join(__dirname, 'src', 'components', 'admin', 'surat');
const files = fs.readdirSync(suratDir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(suratDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('checkResidentExists(')) {
    // Replace check condition and call
    const oldPattern = /if \(!skipCheck && formData\.nik && formData\.nik !== '-'\) \{[\s\S]*?const exists = await checkResidentExists\(formData\.nik\);/g;
    
    const newPattern = `if (!skipCheck && (formData.nama || formData.nik)) {
      setLoading(true);
      const exists = await checkResidentExists(formData.nik, formData.nama);`;

    if (oldPattern.test(content)) {
      content = content.replace(oldPattern, newPattern);
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Updated checkResidentExists in ${file}`);
    } else {
      console.log(`Pattern not matched in ${file}`);
    }
  }
}
