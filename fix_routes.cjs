const fs = require('fs');

let file2 = 'src/components/admin/surat/AdminSuratBuat.tsx';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(/if \(onOpenSKPH\) onOpenSKPH\(\);\n    \} else if \(template === 'SKD' \|\| template === 'SKDPR'\) \{\n      if \(onOpenSKD\) onOpenSKD\(\);/, "if (onOpenSKPH) onOpenSKPH();\n                        return;\n                      }\n                      if (t.klasifikasi === 'SKD' || t.klasifikasi === 'SKDPR') {\n                        if (onOpenSKD) onOpenSKD();");

fs.writeFileSync(file2, content2, 'utf8');
