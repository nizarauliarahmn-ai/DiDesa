const fs = require('fs');

const files = [
  'src/components/admin/surat/AdminSuratSKTM.tsx',
  'src/components/admin/surat/AdminSuratSPH.tsx',
  'src/components/admin/surat/AdminSuratSKPH.tsx',
  'src/components/admin/surat/AdminSuratSKM.tsx',
  'src/components/admin/surat/AdminSuratSKU.tsx',
  'src/components/admin/surat/AdminSuratNikah.tsx',
  'src/components/admin/surat/AdminSuratBuat.tsx',
  'src/components/admin/surat/AdminSuratDashboard.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // We look for: <p className={`font-bold uppercase text-xs m-0 decoration-1 ${nameUnderlineClass} ${textAlignClass}`}>{sig.sigLeftName}</p>
  // Or similar.
  const regex = /<p className=\{`font-bold.*?\{sig\.sigLeftName\}<\/p>(\s*\{sig\.sigLeftNip)/;
  if (content.match(regex)) {
    content = content.replace(
      regex, 
      `<p className={\`font-bold text-xs m-0 decoration-1 \${nameUnderlineClass} \${textAlignClass}\`}>{sig.sigLeftName}</p>\n            {sig.sigLeftPangkat && (\n              <p className={\`text-[11px] mt-0.5 text-gray-800 m-0 \${textAlignClass}\`}>{sig.sigLeftPangkat}</p>\n            )}$1`
    );
  }

  // Also replace 'NIP. {sig.sigLeftNip}' with 'NIP : {sig.sigLeftNip}' if it exists in left signee
  // Only for left signee!
  const nipRegex = /\{sig\.sigLeftNip && sig\.sigLeftNip !== '-' && \(\s*<p className=\{`text-\[10px\].*?`\}>NIP\. \{sig\.sigLeftNip\}<\/p>\s*\)\}/;
  if (content.match(nipRegex)) {
    content = content.replace(
      nipRegex,
      `{sig.sigLeftNip && sig.sigLeftNip !== '-' && (\n              <p className={\`text-[11px] mt-0.5 text-gray-800 m-0 \${textAlignClass}\`}>NIP : {sig.sigLeftNip}</p>\n            )}`
    );
  }

  fs.writeFileSync(file, content, 'utf8');
}
