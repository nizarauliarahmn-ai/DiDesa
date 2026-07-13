const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminHeader.tsx', 'utf-8');

// I will just use string replacement on a larger block
const rx = /<div className="hidden md:flex relative w-full max-w-md">[\s\S]*?<\/div>/;

const replacement = `<div className="hidden md:flex relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari..." 
            className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full w-full focus:ring-2 focus:ring-emerald-500 text-sm outline-none"
          />
        </div>`;

code = code.replace(rx, replacement);
fs.writeFileSync('src/components/admin/AdminHeader.tsx', code);
