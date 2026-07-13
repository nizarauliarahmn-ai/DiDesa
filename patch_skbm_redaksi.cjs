const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratSKBM.tsx', 'utf8');

const targetPernyataan = /<!-- PERNYATAAN -->\s*<p style="text-indent:40px;text-align:justify;line-height:1\.2;margin-bottom:15px;font-size:14px;">[\s\S]*?Demikian Surat Keterangan Belum Pernah Menikah ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya\.\s*<\/p>/g;

const newPernyataan = `<!-- PERNYATAAN -->
      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Berdasarkan data kependudukan kami, nama tersebut di atas benar berstatus <strong>Belum Kawin (Belum Pernah Menikah)</strong>.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:15px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai persyaratan administrasi <strong>\${v(formData.keperluan)}</strong>.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.2;margin-bottom:40px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>`;

code = code.replace(targetPernyataan, newPernyataan);

fs.writeFileSync('src/components/admin/surat/AdminSuratSKBM.tsx', code);
console.log('Patched SKBM redaksi');
