const fs = require('fs');
let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

const regexToRemove = /<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">[\s\S]*?<div className="md:col-span-2 space-y-2" style=\{\{ display: "none" \}\}>[\s\S]*?<\/div>\s*<\/div>/;

const replacement = `<div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Jalan / Nama Tempat (Sekarang)</label>
                      <textarea 
                        rows={2}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none"
                        value={formData.alamatSekarang}
                        onChange={(e) => setFormData({...formData, alamatSekarang: e.target.value})}
                        placeholder="Contoh: Jl. Bungur Raya No. 12"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">RT (Sekarang)</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                          value={formData.rtSekarang}
                          onChange={(e) => setFormData({...formData, rtSekarang: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">RW (Sekarang)</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                          value={formData.rwSekarang}
                          onChange={(e) => setFormData({...formData, rwSekarang: e.target.value})}
                        />
                      </div>
                    </div>
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
                </div>`;

content = content.replace(regexToRemove, replacement);

const htmlRegex = /<tr><td style="vertical-align:top;">j\. Alamat Sekarang<\/td><td style="vertical-align:top;">:<\/td><td>\$\{v\(formData\.alamatSekarang\)\} RT\.\$\{v\(formData\.rtSekarang\)\} RW\.\$\{v\(formData\.rwSekarang\)\}<br\/>Desa \$\{cleanStr\(v\(formData\.desaSekarang\), \/\^\(desa\|kelurahan\)\\\\s\+\/i\)\} Kecamatan \$\{cleanStr\(v\(formData\.kecamatanSekarang\), \/\^\(kecamatan\)\\\\s\+\/i\)\}, Kab\. \$\{cleanStr\(v\(formData\.kabupatenSekarang\), \/\^\(kabupaten\|kota\)\\\\s\+\/i\)\}, Provinsi \$\{cleanStr\(v\(formData\.provinsiSekarang\), \/\^\(provinsi\)\\\\s\+\/i\)\}<\/td><\/tr>/;
const htmlReplacement = '<tr><td style="vertical-align:top;">j. Alamat Sekarang</td><td style="vertical-align:top;">:</td><td>${v(formData.alamatSekarang)} RT.${v(formData.rtSekarang)} RW.${v(formData.rwSekarang)}<br/>Desa ${cleanStr(activeDesa, /^(desa|kelurahan)\\s+/i)} Kecamatan ${cleanStr(activeKecamatan, /^kecamatan\\s+/i)}, Kab. ${cleanStr(activeKabupaten, /^(kabupaten|kota)\\s+/i)}</td></tr>';

content = content.replace(htmlRegex, htmlReplacement);

fs.writeFileSync(file, content, 'utf8');
