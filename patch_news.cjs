const fs = require('fs');
let dashCode = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
dashCode = dashCode.replace('<NewsSection />', '<NewsSection onTabChange={setPublicTab} />');
fs.writeFileSync('src/components/Dashboard.tsx', dashCode);

let newsCode = fs.readFileSync('src/components/dashboard/NewsSection.tsx', 'utf8');
newsCode = newsCode.replace(
  'export default function NewsSection() {',
  'export default function NewsSection({ onTabChange }: { onTabChange?: (tab: string) => void }) {'
);
newsCode = newsCode.replace(
  '<button className="text-emerald-700 text-sm font-bold hover:text-emerald-800 flex items-center gap-1 group">',
  '<button onClick={() => onTabChange && onTabChange(\'berita\')} className="text-emerald-700 text-sm font-bold hover:text-emerald-800 flex items-center gap-1 group">'
);
fs.writeFileSync('src/components/dashboard/NewsSection.tsx', newsCode);
