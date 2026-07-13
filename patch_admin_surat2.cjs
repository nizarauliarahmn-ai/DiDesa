const fs = require('fs');

let code = fs.readFileSync('src/components/admin/AdminSurat.tsx', 'utf8');

code = code.replace(
  "onOpenSKP={() => changeTab('skp')}",
  "onOpenSKP={() => changeTab('skp')}\n            onOpenSKH={() => changeTab('skh')}"
);

fs.writeFileSync('src/components/admin/AdminSurat.tsx', code);
console.log('Patched AdminSurat.tsx part 2');
