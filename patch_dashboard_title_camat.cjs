const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

// 1. Update renderReactSignature definition
code = code.replace(
  /const renderReactSignature = \(desaName: string, tglFormatted: string, namaPejabat: string, jabatanPejabat: string, nipPejabat\?: string\) => \{/,
  'const renderReactSignature = (desaName: string, tglFormatted: string, namaPejabat: string, jabatanPejabat: string, nipPejabat?: string, includeCamatOverride?: boolean) => {'
);
code = code.replace(
  /const sig = getReactSignaturePreview\(desaName, tglFormatted, namaPejabat, jabatanPejabat, nipPejabat\);/,
  'const sig = getReactSignaturePreview(desaName, tglFormatted, namaPejabat, jabatanPejabat, nipPejabat, includeCamatOverride);'
);

// 2. Add getTitleFromCode function and replace the title rendering
const titleTarget = /<div className="text-center mb-8">\s*<h6 className="font-bold underline uppercase text-\[16px\] tracking-wide">\s*\{surat\.jenis\.toUpperCase\(\)\}\s*<\/h6>\s*<p className="text-\[14px\] font-mono">Nomor: \{surat\.nomor\}<\/p>\s*<\/div>/g;

const newTitleBlock = `
            <div className="text-center mb-8">
              <h6 className="font-bold underline uppercase text-[16px] tracking-wide" style={{ letterSpacing: '1px' }}>
                {(() => {
                  switch (code) {
                    case 'SKM': return 'SURAT KETERANGAN KEMATIAN';
                    case 'SKAW': return 'SURAT KETERANGAN AHLI WARIS';
                    case 'SKTM': return 'SURAT KETERANGAN TIDAK MAMPU';
                    case 'SKU': return 'SURAT KETERANGAN USAHA';
                    case 'SKBM': return 'SURAT KETERANGAN BELUM PERNAH MENIKAH';
                    case 'SKL': return 'SURAT KETERANGAN KELAHIRAN';
                    case 'SPH': return 'SURAT KETERANGAN PENGANTAR PINDAH';
                    case 'SKPH': return 'SURAT KETERANGAN PENGHASILAN';
                    case 'SKD': return 'SURAT KETERANGAN DOMISILI';
                    case 'SKP': return 'SURAT KETERANGAN PENGANTAR PINDAH';
                    case 'SKH': return 'SURAT KETERANGAN KEHILANGAN';
                    default: return surat.jenis.toUpperCase();
                  }
                })()}
              </h6>
              <p className="text-[14px] font-mono mt-1">Nomor: {surat.nomor}</p>
            </div>
`;

code = code.replace(titleTarget, newTitleBlock);

// 3. Update all renderReactSignature calls to pass sd.includeCamat
code = code.replace(/renderReactSignature\(\s*desaName,\s*surat\.tanggal,\s*namaKades,\s*'Kepala Desa',\s*\(\(\) => \{ try \{ const ol = JSON\.parse\(localStorage\.getItem\('village_officers'\) \|\| '\[\]'\); return ol\.find\(\(o: any\) => o\.name === namaKades\)\?\.nip \|\| '-'; \} catch\(e\) \{ return '-'; \} \}\)\(\)\s*\)/g, 
  "renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)"
);

code = code.replace(/renderReactSignature\(\s*desaName,\s*surat\.tanggal,\s*namaKades,\s*'Kepala Desa',\s*\(\(\) => \{\s*try \{\s*const officersList = JSON\.parse\(localStorage\.getItem\('village_officers'\) \|\| '\[\]'\);\s*const found = officersList\.find\(\(o: any\) => o\.name === namaKades\);\s*return found\?\.nip \|\| '-';\s*\} catch\(e\) \{ return '-'; \}\s*\}\)\(\)\s*\)/g,
  "renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const officersList = JSON.parse(localStorage.getItem('village_officers') || '[]'); const found = officersList.find((o: any) => o.name === namaKades); return found?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)"
);

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Successfully patched title and camat signature');
