import { fetchResidentsCached } from '../../../utils/apiCache';
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, Search, Filter, FilterX, FileText, Eye, Printer, Download, Trash2, X, ZoomIn, ZoomOut, Pencil, Ban
} from 'lucide-react';
import { getLetterHistory, LetterHistory, deleteLetterHistory, saveLetterHistory, cancelLetterHistory } from '../../../utils/letterHistory';
import { getReactSignaturePreview } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';

const getFullLetterName = (jenis: string): string => {
  const mapping: Record<string, string> = {
    'SKM': 'Surat Keterangan Kematian (SKM)',
    'SK KEMATIAN': 'Surat Keterangan Kematian (SKM)',
    'SKAW': 'Surat Keterangan Ahli Waris (SKAW)',
    'SK AHLI WARIS': 'Surat Keterangan Ahli Waris (SKAW)',
    'SKTM': 'Surat Keterangan Tidak Mampu (SKTM)',
    'SKH': 'Surat Keterangan Kehilangan (SKH)',
    'SK KEHILANGAN': 'Surat Keterangan Kehilangan (SKH)',
    'SPT': 'Surat Pengurusan Taspen (SPT)',
    'SURAT PENGURUSAN TASPEN': 'Surat Pengurusan Taspen (SPT)',
    'SDU': 'Surat Keterangan Domisili Usaha (SDU)',
    'SKD': 'Surat Keterangan Domisili Perorangan (SKD)',
    'SK DOMISILI': 'Surat Keterangan Domisili Perorangan (SKD)',
    'Surat Keterangan Domisili': 'Surat Keterangan Domisili Perorangan (SKD)',
    'SKBM': 'Surat Keterangan Belum Menikah (SKBM)',
    'SK BELUM MENIKAH': 'Surat Keterangan Belum Menikah (SKBM)',
    'SKU': 'Surat Keterangan Usaha (SKU)',
    'SK USAHA': 'Surat Keterangan Usaha (SKU)',
    'SKP': 'Surat Keterangan Pindah (SKP)',
    'SURAT KETERANGAN PINDAH': 'Surat Keterangan Pindah (SKP)',
    'SPH': 'Surat Pengantar Pindah (SPH)',
    'SURAT PINDAH': 'Surat Pengantar Pindah (SPH)',
    'SK PENGHASILAN': 'Surat Keterangan Penghasilan (SKPH)',
    'SKPH': 'Surat Keterangan Penghasilan (SKPH)',
    'Surat Pengantar Nikah': 'Surat Pengantar Nikah (SKN)',
    'SKN': 'Surat Pengantar Nikah (SKN)',
    'SK NIKAH': 'Surat Pengantar Nikah (SKN)'
  };
  const clean = (jenis || '').trim();
  const cleanUpper = clean.toUpperCase();
  return mapping[clean] || mapping[cleanUpper] || clean;
};

interface AdminSuratDashboardProps {
  onBuatSurat: () => void;
  onEditLetter?: (letter: LetterHistory) => void;
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  debouncedSearchQuery?: string;
}

export default function AdminSuratDashboard({ 
  onBuatSurat,
  onEditLetter,
  searchQuery: externalSearchQuery,
  setSearchQuery: externalSetSearchQuery,
  debouncedSearchQuery: externalDebouncedSearchQuery
}: AdminSuratDashboardProps) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localDebouncedSearchQuery, setLocalDebouncedSearchQuery] = useState('');
  
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalSetSearchQuery !== undefined ? externalSetSearchQuery : setLocalSearchQuery;

  // Handle local debouncing if no external debounced query is provided
  useEffect(() => {
    if (externalDebouncedSearchQuery !== undefined) return;
    const timer = setTimeout(() => {
      setLocalDebouncedSearchQuery(localSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery, externalDebouncedSearchQuery]);

  const debouncedSearchQuery = externalDebouncedSearchQuery !== undefined ? externalDebouncedSearchQuery : localDebouncedSearchQuery;
  const [selectedType, setSelectedType] = useState('');
  const [suratList, setSuratList] = useState<LetterHistory[]>([]);
  const [residents, setResidents] = useState<any[]>([]);
  const componentRef = useRef<HTMLDivElement>(null);

  const [showPrintWarning, setShowPrintWarning] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState<LetterHistory | null>(null);
  const [suratToDelete, setSuratToDelete] = useState<LetterHistory | null>(null);
  const [suratToCancel, setSuratToCancel] = useState<LetterHistory | null>(null);
  const [selectedSuratIds, setSelectedSuratIds] = useState<string[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0.65);
  const [isPrintingSingle, setIsPrintingSingle] = useState(false);
  const [isPrintingTable, setIsPrintingTable] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');

  // Kop Surat Settings State for dynamic printing header
  const [kopSettings, setKopSettings] = useState(() => ({
    logoUrl: localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png',
    kabupaten: localStorage.getItem('kop_kabupaten') || localStorage.getItem('village_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan',
    kecamatan: localStorage.getItem('kop_kecamatan') || localStorage.getItem('village_kecamatan') || 'Kecamatan Simpur',
    desa: localStorage.getItem('kop_desa') || localStorage.getItem('village_name') || 'Desa Wasah Hilir',
    alamat: localStorage.getItem('kop_alamat') || localStorage.getItem('village_alamat') || 'Jalan Keramat, Simpur, Hulu Sungai Selatan, Kalimantan Selatan 71261',
    kontak: localStorage.getItem('kop_kontak') || '0813 4686 7519, pemdeswasahhilir@gmail.com',
  }));

  useEffect(() => {
    setSuratList(getLetterHistory());
    
    // Fetch residents for accurate preview mapping
    fetchResidentsCached()
      .then(res => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); })
      .then(data => {
        if (Array.isArray(data)) {
          setResidents(data);
        }
      })
      .catch(err => console.error("Error loading residents in dashboard:", err));

    const parseIndonesianDate = (dateStr: string) => {
    if (!dateStr) return null;
    const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length < 3) return null;
    const day = parseInt(parts[0]);
    const month = months.indexOf(parts[1]);
    const year = parseInt(parts[2]);
    if (isNaN(day) || month === -1 || isNaN(year)) return null;
    return new Date(year, month, day);
  };

  const handleSettingsUpdate = () => {
      setKopSettings({
        logoUrl: localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png',
        kabupaten: localStorage.getItem('kop_kabupaten') || localStorage.getItem('village_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan',
        kecamatan: localStorage.getItem('kop_kecamatan') || localStorage.getItem('village_kecamatan') || 'Kecamatan Simpur',
        desa: localStorage.getItem('kop_desa') || localStorage.getItem('village_name') || 'Desa Wasah Hilir',
        alamat: localStorage.getItem('kop_alamat') || localStorage.getItem('village_alamat') || 'Jalan Keramat, Simpur, Hulu Sungai Selatan, Kalimantan Selatan 71261',
        kontak: localStorage.getItem('kop_kontak') || '0813 4686 7519, pemdeswasahhilir@gmail.com',
      });
    };

    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const handlePrintAll = () => {
    setShowPrintModal(false);
    setIsPrintingTable(true);
    const originalTitle = document.title;
    document.title = "DAFTAR NOMOR SURAT DESA WASAH HILIR";
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        setShowPrintWarning(true);
        setTimeout(() => setShowPrintWarning(false), 5000);
      }
      setIsPrintingTable(false);
      document.title = originalTitle;
    }, 200);
  };

  const triggerSinglePrint = (surat: LetterHistory) => {
    setSelectedSurat(surat);
    setIsPrintingSingle(true);
    setTimeout(() => {
      try {
        window.print();
      } catch (e) {
        setShowPrintWarning(true);
      }
      setIsPrintingSingle(false);
    }, 200);
  };

  const handleDeleteSurat = () => {
    if (!suratToDelete) return;
    const updated = deleteLetterHistory(suratToDelete.id);
    setSuratList(updated);
    setSelectedSuratIds(prev => prev.filter(id => id !== suratToDelete.id));
    showToast(`Arsip surat "${suratToDelete.nomor}" berhasil dihapus.`, 'success');
    setSuratToDelete(null);
    if (selectedSurat && selectedSurat.id === suratToDelete.id) {
      setSelectedSurat(null);
    }
  };

  const handleCancelSurat = () => {
    if (!suratToCancel) return;
    const updated = cancelLetterHistory(suratToCancel.id);
    setSuratList(updated);
    showToast(`Surat "${suratToCancel.nomor}" telah dibatalkan.`, 'success');
    setSuratToCancel(null);
    if (selectedSurat && selectedSurat.id === suratToCancel.id) {
      setSelectedSurat(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedSuratIds.length === 0) return;
    const history = getLetterHistory();
    const updated = history.filter(item => !selectedSuratIds.includes(item.id));
    saveLetterHistory(updated);
    setSuratList(updated);
    showToast(`${selectedSuratIds.length} arsip surat berhasil dihapus secara masal.`, 'success');
    setSelectedSuratIds([]);
    setShowBulkDeleteModal(false);
    if (selectedSurat && selectedSuratIds.includes(selectedSurat.id)) {
      setSelectedSurat(null);
    }
  };

  const activeResident = useMemo(() => {
    if (!selectedSurat) return null;
    return residents.find(r => 
      (r.nik && r.nik === selectedSurat.nik) || 
      (r.name && r.name.toLowerCase() === selectedSurat.nama.toLowerCase())
    );
  }, [selectedSurat, residents]);

  const filteredSurat = useMemo(() => {
    return suratList.filter((surat) => {
      const matchesSearch = 
        surat.nomor.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        surat.nama.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      let matchesType = true;
      if (selectedType) {
        if (selectedType === 'domisili') {
          matchesType = surat.jenis.toLowerCase().includes('domisili');
        } else if (selectedType === 'sktm') {
          matchesType = surat.jenis.toLowerCase() === 'sktm';
        } else if (selectedType === 'sku') {
          matchesType = surat.jenis.toLowerCase().includes('usaha') || surat.jenis.toLowerCase().includes('sku');
        } else if (selectedType === 'skph') {
          matchesType = surat.jenis.toLowerCase().includes('penghasilan') || surat.jenis.toLowerCase().includes('skph');
        } else if (selectedType === 'spt') {
          matchesType = surat.jenis.toLowerCase() === 'spt' || surat.jenis.toLowerCase().includes('taspen');
        }
      }

      return matchesSearch && matchesType;
    });
  }, [suratList, debouncedSearchQuery, selectedType]);

  const handleExportExcel = () => {
    const headers = ['Nomor Surat', 'Jenis Surat', 'Pemohon', 'Tanggal', 'Status'];
    const csvContent = [
      headers.join(','),
      ...suratList.map(surat => 
        `"${surat.nomor}","${surat.jenis}","${surat.nama}","${surat.tanggal}","${surat.status}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'arsip_surat_desa.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to render letter layout exactly like AdminSuratBuat.tsx
  const renderLetterContent = (surat: LetterHistory, residentObj: any) => {
    const logoUrl = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
    const kabupatenName = localStorage.getItem('kop_kabupaten') || 'Pemerintah Kabupaten Hulu Sungai Selatan';
    const kecamatanName = localStorage.getItem('kop_kecamatan') || 'Kecamatan Simpur';
    const desaName = localStorage.getItem('kop_desa') || 'Desa Wasah Hilir';
    const alamatKantor = localStorage.getItem('kop_alamat') || 'Jalan Keramat, Simpur, Hulu Sungai Selatan, Kalimantan Selatan 71261';
    const kontakKantor = localStorage.getItem('kop_kontak') || '0813 4686 7519, pemdeswasahhilir@gmail.com';
    const namaKades = localStorage.getItem('kop_kades') || 'Fazakkir Rahmad';

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
          <p className={`text-[10px] font-mono mt-0.5 text-gray-700 m-0 ${textAlignClass}`}>NIP. {nipPejabat}</p>
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
                <p className={`text-[11px] mt-0.5 text-gray-800 m-0 ${textAlignClass}`}>{sig.sigLeftPangkat}</p>
              )}
              {sig.sigLeftNip && sig.sigLeftNip !== '-' && (
                <p className={`text-[11px] mt-0.5 text-gray-800 m-0 ${textAlignClass}`}>NIP : {sig.sigLeftNip}</p>
              )}
            </div>

            {/* Right Bottom */}
            <div className={`w-[230px] ${textAlignClass}`}>
              <p className={`font-bold uppercase text-xs m-0 decoration-1 ${nameUnderlineClass} ${textAlignClass}`}>{namaPejabat}</p>
              {nipPejabat && nipPejabat !== '-' && nipPejabat !== '' && (
                <p className={`text-[10px] font-mono mt-0.5 text-gray-700 m-0 ${textAlignClass}`}>NIP. {nipPejabat}</p>
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

    const getKlasifikasiFromSurat = (s: LetterHistory) => {
      const typeLower = s.jenis.toLowerCase();
      if (typeLower.includes('kematian') || typeLower === 'skm' || s.nomor.includes('/SKM/')) return 'SKM';
      if (typeLower.includes('ahli waris') || typeLower === 'skaw' || s.nomor.includes('/SKAW/')) return 'SKAW';
      if (typeLower.includes('tidak mampu') || typeLower.includes('sktm') || s.nomor.includes('/SKTM/')) return 'SKTM';
      if (typeLower.includes('usaha') || typeLower === 'sku' || s.nomor.includes('/SKU/')) return 'SKU';
      if (typeLower.includes('penghasilan') || typeLower === 'skph' || s.nomor.includes('/SKPH/')) return 'SKPH';
      if (typeLower.includes('belum menikah') || typeLower.includes('belum kawin') || typeLower === 'skbm' || s.nomor.includes('/SKBM/')) return 'SKBM';
      if (typeLower.includes('kelahiran') || typeLower.includes('lahir') || typeLower === 'skl' || s.nomor.includes('/SKL/')) return 'SKL';
      if (typeLower.includes('pindah') || typeLower === 'sph' || s.nomor.includes('/SPH/')) return 'SPH';
      if (typeLower.includes('kehilangan') || typeLower === 'skh' || s.nomor.includes('/SKH/')) return 'SKH';
      if (typeLower.includes('undangan') || typeLower === 'und' || s.nomor.includes('/UND/')) return 'UND';
      if (typeLower === 'su' || s.nomor.includes('/SU/') || typeLower.includes('umum') || typeLower.includes('dinas')) return 'SU';
      if (typeLower.includes('domisili') || typeLower === 'skd' || s.nomor.includes('/SKD/')) return 'SKD';
      if (typeLower.includes('pengantar') || typeLower === 'skp' || s.nomor.includes('/SKP/')) return 'SKP';
      return typeLower.toUpperCase();
    };

    const code = getKlasifikasiFromSurat(surat);
    const isSU = code === 'SU' || code === 'UND';
    
    const sd = surat.data || {};
    const name = sd.nama || residentObj?.name || surat.nama;
    const nik = sd.nik || residentObj?.nik || surat.nik || '-';
    const birthPlace = sd.tempatLahir || residentObj?.birthPlace || '-';
    const birthDate = sd.tanggalLahir || residentObj?.birthDate || '-';
    const gender = sd.jenisKelamin || residentObj?.gender || '-';
    const address = sd.alamat || residentObj?.address || '-';
    const rtRw = (sd.rt && sd.rw) ? `RT.${sd.rt} RW.${sd.rw}` : (residentObj?.rt_rw ? `RT/RW ${residentObj.rt_rw}` : '-');

    return (
      <div className="text-black text-left font-sans" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
        {/* Kop Surat */}
        <div className="flex flex-col mb-[25px]">
          <div className="flex items-center pb-3 border-b-[2.5px] border-black">
            {logoUrl && (
              <div className="w-[80px] h-[90px] flex-shrink-0 flex items-center justify-center mr-[15px]">
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="w-full h-full object-contain" 
                  onError={(e) => e.currentTarget.style.display = 'none'} 
                />
              </div>
            )}
            <div className={`flex-1 text-center ${logoUrl ? 'pr-[80px]' : ''}`}>
              <h5 className="text-[12px] uppercase font-bold text-black" style={{ lineHeight: '1.2', letterSpacing: '1px' }}>{kabupatenName}</h5>
              <h5 className="text-[12px] uppercase font-bold text-black" style={{ lineHeight: '1.2', letterSpacing: '1px' }}>{kecamatanName}</h5>
              <h5 className="font-black text-[22px] uppercase mt-[2px] leading-none text-black" style={{ letterSpacing: '2px' }}>{desaName}</h5>
              <p className="text-[9px] text-black mt-[4px] capitalize">{alamatKantor}</p>
              <p className="text-[9px] text-black">{kontakKantor}</p>
            </div>
          </div>
        </div>
        
        {/* Letter Body */}
        {isSU ? (
          <div className="text-[14px] text-black space-y-4">
            <div className="flex justify-end mb-4">
              <p>{desaName.replace(/desa|kelurahan/gi, '').trim()}, {surat.tanggal}</p>
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
                <p className="font-mono font-bold">{surat.nomor}</p>
                <p>Penting</p>
                <p>-</p>
                <p className="font-bold uppercase text-emerald-950">{surat.keperluan || (code === 'UND' ? 'UNDANGAN PERTEMUAN KOORDINASI' : 'PERMOHONAN RESMI / KOORDINASI')}</p>
              </div>
            </div>

            <div className="mt-6 mb-8">
              <div className="flex gap-2">
                <span>Yth.</span>
                <div>
                  <p>{code === 'UND' ? 'Seluruh Warga Desa Terkait' : 'Kepala Instansi / Warga Terkait'}</p>
                  <p>di</p>
                  <p className="ml-4 font-bold">Tempat</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-justify leading-relaxed">
              {code === 'UND' ? (
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

            <div className="mt-16 flex justify-end">
              <div className="text-center w-[250px]">
                <p>Kepala {desaName},</p>
                <div className="h-24"></div>
                <p className="font-bold uppercase">{namaKades}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[14px] text-black">
            
            <div className="text-center mb-8">
              <h6 className="font-bold underline uppercase text-[16px] tracking-wide" style={{ letterSpacing: '1px' }}>
                {(() => {
                  switch (code) {
                    case 'SKM': return 'SURAT KETERANGAN KEMATIAN (SKM)';
                    case 'SKAW': return 'SURAT KETERANGAN AHLI WARIS (SKAW)';
                    case 'SKTM': return 'SURAT KETERANGAN TIDAK MAMPU (SKTM)';
                    case 'SKU': return 'SURAT KETERANGAN USAHA (SKU)';
                    case 'SKBM': return 'SURAT KETERANGAN BELUM PERNAH MENIKAH (SKBM)';
                    case 'SKL': return 'SURAT KETERANGAN KELAHIRAN (SKL)';
                    case 'SPH': return 'SURAT PENGANTAR PINDAH (SPH)';
                    case 'SKPH': return 'SURAT KETERANGAN PENGHASILAN (SKPH)';
                    case 'SKD': return 'SURAT KETERANGAN DOMISILI PERORANGAN (SKD)';
                    case 'SKP': return 'SURAT KETERANGAN PINDAH (SKP)';
                    case 'SKH': return 'SURAT KETERANGAN KEHILANGAN (SKH)';
                    case 'SDU': return 'SURAT KETERANGAN DOMISILI USAHA (SDU)';
                    case 'SPT': return 'SURAT PENGURUSAN TASPEN (SPT)';
                    default: return getFullLetterName(surat.jenis).toUpperCase();
                  }
                })()}
              </h6>
              <p className="text-[14px] font-mono mt-1">Nomor: {surat.nomor}</p>
            </div>

            
            {(() => {
              let leadingParagraph = `Yang bertanda tangan di bawah ini Kepala ${desaName}, ${kecamatanName}, ${kabupatenName}, menerangkan dengan sebenarnya bahwa:`;
              let middleParagraph = `Adalah benar nama tersebut di atas merupakan penduduk ${desaName} yang berdomisili sah pada alamat tersebut. Surat keterangan ini diterbitkan secara resmi untuk memenuhi keperluan:`;
              let trailingParagraph = `Demikian surat keterangan ini kami buat dengan sebenarnya agar dapat dipergunakan dan dipertanggungjawabkan sebagaimana mestinya.`;

              let specificContent = null;

              const fmtDate = (d: string) => {
                if (!d) return '-';
                try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch(e) { return d; }
              };
              
              if (code === 'SKH') {
                return (
                  <>
                    <p className="text-justify leading-relaxed indent-8 mb-2">
                      Yang bertanda tangan di bawah ini Kepala {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')} Kabupaten {kabupatenName.replace(/^(kabupaten|kota)\s+/i, '')}, menerangkan dengan sebenarnya bahwa :
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Nama Lengkap</td><td style={{width: '3%'}}>:</td><td><strong className="uppercase">{name}</strong></td></tr>
                        <tr><td>NIK</td><td>:</td><td>{nik}</td></tr>
                        <tr><td>Tempat, Tanggal lahir</td><td>:</td><td>{birthPlace}, {fmtDate(birthDate)}</td></tr>
                        <tr><td>Jenis Kelamin</td><td>:</td><td>{gender}</td></tr>
                        <tr><td>Agama</td><td>:</td><td>{sd.agama || '-'}</td></tr>
                        <tr><td>Pekerjaan</td><td>:</td><td>{sd.pekerjaan || '-'}</td></tr>
                        <tr><td>Status Perkawinan</td><td>:</td><td>{sd.statusPerkawinan || '-'}</td></tr>
                        <tr><td style={{verticalAlign: 'top'}}>Alamat</td><td style={{verticalAlign: 'top'}}>:</td><td>{address} {rtRw}<br/>Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')}</td></tr>
                      </tbody>
                    </table>
                    
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Berdasarkan keterangan yang bersangkutan, bahwa telah kehilangan surat / barang berharga berupa:
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Barang yang Hilang</td><td style={{width: '3%'}}>:</td><td><strong>{sd.barangHilang || '-'}</strong></td></tr>
                        <tr><td>Tanggal Kehilangan</td><td>:</td><td>{fmtDate(sd.tanggalKehilangan)}</td></tr>
                        <tr><td>Tempat Kehilangan</td><td>:</td><td>{sd.tempatKehilangan || '-'}</td></tr>
                        <tr><td style={{verticalAlign: 'top'}}>Keterangan</td><td style={{verticalAlign: 'top'}}>:</td><td>{sd.keteranganKehilangan || '-'}</td></tr>
                      </tbody>
                    </table>
                    
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Surat Keterangan ini dibuat untuk <strong>{surat.keperluan || '-'}</strong>.
                    </p>
                    <p className="text-justify leading-relaxed indent-8 mb-6">
                      Demikian Surat Keterangan Kehilangan ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.
                    </p>
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const officersList = JSON.parse(localStorage.getItem('village_officers') || '[]'); const found = officersList.find((o: any) => o.name === namaKades); return found?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              }
              

              const DataPenduduk = () => (
                <table className="w-[calc(100%-40px)] border-collapse mb-4 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                  <tbody>
                    <tr><td style={{width: '30%'}}>Nama Lengkap</td><td style={{width: '3%'}}>:</td><td><strong className="uppercase">{name}</strong></td></tr>
                    <tr><td>NIK</td><td>:</td><td>{nik}</td></tr>
                    <tr><td>Tempat, Tanggal lahir</td><td>:</td><td>{birthPlace}, {fmtDate(birthDate)}</td></tr>
                    <tr><td>Jenis Kelamin</td><td>:</td><td>{gender}</td></tr>
                    <tr><td>Agama</td><td>:</td><td>{sd.agama || '-'}</td></tr>
                    <tr><td>Pekerjaan</td><td>:</td><td>{sd.pekerjaan || '-'}</td></tr>
                    <tr><td>Status Perkawinan</td><td>:</td><td>{sd.statusPerkawinan || '-'}</td></tr>
                    <tr><td style={{verticalAlign: 'top'}}>Alamat</td><td style={{verticalAlign: 'top'}}>:</td><td>{address} {rtRw}<br/>Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')}</td></tr>
                  </tbody>
                </table>
              );

              const pembuka = (
                <p className="text-justify leading-relaxed indent-8 mb-2">
                  Yang bertanda tangan di bawah ini Kepala {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')} Kabupaten {kabupatenName.replace(/^(kabupaten|kota)\s+/i, '')}, menerangkan dengan sebenarnya bahwa :
                </p>
              );

              const penutup = (keperluan: string, namaSurat: string) => (
                <>
                  <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                    Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan, untuk dipergunakan sebagai persyaratan administrasi <strong>{keperluan || '-'}</strong>.
                  </p>
                  <p className="text-justify leading-relaxed indent-8 mb-6">
                    Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                  </p>
                </>
              );

              if (code === 'SKD') {
                return (
                  <>
                    <p className="text-justify leading-relaxed indent-8 mb-2">
                      Menerangkan bahwa:
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-4 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>a. Nama</td><td style={{width: '3%'}}>:</td><td><strong className="uppercase">{name}</strong></td></tr>
                        <tr><td>b. NIK</td><td>:</td><td>{nik}</td></tr>
                        <tr><td>c. Jenis Kelamin</td><td>:</td><td>{gender}</td></tr>
                        <tr><td>d. Tempat, Tgl Lahir</td><td>:</td><td>{birthPlace}, {fmtDate(birthDate)}</td></tr>
                        <tr><td>e. Pekerjaan</td><td>:</td><td>{sd.pekerjaan || '-'}</td></tr>
                        <tr><td>f. Kewarganegaraan</td><td>:</td><td>{sd.kewarganegaraan || 'WNI'}</td></tr>
                        <tr><td>g. Status Perkawinan</td><td>:</td><td>{sd.statusPerkawinan || '-'}</td></tr>
                        <tr><td>h. Agama</td><td>:</td><td>{sd.agama || '-'}</td></tr>
                        <tr><td style={{verticalAlign: 'top'}}>i. Alamat</td><td style={{verticalAlign: 'top'}}>:</td><td>{address} {rtRw}<br/>Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')}</td></tr>
                        <tr><td style={{verticalAlign: 'top'}}>j. Alamat Sekarang</td><td style={{verticalAlign: 'top'}}>:</td><td>{sd.alamatSekarang || '-'} RT.{sd.rtSekarang || '-'} RW.{sd.rwSekarang || '-'}<br/>Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')}</td></tr>
                      </tbody>
                    </table>
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Berdasarkan surat pernyataan dan keterangan yang dibuat oleh yang bersangkutan, nama tersebut di atas menyatakan dengan sadar bahwa ia memang berstatus <strong className="uppercase">DOMISILI {sd.sifatDomisili || '-'}</strong> di alamat sekarang tersebut.
                    </p>
                    {penutup(surat.keperluan, 'Domisili')}
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              } else if (code === 'SKP') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Bahwa nama tersebut di atas terhitung mulai tanggal <strong>{fmtDate(sd.tanggalPindah)}</strong> mengajukan permohonan pindah domisili dengan rincian sebagai berikut:
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Alamat Tujuan Pindah</td><td style={{width: '3%'}}>:</td><td>{sd.alamatTujuan || '-'}</td></tr>
                        <tr><td>RT / RW Tujuan</td><td>:</td><td>RT. {sd.rtTujuan || '-'} / RW. {sd.rwTujuan || '-'}</td></tr>
                        <tr><td>Desa / Kelurahan Tujuan</td><td>:</td><td>{sd.desaTujuan || '-'}</td></tr>
                        <tr><td>Kecamatan Tujuan</td><td>:</td><td>{sd.kecamatanTujuan || '-'}</td></tr>
                        <tr><td>Kabupaten / Kota Tujuan</td><td>:</td><td>{sd.kabupatenTujuan || '-'}</td></tr>
                        <tr><td>Provinsi Tujuan</td><td>:</td><td>{sd.provinsiTujuan || '-'}</td></tr>
                        <tr><td>Alasan Pindah</td><td>:</td><td><strong>{sd.alasanPindah || '-'}</strong></td></tr>
                        <tr><td>Jml Keluarga Pindah</td><td>:</td><td>{sd.jumlahKeluargaPindah || '0'} Orang</td></tr>
                      </tbody>
                    </table>
                    {penutup(surat.keperluan, 'Pengantar Pindah')}
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              } else if (code === 'SKM') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Nama tersebut di atas adalah benar-benar penduduk Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')}, yang mana berdasarkan laporan dan kesaksian dari pihak keluarga, yang bersangkutan telah meninggal dunia pada:
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Hari</td><td style={{width: '3%'}}>:</td><td>{sd.hariMeninggal || '-'}</td></tr>
                        <tr><td>Tanggal</td><td>:</td><td>{fmtDate(sd.tanggalMeninggal)}</td></tr>
                        <tr><td>Pukul</td><td>:</td><td>{sd.pukulMeninggal || '-'}</td></tr>
                        <tr><td>Tempat</td><td>:</td><td>{sd.tempatMeninggal || '-'}</td></tr>
                        <tr><td>Penyebab Kematian</td><td>:</td><td>{sd.penyebabMeninggal || '-'}</td></tr>
                      </tbody>
                    </table>
                    {penutup(surat.keperluan, 'Kematian')}
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              } else if (code === 'SKAW') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Menyatakan dengan sesungguhnya bahwa nama warga di atas adalah <strong>ahli waris sah</strong> yang diakui secara adat dan administrasi hukum dari garis keturunan almarhum pewaris sah.
                    </p>
                    {penutup(surat.keperluan, 'Ahli Waris')}
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              } else if (code === 'SKTM') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Nama tersebut di atas adalah benar-benar warga / penduduk yang berdomisili di Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')} dan yang bersangkutan benar-benar tergolong keluarga <strong className="italic">Kurang Mampu (Miskin)</strong>.
                    </p>
                    {penutup(surat.keperluan, 'Tidak Mampu')}
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              } else if (code === 'SKU') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Adalah benar nama tersebut di atas merupakan warga kami yang berdomisili sah di Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')}, dan berdasarkan peninjauan kami memang benar memiliki dan aktif mengelola unit usaha perorangan mandiri dengan rincian detail sebagai berikut :
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Nama Usaha / Toko</td><td style={{width: '3%'}}>:</td><td><strong className="uppercase">{sd.usahaName || 'WARUNG / TOKO PERORANGAN'}</strong></td></tr>
                        <tr><td>Jenis / Bidang Usaha</td><td>:</td><td>{sd.usahaJenis || '-'}</td></tr>
                        <tr><td>Alamat Lokasi Usaha</td><td>:</td><td>{sd.usahaAlamat || address}</td></tr>
                        <tr><td>Mulai Berdiri Sejak</td><td>:</td><td>{sd.usahaMulai || '-'}</td></tr>
                        {sd.usahaNib && <tr><td>NIB / Izin Usaha</td><td>:</td><td className="font-mono font-bold">{sd.usahaNib}</td></tr>}
                        {sd.usahaOmzet && <tr><td>Estimasi Omset Bulanan</td><td>:</td><td>{sd.usahaOmzet}</td></tr>}
                      </tbody>
                    </table>
                    {penutup(surat.keperluan, 'Usaha')}
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              } else if (code === 'SKBM') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Berdasarkan data kependudukan kami, nama tersebut di atas benar berstatus <strong>Belum Kawin (Belum Pernah Menikah)</strong>. Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai persyaratan administrasi <strong>{surat.keperluan || '-'}</strong>.
                    </p>
                    <p className="text-justify leading-relaxed indent-8 mb-6 mt-4">
                      Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
                    </p>
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              } else if (code === 'SKL') {
                return (
                  <>
                    <p className="text-justify leading-relaxed indent-8 mb-2">
                      Yang bertanda tangan di bawah ini Kepala {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')}, menerangkan bahwa dari pasangan warga kami telah lahir seorang anak dengan identitas kependudukan terlampir di bawah ini. Adapun orang tua anak tersebut adalah:
                    </p>
                    <DataPenduduk />
                    {penutup(surat.keperluan, 'Kelahiran')}
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              } else if (code === 'SPH') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Nama tersebut di atas adalah benar-benar penduduk Desa {desaName.replace(/desa|kelurahan/gi, '').trim()} Kecamatan {kecamatanName.replace(/^kecamatan\s+/i, '')}, yang mana yang bersangkutan mengajukan permohonan pindah domisili dengan rincian sebagai berikut:
                    </p>
                    <table className="w-[calc(100%-40px)] border-collapse mb-2 ml-10 text-[14px]" style={{lineHeight: 1.3}}>
                      <tbody>
                        <tr><td style={{width: '30%'}}>Tanggal Pindah</td><td style={{width: '3%'}}>:</td><td>{fmtDate(sd.tanggalPindah)}</td></tr>
                        <tr><td>Alasan Pindah</td><td>:</td><td>{sd.alasanPindah || '-'}</td></tr>
                        <tr><td style={{verticalAlign: 'top'}}>Alamat Tujuan</td><td style={{verticalAlign: 'top'}}>:</td><td>{sd.alamatTujuan || '-'} RT.{sd.rtTujuan || '-'} RW.{sd.rwTujuan || '-'}<br/>Desa {sd.desaTujuan || '-'} Kecamatan {sd.kecamatanTujuan || '-'}<br/>Kab. {sd.kabupatenTujuan || '-'} Prov. {sd.provinsiTujuan || '-'}</td></tr>
                      </tbody>
                    </table>
                    {penutup(surat.keperluan, 'Pengantar Pindah')}
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              } else if (code === 'SKPH') {
                return (
                  <>
                    {pembuka}
                    <DataPenduduk />
                    <p className="text-justify leading-relaxed indent-8 mb-2 mt-4">
                      Adalah benar nama tersebut di atas merupakan warga kami yang berdomisili sah di Desa {desaName.replace(/desa|kelurahan/gi, '').trim()}, dan berdasarkan data/pengakuan yang bersangkutan memiliki rincian penghasilan bulanan yang sah dengan rata-rata sebesar <strong>Rp {sd.penghasilan || '-'}</strong> per bulan.
                    </p>
                    {penutup(surat.keperluan, 'Penghasilan')}
                    {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                  </>
                );
              }

              return (
                <>
                  {pembuka}
                  <DataPenduduk />
                  {penutup(surat.keperluan, surat.jenis)}
                  {renderReactSignature(desaName, surat.tanggal, namaKades, 'Kepala Desa', (() => { try { const ol = JSON.parse(localStorage.getItem('village_officers') || '[]'); return ol.find((o: any) => o.name === namaKades)?.nip || '-'; } catch(e) { return '-'; } })(), sd.includeCamat)}
                </>
              );
            })()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="admin-surat-dashboard-root" className="space-y-6">
      {/* Dynamic single A4 printing stylesheet */}
      {isPrintingSingle && (
        <style type="text/css" media="print">
          {`
            @media print {
              @page {
                size: A4 portrait;
                margin: 20mm 20mm 25mm 20mm !important; /* Proper safe margins (Top, Right, Bottom, Left) */
              }
              body {
                margin: 0 !important;
                padding: 0 !important;
                position: relative;
                min-height: 100vh;
                background-color: white !important;
              }
              /* Hide all dashboard UI elements */
              aside, header, nav, .tour-container, #hubungi-bantuan-btn {
                display: none !important;
              }
              /* Hide dashboard root except for printable container */
              #admin-surat-dashboard-root > *:not(#single-letter-print-container-wrapper) {
                display: none !important;
              }
              
              /* Reset structural layouts to allow natural document flow */
              html, body, #root, .flex, main, .p-4, .md\\:p-6, .lg\\:p-8, .max-w-6xl {
                position: static !important;
                display: block !important;
                height: auto !important;
                min-height: 100vh !important;
                overflow: visible !important;
                padding: 0 !important;
                box-shadow: none !important;
                background: white !important;
              }
              
              #single-letter-print-container-wrapper.printable-area {
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 0 !important; /* Managed by @page margin */
                box-shadow: none !important;
                border: none !important;
              }

              #global-print-footer {
                display: block !important;
                position: fixed !important;
                bottom: -15mm !important; /* Positioned perfectly in the bottom margin space */
                left: 0 !important;
                right: 0 !important;
                text-align: right !important;
                font-size: 8pt !important;
                color: #94a3b8 !important;
                z-index: 1000 !important;
                visibility: visible !important;
              }
              #global-print-footer * {
                visibility: visible !important;
              }
            }
            @media screen {
              #global-print-footer {
                display: none !important;
              }
            }
          `}
        </style>
      )}

      {/* Dynamic table landscape printing stylesheet */}
      {isPrintingTable && (
        <style type="text/css" media="print">
          {`
            @media print {
              @page { 
                size: A4 landscape; 
                margin: 20mm 20mm 18mm 20mm !important;
              }
              /* 1. Hide sidebar, header, non-print elements */
              aside, header, .no-print, [role="navigation"], .admin-sidebar, .admin-header, footer, .tour-container, #hubungi-bantuan-btn {
                display: none !important;
              }
              
              /* 2. Hide everything except printable table area */
              #admin-surat-dashboard-root > *:not(.printable-table-area) {
                display: none !important;
              }

              /* 3. Strip layout constraints dari semua ancestor */
              html, body, #root, 
              #root > div, 
              #root > div > div, 
              main, 
              main > div, 
              main > div > div,
              .max-w-6xl,
              #admin-surat-dashboard-root {
                position: static !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                min-height: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
              }

              body {
                margin: 0 !important;
                padding: 0 !important;
                background-color: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              body * {
                visibility: hidden !important;
              }
              
              .printable-table-area, .printable-table-area * {
                visibility: visible !important;
              }
              
              /* Padding dalam area cetak agar tabel tidak mepet tepi */
              .printable-table-area {
                position: static !important;
                display: block !important;
                width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0 !important;
                padding: 8mm 12mm 16mm 12mm !important;
                box-sizing: border-box !important;
                background-color: white !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
              }
              .printable-table-content {
                overflow: visible !important;
                width: 100% !important;
              }
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                font-size: 10.5px !important;
                margin-top: 12px !important;
              }
              thead {
                display: table-header-group !important;
              }
              th, td {
                border: 1px solid #cbd5e1 !important;
                padding: 7px 10px !important;
                text-align: left !important;
                color: #1e293b !important;
              }
              th {
                background-color: #f8fafc !important;
                font-weight: 700 !important;
                color: #0f172a !important;
                border-bottom: 2px solid #94a3b8 !important;
              }
              tr {
                page-break-inside: avoid !important;
              }
              .print\\:hidden {
                display: none !important;
              }

              /* ── Global Footer: 1 garis pemisah + 1 baris teks, pojok kiri bawah ── */
              #global-print-footer {
                display: block !important;
                position: fixed !important;
                bottom: 4mm !important;
                left: 20mm !important;
                right: 20mm !important;
                visibility: visible !important;
                text-align: left !important;
                font-size: 7pt !important;
                color: #94a3b8 !important;
                z-index: 9999 !important;
                padding-top: 0 !important;
                background: white !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                line-height: 1.4 !important;
              }
              #global-print-footer * {
                visibility: visible !important;
                text-align: left !important;
                color: #94a3b8 !important;
                font-size: 7pt !important;
                white-space: nowrap !important;
              }
              /* Sembunyikan elemen footer kecuali baris pertama */
              #global-print-footer > *:not(:first-child) {
                display: none !important;
              }
            }
            @media screen {
              #global-print-footer {
                display: none !important;
              }
            }
          `}
        </style>
      )}

      {showPrintWarning && (
        <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800 flex items-center justify-between">
          <span><span className="font-bold">Perhatian:</span> Fitur cetak mungkin diblokir oleh browser saat di dalam mode preview. Untuk mencetak, silakan buka aplikasi ini di tab baru (Open in New Tab).</span>
          <button onClick={() => setShowPrintWarning(false)} className="text-yellow-600 hover:text-yellow-800 font-bold px-2">&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-16 z-40 bg-slate-50/60 backdrop-blur-xl pb-4 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 border-b border-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Arsip Surat</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola dan lihat riwayat surat yang telah diterbitkan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleExportExcel}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button 
            onClick={() => setShowPrintModal(true)}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak Daftar
          </button>
          <button 
            onClick={onBuatSurat}
            className="bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-800 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Buat Surat Baru
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder="Cari nomor surat atau nama..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm outline-none transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-1 md:flex-none cursor-pointer"
          >
            <option value="">Semua Jenis Surat</option>
            <option value="domisili">Domisili</option>
            <option value="sktm">SKTM</option>
            <option value="sku">Keterangan Usaha</option>
            <option value="skph">Keterangan Penghasilan</option>
            <option value="spt">Pengurusan Taspen (SPT)</option>
          </select>
          <button 
            onClick={() => {
              setSearchQuery('');
              setSelectedType('');
            }}
            className={`p-2.5 border rounded-xl transition-colors ${
              searchQuery || selectedType
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'
            }`}
            title="Reset Pencarian & Filter"
          >
            {searchQuery || selectedType ? (
              <Filter className="w-4 h-4" />
            ) : (
              <FilterX className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Bulk Delete Action Banner */}
      {selectedSuratIds.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-red-800">
              {selectedSuratIds.length} surat terpilih
            </span>
            <button 
              onClick={() => setSelectedSuratIds([])}
              className="text-xs text-red-600 hover:underline font-bold"
            >
              Batal Pilihan
            </button>
          </div>
          <button 
            onClick={() => setShowBulkDeleteModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Masal
          </button>
        </div>
      )}

      {showPrintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Cetak Daftar Arsip</h3>
              <button onClick={() => setShowPrintModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1.5">Dari Tanggal</label>
                <input type="date" value={printStartDate} onChange={(e) => setPrintStartDate(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 block mb-1.5">Sampai Tanggal</label>
                <input type="date" value={printEndDate} onChange={(e) => setPrintEndDate(e.target.value)} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <p className="text-xs text-gray-500">* Kosongkan tanggal jika ingin mencetak semua data.</p>
            </div>

            {/* Panduan Cetak Singkat */}
            <div className="mx-6 mb-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-start gap-2.5">
                <span className="text-blue-500 mt-0.5 text-base">💡</span>
                <div>
                  <p className="text-xs font-bold text-blue-700 mb-2">Tips untuk Hasil Cetak Terbaik</p>
                  <ol className="text-xs text-blue-600 space-y-1.5 list-none">
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                      <span>Gunakan browser <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                      <span>Pilih ukuran kertas <strong>A4</strong> di dialog cetak</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                      <span>Aktifkan <strong>Background graphics</strong> agar warna header tercetak</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-200 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                      <span>Cetak dari <strong>laptop/PC</strong> untuk hasil terbaik</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowPrintModal(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-xl">Batal</button>
              <button onClick={handlePrintAll} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm">
                <Printer className="w-4 h-4" /> Cetak Sekarang
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Table */}
      <div ref={componentRef} className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${isPrintingTable ? 'printable-table-area' : ''}`}>
        <div className={`overflow-x-auto ${isPrintingTable ? 'printable-table-content' : ''}`}>
          {/* Official Kop Surat on printed list */}
          {isPrintingTable && (
            <div className="hidden print:block mb-8 text-center text-black">
              <h1 className="text-xl font-black tracking-wider uppercase text-black">
                DAFTAR NOMOR SURAT
              </h1>
              <p className="text-sm font-bold uppercase tracking-wide text-gray-800 mt-1">
                DESA {kopSettings.desa.toUpperCase()}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mt-0.5 border-b-2 border-black pb-4 inline-block w-full">
                KECAMATAN {kopSettings.kecamatan.toUpperCase()}
              </p>
            </div>
          )}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 w-12 text-center print:hidden">
                  <input 
                    type="checkbox"
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                    checked={filteredSurat.length > 0 && filteredSurat.every(s => selectedSuratIds.includes(s.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const newIds = filteredSurat.map(s => s.id);
                        setSelectedSuratIds(prev => Array.from(new Set([...prev, ...newIds])));
                      } else {
                        const filteredIds = filteredSurat.map(s => s.id);
                        setSelectedSuratIds(prev => prev.filter(id => !filteredIds.includes(id)));
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nomor Surat</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Jenis Surat</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Pemohon</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Keperluan</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSurat.length > 0 ? (
                filteredSurat.map((surat) => {
                  const isCancelled = surat.status === 'Dibatalkan';
                  return (
                  <tr key={surat.id} className={`hover:bg-gray-50/80 transition-colors group ${isCancelled ? 'opacity-70 bg-gray-50' : ''}`}>
                    <td className="px-6 py-4 print:hidden text-center">
                      <input 
                        type="checkbox"
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                        checked={selectedSuratIds.includes(surat.id)}
                        onChange={() => {
                          setSelectedSuratIds(prev => 
                            prev.includes(surat.id)
                              ? prev.filter(id => id !== surat.id)
                              : [...prev, surat.id]
                          );
                        }}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                        <span className={isCancelled ? 'line-through text-gray-500' : ''}>{surat.nomor}</span>
                        {isCancelled && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">DIBATALKAN</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">{getFullLetterName(surat.jenis)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{surat.nama}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-[200px] truncate" title={surat.keperluan || '-'}>
                      {surat.keperluan || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {surat.tanggal}
                    </td>
                    <td className="px-6 py-4 print:hidden text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => setSelectedSurat(surat)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded-lg transition-colors" 
                          title="Lihat Detail Surat"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {!isCancelled && (
                          <>
                            <button 
                              onClick={() => onEditLetter?.(surat)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 hover:text-amber-800 rounded-lg transition-colors" 
                              title="Edit Isi Surat"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => setSuratToCancel(surat)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 hover:text-orange-800 rounded-lg transition-colors" 
                              title="Batalkan Surat"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => setSuratToDelete(surat)}
                          className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800 rounded-lg transition-colors" 
                          title="Hapus Surat Dari Arsip"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );})
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Tidak ada data surat yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Centralized SaaS Footer for List Printing */}
        {isPrintingTable && (
          <div 
            id="global-print-footer"
            dangerouslySetInnerHTML={{ __html: SAAS_CONFIG.globalFooterHTML }}
          />
        )}
      </div>

      {/* Detail Viewer Modal */}
      {selectedSurat && !isPrintingSingle && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-gray-100 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Detail Arsip Surat</h3>
                <p className="text-xs text-gray-500 mt-0.5">Melihat dokumen resmi yang telah diterbitkan</p>
              </div>
              <button 
                onClick={() => setSelectedSurat(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

             {/* Content & Sidebar */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Paper Preview Area */}
              <div className="flex-1 bg-gray-200/80 p-6 overflow-auto no-scrollbar flex justify-center items-start min-h-[400px] relative">
                {/* Floating Document Zoom Controls */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl p-1.5 flex items-center gap-1 z-30">
                  <button 
                    onClick={() => setZoomLevel(prev => Math.max(0.3, prev - 0.1))} 
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-emerald-700 transition-colors"
                    title="Perkecil (Zoom Out)"
                  >
                    <ZoomOut className="w-4.5 h-4.5" />
                  </button>
                  <span className="text-xs font-bold text-gray-700 min-w-[50px] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button 
                    onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))} 
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-emerald-700 transition-colors"
                    title="Perbesar (Zoom In)"
                  >
                    <ZoomIn className="w-4.5 h-4.5" />
                  </button>
                  <div className="w-px h-4 bg-gray-200 mx-1"></div>
                  <button 
                    onClick={() => setZoomLevel(0.65)} 
                    className="px-2 py-1 hover:bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600 hover:text-emerald-700 transition-colors"
                    title="Sesuaikan Halaman (Fit)"
                  >
                    Fit
                  </button>
                  <button 
                    onClick={() => setZoomLevel(1.0)} 
                    className="px-2 py-1 hover:bg-gray-100 rounded-lg text-[10px] font-bold text-gray-600 hover:text-emerald-700 transition-colors"
                    title="Ukuran Asli (100%)"
                  >
                    100%
                  </button>
                </div>

                <div 
                  className="bg-white shadow-lg border border-gray-300 p-12 text-black transition-all shrink-0 origin-top relative"
                  style={{
                    width: '794px',
                    minHeight: '1123px',
                    transform: `scale(${zoomLevel})`,
                    marginBottom: `${(zoomLevel - 1) * 1123}px`,
                    marginRight: zoomLevel > 1 ? `${(zoomLevel - 1) * 794}px` : '0px',
                    marginLeft: zoomLevel > 1 ? `${(zoomLevel - 1) * 794}px` : '0px',
                  }}
                >
                  {renderLetterContent(selectedSurat, activeResident)}
                  {/* Global Print Footer */}
                  <div 
                    className="absolute bottom-[8mm] left-[15mm] right-[15mm] w-[calc(100%-30mm)]"
                    dangerouslySetInnerHTML={{ 
                      __html: SAAS_CONFIG.globalFooterHTML
                    }} 
                  />
                </div>
              </div>

              {/* Sidebar Controls */}
              <div className="w-full md:w-64 bg-white p-6 border-t md:border-t-0 md:border-l border-gray-200 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Metadata Surat</h4>
                    <div className="space-y-3 text-sm text-gray-700">
                      <div>
                        <span className="text-gray-400 block text-xs">Nomor Surat</span>
                        <span className="font-mono font-bold text-gray-900 break-all">{selectedSurat.nomor}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-xs">Jenis Surat</span>
                        <span className="font-semibold text-gray-900">{getFullLetterName(selectedSurat.jenis)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-xs">Pemohon</span>
                        <span className="font-semibold text-emerald-800">{selectedSurat.nama}</span>
                      </div>
                      {selectedSurat.nik && (
                        <div>
                          <span className="text-gray-400 block text-xs">NIK Pemohon</span>
                          <span className="font-mono text-gray-900">{selectedSurat.nik}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400 block text-xs">Tanggal Terbit</span>
                        <span className="text-gray-900">{selectedSurat.tanggal}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mt-6">
                  {!selectedSurat.status || selectedSurat.status !== 'Dibatalkan' ? (
                    <button 
                      onClick={() => triggerSinglePrint(selectedSurat)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-emerald-800 transition-all"
                    >
                      <Printer className="w-4 h-4" /> Cetak Surat
                    </button>
                  ) : (
                    <div className="w-full text-center py-2.5 bg-red-50 text-red-700 rounded-xl text-sm font-bold border border-red-100">
                      Surat Dibatalkan
                    </div>
                  )}
                  <button 
                    onClick={() => setSuratToDelete(selectedSurat)}
                    className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-xl text-sm font-bold transition-all"
                  >
                    <Trash2 className="w-4 h-4" /> Hapus Arsip
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {suratToCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
              <Ban className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Konfirmasi Batalkan Surat</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Apakah Anda yakin ingin membatalkan surat nomor <span className="font-mono font-bold text-orange-600 break-all">{suratToCancel.nomor}</span>? Surat akan tetap tercatat di arsip namun tidak dapat diedit atau dicetak lagi.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setSuratToCancel(null)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-all"
              >
                Kembali
              </button>
              <button 
                onClick={handleCancelSurat}
                className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {suratToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Konfirmasi Hapus Arsip Surat</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus arsip surat nomor <span className="font-mono font-bold text-red-600 break-all">{suratToDelete.nomor}</span>? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setSuratToDelete(null)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleDeleteSurat}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Konfirmasi Hapus Masal</h3>
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                Apakah Anda yakin ingin menghapus <span className="font-bold text-red-600">{selectedSuratIds.length}</span> arsip surat yang terpilih? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-700 transition-all"
              >
                Batal
              </button>
              <button 
                onClick={handleBulkDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                Ya, Hapus Masal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden print container for printing a single letter in full resolution */}
      {selectedSurat && (
        <div id="single-letter-print-container-wrapper" className="hidden print:block bg-white text-black p-12 printable-area" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '794px', minHeight: '1123px' }}>
          {renderLetterContent(selectedSurat, activeResident)}
          {isPrintingSingle && (
            <div 
              id="global-print-footer"
              dangerouslySetInnerHTML={{ __html: SAAS_CONFIG.globalFooterHTML }}
            />
          )}
        </div>
      )}

    </div>
  );
}
