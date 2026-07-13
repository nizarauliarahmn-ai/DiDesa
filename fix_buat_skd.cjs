const fs = require('fs');

let file2 = 'src/components/admin/surat/AdminSuratBuat.tsx';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(/Berdasarkan surat pernyataan dan keterangan yang dibuat oleh yang bersangkutan, nama tersebut di atas menyatakan dengan sadar bahwa ia memang BERDOMISILI di alamat sekarang tersebut\./g, "Berdasarkan surat pernyataan dan keterangan yang dibuat oleh yang bersangkutan, nama tersebut di atas menyatakan dengan sadar bahwa ia memang berstatus DOMISILI MENETAP / SEMENTARA di alamat sekarang tersebut.");

fs.writeFileSync(file2, content2, 'utf8');
