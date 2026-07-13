const fs = require('fs');

let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace component name
content = content.replace(/AdminSuratSKTM/g, 'AdminSuratSKD');

// Add alamatSekarang to formData
content = content.replace(/alamat: '',\s+keperluan: 'Bantuan Beasiswa',/, "alamat: '',\n    alamatSekarang: '',\n    keperluan: 'Administrasi Kependudukan',");

// Modify generateHTML body
const oldBodyRegex = /      <!-- JUDUL SURAT -->[\s\S]*?<!-- TANDA TANGAN -->/;
const newBody = `      <!-- JUDUL SURAT -->
      <div style="text-align:center;margin-bottom:30px;">
        <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN DOMISILI</h3>
        <p style="margin:4px 0;font-size:14px;">Nomor : \${v(formData.nomorSurat, '... / ... / ... / ' + today.getFullYear())}</p>
      </div>

      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Yang bertanda tangan di bawah ini Kepala Desa \${cleanStr(activeDesa, /^(desa|kelurahan)\\s+/i)} Kecamatan \${cleanStr(activeKecamatan, /^kecamatan\\s+/i)} Kabupaten \${cleanStr(activeKabupaten, /^(kabupaten|kota)\\s+/i)} Provinsi \${cleanStr(activeProvinsi, /^provinsi\\s+/i)}, menerangkan bahwa :
      </p>

      <!-- DATA PENDUDUK -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:20px;margin-left:40px;line-height:2;font-size:14px;">
        <tr><td style="width:30%;">Nama Lengkap</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">\${v(formData.nama)}</strong></td></tr>
        <tr><td>NIK</td><td>:</td><td>\${v(formData.nik)}</td></tr>
        <tr><td>Jenis Kelamin</td><td>:</td><td>\${v(formData.jenisKelamin)}</td></tr>
        <tr><td>Tempat, Tanggal lahir</td><td>:</td><td>\${v(formData.tempatLahir)}, \${fmtDate(formData.tanggalLahir)}</td></tr>
        <tr><td>Pekerjaan</td><td>:</td><td>\${v(formData.pekerjaan)}</td></tr>
        <tr><td>Kewarganegaraan</td><td>:</td><td>\${v(formData.kewarganegaraan)}</td></tr>
        <tr><td>Status Perkawinan</td><td>:</td><td>\${v(formData.statusPerkawinan)}</td></tr>
        <tr><td>Agama</td><td>:</td><td>\${v(formData.agama)}</td></tr>
        <tr><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td>\${v(formData.alamat)} RT.\${v(formData.rt)} RW.\${v(formData.rw)}<br/>Desa \${cleanStr(v(formData.namaDesa), /^(desa|kelurahan)\\s+/i)} Kecamatan \${cleanStr(v(formData.namaKecamatan), /^kecamatan\\s+/i)}</td></tr>
        <tr><td style="vertical-align:top;">Alamat Sekarang</td><td style="vertical-align:top;">:</td><td>\${v(formData.alamatSekarang)}</td></tr>
      </table>

      <!-- PERNYATAAN -->
      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan surat pernyataan dan keterangan yang dibuat oleh yang bersangkutan, nama tersebut di atas menyatakan dengan sadar bahwa ia memang <strong style="text-transform:uppercase;">BERDOMISILI</strong> di alamat sekarang tersebut.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya.
      </p>

      <!-- TANDA TANGAN -->`;

content = content.replace(oldBodyRegex, newBody);

// Form UI adjustments
const formUIRegex = /<div className="space-y-4">[\s\S]*?<div className="space-y-2">[\s\S]*?<label className="text-sm font-bold text-slate-700">Keperluan<\/label>[\s\S]*?<\/div>[\s\S]*?<\/div>\s*<\/div>/;

// I will just read the file up to this point and then manually replace using another step to be precise.
fs.writeFileSync(file, content, 'utf8');
