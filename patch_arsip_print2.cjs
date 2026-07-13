const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

// Replace the old print footer with the new global footprint
const targetFooter = /\{\/\* Printed Footer Watermark \(hanya muncul saat dicetak\) \*\/\}\s*<div className="hidden print:flex items-center justify-between text-\[10px\] text-gray-400 font-mono mt-8 border-t border-gray-100 pt-3 px-2 w-full shrink-0">\s*<div>Dicetak melalui website resmi DiDesa \&bull; \{new Date\(\)\.toLocaleDateString\('id-ID', \{ day: 'numeric', month: 'long', year: 'numeric' \}\)\} \&bull; \{new Date\(\)\.toLocaleTimeString\('id-ID', \{ hour: '2-digit', minute: '2-digit' \}\)\} WIB<\/div>\s*<div>Halaman 1 dari 1<\/div>\s*<\/div>/g;

const newFooter = `{/* Printed Footer Watermark */}
        <div className="hidden print:block mt-8 text-[10px] text-gray-500 text-left pt-4 border-t border-gray-300 w-full shrink-0" dangerouslySetInnerHTML={{__html: SAAS_CONFIG.globalFooterHTML}} />`;

code = code.replace(targetFooter, newFooter);

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Patched arsip footer layout');
