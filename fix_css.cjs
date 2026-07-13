const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf-8');

// Replace spacing variables that broke Tailwind
css = css.replace(/--spacing-[^:]+:\s*[^;]+;/g, '');

fs.writeFileSync('src/index.css', css);
