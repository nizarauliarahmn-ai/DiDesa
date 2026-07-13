const fs = require('fs');

let file = 'src/components/admin/AdminPengaturan.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove handleShowOnlyMatureLetters
const handleRegex = /const handleShowOnlyMatureLetters = \(\) => \{[\s\S]*?^  \};/m;
content = content.replace(handleRegex, '');

// Remove the button
const buttonRegex = /<button\s+type="button"\s+disabled=\{!isSuperAdmin\}\s+onClick=\{handleShowOnlyMatureLetters\}[\s\S]*?<\/button>/m;
content = content.replace(buttonRegex, '');

fs.writeFileSync(file, content, 'utf8');
