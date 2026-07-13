const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/RightSidebar.tsx', 'utf8');

code = code.replace(
  '<a href="#" className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">',
  '<a href="tel:081234567890" className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">'
);
code = code.replace(
  '<a href="#" className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">',
  '<a href="tel:082100000000" className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group">'
);

fs.writeFileSync('src/components/dashboard/RightSidebar.tsx', code);
