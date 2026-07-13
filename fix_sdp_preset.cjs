const fs = require('fs');
let file = 'src/components/admin/surat/AdminSuratSKD.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /export default function AdminSuratSKD\(\{ onBack \}: \{ onBack: \(\) => void \}\) \{/,
  'export default function AdminSuratSKD({ onBack, presetResident }: { onBack: () => void, presetResident?: any }) {'
);

const selectResidentRegex = /setFormData\(prev => \(\{[\s\S]*?nomorSurat: generatedNo\s*\}\)\);\s*\}/;

const effectRegex = /if \(sktm\) \{[\s\S]*?nomorSurat: generatedNo\s*\}\)\);\s*\}/;

const hookRegex = /const nextNo = String\(sktm\.noUrutTerakhir \+ 1\)\.padStart\(3, '0'\);/;
// we want to trigger presetResident if available. Let's add it to the useEffect.
// Actually, it's easier to append to the end of the useEffect.
content = content.replace(/} catch \(e\) \{\}\n  \}, \[\]\);/, `} catch (e) {}
    
    if (presetResident) {
      handleSelectResident(presetResident);
    }
  }, []);`);

fs.writeFileSync(file, content, 'utf8');

let file2 = 'src/components/admin/AdminSurat.tsx';
let content2 = fs.readFileSync(file2, 'utf8');
content2 = content2.replace(
  /<AdminSuratSKD \n            onBack=\{\(\) => setActiveTab\('buat'\)\} \n          \/>/,
  `<AdminSuratSKD 
            presetResident={presetResident}
            onBack={() => setActiveTab('buat')} 
          />`
);
fs.writeFileSync(file2, content2, 'utf8');
