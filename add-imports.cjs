const fs = require('fs');
const files = fs.readdirSync('src/components/admin/surat').filter(f => f.endsWith('.tsx'));
files.forEach(f => {
  const path = 'src/components/admin/surat/' + f;
  let content = fs.readFileSync(path, 'utf8');
  if (content.includes('parseAddress') && !content.includes('addressParser')) {
    content = "import { parseAddress } from '../../../utils/addressParser';\n" + content;
    fs.writeFileSync(path, content);
    console.log('Added import to ' + f);
  }
});
