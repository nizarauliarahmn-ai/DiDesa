const fs = require('fs');

let file = 'src/components/admin/surat/AdminSuratPenomoran.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add handleToggleVisibility function
const handleToggleVisibility = `
  const handleToggleVisibility = (id: string, currentVal: boolean) => {
    const updated = classifications.map(c => c.id === id ? { ...c, isVisible: !currentVal } : c);
    setClassifications(updated);
    saveLetterClassifications(updated);
    showToast('Status visibilitas berhasil diubah', 'success');
  };
`;

content = content.replace(/const handleDelete = \(id: string\) => \{/, handleToggleVisibility + '\n  const handleDelete = (id: string) => {');

// In the table, replace the actions column with a toggle switch
const tableActionsRegex = /<td className="px-6 py-3\.5 text-right">[\s\S]*?<\/td>/g;

content = content.replace(tableActionsRegex, (match) => {
  return `<td className="px-6 py-3.5">
                          <button 
                            onClick={() => handleToggleVisibility(item.id, item.isVisible !== false)}
                            className={\`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none \${item.isVisible !== false ? 'bg-emerald-500' : 'bg-gray-200'}\`}
                          >
                            <span className={\`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform \${item.isVisible !== false ? 'translate-x-4.5' : 'translate-x-1'}\`} />
                          </button>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleOpenEdit(item)}
                              className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-colors"
                              title="Edit Klasifikasi"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id)}
                              className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors"
                              title="Hapus Klasifikasi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>`;
});

// Also add a column header for "Status"
content = content.replace(/<th className="px-6 py-4 text-sm font-bold text-gray-900 w-\[150px\]">No Terakhir<\/th>\s*<th className="px-6 py-4 text-right text-sm font-bold text-gray-900 w-\[100px\]">Aksi<\/th>/, `<th className="px-6 py-4 text-sm font-bold text-gray-900 w-[150px]">No Terakhir</th>\n                  <th className="px-6 py-4 text-sm font-bold text-gray-900 w-[100px]">Status</th>\n                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-900 w-[100px]">Aksi</th>`);

// Make sure colSpan for empty state is updated to 5
content = content.replace(/<td colSpan=\{4\}/g, '<td colSpan={5}');

fs.writeFileSync(file, content, 'utf8');
