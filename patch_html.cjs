const fs = require('fs');

let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<p style="text-indent:40px;text-align:justify;line-height:1\.2;margin-bottom:15px;font-size:14px;">\s*Yang bertanda tangan di bawah ini[\s\S]*?Demikian surat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya\.\s*<\/p>/;

const replacement = `<p style="text-align:justify;line-height:1.2;margin-bottom:10px;font-size:14px;">
        Yang bertanda tangan di bawah ini:
      </p>
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:15px;margin-left:40px;line-height:2;font-size:14px;">
        <tr><td style="width:30%;">a. Nama</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">\${v(formData.namaPejabat)}</strong></td></tr>
        <tr><td>b. Jabatan</td><td>:</td><td><strong style="text-transform:uppercase;">\${v(formData.jabatanPejabat)} \${activeDesa.toUpperCase()}</strong></td></tr>
      </table>

      <p style="text-align:justify;line-height:1.2;margin-bottom:10px;font-size:14px;">
        Menerangkan bahwa:
      </p>

      <!-- DATA PENDUDUK -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:20px;margin-left:40px;line-height:2;font-size:14px;">
        <tr><td style="width:30%;">a. Nama</td><td style="width:3%;">:</td><td>\${v(formData.nama)}</td></tr>
        <tr><td>b. NIK</td><td>:</td><td>\${v(formData.nik)}</td></tr>
        <tr><td>c. Jenis Kelamin</td><td>:</td><td>\${v(formData.jenisKelamin)}</td></tr>
        <tr><td>d. Tempat, Tgl Lahir</td><td>:</td><td>\${v(formData.tempatLahir)}, \${fmtDate(formData.tanggalLahir)}</td></tr>
        <tr><td>e. Pekerjaan</td><td>:</td><td>\${v(formData.pekerjaan)}</td></tr>
        <tr><td>f. Kewarganegaraan</td><td>:</td><td>\${v(formData.kewarganegaraan)}</td></tr>
        <tr><td>g. Status Perkawinan</td><td>:</td><td>\${v(formData.statusPerkawinan)}</td></tr>
        <tr><td>h. Agama</td><td>:</td><td>\${v(formData.agama)}</td></tr>
        <tr><td style="vertical-align:top;">i. Alamat</td><td style="vertical-align:top;">:</td><td>\${v(formData.alamat)} RT.\${v(formData.rt)} RW.\${v(formData.rw)}<br/>Desa \${cleanStr(v(formData.namaDesa), /^(desa|kelurahan)\\s+/i)} Kecamatan \${cleanStr(v(formData.namaKecamatan), /^kecamatan\\s+/i)}, Kab. \${cleanStr(v(formData.namaKabupaten), /^(kabupaten|kota)\\s+/i)}</td></tr>
        <tr><td style="vertical-align:top;">j. Alamat Sekarang</td><td style="vertical-align:top;">:</td><td>\${v(formData.alamatSekarang)}</td></tr>
      </table>

      <!-- PERNYATAAN -->
      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan surat pernyataan dan keterangan yang dibuat oleh yang bersangkutan, nama tersebut di atas menyatakan dengan sadar bahwa ia memang berstatus <strong style="text-transform:uppercase;">DOMISILI \${v(formData.sifatDomisili).toUpperCase()}</strong> di alamat sekarang tersebut.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini diberikan kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya.
      </p>`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content, 'utf8');
