const fs = require('fs');
const file = 'C:/Users/Gambar Ibung/.gemini/antigravity/scratch/DiDesa/src/components/admin/surat/AdminSuratSKKT.tsx';
let content = fs.readFileSync(file, 'utf8');

const handleSaveStartStr = 'const handleSave = async () => {';
const handleSaveEndStr = 'const todayStr = new Date().toLocaleDateString(\'id-ID\', { day: \'numeric\', month: \'long\', year: \'numeric\' });';

const handleSaveStart = content.indexOf(handleSaveStartStr);
const handleSaveEnd = content.indexOf(handleSaveEndStr);

if (handleSaveStart === -1 || handleSaveEnd === -1) {
  console.error('Could not find handleSave bounds');
  process.exit(1);
}

const previewStartStr = '<div \n            {...dragProps}\n            className="w-full bg-white text-black p-10 shadow-xl rounded-lg font-serif border border-gray-300 overflow-x-auto select-none"';
const previewEndStr = '</div>\n        </div>\n      </div>\n\n      {/* Interactive Satellite Map Picker Modal */}';

const previewStart = content.indexOf(previewStartStr);
const previewEnd = content.indexOf(previewEndStr);

if (previewStart === -1 || previewEnd === -1) {
  console.error('Could not find preview bounds');
  process.exit(1);
}

const generateHtmlCode = `
  const v = (val, fallback = '-') => (val && val.trim() !== '' ? val : fallback);
  
  const generateHTML = () => {
    const today = new Date();
    const tglFormatted = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const printSignatureHTML = getPrintSignatureHTML(activeDesa, tglFormatted, formData.namaPejabat, formData.jabatanPejabat, undefined, formData.includeCamat);
    
    return \`
      <!-- KOP SURAT -->
      <div style="border-bottom:3px solid #000;margin-bottom:12px;">
        <div style="display:flex;align-items:flex-start;padding-bottom:6px;margin-bottom:1px;font-family:\${letterFont};">
          <div style="display:flex;width:100%;align-items:center;">
            <div style="width:90px;height:100px;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-right:15px;">
              <img src="\${villageLogo}" style="width:100%;height:100%;object-fit:contain;" />
            </div>
            <div style="text-align:center;flex:1;padding-right:90px;">
              <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">PEMERINTAH KABUPATEN \${activeKabupaten.toUpperCase()}</div>
              <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">KECAMATAN \${activeKecamatan.toUpperCase()}</div>
              <div style="font-weight:900;font-size:26px;text-transform:uppercase;letter-spacing:2px;line-height:1.1;margin:2px 0 3px 0;">DESA \${activeDesa.toUpperCase()}</div>
              <div style="font-size:10.5px;margin-top:4px;text-transform:capitalize;line-height:1.15;margin:2px 0 1px 0;">\${activeAlamat}</div>
              <div style="font-size:10.5px;line-height:1.15;margin:1px 0 0 0;">\${activeKontak}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- JUDUL SURAT -->
      <div style="text-align:center;margin-bottom:15px;">
        <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN KEPEMILIKAN TANAH</h3>
        <p style="margin:2px 0 0 0;font-size:14px;">Nomor : \${v(formData.nomorSurat, '590/.../DS-SKKT/' + today.getFullYear())}</p>
      </div>

      <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
        Yang bertanda tangan di bawah ini Kepala Desa \${activeDesa}, Kecamatan \${activeKecamatan}, Kabupaten \${activeKabupaten}, menerangkan dengan sebenarnya bahwa:
      </p>

      <!-- DATA PENDUDUK -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
        <tr><td style="width:30%;">a. Nama Lengkap</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">\${v(formData.nama)}</strong></td></tr>
        <tr><td>b. NIK</td><td>:</td><td>\${v(formData.nik)}</td></tr>
        <tr><td>c. Pekerjaan</td><td>:</td><td>\${v(formData.pekerjaan)}</td></tr>
        <tr><td style="vertical-align:top;">d. Alamat Domisili</td><td style="vertical-align:top;">:</td><td>\${v(formData.alamat)}</td></tr>
      </table>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">
        Adalah benar-benar pemilik sah atas sebidang tanah yang terletak di <strong>\${v(formData.lokasiTanah, \`Desa \${activeDesa}\`)}</strong> dengan spesifikasi sebagai berikut:
      </p>

      <!-- DATA TANAH -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
        <tr><td style="width:35%;font-weight:bold;">Nomor Persil / Blok</td><td style="width:3%;">:</td><td>\${v(formData.noPersil)}</td></tr>
        <tr><td style="font-weight:bold;">Luas Obyek Tanah</td><td>:</td><td><strong>\${v(formData.luasTanah)}</strong></td></tr>
        <tr><td style="font-weight:bold;">Status Perolehan</td><td>:</td><td>\${v(formData.statusPerolehan)}</td></tr>
        <tr><td style="font-weight:bold;">Koordinat GPS</td><td>:</td><td>\${v(formData.lat)}, \${v(formData.lng)}</td></tr>
        <tr>
          <td style="font-weight:bold;vertical-align:top;">Batas-Batas Obyek</td>
          <td style="vertical-align:top;">:</td>
          <td>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="width:60px;">Utara</td><td style="width:10px;">:</td><td>\${v(formData.batasUtara)}</td></tr>
              <tr><td>Selatan</td><td>:</td><td>\${v(formData.batasSelatan)}</td></tr>
              <tr><td>Timur</td><td>:</td><td>\${v(formData.batasTimur)}</td></tr>
              <tr><td>Barat</td><td>:</td><td>\${v(formData.batasBarat)}</td></tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:25px;font-size:14px;">
        Demikian Surat Keterangan Kepemilikan Tanah ini dibuat dengan sebenarnya agar dapat dipergunakan untuk <strong>\${v(formData.keperluan)}</strong>.
      </p>

      <!-- TANDA TANGAN -->
      \${printSignatureHTML}
    \`;
  };
`;

const newHandleSave = `
  const handleSave = async () => {
    if (!formData.nama || !formData.nik || !formData.luasTanah) {
      showToast('Mohon lengkapi nama pemohon, NIK, dan luas tanah.', 'error');
      return;
    }
    setLoading(true);

    const letterData = {
      nomor: formData.nomorSurat || \`590/\${Date.now().toString().slice(-3)}/DS-SKKT/\${new Date().getFullYear()}\`,
      jenis: 'Surat Keterangan Kepemilikan Tanah (SKKT)',
      nik: formData.nik,
      nama: formData.nama,
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      keperluan: formData.keperluan,
      status: 'Selesai',
      data: formData
    };

    try {
      if (editLetterId) {
        await updateLetterHistory(editLetterId, letterData);
        showToast('Surat SKKT berhasil diperbarui!', 'success');
      } else {
        await addLetterHistory(letterData);
        showToast('Surat SKKT berhasil dibuat dan disimpan ke Arsip!', 'success');
      }

      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\\n');

      const contentHtml = generateHTML();
      
      const printHTML = \`
        <html>
          <head>
            <title>Cetak SKKT - \${formData.nama}</title>
            \${styles}
            <style>
              @page { size: A4; margin: 0 !important; }
              body { 
                margin: 0; 
                padding: 0; 
                background: white; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
              .page { 
                width: 210mm; 
                height: 297mm; 
                margin: 0; 
                box-sizing: border-box; 
                background: white; 
                position: relative; 
                overflow: hidden;
              }
              .printable-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 56px 75px !important;
                box-sizing: border-box !important;
                background: white !important;
                color: black !important;
                box-shadow: none !important;
                border: none !important;
                display: block !important;
                transform: none !important;
                visibility: visible !important;
                font-family: \${letterFont};
                font-size: 13px;
                line-height: 1.5;
              }
              .printable-area * {
                visibility: visible !important;
              }
              @media print {
                body, .page { 
                  width: 210mm; 
                  height: 297mm; 
                }
              }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="printable-area bg-white dark:bg-slate-900 text-black">
                \${contentHtml}
              </div>
            </div>
          </body>
        </html>
      \`;

      if (iframeRef.current) {
        const doc = iframeRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(printHTML);
          doc.close();
          setTimeout(() => {
            try {
              iframeRef.current.contentWindow?.focus();
              iframeRef.current.contentWindow?.print();
            } catch (e) {
              window.print();
            }
          }, 500);
        }
      }

      onBack();
    } catch (e) {
      showToast('Gagal menyimpan surat SKKT', 'error');
    } finally {
      setLoading(false);
    }
  };

  `;

const newPreview = `<div 
            ref={dragProps.ref}
            onMouseDown={dragProps.onMouseDown}
            onMouseLeave={dragProps.onMouseLeave}
            onMouseUp={dragProps.onMouseUp}
            onMouseMove={dragProps.onMouseMove}
            style={{ ...dragProps.style }}
            className="flex-1 bg-slate-200/40 overflow-auto relative flex p-8"
          >
            <div 
              style={{
                width: \`\${794 * previewZoom}px\`,
                height: \`\${1123 * previewZoom}px\`,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                borderRadius: '12px',
                transition: 'width 0.2s ease-out, height 0.2s ease-out'
              }}
              className="bg-white dark:bg-slate-900 m-auto shrink-0 relative"
            >
              <div className="absolute top-6 left-6 w-4 h-4 border-t border-l border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
              <div className="absolute top-6 right-6 w-4 h-4 border-t border-r border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
              <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
              <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>

              <div 
                className="bg-white dark:bg-slate-900 shrink-0"
                style={{ 
                  width: '794px', 
                  height: '1123px', 
                  padding: '56px 75px',
                  transform: \`scale(\${previewZoom})\`,
                  transformOrigin: 'top left',
                  fontFamily: letterFont,
                  fontSize: '13px',
                  lineHeight: '1.45',
                  position: 'relative',
                  color: 'black',
                  boxSizing: 'border-box'
                }}
                dangerouslySetInnerHTML={{ __html: generateHTML() }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Satellite Map Picker Modal */}`;

let newContent = content.substring(0, handleSaveStart) + generateHtmlCode + newHandleSave + content.substring(handleSaveEnd, previewStart) + newPreview + content.substring(previewEnd + previewEndStr.length - 46);

fs.writeFileSync(file, newContent);
console.log('Update Complete');
