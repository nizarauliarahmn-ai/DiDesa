const fs = require('fs');

let file2 = 'src/components/admin/surat/AdminSuratBuat.tsx';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(/if \(t.klasifikasi === 'SKD' \|\| t.klasifikasi === 'SKDPR'\) \{/g, "if (t.klasifikasi === 'SKD' || t.klasifikasi === 'SKDPR' || t.klasifikasi === 'SDP') {");
content2 = content2.replace(/selectedTemplate === 'SKD' \|\| selectedTemplate === 'SKDPR'/g, "selectedTemplate === 'SKD' || selectedTemplate === 'SKDPR' || selectedTemplate === 'SDP'");

fs.writeFileSync(file2, content2, 'utf8');
