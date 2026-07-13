const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminAspirasi.tsx', 'utf8');

code = code.replace(/return \(\s*<div className="max-w-6xl mx-auto pb-24 space-y-6">/, 'return (\n    <>\n    <div className="max-w-6xl mx-auto pb-24 space-y-6">');
code = code.replace(/      \)}\s*  \);\s*}/, '      )}\n    </>\n  );\n}');

fs.writeFileSync('src/components/admin/AdminAspirasi.tsx', code);
