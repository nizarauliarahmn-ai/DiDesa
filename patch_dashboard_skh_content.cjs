const fs = require('fs');

let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const oldSKH = `              } else if (code === 'SKH') {
                middleParagraph = \`Adalah benar yang bersangkutan telah melaporkan kehilangan dokumen penting non-pidana. Surat pengantar kehilangan ini diberikan untuk pengurusan dokumen baru ke instansi berwenang:\`;`;

const newSKH = `              } else if (code === 'SKH') {
                specificContent = (
                  <div className="my-6 p-4 bg-orange-50/50 rounded-xl border border-orange-100 text-xs text-orange-950 space-y-2">
                    <p className="font-bold">DETAIL KEHILANGAN:</p>
                    <div className="grid grid-cols-[160px_10px_1fr]"><span>Barang yang Hilang</span><span>:</span><span className="font-bold">{sd.barangHilang || '-'}</span></div>
                    <div className="grid grid-cols-[160px_10px_1fr]"><span>Tanggal Kehilangan</span><span>:</span><span>{sd.tanggalKehilangan || '-'}</span></div>
                    <div className="grid grid-cols-[160px_10px_1fr]"><span>Tempat Kehilangan</span><span>:</span><span>{sd.tempatKehilangan || '-'}</span></div>
                    <div className="grid grid-cols-[160px_10px_1fr]"><span>Keterangan</span><span>:</span><span>{sd.keteranganKehilangan || '-'}</span></div>
                  </div>
                );
                middleParagraph = \`Surat keterangan ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya untuk keperluan:\`;`;

code = code.replace(oldSKH, newSKH);

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Patched SKH specificContent in Dashboard');
