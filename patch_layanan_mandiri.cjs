const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/LayananMandiri.tsx', 'utf8');

code = code.replace(/@page \{ size: A4 portrait; margin: 15mm; \}/g, `@page { size: A4 portrait; margin: 0; }`);
code = code.replace(/#public-print-modal-container \{ position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; \}/g, `#public-print-modal-container { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 15mm 20mm 15mm 20mm !important; box-sizing: border-box !important; }`);

fs.writeFileSync('src/components/dashboard/LayananMandiri.tsx', code);
