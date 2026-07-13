const fs = require('fs');

let file2 = 'src/components/admin/surat/AdminSuratBuat.tsx';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(/export default function AdminSuratBuat\(\{ onBack, presetResident, onOpenNikah, onOpenSKTM, onOpenSKU, onOpenSKPH, onOpenSKM, onOpenSPH \}/, "export default function AdminSuratBuat({ onBack, presetResident, onOpenNikah, onOpenSKTM, onOpenSKU, onOpenSKPH, onOpenSKD, onOpenSKM, onOpenSPH }");

fs.writeFileSync(file2, content2, 'utf8');
