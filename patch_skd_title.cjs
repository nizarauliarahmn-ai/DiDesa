const fs = require('fs');

let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/SURAT KETERANGAN DOMISILI/g, 'SURAT KETERANGAN DOMISILI PERORANGAN');
content = content.replace(/Buat SKD/g, 'Buat SDP');
content = content.replace(/Surat Keterangan Domisili/g, 'Surat Keterangan Domisili Perorangan');

fs.writeFileSync(file, content, 'utf8');
