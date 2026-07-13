const fs = require('fs');

let file = 'src/components/admin/AdminPengaturan.tsx';
let content = fs.readFileSync(file, 'utf8');

// State
if (!content.includes('sigLeftPangkat')) {
  content = content.replace(
    /const \[sigLeftName, setSigLeftName\] = useState\(\(\) => localStorage\.getItem\('village_signature_left_name'\) \|\| '\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.\.'\);/g,
    "const [sigLeftName, setSigLeftName] = useState(() => localStorage.getItem('village_signature_left_name') || '........................');\n  const [sigLeftPangkat, setSigLeftPangkat] = useState(() => localStorage.getItem('village_signature_left_pangkat') || '');"
  );
}

// Local storage
if (!content.includes('localStorage.setItem(\'village_signature_left_pangkat\'')) {
  content = content.replace(
    /localStorage\.setItem\('village_signature_left_name', sigLeftName\);/g,
    "localStorage.setItem('village_signature_left_name', sigLeftName);\n    localStorage.setItem('village_signature_left_pangkat', sigLeftPangkat);"
  );
}

// Inputs
const pangkatInput = `
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Pangkat / Golongan (Opsional)</label>
                      <input 
                        type="text"
                        value={sigLeftPangkat}
                        onChange={(e) => setSigLeftPangkat(e.target.value)}
                        placeholder="Contoh: Pembina Tk.I/IV/b"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 transition-all font-semibold"
                      />
                    </div>
`;

if (!content.includes('Pangkat / Golongan (Opsional)')) {
  content = content.replace(
    /(<input \n\s*type="text"\n\s*value=\{sigLeftName\}[\s\S]*?className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 transition-all font-semibold"\n\s*\/>\n\s*<\/div>)/m,
    "$1" + pangkatInput
  );
}

// Preview
const oldPreviewLeft = /<p className=\{`font-bold uppercase tracking-wide decoration-1 \$\{previewUnderlineClass\} \$\{previewAlignClass\}`\}>\n\s*\{sigLeftName\}\n\s*<\/p>\n\s*\{sigLeftNip && sigLeftNip !== '-' && \(\n\s*<p className=\{`text-\[10px\] font-mono mt-0\.5 text-gray-700 \$\{previewAlignClass\}`\}>NIP\. \{sigLeftNip\}<\/p>\n\s*\)\}/;

const newPreviewLeft = `<p className={\`font-bold tracking-wide decoration-1 \${previewUnderlineClass} \${previewAlignClass}\`}>
                                  {sigLeftName}
                                </p>
                                {sigLeftPangkat && (
                                  <p className={\`text-[11px] mt-0.5 text-gray-800 \${previewAlignClass}\`}>{sigLeftPangkat}</p>
                                )}
                                {sigLeftNip && sigLeftNip !== '-' && (
                                  <p className={\`text-[11px] mt-0.5 text-gray-800 \${previewAlignClass}\`}>NIP : {sigLeftNip}</p>
                                )}`;

content = content.replace(oldPreviewLeft, newPreviewLeft);

fs.writeFileSync(file, content, 'utf8');
