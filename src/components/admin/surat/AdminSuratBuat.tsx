import { fetchResidentsCached } from '../../../utils/apiCache';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PrintSuccessDialog from './PrintSuccessDialog';
import { 
  Home, Store, Frown, FileText, Users, PlusCircle, Search, 
  ArrowLeft, Check, Printer, Archive, ZoomIn, ZoomOut, Maximize,
  Mail, Heart, Landmark, FileCheck, MapPin, Award, Calendar, AlertCircle, UserPlus, Sparkles, CheckCircle2
} from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { useDragScroll } from '../../../hooks/useDragScroll';
import { getLetterClassifications, LetterClassification, incrementSequenceNumber, generateLetterNumber } from '../../../utils/letterClassifications';
import { addLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getReactSignaturePreview } from '../../../utils/signature';

const BUSINESS_CATEGORIES = [
  "Perdagangan Sembako / Kelontong",
  "Kuliner (Warung Makan / Café / Jajanan)",
  "Jasa Perbengkelan & Otomotif",
  "Pertanian / Perkebunan (Padi, Sawit, dll)",
  "Peternakan / Perikanan (Sapi, Ayam, Lele)",
  "Jasa Pencucian Kendaraan (Motor / Mobil)",
  "Kerajinan & Industri Rumah Tangga",
  "Pondokan / Kontrakan / Kos-kosan",
  "Jasa Fotokopi, ATK & Pengetikan",
  "Salon Kecantikan & Pangkas Rambut",
  "Toko Pakaian / Butik / Fashion",
  "Lainnya (Tulis Kustom...)"
];

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const formatMonthYearInIndonesian = (monthYearStr: string): string => {
  if (!monthYearStr) return '';
  if (/^\d{4}-\d{2}$/.test(monthYearStr)) {
    const [year, month] = monthYearStr.split('-');
    const indonesianMonths = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${indonesianMonths[monthIndex]} ${year}`;
    }
  }
  return monthYearStr;
};

export default function AdminSuratBuat({ onBack, presetResident, onOpenNikah, onOpenSKTM, onOpenSKBM, onOpenSKU, onOpenSKPH, onOpenSKD, onOpenSKM, onOpenSKP, onOpenSKH, onOpenSDU, onOpenSPT, onOpenSPPD }: { onBack: () => void, presetResident?: any, onOpenNikah?: () => void, onOpenSKTM?: () => void, onOpenSKBM?: () => void, onOpenSKU?: () => void, onOpenSKPH?: () => void,
  onOpenSKD?: () => void, onOpenSKM?: () => void, onOpenSKP?: () => void, onOpenSKH?: () => void, onOpenSDU?: () => void, onOpenSPT?: () => void, onOpenSPPD?: () => void }) {
  const [step, setStep] = useState(1);
  const [classifications, setClassifications] = useState<LetterClassification[]>([]);
  const [searchLetterQuery, setSearchLetterQuery] = useState('');
  
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null); // holds classification code or ID
  const [searchQuery, setSearchQuery] = useState('');
  const [residents, setResidents] = useState<any[]>([]);
  const [selectedResident, setSelectedResident] = useState<any>(presetResident || null);
  const [nomorSurat, setNomorSurat] = useState('');
  const [keperluan, setKeperluan] = useState('');
  
  // SKU specific states
  const [usahaName, setUsahaName] = useState('');
  const [usahaJenis, setUsahaJenis] = useState('');
  const [usahaAlamat, setUsahaAlamat] = useState('');
  const [usahaMulai, setUsahaMulai] = useState('');
  const [usahaNib, setUsahaNib] = useState('');
  const [usahaOmzet, setUsahaOmzet] = useState('');
  
  // SKPH specific states
  const [penghasilanNominal, setPenghasilanNominal] = useState('');
  const [penghasilanSumber, setPenghasilanSumber] = useState('');
  
  // Custom Month-Year picker states
  const [showMulaiPicker, setShowMulaiPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const [zoomLevel, setZoomLevel] = useState(0.45);
  const dragProps = useDragScroll();
  const [isSaving, setIsSaving] = useState(false);
  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [success, setSuccess] = useState(false);

  // Favorite & Usage States
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('letter_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
  });

  const [usageCounts, setUsageCounts] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('letter_usage_counts');
      return stored ? JSON.parse(stored) : {};
    } catch (e) { return {}; }
  });
  
  // Kop Surat & Logo States
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png');
  const [kabupatenName, setKabupatenName] = useState(() => localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan');
  const [kecamatanName, setKecamatanName] = useState(() => localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur');
  const [desaName, setDesaName] = useState(() => localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
  const [alamatKantor, setAlamatKantor] = useState(() => localStorage.getItem('kop_alamat') || 'Jalan Keramat, Simpur, Hulu Sungai Selatan, Kalimantan Selatan 71261');
  const [kontakKantor, setKontakKantor] = useState(() => localStorage.getItem('kop_kontak') || '0813 4686 7519, pemdeswasahhilir@gmail.com');
  const [letterFont, setLetterFont] = useState(() => localStorage.getItem('village_letter_font') || localStorage.getItem('letter_font') || 'Arial, sans-serif');
  const [namaKades, setNamaKades] = useState(() => localStorage.getItem('kop_kades') || 'Fazakkir Rahmad');
  const [roleKades, setRoleKades] = useState('Kepala Desa');
  const [includeCamat, setIncludeCamat] = useState(false);
  const [nipKades, setNipKades] = useState('-');

  const [officersList, setOfficersList] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('village_officers');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [
      { name: 'Fazakkir Rahmad', role: 'Kepala Desa', nip: '-' },
      { name: 'Siti Aminah', role: 'Sekretaris Desa', nip: '198510122010122003' },
      { name: 'Muhammad Noor', role: 'Kasi Pemerintahan', nip: '198704152014021002' },
      { name: 'Ahmad Rifai', role: 'Kasi Kesejahteraan', nip: '-' },
      { name: 'Rahmadi', role: 'Kasi Pelayanan', nip: '-' },
      { name: 'H. Supian', role: 'Kaur Keuangan', nip: '-' },
      { name: 'Sri Wahyuni', role: 'Kaur Umum', nip: '-' }
    ];
  });

  const renderReactSignature = (desaName: string, tglFormatted: string, namaPejabat: string, jabatanPejabat: string, nipPejabat?: string, includeCamatOverride?: boolean) => {
    const sig = getReactSignaturePreview(desaName, tglFormatted, namaPejabat, jabatanPejabat, nipPejabat, includeCamatOverride);

    const textAlignClass = sig.sigAlign === 'left' ? 'text-left' : 'text-center';
    const nameUnderlineClass = sig.sigUnderline === 'yes' ? 'underline' : 'no-underline';

    const rightSideJSX = (
      <div className={`w-[230px] inline-block align-top text-black ${textAlignClass}`}>
        {sig.sigShowMeta === 'simple' && (
          <p className="m-0 text-xs mb-2">{sig.cleanDesaName}, {tglFormatted}</p>
        )}
        {(sig.sigShowMeta === 'complete' || sig.sigShowMeta === 'yes') && (
          <div className="mb-2">
            <p className="m-0 text-xs">Dikeluarkan di : {sig.cleanDesaName}</p>
            <p className="m-0 border-b border-black pb-0.5 mb-2 text-xs inline-block">Pada Tanggal : {tglFormatted}</p>
          </div>
        )}
        <div className={`min-h-[45px] leading-relaxed mb-14 text-xs mt-1 ${textAlignClass}`}>
          {sig.rightRole.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>{line}<br /></React.Fragment>
          ))}
        </div>
        <p className={`font-bold uppercase text-xs m-0 decoration-1 ${nameUnderlineClass} ${textAlignClass}`}>{namaPejabat}</p>
        {nipPejabat && nipPejabat !== '-' && nipPejabat !== '' && (
          <p className={`text-[10px] font-mono mt-0.5 text-gray-700 dark:text-slate-300 m-0 ${textAlignClass}`}>NIP. {nipPejabat}</p>
        )}
      </div>
    );

    if (sig.isDual) {
      return (
        <div className="mt-8 px-4 text-black">
          {/* TOP ROW (Roles) */}
          <div className="flex justify-between">
            {/* Left Top */}
            <div className={`w-[230px] ${textAlignClass}`}>
              <div className="invisible">
                {sig.sigShowMeta === 'simple' ? (
                  <p className="m-0 text-xs mb-2">&nbsp;</p>
                ) : (sig.sigShowMeta === 'complete' || sig.sigShowMeta === 'yes') ? (
                  <div className="mb-2">
                    <p className="m-0 text-xs">&nbsp;</p>
                    <p className="m-0 border-b border-transparent pb-0.5 mb-2 text-xs inline-block">&nbsp;</p>
                  </div>
                ) : null}
              </div>
              <div className={`mt-1 min-h-[45px] leading-relaxed text-xs whitespace-pre-line ${textAlignClass}`}>
                {sig.sigLeftRole}
              </div>
            </div>
            
            {/* Right Top */}
            <div className={`w-[230px] ${textAlignClass}`}>
              {sig.sigShowMeta === 'simple' && (
                <p className="m-0 text-xs mb-2">{sig.cleanDesaName}, {tglFormatted}</p>
              )}
              {(sig.sigShowMeta === 'complete' || sig.sigShowMeta === 'yes') && (
                <div className="mb-2">
                  <p className="m-0 text-xs">Dikeluarkan di : {sig.cleanDesaName}</p>
                  <p className="m-0 border-b border-black pb-0.5 mb-2 text-xs inline-block">Pada Tanggal : {tglFormatted}</p>
                </div>
              )}
              <div className={`min-h-[45px] leading-relaxed text-xs mt-1 ${textAlignClass}`}>
                {sig.rightRole.split('\n').map((line, idx) => (
                  <React.Fragment key={idx}>{line}<br /></React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* SPACE FOR SIGNATURE */}
          <div className="h-14"></div>

          {/* BOTTOM ROW (Names) */}
          <div className="flex justify-between">
            {/* Left Bottom */}
            <div className={`w-[230px] ${textAlignClass}`}>
              <p className={`font-bold text-xs m-0 decoration-1 ${nameUnderlineClass} ${textAlignClass}`}>{sig.sigLeftName}</p>
              {sig.sigLeftPangkat && (
                <p className={`text-[11px] mt-0.5 text-gray-800 dark:text-slate-100 m-0 ${textAlignClass}`}>{sig.sigLeftPangkat}</p>
              )}
              {sig.sigLeftNip && sig.sigLeftNip !== '-' && (
                <p className={`text-[11px] mt-0.5 text-gray-800 dark:text-slate-100 m-0 ${textAlignClass}`}>NIP : {sig.sigLeftNip}</p>
              )}
            </div>

            {/* Right Bottom */}
            <div className={`w-[230px] ${textAlignClass}`}>
              <p className={`font-bold uppercase text-xs m-0 decoration-1 ${nameUnderlineClass} ${textAlignClass}`}>{namaPejabat}</p>
              {nipPejabat && nipPejabat !== '-' && nipPejabat !== '' && (
                <p className={`text-[10px] font-mono mt-0.5 text-gray-700 dark:text-slate-300 m-0 ${textAlignClass}`}>NIP. {nipPejabat}</p>
              )}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="mt-8 flex justify-end text-black">
          {rightSideJSX}
        </div>
      );
    }
  };

  const componentRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const cls = getLetterClassifications();
    if (!cls.find(c => c.klasifikasi === 'SPPD')) {
      cls.push({ id: '31', jenis: 'SURAT PERJALANAN DINAS', klasifikasi: 'SPPD', kodeKlasifikasi: '094', deskripsi: 'Surat Perintah & Perjalanan Dinas', noUrutTerakhir: 0, isVisible: true });
    }
    setClassifications(cls);
    
    // Fetch residents for Step 2 search
    fetchResidentsCached()
      .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
      .then(data => {
        if (Array.isArray(data)) {
          setResidents(data);
        }
      })
      .catch(err => console.error("Error loading residents:", err));
  }, []);

  // Listen to live Kop settings changes
  useEffect(() => {
    const handleSettingsUpdate = () => {
      setLogoUrl(localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png');
      setKabupatenName(localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan');
      setKecamatanName(localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur');
      setDesaName(localStorage.getItem('kop_desa') || 'Desa Wasah Hilir');
      setAlamatKantor(localStorage.getItem('kop_alamat') || 'Jalan Keramat, Simpur, Hulu Sungai Selatan, Kalimantan Selatan 71261');
      setKontakKantor(localStorage.getItem('kop_kontak') || '0813 4686 7519, pemdeswasahhilir@gmail.com');
      setLetterFont(localStorage.getItem('village_letter_font') || localStorage.getItem('letter_font') || 'Arial, sans-serif');
      
      const currentActiveKades = localStorage.getItem('kop_kades') || 'Fazakkir Rahmad';
      setNamaKades(currentActiveKades);
      
      try {
        const stored = localStorage.getItem('village_officers');
        if (stored) {
          const list = JSON.parse(stored);
          setOfficersList(list);
          const found = list.find((o: any) => o.name === currentActiveKades);
          if (found) {
            setRoleKades(found.role);
            setNipKades(found.nip);
          } else {
            setRoleKades('Kepala Desa');
            setNipKades('-');
          }
        }
      } catch (e) {}
    };
    const handleClassificationsUpdate = () => {
      const cls = getLetterClassifications();
      if (!cls.find(c => c.klasifikasi === 'SPPD')) {
        cls.push({ id: '31', jenis: 'SURAT PERJALANAN DINAS', klasifikasi: 'SPPD', kodeKlasifikasi: '094', deskripsi: 'Surat Perintah & Perjalanan Dinas', noUrutTerakhir: 0, isVisible: true });
      }
      setClassifications(cls);
    };
    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    window.addEventListener('village_settings_updated', handleClassificationsUpdate);
    window.addEventListener('letter_classifications_updated', handleClassificationsUpdate);
    
    // Initial sync
    handleSettingsUpdate();
    handleClassificationsUpdate();
    
    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
      window.removeEventListener('village_settings_updated', handleClassificationsUpdate);
      window.removeEventListener('letter_classifications_updated', handleClassificationsUpdate);
    };
  }, []);

  // Update nomorSurat when a template classification is chosen
  useEffect(() => {
    if (selectedTemplate) {
      const selectedClass = classifications.find(c => c.klasifikasi === selectedTemplate || c.id === selectedTemplate);
      if (selectedClass) {
        const generatedNo = generateLetterNumber(selectedClass.klasifikasi, selectedClass.kodeKlasifikasi || '140');
        setNomorSurat(generatedNo);
      }
    }
  }, [selectedTemplate, classifications]);

  const recordLetterToHistory = () => {
    if (hasRecorded) return;

    const selectedClass = classifications.find(c => c.klasifikasi === selectedTemplate || c.id === selectedTemplate);
    const letterType = selectedClass ? selectedClass.jenis : 'Surat Keterangan';
    
    addLetterHistory({
      nomor: nomorSurat,
      jenis: letterType,
      nik: selectedResident?.nik || '',
      nama: selectedResident?.name || 'Wasah Hilir / Umum',
      tanggal: currentDateFormatted(),
      keperluan: keperluan || 'Persyaratan administrasi kependudukan.',
      status: 'Selesai',
      data: {
        includeCamat: includeCamat,
        nama: selectedResident?.name,
        nik: selectedResident?.nik,
        tempatLahir: selectedResident?.birthPlace,
        tanggalLahir: selectedResident?.birthDate,
        jenisKelamin: selectedResident?.gender,
        alamat: selectedResident?.address,
        agama: selectedResident?.religion,
        pekerjaan: selectedResident?.job,
        statusPerkawinan: selectedResident?.maritalStatus
      }
    });

    setHasRecorded(true);
  };

  const handlePrint = async () => {
    if (!selectedResident && !keperluan) {
      showToast("Mohon pilih pemohon atau lengkapi data surat terlebih dahulu sebelum mencetak.", 'error');
      return;
    }
    recordLetterToHistory();

    // Auto-save resident data if it was a manual input or updated
    if (selectedResident) {
      try {
        const nik = selectedResident.nik;
        const res = await fetch(`/api/residents`);
        const allResidents = await res.json();
        const existing = allResidents.find((r: any) => r.nik === nik);

        const residentData = {
          name: selectedResident.name,
          birthPlace: selectedResident.birthPlace,
          birthDate: selectedResident.birthDate,
          gender: selectedResident.gender,
          religion: selectedResident.religion || 'Islam',
          job: selectedResident.job,
          address: selectedResident.address,
          rt_rw: selectedResident.rt_rw,
          status: 'Aktif',
          statusColor: 'green'
        };

        if (existing) {
          await fetch(`/api/residents/${nik}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...existing, ...residentData })
          });
        } else {
          await fetch(`/api/residents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nik, ...residentData })
          });
        }

        // Add notification
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Data Penduduk Diperbarui',
            message: `Data penduduk atas nama ${selectedResident.name} (NIK: ${nik}) telah diperbarui secara otomatis melalui pembuatan surat ${selectedClass?.jenis || 'resmi'}.`,
            category: 'Residents'
          })
        });
      } catch (e) {
        console.error('Failed to sync resident data in AdminSuratBuat', e);
      }
    }

    // Modern isolated iframe printing to prevent scale/overflow truncation & default browser headers/footers
    const content = componentRef.current?.innerHTML;
    const iframe = iframeRef.current;
    if (content && iframe) {
      try {
        const doc = iframe.contentWindow?.document;
        if (doc) {
          const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(el => el.outerHTML)
            .join('\n');

          doc.open();
          doc.write(`
            <html>
              <head>
                <title>Cetak Surat Resmi</title>
                ${styles}
                <style>
                  @page { size: A4; margin: 0 !important; }
                  body { 
                    margin: 0; 
                    padding: 0; 
                    background: white; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                  }
                  .page { 
                    width: 210mm; 
                    height: 297mm; 
                    margin: 0; 
                    box-sizing: border-box; 
                    background: white; 
                    position: relative; 
                    overflow: hidden;
                    color: black;
                  }
                  .printable-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 210mm !important;
                    height: 297mm !important;
                    margin: 0 !important;
                    padding: 48px !important; /* matches p-12 precisely */
                    box-sizing: border-box !important;
                    background: white !important;
                    color: black !important;
                    box-shadow: none !important;
                    border: none !important;
                    display: block !important;
                    transform: none !important;
                    visibility: visible !important;
                    font-family: ${letterFont}, serif;
                  }
                  .printable-area * {
                    visibility: visible !important;
                  }
                  /* Hide crop marks in print */
                  .crop-mark { 
                    display: none !important; 
                  }
                  @media print {
                    body, .page { 
                      width: 210mm; 
                      height: 297mm; 
                    }
                  }
                </style>
              </head>
              <body>
                <div class="page">
                  <div class="printable-area bg-white dark:bg-slate-900 text-black">
                    ${content}
                  </div>
                </div>
              </body>
            </html>
          `);
          doc.close();

          // Trigger printing directly and reliably from parent window
          setTimeout(() => {
            try {
              iframe.contentWindow?.focus();
              iframe.contentWindow?.print();
            } catch (e) {
              console.error("Iframe print error:", e);
              window.print();
            }
          }, 500);
        }
      } catch (e) {
        console.error('Failed to print via iframe', e);
        // Fallback
        window.print();
      }
    } else {
      window.print();
    }
    setSuccess(true);
  };

  const handleSimpan = () => {
    recordLetterToHistory();
    setIsSaving(true);
    
    // Increment sequence number for the selected classification
    const selectedClass = classifications.find(c => c.klasifikasi === selectedTemplate || c.id === selectedTemplate);
    if (selectedClass) {
      // Track usage
      const updatedUsage = { ...usageCounts, [selectedClass.klasifikasi]: (usageCounts[selectedClass.klasifikasi] || 0) + 1 };
      setUsageCounts(updatedUsage);
      localStorage.setItem('letter_usage_counts', JSON.stringify(updatedUsage));
    }

    setTimeout(() => {
      setIsSaving(false);
      if (selectedClass) {
        incrementSequenceNumber(selectedClass.klasifikasi);
      }

      showToast("Surat resmi baru berhasil diterbitkan dan diarsipkan!", "success");
      onBack();
    }, 1500);
  };
  
  const handleNextStep = () => {
    setStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const getTemplateIcon = (klasifikasi: string, jenis: string) => {
    const k = klasifikasi.toUpperCase();
    const j = jenis.toUpperCase();
    if (k === 'SKD') return <Home className="w-6 h-6 text-emerald-700 animate-pulse" />;
    if (k === 'SKU') return <Store className="w-6 h-6 text-emerald-700 animate-pulse" />;
    if (k === 'SKTM') return <Frown className="w-6 h-6 text-emerald-700" />;
    if (k === 'SKAW') return <Users className="w-6 h-6 text-emerald-700" />;
    if (k === 'UND') return <Mail className="w-6 h-6 text-emerald-700" />;
    if (k === 'SKM') return <Heart className="w-6 h-6 text-emerald-700" />;
    if (k === 'SKN' || k === 'PRW') return <Heart className="w-6 h-6 text-emerald-700" />;
    if (j.includes('TANAH') || k === 'JBT' || k === 'SJBT' || k === 'SKKT') return <Landmark className="w-6 h-6 text-emerald-700" />;
    if (k === 'SKP' || k === 'SPJN' || k === 'SKKB') return <FileCheck className="w-6 h-6 text-emerald-700" />;
    if (k === 'SRI' || k === 'SKBM') return <Award className="w-6 h-6 text-emerald-700" />;
    if (k === 'SKL') return <Calendar className="w-6 h-6 text-emerald-700" />;
    return <FileText className="w-6 h-6 text-emerald-700" />;
  };

  const filteredClassifications = classifications.filter(c => 
    c.jenis.toLowerCase().includes(searchLetterQuery.toLowerCase()) ||
    c.klasifikasi.toLowerCase().includes(searchLetterQuery.toLowerCase())
  );

  const filteredResidents = searchQuery.trim().length > 0
    ? residents.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.nik.includes(searchQuery)
      )
    : [];

  const selectedClass = classifications.find(c => c.klasifikasi === selectedTemplate || c.id === selectedTemplate);

  const currentDateFormatted = () => {
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    const date = new Date();
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-8">
      {/* Header section instead of Stepper */}
      <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden mb-6">
        <div className="absolute right-0 bottom-0 opacity-10 translate-y-1/3 translate-x-1/6 pointer-events-none">
          <FileText className="w-80 h-80" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight">Buat Surat Administrasi Desa</h2>
          <p className="text-emerald-100 text-sm mt-2 leading-relaxed">
            Silakan pilih salah satu dari template surat resmi di bawah. Proses pengisian data penduduk dan penulisan surat dilakukan dalam satu halaman dengan pratinjau cetak langsung (Live Preview) yang responsif.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 min-h-[500px] relative overflow-hidden">
        
        {/* STEP 1: Select Template */}
        {step === 1 && (
          <div className="p-8 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pilih Jenis & Template Surat</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Gunakan salah satu dari {classifications.length} jenis surat resmi Wasah Hilir</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Cari jenis surat..."
                    value={searchLetterQuery}
                    onChange={(e) => setSearchLetterQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none w-56 font-semibold"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
                <button 
                  onClick={onBack}
                  className="text-gray-500 dark:text-slate-400 hover:text-emerald-700 font-bold text-sm transition-colors border border-gray-200 dark:border-slate-700 px-4 py-2 rounded-xl bg-white dark:bg-slate-900"
                >
                  Batal
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-8 max-h-[600px] overflow-y-auto pr-2">
              {(() => {
                // Remove duplicates by klasifikasi
                const uniqueClassifications = filteredClassifications.filter((t, index, self) =>
                  index === self.findIndex((v) => v.klasifikasi === t.klasifikasi)
                );

                const mostUsedThreshold = 1; // Minimum usage to show in "Most Used"
                const mostUsedLimit = 3; // Number of items in "Most Used"

                const mostUsed = uniqueClassifications
                  .filter(c => (usageCounts[c.klasifikasi] || 0) >= mostUsedThreshold)
                  .sort((a, b) => (usageCounts[b.klasifikasi] || 0) - (usageCounts[a.klasifikasi] || 0))
                  .slice(0, mostUsedLimit);

                const favoriteTemplates = uniqueClassifications.filter(c => favorites.includes(c.klasifikasi));
                
                const remaining = uniqueClassifications.filter(c => 
                  !favorites.includes(c.klasifikasi) && 
                  !mostUsed.some(m => m.klasifikasi === c.klasifikasi)
                );

                const renderTemplateCard = (t: LetterClassification) => {
                  const isDisabled = t.isVisible === false;
                  
                  return (
                  <div 
                    key={t.id}
                    onClick={() => {
                      if (isDisabled) return;
                      
                      if (t.klasifikasi === 'SKN') {
                        if (onOpenNikah) onOpenNikah();
                        return;
                      }
                      if (t.klasifikasi === 'SKTM') {
                        if (onOpenSKTM) onOpenSKTM();
                        return;
                      }
                      if (t.klasifikasi === 'SKBM') {
                        if (onOpenSKBM) onOpenSKBM();
                        return;
                      }
                      if (t.klasifikasi === 'SKU') {
                        if (onOpenSKU) onOpenSKU();
                        return;
                      }
                      
                        if (t.klasifikasi === 'SKPH') {
                          if (onOpenSKPH) onOpenSKPH();
                          return;
                        }
                      if (t.klasifikasi === 'SKD' || t.klasifikasi === 'SKDPR' || t.klasifikasi === 'SDP') {
                        if (onOpenSKD) onOpenSKD();
                        return;
                      }
                      if (t.klasifikasi === 'SDU') {
                        if (onOpenSDU) onOpenSDU();
                        return;
                      }
                      if (t.klasifikasi === 'SKM') {
                        if (onOpenSKM) onOpenSKM();
                        return;
                      }
                      if (t.klasifikasi === 'SKP') {
                        if (onOpenSKP) onOpenSKP();
                        return;
                      }
                      if (t.klasifikasi === 'SPT') {
                        if (onOpenSPT) onOpenSPT();
                        return;
                      }
                      if (t.klasifikasi === 'SPPD') {
                        if (onOpenSPPD) onOpenSPPD();
                        return;
                      }
                      setSelectedTemplate(t.klasifikasi);
                      setStep(2);
                    }}
                    className={`flex items-center p-3.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl transition-all text-left gap-3 relative ${
                      isDisabled 
                        ? 'opacity-60 cursor-not-allowed grayscale-[50%]' 
                        : 'hover:border-emerald-600 hover:bg-emerald-50/50 group cursor-pointer'
                    }`}
                  >
                    {!isDisabled && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = favorites.includes(t.klasifikasi)
                            ? favorites.filter(f => f !== t.klasifikasi)
                            : [...favorites, t.klasifikasi];
                          setFavorites(updated);
                          localStorage.setItem('letter_favorites', JSON.stringify(updated));
                        }}
                        className={`absolute top-2 right-2 p-1.5 rounded-full transition-all z-10 ${
                          favorites.includes(t.klasifikasi) 
                            ? 'bg-rose-50 text-rose-500 scale-110' 
                            : 'bg-gray-50 dark:bg-slate-800 text-gray-300 hover:text-rose-400 opacity-0 group-hover:opacity-100'
                        }`}
                        title={favorites.includes(t.klasifikasi) ? "Hapus dari Favorit" : "Tambah ke Favorit"}
                      >
                        <Heart size={14} fill={favorites.includes(t.klasifikasi) ? "currentColor" : "none"} />
                      </button>
                    )}
                    <div className={`p-2 rounded-lg shrink-0 ${isDisabled ? 'bg-gray-100 dark:bg-slate-800' : 'bg-emerald-50/50 group-hover:scale-110 transition-transform'}`}>
                      {getTemplateIcon(t.klasifikasi, t.jenis)}
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-bold font-mono bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                          {t.klasifikasi}
                        </span>
                        {t.kodeKlasifikasi && (
                          <span className="bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-full text-[10px] text-slate-500 dark:text-slate-400 font-bold border border-slate-200/60 dark:border-slate-700/60">
                            Kode: {t.kodeKlasifikasi}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 font-mono ml-1">
                          No: {String(t.noUrutTerakhir).padStart(3, '0')}
                        </span>
                        {(usageCounts[t.klasifikasi] || 0) > 0 && (
                          <span className="ml-auto text-[9px] bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-amber-200/50">
                            🔥 Sering
                          </span>
                        )}
                      </div>
                      <h4 className={`font-bold text-[13px] leading-snug truncate uppercase transition-colors ${
                        isDisabled 
                          ? 'text-gray-500 dark:text-gray-400' 
                          : 'text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400'
                      }`}>
                        {t.jenis}
                      </h4>
                      {t.deskripsi && (
                        <p className={`text-[10px] truncate mt-0.5 transition-colors ${
                          isDisabled ? 'text-gray-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-emerald-600/70'
                        }`}>
                          {t.deskripsi}
                        </p>
                      )}
                      {isDisabled && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 rounded text-[9px] font-bold tracking-wide border border-slate-200 dark:border-slate-700">
                          <AlertCircle size={10} />
                          TAHAP PENGEMBANGAN
                        </div>
                      )}
                    </div>
                  </div>
                )};

                return (
                  <>
                    {/* MOST USED SECTION */}
                    {mostUsed.length > 0 && searchLetterQuery === '' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-500 fill-amber-500" />
                          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Paling Sering Digunakan</h4>
                          <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {mostUsed.map(renderTemplateCard)}
                        </div>
                      </div>
                    )}

                    {/* FAVORITES SECTION */}
                    {favoriteTemplates.length > 0 && searchLetterQuery === '' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Heart size={14} className="text-rose-500 fill-rose-500" />
                          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Template Favorit</h4>
                          <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {favoriteTemplates.map(renderTemplateCard)}
                        </div>
                      </div>
                    )}

                    {/* ALL / REMAINING SECTION */}
                    <div className="space-y-4">
                      {searchLetterQuery === '' && (uniqueClassifications.length > (remaining.length + mostUsed.length + favoriteTemplates.length)) && (
                        <div className="flex items-center gap-2">
                          <Archive size={14} className="text-gray-400" />
                          <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Semua Template</h4>
                          <div className="h-px flex-1 bg-gray-100 dark:bg-slate-800"></div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(searchLetterQuery !== '' ? uniqueClassifications : remaining).map(renderTemplateCard)}
                      </div>
                    </div>
                  </>
                );
              })()}
              {filteredClassifications.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400">
                  Tidak ada jenis surat yang cocok dengan pencarian "{searchLetterQuery}".
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Resident Search */}
        
        {step >= 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-8 animate-in fade-in duration-500">
             <div className="lg:col-span-7 space-y-6">
                
                <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
                   <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 uppercase tracking-wider">
                      <Search className="w-4 h-4 text-emerald-600" />
                      Identifikasi Penduduk
                   </h3>
                   <div className="max-w-xl mx-auto space-y-6 py-8">
              <div className="relative group">
                <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-2">Cari NIK atau Nama</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Masukkan NIK atau nama warga..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none font-semibold text-gray-800 dark:text-slate-100"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
                <p className="mt-2 text-[10px] text-emerald-600 font-medium">* Pencarian otomatis melengkapi biodata, alamat, KK, pendidikan, dan pekerjaan warga desa terpilih</p>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {filteredResidents.map((r) => (
                  <div key={r.nik} className="p-4 bg-white dark:bg-slate-900 hover:bg-emerald-50/40 rounded-xl flex items-center justify-between border border-gray-100 dark:border-slate-800 hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700">
                        {r.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white">{r.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-mono">NIK: {r.nik}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{r.address || `${r.rt_rw || 'RT/RW'}`}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { 
                        setSelectedResident(r); 
                        if (r.job) {
                          setPenghasilanSumber(r.job);
                        } else {
                          setPenghasilanSumber('');
                        }
                         
                      }}
                      className="bg-emerald-700 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-emerald-800 active:scale-95 transition-all"
                    >
                      Pilih
                    </button>
                  </div>
                ))}
                
                {searchQuery.trim().length > 0 && filteredResidents.length === 0 && (
                  <div className="text-center py-12 flex flex-col items-center border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800">
                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-3">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100">Warga tidak ditemukan</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 px-8">Jika warga domisili desa kita namun belum terdaftar, Anda bisa melewati pencarian ini.</p>
                    <button 
                      onClick={() => {
                        setSelectedResident(null);
                        
                      }}
                      className="px-6 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 shadow-md dark:shadow-none shadow-emerald-100 transition-all"
                    >
                      Lanjut Manual & Daftarkan Baru
                    </button>
                  </div>
                )}

                {searchQuery.trim().length === 0 && residents.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-2">Daftar Warga Terbaru (Klik "Pilih" atau Cari di atas):</p>
                    <div className="space-y-2">
                      {residents.slice(0, 3).map((r) => (
                        <div key={r.nik} className="flex items-center justify-between text-xs py-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{r.name} <span className="text-[10px] text-slate-400 font-mono">({r.nik})</span></span>
                          <button 
                            onClick={() => { 
                              setSelectedResident(r); 
                              if (r.job) {
                                setPenghasilanSumber(r.job);
                              } else {
                                setPenghasilanSumber('');
                              }
                               
                            }}
                            className="text-emerald-700 hover:underline font-bold"
                          >
                            Pilih
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            
                </section>

                <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-8">
                   <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Lengkapi Informasi Surat</h3>
                   <form className="grid grid-cols-1 md:grid-cols-2 gap-8" onSubmit={(e) => { e.preventDefault();  }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-2">Nama Lengkap</label>
                  <input 
                    type="text" 
                    value={selectedResident?.pendingMeta?.details?.name || selectedResident?.name || ''} 
                    readOnly 
                    className="w-full bg-gray-50 dark:bg-slate-800 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-2">NIK</label>
                  <input 
                    type="text" 
                    value={selectedResident?.pendingMeta?.details?.nik || selectedResident?.nik || ''} 
                    readOnly 
                    className="w-full bg-gray-50 dark:bg-slate-800 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-2">Tempat, Tanggal Lahir</label>
                  <input 
                    type="text" 
                    value={selectedResident ? `${selectedResident.pendingMeta?.details?.birthPlace || selectedResident.birthPlace || ''}, ${selectedResident.pendingMeta?.details?.birthDate || selectedResident.birthDate || ''}` : ''} 
                    readOnly 
                    className="w-full bg-gray-50 dark:bg-slate-800 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-2">Nomor Surat</label>
                    <input 
                      type="text" 
                      value={nomorSurat}
                      onChange={(e) => setNomorSurat(e.target.value)}
                      placeholder="Auto-generated format"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono font-bold text-emerald-800 text-sm"
                      required
                    />
                    <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Format: [Kode]/[No]/[Tahun]. Dapat diubah manual jika perlu.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-2">Penandatangan Surat</label>
                    <select
                      value={namaKades}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNamaKades(val);
                        const found = officersList.find(o => o.name === val);
                        if (found) {
                          setRoleKades(found.role);
                          setNipKades(found.nip);
                        }
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-950 bg-emerald-50/20 text-sm"
                    >
                      {officersList.map((off, index) => (
                        <option key={index} value={off.name}>
                          {off.name} ({off.role})
                        </option>
                      ))}
                    </select>
                    
                    <div className="mt-4 pt-4 border-t border-emerald-100/50">
                      <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors">
                        <input 
                          type="checkbox"
                          checked={includeCamat}
                          onChange={(e) => setIncludeCamat(e.target.checked)}
                          className="w-5 h-5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tambahkan Kolom Mengetahui Camat</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gunakan format 2 tanda tangan (Camat di sebelah kiri)</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {selectedTemplate === 'SKU' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-50/20 p-5 rounded-2xl border border-emerald-100/50 mb-6">
                    <div className="md:col-span-2 border-b border-emerald-100/50 pb-2">
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                        <Store className="w-4 h-4 text-emerald-600" />
                        Informasi Detail Usaha (SKU)
                      </h4>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Nama Usaha / Toko</label>
                      <input 
                        type="text" 
                        value={usahaName}
                        onChange={(e) => setUsahaName(e.target.value)}
                        placeholder="Contoh: Warung Sembako Berkah / Bengkel Motor Makmur"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                        required
                      />
                      <p className="mt-1.5 text-[10px] text-emerald-600 font-medium">Tulis nama lengkap usaha atau nama toko fisik yang bersangkutan.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Jenis / Bidang Usaha</label>
                      <select 
                        value={BUSINESS_CATEGORIES.includes(usahaJenis) ? usahaJenis : (usahaJenis ? "Lainnya (Tulis Kustom...)" : "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "Lainnya (Tulis Kustom...)") {
                            setUsahaJenis('');
                          } else {
                            setUsahaJenis(val);
                          }
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm bg-white dark:bg-slate-900"
                        required
                      >
                        <option value="" disabled>-- Pilih Bidang Usaha --</option>
                        {BUSINESS_CATEGORIES.map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                      </select>

                      {(!BUSINESS_CATEGORIES.includes(usahaJenis) || usahaJenis === '') && (
                        <div className="mt-2.5 animate-in slide-in-from-top-1 duration-200">
                          <input 
                            type="text" 
                            value={usahaJenis}
                            onChange={(e) => setUsahaJenis(e.target.value)}
                            placeholder="Tulis bidang usaha kustom Anda di sini..."
                            className="w-full px-4 py-3 rounded-xl border border-emerald-200 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm bg-emerald-50/10 placeholder:text-gray-400"
                            required
                          />
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Mulai Berdiri Sejak (Bulan/Tahun)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={usahaMulai}
                          onChange={(e) => setUsahaMulai(e.target.value)}
                          placeholder="Contoh: Januari 2021"
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                          required
                          onClick={() => setShowMulaiPicker(true)}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowMulaiPicker(!showMulaiPicker)}
                          className="px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1.5 font-bold text-xs"
                        >
                          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                          Pilih
                        </button>
                      </div>

                      {showMulaiPicker && (
                        <div className="absolute right-0 mt-2 p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl rounded-2xl z-50 w-72 animate-in fade-in zoom-in-95 duration-150">
                          {/* Picker Header */}
                          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => setPickerYear(prev => prev - 1)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-600 dark:text-slate-400 font-bold text-sm"
                            >
                              &larr;
                            </button>
                            <span className="font-bold text-gray-800 dark:text-slate-100 text-sm">{pickerYear}</span>
                            <button
                              type="button"
                              onClick={() => setPickerYear(prev => prev + 1)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-gray-600 dark:text-slate-400 font-bold text-sm"
                            >
                              &rarr;
                            </button>
                          </div>

                          {/* Months Grid */}
                          <div className="grid grid-cols-3 gap-2">
                            {INDONESIAN_MONTHS.map((month, idx) => {
                              const isSelected = usahaMulai === `${month} ${pickerYear}`;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setUsahaMulai(`${month} ${pickerYear}`);
                                    setShowMulaiPicker(false);
                                  }}
                                  className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                                    isSelected 
                                      ? 'bg-emerald-600 text-white shadow-sm dark:shadow-none font-bold' 
                                      : 'text-gray-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`}
                                >
                                  {month.substring(0, 3)}
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick selection or Close */}
                          <div className="flex items-center justify-between mt-4 pt-2 border-t border-gray-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() => {
                                const now = new Date();
                                setPickerYear(now.getFullYear());
                                setUsahaMulai(`${INDONESIAN_MONTHS[now.getMonth()]} ${now.getFullYear()}`);
                                setShowMulaiPicker(false);
                              }}
                              className="text-[10px] font-bold text-emerald-600 hover:underline"
                            >
                              Bulan Ini
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowMulaiPicker(false)}
                              className="text-[10px] font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 px-2.5 py-1 rounded-md"
                            >
                              Tutup
                            </button>
                          </div>
                        </div>
                      )}
                      <p className="mt-1.5 text-[10px] text-gray-400">Tulis langsung atau klik tombol <b>Pilih</b> untuk menggunakan kalender interaktif.</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Alamat Usaha</label>
                      <input 
                        type="text" 
                        value={usahaAlamat}
                        onChange={(e) => setUsahaAlamat(e.target.value)}
                        placeholder="Contoh: Jl. Keramat RT 01/RW 02 No. 12"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                        required
                      />
                      <p className="mt-1.5 text-[10px] text-emerald-600 font-medium">Lokasi operasional usaha. Cantumkan RT/RW jika berada di pemukiman desa.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Nomor Induk Berusaha (NIB) / Izin Usaha (Opsional)</label>
                      <input 
                        type="text" 
                        value={usahaNib}
                        onChange={(e) => setUsahaNib(e.target.value)}
                        placeholder="Contoh: 9120001234567 atau isi - jika belum ada"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Omset Bulanan / Perkiraan (Opsional)</label>
                      <input 
                        type="text" 
                        value={usahaOmzet}
                        onChange={(e) => setUsahaOmzet(e.target.value)}
                        placeholder="Contoh: Rp 5.000.000,-"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                      />
                    </div>
                  </div>
                )}

                {selectedTemplate === 'SKPH' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-emerald-50/20 p-5 rounded-2xl border border-emerald-100/50 mb-6">
                    <div className="md:col-span-2 border-b border-emerald-100/50 pb-2">
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-emerald-600" />
                        Informasi Detail Penghasilan (SKPH)
                      </h4>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Jumlah Penghasilan Bulanan (Rata-rata)</label>
                      <input 
                        type="text" 
                        value={penghasilanNominal}
                        onChange={(e) => setPenghasilanNominal(e.target.value)}
                        placeholder="Contoh: Rp 3.500.000,- (Tiga Juta Lima Ratus Ribu Rupiah)"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                        required
                      />
                      <p className="mt-1.5 text-[10px] text-emerald-600 font-medium">Tulis nominal angka serta terbilang dalam rupiah jika diperlukan.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1.5">Sumber Penghasilan / Pekerjaan</label>
                      <input 
                        type="text" 
                        value={penghasilanSumber}
                        onChange={(e) => setPenghasilanSumber(e.target.value)}
                        placeholder="Contoh: Bertani, Pedagang Kelontong, Wiraswasta"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-medium text-sm"
                        required
                      />
                      <p className="mt-1.5 text-[10px] text-emerald-600 font-medium">Sektor pekerjaan yang menghasilkan pendapatan rutin terkait.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-gray-600 dark:text-slate-400 mb-2">Keperluan / Keterangan Tambahan</label>
                  <textarea 
                    rows={4} 
                    value={keperluan}
                    onChange={(e) => setKeperluan(e.target.value)}
                    placeholder="Contoh: Digunakan untuk persyaratan melamar pekerjaan atau pengurusan administrasi kependudukan."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none font-medium text-sm"
                    required
                  ></textarea>
                  <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Tuliskan secara spesifik tujuan pembuatan surat ini.</p>
                </div>
              </div>
            </form>
                </section>

             </div>
             
             <div className="lg:col-span-5 relative">
                <div className="sticky top-24 space-y-6">
                   <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                {/* Zoom Controls */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">LIVE A4 ENGINE PREVIEW</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
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
                      onClick={() => setZoomLevel(0.45)} 
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-[10px] font-bold"
                      title="Reset Zoom"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                
                {/* A4 Paper Container Area */}
                <div 
                  ref={dragProps.ref}
                  onMouseDown={dragProps.onMouseDown}
                  onMouseLeave={dragProps.onMouseLeave}
                  onMouseUp={dragProps.onMouseUp}
                  onMouseMove={dragProps.onMouseMove}
                  style={{ ...dragProps.style }}
                  className="flex-1 bg-slate-200/40 overflow-auto relative flex p-8 min-h-[600px]"
                >
                  {/* Outer scaled wrapper to prevent scrollbars */}
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
                    {/* Visual Crop Marks */}
                    <div className="absolute top-6 left-6 w-4 h-4 border-t border-l border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
                    <div className="absolute top-6 right-6 w-4 h-4 border-t border-r border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
                    <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>
                    <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-slate-300 dark:border-slate-600 pointer-events-none z-10"></div>

                    <div 
                      ref={componentRef}
                      className="bg-white dark:bg-slate-900 p-12 relative text-black shrink-0 print-wrapper animate-in fade-in duration-300 printable-area" 
                      style={{ 
                        fontFamily: letterFont,
                        width: '794px',
                        height: '1123px',
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'top left',
                        boxSizing: 'border-box'
                      }}
                    >
                  
                  {/* Crop Marks (Visual only for preview) */}
                  <div className="crop-mark absolute top-8 left-8 w-4 h-4 border-t border-l border-gray-300 dark:border-slate-600"></div>
                  <div className="crop-mark absolute top-8 right-8 w-4 h-4 border-t border-r border-gray-300 dark:border-slate-600"></div>
                  <div className="crop-mark absolute bottom-8 left-8 w-4 h-4 border-b border-l border-gray-300 dark:border-slate-600"></div>
                  <div className="crop-mark absolute bottom-8 right-8 w-4 h-4 border-b border-r border-gray-300 dark:border-slate-600"></div>

                  <div className="px-4">
                    {/* Letter Header / Kop Surat */}
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', borderBottom: '2.5px solid #111', paddingBottom: '8px', marginBottom: '20px', fontFamily: letterFont }}>
                      <div style={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                        <div style={{ width: '100px', height: '110px', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: '15px' }}>
                          <img src={logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ textAlign: 'center', flex: 1, paddingRight: '100px' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: '1.1', margin: '0 0 2px 0' }}>{kabupatenName.toUpperCase()}</div>
                          <div style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: '1.1', margin: '0 0 2px 0' }}>{kecamatanName.toUpperCase()}</div>
                          <div style={{ fontWeight: 900, fontSize: '26px', letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: '1.1', margin: '2px 0 3px 0' }}>{desaName.toUpperCase()}</div>
                          <div style={{ fontSize: '10.5px', textTransform: 'capitalize', lineHeight: '1.15', margin: '2px 0 1px 0' }}>{alamatKantor}</div>
                          <div style={{ fontSize: '10.5px', lineHeight: '1.15', margin: '1px 0 0 0' }}>{kontakKantor}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Letter Body - Conditional Layout depending on classification code */}
                    {(() => {
                      const isSU = selectedTemplate === 'SU' || selectedTemplate === 'UND';
                      
                      // Helper to get latest data (prefer proposed changes if they exist)
                      const getLatest = (field: string, defaultValue: string = '-') => {
                        if (!selectedResident) return defaultValue;
                        return selectedResident.pendingMeta?.details?.[field] || selectedResident[field] || defaultValue;
                      };

                      const name = getLatest('name', 'Budi Santoso');
                      const nik = getLatest('nik', '3275010101700001');
                      const birthPlace = getLatest('birthPlace', 'Wasah Hilir');
                      const birthDate = getLatest('birthDate', '12-06-1985');
                      const gender = getLatest('gender', 'Laki-laki');
                      const address = getLatest('address', 'Dusun Krajan');
                      const rtRwValue = getLatest('rtRw', '');
                      const rtRw = rtRwValue ? `RT/RW ${rtRwValue}` : (selectedResident?.rt_rw ? `RT/RW ${selectedResident.rt_rw}` : 'RT 02/01');

                      if (isSU) {
                        return (
                          <div className="text-[14px] text-black space-y-4">
                            <div className="flex justify-end mb-4">
                              <p>{desaName.replace(/desa|kelurahan/gi, '').trim()}, {currentDateFormatted()}</p>
                            </div>
                            
                            <div className="flex gap-4">
                              <div className="w-20 font-bold">
                                <p>Nomor</p>
                                <p>Sifat</p>
                                <p>Lampiran</p>
                                <p>Hal</p>
                              </div>
                              <div className="w-4">
                                <p>:</p>
                                <p>:</p>
                                <p>:</p>
                                <p>:</p>
                              </div>
                              <div className="flex-1">
                                <p className="font-mono font-bold">{nomorSurat}</p>
                                <p>Penting</p>
                                <p>-</p>
                                <p className="font-bold uppercase text-emerald-950">{keperluan || (selectedTemplate === 'UND' ? 'UNDANGAN PERTEMUAN KOORDINASI' : 'PERMOHONAN RESMI / KOORDINASI')}</p>
                              </div>
                            </div>

                            <div className="mt-6 mb-8">
                              <div className="flex gap-2">
                                <span>Yth.</span>
                                <div>
                                  <p>{selectedTemplate === 'UND' ? 'Seluruh Warga Desa Terkait' : 'Kepala Instansi / Warga Terkait'}</p>
                                  <p>di</p>
                                  <p className="ml-4 font-bold">Tempat</p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 text-justify leading-[1.15]">
                              {selectedTemplate === 'UND' ? (
                                <>
                                  <p className="indent-8">
                                    Sehubungan dengan diadakannya agenda rapat koordinasi bulanan dan evaluasi kemasyarakatan di lingkungan wilayah {desaName}, kami bermaksud mengundang kehadiran Bapak/Ibu/Saudara(i) dalam rapat bersama tersebut.
                                  </p>
                                  <p className="indent-8">
                                    Kehadiran Bapak/Ibu sangat kami harapkan demi kelancaran pembangunan wilayah kependudukan kita bersama secara berkelanjutan.
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="indent-8">
                                    Dalam rangka kelancaran administrasi kependudukan dan koordinasi pembangunan di wilayah {desaName}, {kecamatanName}, {kabupatenName}, kami bermaksud menyampaikan hal terkait perihal di atas.
                                  </p>
                                  <p className="indent-8">
                                    Sehubungan dengan hal tersebut, segala ketentuan kependudukan dan rincian teknis yang bersangkutan agar dapat dipergunakan dan difasilitasi sebagaimana mestinya sesuai aturan yang berlaku.
                                  </p>
                                </>
                              )}
                              <p className="indent-8">
                                Demikian surat ini kami sampaikan, atas kerja sama dan perhatian bapak/ibu kami ucapkan terima kasih.
                              </p>
                            </div>

                            {renderReactSignature(desaName, currentDateFormatted(), namaKades, roleKades, nipKades, includeCamat)}
                          </div>
                        );
                      }

                      // Dynamic standard surat keterangan texts
                      let leadingParagraph = `Yang bertanda tangan di bawah ini Kepala ${desaName}, ${kecamatanName}, ${kabupatenName}, menerangkan dengan sebenarnya bahwa:`;
                      let middleParagraph = `Adalah benar nama tersebut di atas merupakan penduduk ${desaName} yang berdomisili sah pada alamat tersebut. Surat keterangan ini diterbitkan secara resmi untuk memenuhi keperluan:`;
                      let trailingParagraph = `Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan dan dipertanggungjawabkan sebagaimana mestinya.`;

                      let specificContent = null;

                      if (selectedTemplate === 'SKM') {
                        leadingParagraph = `Yang bertanda tangan di bawah ini Kepala ${desaName}, ${kecamatanName}, ${kabupatenName}, menerangkan dengan sebenarnya bahwa warga kami:`;
                        specificContent = (
                          <div className="my-6 pl-4 border-l-4 border-red-600/50 space-y-2 bg-red-50/30 p-3 rounded-lg">
                            <p className="font-extrabold text-red-950 uppercase tracking-wider text-xs">STATUS: TELAH MENINGGAL DUNIA / WAFAT</p>
                            <p className="text-justify text-xs text-gray-700 dark:text-slate-300 leading-[1.15]">Berdasarkan saksi keluarga dan laporan kependudukan wilayah setempat, yang bersangkutan dinyatakan telah wafat dengan tertib kependudukan.</p>
                          </div>
                        );
                        middleParagraph = `Surat keterangan kematian ini diterbitkan secara resmi untuk pengurusan akta kematian, asuransi, waris, serta keperluan keluarga lainnya:`;
                      } else if (selectedTemplate === 'SKAW') {
                        specificContent = (
                          <div className="my-6 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50 text-xs text-emerald-950 space-y-2">
                            <p className="font-bold">STATUS AHLI WARIS SAH:</p>
                            <p className="leading-[1.15]">Menyatakan dengan sesungguhnya bahwa nama warga di atas adalah ahli waris sah yang diakui secara adat dan administrasi hukum dari garis keturunan almarhum pewaris sah.</p>
                          </div>
                        );
                        middleParagraph = `Surat keterangan ahli waris ini dibuat untuk melengkapi administrasi waris, peralihan hak, atau keperluan legalitas lainnya:`;
                                            } else if (selectedTemplate === 'SKD' || selectedTemplate === 'SKDPR' || selectedTemplate === 'SDP') {
                        middleParagraph = `Berdasarkan surat pernyataan dan keterangan yang dibuat oleh yang bersangkutan, nama tersebut di atas menyatakan dengan sadar bahwa ia memang berstatus DOMISILI MENETAP / SEMENTARA di alamat sekarang tersebut. Surat keterangan ini diterbitkan untuk dipergunakan sebagaimana mestinya:`;
                        specificContent = (
                          <div className="my-6 space-y-2 pl-4 border-l-2 border-emerald-600/30">
                            <p className="font-bold uppercase text-[12px] tracking-wide text-emerald-950 mb-2">ALAMAT DOMISILI SEKARANG:</p>
                            <p className="font-medium text-emerald-900 italic">Belum diisi - (Akan diisi di Form Pembuatan SKD)</p>
                          </div>
                        );
                      } else if (selectedTemplate === 'SKTM') {
                        middleParagraph = `Adalah benar nama tersebut di atas merupakan warga berdomisili sah di wilayah kami yang tergolong dalam keluarga prasejahtera (tidak mampu). Surat keterangan ini diterbitkan untuk memenuhi keperluan:`;
                      } else if (selectedTemplate === 'SKH') {
                        middleParagraph = `Adalah benar nama tersebut di atas berdasarkan keterangan yang bersangkutan telah kehilangan surat / dokumen penting. Surat keterangan kehilangan ini diterbitkan untuk memenuhi keperluan:`;
                        middleParagraph = `Adalah benar nama tersebut di atas merupakan warga berdomisili sah di wilayah kami yang tergolong dalam keluarga prasejahtera (tidak mampu). Surat keterangan ini diterbitkan untuk memenuhi keperluan:`;
                      } else if (selectedTemplate === 'SKU') {
                        specificContent = (
                          <div className="my-6 space-y-2 pl-4 border-l-2 border-emerald-600/30">
                            <p className="font-bold uppercase text-[12px] tracking-wide text-emerald-950 mb-2">IDENTITAS / DETAIL USAHA:</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '200px 10px 1fr' }}><span>1. Nama Usaha / Toko</span><span>:</span><span className="font-bold">{usahaName || '-'}</span></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '200px 10px 1fr' }}><span>2. Bidang / Jenis Usaha</span><span>:</span><span>{usahaJenis || '-'}</span></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '200px 10px 1fr' }}><span>3. Alamat Usaha</span><span>:</span><span>{usahaAlamat || '-'}</span></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '200px 10px 1fr' }}><span>4. Mulai Berdiri Sejak</span><span>:</span><span>{usahaMulai || '-'}</span></div>
                            {usahaNib && usahaNib !== '-' && (
                              <div style={{ display: 'grid', gridTemplateColumns: '200px 10px 1fr' }}><span>5. No. Izin Usaha / NIB</span><span>:</span><span className="font-mono">{usahaNib}</span></div>
                            )}
                            {usahaOmzet && usahaOmzet !== '-' && (
                              <div style={{ display: 'grid', gridTemplateColumns: '200px 10px 1fr' }}><span>{usahaNib && usahaNib !== '-' ? '6' : '5'}. Estimasi Omset Bulanan</span><span>:</span><span>{usahaOmzet}</span></div>
                            )}
                          </div>
                        );
                        middleParagraph = `Adalah benar nama tersebut di atas merupakan warga kami yang memiliki dan aktif mengelola unit usaha perorangan mandiri di wilayah Desa kami sesuai dengan detail di atas. Surat keterangan usaha ini diterbitkan untuk keperluan kelengkapan usaha:`;
                      } else if (selectedTemplate === 'SKBM') {
                        middleParagraph = `Adalah benar nama tersebut di atas berstatus belum kawin / belum pernah menikah berdasarkan registrasi kependudukan kami. Surat keterangan ini diterbitkan untuk keperluan persyaratan nikah/administrasi pekerjaan:`;
                      } else if (selectedTemplate === 'SKL') {
                        leadingParagraph = `Yang bertanda tangan di bawah ini Kepala ${desaName}, menerangkan bahwa dari pasangan warga kami telah lahir seorang anak dengan identitas kependudukan terlampir di bawah ini. Adapun orang tua anak tersebut adalah:`;
                        middleParagraph = `Surat keterangan kelahiran ini dibuat sebagai bukti pengantar utama pengurusan akta kelahiran resmi anak pada instansi pencatatan sipil:`;
                      } else if (selectedTemplate === 'SKH') {
                        middleParagraph = `Adalah benar yang bersangkutan telah melaporkan kehilangan dokumen penting non-pidana. Surat pengantar kehilangan ini diberikan untuk pengurusan dokumen baru ke instansi berwenang:`;
                      } else if (selectedTemplate === 'SKPH') {
                        specificContent = (
                          <div className="my-6 space-y-2 pl-4 border-l-2 border-emerald-600/30">
                            <p className="font-bold uppercase text-[12px] tracking-wide text-emerald-950 mb-2">RINCIAN PENGHASILAN:</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '200px 10px 1fr' }}><span>1. Sumber Penghasilan</span><span>:</span><span className="font-bold">{penghasilanSumber || '-'}</span></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '200px 10px 1fr' }}><span>2. Jumlah Penghasilan</span><span>:</span><span className="font-bold text-emerald-900">{penghasilanNominal || '-'}</span></div>
                          </div>
                        );
                        middleParagraph = `Adalah benar nama tersebut di atas merupakan warga kami yang berdomisili sah di Desa kami, dan berdasarkan pengakuan yang bersangkutan memiliki rincian penghasilan bulanan sebagaimana di atas. Surat keterangan penghasilan ini diterbitkan untuk keperluan:`;
                      }

                      return (
                        <div className="text-[14px] text-black">
                          <div className="text-center mb-8">
                            <h6 className="font-bold underline uppercase text-[16px] tracking-wide">
                              {selectedClass ? selectedClass.jenis : 'SURAT KETERANGAN'}
                            </h6>
                            <p className="text-[14px] font-mono">Nomor: {nomorSurat}</p>
                          </div>
                          <p className="text-justify leading-[1.15]">{leadingParagraph}</p>
                          
                          <div className="pl-8 my-6 space-y-3">
                            <div className="grid grid-cols-[160px_10px_1fr]"><span>Nama</span><span>:</span><span className="font-bold">{name}</span></div>
                            <div className="grid grid-cols-[160px_10px_1fr]"><span>NIK</span><span>:</span><span className="font-mono font-semibold">{nik}</span></div>
                            <div className="grid grid-cols-[160px_10px_1fr]"><span>Tempat, Tgl Lahir</span><span>:</span><span>{birthPlace}, {birthDate}</span></div>
                            <div className="grid grid-cols-[160px_10px_1fr]"><span>Jenis Kelamin</span><span>:</span><span>{gender}</span></div>
                            <div className="grid grid-cols-[160px_10px_1fr]"><span>Alamat / Domisili</span><span>:</span><span>{address} {rtRw}</span></div>
                          </div>

                          {specificContent}
                          
                          <p className="text-justify leading-[1.15]">
                            {middleParagraph}
                          </p>
                          <div className="p-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl my-4 text-justify font-medium italic text-gray-800 dark:text-slate-100">
                            "{keperluan || 'Persyaratan administrasi kependudukan.'}"
                          </div>
                          <p className="text-justify leading-[1.15] mt-2">{trailingParagraph}</p>
                          {renderReactSignature(desaName, currentDateFormatted(), namaKades, roleKades, nipKades, includeCamat)}
                        </div>
                      );
                    })()}
                    
                    {/* Global Print Footer */}
                    <div 
                      className="absolute bottom-[8mm] left-[15mm] right-[15mm] w-[calc(100%-30mm)]"
                      dangerouslySetInnerHTML={{ 
                        __html: SAAS_CONFIG.globalFooterHTML
                      }} 
                    />
                  </div>
                </div>
              </div>
              </div>
              </div>

              {/* Actions Sidebar */}
              
                   
                   <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
                       <h4 className="font-bold text-emerald-800 mb-2">Selesai Berkas?</h4>
                       <p className="text-sm text-emerald-700/80 mb-6 leading-relaxed">
                          Pastikan data sudah benar sebelum mencetak atau menyimpan ke arsip digital.
                       </p>
                       <div className="space-y-3">
                          <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 bg-emerald-700 text-white py-3 rounded-xl font-bold shadow-sm dark:shadow-none hover:bg-emerald-800 transition-all">
                             <Printer className="w-5 h-5" /> Cetak PDF
                          </button>
                          <button onClick={handleSimpan} disabled={isSaving} className="w-full flex items-center justify-center gap-2 border-2 border-emerald-700 text-emerald-700 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all disabled:opacity-50">
                             <Archive className="w-5 h-5" /> {isSaving ? 'Menyimpan...' : 'Simpan Arsip'}
                          </button>
                       </div>
                   </div>
                </div>
             </div>
          </div>
        )}
</div>
      {/* Hidden Iframe for high-resolution printing without default headers/footers */}
      <iframe 
        ref={iframeRef} 
        style={{ 
          position: 'absolute', 
          width: '0', 
          height: '0', 
          border: 'none', 
          opacity: '0', 
          pointerEvents: 'none' 
        }} 
        title="Print Frame" 
      />

      {/* Pop-up Dialog Success Printing */}
      <PrintSuccessDialog
        isOpen={success}
        onClose={() => setSuccess(false)}
        nomorSurat={nomorSurat}
        namaWarga={selectedResident?.name || 'Umum'}
        jenisSurat="Surat Resmi"
        onBackToTemplates={onBack}
      />
    </div>
  );
}


