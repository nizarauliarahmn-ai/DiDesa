const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

// 1. Add new state variables
const targetState = /const \[isPrintingTable, setIsPrintingTable\] = useState\(false\);/;
const newState = `const [isPrintingTable, setIsPrintingTable] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');`;
code = code.replace(targetState, newState);

// 2. Helper parseIndonesianDate
const targetHelper = /const handleSettingsUpdate = \(\) => \{/;
const newHelper = `const parseIndonesianDate = (dateStr: string) => {
    if (!dateStr) return null;
    const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length < 3) return null;
    const day = parseInt(parts[0]);
    const month = months.indexOf(parts[1]);
    const year = parseInt(parts[2]);
    if (isNaN(day) || month === -1 || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  const handleSettingsUpdate = () => {`;
code = code.replace(targetHelper, newHelper);

// 3. filteredSurat logic
const targetFiltered = /const filteredSurat = useMemo\(\(\) => \{\s*let result = suratList;\s*if \(searchQuery\) \{[\s\S]*?\}\s*if \(selectedType\) \{[\s\S]*?\}\s*return result;\s*\}, \[suratList, searchQuery, selectedType\]\);/;
const newFiltered = `const filteredSurat = useMemo(() => {
    let result = suratList;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        (s.nomor && s.nomor.toLowerCase().includes(query)) || 
        (s.nama && s.nama.toLowerCase().includes(query)) ||
        (s.jenis && s.jenis.toLowerCase().includes(query))
      );
    }

    if (selectedType) {
      if (selectedType === 'domisili') result = result.filter(s => (s as any).klasifikasi === 'SKD' || (s.jenis && s.jenis.toLowerCase().includes('domisili')));
      if (selectedType === 'sktm') result = result.filter(s => (s as any).klasifikasi === 'SKTM' || (s.jenis && s.jenis.toLowerCase() === 'sktm'));
      if (selectedType === 'sku') result = result.filter(s => (s as any).klasifikasi === 'SKU' || (s.jenis && s.jenis.toLowerCase().includes('usaha')));
      if (selectedType === 'skph') result = result.filter(s => (s as any).klasifikasi === 'SKPH' || (s.jenis && s.jenis.toLowerCase().includes('penghasilan')));
    }
    
    if (isPrintingTable && (printStartDate || printEndDate)) {
      const start = printStartDate ? new Date(printStartDate) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = printEndDate ? new Date(printEndDate) : null;
      if (end) end.setHours(23, 59, 59, 999);
      
      result = result.filter(s => {
        const d = parseIndonesianDate(s.tanggal);
        if (!d) return true;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    return result;
  }, [suratList, searchQuery, selectedType, isPrintingTable, printStartDate, printEndDate]);`;
code = code.replace(targetFiltered, newFiltered);

// 4. Update handlePrintAll to execute printing, and change cetak button to open modal
const targetPrintBtn = /onClick=\{handlePrintAll\}/;
code = code.replace(targetPrintBtn, 'onClick={() => setShowPrintModal(true)}');

const targetHandlePrint = /const handlePrintAll = \(\) => \{\s*setIsPrintingTable\(true\);\s*setTimeout\(\(\) => \{\s*try \{\s*window\.print\(\);\s*\} catch \(e\) \{\s*setShowPrintWarning\(true\);\s*setTimeout\(\(\) => setShowPrintWarning\(false\), 5000\);\s*\}\s*setIsPrintingTable\(false\);\s*\}, 200\);\s*\};/;
const newHandlePrint = `const handlePrintAll = () => {
    setShowPrintModal(false);
    setIsPrintingTable(true);
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        setShowPrintWarning(true);
        setTimeout(() => setShowPrintWarning(false), 5000);
      }
      setIsPrintingTable(false);
    }, 200);
  };`;
code = code.replace(targetHandlePrint, newHandlePrint);

// 5. Inject Modal HTML
const targetModalLocation = /\{\/\* Table \*\/\}/;
const printModalHtml = `{showPrintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Cetak Daftar Arsip</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1.5">Dari Tanggal</label>
                <input type="date" value={printStartDate} onChange={(e) => setPrintStartDate(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1.5">Sampai Tanggal</label>
                <input type="date" value={printEndDate} onChange={(e) => setPrintEndDate(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <p className="text-xs text-gray-500">* Kosongkan tanggal jika ingin mencetak semua data.</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handlePrintAll} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm">
                <Printer className="w-4 h-4" /> Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}`;
code = code.replace(targetModalLocation, printModalHtml);

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Patched arsip modal print');
