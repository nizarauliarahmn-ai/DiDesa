const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/AspirasiWarga.tsx', 'utf8');

code = code.replace("import { showToast } from '../../utils/toast';", "import { showToast } from '../../utils/toast';\nimport { saveAspirasi } from '../../utils/aspirasiData';");

const formVars = `  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);`;
  
const formVarsReplace = `  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    sender: '',
    category: '',
    subject: '',
    content: ''
  });`;

code = code.replace(formVars, formVarsReplace);

const handleSubmitMatch = `  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      showToast('Aspirasi berhasil dikirim!', 'success');
      (e.target as HTMLFormElement).reset();
      setFile(null);
    }, 1500);
  };`;

const handleSubmitReplace = `  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const newAspirasi = {
      id: \`TKT-\${Math.floor(100000 + Math.random() * 900000)}\`,
      sender: formData.sender || 'Anonim',
      category: formData.category || 'umum',
      subject: formData.subject,
      content: formData.content,
      fileName: file ? file.name : null,
      status: 'Menunggu' as const,
      date: new Date().toISOString().split('T')[0]
    };
    
    saveAspirasi(newAspirasi);
    
    setTimeout(() => {
      setIsSubmitting(false);
      showToast('Aspirasi berhasil dikirim! Tiket: ' + newAspirasi.id, 'success');
      (e.target as HTMLFormElement).reset();
      setFile(null);
      setFormData({ sender: '', category: '', subject: '', content: '' });
    }, 1000);
  };`;

code = code.replace(handleSubmitMatch, handleSubmitReplace);

// Now update the inputs to use formData
code = code.replace(/<input [\s\n]*type="text" [\s\n]*className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3\.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500\/20 outline-none transition-all text-sm font-medium" [\s\n]*placeholder="Masukkan nama Anda \(kosongkan jika anonim\)" [\s\n]*\/>/,
  `<input 
                    type="text" 
                    value={formData.sender}
                    onChange={(e) => setFormData({...formData, sender: e.target.value})}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium" 
                    placeholder="Masukkan nama Anda (kosongkan jika anonim)" 
                  />`);

code = code.replace(/<select className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3\.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500\/20 outline-none transition-all text-sm font-medium">/,
  `<select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium">`);

code = code.replace(/<input [\s\n]*list="subjek-options"[\s\n]*type="text" [\s\n]*required[\s\n]*className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3\.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500\/20 outline-none transition-all text-sm font-medium" [\s\n]*placeholder="Pilih atau ketik ringkasan singkat aspirasi Anda" [\s\n]*\/>/,
  `<input 
                  list="subjek-options"
                  type="text" 
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium" 
                  placeholder="Pilih atau ketik ringkasan singkat aspirasi Anda" 
                />`);

code = code.replace(/<textarea [\s\n]*required[\s\n]*className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3\.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500\/20 outline-none transition-all text-sm font-medium min-h-\[120px\] resize-none" [\s\n]*placeholder="Jelaskan aspirasi Anda secara mendalam agar kami dapat menindaklanjuti dengan tepat\.\.\."[\s\n]*><\/textarea>/,
  `<textarea 
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200 p-3.5 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-medium min-h-[120px] resize-none" 
                  placeholder="Jelaskan aspirasi Anda secara mendalam agar kami dapat menindaklanjuti dengan tepat..."
                ></textarea>`);

fs.writeFileSync('src/components/dashboard/AspirasiWarga.tsx', code);
