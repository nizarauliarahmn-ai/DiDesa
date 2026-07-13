const fs = require('fs');
let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add fields to formData
content = content.replace(/alamatSekarang: '',/, "alamatSekarang: '',\n    rtSekarang: '001',\n    rwSekarang: '001',\n    desaSekarang: '',\n    kecamatanSekarang: '',\n    kabupatenSekarang: '',\n    provinsiSekarang: '',");

// 2. Fix the html rendering of Alamat Sekarang
const htmlRegex = /<tr><td style="vertical-align:top;">j\. Alamat Sekarang<\/td><td style="vertical-align:top;">:<\/td><td>\$\{v\(formData\.alamatSekarang\)\}<\/td><\/tr>/;
const htmlReplacement = '<tr><td style="vertical-align:top;">j. Alamat Sekarang</td><td style="vertical-align:top;">:</td><td>${v(formData.alamatSekarang)} RT.${v(formData.rtSekarang)} RW.${v(formData.rwSekarang)}<br/>Desa ${cleanStr(v(formData.desaSekarang), /^(desa|kelurahan)\\s+/i)} Kecamatan ${cleanStr(v(formData.kecamatanSekarang), /^kecamatan\\s+/i)}, Kab. ${cleanStr(v(formData.kabupatenSekarang), /^(kabupaten|kota)\\s+/i)}, Provinsi ${cleanStr(v(formData.provinsiSekarang), /^provinsi\\s+/i)}</td></tr>';
content = content.replace(htmlRegex, htmlReplacement);

// 3. Update UI to add inputs for RT/RW and Desa/Kec/Kab/Prov
const uiRegex = /<div className="md:col-span-2 space-y-2">\s*<label className="text-sm font-bold text-slate-700">Alamat Sekarang<\/label>\s*<textarea[\s\S]*?<\/textarea>\s*<p[\s\S]*?<\/p>\s*<\/div>/;
const uiReplacement = `<div className="md:col-span-2 space-y-2">
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Desa/Kelurahan (Sekarang)</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        value={formData.desaSekarang}
                        onChange={(e) => setFormData({...formData, desaSekarang: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Kecamatan (Sekarang)</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        value={formData.kecamatanSekarang}
                        onChange={(e) => setFormData({...formData, kecamatanSekarang: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Kab/Kota (Sekarang)</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        value={formData.kabupatenSekarang}
                        onChange={(e) => setFormData({...formData, kabupatenSekarang: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Provinsi (Sekarang)</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        value={formData.provinsiSekarang}
                        onChange={(e) => setFormData({...formData, provinsiSekarang: e.target.value})}
                      />
                    </div>
                  </div>`;
content = content.replace(uiRegex, uiReplacement);

// 4. Update the classification target from SKD to SDP
content = content.replace(/c\.klasifikasi === 'SKD'/g, "(c.klasifikasi === 'SDP' || c.klasifikasi === 'SKD' || c.klasifikasi === 'SKDPR')");

fs.writeFileSync(file, content, 'utf8');
