const fs = require('fs');
let code = fs.readFileSync('src/utils/aspirasiData.ts', 'utf8');

if (!code.includes('adminResponse')) {
  code = code.replace(
    "fileName?: string | null;",
    "fileName?: string | null;\n  adminResponse?: {\n    text: string;\n    fileName?: string | null;\n    date: string;\n  } | null;"
  );
  
  code = code.replace(
    "export function updateAspirasiStatus(id: string, status: 'Menunggu' | 'Proses' | 'Selesai')",
    "export function updateAspirasiStatus(id: string, status: 'Menunggu' | 'Proses' | 'Selesai', response?: { text: string; fileName?: string | null })"
  );
  
  const updateMatch = `const updated = current.map(item => item.id === id ? { ...item, status } : item);`;
  const updateReplace = `const updated = current.map(item => item.id === id ? { 
    ...item, 
    status,
    adminResponse: response ? { ...response, date: new Date().toISOString() } : item.adminResponse
  } : item);`;
  
  code = code.replace(updateMatch, updateReplace);
  fs.writeFileSync('src/utils/aspirasiData.ts', code);
}
