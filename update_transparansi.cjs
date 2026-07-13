const fs = require('fs');

let content = fs.readFileSync('src/components/dashboard/TransparansiDana.tsx', 'utf-8');

const hookInsert = `
  const [apbdesData, setApbdesData] = useState<any>(() => {
    const saved = localStorage.getItem('didesa_apbdes_data');
    return saved ? JSON.parse(saved) : null;
  });

  React.useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('didesa_apbdes_data');
      if (saved) {
        setApbdesData(JSON.parse(saved));
      }
    };
    window.addEventListener('apbdes_data_updated', handleUpdate);
    return () => window.removeEventListener('apbdes_data_updated', handleUpdate);
  }, []);
`;

content = content.replace('const [searchQuery, setSearchQuery] = useState(\'\');', 'const [searchQuery, setSearchQuery] = useState(\'\');' + hookInsert);

// Now change the UI if apbdesData exists to show that info too or override it.
// I'll prepend the AI Extracted APBDes at the top of the content.
const aiPreviewHTML = `
      {apbdesData && (
        <div className="mb-10 bg-emerald-50 rounded-2xl p-6 border-2 border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-md">
                <PieChart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 leading-tight">Data APBDes Terekstrak AI (Tahun {apbdesData.tahun})</h3>
                <p className="text-sm text-emerald-800 font-medium">Bersumber dari Laporan Siskeudes: {apbdesData.fileName}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100">
                <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Total Pendapatan</p>
                <h4 className="text-2xl font-extrabold text-emerald-700">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(apbdesData.pendapatan)}</h4>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100">
                <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Total Belanja</p>
                <h4 className="text-2xl font-extrabold text-rose-600">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(apbdesData.belanja)}</h4>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-emerald-100">
                <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Pembiayaan</p>
                <h4 className="text-2xl font-extrabold text-blue-600">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(apbdesData.pembiayaan)}</h4>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-gray-800 mb-4">Rincian Bidang Belanja</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apbdesData.kategori.map((kat: any, i: number) => (
                  <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100">
                    <p className="font-bold text-gray-700 text-sm mb-2">{kat.nama}</p>
                    <p className="text-lg font-extrabold text-gray-900 mb-2">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(kat.nilai)}</p>
                    <div className="w-full bg-slate-100 h-2 rounded-full">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{width: \`\${kat.persen}%\`}}></div>
                    </div>
                    <p className="text-right text-xs font-bold text-emerald-600 mt-1">{kat.persen}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('{/* Stats Cards */}', aiPreviewHTML + '\n      {/* Stats Cards */}');

fs.writeFileSync('src/components/dashboard/TransparansiDana.tsx', content);
