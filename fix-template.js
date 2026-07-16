const fs = require('fs');
const file = 'C:/Users/Gambar Ibung/.gemini/antigravity/scratch/DiDesa/src/components/admin/surat/AdminSuratSKL.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\\\`/g, '`').replace(/\\\$\{/g, '${');
fs.writeFileSync(file, content);
console.log('Fixed interpolation!');
