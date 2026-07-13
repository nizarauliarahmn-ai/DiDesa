const fs = require('fs');

let file = 'src/utils/signature.ts';
let content = fs.readFileSync(file, 'utf8');

// Fix the syntax error: \\\` -> \`
content = content.replace(/\\\\\\`/g, "`");
content = content.replace(/\\\`/g, "`");

fs.writeFileSync(file, content, 'utf8');
