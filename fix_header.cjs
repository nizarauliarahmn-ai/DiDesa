const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminHeader.tsx', 'utf-8');

const target = `<input 
            type="text" 
            placeholder="Cari NIK / nama (ketik otomatis pindah tab)..." 
            value={globalSearch}
            onChange={(e) => {
              if (setGlobalSearch) {
                setGlobalSearch(e.target.value);
              }
              if (e.target.value && setActiveTab && activeTab !== 'penduduk') {
                setActiveTab('penduduk');
              }
            }}
            className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full w-full focus:ring-2 focus:ring-emerald-500 text-sm text-gray-700 placeholder:text-gray-400 transition-shadow outline-none"
          />`;

const replacement = `<input 
            type="text" 
            placeholder="Cari..." 
            className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full w-full focus:ring-2 focus:ring-emerald-500 text-sm outline-none"
          />`;

// we will use regex to be safe with whitespaces
code = code.replace(/<input\s+type="text"\s+placeholder="Cari NIK \/ nama[^>]+>/, replacement);
fs.writeFileSync('src/components/admin/AdminHeader.tsx', code);
