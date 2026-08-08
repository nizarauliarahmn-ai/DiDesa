const fs = require('fs');
const path = require('path');

const directory = "src/components/admin/surat";
const files = fs.readdirSync(directory).filter(f => f.endsWith('.tsx'));

for (const filename of files) {
    const filepath = path.join(directory, filename);
    let content = fs.readFileSync(filepath, 'utf8');

    // Pattern to find: 
    // <div className="sticky top-16 z-30">\n        <SuratEditorHeader (multiline) />\n      </div>
    
    // Quick regex replacement
    const regex = /<div className="sticky top-16 z-30">\s*(<SuratEditorHeader[\s\S]*?\/>)\s*<\/div>/g;
    if (regex.test(content)) {
        content = content.replace(regex, "$1");
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Unwrapped ${filename}`);
    }
}
