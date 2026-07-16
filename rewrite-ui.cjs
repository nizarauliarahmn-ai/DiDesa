const fs = require('fs');
const file = 'C:/Users/Gambar Ibung/.gemini/antigravity/scratch/DiDesa/src/components/admin/surat/AdminSuratSKL.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace states
content = content.replace(/const \[ayahData, setAyahData\] = useState\(\{[\s\S]*?\}\);[\s\S]*?\/\/ Data RS\/Klinik[\s\S]*?\}\);/, `const [ayahData, setAyahData] = useState({
    nik: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    alamat: ''
  });

  // Data Ibu
  const [ibuData, setIbuData] = useState({
    nik: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    alamat: ''
  });

  // Saksi 1
  const [saksi1Data, setSaksi1Data] = useState({
    nik: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    alamat: ''
  });

  // Saksi 2
  const [saksi2Data, setSaksi2Data] = useState({
    nik: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    alamat: ''
  });`);

// 2. Replace ayah/ibu inputs "Umur" with "Tempat, Tanggal Lahir"
content = content.replace(/<label[^>]*>Umur \(Tahun\)<\/label>[\s\S]*?value=\{ayahData\.umur\}[\s\S]*?onChange=\{\(e\) => setAyahData\(\{\.\.\.ayahData, umur: e\.target\.value\}\)\}[\s\S]*?\/>/, 
  `<label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input type="text" placeholder="Tempat Lahir" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={ayahData.tempatLahir} onChange={(e) => setAyahData({...ayahData, tempatLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="text" placeholder="Misal: 01 Maret 1967" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={ayahData.tanggalLahir} onChange={(e) => setAyahData({...ayahData, tanggalLahir: e.target.value})} />`
);

content = content.replace(/<label[^>]*>Umur \(Tahun\)<\/label>[\s\S]*?value=\{ibuData\.umur\}[\s\S]*?onChange=\{\(e\) => setIbuData\(\{\.\.\.ibuData, umur: e\.target\.value\}\)\}[\s\S]*?\/>/, 
  `<label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input type="text" placeholder="Tempat Lahir" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={ibuData.tempatLahir} onChange={(e) => setIbuData({...ibuData, tempatLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="text" placeholder="Misal: 02 April 1971" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={ibuData.tanggalLahir} onChange={(e) => setIbuData({...ibuData, tanggalLahir: e.target.value})} />`
);

// 3. Replace Data Pelapor and RS inputs with Saksi 1 and Saksi 2
const saksiForm = `
            {/* Saksi 1 */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Saksi 1</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                  <input type="text" placeholder="16 digit NIK" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.nik} onChange={(e) => setSaksi1Data({...saksi1Data, nik: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama</label>
                  <input type="text" placeholder="Nama lengkap" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.nama} onChange={(e) => setSaksi1Data({...saksi1Data, nama: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input type="text" placeholder="Tempat Lahir" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.tempatLahir} onChange={(e) => setSaksi1Data({...saksi1Data, tempatLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="text" placeholder="Misal: 05 Maret 1988" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.tanggalLahir} onChange={(e) => setSaksi1Data({...saksi1Data, tanggalLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <input type="text" placeholder="Pekerjaan" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.pekerjaan} onChange={(e) => setSaksi1Data({...saksi1Data, pekerjaan: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat</label>
                  <textarea rows={2} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none" value={saksi1Data.alamat} onChange={(e) => setSaksi1Data({...saksi1Data, alamat: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Saksi 2 */}
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Saksi 2</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                  <input type="text" placeholder="16 digit NIK" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.nik} onChange={(e) => setSaksi2Data({...saksi2Data, nik: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama</label>
                  <input type="text" placeholder="Nama lengkap" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.nama} onChange={(e) => setSaksi2Data({...saksi2Data, nama: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input type="text" placeholder="Tempat Lahir" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.tempatLahir} onChange={(e) => setSaksi2Data({...saksi2Data, tempatLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="text" placeholder="Misal: 12 Januari 1991" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.tanggalLahir} onChange={(e) => setSaksi2Data({...saksi2Data, tanggalLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <input type="text" placeholder="Pekerjaan" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.pekerjaan} onChange={(e) => setSaksi2Data({...saksi2Data, pekerjaan: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat</label>
                  <textarea rows={2} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none" value={saksi2Data.alamat} onChange={(e) => setSaksi2Data({...saksi2Data, alamat: e.target.value})} />
                </div>
              </div>
            </div>`;

content = content.replace(/\{\/\* Data Pelapor \(Opsional\) \*\/\}[\s\S]*?\{\/\* Data RS\/Klinik \(Opsional\) \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/, saksiForm);

fs.writeFileSync(file, content);
console.log('UI forms replaced successfully.');
