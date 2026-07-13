const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/AspirasiWarga.tsx', 'utf8');

code = code.replace(
  `                </label>
                  <p className="text-sm font-bold text-slate-700">Klik untuk unggah atau seret berkas ke sini</p>
                  <p className="text-xs text-slate-500 font-medium">Format: JPG, PNG, PDF (Maks. 5MB)</p>
                </div>
              </div>`,
  `                </label>
              </div>`
);

fs.writeFileSync('src/components/dashboard/AspirasiWarga.tsx', code);
