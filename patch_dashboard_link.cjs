const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminDashboard.tsx', 'utf8');

const targetMatch = `<h4 className="font-bold text-gray-900">Aktivitas Terbaru</h4>
              <button className="text-emerald-700 text-sm font-bold hover:underline">Lihat Semua</button>`;
const replacement = `<h4 className="font-bold text-gray-900">Aktivitas Terbaru</h4>
              <button onClick={() => setActiveTab('notifikasi')} className="text-emerald-700 text-sm font-bold hover:underline">Lihat Semua</button>`;
code = code.replace(targetMatch, replacement);
fs.writeFileSync('src/components/admin/AdminDashboard.tsx', code);
