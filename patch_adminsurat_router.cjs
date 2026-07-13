const fs = require('fs');

// 1. Patch AdminSuratBuat.tsx
let buat = fs.readFileSync('src/components/admin/surat/AdminSuratBuat.tsx', 'utf8');

buat = buat.replace(
  /onOpenSKTM\?: \(\) => void, onOpenSKU/g,
  'onOpenSKTM?: () => void, onOpenSKBM?: () => void, onOpenSKU'
);

buat = buat.replace(
  /onOpenNikah, onOpenSKTM, onOpenSKU/g,
  'onOpenNikah, onOpenSKTM, onOpenSKBM, onOpenSKU'
);

buat = buat.replace(
  /if \(t\.klasifikasi === 'SKTM'\) \{\s*if \(onOpenSKTM\) onOpenSKTM\(\);\s*return;\s*\}/,
  `if (t.klasifikasi === 'SKTM') {
                        if (onOpenSKTM) onOpenSKTM();
                        return;
                      }
                      if (t.klasifikasi === 'SKBM') {
                        if (onOpenSKBM) onOpenSKBM();
                        return;
                      }`
);
fs.writeFileSync('src/components/admin/surat/AdminSuratBuat.tsx', buat);

// 2. Patch AdminSurat.tsx
let router = fs.readFileSync('src/components/admin/AdminSurat.tsx', 'utf8');

if (!router.includes('AdminSuratSKBM')) {
  router = router.replace(
    "import AdminSuratSKTM from './surat/AdminSuratSKTM';",
    "import AdminSuratSKTM from './surat/AdminSuratSKTM';\nimport AdminSuratSKBM from './surat/AdminSuratSKBM';"
  );
  
  router = router.replace(
    "else if (jenis === 'SKTM') {\n      setActiveTab('sktm');",
    "else if (jenis === 'SKTM') {\n      setActiveTab('sktm');\n    } else if (jenis === 'SKBM' || jenis === 'SK BELUM MENIKAH') {\n      setActiveTab('skbm');"
  );
  
  router = router.replace(
    "onOpenSKTM={() => changeTab('sktm')}",
    "onOpenSKTM={() => changeTab('sktm')}\n            onOpenSKBM={() => changeTab('skbm')}"
  );
  
  router = router.replace(
    "{activeTab === 'sktm' && (\n          <AdminSuratSKTM \n            editData={editData}\n            editLetterId={editLetterId}\n            onBack={() => changeTab('buat')} \n          />\n        )}",
    `{activeTab === 'sktm' && (
          <AdminSuratSKTM 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}
        {activeTab === 'skbm' && (
          <AdminSuratSKBM 
            editData={editData}
            editLetterId={editLetterId}
            onBack={() => changeTab('buat')} 
          />
        )}`
  );
  fs.writeFileSync('src/components/admin/AdminSurat.tsx', router);
}

console.log('Patched routing for SKBM');
