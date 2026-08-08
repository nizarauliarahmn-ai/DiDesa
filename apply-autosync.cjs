const fs = require('fs');
const path = require('path');

const suratDir = path.join(__dirname, 'src', 'components', 'admin', 'surat');
// The ones skipped by the modal script:
const filesToProcess = [
  'AdminSuratNikah.tsx',
  'AdminSuratSKL.tsx',
  'AdminSuratSKP.tsx',
  'AdminSuratSPPD.tsx',
  'AdminSuratSPT.tsx',
  'AdminSuratUndangan.tsx',
  'AdminSuratSKKT.tsx'
];

for (const file of filesToProcess) {
  const filePath = path.join(suratDir, file);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if it has updateResidentData
  if (!content.includes('updateResidentData')) {
    console.log(`No updateResidentData in ${file}`);
    continue;
  }

  // 1. Add Import
  let importIndex = content.lastIndexOf("import");
  if (importIndex === -1) importIndex = 0;
  const nextLineIndex = content.indexOf('\n', importIndex) + 1;
  if (!content.includes('autoSyncResidentFromLetter')) {
    const importsToAdd = `\nimport { autoSyncResidentFromLetter } from '../../../utils/residentSync';\n`;
    content = content.substring(0, nextLineIndex) + importsToAdd + content.substring(nextLineIndex);
  }

  // 2. Remove updateResidentData definition completely
  const updateResRegex = /\s*const updateResidentData = async \([^)]+\) => {[\s\S]*?};\n/g;
  content = content.replace(updateResRegex, '\n');

  // 3. Replace calls to updateResidentData with autoSyncResidentFromLetter
  // updateResidentData(nik, data) -> autoSyncResidentFromLetter(nik, data, 'TypeSurat')
  // We need to extract a sensible letter type or just pass 'Pembuatan Surat'
  content = content.replace(/await updateResidentData\(([^,]+),\s*(\{[\s\S]*?\})\);/g, `await autoSyncResidentFromLetter($1, $2, 'Pembuatan Surat');`);
  
  // also handle one-liners if any
  content = content.replace(/await updateResidentData\(([^,]+),\s*([^)]+)\);/g, `await autoSyncResidentFromLetter($1, $2, 'Pembuatan Surat');`);

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Processed ${file}`);
}
