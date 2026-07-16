const fs = require('fs');
const path = 'C:/Users/Gambar Ibung/.gemini/antigravity/scratch/DiDesa/src/components/admin/surat/AdminSuratSPPD.tsx';
let txt = fs.readFileSync(path, 'utf8');

const m1 = '<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">\n            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Pegawai yang Diperintah</h3>';
const m2 = '            </div>\n          </div>\n\n          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">\n            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Pembebanan Anggaran</h3>';

let start = txt.indexOf(m1);
let end = txt.indexOf(m2);

if (start !== -1 && end !== -1) {
    let blockToMove = txt.substring(start, end);
    
    blockToMove = blockToMove.replace(
        '{residents.filter(r => r.name.toLowerCase().includes(namaPegawai.toLowerCase()) || r.nik.includes(namaPegawai)).slice(0, 5).map(res => (',
        '{[...officers, ...residents].filter((r: any) => (r.name || r.nama || "").toLowerCase().includes(namaPegawai.toLowerCase()) || (r.nik || r.nip || "").includes(namaPegawai)).slice(0, 5).map((res: any, idx: number) => ('
    );
    
    blockToMove = blockToMove.replace(
        'key={res.nik}',
        'key={res.nik || res.nip || idx}'
    );
    
    blockToMove = blockToMove.replace(
        'setNamaPegawai(res.name);\n                            setNipPegawai(res.nik);\n                            setJabatanPegawai(res.pekerjaan || \\'\\');',
        'setNamaPegawai(res.name || res.nama || "");\n                            setNipPegawai(res.nik || res.nip || "");\n                            setJabatanPegawai(res.pekerjaan || res.jabatan || "");'
    );
    
    blockToMove = blockToMove.replace(
        '<div className="font-semibold text-gray-900 dark:text-white text-sm">{res.name}</div>\n                          <div className="text-xs text-gray-500 dark:text-slate-400">NIK: {res.nik} &bull; {res.pekerjaan || \\'Tidak ada pekerjaan\\'}</div>',
        '<div className="font-semibold text-gray-900 dark:text-white text-sm">{res.name || res.nama}</div>\n                          <div className="text-xs text-gray-500 dark:text-slate-400">{res.nik ? "NIK: " + res.nik : (res.nip ? "NIP: " + res.nip : "")} &bull; {res.pekerjaan || res.jabatan || "Tidak ada keterangan"}</div>'
    );
    
    txt = txt.substring(0, start) + txt.substring(end);
    
    const target = '<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">\n            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Detail Perjalanan Dinas & Dasar</h3>';
    
    txt = txt.replace(target, blockToMove + '\n\n          ' + target);
    fs.writeFileSync(path, txt);
    console.log('SUCCESS');
} else {
    console.log('FAILED TO FIND MARKERS', { start, end });
}
