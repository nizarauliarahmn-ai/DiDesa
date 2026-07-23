const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'admin', 'surat', 'AdminSuratDashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

const r1 = /surat\.nomor\.toLowerCase\(\)\.includes/g;
if (r1.test(content)) {
  content = content.replace(r1, "(surat.nomor || '').toLowerCase().includes");
}

const r2 = /surat\.nama\.toLowerCase\(\)\.includes/g;
if (r2.test(content)) {
  content = content.replace(r2, "(surat.nama || '').toLowerCase().includes");
}

const r3 = /surat\.jenis\.toLowerCase\(\)/g;
if (r3.test(content)) {
  content = content.replace(r3, "(surat.jenis || '').toLowerCase()");
}

const r4 = /s\.jenis\.toLowerCase\(\)/g;
if (r4.test(content)) {
  content = content.replace(r4, "(s.jenis || '').toLowerCase()");
}

const r5 = /r\.name\.toLowerCase\(\) === selectedSurat\.nama\.toLowerCase\(\)/g;
if (r5.test(content)) {
  content = content.replace(r5, "(r.name || '').toLowerCase() === (selectedSurat.nama || '').toLowerCase()");
}

fs.writeFileSync(file, content, 'utf8');
console.log("Fixed AdminSuratDashboard.tsx");
