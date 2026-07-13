const fs = require('fs');

let file = 'src/utils/signature.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /<div style="visibility:hidden;">\$\{metaHtml.*?<\/div>\n\s*<div style="margin-top:5px;/g;
content = content.replace(regex, '<div style="');

fs.writeFileSync(file, content, 'utf8');
