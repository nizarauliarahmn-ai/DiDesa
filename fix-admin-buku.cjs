const fs = require('fs');
const path = 'src/components/admin/AdminBukuTamu.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add Import
content = content.replace(
  /import \{ capitalizeWords \} from '\.\.\/\.\.\/utils\/textUtils';/,
  "import { capitalizeWords } from '../../utils/textUtils';\nimport SignatureCanvas from 'react-signature-canvas';"
);

// 2. Add ref for signature inside component
content = content.replace(
  /  const \[showModal, setShowModal\] = useState\(false\);/,
  "  const [showModal, setShowModal] = useState(false);\n  const signatureRef = React.useRef<any>(null);"
);

// 3. Update handleSubmit payload to include signature
content = content.replace(
  /        tujuan_temu: capitalizeWords\(form\.tujuan_temu\),/,
  "        tujuan_temu: capitalizeWords(form.tujuan_temu),\n        signature_base64: signatureRef.current?.isEmpty() ? null : signatureRef.current?.getTrimmedCanvas().toDataURL('image/png'),"
);

// 4. Update the headers for HTML print and Desktop view
content = content.replace(
  /<th style="width: 15%">Waktu Masuk<\/th>\s*<th style="width: 15%">Waktu Keluar<\/th>/,
  '<th style="width: 25%">Waktu Kunjungan</th>'
);

content = content.replace(
  /<th className="px-5 py-3\.5 text-\[11px\] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Masuk<\/th>\s*<th className="px-5 py-3\.5 text-\[11px\] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Keluar<\/th>/,
  '<th className="px-5 py-3.5 text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Waktu</th>'
);

// 5. Update HTML Print data rows
content = content.replace(
  /<td>\$\{fmtTime\(e\.tanggal_masuk\)\}<span class="meta">\$\{fmtDate\(e\.tanggal_masuk\)\}<\/span><\/td>\s*<td>\$\{e\.tanggal_keluar \? \`\$\{fmtTime\(e\.tanggal_keluar\)\}<span class="meta">\$\{fmtDate\(e\.tanggal_keluar\)\}<\/span>\` : '-'\}<\/td>/,
  '<td>${fmtTime(e.tanggal_masuk)}<span class="meta">${fmtDate(e.tanggal_masuk)}</span></td>'
);

// 6. Update Desktop View data rows
content = content.replace(
  /<td className="px-5 py-4 hidden sm:table-cell whitespace-nowrap">\s*<div className="flex flex-col">\s*<span className="text-sm font-medium text-gray-900 dark:text-white">\{fmtTime\(entry\.tanggal_masuk\)\}<\/span>\s*<span className="text-xs text-gray-500 dark:text-slate-400">\{fmtDate\(entry\.tanggal_masuk\)\}<\/span>\s*<\/div>\s*<\/td>\s*<td className="px-5 py-4 hidden sm:table-cell whitespace-nowrap">\s*<div className="flex flex-col">\s*\{entry\.tanggal_keluar \? fmtTime\(entry\.tanggal_keluar\) : <span className="text-gray-300 dark:text-slate-600">-<\/span>\}\s*<\/div>\s*<\/td>/,
  `<td className="px-5 py-4 hidden sm:table-cell whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{fmtTime(entry.tanggal_masuk)}</span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">{fmtDate(entry.tanggal_masuk)}</span>
                        </div>
                      </td>`
);

// 7. Add signature UI in the modal
// We will replace the final submit button area with the signature canvas
const submitButtonHTML = `<div className="mt-8 flex gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all">
                Batal
              </button>
              <button onClick={handleSubmit} disabled={isSaving} className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm">
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan
              </button>
            </div>`;

const withSignatureHTML = `<div className="mt-4">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Tanda Tangan Tamu</label>
                <div className="border-2 border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white">
                  <SignatureCanvas 
                    ref={signatureRef}
                    penColor="black"
                    canvasProps={{className: 'signatureCanvas w-full h-32 cursor-crosshair'}}
                  />
                </div>
                <button onClick={() => signatureRef.current?.clear()} className="mt-2 text-xs text-emerald-600 font-medium hover:underline">
                  Bersihkan Tanda Tangan
                </button>
              </div>
            ` + submitButtonHTML;

content = content.replace(
  /<div className="mt-8 flex gap-3 pt-6 border-t border-gray-100 dark:border-slate-800">[\s\S]*?Simpan\n\s*<\/button>\s*<\/div>/,
  withSignatureHTML
);

fs.writeFileSync(path, content);
console.log('AdminBukuTamu updated');
