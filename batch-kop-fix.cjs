const fs = require('fs');
const path = require('path');

const dir = 'C:/Users/Gambar Ibung/.gemini/antigravity/scratch/DiDesa/src/components/admin/surat';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

let changedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Fix double border
  // Target: border-bottom:1px solid #000;margin-bottom:1px;font-family:${letterFont};
  // Or: border-bottom:1px solid #000;margin-bottom:1px;font-family:Arial, sans-serif;
  // Replace with: margin-bottom:1px;font-family:...
  content = content.replace(/padding-bottom:6px;border-bottom:1px solid #000;/g, 'padding-bottom:6px;');

  // Some files might use margin-bottom:10px and a separate <div style="border-top:1px solid #000;margin-top:-8px;margin-bottom:10px;"></div>
  // We remove that div if it exists right before <!-- JUDUL SURAT -->
  content = content.replace(/<div style="border-top:1px solid #000;margin-top:-8px;margin-bottom:10px;"><\/div>\s*<!-- JUDUL SURAT -->/g, '<!-- JUDUL SURAT -->');

  // 2. Add DESA prefix
  // Target: >${activeDesa.toUpperCase()}</div> or >${namaDesa.toUpperCase()}</div>
  // Ensure we don't accidentally add DESA DESA if it already has DESA
  const desaRegex = />\$\{(activeDesa|namaDesa)\.toUpperCase\(\)\}<\/div>/g;
  content = content.replace(desaRegex, '>DESA ${$1.toUpperCase()}</div>');

  // Also replace any hardcoded KANTOR KEPALA DESA ${namaDesa.toUpperCase()} to just DESA ${...}
  const hardcodedRegex = />(?:KANTOR KEPALA DESA|PEMERINTAH DESA) \$\{(activeDesa|namaDesa)\.toUpperCase\(\)\}<\/div>/gi;
  content = content.replace(hardcodedRegex, '>DESA ${$1.toUpperCase()}</div>');

  // Also remove PEMERINTAH KABUPATEN hardcoded prefix just in case it exists (SKL had it)
  const kabRegex = />PEMERINTAH KABUPATEN \$\{(activeKabupaten|namaKabupaten)\.toUpperCase\(\)\}<\/div>/g;
  content = content.replace(kabRegex, '>${$1.toUpperCase()}</div>');

  const kecRegex = />KECAMATAN \$\{(activeKecamatan|namaKecamatan)\.toUpperCase\(\)\}<\/div>/g;
  content = content.replace(kecRegex, '>${$1.toUpperCase()}</div>');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    changedCount++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Successfully updated ${changedCount} files.`);
