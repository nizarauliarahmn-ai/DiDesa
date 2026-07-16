const fs = require('fs');
const glob = require('glob');

const replacements = [
  { light: 'bg-slate-50/60', dark: 'dark:bg-slate-900/80' },
  { light: 'bg-gray-50/50', dark: 'dark:bg-slate-800/50' },
  { light: 'bg-gray-200/80', dark: 'dark:bg-slate-900/80' },
  { light: 'border-slate-200/50', dark: 'dark:border-slate-700/50' },
  { light: 'bg-white/95', dark: 'dark:bg-slate-800/95' },
  { light: 'bg-white/90', dark: 'dark:bg-slate-900/90' }
];

const files = glob.sync('src/**/*.tsx', { absolute: true });
let count = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  replacements.forEach(({ light, dark }) => {
    // Simply split the content by light class
    const parts = content.split(light);
    if (parts.length > 1) {
      // Reconstruct content, checking if dark class is already present immediately after
      for (let i = 0; i < parts.length - 1; i++) {
         const nextPart = parts[i + 1];
         // Look ahead 20 characters to see if dark class is already there
         if (!nextPart.substring(0, 30).includes(dark)) {
             parts[i] = parts[i] + light + ' ' + dark;
             changed = true;
         } else {
             parts[i] = parts[i] + light;
         }
      }
      content = parts.join('');
    }
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
  }
});
console.log('Fixed fractional backgrounds in ' + count + ' files.');
