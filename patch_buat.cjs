const fs = require('fs');
let file = 'src/components/admin/surat/AdminSuratBuat.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('const [includeCamat, setIncludeCamat] = useState(false);')) {
  content = content.replace(/const \[roleKades, setRoleKades\] = useState\('Kepala Desa'\);/g, "const [roleKades, setRoleKades] = useState('Kepala Desa');\n  const [includeCamat, setIncludeCamat] = useState(false);");
}

if (!content.includes('includeCamatOverride?: boolean')) {
  content = content.replace(/const renderReactSignature = \(desaName: string, tglFormatted: string, namaPejabat: string, jabatanPejabat: string, nipPejabat\?: string\) => \{/g, "const renderReactSignature = (desaName: string, tglFormatted: string, namaPejabat: string, jabatanPejabat: string, nipPejabat?: string, includeCamatOverride?: boolean) => {");
  content = content.replace(/const sig = getReactSignaturePreview\(desaName, tglFormatted, namaPejabat, jabatanPejabat, nipPejabat\);/g, "const sig = getReactSignaturePreview(desaName, tglFormatted, namaPejabat, jabatanPejabat, nipPejabat, includeCamatOverride);");
}

content = content.replace(/renderReactSignature\(\s*desaName,\s*currentDateFormatted\(\),\s*namaKades,\s*roleKades,\s*nipKades\s*\)/g, "renderReactSignature(desaName, currentDateFormatted(), namaKades, roleKades, nipKades, includeCamat)");

// Also update getPrintSignatureHTML
content = content.replace(/getPrintSignatureHTML\(\s*desaName,\s*tglFormatted,\s*namaKades,\s*roleKades,\s*nipKades\s*\)/g, "getPrintSignatureHTML(desaName, tglFormatted, namaKades, roleKades, nipKades, includeCamat)");

// UI additions
const checkboxUI = `
                </div>

                <div className="mt-6 pt-6 border-t border-amber-100">
                  <label className="flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors">
                    <input 
                      type="checkbox"
                      checked={includeCamat}
                      onChange={(e) => setIncludeCamat(e.target.checked)}
                      className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 text-sm">Tambahkan Kolom Mengetahui Camat</div>
                      <div className="text-xs text-slate-500 mt-0.5">Gunakan format 2 tanda tangan (Camat di sebelah kiri)</div>
                    </div>
                  </label>
                </div>

                <p className="text-[11px] text-amber-700/70 mt-4 italic">`;

if (!content.includes('Tambahkan Kolom Mengetahui Camat')) {
  content = content.replace(/<\/div>\s*<p className="text-\[11px\] text-amber-700\/70 mt-4 italic">/g, checkboxUI);
}

fs.writeFileSync(file, content, 'utf8');
