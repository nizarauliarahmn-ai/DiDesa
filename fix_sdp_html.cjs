const fs = require('fs');
let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<tr><td style="vertical-align:top;">j\. Alamat Sekarang<\/td>[\s\S]*?<\/tr>/;
const replacement = '<tr><td style="vertical-align:top;">j. Alamat Sekarang</td><td style="vertical-align:top;">:</td><td>${v(formData.alamatSekarang)} RT.${v(formData.rtSekarang)} RW.${v(formData.rwSekarang)}<br/>Desa ${cleanStr(activeDesa, /^(desa|kelurahan)\\s+/i)} Kecamatan ${cleanStr(activeKecamatan, /^kecamatan\\s+/i)}, Kab. ${cleanStr(activeKabupaten, /^(kabupaten|kota)\\s+/i)}</td></tr>';

content = content.replace(regex, replacement);

fs.writeFileSync(file, content, 'utf8');
