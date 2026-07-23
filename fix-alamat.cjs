const fs = require('fs');
const files = fs.readdirSync('src/components/admin/surat').filter(f => f.endsWith('.tsx'));

files.forEach(f => {
  const path = 'src/components/admin/surat/' + f;
  let content = fs.readFileSync(path, 'utf8');
  let changed = false;

  const importRegex = /(import [^;]+;)/;

  const alamatRegex = /onChange=\{\(e\)\s*=>\s*setFormData\(\{\s*\.\.\.formData,\s*alamat:\s*e\.target\.value\s*\}\)\}/g;
  if (alamatRegex.test(content)) {
    content = content.replace(alamatRegex, 
`onChange={(e) => {
  const val = e.target.value;
  const parsed = parseAddress(val);
  setFormData(prev => ({
    ...prev,
    alamat: parsed.cleanAddress,
    ...(parsed.rt ? { rt: parsed.rt } : {}),
    ...(parsed.rw ? { rw: parsed.rw } : {})
  }));
}}`);
    changed = true;
  }

  const alamatSekarangRegex = /onChange=\{\(e\)\s*=>\s*setFormData\(\{\s*\.\.\.formData,\s*alamatSekarang:\s*e\.target\.value\s*\}\)\}/g;
  if (alamatSekarangRegex.test(content)) {
    content = content.replace(alamatSekarangRegex, 
`onChange={(e) => {
  const val = e.target.value;
  const parsed = parseAddress(val);
  setFormData(prev => ({
    ...prev,
    alamatSekarang: parsed.cleanAddress,
    ...(parsed.rt ? { rtSekarang: parsed.rt } : {}),
    ...(parsed.rw ? { rwSekarang: parsed.rw } : {}),
    ...(parsed.desa ? { desaSekarang: parsed.desa } : {}),
    ...(parsed.kec ? { kecamatanSekarang: parsed.kec } : {})
  }));
}}`);
    changed = true;
  }

  if (changed) {
    if (!content.includes('parseAddress')) {
       content = content.replace(importRegex, "$1\nimport { parseAddress } from '../../../utils/addressParser';");
    }
    fs.writeFileSync(path, content);
    console.log('Fixed ' + f);
  }
});
