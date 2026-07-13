const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratSKBM.tsx', 'utf8');

const targetPernyataan = /<p style="text-indent:40px;text-align:justify;line-height:1\.2;margin-bottom:15px;font-size:14px;">\s*Nama tersebut di atas adalah benar-benar warga \/ penduduk yang berdomisili di Desa \$\{cleanStr\(v\(formData\.namaDesa\), \/\^\(desa\|kelurahan\)\\s\+\/i\)\} Kecamatan \$\{cleanStr\(v\(formData\.namaKecamatan\), \/\^kecamatan\\s\+\/i\)\} Kabupaten \$\{cleanStr\(v\(formData\.namaKabupaten\), \/\^\(kabupaten\|kota\)\\s\+\/i\)\} dan yang bersangkutan benar-benar tergolong keluarga <strong style="font-style:italic;">Kurang Mampu \(Miskin\)<\/strong>\.\s*<\/p>/g;

const newPernyataan = `<p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Adalah benar nama tersebut di atas berstatus <strong>Belum Kawin / Belum Pernah Menikah</strong> berdasarkan data registrasi kependudukan kami.
      </p>`;

code = code.replace(targetPernyataan, newPernyataan);

// Also need to set default keperluan in state
const targetKeperluan = /keperluan: 'Bantuan Beasiswa'/g;
const newKeperluan = `keperluan: 'Persyaratan Administrasi'`;
code = code.replace(targetKeperluan, newKeperluan);

// Ensure the local storage history key is unique for SKBM (if it copied from SKTM)
const targetHistoryKey = /riwayat_surat_sktm/g;
code = code.replace(targetHistoryKey, 'riwayat_surat_skbm');

// Update letter types
const targetJenis = /jenis: 'SKBM'/g; // It might be SKTM if not replaced properly, let's just make sure. Wait, the sed replaced SKTM -> SKBM

fs.writeFileSync('src/components/admin/surat/AdminSuratSKBM.tsx', code);
console.log('Patched SKBM body!');
