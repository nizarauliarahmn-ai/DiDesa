const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminAspirasi.tsx', 'utf8');

// We want to replace the `handlePrint` logic to just call `window.print()`
const handlePrintOld = `  const handlePrint = () => {
    let toPrint = [...aspirasiList];
    if (printStartDate) {
      toPrint = toPrint.filter(a => new Date(a.date) >= new Date(printStartDate));
    }
    if (printEndDate) {
      toPrint = toPrint.filter(a => new Date(a.date) <= new Date(printEndDate));
    }
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const printWindow = iframe.contentWindow;
    if (!printWindow) return;

    const html = \`
      <html>
        <head>
          <title>Laporan Aspirasi Warga</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #111827; }
            .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
            h2 { margin: 0 0 10px 0; font-size: 24px; }
            p.period { color: #4b5563; font-size: 14px; margin: 0; }
            table { w\idth: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
            th { font-weight: bold; color: #374151; background-color: #f9fafb; }
            .status { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Laporan Aspirasi & Pengaduan Warga</h2>
            <p class="period">Periode: \${printStartDate || 'Awal'} s/d \${printEndDate || 'Akhir'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Pengirim</th>
                <th>Kategori</th>
                <th>Pesan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              \${toPrint.map(a => \`
                <tr>
                  <td>\${new Date(a.date).toLocaleDateString('id-ID')}</td>
                  <td>\${a.sender}</td>
                  <td>\${a.category}</td>
                  <td>\${a.message}</td>
                  <td class="status">\${a.status}</td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    \`;
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      // Remove iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
    
    setShowPrintModal(false);
  };`;

const handlePrintNew = `  const handlePrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        showToast('Fasilitas print diblokir oleh browser.', 'error');
      }
    }, 100);
  };

  const getPrintableData = () => {
    let toPrint = [...aspirasiList];
    if (printStartDate) {
      toPrint = toPrint.filter(a => new Date(a.date) >= new Date(printStartDate));
    }
    if (printEndDate) {
      toPrint = toPrint.filter(a => new Date(a.date) <= new Date(printEndDate));
    }
    return toPrint;
  };
`;
code = code.replace(handlePrintOld, handlePrintNew);
// Note: w\idth to width fix above is just escaping. 

// We also need to add the hidden print section and styles at the root.
const returnMatch = `  return (
    <div className="space-y-6 pb-24">`;
const returnReplacement = `  return (
    <div className="space-y-6 pb-24 print:pb-0">
      <style type="text/css" media="print">
        {\`
          @page { size: A4 portrait; margin: 15mm; }
          body * { visibility: hidden !important; }
          #aspirasi-print-section, #aspirasi-print-section * { visibility: visible !important; }
          #aspirasi-print-section {
            position: absolute; left: 0; top: 0; width: 100%;
          }
          .no-print { display: none !important; }
        \`}
      </style>
      
      {/* Hidden Print Area */}
      <div id="aspirasi-print-section" className="hidden print:block w-full text-black bg-white">
        <div className="text-center mb-8 pb-4 border-b-2 border-gray-200">
          <h2 className="text-2xl font-bold mb-2">Laporan Aspirasi & Pengaduan Warga</h2>
          <p className="text-sm text-gray-600">Periode: {printStartDate || 'Awal'} s/d {printEndDate || 'Akhir'}</p>
        </div>
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="py-3 px-4 font-bold text-gray-900">Tanggal</th>
              <th className="py-3 px-4 font-bold text-gray-900">Pengirim</th>
              <th className="py-3 px-4 font-bold text-gray-900">Kategori</th>
              <th className="py-3 px-4 font-bold text-gray-900">Pesan</th>
              <th className="py-3 px-4 font-bold text-gray-900">Status</th>
            </tr>
          </thead>
          <tbody>
            {getPrintableData().map((a, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-3 px-4 align-top whitespace-nowrap">{new Date(a.date).toLocaleDateString('id-ID')}</td>
                <td className="py-3 px-4 align-top whitespace-nowrap font-medium">{a.sender}</td>
                <td className="py-3 px-4 align-top whitespace-nowrap">{a.category}</td>
                <td className="py-3 px-4 align-top">{a.message}</td>
                <td className="py-3 px-4 align-top font-bold whitespace-nowrap">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>`;

code = code.replace(returnMatch, returnReplacement);
fs.writeFileSync('src/components/admin/AdminAspirasi.tsx', code);
