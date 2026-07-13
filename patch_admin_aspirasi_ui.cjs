const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminAspirasi.tsx', 'utf8');

const importMatch = `import { Search, Filter, CheckCircle, Clock, AlertTriangle, Eye, X, MessageSquareText, UploadCloud, Edit2 } from 'lucide-react';
import { getAspirasi, updateAspirasiStatus, Aspirasi } from '../../utils/aspirasiData';`;
const importReplace = `import { Search, Filter, CheckCircle, Clock, AlertTriangle, Eye, X, MessageSquareText, UploadCloud, Edit2, MessageCircle } from 'lucide-react';
import { getAspirasi, updateAspirasiStatus, Aspirasi } from '../../utils/aspirasiData';`;
code = code.replace(importMatch, importReplace);


const stateMatch = `  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);`;
const stateReplace = `  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState<'Menunggu' | 'Proses' | 'Selesai'>('Menunggu');`;
code = code.replace(stateMatch, stateReplace);

const updateFnMatch = `  const handleUpdateStatus = (newStatus: 'Menunggu' | 'Proses' | 'Selesai') => {
    if (!selectedAspirasi) return;
    
    if (newStatus === 'Selesai' && selectedAspirasi.category === 'pengaduan' && !proofFile) {
      showToast('Laporan memerlukan bukti penanganan untuk diselesaikan', 'error');
      return;
    }
    
    updateAspirasiStatus(selectedAspirasi.id, newStatus);
    showToast('Status aspirasi berhasil diperbarui', 'success');
    setSelectedAspirasi({ ...selectedAspirasi, status: newStatus });
    setIsEditingStatus(false);
    setProofFile(null);
  };`;
const updateFnReplace = `  const handleUpdateStatus = () => {
    if (!selectedAspirasi) return;
    
    updateAspirasiStatus(selectedAspirasi.id, newStatus, responseText ? {
      text: responseText,
      fileName: proofFile ? proofFile.name : null
    } : undefined);
    
    showToast('Status aspirasi berhasil diperbarui', 'success');
    setSelectedAspirasi({ 
      ...selectedAspirasi, 
      status: newStatus,
      adminResponse: responseText ? { text: responseText, fileName: proofFile ? proofFile.name : null, date: new Date().toISOString() } : selectedAspirasi.adminResponse
    });
    setIsEditingStatus(false);
    setProofFile(null);
    setResponseText('');
  };`;
code = code.replace(updateFnMatch, updateFnReplace);


const detailsSection = `                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Saat Ini</p>
                    {!isEditingStatus && (
                      <button onClick={() => setIsEditingStatus(true)} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700">
                        <Edit2 size={12} /> Edit Status
                      </button>
                    )}
                  </div>
                  
                  {isEditingStatus ? (
                    <div className="space-y-4">
                      <select 
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                        value={selectedAspirasi.status}
                        onChange={(e) => handleUpdateStatus(e.target.value as any)}
                      >
                        <option value="Menunggu">Menunggu</option>
                        <option value="Proses">Diproses</option>
                        <option value="Selesai">Selesai Ditangani</option>
                      </select>
                      
                      {selectedAspirasi.category === 'pengaduan' && (
                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                          <p className="text-xs font-bold text-blue-800 mb-2">Upload Bukti Penanganan (Wajib untuk Selesai)</p>
                          <label className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                            <UploadCloud size={16} className="text-blue-500" />
                            <span className="text-xs font-bold text-blue-700">
                              {proofFile ? proofFile.name : 'Pilih Foto Bukti'}
                            </span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                              if (e.target.files && e.target.files[0]) setProofFile(e.target.files[0]);
                            }} />
                          </label>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsEditingStatus(false)}
                          className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className={\`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider \${
                      selectedAspirasi.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      selectedAspirasi.status === 'Proses' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }\`}>
                      {selectedAspirasi.status === 'Selesai' ? <CheckCircle size={14} /> : 
                       selectedAspirasi.status === 'Proses' ? <Clock size={14} /> : 
                       <AlertTriangle size={14} />}
                      {selectedAspirasi.status}
                    </span>
                  )}
                </div>`;
                
const newDetailsSection = `                {selectedAspirasi.adminResponse && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tanggapan Admin</p>
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                      <p className="text-sm font-medium text-emerald-900 whitespace-pre-wrap">{selectedAspirasi.adminResponse.text}</p>
                      {selectedAspirasi.adminResponse.fileName && (
                        <div className="flex items-center gap-2 p-2 bg-white/60 border border-emerald-200/50 rounded-lg inline-flex">
                          <CheckCircle size={14} className="text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-800">{selectedAspirasi.adminResponse.fileName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Saat Ini</p>
                    {!isEditingStatus && (
                      <button onClick={() => {
                        setNewStatus(selectedAspirasi.status);
                        setIsEditingStatus(true);
                      }} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg">
                        <MessageCircle size={14} /> Jawab Aspirasi
                      </button>
                    )}
                  </div>
                  
                  {isEditingStatus ? (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200 mt-3">
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-1 block">Ubah Status</label>
                        <select 
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value as any)}
                        >
                          <option value="Menunggu">Menunggu</option>
                          <option value="Proses">Diproses</option>
                          <option value="Selesai">Selesai Ditangani</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-1 block">Tanggapan/Jawaban (Opsional)</label>
                        <textarea
                          placeholder="Ketik tanggapan Anda di sini..."
                          className="w-full border border-gray-300 rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white min-h-[100px] resize-none"
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                        ></textarea>
                      </div>

                      <div className="pt-2">
                        <p className="text-xs font-bold text-gray-700 mb-2">Lampiran Foto/Dokumen (Opsional)</p>
                        <label className="flex items-center justify-center gap-2 p-3 bg-white border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <UploadCloud size={16} className="text-gray-500" />
                          <span className="text-xs font-bold text-gray-600">
                            {proofFile ? proofFile.name : 'Pilih Berkas'}
                          </span>
                          <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) setProofFile(e.target.files[0]);
                          }} />
                        </label>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <button 
                          onClick={() => setIsEditingStatus(false)}
                          className="flex-1 py-2.5 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Batal
                        </button>
                        <button 
                          onClick={handleUpdateStatus}
                          className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                        >
                          Simpan Jawaban
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className={\`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider \${
                      selectedAspirasi.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      selectedAspirasi.status === 'Proses' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }\`}>
                      {selectedAspirasi.status === 'Selesai' ? <CheckCircle size={14} /> : 
                       selectedAspirasi.status === 'Proses' ? <Clock size={14} /> : 
                       <AlertTriangle size={14} />}
                      {selectedAspirasi.status}
                    </span>
                  )}
                </div>`;

code = code.replace(detailsSection, newDetailsSection);

fs.writeFileSync('src/components/admin/AdminAspirasi.tsx', code);
