const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratSKBM.tsx', 'utf8');

const targetAlamat = /<div className="space-y-2 col-span-1 md:col-span-2">\s*<label className="text-sm font-bold text-slate-700">Alamat Lengkap<\/label>\s*<textarea \s*className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"\s*rows=\{3\}\s*value=\{formData\.alamat\}\s*onChange=\{\(e\) => setFormData\(\{\.\.\.formData, alamat: e\.target\.value\}\)\}\s*\/>\s*<\/div>/g;

const newAlamatAndKeperluan = `<div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Alamat Lengkap</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    rows={3}
                    value={formData.alamat}
                    onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                  />
                </div>
                
                {/* KEPERLUAN SURAT */}
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700">Keperluan Surat (Diberikan Untuk...)</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Bantuan Beasiswa"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    value={formData.keperluan}
                    onChange={(e) => setFormData({...formData, keperluan: e.target.value})}
                  />
                  <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Tuliskan secara spesifik tujuan pembuatan surat ini.</p>
                </div>`;

code = code.replace(targetAlamat, newAlamatAndKeperluan);

fs.writeFileSync('src/components/admin/surat/AdminSuratSKBM.tsx', code);
console.log('Added keperluan field back');
