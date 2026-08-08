const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/admin/surat');
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if it uses the component but misses the import
  const hasUsage = content.includes('<UnifiedResidentSearch');
  const hasImport = content.includes('import { UnifiedResidentSearch }');

  if (hasUsage && !hasImport) {
    console.log(`Missing import in ${file}, fixing...`);
    // Insert import after the last import or at the top
    const importStatement = `import { UnifiedResidentSearch } from '../penduduk/UnifiedResidentSearch';\n`;
    
    // Find QuickAddResidentModal import to put it next to it, or just put it at top
    if (content.includes(`import QuickAddResidentModal`)) {
        content = content.replace(/(import QuickAddResidentModal.*?;\n)/, `$1${importStatement}`);
    } else {
        content = importStatement + content;
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
}
