const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminApprovalQueue.tsx', 'utf8');

code = code.replace(/<thead[\s\S]*?<\/thead>/, match => match.replace(/<\/motion\.tr>/g, '</tr>'));

fs.writeFileSync('src/components/admin/AdminApprovalQueue.tsx', code);
