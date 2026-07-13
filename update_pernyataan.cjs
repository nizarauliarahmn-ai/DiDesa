const fs = require('fs');
const path = require('path');

const dir = path.join('C:', 'Users', 'Gambar Ibung', '.gemini', 'antigravity', 'scratch', 'DiDesa', 'src', 'components', 'admin', 'surat');

const replacements = {
  'AdminSuratSKBM.tsx': `      <!-- PERNYATAAN -->
      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar-benar berstatus belum kawin dan belum pernah melangsungkan perkawinan dengan siapa pun.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi pernikahan atau pendaftaran pekerjaan.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>`,

  'AdminSuratSKH.tsx': `      <!-- PERNYATAAN -->
      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar telah memberikan laporan kehilangan atas barang atau dokumen di sekitar wilayah yang telah diidentifikasi.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi pengajuan laporan kepolisian atau penerbitan dokumen pengganti.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>`,

  'AdminSuratSKM.tsx': `      <!-- PERNYATAAN -->
      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas adalah warga kami yang benar telah meninggal dunia pada waktu dan tempat yang telah dilaporkan.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi pengurusan dokumen kependudukan ahli waris.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>`,

  'AdminSuratSPH.tsx': `      <!-- PERNYATAAN -->
      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar berstatus sebagai warga kami yang bermaksud melakukan perpindahan alamat domisili ke tujuan yang baru.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi penerbitan dokumen pindah di instansi terkait.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>`,

  'AdminSuratSKP.tsx': `      <!-- PERNYATAAN -->
      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar berstatus sebagai warga kami yang bermaksud melakukan perpindahan alamat domisili ke tujuan yang baru.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi penerbitan dokumen pindah di instansi terkait.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>`,

  'AdminSuratSKU.tsx': `      <!-- PERNYATAAN -->
      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar memiliki dan mengelola usaha produktif perorangan yang beroperasi di wilayah desa kami.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi pengajuan bantuan modal atau pinjaman usaha.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>`,

  'AdminSuratSKPH.tsx': `      <!-- PERNYATAAN -->
      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar memiliki pekerjaan dengan rata-rata penghasilan per bulan sesuai dengan rincian pernyataan yang telah disepakati.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi pendaftaran sekolah atau pengajuan beasiswa.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>`,

  'AdminSuratSKD.tsx': `      <!-- PERNYATAAN -->
      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar-benar menetap dan berdomisili secara sah di alamat sebagaimana tercantum dalam formulir data kependudukan.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi umum.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>`,

  'AdminSuratSDU.tsx': `      <!-- PERNYATAAN -->
      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar memiliki fasilitas tempat usaha operasional yang berdomisili di wilayah administrasi desa kami.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi legalitas usaha.
      </p>

      <p style="text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>`
};

for (const [filename, newPernyataan] of Object.entries(replacements)) {
  const p = path.join(dir, filename);
  if (fs.existsSync(p)) {
    let code = fs.readFileSync(p, 'utf-8');
    
    // We replace from <!-- PERNYATAAN --> up to <!-- TANDA TANGAN -->
    const regex = /(<!-- PERNYATAAN -->)[\s\S]*?(      <!-- TANDA TANGAN -->)/;
    
    const newCode = code.replace(regex, newPernyataan + '\n\n$2');
    
    if (newCode !== code) {
      fs.writeFileSync(p, newCode, 'utf-8');
      console.log('Updated ' + filename);
    }
  }
}
