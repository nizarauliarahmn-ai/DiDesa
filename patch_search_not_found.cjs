const fs = require('fs');
const path = require('path');

const dir = 'src/components/admin/surat';
const files = fs.readdirSync(dir).filter(f => f.startsWith('AdminSurat') && f.endsWith('.tsx'));

const notFoundTarget = `<p className="p-4 text-sm text-slate-500 dark:text-slate-400 italic text-center">Warga tidak ditemukan.</p>`;

const replacementBlock = `(
                      <div className="p-4 text-center space-y-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400 italic">Warga tidak ditemukan di Data Desa.</p>
                        <button
                          type="button"
                          onClick={() => {
                            const isNik = /^\\d+$/.test(searchQuery.trim());
                            setFormData(prev => ({
                              ...prev,
                              nik: isNik ? searchQuery.trim() : prev.nik,
                              nama: !isNik ? searchQuery.trim() : prev.nama
                            }));
                            setShowQuickAddModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-md transition-all text-xs cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          <span>+ Tambah Warga Baru</span>
                        </button>
                      </div>
                    )`;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (content.includes(notFoundTarget)) {
    content = content.replace(notFoundTarget, replacementBlock);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated search dropdown in ${file}`);
  }
}
