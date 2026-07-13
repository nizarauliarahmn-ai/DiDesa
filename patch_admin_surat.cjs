const fs = require('fs');

let code = fs.readFileSync('src/components/admin/AdminSurat.tsx', 'utf8');

// Add import
code = code.replace(
  "import AdminSuratSKTM from './surat/AdminSuratSKTM';",
  "import AdminSuratSKTM from './surat/AdminSuratSKTM';\nimport AdminSuratSKH from './surat/AdminSuratSKH';"
);

// Add to switch/render
const replacement = `{activeTab === 'sktm' && (
          <AdminSuratSKTM 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'skh' && (
          <AdminSuratSKH 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}`;

code = code.replace(
  `{activeTab === 'sktm' && (
          <AdminSuratSKTM 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}`,
  replacement
);

fs.writeFileSync('src/components/admin/AdminSurat.tsx', code);
console.log('Patched AdminSurat.tsx');
