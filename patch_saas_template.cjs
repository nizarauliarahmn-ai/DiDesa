const fs = require('fs');

let file = 'src/components/admin/AdminSaaSTemplateSurat.tsx';
let content = fs.readFileSync(file, 'utf8');

const helperFunctions = `  const generateKodeKlasifikasi = (jenisSurat: string) => {
    const j = jenisSurat.toLowerCase();
    if (j.includes('lahir') || j.includes('kelahiran')) return '474.1';
    if (j.includes('mati') || j.includes('kematian')) return '474.3';
    if (j.includes('pindah')) return '475';
    if (j.includes('nikah') || j.includes('kawin') || j.includes('perawan') || j.includes('belum kawin')) return '474.2';
    if (j.includes('tanah') || j.includes('agraria') || j.includes('jual beli')) return '593';
    if (j.includes('usaha') || j.includes('dagang') || j.includes('ekonomi')) return '500';
    if (j.includes('keuangan') || j.includes('penghasilan') || j.includes('gaji')) return '900';
    if (j.includes('hilang') || j.includes('kehilangan') || j.includes('skck') || j.includes('kelakuan baik') || j.includes('skkb')) return '331';
    if (j.includes('domisili') || j.includes('tinggal') || j.includes('penduduk')) return '470';
    if (j.includes('kuasa') || j.includes('rekomendasi') || j.includes('perjanjian')) return '100';
    if (j.includes('pegawai') || j.includes('undur')) return '800';
    if (j.includes('miskin') || j.includes('sktm') || j.includes('bantuan')) return '460';
    if (j.includes('ahli waris') || j.includes('waris')) return '474';
    if (j.includes('umum') || j.includes('keterangan') || j.includes('pengantar')) return '400';
    if (j.includes('undangan')) return '005';
    return '140';
  };

  const generateSingkatan = (jenisSurat: string, existingSingkatan: string[]) => {
    if (!jenisSurat) return '';
    let words = jenisSurat.toUpperCase().replace(/[^A-Z\\s]/g, '').trim().split(/\\s+/);
    if (words.length === 0 || words[0] === '') return '';
    
    let baseSingkatan = '';
    
    if (words[0] === 'SURAT' && words[1] === 'KETERANGAN' && words.length > 2) {
      baseSingkatan = 'SK' + words.slice(2).map(w => w[0]).join('');
    } else if (words[0] === 'SURAT' && words.length > 1) {
      baseSingkatan = 'S' + words.slice(1).map(w => w[0]).join('');
    } else {
      baseSingkatan = words.map(w => w[0]).join('');
    }

    if (baseSingkatan.length < 2 && words.length === 1) {
      baseSingkatan = words[0].substring(0, 3).toUpperCase();
    }
    
    baseSingkatan = baseSingkatan.substring(0, 5);
    
    let attempt = baseSingkatan;
    let counter = 1;
    while (existingSingkatan.includes(attempt)) {
        if (counter < 10 && baseSingkatan.length < 5) {
            attempt = baseSingkatan + counter;
        } else if (counter < 10) {
            attempt = baseSingkatan.substring(0, 4) + counter;
        } else {
            attempt = baseSingkatan.substring(0, 3) + counter;
        }
        counter++;
    }
    
    return attempt;
  };

  const handleJenisChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const jenis = e.target.value.toUpperCase();
    const existing = templates.filter(t => t.id !== editingId).map(t => t.klasifikasi);
    const singkatan = generateSingkatan(jenis, existing);
    const kode = generateKodeKlasifikasi(jenis);
    
    setFormData({
      ...formData,
      jenis,
      klasifikasi: singkatan,
      kodeKlasifikasi: kode
    });
  };
`;

content = content.replace(/const saveTemplates = \(newTemplates: any\[\]\) => \{/, helperFunctions + '\n  const saveTemplates = (newTemplates: any[]) => {');

content = content.replace(/onChange=\{e => setFormData\(\{\.\.\.formData, jenis: e\.target\.value\.toUpperCase\(\)\}\)\}/, "onChange={handleJenisChange}");

// Replace singkatan input
const singkatanRegex = /<label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Singkatan \(Maks 5 Karakter\)<\/label>[\s\S]*?<input [\s\S]*?onChange=\{e => setFormData\(\{\.\.\.formData, klasifikasi: e\.target\.value\.toUpperCase\(\)\.substring\(0, 5\)\}\)\}[\s\S]*?\/>/;

const singkatanReplacement = `<label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Singkatan (Dibuat Otomatis)</label>
                <input 
                  type="text" 
                  value={formData.klasifikasi}
                  readOnly
                  placeholder="Akan dibuat otomatis"
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50/50 focus:ring-0 outline-none text-sm font-bold text-emerald-700 cursor-not-allowed"
                />`;

content = content.replace(singkatanRegex, singkatanReplacement);

// Replace kode klasifikasi input
const kodeKlasifikasiRegex = /<label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Kode Klasifikasi Arsip<\/label>[\s\S]*?<input [\s\S]*?onChange=\{e => setFormData\(\{\.\.\.formData, kodeKlasifikasi: e\.target\.value\}\)\}[\s\S]*?\/>/;

const kodeKlasifikasiReplacement = `<label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Kode Klasifikasi Arsip (Dibuat Otomatis)</label>
                <input 
                  type="text" 
                  value={formData.kodeKlasifikasi}
                  readOnly
                  placeholder="Akan dibuat otomatis"
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 bg-emerald-50/50 focus:ring-0 outline-none text-sm font-mono text-emerald-700 cursor-not-allowed"
                />`;

content = content.replace(kodeKlasifikasiRegex, kodeKlasifikasiReplacement);

fs.writeFileSync(file, content, 'utf8');
