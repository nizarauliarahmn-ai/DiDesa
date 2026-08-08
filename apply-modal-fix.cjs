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
    content = content.replace(/const \[\s*tanggalSurat/, stateInjection);
  }

  // 3. Clean replacement for UnifiedResidentSearch tag
  const unifiedSearchClean = `<UnifiedResidentSearch
                  formData={formData}
                  setFormData={setFormData}
                  residents={residents}
                  onOpenQuickAdd={(nik, name) => {
                    setQuickAddInitialData({ nik: nik || formData.nik, name: name || formData.nama || (formData as any).name || (formData as any).namaAyah || (formData as any).namaIbu });
                    setShowQuickAddModal(true);
                  }}
                />`;

  content = content.replace(/<UnifiedResidentSearch[\s\S]*?\/>/g, unifiedSearchClean);

  // 4. Inject Modal Component JSX at the end of the return statement if missing
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
          if (typeof setResidents === 'function') {
            setResidents((prev: any) => [savedData, ...prev.filter((r: any) => r.nik !== savedData.nik)]);
          }
          setShowQuickAddModal(false);
        }}
      />\n    `;
      
    content = content.replace(/(\s*<\/[a-zA-Z0-9>]+>\s*\);\s*\})/, `${modalJsx}$1`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  patchedCount++;
  console.log(`Successfully patched Modal flow in ${file}`);
}

console.log(`Finished patching modal flow in ${patchedCount} files.`);
