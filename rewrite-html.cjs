const fs = require('fs');
const file = 'C:/Users/Gambar Ibung/.gemini/antigravity/scratch/DiDesa/src/components/admin/surat/AdminSuratSKL.tsx';
let content = fs.readFileSync(file, 'utf8');

const newGenerateHTML = `  const generateHTML = () => {
    const today = new Date();
    const tglFormatted = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
    const noSurat = rxData.noSurat || 'SKL/146/WHi/2026';
    
    // Clean string helper (capitalizes each word, removes prefixes like 'desa', 'kecamatan' if any, but since we rely on it directly, we just capitalize)
    const capitalize = (str) => {
      if (!str) return '';
      return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const terbilang = (angka) => {
      const num = parseInt(angka);
      if (isNaN(num)) return '';
      const huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
      if (num < 12) return huruf[num];
      if (num < 20) return huruf[num - 10] + " Belas";
      if (num < 100) return huruf[Math.floor(num / 10)] + " Puluh " + huruf[num % 10];
      return num.toString();
    };

    let html = \`
      <div style="background:white;width:210mm;min-height:297mm;padding:15mm 20mm 20mm 20mm;box-sizing:border-box;margin:0 auto;box-shadow:0 10px 25px rgba(0,0,0,0.1);position:relative;overflow:hidden;font-family:Arial, sans-serif;color:#000;">
        
        <!-- KOP SURAT -->
        <div style="border-bottom:3px solid #000;padding-bottom:10px;margin-bottom:20px;display:flex;align-items:center;position:relative;">
          <div style="width:70px;height:90px;position:absolute;left:0;top:0;display:flex;align-items:center;justify-content:center;">
            <img src="\${villageLogo}" style="width:100%;height:100%;object-fit:contain;" />
          </div>
          <div style="text-align:center;flex:1;padding-right:70px;padding-left:70px;">
            <div style="font-weight:bold;font-size:16px;text-transform:uppercase;letter-spacing:1px;line-height:1.2;margin:0 0 2px 0;">PEMERINTAH KABUPATEN \${namaKabupaten.toUpperCase()}</div>
            <div style="font-weight:bold;font-size:16px;text-transform:uppercase;letter-spacing:1px;line-height:1.2;margin:0 0 2px 0;">KECAMATAN \${namaKecamatan.toUpperCase()}</div>
            <div style="font-weight:900;font-size:22px;text-transform:uppercase;letter-spacing:1px;line-height:1.2;margin:2px 0 5px 0;">KANTOR KEPALA DESA \${namaDesa.toUpperCase()}</div>
            <div style="font-size:12px;line-height:1.2;margin:2px 0 0 0;">Alamat: \${alamatKantor}</div>
          </div>
        </div>
        
        <div style="border-top:1px solid #000;margin-top:-18px;margin-bottom:20px;"></div>

        <!-- JUDUL SURAT -->
        <div style="text-align:center;margin-bottom:25px;">
          <h2 style="font-size:16px;font-weight:bold;text-decoration:underline;margin:0 0 5px 0;text-transform:uppercase;">SURAT KETERANGAN KENAL LAHIR</h2>
          <div style="font-size:12px;">Nomor: \${noSurat}</div>
        </div>

        <p style="text-align:justify;line-height:1.5;margin-bottom:15px;font-size:12px;text-indent:40px;">
          Yang bertanda tangan di bawah ini, Kepala Desa \${cleanStr(namaDesa, /^(desa|kelurahan)\\s+/i)}, Kecamatan \${cleanStr(namaKecamatan, /^kecamatan\\s+/i)}, Kabupaten \${cleanStr(namaKabupaten, /^kabupaten\\s+/i)}, menerangkan dengan sebenarnya bahwa pasangan suami istri sah:
        </p>

        <p style="font-weight:bold; margin-bottom: 8px; font-size:12px;">I. DATA SUAMI (AYAH)</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:15px; margin-left:20px; line-height:1.5; font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">a.</td><td style="width:25%;vertical-align:top;">Nama Lengkap</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">\${v(ayahData.nama)}</strong></td></tr>
          <tr><td style="vertical-align:top;">b.</td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(ayahData.nik)}</td></tr>
          <tr><td style="vertical-align:top;">c.</td><td style="vertical-align:top;">Tempat, Tanggal Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(ayahData.tempatLahir)}, \${v(ayahData.tanggalLahir)}</td></tr>
          <tr><td style="vertical-align:top;">d.</td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(ayahData.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">e.</td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;">\${v(ayahData.alamat)}</td></tr>
        </table>

        <p style="font-weight:bold; margin-bottom: 8px; font-size:12px;">II. DATA ISTRI (IBU)</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:15px; margin-left:20px; line-height:1.5; font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">a.</td><td style="width:25%;vertical-align:top;">Nama Lengkap</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">\${v(ibuData.nama)}</strong></td></tr>
          <tr><td style="vertical-align:top;">b.</td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(ibuData.nik)}</td></tr>
          <tr><td style="vertical-align:top;">c.</td><td style="vertical-align:top;">Tempat, Tanggal Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(ibuData.tempatLahir)}, \${v(ibuData.tanggalLahir)}</td></tr>
          <tr><td style="vertical-align:top;">d.</td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(ibuData.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">e.</td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;">\${v(ibuData.alamat)}</td></tr>
        </table>

        <p style="text-align:justify;line-height:1.5;margin-bottom:15px;font-size:12px;">
          Bahwa dari pernikahan tersebut telah lahir seorang anak:
        </p>

        <table style="width:100%; border-collapse:collapse; margin-bottom:15px; margin-left:20px; line-height:1.5; font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">a.</td><td style="width:25%;vertical-align:top;">Anak Ke-</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;">\${v(anakData.anakKe)} (\${terbilang(anakData.anakKe)})</td></tr>
          <tr><td style="vertical-align:top;">b.</td><td style="vertical-align:top;">Jenis Kelamin</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(anakData.jenisKelamin)}</td></tr>
          <tr><td style="vertical-align:top;">c.</td><td style="vertical-align:top;">Tanggal / Jam Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(anakData.tanggalLahir)} / \${v(anakData.jamLahir)} WITA</td></tr>
          <tr><td style="vertical-align:top;">d.</td><td style="vertical-align:top;">Tempat Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(anakData.tempatLahir)}</td></tr>
          <tr><td style="vertical-align:top;">e.</td><td style="vertical-align:top;">Diberi Nama</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">\${v(anakData.nama)}</strong></td></tr>
        </table>

        <p style="font-weight:bold; margin-bottom: 8px; font-size:12px;">III. SAKSI-SAKSI</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; margin-left:20px; line-height:1.5; font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">1.</td><td style="width:25%;vertical-align:top;">Nama Lengkap</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">\${v(saksi1Data.nama)}</strong></td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(saksi1Data.nik)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Tempat, Tanggal Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(saksi1Data.tempatLahir)}, \${v(saksi1Data.tanggalLahir)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(saksi1Data.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;padding-bottom:12px;">\${v(saksi1Data.alamat)}</td></tr>

          <tr><td style="vertical-align:top;">2.</td><td style="vertical-align:top;">Nama Lengkap</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">\${v(saksi2Data.nama)}</strong></td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(saksi2Data.nik)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Tempat, Tanggal Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(saksi2Data.tempatLahir)}, \${v(saksi2Data.tanggalLahir)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">\${v(saksi2Data.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;">\${v(saksi2Data.alamat)}</td></tr>
        </table>

        <p style="text-align:justify;line-height:1.5;margin-bottom:40px;font-size:12px;text-indent:40px;">
          Demikian Surat Keterangan Kenal Lahir ini diberikan kepada yang bersangkutan untuk dapat dipergunakan sebagaimana mestinya.
        </p>

        <!-- TANDA TANGAN -->
        \${getPrintSignatureHTML(
          namaDesa,
          tglFormatted,
          namaPejabat,
          jabatanPejabat,
          "",
          includeCamat
        )}

        <!-- GLOBAL FOOTER -->
        \${SAAS_CONFIG.globalFooterHTML}
      </div>
    \`;

    return html;
  };`;

content = content.replace(/const generateHTML = \(\) => \{[\s\S]*?return html;\s*\};/, newGenerateHTML);
fs.writeFileSync(file, content);
console.log('HTML rewritten successfully with terbilang.');
