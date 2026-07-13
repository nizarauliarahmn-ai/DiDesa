const fs = require('fs');
let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<\/div>\s*<\/div>\s*\{\/\* Pejabat Penandatangan \*\/\}/, '</div>\n              </div>\n            </div>\n\n            {/* Pejabat Penandatangan */}');

fs.writeFileSync(file, content, 'utf8');
