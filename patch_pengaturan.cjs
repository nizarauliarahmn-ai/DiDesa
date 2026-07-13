const fs = require('fs');

let content = fs.readFileSync('src/components/admin/AdminPengaturan.tsx', 'utf8');

// We want to remove the conditional `{(sigFormat === 'kades_camat' || sigFormat === 'kades_bpd') && (`
// Let's find it.

const startStr = "{(sigFormat === 'kades_camat' || sigFormat === 'kades_bpd') && (";

if (content.includes(startStr)) {
  content = content.replace(startStr, "{true && (");
  
  // also change the title:
  // <p className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Informasi Pengesah Sebelah Kiri</p>
  content = content.replace(
    /<p className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Informasi Pengesah Sebelah Kiri<\/p>/g,
    `<p className="text-xs font-extrabold text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-2">Informasi Pengesah Sebelah Kiri (Camat / BPD)</p>\n                    <p className="text-[11px] text-slate-500 mt-1 mb-3">Data ini akan digunakan saat fitur 'Mengetahui Camat' diaktifkan pada pembuatan surat, atau saat format default diatur menggunakan 2 tanda tangan.</p>`
  );
  
  fs.writeFileSync('src/components/admin/AdminPengaturan.tsx', content, 'utf8');
  console.log('Patched AdminPengaturan.tsx conditional');
} else {
  console.log('Conditional not found');
}
