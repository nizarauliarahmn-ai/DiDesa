export interface KopSuratOptions {
  logoUrl?: string;
  kabupaten?: string;
  kecamatan?: string;
  desa?: string;
  alamat?: string;
  kontak?: string;
  fontFamily?: string;
}

export const generateKopSuratHTML = (options: KopSuratOptions = {}) => {
  const logoUrl = options.logoUrl || localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
  const kabupaten = options.kabupaten || localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan';
  const kecamatan = options.kecamatan || localStorage.getItem('kop_kecamatan') || 'Simpur';
  const desa = (options.desa || localStorage.getItem('kop_desa') || 'Wasah Hilir').replace(/^(desa|kelurahan)\s+/i, '');
  const alamat = options.alamat || localStorage.getItem('kop_alamat') || '';
  const kontak = options.kontak || localStorage.getItem('kop_kontak') || '';
  const font = options.fontFamily || localStorage.getItem('village_letter_font') || localStorage.getItem('letter_font') || 'Arial, sans-serif';

  return `
<!-- KOP SURAT -->
<div style="border-bottom:3px solid #000;margin-bottom:12px;font-family:${font};">
  <div style="display:flex;align-items:flex-start;padding-bottom:6px;margin-bottom:1px;">
    <div style="display:flex;width:100%;align-items:center;">
      <div style="width:90px;height:100px;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-right:15px;">
        <img src="${logoUrl}" style="width:100%;height:100%;object-fit:contain;" />
      </div>
      <div style="text-align:center;flex:1;padding-right:90px;">
        <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">PEMERINTAH KABUPATEN ${kabupaten.toUpperCase()}</div>
        <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">KECAMATAN ${kecamatan.toUpperCase()}</div>
        <div style="font-weight:900;font-size:26px;text-transform:uppercase;letter-spacing:2px;line-height:1.1;margin:2px 0 3px 0;">DESA ${desa.toUpperCase()}</div>
        <div style="font-size:10.5px;margin-top:4px;text-transform:capitalize;line-height:1.15;margin:2px 0 1px 0;">${alamat}</div>
        <div style="font-size:10.5px;line-height:1.15;margin:1px 0 0 0;">${kontak}</div>
      </div>
    </div>
  </div>
</div>
  `;
};
