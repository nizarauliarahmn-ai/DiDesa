const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratSKBM.tsx', 'utf8');

const targetUI = /<div className="space-y-2">\s*<label className="text-sm font-bold text-slate-700">Keperluan Surat \(Diberikan Untuk\.\.\.\)<\/label>\s*<input\s*type="text"\s*placeholder="Contoh: Bantuan Beasiswa"\s*className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"\s*value=\{formData\.keperluan\}\s*onChange=\{\(e\) => setFormData\(\{\.\.\.formData, keperluan: e\.target\.value\}\)\}\s*\/>\s*<p className="mt-1 text-\[10px\] text-emerald-600 font-medium">\* Tuliskan secara spesifik tujuan pembuatan surat ini\.\<\/p>\s*<\/div>/g;

code = code.replace(targetUI, '');

fs.writeFileSync('src/components/admin/surat/AdminSuratSKBM.tsx', code);
console.log('Removed keperluan UI');
