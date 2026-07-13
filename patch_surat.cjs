const fs = require('fs');

const files = [
  'src/components/admin/surat/AdminSuratSKTM.tsx',
  'src/components/admin/surat/AdminSuratSPH.tsx',
  'src/components/admin/surat/AdminSuratSKPH.tsx',
  'src/components/admin/surat/AdminSuratSKM.tsx',
  'src/components/admin/surat/AdminSuratSKU.tsx',
  'src/components/admin/surat/AdminSuratNikah.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Add includeCamat to default formData
  if (!content.includes('includeCamat: false')) {
    content = content.replace(/jabatanPejabat:\s*'Kepala Desa',/g, "jabatanPejabat: 'Kepala Desa',\n    includeCamat: false,");
  }

  // Update getPrintSignatureHTML call
  // Since we already ran it once but the replacement regex might not have worked perfectly because of missing comma:
  if (!content.includes('formData.includeCamat')) {
    content = content.replace(/(\(\) => \{[^}]+\}\)\(\))\n\s*\)/g, "$1,\n        formData.includeCamat\n      )");
  }

  const checkboxUI = `
                </div>
                
                <div className="mt-6 pt-6 border-t border-amber-100">
                  <label className="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors">
                    <input 
                      type="checkbox"
                      checked={formData.includeCamat}
                      onChange={(e) => setFormData({...formData, includeCamat: e.target.checked})}
                      className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 text-sm">Tambahkan Kolom Mengetahui Camat</div>
                      <div className="text-xs text-slate-500 mt-0.5">Gunakan format 2 tanda tangan (Camat di sebelah kiri)</div>
                    </div>
                  </label>
                </div>

                <p className="mt-4 text-[10px] text-amber-700 font-medium italic">`;
  
  if (!content.includes('Tambahkan Kolom Mengetahui Camat')) {
    content = content.replace(/<\/div>\s*<p className="mt-4 text-\[10px\] text-amber-700 font-medium italic">/g, checkboxUI);
  }

  fs.writeFileSync(file, content, 'utf8');
}
