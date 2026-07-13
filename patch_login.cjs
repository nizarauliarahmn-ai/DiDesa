const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');

code = code.replace(/const isSuper = role === 'super_admin' \|\| email.includes\('super'\);/, "const isSuper = role === 'kades' || role === 'saas_admin' || email.includes('kades') || email.includes('saas');");
code = code.replace(/const isAdminUser = role === 'admin' \|\| role === 'super_admin' \|\| email.includes\('admin'\) \|\| isSuper;/, "const isAdminUser = role === 'admin' || role === 'kades' || role === 'saas_admin' || email.includes('admin') || isSuper;");
code = code.replace(/role: isSuper \? \('super_admin' as const\) : \('admin' as const\)/, "role: role as any");
code = code.replace(/name: isSuper \? 'Siti Aminah \(Sekdes \/ Verifikator\)' : \(email.split\('@'\)\[0\]\.toUpperCase\(\)\.replace\('\.', ' '\) \|\| 'Admin Utama'\)/, "name: role === 'saas_admin' ? 'Pemilik Platform' : role === 'kades' ? 'Kepala Desa (Verifikator)' : 'Admin Utama'");

code = code.replace(/if \(selectedRole === 'super_admin'\) \{[\s\S]*?\} else if \(selectedRole === 'admin'\) \{/, `if (selectedRole === 'saas_admin') {
        setEmail('admin@sistemdidesa.id');
        setPassword('saas123');
        loggedUser = {
          email: 'admin@sistemdidesa.id',
          role: 'saas_admin' as const,
          name: 'Pemilik Platform (SaaS)',
          avatar: 'https://i.pravatar.cc/150?img=60'
        };
      } else if (selectedRole === 'kades') {
        setEmail('kades@wasahhilir.desa.id');
        setPassword('kades123');
        loggedUser = {
          email: 'kades@wasahhilir.desa.id',
          role: 'kades' as const,
          name: 'Siti Aminah (Sekretaris Desa)',
          avatar: 'https://i.pravatar.cc/150?img=47'
        };
      } else if (selectedRole === 'admin') {`);

code = code.replace(/selectedRole === 'super_admin'/g, "selectedRole === 'kades' || selectedRole === 'saas_admin'");

code = code.replace(/onClick=\{\(\) => setRole\('super_admin'\)\}/g, "onClick={() => setRole('kades')}");
code = code.replace(/role === 'super_admin'/g, "role === 'kades'");
code = code.replace(/Verifikator \(Super Admin\)/g, "Verifikator (Kepala Desa)");

code = code.replace(/handleQuickLogin\('super_admin'\)/, "handleQuickLogin('kades')");
code = code.replace(/Demo Super Admin \(Verifikator\)/g, "Demo Kepala Desa (Verifikator)");
code = code.replace(/super_admin@wasahhilir\.desa\.id/g, "kades@wasahhilir.desa.id");
code = code.replace(/super123/g, "kades123");

// insert saas_admin button
const saasButton = `
          <button
            type="button"
            onClick={() => handleQuickLogin('saas_admin')}
            disabled={isLoading}
            className="w-full p-3 border border-dashed border-purple-200 bg-purple-50/30 hover:bg-purple-50 text-purple-950 rounded-xl transition-all text-left flex items-start gap-3 group relative overflow-hidden"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
              <Server size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-purple-950">Demo Pemilik Platform (SaaS)</span>
                <span className="text-[8px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={8} /> SaaS Admin
                </span>
              </div>
              <p className="text-[10px] text-purple-800/70 truncate font-semibold">Username: admin@sistemdidesa.id | Pass: saas123</p>
            </div>
          </button>
`;

code = code.replace(/<button[\s\S]*?Demo Penduduk \(Warga\)[\s\S]*?<\/button>/, match => saasButton + match);

fs.writeFileSync('src/components/Login.tsx', code);
