const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import AdminAspirasi")) {
  code = code.replace("import AdminTenants from './components/admin/AdminTenants';", "import AdminTenants from './components/admin/AdminTenants';\nimport AdminAspirasi from './components/admin/AdminAspirasi';");
}

if (!code.includes("adminTab === 'aspirasi'")) {
  code = code.replace("{adminTab === 'bantuan' && <AdminBantuan />}", "{adminTab === 'bantuan' && <AdminBantuan />}\n            {adminTab === 'aspirasi' && <AdminAspirasi />}");
}

fs.writeFileSync('src/App.tsx', code);
