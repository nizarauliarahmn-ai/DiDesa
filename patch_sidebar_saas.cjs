const fs = require('fs');

let file = 'src/components/admin/AdminSidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<NavItem icon=\{<Settings size=\{18\} \/>\} label="Branding Platform" active=\{activeTab === 'global_branding'\} onClick=\{[\s\S]*?\} \/>/;

content = content.replace(regex, (match) => {
  return `<NavItem icon={<FileText size={18} className="text-emerald-600" />} label="Template Surat Global" active={activeTab === 'template_surat'} onClick={() => { setIsMobileMenuOpen?.(false); setActiveTab('template_surat'); }} />
            ${match}`;
});

fs.writeFileSync(file, content, 'utf8');
