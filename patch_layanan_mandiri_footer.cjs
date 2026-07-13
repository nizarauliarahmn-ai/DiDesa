const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/LayananMandiri.tsx', 'utf8');

if (!code.includes('SAAS_CONFIG')) {
  code = code.replace(/import \{ .* \} from 'lucide-react';/g, `$&
import { SAAS_CONFIG } from '../admin/surat/AdminSuratMasterTemplate';`);
}

const signatureTarget = `<p className="font-bold underline uppercase">{namaKades}</p>
            </div>
          </div>`;
const signatureReplacement = `<p className="font-bold underline uppercase">{namaKades}</p>
            </div>
          </div>
          {/* SAAS Footer Injection */}
          <div className="hidden print:block text-[10px] text-gray-500 text-left pt-4 border-t border-gray-300 w-full shrink-0" style={{marginTop: '50px'}} dangerouslySetInnerHTML={{__html: SAAS_CONFIG.globalFooterHTML}} />`;

if (code.includes(signatureTarget)) {
  code = code.replace(signatureTarget, signatureReplacement);
  fs.writeFileSync('src/components/dashboard/LayananMandiri.tsx', code);
  console.log('Patched Layanan Mandiri Footer');
} else {
  console.log('Signature target not found in LayananMandiri.tsx');
}
