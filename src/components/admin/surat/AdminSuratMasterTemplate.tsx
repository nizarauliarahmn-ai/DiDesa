import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Settings, 
  Lock, 
  Unlock, 
  Eye, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  Code, 
  FileCode, 
  ArrowRight,
  User,
  MapPin,
  ChevronRight,
  Maximize,
  ZoomIn,
  ZoomOut,
  Sliders,
  Check
} from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { useDragScroll } from '../../../hooks/useDragScroll';

export interface ResidentData {
  nik: string;
  name: string;
  birthPlace: string;
  birthDate: string;
  gender: string;
  address: string;
  rtRw: string;
  village: string;
  kecamatan: string;
  kabupaten: string;
}

// 1. STATIS GLOBAL SAAS CONFIG - ENFORCES HIERARCHY
export const SAAS_CONFIG = {
  get globalFooterHTML() {
    const customFooter = localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat & dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia';
    return `
      <div class="saas-global-footer w-full bg-white dark:bg-slate-900 select-none" style="border-top: 0.5px solid #cbd5e1; padding-top: 5px; font-family: 'Inter', sans-serif; line-height: 1.5; font-size: 8px; color: #94a3b8; text-align: left;">
        ${customFooter}
      </div>
    `;
  }
};

// 2. CENTRALIZED PRINT SERVICE WRAPPER FUNCTION
export function generateSuratCetak(tipeSurat: string, kontenSurat: string, dataWarga: ResidentData): string {
  const customColor = localStorage.getItem('global_app_color') || '#047857';
  const logoKop = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
  const currentYear = new Date().getFullYear();
  const signatureKades = localStorage.getItem('village_super_admin') || 'Fazakkir Rahmad';
  const signatureKadesNip = localStorage.getItem('village_super_admin_nip') || '-';
  const signatureKadesRole = localStorage.getItem('village_super_admin_role') || 'Kepala Desa';
  
  const dateFormatted = () => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const date = new Date();
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // Generate complete, highly formatted HTML with locked Footer
  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>Cetak - ${tipeSurat}</title>
      <!-- Tailwind CSS Integration for high fidelity layout -->
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Inter', sans-serif;
          background-color: white;
          color: black;
          margin: 0;
          padding: 15mm 20mm;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @page { size: A4; margin: 0 !important; }
        /* CSS Print rules to enforce SaaS bottom footer layout */
        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
          }
          .no-print {
            display: none !important;
          }
          .saas-global-footer {
            position: fixed !important;
            bottom: 15mm !important;
            left: 20mm !important;
            right: 20mm !important;
            background: white !important;
            border-top: 0.5px solid #cbd5e1 !important;
            padding-top: 6px !important;
            padding-bottom: 5mm !important;
          }
          .content-wrapper {
            padding-bottom: 35mm !important; /* Prevents text overlapping footer */
          }
        }
      </style>
    </head>
    <body class="p-[15mm]">
      <div class="content-wrapper flex flex-col justify-between h-full min-h-[250mm] relative">
        <div>
          <!-- KOP SURAT (Letterhead) -->
          <div class="border-b-[3px] border-solid border-slate-900 mb-4">
            <div class="flex items-center gap-4 border-b border-solid border-slate-900 pb-2 mb-[1px]">
              <div class="w-[90px] h-[100px] flex-none flex items-center justify-center overflow-hidden mr-4">
                <img src="${logoKop}" class="max-w-full max-h-full object-contain" />
              </div>
              <div class="text-center flex-1 pr-[90px]">
              <p class="font-extrabold text-[14px] uppercase tracking-wider text-slate-800 dark:text-slate-100 leading-tight mb-0.5">${dataWarga.kabupaten.toUpperCase()}</p>
              <p class="font-bold text-[14px] uppercase tracking-wider text-slate-800 dark:text-slate-100 leading-tight mb-0.5">${dataWarga.kecamatan.toUpperCase()}</p>
              <p class="font-black text-[26px] tracking-wide text-emerald-950 uppercase mt-1 leading-tight mb-1">${dataWarga.village.toUpperCase()}</p>
              <p class="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug mt-1">Alamat Kantor Pelayanan: Jl. Keramat No. 12 Wasah Hilir, Kode Pos 71253</p>
              </div>
            </div>
          </div>

          <!-- SURAT TITLE -->
          <div class="text-center my-6">
            <p class="font-extrabold text-[15px] uppercase tracking-wide border-b border-black inline-block px-4 pb-0.5">${tipeSurat}</p>
            <p class="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 mt-1">Nomor: 474/023/WHi-PEM/${currentYear}</p>
          </div>

          <!-- SURAT LEADING -->
          <p class="text-[12px] text-slate-800 dark:text-slate-100 text-justify leading-[1.15] mb-2">
            Yang bertanda tangan di bawah ini Kepala ${dataWarga.village}, ${dataWarga.kecamatan}, ${dataWarga.kabupaten}, dengan ini menerangkan secara sah bahwa warga negara di bawah ini:
          </p>

          <!-- RESIDENT METADATA -->
          <div class="pl-8 my-6 space-y-2.5 text-[12px]">
            <div class="grid grid-cols-[160px_15px_1fr]">
              <span class="text-slate-600 dark:text-slate-400 font-medium">Nama Lengkap</span>
              <span class="text-slate-600 dark:text-slate-400">:</span>
              <span class="font-bold text-slate-900 dark:text-white uppercase">${dataWarga.name}</span>
            </div>
            <div class="grid grid-cols-[160px_15px_1fr]">
              <span class="text-slate-600 dark:text-slate-400 font-medium">Nomor Induk Penduduk (NIK)</span>
              <span class="text-slate-600 dark:text-slate-400">:</span>
              <span class="font-semibold text-slate-900 dark:text-white font-mono">${dataWarga.nik}</span>
            </div>
            <div class="grid grid-cols-[160px_15px_1fr]">
              <span class="text-slate-600 dark:text-slate-400 font-medium">Tempat, Tanggal Lahir</span>
              <span class="text-slate-600 dark:text-slate-400">:</span>
              <span class="text-slate-800 dark:text-slate-100">${dataWarga.birthPlace}, ${dataWarga.birthDate}</span>
            </div>
            <div class="grid grid-cols-[160px_15px_1fr]">
              <span class="text-slate-600 dark:text-slate-400 font-medium">Jenis Kelamin</span>
              <span class="text-slate-600 dark:text-slate-400">:</span>
              <span class="text-slate-800 dark:text-slate-100">${dataWarga.gender}</span>
            </div>
            <div class="grid grid-cols-[160px_15px_1fr]">
              <span class="text-slate-600 dark:text-slate-400 font-medium">Alamat / Domisili</span>
              <span class="text-slate-600 dark:text-slate-400">:</span>
              <span class="text-slate-800 dark:text-slate-100">${dataWarga.address} ${dataWarga.rtRw}</span>
            </div>
          </div>

          <!-- SURAT CONTENT (Admin Desa specific text) -->
          <div class="text-[12px] text-slate-800 dark:text-slate-100 text-justify leading-[1.15] space-y-2">
            ${kontenSurat}
          </div>

          <!-- SIGNATURE BLOCK -->
          <div class="mt-8 flex justify-end">
            <div class="text-center w-[240px] text-[12px]">
              <p class="m-0">${dataWarga.village.replace(/desa|kelurahan/gi, '').trim()}, ${dateFormatted()}</p>
              <p class="font-bold m-0 mt-1 mb-12">${signatureKadesRole} ${dataWarga.village}</p>
              <p class="font-bold uppercase text-[12px] m-0 tracking-wide border-b border-slate-900 inline-block pb-0.5">${signatureKades.toUpperCase()}</p>
              ${signatureKadesNip && signatureKadesNip !== '-' ? `<p class="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">NIP. ${signatureKadesNip}</p>` : ''}
            </div>
          </div>
        </div>

        <!-- 3. INJECT SAAS_CONFIG FOOTER -->
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    </body>
    </html>
  `;
}

export default function AdminSuratMasterTemplate() {
  const [role, setRole] = useState<'saas_admin' | 'admin_desa'>('admin_desa');
  const [activeCodeTab, setActiveCodeTab] = useState<'all' | 'js' | 'css' | 'html'>('all');
  const [zoomLevel, setZoomLevel] = useState(0.5);
  const dragProps = useDragScroll();

  // SaaS Footer Setup State (linked to localStorage for immediate action)
  const [footerText, setFooterText] = useState(() => 
    localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat & dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia'
  );
  
  // Simulation template selection
  const [selectedTemplate, setSelectedTemplate] = useState<'KTP' | 'SKTM' | 'SKU'>('KTP');
  
  // Simulation state for resident selection
  const [mockResidents, setMockResidents] = useState<ResidentData[]>([
    {
      nik: '3275010101700001',
      name: 'BUDI SANTOSO',
      birthPlace: 'Wasah Hilir',
      birthDate: '12-06-1985',
      gender: 'Laki-laki',
      address: 'Dusun Krajan',
      rtRw: 'RT 02/RW 01',
      village: 'Desa Wasah Hilir',
      kecamatan: 'Kecamatan Simpur',
      kabupaten: 'Kabupaten Hulu Sungai Selatan'
    },
    {
      nik: '3275015203920003',
      name: 'NURHAYATI ANGGRAINI',
      birthPlace: 'Kandangan',
      birthDate: '24-11-1992',
      gender: 'Perempuan',
      address: 'Dusun Sejahtera',
      rtRw: 'RT 05/RW 02',
      village: 'Desa Wasah Hilir',
      kecamatan: 'Kecamatan Simpur',
      kabupaten: 'Kabupaten Hulu Sungai Selatan'
    }
  ]);
  
  const [selectedResidentIndex, setSelectedResidentIndex] = useState(0);
  const selectedResident = mockResidents[selectedResidentIndex];

  const dynamicKadesName = localStorage.getItem('village_super_admin') || 'Fazakkir Rahmad';
  const dynamicKadesNip = localStorage.getItem('village_super_admin_nip') || '19741025 200604 1 007';
  const dynamicKadesRole = localStorage.getItem('village_super_admin_role') || 'Kepala Desa';

  // Specific content for letters
  const getTemplateContent = () => {
    switch (selectedTemplate) {
      case 'KTP':
        return `
          <p class="indent-8 text-justify">
            Bahwa nama yang bersangkutan di atas benar-benar penduduk domisili kami yang saat ini sedang melakukan proses kepengurusan Kartu Tanda Penduduk Elektronik (KTP-el) baru di lingkungan administratif ${selectedResident.village}.
          </p>
          <p class="indent-8 text-justify">
            Surat pengantar ini diterbitkan secara resmi untuk dipergunakan sebagai kelengkapan berkas administrasi perekaman biometric serta pencetakan fisik kartu identitas di Dinas Kependudukan dan Catatan Sipil setempat.
          </p>
          <p class="indent-8 text-justify">
            Demikian surat pengantar ini dibuat dengan sebenar-benarnya untuk digunakan sebagaimana mestinya. Segala bantuan dan fasilitas dari instansi terkait kami ucapkan banyak terima kasih.
          </p>
        `;
      case 'SKTM':
        return `
          <p class="indent-8 text-justify">
            Menerangkan dengan sebenarnya bahwa keluarga yang bersangkutan tergolong dalam keluarga ekonomi pra-sejahtera (Tidak Mampu) di wilayah kami. Keadaan ekonomi sosial bersangkutan layak untuk dipertimbangkan sebagai penerima manfaat jaminan sosial.
          </p>
          <p class="indent-8 text-justify">
            Surat Keterangan Tidak Mampu (SKTM) ini diterbitkan atas permohonan warga yang bersangkutan guna pengajuan <strong>beasiswa pendidikan sekolah</strong> putra-putrinya serta keringanan biaya pengobatan di fasilitas kesehatan pemerintah.
          </p>
          <p class="indent-8 text-justify">
            Demikian keterangan ini kami berikan untuk dipergunakan secara jujur, bertanggung jawab, dan sesuai dengan ketentuan peraturan hukum sosial yang berlaku di Negara Kesatuan Republik Indonesia.
          </p>
        `;
      case 'SKU':
        return `
          <p class="indent-8 text-justify">
            Berdasarkan peninjauan lapangan dan catatan administrasi kewirausahaan desa kami, warga tersebut di atas benar-benar memiliki dan menjalankan kegiatan usaha mikro berupa <strong>Perdagangan Bahan Sembako & Hasil Bumi</strong> yang berlokasi operasional di lingkungan ${selectedResident.address}.
          </p>
          <p class="indent-8 text-justify">
            Surat Keterangan Usaha (SKU) ini diberikan secara resmi sebagai jaminan aktivitas produktif serta digunakan sebagai syarat pelengkap pengajuan <strong>tambahan modal modal usaha KUR mikro</strong> di Bank BUMN setempat.
          </p>
          <p class="indent-8 text-justify">
            Demikian surat keterangan usaha ini dibuat agar kiranya pihak lembaga pembiayaan perbankan dapat memproses dan memberikan fasilitas kemudahan permodalan demi kemakmuran UMKM desa kita.
          </p>
        `;
    }
  };

  const handleSaveFooterText = () => {
    localStorage.setItem('global_print_footer', footerText);
    window.dispatchEvent(new Event('global_branding_updated'));
    showToast("Footer Global SaaS berhasil disimpan dan dikunci ke server!", "success");
  };

  // Centralized real print execution using hidden iframe to maintain high fidelity
  const handlePrintAction = () => {
    const letterTitle = selectedTemplate === 'KTP' 
      ? 'SURAT PENGANTAR KTP' 
      : selectedTemplate === 'SKTM' 
        ? 'SURAT KETERANGAN TIDAK MAMPU' 
        : 'SURAT KETERANGAN USAHA';

    const fullPrintHTML = generateSuratCetak(letterTitle, getTemplateContent(), selectedResident);

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(fullPrintHTML);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner explaining SaaS hierarchy */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 rounded-[32px] p-8 text-white shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -translate-y-12 translate-x-12"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[80px] translate-y-12 -translate-x-12"></div>
        
        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-3.5 py-1.5 rounded-full text-indigo-200 text-xs font-bold uppercase tracking-wider mb-5">
            <ShieldCheck size={14} className="text-emerald-400" />
            SaaS Architecture Blueprint Pattern
          </div>
          
          <h2 className="text-3xl font-black tracking-tight leading-tight md:text-4xl">
            Sistem Master Template Cetak & Verifikasi Surat
          </h2>
          <p className="text-sm md:text-base text-slate-300 mt-3 leading-relaxed">
            Menegakkan hirarki mutlak antara <b>SaaS Admin (Pusat)</b> dan <b>Admin Desa (Klien)</b>. 
            SaaS Admin mengunci Hak Cipta, Branding, dan QR-Validation secara global di server, sedangkan Admin Desa fokus 
            menginput data pelayanan tanpa kemampuan menghapus ornamen otentikasi pusat.
          </p>
        </div>
      </div>

      {/* Role and Mode Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <Sliders size={22} />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">Simulasi Hak Akses Sistem</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pilih peran untuk melihat pembatasan otoritas cetak</p>
          </div>
        </div>

        <div className="flex p-1.5 bg-slate-200/60 rounded-2xl gap-1">
          <button
            onClick={() => setRole('admin_desa')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              role === 'admin_desa' 
                ? 'bg-white dark:bg-slate-900 text-emerald-800 shadow-sm dark:shadow-none' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building2 size={15} />
            Admin Desa (Klien)
          </button>
          <button
            onClick={() => setRole('saas_admin')}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              role === 'saas_admin' 
                ? 'bg-slate-900 text-white shadow-md dark:shadow-none shadow-slate-950/20' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={15} className="text-indigo-400" />
            SaaS Admin (Pusat)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Control Panel depending on role */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. SaaS ADMIN PANEL */}
          {role === 'saas_admin' ? (
            <div className="bg-slate-900 text-white rounded-[32px] p-6 border border-slate-800 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-500/10 p-4 rounded-bl-[32px] border-l border-b border-indigo-500/20 flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-indigo-400 font-bold uppercase">
                <Lock size={12} /> CENTRAL CONTROL
              </div>

              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="text-indigo-400" />
                  Konfigurasi Footer Global (SaaS)
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Footer ini bersifat mutlak dan akan otomatis disuntikkan secara statis oleh server pusat ke seluruh dokumen cetak milik semua desa mitra.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">HTML Footer Mutlak</label>
                  <textarea
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    rows={4}
                    className="w-full bg-slate-950 text-slate-100 font-mono text-xs p-4 rounded-2xl border border-slate-800 outline-none focus:border-indigo-500 transition-all resize-none focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="HTML Footer disini..."
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">Dukung teks terformat HTML ringan. Contoh: &lt;strong&gt;, &lt;br&gt;, dll.</p>
                </div>

                <button
                  onClick={handleSaveFooterText}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md dark:shadow-none transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={15} />
                  Simpan & Kunci Footer Global
                </button>
              </div>

              <div className="p-4 bg-indigo-950/50 rounded-2xl border border-indigo-900/30 text-xs text-indigo-300 space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-indigo-200">
                  <Sparkles size={14} className="text-indigo-400" />
                  Status Mutabilitas Server:
                </p>
                <p className="leading-relaxed text-[11px]">
                  Saat Admin Desa mengakses antarmuka cetak mereka, skrip backend dan stylesheet akan memaksa footer ini dirender di posisi <b>fixed bottom</b> tanpa ada opsi DOM API untuk menghilangkannya.
                </p>
              </div>
            </div>
          ) : (
            /* 2. ADMIN DESA PANEL */
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                    Terminal Pelayanan Desa
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-3 flex items-center gap-2">
                    <FileText className="text-emerald-700" />
                    Penyiapan Surat Pengantar
                  </h3>
                </div>
              </div>

              {/* Template Selectors */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Jenis Layanan Surat</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setSelectedTemplate('KTP')}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between ${
                      selectedTemplate === 'KTP' 
                        ? 'border-emerald-600 bg-emerald-50/20' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        selectedTemplate === 'KTP' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        ID
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100">Surat Pengantar KTP-el</p>
                        <p className="text-[10px] text-slate-400">Kode Klasifikasi: 474 / KTP</p>
                      </div>
                    </div>
                    {selectedTemplate === 'KTP' && <Check size={16} className="text-emerald-700 font-bold" />}
                  </button>

                  <button
                    onClick={() => setSelectedTemplate('SKTM')}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between ${
                      selectedTemplate === 'SKTM' 
                        ? 'border-emerald-600 bg-emerald-50/20' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        selectedTemplate === 'SKTM' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        SS
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100">Sertifikat Tidak Mampu (SKTM)</p>
                        <p className="text-[10px] text-slate-400">Kode Klasifikasi: 400 / SKTM</p>
                      </div>
                    </div>
                    {selectedTemplate === 'SKTM' && <Check size={16} className="text-emerald-700 font-bold" />}
                  </button>

                  <button
                    onClick={() => setSelectedTemplate('SKU')}
                    className={`p-4 rounded-2xl text-left border-2 transition-all flex items-center justify-between ${
                      selectedTemplate === 'SKU' 
                        ? 'border-emerald-600 bg-emerald-50/20' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                        selectedTemplate === 'SKU' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        UM
                      </div>
                      <div>
                        <p className="font-bold text-xs text-slate-800 dark:text-slate-100">Keterangan Usaha Mikro (SKU)</p>
                        <p className="text-[10px] text-slate-400">Kode Klasifikasi: 593 / SKU</p>
                      </div>
                    </div>
                    {selectedTemplate === 'SKU' && <Check size={16} className="text-emerald-700 font-bold" />}
                  </button>
                </div>
              </div>

              {/* Resident Selectors */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Pilih Data Penduduk Pemohon</label>
                <div className="flex gap-2">
                  {mockResidents.map((r, idx) => (
                    <button
                      key={r.nik}
                      onClick={() => setSelectedResidentIndex(idx)}
                      className={`flex-1 p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                        selectedResidentIndex === idx 
                          ? 'border-emerald-600 bg-emerald-50/10' 
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <p className="font-extrabold text-[11px] text-slate-900 dark:text-white">{r.name}</p>
                      <p className="font-mono text-[9px] text-slate-400 mt-0.5">NIK: {r.nik}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Immutable Info message */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-3">
                <Lock size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-[11px] text-indigo-950 uppercase tracking-wider">Footer Cetak Terkunci</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Sesuai kesepakatan lisensi SaaS Cloud, sistem menyuntikkan footer platform secara permanen. Anda tidak dapat menyembunyikan branding DiDesa pada cetakan fisik maupun ekspor PDF.
                  </p>
                </div>
              </div>

              <button
                onClick={handlePrintAction}
                className="w-full py-4 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm rounded-2xl shadow-lg dark:shadow-none hover:shadow-emerald-700/10 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Cetak Surat Sekarang
              </button>
            </div>
          )}

          {/* Demonstration Notice */}
          <div className="bg-amber-50/50 border border-amber-200/60 p-5 rounded-3xl space-y-2">
            <h4 className="font-bold text-amber-800 text-xs flex items-center gap-1.5">
              <AlertCircle size={15} />
              Demonstrasi CSS @media print
            </h4>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Tombol <b>Cetak Surat Sekarang</b> akan memicu pencetakan browser yang sesungguhnya melalui <b>Centralized Print Template Engine</b>. 
              Dokumen yang dicetak diisolasi dalam iframe tersembunyi sehingga tidak mengganggu antarmuka admin yang sedang aktif, dan mematikan rendering sidebar/navbar.
            </p>
          </div>

        </div>

        {/* Right High-Fidelity A4 Paper Preview */}
        <div className="lg:col-span-7 flex flex-col min-w-0 bg-slate-100 dark:bg-slate-800 rounded-[32px] border border-slate-200 dark:border-slate-700 overflow-hidden shadow-inner">
          
          {/* Preview Controls */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200/60 px-6 py-4 flex items-center justify-between shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <p className="font-extrabold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wider">Live A4 Engine Preview</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setZoomLevel(prev => Math.max(0.3, prev - 0.05))} 
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 px-2 w-14 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button 
                onClick={() => setZoomLevel(prev => Math.min(1.2, prev + 0.05))} 
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={16} />
              </button>
              <div className="w-px h-5 bg-slate-200 mx-1"></div>
              <button 
                onClick={() => setZoomLevel(0.5)} 
                className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-[10px] font-bold"
                title="Reset Zoom"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Interactive virtual A4 sheet */}
          <div 
            ref={dragProps.ref}
            onMouseDown={dragProps.onMouseDown}
            onMouseLeave={dragProps.onMouseLeave}
            onMouseUp={dragProps.onMouseUp}
            onMouseMove={dragProps.onMouseMove}
            style={{ ...dragProps.style }}
            className="flex-1 bg-slate-200/40 overflow-auto relative flex p-8 min-h-[600px]"
          >
            <div 
              style={{
                width: `${794 * zoomLevel}px`,
                height: `${1123 * zoomLevel}px`,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                borderRadius: '12px',
                transition: 'width 0.2s ease-out, height 0.2s ease-out'
              }}
              className="bg-white dark:bg-slate-900 m-auto shrink-0 relative"
            >
              <div 
                className="bg-white dark:bg-slate-900 p-12 relative text-black shrink-0 printable-area select-none" 
                style={{ 
                  width: '794px',
                  height: '1123px',
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top left',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  {/* Visual Crop Marks */}
                  <div className="absolute top-6 left-6 w-4 h-4 border-t border-l border-slate-300 dark:border-slate-600"></div>
                  <div className="absolute top-6 right-6 w-4 h-4 border-t border-r border-slate-300 dark:border-slate-600"></div>
                  <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-slate-300 dark:border-slate-600"></div>
                  <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-slate-300 dark:border-slate-600"></div>

                  {/* Letter Header */}
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', borderBottom: '2.5px solid #111', paddingBottom: '8px', marginBottom: '20px' }}>
                    <div style={{ width: '100px', height: '110px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px' }}>
                      <img src={localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png'} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    </div>
                    <div style={{ textAlign: 'center', flex: 1, paddingRight: '100px' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', textTransform: 'uppercase', color: '#111', letterSpacing: '1px', lineHeight: '1.1', margin: '0 0 2px 0' }}>{selectedResident.kabupaten.toUpperCase()}</div>
                      <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', color: '#111', letterSpacing: '1px', lineHeight: '1.1', margin: '0 0 2px 0' }}>{selectedResident.kecamatan.toUpperCase()}</div>
                      <div style={{ fontWeight: 900, fontSize: '26px', color: '#022c22', letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: '1.1', margin: '2px 0 3px 0' }}>{selectedResident.village.toUpperCase()}</div>
                      <div style={{ fontSize: '10.5px', color: '#111', textTransform: 'capitalize', lineHeight: '1.15', margin: '2px 0 1px 0' }}>Alamat Kantor Pelayanan: Jl. Keramat No. 12 Wasah Hilir, Kode Pos 71253</div>
                    </div>
                  </div>

                  {/* Letter Title */}
                  <div className="text-center my-6">
                    <p className="font-extrabold text-[14px] uppercase tracking-wide border-b border-black inline-block px-4 pb-0.5">
                      {selectedTemplate === 'KTP' 
                        ? 'SURAT PENGANTAR KTP' 
                        : selectedTemplate === 'SKTM' 
                          ? 'SURAT KETERANGAN TIDAK MAMPU' 
                          : 'SURAT KETERANGAN USAHA'}
                    </p>
                    <p className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-1">Nomor: 474/023/WHi-PEM/2026</p>
                  </div>

                  {/* Intro */}
                  <p className="text-[11px] text-slate-800 dark:text-slate-100 text-justify leading-[1.15] mb-2">
                    Yang bertanda tangan di bawah ini Kepala {selectedResident.village}, {selectedResident.kecamatan}, {selectedResident.kabupaten}, dengan ini menerangkan secara sah bahwa warga negara di bawah ini:
                  </p>

                  {/* Metadata fields */}
                  <div className="pl-6 my-4 space-y-1.5 text-[11px]">
                    <div className="grid grid-cols-[140px_10px_1fr]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Nama Lengkap</span>
                      <span className="text-slate-400">:</span>
                      <span className="font-bold text-slate-900 dark:text-white uppercase">{selectedResident.name}</span>
                    </div>
                    <div className="grid grid-cols-[140px_10px_1fr]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Nomor Induk (NIK)</span>
                      <span className="text-slate-400">:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono">{selectedResident.nik}</span>
                    </div>
                    <div className="grid grid-cols-[140px_10px_1fr]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Tempat, Tgl Lahir</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-slate-800 dark:text-slate-100">{selectedResident.birthPlace}, {selectedResident.birthDate}</span>
                    </div>
                    <div className="grid grid-cols-[140px_10px_1fr]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Jenis Kelamin</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-slate-800 dark:text-slate-100">{selectedResident.gender}</span>
                    </div>
                    <div className="grid grid-cols-[140px_10px_1fr]">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Alamat Lengkap</span>
                      <span className="text-slate-400">:</span>
                      <span className="text-slate-800 dark:text-slate-100">{selectedResident.address} {selectedResident.rtRw}</span>
                    </div>
                  </div>

                  {/* Body HTML */}
                  <div 
                    className="text-[11px] text-slate-800 dark:text-slate-100 text-justify leading-[1.15] mt-2 space-y-2"
                    dangerouslySetInnerHTML={{ __html: getTemplateContent() }}
                  />

                  {/* Signature block */}
                  <div className="mt-8 flex justify-end">
                    <div className="text-center w-[200px] text-[11px]">
                      <p className="m-0 text-slate-600 dark:text-slate-400">{selectedResident.village.replace(/desa|kelurahan/gi, '').trim()}, {new Date().getDate()} {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][new Date().getMonth()]} {new Date().getFullYear()}</p>
                      <p className="font-bold m-0 mt-0.5 mb-12 text-slate-800 dark:text-slate-100">{dynamicKadesRole} {selectedResident.village}</p>
                      <p className="font-bold uppercase text-[11px] m-0 tracking-wide border-b border-slate-900 inline-block pb-0.5">{dynamicKadesName.toUpperCase()}</p>
                      {dynamicKadesNip && dynamicKadesNip !== '-' && (
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">NIP. {dynamicKadesNip}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* VISUAL LOCK CONTAINER - HIGHLIGHTING THE INJECTED FOOTER */}
                <div className="relative group border-2 border-dashed border-indigo-400 bg-indigo-50/10 p-3 rounded-2xl mt-4">
                  <div className="absolute -top-3 left-3 bg-indigo-600 text-white font-extrabold text-[8px] px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-widest">
                    <Lock size={8} /> SaaS Global Footer (Locked)
                  </div>
                  
                  <div 
                    className="text-[9px]"
                    dangerouslySetInnerHTML={{ __html: SAAS_CONFIG.globalFooterHTML }}
                  />
                </div>

              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Under the fold: Technical details & Code demonstration */}
      <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 p-8 space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code className="text-indigo-600" />
            Centralized Print Engine Blueprint Code
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Penjelasan arsitektur kode program di balik validitas pencetakan satu pintu (Centralized Print Service).
          </p>
        </div>

        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveCodeTab('all')}
            className={`px-4 py-2 font-bold text-xs border-b-2 transition-all ${
              activeCodeTab === 'all' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            Arsitektur Utuh
          </button>
          <button
            onClick={() => setActiveCodeTab('js')}
            className={`px-4 py-2 font-bold text-xs border-b-2 transition-all ${
              activeCodeTab === 'js' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            TypeScript Service
          </button>
          <button
            onClick={() => setActiveCodeTab('css')}
            className={`px-4 py-2 font-bold text-xs border-b-2 transition-all ${
              activeCodeTab === 'css' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            CSS @media print
          </button>
        </div>

        <div className="bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-900 shadow-inner">
          {activeCodeTab === 'all' && (
            <pre className="leading-relaxed">
{`// SaaS Hierarchy Architecture - Established by SaaS Architect
// 1. Immutable Central SaaS Config
export const SAAS_CONFIG = {
  get globalFooterHTML() {
    const footerText = localStorage.getItem('global_print_footer') || 'Default Footer';
    return \`
      <div class="saas-global-footer border-t border-black pt-4">
        <p>SISTEM CLOUD SAAS DIDESA</p>
        <p>\${footerText}</p>
      </div>
    \`;
  }
};

// 2. Centralized Print Wrapper Function
export function generateSuratCetak(tipeSurat: string, kontenSurat: string, dataWarga: any): string {
  // Always injects globalFooterHTML at the bottom
  return \`
    <html>
      <head>
        <style>@media print { ... }</style>
      </head>
      <body>
        <div>\${kontenSurat}</div>
        \${SAAS_CONFIG.globalFooterHTML}
      </body>
    </html>
  \`;
}`}
            </pre>
          )}

          {activeCodeTab === 'js' && (
            <pre className="leading-relaxed">
{`/**
 * Centralized Print Service
 * Enforces corporate policies at the architectural level.
 */
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';

export function executeCentralizedPrint(title: string, bodyHTML: string, resident: ResidentData) {
  const finalHTML = generateSuratCetak(title, bodyHTML, resident);
  
  // Creates standard isolated sandbox iframe to issue print commands
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(finalHTML);
    doc.close();
    
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  }
}`}
            </pre>
          )}

          {activeCodeTab === 'css' && (
            <pre className="leading-relaxed">
{`/* CSS Media Print - Enforcing layout & pagination constraints */
@media print {
  /* Hide typical application layouts */
  .no-print, .admin-sidebar, .admin-header, .btn-action {
    display: none !important;
  }
  
  /* Lock SaaS Footer strictly to A4 page bottom */
  .saas-global-footer {
    position: fixed !important;
    bottom: 0 !important;
    left: 20mm !important;
    right: 20mm !important;
    background: white !important;
    border-top: 0.5px solid #cbd5e1 !important;
    padding-top: 6px !important;
    height: 35mm;
  }
  
  /* Ensure page margins don't slice elements */
  @page { size: A4; margin: 0 !important; }
}`}
            </pre>
          )}
        </div>
      </div>

    </div>
  );
}
