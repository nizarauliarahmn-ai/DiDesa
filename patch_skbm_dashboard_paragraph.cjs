const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

const targetBlock = /<p className="text-justify leading-relaxed indent-8 mb-2 mt-4">\s*Adalah benar nama tersebut di atas berstatus belum kawin \/ belum pernah menikah berdasarkan registrasi kependudukan kami\.\s*<\/p>\s*\{penutup\(surat\.keperluan, 'Belum Menikah'\)\}/g;

const newBlock = `<p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Berdasarkan data kependudukan kami, nama tersebut di atas benar berstatus <strong>Belum Kawin (Belum Pernah Menikah)</strong>. Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai persyaratan administrasi <strong>{surat.keperluan || '-'}</strong>.
                    </p>
                    <p className="text-justify leading-relaxed indent-8 mb-6 mt-4">
                      Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                    </p>`;

code = code.replace(targetBlock, newBlock);
fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Patched SKBM in dashboard');
