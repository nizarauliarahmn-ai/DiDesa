const fs = require('fs');
let code = fs.readFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', 'utf8');

// Add import
if (!code.includes("SAAS_CONFIG")) {
  code = code.replace(
    "import { showToast } from '../../../utils/toast';",
    "import { showToast } from '../../../utils/toast';\nimport { SAAS_CONFIG } from './AdminSuratMasterTemplate';"
  );
}

// Update zoomLevel default
code = code.replace(
  "const [zoomLevel, setZoomLevel] = useState(0.8);",
  "const [zoomLevel, setZoomLevel] = useState(0.65);"
);

// Update preview div to relative and add footer
const targetPreview = /className="bg-white shadow-lg border border-gray-300 p-12 text-black transition-all shrink-0 origin-top"/;
const newPreview = 'className="bg-white shadow-lg border border-gray-300 p-12 text-black transition-all shrink-0 origin-top relative"';
code = code.replace(targetPreview, newPreview);

const targetContent = /\{renderLetterContent\(selectedSurat, activeResident\)\}\n                <\/div>/;
const newContent = `{renderLetterContent(selectedSurat, activeResident)}
                  {/* Global Print Footer */}
                  <div 
                    className="absolute bottom-[8mm] left-[15mm] right-[15mm] w-[calc(100%-30mm)]"
                    dangerouslySetInnerHTML={{ 
                      __html: SAAS_CONFIG.globalFooterHTML
                    }} 
                  />
                </div>`;
code = code.replace(targetContent, newContent);

fs.writeFileSync('src/components/admin/surat/AdminSuratDashboard.tsx', code);
console.log('Successfully patched preview zoom and footer');
