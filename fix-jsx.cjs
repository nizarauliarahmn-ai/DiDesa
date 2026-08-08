const fs = require('fs');
const path = require('path');

const suratDir = path.join(__dirname, 'src', 'components', 'admin', 'surat');
const files = fs.readdirSync(suratDir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(suratDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Only apply to files that imported it but don't have the JSX
  if (content.includes('import QuickAddResidentModal') && !content.includes('<QuickAddResidentModal')) {
    // Find the last </div> before the end of the file
    const match = /<\/div>[\s\n]*\);[\s\n]*\}[\s\n]*$/.exec(content);
    if (match) {
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
      content = content.substring(0, match.index) + modalJSX;
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`Added QuickAddResidentModal JSX to ${file}`);
    } else {
      console.log(`Failed to find closing tag in ${file}`);
    }
  }
}
