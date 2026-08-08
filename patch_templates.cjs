const fs = require('fs');
const path = require('path');

const dir = 'src/components/admin/surat';
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. Remove isBackdate && from the useEffect condition
  const conditionMatch = content.match(/if\s*\(\s*isBackdate\s*&&\s*customNomorSurat\s*&&/);
  if (conditionMatch) {
    content = content.replace(/if\s*\(\s*isBackdate\s*&&\s*customNomorSurat\s*&&/, 'if (customNomorSurat &&');
    changed = true;
  }

  // 2. Remove the initial generation block if it exists
  const blockRegex = /if\s*\(!editData\)\s*\{\s*const\s*generatedNo\s*=\s*generateLetterNumber\([\s\S]*?\}\)\);\s*\}/;
  if (blockRegex.test(content)) {
    content = content.replace(blockRegex, '');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
