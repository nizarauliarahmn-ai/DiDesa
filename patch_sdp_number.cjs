const fs = require('fs');
let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const sktm = configs\.find\(c => \(c\.klasifikasi === 'SDP' \|\| c\.klasifikasi === 'SKD' \|\| c\.klasifikasi === 'SKDPR'\)\);/, `let sktm = configs.find(c => (c.klasifikasi === 'SDP' || c.klasifikasi === 'SKD' || c.klasifikasi === 'SKDPR'));
    if (!sktm) {
      sktm = { id: 'fallback_sdp', jenis: 'SK DOMISILI PERORANGAN', klasifikasi: 'SDP', kodeKlasifikasi: '145', noUrutTerakhir: 0 };
    }`);

content = content.replace(/const updatedConfigs = currentConfigs\.map\(c => \n      \(c\.klasifikasi === 'SDP' \|\| c\.klasifikasi === 'SKD' \|\| c\.klasifikasi === 'SKDPR'\) \? \{ \.\.\.c, noUrutTerakhir: c\.noUrutTerakhir \+ 1 \} : c\n    \);/, `let updatedConfigs = currentConfigs.map(c => 
      (c.klasifikasi === 'SDP' || c.klasifikasi === 'SKD' || c.klasifikasi === 'SKDPR') ? { ...c, noUrutTerakhir: c.noUrutTerakhir + 1 } : c
    );
    if (!currentConfigs.some(c => c.klasifikasi === 'SDP' || c.klasifikasi === 'SKD' || c.klasifikasi === 'SKDPR')) {
      updatedConfigs.push({ id: 'fallback_sdp', jenis: 'SK DOMISILI PERORANGAN', klasifikasi: 'SDP', kodeKlasifikasi: '145', noUrutTerakhir: 1, isVisible: true });
    }`);

fs.writeFileSync(file, content, 'utf8');
