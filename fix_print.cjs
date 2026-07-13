const fs = require('fs');
let code = fs.readFileSync('src/components/admin/AdminAspirasi.tsx', 'utf8');

const target = `      )}
    </div>
      {showPrintModal && (`;
const replace = `      )}
      {showPrintModal && (`

code = code.replace(target, replace);
code = code.replace(`      )}
  );
}`, `      )}
    </div>
  );
}`);

fs.writeFileSync('src/components/admin/AdminAspirasi.tsx', code);
