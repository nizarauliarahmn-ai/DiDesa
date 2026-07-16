const fs = require('fs');
const path = require('path');
const glob = require('glob');

const replacements = [
  { light: 'bg-white', dark: 'dark:bg-slate-900' },
  { light: 'bg-slate-50', dark: 'dark:bg-slate-800' },
  { light: 'bg-gray-50', dark: 'dark:bg-slate-800' },
  { light: 'bg-slate-100', dark: 'dark:bg-slate-800' },
  { light: 'bg-gray-100', dark: 'dark:bg-slate-800' },
  { light: 'text-slate-900', dark: 'dark:text-white' },
  { light: 'text-gray-900', dark: 'dark:text-white' },
  { light: 'text-slate-800', dark: 'dark:text-slate-100' },
  { light: 'text-gray-800', dark: 'dark:text-slate-100' },
  { light: 'text-slate-700', dark: 'dark:text-slate-300' },
  { light: 'text-gray-700', dark: 'dark:text-slate-300' },
  { light: 'text-slate-600', dark: 'dark:text-slate-400' },
  { light: 'text-gray-600', dark: 'dark:text-slate-400' },
  { light: 'text-slate-500', dark: 'dark:text-slate-400' },
  { light: 'text-gray-500', dark: 'dark:text-slate-400' },
  { light: 'border-slate-200', dark: 'dark:border-slate-700' },
  { light: 'border-gray-200', dark: 'dark:border-slate-700' },
  { light: 'border-slate-100', dark: 'dark:border-slate-800' },
  { light: 'border-gray-100', dark: 'dark:border-slate-800' },
  { light: 'border-slate-300', dark: 'dark:border-slate-600' },
  { light: 'border-gray-300', dark: 'dark:border-slate-600' },
  { light: 'hover:bg-slate-50', dark: 'dark:hover:bg-slate-800' },
  { light: 'hover:bg-gray-50', dark: 'dark:hover:bg-slate-800' },
  { light: 'hover:bg-slate-100', dark: 'dark:hover:bg-slate-700' },
  { light: 'hover:bg-gray-100', dark: 'dark:hover:bg-slate-700' },
  { light: 'bg-white/50', dark: 'dark:bg-slate-900/50' },
  { light: 'bg-white/80', dark: 'dark:bg-slate-900/80' },
  { light: 'bg-white/90', dark: 'dark:bg-slate-900/90' },
  { light: 'shadow-sm', dark: 'dark:shadow-none' },
  { light: 'shadow-md', dark: 'dark:shadow-none' },
  { light: 'shadow-lg', dark: 'dark:shadow-none' }
];

const files = glob.sync('src/**/*.tsx', { absolute: true });
let updatedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  replacements.forEach(({ light, dark }) => {
    const regex = new RegExp(`(?<=[\\s'"\`])${light}(?=[\\s'"\`])`, 'g');
    
    content = content.replace(regex, (match, offset, string) => {
       const substrAfter = string.substring(offset, offset + 35);
       if (substrAfter.includes(dark)) {
         return match; 
       }
       changed = true;
       return `${light} ${dark}`;
    });
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    updatedFiles++;
  }
});

console.log(`Successfully updated ${updatedFiles} files with dark mode classes.`);
