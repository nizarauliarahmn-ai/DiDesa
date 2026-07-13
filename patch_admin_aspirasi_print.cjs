const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminAspirasi.tsx', 'utf8');

const importMatch = `import { Search, Filter, CheckCircle, Clock, AlertTriangle, Eye, X, MessageSquareText, UploadCloud, Edit2, MessageCircle } from 'lucide-react';`;
const importReplace = `import { Search, Filter, CheckCircle, Clock, AlertTriangle, Eye, X, MessageSquareText, UploadCloud, Edit2, MessageCircle, Printer, Calendar } from 'lucide-react';`;
code = code.replace(importMatch, importReplace);

const stateMatch = `  const [newStatus, setNewStatus] = useState<'Menunggu' | 'Proses' | 'Selesai'>('Menunggu');`;
const stateReplace = `  const [newStatus, setNewStatus] = useState<'Menunggu' | 'Proses' | 'Selesai'>('Menunggu');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');

  const handlePrint = () => {
    let toPrint = [...aspirasiList];
    if (printStartDate) {
      toPrint = toPrint.filter(a => new Date(a.date) >= new Date(printStartDate));
    }
    if (printEndDate) {
      toPrint = toPrint.filter(a => new Date(a.date) <= new Date(printEndDate));
    }

    const printWindow = window.open('', '_blank');
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
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
            th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background-color: #f9fafb; font-weight: 600; color: #374151; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .status { font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase; }
            .status.Selesai { color: #047857; background-color: #d1fae5; }
            .status.Proses { color: #1d4ed8; background-color: #dbeafe; }
            .status.Menunggu { color: #b45309; background-color: #fef3c7; }
            .print-btn { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; margin-bottom: 20px; }
            @media print {
              .print-btn { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">Cetak Dokumen</button>
          <div class="header">
            <h2>Laporan Aspirasi Warga</h2>
            <p class="period">Periode: \${printStartDate || 'Awal'} s/d \${printEndDate || 'Akhir'}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID Tiket</th>
                <th>Tanggal</th>
                <th>Pengirim</th>
                <th>Kategori</th>
                <th>Subjek</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              \${toPrint.map(a => \`
                <tr>
                  <td>\${a.id}</td>
                  <td>\${a.date}</td>
                  <td>\${a.sender}</td>
                  <td style="text-transform: capitalize;">\${a.category}</td>
                  <td>\${a.subject}</td>
                  <td><span class="status \${a.status}">\${a.status}</span></td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    \`;
    printWindow.document.write(html);
    printWindow.document.close();
    setShowPrintModal(false);
  };\n`;
code = code.replace(stateMatch, stateReplace);

const buttonMatch = `        <div>
          <h2 className="text-2xl font-bold text-gray-900">Aspirasi Warga</h2>
          <p className="text-sm font-medium text-gray-500">Kelola dan tindak lanjuti masukan dari masyarakat</p>
        </div>
      </div>`;
const buttonReplace = `        <div>
          <h2 className="text-2xl font-bold text-gray-900">Aspirasi Warga</h2>
          <p className="text-sm font-medium text-gray-500">Kelola dan tindak lanjuti masukan dari masyarakat</p>
        </div>
        <button 
          onClick={() => setShowPrintModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors shadow-sm"
        >
          <Printer size={18} />
          Cetak Laporan
        </button>
      </div>`;
code = code.replace(buttonMatch, buttonReplace);

const modalHtml = `
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Printer size={20} className="text-slate-700" /> Cetak Laporan
              </h3>
              <button 
                onClick={() => setShowPrintModal(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 font-medium">Pilih rentang tanggal aspirasi yang ingin dicetak.</p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block uppercase tracking-wider">Tanggal Mulai</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="date" 
                      value={printStartDate}
                      onChange={(e) => setPrintStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block uppercase tracking-wider">Tanggal Akhir</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="date" 
                      value={printEndDate}
                      onChange={(e) => setPrintEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pl-10 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handlePrint}
                className="px-4 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-600/20"
              >
                Buat Laporan
              </button>
            </div>
          </div>
        </div>
      )}
`;

const returnEndMatch = `    </div>
  );
}`;
const returnEndReplace = `    </div>
${modalHtml}
  );
}`;
code = code.replace(returnEndMatch, returnEndReplace);

fs.writeFileSync('src/components/admin/AdminAspirasi.tsx', code);
