const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

// 1. Add Header Keperluan
const targetTh = /<th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pemohon<\/th>/;
code = code.replace(targetTh, '<th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pemohon</th>\n                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Keperluan</th>');

// 2. Add Td Keperluan
const targetTd = /<td className="px-6 py-4">\s*<span className="text-sm font-medium text-gray-900">\{surat\.nama\}<\/span>\s*<\/td>/;
code = code.replace(targetTd, `<td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{surat.nama}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-[200px] truncate" title={surat.keperluan || '-'}>
                      {surat.keperluan || '-'}
                    </td>`);

// 3. Remove Print Button in Table Aksi
const targetPrintBtn = /<button \s*onClick=\{\(\) => triggerSinglePrint\(surat\)\}\s*className="p-1\.5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg transition-colors" \s*title="Cetak Ulang Surat"\s*>\s*<Printer className="w-4 h-4" \/>\s*<\/button>/;
code = code.replace(targetPrintBtn, '');

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Patched arsip surat');
