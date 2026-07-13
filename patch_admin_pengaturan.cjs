const fs = require('fs');

let file = 'src/components/admin/AdminPengaturan.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the handleShowOnlyMatureLetters function and its button
// The button might be somewhere in the file. Let's find it.
// Actually, I can just modify the render of the pill first.
const matureRegex = /<div className="flex items-center gap-1\.5 mt-1">[\s\S]*?<\/div>/;
content = content.replace(matureRegex, '');

// Also remove `const isMature = matureCodes.includes(c.klasifikasi);`
content = content.replace(/const isMature = matureCodes\.includes\(c\.klasifikasi\);/, '');
content = content.replace(/const matureCodes = \['SU', 'SKM', 'SKD', 'SKUM', 'SKN', 'SKTM', 'SKU', 'SKBM', 'SKH', 'SKPH'\];/, '');

fs.writeFileSync(file, content, 'utf8');
