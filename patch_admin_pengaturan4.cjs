const fs = require('fs');
let file = 'src/components/admin/AdminPengaturan.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex2 = /Aplikasi sedang dikembangkan secara berkelanjutan\. Gunakan fitur kontrol ini untuk menyembunyikan surat-surat draft yang belum siap atau matang secara UI\/UX kustom, dan hanya tampilkan template yang sudah 100% matang untuk kenyamanan operator pelayanan desa\./g;

content = content.replace(regex2, "Gunakan fitur kontrol ini untuk menyembunyikan atau menampilkan template surat untuk kenyamanan operator pelayanan desa.");

fs.writeFileSync(file, content, 'utf8');
