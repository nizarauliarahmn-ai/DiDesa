const fs = require('fs');

let file = 'src/components/admin/AdminPengaturan.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove state sigFormat
content = content.replace(/const \[sigFormat, setSigFormat\] = useState\(\(\) => localStorage\.getItem\('village_signature_format'\) \|\| 'kades'\);\n\s*/g, '');

// 2. Remove localStorage.setItem for sigFormat
content = content.replace(/localStorage\.setItem\('village_signature_format', sigFormat\);\n\s*/g, '');

// 3. Remove "Pilih Format Pengesahan" block
const startFormat = /<div className="space-y-2">\s*<label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Pilih Format Pengesahan<\/label>/;
const endFormat = /<p className="text-\[11px\] text-slate-500 mt-1 mb-3">Data ini akan digunakan saat fitur 'Mengetahui Camat' diaktifkan pada pembuatan surat, atau saat format default diatur menggunakan 2 tanda tangan\.<\/p>/;

const formatMatchStart = content.search(startFormat);
const formatMatchEnd = content.search(endFormat);

if (formatMatchStart !== -1 && formatMatchEnd !== -1) {
  // We need to find the ending div of that block.
  // Actually, I can just use regex to replace from startFormat up to the start of "Left Signee Inputs (Conditional)"
  const regexFormatBlock = /<div className="space-y-2">\s*<label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Pilih Format Pengesahan[\s\S]*?\{\/\* Left Signee Inputs \(Conditional\) \*\/\}\s*\{true && \(/;
  content = content.replace(regexFormatBlock, '{/* Left Signee Inputs */}');
} else {
  console.log("Could not find format block");
}

// 4. In preview layout, remove sigFormat checks and just always render the dual preview (left and right),
// because the left inputs are now just globally set for whenever it's used.

const previewLeftRegex = /\{\(sigFormat === 'kades_camat' \|\| sigFormat === 'kades_bpd'\) \? \(([\s\S]*?)\) : \([\s\S]*?\(Kosong\)[\s\S]*?<\/div>\s*\)\}/;
content = content.replace(previewLeftRegex, '$1');

const previewAnRoleRegex = /\{sigFormat === 'an' \? \([\s\S]*?\) : \(([\s\S]*?)\)\}/;
content = content.replace(previewAnRoleRegex, '$1');

const previewAnNipRegex = /\{sigFormat === 'an' && \([\s\S]*?\}\)/;
content = content.replace(previewAnNipRegex, '');

fs.writeFileSync(file, content, 'utf8');
