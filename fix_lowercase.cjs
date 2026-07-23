const fs = require('fs');
const path = require('path');
const glob = require('glob'); // Make sure glob is installed or use fs.readdirSync

const dir = path.join(__dirname, 'src', 'components', 'admin', 'surat');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

let totalReplaced = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // r.name.toLowerCase().includes(searchQuery.toLowerCase()) -> (r.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  const regex1 = /r\.name\.toLowerCase\(\)\.includes\(searchQuery\.toLowerCase\(\)\)/g;
  if (regex1.test(content)) {
    content = content.replace(regex1, "(r.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())");
    totalReplaced++;
  }

  // Also fix r.nik.includes(searchQuery) just in case
  const regex2 = /r\.nik\.includes\(searchQuery\)/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, "(r.nik || '').includes(searchQuery || '')");
  }

  // Write back
  fs.writeFileSync(filePath, content, 'utf8');
});

console.log(`Fixed ${totalReplaced} files in surat components.`);
