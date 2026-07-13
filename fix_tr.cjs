const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminPenduduk.tsx', 'utf8');

code = code.replace(/<tr>[\s\n]*<td colSpan=\{8\}[\s\S]*?<\/motion\.tr>/, '<tr>\n                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">\n                    Tidak ada data penduduk yang sesuai dengan pencarian atau filter.\n                  </td>\n                </tr>');

fs.writeFileSync('src/components/admin/AdminPenduduk.tsx', code);
