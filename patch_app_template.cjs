const fs = require('fs');

let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// add import
content = content.replace(/import AdminGlobalBranding from '\.\/components\/admin\/AdminGlobalBranding';/, "import AdminGlobalBranding from './components/admin/AdminGlobalBranding';\nimport AdminSaaSTemplateSurat from './components/admin/AdminSaaSTemplateSurat';");

// add conditional render
content = content.replace(/\{adminTab === 'global_branding' && user\.role === 'saas_admin' && <AdminGlobalBranding \/>\}/, "{adminTab === 'global_branding' && user.role === 'saas_admin' && <AdminGlobalBranding />}\n                {adminTab === 'template_surat' && user.role === 'saas_admin' && <AdminSaaSTemplateSurat />}");

fs.writeFileSync(file, content, 'utf8');
