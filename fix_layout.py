import re

with open(r'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old = """              </div>
              </div>
            </div>
<div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, RT.001 RW.002, Desa Wasah Hilir"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => handleAlamatBlur(e.target.value)}
                />
              </div>"""

new = """            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, RT.001 RW.002, Desa Wasah Hilir"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => handleAlamatBlur(e.target.value)}
                />
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RT</label>
                {rtList.length > 0 ? (
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.rt}
                    onChange={(e) => setFormData({...formData, rt: e.target.value})}
                  >
                    <option value="">Pilih RT</option>
                    {rtList.map((rt, i) => <option key={i} value={rt.no}>{rt.no}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.rt}
                    onChange={(e) => setFormData({...formData, rt: e.target.value})}
                    placeholder="Contoh: 001"
                  />
                )}
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RW</label>
                {rwList.length > 0 ? (
                  <select
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.rw}
                    onChange={(e) => setFormData({...formData, rw: e.target.value})}
                  >
                    <option value="">Pilih RW</option>
                    {rwList.map((rw, i) => <option key={i} value={rw.no}>{rw.no}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.rw}
                    onChange={(e) => setFormData({...formData, rw: e.target.value})}
                    placeholder="Contoh: 002"
                  />
                )}
              </div>
            </div>"""

with open(r'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if old in content:
    content = content.replace(old, new)
    with open(r'C:\Users\ASUS\.gemini\antigravity\scratch\DiDesa\src\components\admin\surat\AdminSuratSKTM.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: SKTM updated')
else:
    print('NOT FOUND')
    # Debug: find the old text
    idx = content.find('grid grid-cols-2 gap-4')
    if idx >= 0:
        start = max(0, idx - 100)
        end = min(len(content), idx + 1000)
        snippet = content[start:idx+1000]
        print(f'Found grid at index: {idx}')
        print(snippet[:500])