import { FileText, Mail, Megaphone, ClipboardList, X } from 'lucide-react';

export interface LetterTemplate {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  content: string;
}

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: 'blank',
    label: 'Dokumen Kosong (Blank A4)',
    description: 'Mulai dari nol dengan kanvas kosong.',
    icon: <FileText className="w-6 h-6" />,
    content: `<p style="margin-bottom:24px;">&nbsp;</p>`,
  },
  {
    id: 'undangan',
    label: 'Surat Undangan Desa',
    description: 'Pre-filled struktur agenda, waktu, dan tempat rapat.',
    icon: <Mail className="w-6 h-6" />,
    content: `<p style="margin-bottom:16px;text-align:center;font-weight:bold;text-decoration:underline;font-size:14px;">SURAT UNDANGAN</p>
<p style="margin-bottom:8px;">Nomor: ....../.../.../2026</p>
<p style="margin-bottom:16px;">Yang terhormat,</p>
<p style="margin-bottom:4px;padding-left:36px;">........................................</p>
<p style="margin-bottom:16px;padding-left:36px;">di –</p>
<p style="margin-bottom:16px;">Dengan hormat,</p>
<p style="margin-bottom:8px;text-indent:36px;">Bersama ini kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri rapat dengan agenda sebagai berikut:</p>
<table style="width:100%;margin:12px 0;border-collapse:collapse;">
<tr><td style="padding:4px 8px;width:160px;">Hari / Tanggal</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
<tr><td style="padding:4px 8px;">Waktu</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
<tr><td style="padding:4px 8px;">Tempat</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
<tr><td style="padding:4px 8px;">Agenda</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
</table>
<p style="margin-bottom:8px;text-indent:36px;">Mengingat pentingnya rapat tersebut di atas, kami harapkan kehadiran Bapak/Ibu/Saudara/i tepat pada waktunya.</p>
<p style="margin-bottom:8px;text-indent:36px;">Atas perhatian dan kehadirannya, kami ucapkan terima kasih.</p>
<p style="margin-bottom:48px;text-align:right;">&nbsp;</p>`,
  },
  {
    id: 'keterangan',
    label: 'Surat Keterangan Khusus',
    description: 'Pre-filled struktur pernyataan dan keterangan warga.',
    icon: <ClipboardList className="w-6 h-6" />,
    content: `<p style="margin-bottom:16px;text-align:center;font-weight:bold;text-decoration:underline;font-size:14px;">SURAT KETERANGAN</p>
<p style="margin-bottom:8px;text-align:center;">Nomor: ....../.../.../2026</p>
<p style="margin-bottom:16px;">Yang bertanda tangan di bawah ini,</p>
<table style="width:100%;margin:12px 0;border-collapse:collapse;">
<tr><td style="padding:4px 8px;width:160px;">Nama</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
<tr><td style="padding:4px 8px;">Jabatan</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">Kepala Desa .................</td></tr>
<tr><td style="padding:4px 8px;">Alamat</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">.................................</td></tr>
</table>
<p style="margin-bottom:8px;">Dengan ini menerangkan bahwa:</p>
<table style="width:100%;margin:12px 0;border-collapse:collapse;">
<tr><td style="padding:4px 8px;width:160px;">Nama</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
<tr><td style="padding:4px 8px;">Tempat/Tgl Lahir</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
<tr><td style="padding:4px 8px;">Jenis Kelamin</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
<tr><td style="padding:4px 8px;">Agama</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
<tr><td style="padding:4px 8px;">Pekerjaan</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
<tr><td style="padding:4px 8px;">Alamat</td><td style="padding:4px 8px;">:</td><td style="padding:4px 8px;">........................................</td></tr>
</table>
<p style="margin-bottom:8px;text-indent:36px;">....................................../........................................................................................................................................</p>
<p style="margin-bottom:8px;text-indent:36px;">Surat keterangan ini dibuat berdasarkan keterangan yang sebenarnya dan dapat dipergunakan sebagaimana mestinya.</p>
<p style="margin-bottom:8px;text-indent:36px;">Apabila di kemudian hari terbukti bahwa keterangan tersebut di atas tidak benar, maka yang bersangkutan siap menanggung segala akibat hukum yang timbul.</p>
<p style="margin-bottom:48px;text-align:right;">&nbsp;</p>`,
  },
  {
    id: 'himbauan',
    label: 'Surat Himbauan / Pemberitahuan',
    description: 'Pre-filled format pengumuman publik untuk warga.',
    icon: <Megaphone className="w-6 h-6" />,
    content: `<p style="margin-bottom:16px;text-align:center;font-weight:bold;text-decoration:underline;font-size:14px;">HIMBAUAN</p>
<p style="margin-bottom:8px;text-align:center;">Nomor: ....../.../.../2026</p>
<p style="margin-bottom:16px;">Kepada Yth.</p>
<p style="margin-bottom:4px;padding-left:36px;">Warga Masyarakat Desa .................</p>
<p style="margin-bottom:16px;padding-left:36px;">di –</p>
<p style="margin-bottom:16px;">Dengan hormat,</p>
<p style="margin-bottom:8px;text-indent:36px;">Sehubung dengan ........................................................................................................................................</p>
<p style="margin-bottom:8px;text-indent:36px;">Bersama ini kami himbau kepada seluruh warga masyarakat untuk dapat memperhatikan hal-hal sebagai berikut:</p>
<p style="margin-bottom:8px;padding-left:54px;">1. ........................................................................................................................................</p>
<p style="margin-bottom:8px;padding-left:54px;">2. ........................................................................................................................................</p>
<p style="margin-bottom:8px;padding-left:54px;">3. ........................................................................................................................................</p>
<p style="margin-bottom:16px;">Demikian himbauan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.</p>
<p style="margin-bottom:48px;text-align:right;">&nbsp;</p>`,
  },
];

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: LetterTemplate) => void;
}

export default function TemplatePickerModal({ isOpen, onClose, onSelect }: TemplatePickerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 w-full max-w-2xl mx-4 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Pilih Template Surat</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Pilih template untuk memulai, atau mulai dengan dokumen kosong.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {LETTER_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              className="text-left p-5 rounded-xl border-2 border-gray-100 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                {tpl.icon}
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{tpl.label}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">{tpl.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
