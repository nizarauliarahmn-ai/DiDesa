const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const targetTableEnd = /<\/tbody>\s*<\/table>\s*<\/div>\s*\{\/\* Printed Footer Watermark \*\/\}\s*<div className="hidden print:block mt-8 text-\[10px\] text-gray-500 text-left pt-4 border-t border-gray-300 w-full shrink-0" dangerouslySetInnerHTML=\{\{__html: SAAS_CONFIG\.globalFooterHTML\}\} \/>\s*<\/div>/g;

const newTableEnd = `</tbody>
            <tfoot className="hidden print:table-footer-group">
              <tr>
                <td colSpan={6} className="border-none !p-0 !pt-4">
                  <div className="text-[10px] text-gray-500 text-left border-t border-gray-300 w-full" dangerouslySetInnerHTML={{__html: SAAS_CONFIG.globalFooterHTML}} />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;

if (targetTableEnd.test(code)) {
  code = code.replace(targetTableEnd, newTableEnd);
  console.log('Patched tfoot!');
} else {
  console.log('regex mismatch tfoot');
}

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
