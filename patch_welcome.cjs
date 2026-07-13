const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/WelcomeBanner.tsx', 'utf8');

code = code.replace("Layanan Surat Online", "Layanan Mandiri");
code = code.replace(/<button \s*onClick=\{\(\) => onTabChange && onTabChange\('layanan_mandiri'\)\}\s*className="bg-emerald-700\/50 border border-emerald-400\/30 text-white px-6 py-3\.5 rounded-xl font-bold text-sm hover:bg-emerald-700\/70 backdrop-blur-sm transition-all active:scale-95 cursor-pointer"\s*>\s*Aspirasi Warga\s*<\/button>/, 
  `<button 
             onClick={() => onTabChange && onTabChange('aspirasi')}
            className="bg-emerald-700/50 border border-emerald-400/30 text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700/70 backdrop-blur-sm transition-all active:scale-95 cursor-pointer"
          >
            Aspirasi Warga
          </button>`);

fs.writeFileSync('src/components/dashboard/WelcomeBanner.tsx', code);
