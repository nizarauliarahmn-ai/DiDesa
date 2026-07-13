const fs = require('fs');

// Patch AdminSurat.tsx
let file = 'src/components/admin/AdminSurat.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/import AdminSuratSKPH from '\.\/surat\/AdminSuratSKPH';/, "import AdminSuratSKPH from './surat/AdminSuratSKPH';\nimport AdminSuratSKD from './surat/AdminSuratSKD';");

content = content.replace(/activeTab === 'skph' \|\| 'master_template'/, "activeTab === 'skph' || activeTab === 'skd' || activeTab === 'master_template'");

// Add active tab types
content = content.replace(/\| 'skph' \| 'master_template'/, "| 'skph' | 'skd' | 'master_template'");

// Add to AdminSuratBuat component props
content = content.replace(/onOpenSKPH=\{\(\) => setActiveTab\('skph'\)\}/, "onOpenSKPH={() => setActiveTab('skph')}\n            onOpenSKD={() => setActiveTab('skd')}");

// Add the rendering block
content = content.replace(/\{activeTab === 'skph' && \([\s\S]*?\}\)/, `{activeTab === 'skph' && (
          <AdminSuratSKPH 
            onBack={() => setActiveTab('buat')} 
          />
        )}
        {activeTab === 'skd' && (
          <AdminSuratSKD 
            onBack={() => setActiveTab('buat')} 
          />
        )}`);
fs.writeFileSync(file, content, 'utf8');

// Patch AdminSuratBuat.tsx
let file2 = 'src/components/admin/surat/AdminSuratBuat.tsx';
let content2 = fs.readFileSync(file2, 'utf8');

content2 = content2.replace(/onOpenSKPH\?: \(\) => void,/, "onOpenSKPH?: () => void,\n  onOpenSKD?: () => void,");

const skdBlock = `                      } else if (selectedTemplate === 'SKD' || selectedTemplate === 'SKDPR') {
                        middleParagraph = \`Berdasarkan surat pernyataan dan keterangan yang dibuat oleh yang bersangkutan, nama tersebut di atas menyatakan dengan sadar bahwa ia memang BERDOMISILI di alamat sekarang tersebut. Surat keterangan ini diterbitkan untuk dipergunakan sebagaimana mestinya:\`;
                        specificContent = (
                          <div className="my-6 space-y-2 pl-4 border-l-2 border-emerald-600/30">
                            <p className="font-bold uppercase text-[12px] tracking-wide text-emerald-950 mb-2">ALAMAT DOMISILI SEKARANG:</p>
                            <p className="font-medium text-emerald-900 italic">Belum diisi - (Akan diisi di Form Pembuatan SKD)</p>
                          </div>
                        );
`;

content2 = content2.replace(/\} else if \(selectedTemplate === 'SKTM'\) \{/, skdBlock + "                      } else if (selectedTemplate === 'SKTM') {");

content2 = content2.replace(/onOpenSKPH\(\);/, `onOpenSKPH();\n    } else if (template === 'SKD' || template === 'SKDPR') {\n      if (onOpenSKD) onOpenSKD();`);

fs.writeFileSync(file2, content2, 'utf8');
