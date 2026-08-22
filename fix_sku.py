import re

with open('C:\\Users\\ASUS\\.gemini\\antigravity\\scratch\\DiDesa\\src\\components\\admin\\surat\\AdminSuratSKU.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The old pattern - using regex with flexible whitespace
old_pattern = re.compile(r'''
              </div>
                </div>
<div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                  <textarea 
                    rows=\{2\}
                    placeholder="Contoh: Jl\. Keramat, RT\.001 RW\.002, Desa Wasah Hilir"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                    value=\{formData\.alamat\}
                    onChange=\{\(e\) => setFormData\(prev => \(\{\.\.\.prev, alamat: e\.target\.value \}\)\}\)\}
                    onBlur=\{\(e\) => \{
    const val = e\.target\.value;
    const parsed = parseAddress\(val\);
    setFormData\(prev => \(\{
      \.\.\.prev,
      alamat: parsed\.cleanAddress,
      \.\.\.\(parsed\.rt \? \{ rt: parsed\.rt \} : \{\}\),
      \.\.\.\(parsed\.rw \? \{ rw: parsed\.rw \} : \{\}\)
    \}\)\);\s*
  \}\}
                  />
                </div>
              </div>
            </div>
''', re.VERBOSE | re.DOTALL)

new_text = """            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, RT.001 RW.002, Desa Wasah Hilir"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => {
    const val = e.target.value;
    const parsed = parseAddress(val);
    setFormData(prev => ({
      ...prev,
      alamat: parsed.cleanAddress,
      ...(parsed.rt ? { rt: parsed.rt } : {}),
      ...(parsed.rw ? { rw: parsed.rw } : {})
    }));
  }}
                  />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
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

with open('C:\\Users\\ASUS\\.gemini\\antigravity\\scratch\\DiDesa\\src\\components\\admin\\surat\\AdminSuratSKU.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Try exact match first
old_exact = '''              </div>
                </div>
<div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                  <textarea 
                    rows={2}
                    placeholder="Contoh: Jl. Keramat, RT.001 RW.002, Desa Wasah Hilir"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                    value={formData.alamat}
                    onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                    onBlur={(e) => {
    const val = e.target.value;
    const parsed = parseAddress(val);
    setFormData(prev => ({
      ...prev,
      alamat: parsed.cleanAddress,
      ...(parsed.rt ? { rt: parsed.rt } : {}),
      ...(parsed.rw ? { rw: parsed.rw } : {})
    });
  }}
                  />
                </div>
              </div>
            </div'''

new_text = '''            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, RT.001 RW.002, Desa Wasah Hilir"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => {
    const val = e.target.value;
    const parsed = parseAddress(val);
    setFormData(prev => ({
      ...prev,
      alamat: parsed.cleanAddress,
      ...(parsed.rt ? { rt: parsed.rt } : {}),
      ...(parsed.rw ? { rw: parsed.rw } : {})
    }));
  }}
                  />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
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
            </div>'''

with open('C:\\Users\\ASUS\\.gemini\\antigravity\\scratch\\DiDesa\\src\\components\\admin\\surat\\AdminSuratSKU.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

if old_exact in content:
    content = content.replace(old_exact, new_text)
    with open('C:\\Users\\ASUS\\.gemini\\antigravity\\scratch\\DiDesa\\src\\components\\admin\\surat\\AdminSuratSKU.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: SKTM updated via exact match')
else:
    print('NOT FOUND - trying regex...')
    # Try regex with flexible whitespace
    pattern = re.compile(r'              </div>\s*</div>\s*<div className="md:col-span-2 space-y-2">\s*<label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>\s*<textarea\s+rows=\{2\}\s+placeholder="Contoh: Jl\. Keramat, RT\.001 RW\.002, Desa Wasah Hilir"\s+className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"\s+value=\{formData\.alamat\}\s*onChange=\{\(e\) => setFormData\(prev => \(\{\.\.\.prev, alamat: e\.target\.value \}\)\}\)\}\s*onBlur=\{\(e\) => \{\s*const val = e\.target\.value;\s*const parsed = parseAddress\(val\);\s*setFormData\(prev => \{\s*\.\.\.prev,\s*alamat: parsed\.cleanAddress,\s*\.\.\.\(parsed\.rt \? \{ rt: parsed\.rt \} : \{\}\)\s*,\s*\.\.\.\(parsed\.rw \? \{ rw: parsed\.rw \} : \{\}\)\s*\}\s*\}\);\s*\}\}\s*\}\s*/></textarea>\s*</div>\s*</div>\s*</div>', re.DOTALL)
    
    if re.search(pattern, content):
        content = pattern.sub('''            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                <textarea 
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, RT.001 RW.002, Desa Wasah Hilir"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                  value={formData.alamat}
                  onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => {
    const val = e.target.value;
    const parsed = parseAddress(val);
    setFormData(prev => ({
      ...prev,
      alamat: parsed.cleanAddress,
      ...(parsed.rt ? { rt: parsed.rt } : {}),
      ...(parsed.rw ? { rw: parsed.rw } : {})
    }));
  }}
                  />
              </div>
              <div className="space-y-2">
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
              <div className="space-y-2">
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
            </div>''', content, flags=re.DOTALL)
        with open('C:\\Users\\ASUS\\.gemini\\antigravity\\scratch\\DiDesa\\src\\components\\admin\\surat\\AdminSuratSKU.tsx', 'w', encoding='utf-8') as f:
            f.write(content)
        print('SUCCESS: SKU updated via regex')
    else:
        print('NOT FOUND - even with regex')