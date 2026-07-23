const fs = require('fs');
const path = 'src/components/PublicBukuTamu.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove Scanner import
content = content.replace(/import \{ Scanner \} from '@yudiel\/react-qr-scanner';\n/, '');

// Add Search to lucide-react import
content = content.replace(/import \{\n  BookOpen, QrCode, User, MapPin, Briefcase, ChevronRight,\n  CheckCircle2, RefreshCw, Keyboard, ArrowLeft, Home\n\} from 'lucide-react';/, "import {\n  BookOpen, QrCode, User, MapPin, Briefcase, ChevronRight,\n  CheckCircle2, RefreshCw, Keyboard, ArrowLeft, Home, Search\n} from 'lucide-react';");

// 2. Change initial step to 'form'
content = content.replace(/useState<KioskStep>\('welcome'\);/, "useState<KioskStep>('form');");

// 3. Remove steps: 'welcome' and 'scan' from type KioskStep
content = content.replace(/type KioskStep = 'welcome' \| 'scan' \| 'form' \| 'success';/, "type KioskStep = 'form' | 'success';");

// 4. Update the return block
// We need to match from {/* WELCOME */} down to {/* FORM */}
const startWelcome = content.indexOf('{/* WELCOME */}');
const startForm = content.indexOf('{/* FORM */}');

if (startWelcome > -1 && startForm > -1) {
  content = content.substring(0, startWelcome) + content.substring(startForm);
}

// 5. Update the FORM block to include NIK input at the top and remove the back button
const formBlockStart = content.indexOf('{step === \'form\' && (');
if (formBlockStart > -1) {
  content = content.replace(
    /<div className=\"flex items-center gap-3 mb-5\">\s*<button onClick=\{\(\) => setStep\('welcome'\)\} className=\"p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors\">\s*<ArrowLeft className=\"w-5 h-5\" \/>\s*<\/button>\s*<h2 className=\"font-bold text-gray-900\">Data Kunjungan<\/h2>\s*<\/div>/g,
    `<div className="flex items-center gap-3 mb-5">
              <h2 className="font-bold text-gray-900">Data Kunjungan</h2>
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-medium p-3 mb-4 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            {isLookingUp && (
              <div className="py-4 text-center">
                <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Mencari data...</p>
              </div>
            )}`
  );
}

// 6. Add NIK input at the top of the form fields
content = content.replace(
  /<div className=\"space-y-4 max-h-\[60vh\] overflow-y-auto pr-1\">\s*<div>\s*<label className=\"text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1\">Nama Lengkap/g,
  `<div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">NIK (Opsional)</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    data-no-cap
                    maxLength={16}
                    value={form.nik}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\\D/g, '');
                      setForm(p => ({ ...p, nik: val }));
                      if (val.length === 16) {
                        lookupNik(val);
                      }
                    }}
                    placeholder="16 Digit NIK KTP..."
                    className="flex-1 h-12 px-4 border-2 border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:border-emerald-500 outline-none transition-all"
                  />
                  <button
                    onClick={(e) => {
                       e.preventDefault();
                       if (form.nik.length === 16) lookupNik(form.nik);
                       else setError('NIK harus 16 digit.');
                    }}
                    className="h-12 px-4 bg-emerald-100 text-emerald-700 font-bold rounded-xl hover:bg-emerald-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Isi NIK untuk otomatis melengkapi nama & alamat (khusus warga).</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Nama Lengkap`
);

fs.writeFileSync(path, content);
console.log('Fixed');
