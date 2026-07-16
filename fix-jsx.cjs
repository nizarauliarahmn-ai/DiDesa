const fs = require('fs');
const file = 'C:/Users/Gambar Ibung/.gemini/antigravity/scratch/DiDesa/src/components/admin/surat/AdminSuratSKL.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix handleSave payload
content = content.replace(/pelaporData,\s*rsData,/, 'saksi1Data,\n      saksi2Data,');

// 2. Fix handleSave initial load (useEffect)
content = content.replace(/setPelaporData\(data\.pelaporData \|\| pelaporData\);\s*setRsData\(data\.rsData \|\| rsData\);/, 'setSaksi1Data(data.saksi1Data || saksi1Data);\n                    setSaksi2Data(data.saksi2Data || saksi2Data);');

// 3. Replace the JSX form for Pelapor and RS
// We need to carefully find the start of {/* Data Pelapor (Opsional) */} and end of the RS section.
const startMarker = '{/* Data Pelapor (Opsional) */}';
const startIndex = content.indexOf(startMarker);

// Find Pejabat section, which is right after RS section
const endMarker = '{/* Pejabat Penandatangan */}';
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const saksiForm = `
            {/* Saksi 1 */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Saksi 1</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                  <input type="text" placeholder="16 digit NIK" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.nik} onChange={(e) => setSaksi1Data({...saksi1Data, nik: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input type="text" placeholder="Nama lengkap" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.nama} onChange={(e) => setSaksi1Data({...saksi1Data, nama: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input type="text" placeholder="Tempat Lahir" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.tempatLahir} onChange={(e) => setSaksi1Data({...saksi1Data, tempatLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="text" placeholder="Misal: 05 Maret 1988" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.tanggalLahir} onChange={(e) => setSaksi1Data({...saksi1Data, tanggalLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <input type="text" placeholder="Pekerjaan" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.pekerjaan} onChange={(e) => setSaksi1Data({...saksi1Data, pekerjaan: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat</label>
                  <textarea rows={2} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none" value={saksi1Data.alamat} onChange={(e) => setSaksi1Data({...saksi1Data, alamat: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Saksi 2 */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Saksi 2</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                  <input type="text" placeholder="16 digit NIK" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.nik} onChange={(e) => setSaksi2Data({...saksi2Data, nik: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input type="text" placeholder="Nama lengkap" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.nama} onChange={(e) => setSaksi2Data({...saksi2Data, nama: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input type="text" placeholder="Tempat Lahir" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.tempatLahir} onChange={(e) => setSaksi2Data({...saksi2Data, tempatLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="text" placeholder="Misal: 12 Januari 1991" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.tanggalLahir} onChange={(e) => setSaksi2Data({...saksi2Data, tanggalLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <input type="text" placeholder="Pekerjaan" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.pekerjaan} onChange={(e) => setSaksi2Data({...saksi2Data, pekerjaan: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat</label>
                  <textarea rows={2} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none" value={saksi2Data.alamat} onChange={(e) => setSaksi2Data({...saksi2Data, alamat: e.target.value})} />
                </div>
              </div>
            </div>\n\n            `;
  content = content.slice(0, startIndex) + saksiForm + content.slice(endIndex);
  fs.writeFileSync(file, content);
  console.log('UI forms correctly replaced this time.');
} else {
  console.log('Could not find markers');
}
