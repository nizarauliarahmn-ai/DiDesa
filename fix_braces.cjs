const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratPenomoran.tsx', 'utf8');

// The missing braces are around handleToggleVisibility and handleSaveClassification
// Let's just fix the functions manually by replacing the bad code block.

const badBlock = `  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormJenis('');
    setFormKlasifikasi('');
    setFormKodeKlasifikasi('');
    setShowModal(true);
  };
    const handleToggleVisibility = (id: string, currentVal: boolean) => {
    const updated = classifications.map(c => c.id === id ? { ...c, isVisible: !currentVal } : c);
    setClassifications(updated);
    saveLetterClassifications(updated);
    showToast('Status visibilitas berhasil diubah', 'success');
  };
  const handleSaveClassification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJenis.trim() || !formKlasifikasi.trim() || !formKodeKlasifikasi.trim()) {
      showToast('Nama jenis, kode, dan nomor klasifikasi tidak boleh kosong!', 'error');
      return;
    }

    let updated: LetterClassification[];
    if (editingItem) {
      updated = classifications.map(c => c.id === editingItem.id ? {
        ...c,
        jenis: formJenis.toUpperCase().trim(),
        klasifikasi: formKlasifikasi.toUpperCase().trim(),
        kodeKlasifikasi: formKodeKlasifikasi.trim()
      } : c);
      showToast(\`Klasifikasi "\${formJenis}" berhasil diperbarui!\`, 'success');
    } else {
      const newItem: LetterClassification = {
        id: Date.now().toString(),
        jenis: formJenis.toUpperCase().trim(),
        klasifikasi: formKlasifikasi.toUpperCase().trim(),
        kodeKlasifikasi: formKodeKlasifikasi.trim(),
        noUrutTerakhir: getGlobalSequenceNumber()
      };
      
      updated = [newItem, ...classifications];
      showToast(\`Klasifikasi baru "\${formJenis}" berhasil ditambahkan!\`, 'success');
    }

    setClassifications(updated);
    saveLetterClassifications(updated);
    setShowModal(false);
  };`;

// Find the start and end of this section and replace it
const startPattern = '  const handleOpenAdd = () => {';
const endPattern = '  const authUser = JSON.parse(localStorage.getItem(\'didesa_auth_user\') || \'{}\');';

const startIdx = code.indexOf(startPattern);
const endIdx = code.indexOf(endPattern);

if (startIdx !== -1 && endIdx !== -1) {
  code = code.substring(0, startIdx) + badBlock + '\n' + code.substring(endIdx);
  fs.writeFileSync('src/components/admin/surat/AdminSuratPenomoran.tsx', code);
  console.log('Fixed braces!');
} else {
  console.log('Could not find patterns');
}
