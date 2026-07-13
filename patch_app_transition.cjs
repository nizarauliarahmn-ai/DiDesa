const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// import PageTransition
if (!code.includes('PageTransition')) {
  code = code.replace("import ToastContainer from './components/common/ToastContainer';", "import ToastContainer from './components/common/ToastContainer';\nimport PageTransition from './components/common/PageTransition';");
}

// Modify Admin Tabs Rendering
const adminTabsMatch = code.match(/<main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">([\s\S]*?)<\/main>/);
if (adminTabsMatch) {
  let adminTabsCode = adminTabsMatch[1];
  let newAdminTabs = `
            <PageTransition pageKey={adminTab}>
              ${adminTabsCode.trim()}
            </PageTransition>
`;
  code = code.replace(adminTabsMatch[1], newAdminTabs);
}

// Modify Public Tabs Rendering
const publicTabsRegex = /\{publicTab === 'dashboard' && <Dashboard setPublicTab=\{setPublicTab\} \/>\}[\s\S]*?\{publicTab === 'layanan_mandiri' && <LayananMandiri \/>\}/;
const publicTabsMatch = code.match(publicTabsRegex);
if (publicTabsMatch) {
  let newPublicTabs = `
          <PageTransition pageKey={publicTab}>
            ${publicTabsMatch[0]}
          </PageTransition>
`;
  code = code.replace(publicTabsMatch[0], newPublicTabs);
}

fs.writeFileSync('src/App.tsx', code);
