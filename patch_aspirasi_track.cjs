const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/AspirasiWarga.tsx', 'utf8');

const importMatch = `import { saveAspirasi } from '../../utils/aspirasiData';`;
const importReplace = `import { saveAspirasi, getAspirasi, Aspirasi } from '../../utils/aspirasiData';`;
code = code.replace(importMatch, importReplace);

const stateMatch = `  const [formData, setFormData] = useState({
    sender: '',
    category: '',
    subject: '',
    content: ''
  });`;
const stateReplace = `  const [formData, setFormData] = useState({
    sender: '',
    category: '',
    subject: '',
    content: ''
  });
  const [ticketSearch, setTicketSearch] = useState('');
  const [trackedTicket, setTrackedTicket] = useState<Aspirasi | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  
  const handleSearchTicket = () => {
    if (!ticketSearch.trim()) return;
    const allAspirasi = getAspirasi();
    const found = allAspirasi.find(a => a.id.toLowerCase() === ticketSearch.trim().toLowerCase());
    setTrackedTicket(found || null);
    setSearchAttempted(true);
  };`;
code = code.replace(stateMatch, stateReplace);


const trackUiMatch = `            <div className="flex gap-2">
              <input 
                type="text" 
                className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium uppercase" 
                placeholder="TKT-XXXXXX" 
              />
              <button className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 cursor-pointer">
                <Search className="w-5 h-5" />
              </button>
            </div>`;
            
const trackUiReplace = `            <div className="flex gap-2">
              <input 
                type="text" 
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchTicket()}
                className="flex-1 bg-slate-50 rounded-xl border border-slate-200 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm font-medium uppercase" 
                placeholder="TKT-XXXXXX" 
              />
              <button onClick={handleSearchTicket} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-600/20 cursor-pointer">
                <Search className="w-5 h-5" />
              </button>
            </div>
            
            {searchAttempted && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
                {trackedTicket ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{trackedTicket.id}</p>
                        <p className="text-sm font-bold text-slate-900 mt-1">{trackedTicket.subject}</p>
                      </div>
                      <span className={\`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider \${
                        trackedTicket.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' :
                        trackedTicket.status === 'Proses' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }\`}>
                        {trackedTicket.status}
                      </span>
                    </div>
                    
                    {trackedTicket.adminResponse && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-emerald-100 shadow-sm relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                        <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Tanggapan Admin</p>
                        <p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{trackedTicket.adminResponse.text}</p>
                        {trackedTicket.adminResponse.fileName && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-flex">
                            <CheckCircle size={12} />
                            <span>Lampiran Tersedia</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-500 text-center py-2">Tiket tidak ditemukan. Periksa kembali nomor tiket Anda.</p>
                )}
              </div>
            )}`;
            
code = code.replace(trackUiMatch, trackUiReplace);
fs.writeFileSync('src/components/dashboard/AspirasiWarga.tsx', code);
