const fs = require('fs');
const path = require('path');

const dir = path.join('C:', 'Users', 'Gambar Ibung', '.gemini', 'antigravity', 'scratch', 'DiDesa', 'src', 'components', 'admin', 'surat');
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx') && f !== 'AdminSuratSDU.tsx');

for (const f of files) {
  const p = path.join(dir, f);
  let code = fs.readFileSync(p, 'utf-8');
  
  // The corrupted string is:
  // <div className="relative">\s*\\n\s*<\/div>
  // Note: Since I inserted "\n              </div>", it is literally the characters '\', 'n', ' ', ...
  // Let's use a regex that matches exactly what was inserted.
  
  // Actually, wait, let's just replace `<div className="relative">\r\n                \\n              </div>`
  
  let newCode = code;
  
  // For most files (Cari Warga)
  const defaultWarga = `<div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Cari NIK atau Nama Warga..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>`;

  const skuWarga = `<div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Cari NIK atau Nama Pemilik..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>`;

  const sphPengikut = `<div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                        type="text"
                        placeholder="Cari NIK atau Nama untuk ditambahkan sebagai pengikut..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        value={searchPengikutQuery}
                        onChange={(e) => setSearchPengikutQuery(e.target.value)}
                      />
                    </div>`;

  const badString = /<div className="relative">\s*\\n\s*<\/div>/g;
  
  let matchCount = 0;
  newCode = newCode.replace(badString, (match, offset) => {
    matchCount++;
    if (f === 'AdminSuratSKU.tsx') {
      return skuWarga;
    }
    if (f === 'AdminSuratSPH.tsx') {
      if (matchCount === 2) {
        return sphPengikut;
      }
    }
    return defaultWarga;
  });

  if (newCode !== code) {
    fs.writeFileSync(p, newCode, 'utf-8');
    console.log('Restored ' + f);
  }
}
