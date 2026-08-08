const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/admin/surat');
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

let patchedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // ONLY patch actual letter templates that have `const [tanggalSurat`
  if (!content.includes('const [tanggalSurat')) {
    continue;
  }

  // 1. Add QuickAddResidentModal import if missing
  if (!content.includes('import QuickAddResidentModal')) {
    content = `import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';\n` + content;
  }

  // 2. Add state variables if missing
  if (!content.includes('setShowQuickAddModal] = useState')) {
    const stateInjection = `const [showQuickAddModal, setShowQuickAddModal] = useState(false);\n  const [quickAddInitialData, setQuickAddInitialData] = useState<{nik?: string, name?: string}>({});\n  const [tanggalSurat`;
    
    // robust replace based on `tanggalSurat` declaration
    content = content.replace(/const \[\s*tanggalSurat/, stateInjection);
  }

  // 3. Fix onOpenQuickAdd calls
  const onOpenQuickAddRegex = /onOpenQuickAdd=\{[^\}]*\}/g;
  const fixedOnOpen = `onOpenQuickAdd={(nik, name) => {\n                  setQuickAddInitialData({ nik: nik || formData.nik, name: name || formData.nama || (formData as any).name || (formData as any).namaAyah || (formData as any).namaIbu });\n                  setShowQuickAddModal(true);\n                }}`;
  
  if (onOpenQuickAddRegex.test(content)) {
    content = content.replace(onOpenQuickAddRegex, fixedOnOpen);
  }

  // 4. Inject Modal Component JSX at the end of the return statement
  if (!content.includes('<QuickAddResidentModal')) {
    const modalJsx = `\n      <QuickAddResidentModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        initialData={quickAddInitialData}
        onSuccess={(savedData) => {
          setFormData((prev: any) => ({
            ...prev,
            nik: savedData.nik,
            nama: savedData.name,
            name: savedData.name,
            tempatLahir: savedData.birth_place,
            tanggalLahir: savedData.birth_date,
            jenisKelamin: savedData.gender,
            agama: savedData.religion,
            pekerjaan: savedData.job,
            alamat: savedData.address,
            rt: savedData.rt,
            rw: savedData.rw,
            desa: savedData.desa
          }));
          setShowQuickAddModal(false);
        }}
      />\n    `;
      
    // Inject right before the very last `);` and `}` in the file
    content = content.replace(/(\s*<\/[a-zA-Z0-9>]+>\s*\);\s*\})/, `${modalJsx}$1`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  patchedCount++;
  console.log(`Successfully patched Modal flow in ${file}`);
}

console.log(`Finished patching modal flow in ${patchedCount} files.`);
