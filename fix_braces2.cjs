const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratPenomoran.tsx', 'utf8');

code = code.replace("      return 'DS';", "      return 'DS';\n    };\n");
code = code.replace("      .replace(/\\[DESA\\]/g, desaInitial);", "      .replace(/\\[DESA\\]/g, desaInitial);\n  };\n");

fs.writeFileSync('src/components/admin/surat/AdminSuratPenomoran.tsx', code);
console.log("Fixed getDesaInitial and getPreviewNumber");
