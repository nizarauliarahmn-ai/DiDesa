const fs = require('fs');

let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Keperluan block with Alamat Sekarang and Kewarganegaraan
const formUIRegex = /<div className="md:col-span-2 space-y-2">\s*<label className="text-sm font-bold text-slate-700">Keperluan Surat \(Diberikan Untuk\.\.\.\)<\/label>[\s\S]*?<\/div>/;

const replacement = `<div className="md:col-span-1 space-y-2">
                  <label className="text-sm font-bold text-slate-700">Kewarganegaraan</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none"
                    value={formData.kewarganegaraan}
                    onChange={(e) => setFormData({...formData, kewarganegaraan: e.target.value})}
                  >
                    <option value="Indonesia">Indonesia</option>
                    <option value="Asing">Asing</option>
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700">Alamat Sekarang</label>
                  <textarea 
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                    value={formData.alamatSekarang}
                    onChange={(e) => setFormData({...formData, alamatSekarang: e.target.value})}
                    placeholder="Contoh: Jl. Bungur RT 04 RW 02 Desa Wasah Hilir Kecamatan Simpur, Kabupaten Hulu Sungai Selatan."
                  />
                  <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Tuliskan secara lengkap alamat domisili sekarang.</p>
                </div>`;

content = content.replace(formUIRegex, replacement);

fs.writeFileSync(file, content, 'utf8');
