const fs = require('fs');
let file = 'src/components/admin/AdminPengaturan.tsx';
let content = fs.readFileSync(file, 'utf8');

const noticeRegex = /<div className="bg-blue-50\/50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800 leading-relaxed font-medium mb-5">[\s\S]*?<\/div>/;
const noticeReplacement = `<div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800 leading-relaxed font-medium mb-5">
              Kelola visibilitas surat yang dapat digunakan oleh operator pelayanan desa. Anda dapat menyembunyikan surat yang tidak diperlukan.
            </div>`;

content = content.replace(noticeRegex, noticeReplacement);

fs.writeFileSync(file, content, 'utf8');
