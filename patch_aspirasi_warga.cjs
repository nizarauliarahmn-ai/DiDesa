const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/AspirasiWarga.tsx', 'utf8');

// Subjek
code = code.replace(
  /<input [\s\n]*type="text" [\s\n]*required[\s\n]*className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3\.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500\/20 outline-none transition-all text-sm font-medium" [\s\n]*placeholder="Ringkasan singkat aspirasi Anda" [\s\n]*\/>/,
  `<input 
                  list="subjek-options"
                  type="text" 
                  required
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium" 
                  placeholder="Pilih atau ketik ringkasan singkat aspirasi Anda" 
                />
                <datalist id="subjek-options">
                  <option value="Infrastruktur Jalan Rusak" />
                  <option value="Pelayanan Administrasi Desa" />
                  <option value="Fasilitas Kesehatan/Posyandu" />
                  <option value="Bantuan Sosial (Bansos)" />
                  <option value="Kebersihan dan Lingkungan" />
                  <option value="Lampu Penerangan Jalan" />
                </datalist>`
);

// File upload
if (!code.includes("const [file, setFile] = useState<File | null>(null);")) {
  code = code.replace("const [isSubmitting, setIsSubmitting] = useState(false);", 
    "const [isSubmitting, setIsSubmitting] = useState(false);\n  const [file, setFile] = useState<File | null>(null);");
}

code = code.replace(
  /<div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group">[\s\S]*?<\/div>/,
  `<label className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group block w-full text-center">
                  <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
                  }} />
                  {!file ? (
                    <>
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <CloudUpload className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">Klik untuk unggah atau seret berkas ke sini</p>
                      <p className="text-xs text-slate-500 font-medium">Format: JPG, PNG, PDF (Maks. 5MB)</p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center shadow-sm">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-sm font-bold text-emerald-700">{file.name}</p>
                      <p className="text-xs text-emerald-600/70 font-medium">Klik untuk mengubah berkas</p>
                    </>
                  )}
                </label>`
);

// Reset file on submit
code = code.replace("(e.target as HTMLFormElement).reset();", "(e.target as HTMLFormElement).reset();\n      setFile(null);");

fs.writeFileSync('src/components/dashboard/AspirasiWarga.tsx', code);
