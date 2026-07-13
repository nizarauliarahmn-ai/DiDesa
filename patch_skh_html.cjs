const fs = require('fs');

let code = fs.readFileSync('src/components/admin/surat/AdminSuratSKH.tsx', 'utf8');

const oldHtmlStart = `<!-- JUDUL SURAT -->
      <div style="text-align:center;margin-bottom:30px;">
        <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN TIDAK MAMPU</h3>`;

const newHtmlStart = `<!-- JUDUL SURAT -->
      <div style="text-align:center;margin-bottom:30px;">
        <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN KEHILANGAN</h3>`;

code = code.replace(oldHtmlStart, newHtmlStart);

const oldStatement = `<!-- PERNYATAAN -->
      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Nama tersebut di atas adalah benar-benar warga / penduduk yang berdomisili di Desa \${cleanStr(v(formData.namaDesa), /^(desa|kelurahan)\\s+/i)} Kecamatan \${cleanStr(v(formData.namaKecamatan), /^kecamatan\\s+/i)} Kabupaten \${cleanStr(v(formData.namaKabupaten), /^(kabupaten|kota)\\s+/i)} dan yang bersangkutan benar-benar tergolong keluarga <strong style="font-style:italic;">Kurang Mampu (Miskin)</strong>.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat Keterangan Kehilangan ini diberikan atas dasar permohonan yang bersangkutan, untuk dipergunakan sebagai persyaratan administrasi <strong>\${v(formData.keperluan)}</strong>.
      </p>`;

const newStatement = `<!-- PERNYATAAN -->
      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan keterangan yang bersangkutan, bahwa telah kehilangan surat / barang berharga berupa:
      </p>

      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:15px;margin-left:40px;line-height:2;font-size:14px;">
        <tr><td style="width:30%;">Barang yang Hilang</td><td style="width:3%;">:</td><td><strong>\${v(formData.barangHilang)}</strong></td></tr>
        <tr><td>Tanggal Kehilangan</td><td>:</td><td>\${fmtDate(formData.tanggalKehilangan)}</td></tr>
        <tr><td>Tempat Kehilangan</td><td>:</td><td>\${v(formData.tempatKehilangan)}</td></tr>
        <tr><td style="vertical-align:top;">Keterangan</td><td style="vertical-align:top;">:</td><td>\${v(formData.keteranganKehilangan)}</td></tr>
      </table>

      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat Keterangan ini dibuat untuk <strong>\${v(formData.keperluan)}</strong>.
      </p>`;

code = code.replace(oldStatement, newStatement);

// Fix another occurrence of "SKTM" in the dialog title
code = code.replace(
  `jenisSurat="Surat Keterangan Kehilangan (SKTM)"`,
  `jenisSurat="Surat Keterangan Kehilangan (SKH)"`
);

fs.writeFileSync('src/components/admin/surat/AdminSuratSKH.tsx', code);
console.log('Patched SKH html');
