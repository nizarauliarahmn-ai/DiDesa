const fs = require('fs');

let file = 'src/utils/signature.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace isDual logic
content = content.replace(/const globalSigFormat = localStorage.getItem\('village_signature_format'\) \|\| 'kades';\n\s*\/\/ Use the override if provided, otherwise fallback to global format\n\s*const isDual = includeCamatOverride === true \|\| globalSigFormat === 'kades_camat' \|\| globalSigFormat === 'kades_bpd';/, 'const isDual = includeCamatOverride === true;');

content = content.replace(/const globalSigFormat = localStorage.getItem\('village_signature_format'\) \|\| 'kades';\n\s*const isDual = includeCamatOverride === true \|\| globalSigFormat === 'kades_camat' \|\| globalSigFormat === 'kades_bpd';/, 'const isDual = includeCamatOverride === true;');

// Remove sigFormat from return type of prepareReactSignature
content = content.replace(/sigFormat: globalSigFormat,\n\s*/, '');

fs.writeFileSync(file, content, 'utf8');
