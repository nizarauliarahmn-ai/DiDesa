const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminSidebar.tsx', 'utf8');

const targetMatch = `      {/* Profile */}
      <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
        <button 
          onClick={() => setView('public')}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium text-xs text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 mb-1"
        >
          <LogOut size={16} />
          <span>Ke Portal Publik</span>
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-medium text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 mb-2"
        >
          <LogOut size={16} />
          <span>Keluar Sesi</span>
        </button>
        <div className="flex items-center gap-3 px-2 pt-2 border-t border-gray-50 mb-1">
          <img src={authUser?.avatar || "https://i.pravatar.cc/150?img=12"} alt="Admin" className="w-10 h-10 rounded-full border-2 border-emerald-100 object-cover shrink-0" />
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-gray-900 truncate">{authUser?.name || "Admin Desa"}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded-full \${authUser?.role === 'saas_admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : authUser?.role === 'kades' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800'}\`}>
                {authUser?.role === 'saas_admin' ? 'SaaS Admin' : authUser?.role === 'kades' ? 'Kepala Desa' : 'Admin Operator'}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 truncate mt-0.5">{authUser?.email || "admin@wasahhilir.desa.id"}</p>
          </div>
        </div>
        <div className="text-center pt-2 border-t border-gray-100/50">
          <p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Digitalisasi Desa v3.0</p>
        </div>
      </div>`;

const replacement = `      {/* Profile */}
      <div className="p-4 border-t border-gray-100 flex flex-col gap-4 mt-auto">
        <div className="flex items-center gap-3 overflow-hidden px-1">
          <div className="relative shrink-0">
            <img src={authUser?.avatar || "https://i.pravatar.cc/150?img=12"} alt="Admin" className="w-10 h-10 rounded-full border-2 border-gray-100 shadow-sm object-cover" />
            <div className={\`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white \${authUser?.role === 'saas_admin' ? 'bg-purple-500' : authUser?.role === 'kades' ? 'bg-amber-500' : 'bg-emerald-500'}\`} title={authUser?.role === 'saas_admin' ? 'SaaS Admin' : authUser?.role === 'kades' ? 'Kepala Desa' : 'Admin Operator'}></div>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 truncate leading-none mb-1.5">{authUser?.name || "Admin Desa"}</p>
            <p className="text-[10px] font-medium text-gray-500 truncate leading-none">{authUser?.role === 'saas_admin' ? 'SaaS Admin' : authUser?.role === 'kades' ? 'Kepala Desa' : 'Admin Operator'}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setView('public')}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-100 rounded-lg text-xs font-bold text-gray-600 hover:text-emerald-700 transition-colors"
          >
            <LayoutDashboard size={14} />
            <span>Portal Publik</span>
          </button>
          <button 
            onClick={onLogout}
            className="w-10 h-9 flex items-center justify-center bg-gray-50 hover:bg-rose-50 border border-gray-100 hover:border-rose-100 rounded-lg text-gray-500 hover:text-rose-600 transition-colors shrink-0"
            title="Keluar Sesi"
          >
            <LogOut size={16} />
          </button>
        </div>
        <div className="text-center pt-2 border-t border-gray-100/50">
          <p className="text-[9px] text-gray-400 font-bold tracking-widest uppercase">Digitalisasi Desa v3.0</p>
        </div>
      </div>`;

if (code.includes('Ke Portal Publik')) {
  code = code.replace(targetMatch, replacement);
  fs.writeFileSync('src/components/admin/AdminSidebar.tsx', code);
}
