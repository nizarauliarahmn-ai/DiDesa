const fs = require('fs');
const path = require('path');

const dir = 'src/components/admin/surat';
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('presetResident?:') || content.includes('presetResident :')) {
        continue;
    }
    if (!content.includes('handleSelectResident')) {
        continue;
    }
    
    console.log('Modifying ' + file);
    
    // Fix props destruct
    content = content.replace(/\{ onBack, editData, editLetterId \}: \{ onBack: \(\) => void, editData\?: any, editLetterId\?: string \}/g, '{ onBack, editData, editLetterId, presetResident }: { onBack: () => void, editData?: any, editLetterId?: string, presetResident?: any }');
    content = content.replace(/\{ onBack, editData, editLetterId \}: \{ onBack: \(\) => void; editData\?: any; editLetterId\?: string; \}/g, '{ onBack, editData, editLetterId, presetResident }: { onBack: () => void; editData?: any; editLetterId?: string; presetResident?: any; }');
    
    // For standard interfaces
    content = content.replace(/editLetterId\?: string;/g, 'editLetterId?: string;\n  presetResident?: any;');
    content = content.replace(/\{ onBack, editData, editLetterId \}/g, '{ onBack, editData, editLetterId, presetResident }');

    const useEffectCode = `
  React.useEffect(() => {
    if (presetResident) {
      handleSelectResident(presetResident);
    }
  }, [presetResident]);
`;
    const funcMatch = content.match(/export default function \w+\([^)]*\)\s*\{/);
    if (funcMatch) {
        const insertIdx = funcMatch.index + funcMatch[0].length;
        content = content.slice(0, insertIdx) + useEffectCode + content.slice(insertIdx);
        fs.writeFileSync(filePath, content);
    }
}
