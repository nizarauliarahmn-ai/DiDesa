const fs = require('fs');
let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add to formData
content = content.replace(/keperluan: 'Administrasi Kependudukan',/, "keperluan: 'Administrasi Kependudukan',\n    sifatDomisili: 'Menetap',");

// 2. Add to UI
const formRegex = /<div className="md:col-span-2 space-y-2">\s*<label className="text-sm font-bold text-slate-700">Alamat Sekarang<\/label>/;
const uiReplacement = `<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-slate-700">Alamat Sekarang</label>
                    <textarea 
                      rows={2}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                      value={formData.alamatSekarang}
                      onChange={(e) => setFormData({...formData, alamatSekarang: e.target.value})}
                      placeholder="Contoh: Jl. Bungur RT 04 RW 02 Desa Wasah Hilir"
                    />
                    <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Tuliskan secara lengkap alamat domisili sekarang.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Sifat Domisili</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none"
                      value={formData.sifatDomisili}
                      onChange={(e) => setFormData({...formData, sifatDomisili: e.target.value})}
                    >
                      <option value="Menetap">Menetap</option>
                      <option value="Sementara">Sementara</option>
                    </select>
                    <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Status kependudukan saat ini.</p>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2" style={{ display: "none" }}>
                  <label className="text-sm font-bold text-slate-700">Alamat Sekarang</label>`;
content = content.replace(formRegex, uiReplacement);

// 3. Add to generateHTML
const htmlRegex = /Berdasarkan surat pernyataan dan keterangan yang dibuat oleh yang bersangkutan, nama tersebut di atas menyatakan dengan sadar bahwa ia memang <strong style="text-transform:uppercase;">BERDOMISILI<\/strong> di alamat sekarang tersebut\./;
const htmlReplacement = 'Berdasarkan surat pernyataan dan keterangan yang dibuat oleh yang bersangkutan, nama tersebut di atas menyatakan dengan sadar bahwa ia memang berstatus <strong style="text-transform:uppercase;">DOMISILI ${v(formData.sifatDomisili).toUpperCase()}</strong> di alamat sekarang tersebut.';
content = content.replace(htmlRegex, htmlReplacement);

// 4. Change addLetterHistory jenis from SKTM to SKD
content = content.replace(/jenis: 'SKTM'/g, "jenis: 'SKD'");
content = content.replace(/category: 'SKTM'/g, "category: 'SKD'");

fs.writeFileSync(file, content, 'utf8');
