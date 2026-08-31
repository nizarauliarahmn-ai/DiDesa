const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Gambar Ibung\\Documents\\DiDesa\\src\\components\\admin\\surat';

// Files that need onSave added (no handleSave yet)
const needSave = [
  'AdminSuratSKM.tsx', 'AdminSuratSKBM.tsx', 'AdminSuratSDU.tsx',
  'AdminSuratSKH.tsx', 'AdminSuratSKTM.tsx', 'AdminSuratSDP.tsx',
  'AdminSuratSKL.tsx', 'AdminSuratSPT.tsx', 'AdminSuratSKU.tsx',
  'AdminSuratSKAW.tsx', 'AdminSuratSKPH.tsx', 'AdminSuratSKP.tsx'
];

// Files that need onPrint added
const needPrint = ['AdminSuratSKKT.tsx'];

// Files that just need onSave prop (handleSave already exists)
const needSaveProp = ['AdminSuratUndangan.tsx'];

function extractSavePattern(content) {
  // Find the addLetterHistory call in handlePrint
  const historyMatch = content.match(/addLetterHistory\(\{[\s\S]*?\}\)/);
  if (!historyMatch) return null;
  
  // Find jenis name
  const jenisMatch = historyMatch[0].match(/jenis:\s*'([^']+)'/);
  const jenis = jenisMatch ? jenisMatch[1] : 'Surat';
  
  // Find validation field
  const validMatch = content.match(/if\s*\(\s*!(\w+(?:\.\w+)*)\s*(?:\|\|\s*!(\w+(?:\.\w+)*))?\s*\)/);
  
  return { jenis, fullMatch: historyMatch[0] };
}

function extractValidation(content) {
  // Find the validation block at start of handlePrint
  const match = content.match(/const handlePrint[^{]*\{[\s]*if\s*\(\s*!([^)]+)\)\s*\{[^}]*showToast\('([^']+)'/);
  if (match) {
    return { condition: match[1], message: match[2] };
  }
  return null;
}

// Process files that need handleSave created
for (const file of needSave) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  const saveInfo = extractSavePattern(content);
  const validation = extractValidation(content);
  
  if (!saveInfo) {
    console.log(`SKIP ${file}: could not extract save pattern`);
    continue;
  }
  
  // Find jenis from the addLetterHistory in handlePrint
  const jenisMatch = content.match(/addLetterHistory\(\{[^}]*jenis:\s*'([^']+)'/s);
  const jenis = jenisMatch ? jenisMatch[1] : 'Surat';
  
  // Find nomorSurat field name
  const nomorField = content.includes('formData.nomorSurat') ? 'formData.nomorSurat' : 
                     content.includes('nomorSurat') ? 'nomorSurat' : "''";
  
  // Find keperluan field
  const hasKeperluan = content.includes('formData.keperluan');
  
  // Build validation line
  let validationLine = '';
  if (file === 'AdminSuratSKKT.tsx') {
    validationLine = `    if (!formData.nama || !formData.nik || !formData.luasTanah) {
      showToast('Mohon lengkapi nama pemohon, NIK, dan luas tanah.', 'error');
      return;
    }`;
  } else if (file === 'AdminSuratSKL.tsx') {
    validationLine = `    if (!formData.namaIbu || !formData.namaAyah) {
      showToast('Mohon lengkapi nama ibu dan nama ayah.', 'error');
      return;
    }`;
  } else {
    validationLine = `    if (!formData.nama || !formData.nama.trim()) {
      showToast('Mohon lengkapi nama pemohon terlebih dahulu.', 'error');
      return;
    }`;
  }
  
  const keperluanLine = hasKeperluan ? '\n      keperluan: formData.keperluan,' : '';
  
  const handleSaveFn = `
  const handleSave = async () => {
${validationLine}
    setLoading(true);
    
    const updatedFields = {
      nomor: ${nomorField},
      nik: formData.nik,
      nama: formData.nama,${keperluanLine}
      data: formData
    };

    try {
      if (editLetterId) {
        await updateLetterHistory(editLetterId, updatedFields);
        showToast('Surat berhasil diperbarui!', 'success');
      } else {
        await addLetterHistory({
          ...updatedFields,
          jenis: '${jenis}',
          tanggal: isBackdate ? new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          status: 'Selesai'
        });
        if (!isBackdate) incrementSequenceNumber('${jenis.replace(/[^a-zA-Z]/g, '').substring(0, 5)}');
        showToast('Surat berhasil disimpan ke Arsip!', 'success');
      }
    } catch (err) {
      showToast('Gagal menyimpan surat: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };
`;
  
  // Insert handleSave before handlePrint
  const printIdx = content.indexOf('const handlePrint');
  if (printIdx === -1) {
    console.log(`SKIP ${file}: no handlePrint found`);
    continue;
  }
  
  // Find the line before handlePrint
  const beforePrint = content.substring(0, printIdx);
  const afterPrint = content.substring(printIdx);
  
  content = beforePrint + handleSaveFn + afterPrint;
  
  // Add onSave to SuratEditorHeader
  content = content.replace(
    /<SuratEditorHeader\s+([^]*?)(onPrint=\{handlePrint\})/,
    `<SuratEditorHeader $1onSave={handleSave}\n          isSaving={loading}\n          $2`
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`DONE ${file}: added handleSave + onSave prop`);
}

// Process files that just need onSave prop (handleSave exists)
for (const file of needSaveProp) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(
    /<SuratEditorHeader\s+([^]*?)(onPrint=\{handlePrint\})/,
    `<SuratEditorHeader $1onSave={handleSave}\n          $2`
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`DONE ${file}: added onSave prop (handleSave existed)`);
}

// Process SKKT - add onPrint
for (const file of needPrint) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if handlePrint exists
  if (!content.includes('const handlePrint')) {
    // Need to create handlePrint - copy from handleSave pattern
    const handlePrintFn = `
  const handlePrint = async () => {
    await handleSave();
  };
`;
    const saveIdx = content.indexOf('const handleSave');
    if (saveIdx !== -1) {
      // Find end of handleSave function
      let braceCount = 0;
      let endIdx = saveIdx;
      let started = false;
      for (let i = saveIdx; i < content.length; i++) {
        if (content[i] === '{') { braceCount++; started = true; }
        if (content[i] === '}') braceCount--;
        if (started && braceCount === 0) { endIdx = i + 1; break; }
      }
      content = content.substring(0, endIdx) + handlePrintFn + content.substring(endIdx);
    }
  }
  
  // Add onPrint to SuratEditorHeader  
  content = content.replace(
    /printLabel="Simpan & Cetak"/,
    `onPrint={handlePrint}\n          printLabel="Cetak"`
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`DONE ${file}: added onPrint prop`);
}

console.log('\nAll done!');
