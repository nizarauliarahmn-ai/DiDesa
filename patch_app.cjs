const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import AspirasiWarga")) {
  code = code.replace("import ProfilDesa from './components/dashboard/ProfilDesa';", "import ProfilDesa from './components/dashboard/ProfilDesa';\nimport AspirasiWarga from './components/dashboard/AspirasiWarga';");
}

if (!code.includes("{publicTab === 'aspirasi' && <AspirasiWarga />}")) {
  code = code.replace("{publicTab === 'layanan_mandiri' && <LayananMandiri />}", "{publicTab === 'layanan_mandiri' && <LayananMandiri />}\n          {publicTab === 'aspirasi' && <AspirasiWarga />}");
}

code = code.replace(/<nav className="fixed bottom-0 w-full h-16 bg-white border-t border-gray-200 flex justify-around items-center lg:hidden z-50 shadow-\[0px_-2px_10px_rgba\(0,0,0,0\.05\)\]">[\s\S]*?<\/nav>/, `<nav className="fixed bottom-0 w-full h-16 bg-white border-t border-gray-200 flex justify-around items-center lg:hidden z-50 shadow-[0px_-2px_10px_rgba(0,0,0,0.05)] pb-safe">
          <button 
             onClick={() => setPublicTab('dashboard')} 
             className={\`flex flex-col items-center justify-center flex-1 h-full transition-all \${publicTab === 'dashboard' ? 'text-emerald-800 font-bold' : 'text-gray-400'}\`}
          >
            <LayoutDashboard className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Utama</span>
          </button>
          <button 
             onClick={() => setPublicTab('layanan_mandiri')} 
             className={\`flex flex-col items-center justify-center flex-1 h-full transition-all \${publicTab === 'layanan_mandiri' ? 'text-emerald-800 font-bold' : 'text-gray-400'}\`}
          >
            <ShieldCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Layanan</span>
          </button>
          
          <div className="relative -top-3">
            <button 
              onClick={() => setPublicTab('aspirasi')}
              className="w-14 h-14 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full flex flex-col items-center justify-center shadow-lg shadow-emerald-700/30 active:scale-95 transition-all border-4 border-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-square-text"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M13 8H7"/><path d="M17 12H7"/></svg>
            </button>
          </div>
          
          <button 
             onClick={() => setPublicTab('berita')} 
             className={\`flex flex-col items-center justify-center flex-1 h-full transition-all \${publicTab === 'berita' ? 'text-emerald-800 font-bold' : 'text-gray-400'}\`}
          >
            <Newspaper className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Berita</span>
          </button>
          <button 
             onClick={() => setPublicTab('profil_desa')} 
             className={\`flex flex-col items-center justify-center flex-1 h-full transition-all \${publicTab === 'profil_desa' ? 'text-emerald-800 font-bold' : 'text-gray-400'}\`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] font-bold">Profil</span>
          </button>
        </nav>`);

fs.writeFileSync('src/App.tsx', code);
