const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminAspirasi.tsx', 'utf8');

// 1. Change row to be clickable and update the action button
const rowMatch = `<tr key={aspirasi.id} className="hover:bg-gray-50/50 transition-colors">`;
const rowReplace = `<tr key={aspirasi.id} onClick={() => { setSelectedAspirasi(aspirasi); setNewStatus(aspirasi.status); setResponseText(aspirasi.adminResponse?.text || ''); }} className="hover:bg-emerald-50/50 transition-colors cursor-pointer group">`;
code = code.replace(rowMatch, rowReplace);

// if there are other tr, wait, it's inside map, so it will replace only the first one if we don't use regex.
code = code.replace(/<tr key={aspirasi\.id} className="hover:bg-gray-50\/50 transition-colors">/g, rowReplace);

const buttonMatch = `<td className="py-4 px-4 text-center">
                    <button 
                      onClick={() => setSelectedAspirasi(aspirasi)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                      title="Lihat Detail"
                    >
                      <Eye size={18} />
                    </button>
                  </td>`;
const buttonReplace = `<td className="py-4 px-4 text-center">
                    <button 
                      className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Jawab
                    </button>
                  </td>`;
code = code.replace(buttonMatch, buttonReplace);

// 2. We don't need isEditingStatus anymore. Just show the response form.
const oldModalSectionMatch = `                <div>
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
                          Kirim Jawaban
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

const newModalSectionReplace = `                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Saat Ini</p>
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
                  </div>
                  
                  <div className="space-y-4 bg-blue-50/30 p-4 rounded-xl border border-blue-100 mt-4">
                    <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <MessageCircle size={16} /> Form Jawaban & Tindak Lanjut
                    </h4>
                    
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
                    
                    <div className="pt-2">
                      <button 
                        onClick={handleUpdateStatus}
                        className="w-full py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-600/20"
                      >
                        Kirim Jawaban
                      </button>
                    </div>
                  </div>
                </div>`;
code = code.replace(oldModalSectionMatch, newModalSectionReplace);

// Also we should ensure we remove the setIsEditingStatus state.
// We can just leave the state there, but let's replace handleUpdateStatus to not set it.
const updateMatch2 = `    showToast('Status aspirasi berhasil diperbarui', 'success');
    setSelectedAspirasi({ 
      ...selectedAspirasi, 
      status: newStatus,
      adminResponse: responseText ? { text: responseText, fileName: proofFile ? proofFile.name : null, date: new Date().toISOString() } : selectedAspirasi.adminResponse
    });
    setIsEditingStatus(false);
    setProofFile(null);
    setResponseText('');
  };`;
const updateReplace2 = `    showToast('Status aspirasi berhasil diperbarui', 'success');
    setSelectedAspirasi({ 
      ...selectedAspirasi, 
      status: newStatus,
      adminResponse: responseText ? { text: responseText, fileName: proofFile ? proofFile.name : null, date: new Date().toISOString() } : selectedAspirasi.adminResponse
    });
    setProofFile(null);
  };`;
code = code.replace(updateMatch2, updateReplace2);

fs.writeFileSync('src/components/admin/AdminAspirasi.tsx', code);
