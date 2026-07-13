const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminSidebar.tsx', 'utf8');

if (!code.includes("label=\"Aspirasi Warga\"")) {
  code = code.replace(
    "import { LayoutDashboard, Users, FileText, Gift, Settings, Building2, LogOut, Bell, ShieldAlert, Database } from 'lucide-react';",
    "import { LayoutDashboard, Users, FileText, Gift, Settings, Building2, LogOut, Bell, ShieldAlert, Database, MessageSquareText } from 'lucide-react';"
  );
  
  code = code.replace(
    "<NavItem icon={<Gift size={20} />} label=\"Bantuan\" active={activeTab === 'bantuan'} onClick={() => setActiveTab('bantuan')} />",
    "<NavItem icon={<Gift size={20} />} label=\"Bantuan\" active={activeTab === 'bantuan'} onClick={() => setActiveTab('bantuan')} />\n        <NavItem icon={<MessageSquareText size={20} />} label=\"Aspirasi Warga\" active={activeTab === 'aspirasi'} onClick={() => setActiveTab('aspirasi')} />"
  );
}

fs.writeFileSync('src/components/admin/AdminSidebar.tsx', code);
