const fs = require('fs');
const path = require('path');

const suratDir = path.join(__dirname, 'src', 'components', 'admin', 'surat');
const files = fs.readdirSync(suratDir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx') && f !== 'AdminSuratDashboard.tsx' && f !== 'AdminSuratInbox.tsx' && f !== 'AdminSuratMasterTemplate.tsx' && f !== 'AdminSuratBuat.tsx' && f !== 'AdminSuratPenomoran.tsx');

for (const file of files) {
  const filePath = path.join(suratDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('QuickAddResidentModal')) continue;

  // 1. Add Imports
  let importIndex = content.lastIndexOf("import");
  if (importIndex === -1) importIndex = 0;
  const nextLineIndex = content.indexOf('\n', importIndex) + 1;
  const importsToAdd = `\nimport QuickAddResidentModal from '../penduduk/QuickAddResidentModal';\nimport { checkResidentExists } from '../../../utils/residentSync';\n`;
  content = content.substring(0, nextLineIndex) + importsToAdd + content.substring(nextLineIndex);

  // 2. Add State
  const stateRegex = /const \[loading,\s*setLoading\]\s*=\s*useState\(false\);/;
  if (stateRegex.test(content)) {
    content = content.replace(stateRegex, `const [loading, setLoading] = useState(false);\n  const [showQuickAddModal, setShowQuickAddModal] = useState(false);`);
  }

  // 3. Remove updateResidentData function
  const updateResRegex = /\s*const updateResidentData = async \([^)]+\) => {[\s\S]*?};\n/g;
  content = content.replace(updateResRegex, '\n');

  // 4. Update handlePrint
  const handlePrintRegex = /const handlePrint = async \(\) => {([\s\S]*?)setLoading\(true\);[\s\S]*?await updateResidentData[^;]+;/;
  
  if (handlePrintRegex.test(content)) {
    const hasMultipleUpdateResidentData = (content.match(/await updateResidentData/g) || []).length > 1;
    
    if (hasMultipleUpdateResidentData) {
      console.log(`Skipping complex handlePrint in ${file} (manual review needed)`);
      continue;
    }

    content = content.replace(/const handlePrint = async \(\) => {/, 'const handlePrint = async (skipCheck = false) => {');
    
    const updateCallRegex = /\s*await updateResidentData[^;]+;/;
    
    const checkLogic = `
    if (!skipCheck && formData.nik && formData.nik !== '-') {
      setLoading(true);
      const exists = await checkResidentExists(formData.nik);
      setLoading(false);
      if (!exists) {
        setShowQuickAddModal(true);
        return;
      }
    }
`;
    content = content.replace(updateCallRegex, checkLogic);
  } else {
    console.log(`Could not find standard handlePrint pattern in ${file}`);
  }

  // 5. Add QuickAddResidentModal at the end before final </div>
  const finalDivRegex = /<\/div>\n\s*\);\n}\n?$/;
  if (finalDivRegex.test(content)) {
    const modalJSX = `
      <QuickAddResidentModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onSuccess={() => {
          setShowQuickAddModal(false);
          handlePrint(true);
        }}
        initialData={formData}
      />
    </div>
  );
}
`;
    content = content.replace(finalDivRegex, modalJSX);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Processed ${file}`);
}
