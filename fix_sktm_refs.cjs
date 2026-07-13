const fs = require('fs');

let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/pembuatan SKTM/g, 'pembuatan SKD');
content = content.replace(/klasifikasi === 'SKTM'/g, "klasifikasi === 'SKD'");
content = content.replace(/Cetak SKTM/g, 'Cetak SKD');
content = content.replace(/Buat SKTM/g, 'Buat SKD');
content = content.replace(/Surat Keterangan Tidak Mampu \/ Miskin/g, 'Surat Keterangan Domisili');
content = content.replace(/Riwayat Pembuatan SKTM/g, 'Riwayat Pembuatan SKD');
content = content.replace(/SKTM\/064\/WHi\/2026/g, 'SKD/064/WHi/2026');
content = content.replace(/category: 'SKTM'/g, "category: 'SKD'");

fs.writeFileSync(file, content, 'utf8');
