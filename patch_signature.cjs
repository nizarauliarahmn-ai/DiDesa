const fs = require('fs');

let file = 'src/utils/signature.ts';
let content = fs.readFileSync(file, 'utf8');

// Add sigLeftPangkat
if (!content.includes("village_signature_left_pangkat")) {
  content = content.replace(
    /const sigLeftName = localStorage.getItem\('village_signature_left_name'\) \|\| '........................';/g,
    "const sigLeftName = localStorage.getItem('village_signature_left_name') || '........................';\n  const sigLeftPangkat = localStorage.getItem('village_signature_left_pangkat') || '';"
  );
}

// Modify leftRoleHtml logic in print
content = content.replace(
  /const sigLeftRole = localStorage\.getItem\('village_signature_left_role'\) \|\| 'Camat Simpur';/,
  "const sigLeftRole = localStorage.getItem('village_signature_left_role') || 'Camat Simpur';\n  let finalLeftRole = sigLeftRole;\n  if (includeCamatOverride && !finalLeftRole.toLowerCase().includes('mengetahui')) {\n    finalLeftRole = `Mengetahui,\\n${sigLeftRole}`;\n  }"
);

content = content.replace(/\$\{sigLeftRole\}/, "${finalLeftRole}");

// Modify Left Signee HTML
const leftSigneeOriginal = `<p style="font-weight:bold;margin:0;text-transform:uppercase;\\$\\{nameDecoration\\}">\\$\\{sigLeftName\\}<\\/p>\\s*\\$\\{sigLeftNip && sigLeftNip !== '-' && sigLeftNip !== '' \\? \`<p style="margin:2px 0 0 0;font-family:monospace;font-size:11px;">NIP\\. \\$\\{sigLeftNip\\}<\\/p>\` : ''\\}`;

const leftSigneeNew = `<p style="font-weight:bold;margin:0;\${nameDecoration}">\${sigLeftName}</p>
          \${sigLeftPangkat ? \`<p style="margin:2px 0 0 0;font-size:13px;">\${sigLeftPangkat}</p>\` : ''}
          \${sigLeftNip && sigLeftNip !== '-' && sigLeftNip !== '' ? \`<p style="margin:2px 0 0 0;font-size:13px;">NIP : \${sigLeftNip}</p>\` : ''}`;

content = content.replace(new RegExp(leftSigneeOriginal, "m"), leftSigneeNew);

// Update getReactSignaturePreview to return sigLeftPangkat and includeCamatOverride
content = content.replace(
  /const sigLeftName = localStorage.getItem\('village_signature_left_name'\) \|\| '........................';/g,
  "const sigLeftName = localStorage.getItem('village_signature_left_name') || '........................';\n  const sigLeftPangkat = localStorage.getItem('village_signature_left_pangkat') || '';\n  let finalLeftRole = sigLeftRole;\n  if (includeCamatOverride && !finalLeftRole.toLowerCase().includes('mengetahui')) {\n    finalLeftRole = `Mengetahui,\\n${sigLeftRole}`;\n  }"
);

// We should just use a safer replace for getReactSignaturePreview return value
content = content.replace(/sigLeftRole,/g, "sigLeftRole: finalLeftRole,\n    sigLeftPangkat,");

fs.writeFileSync(file, content, 'utf8');
