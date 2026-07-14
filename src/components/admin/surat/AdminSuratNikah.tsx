import { fetchResidentsCached } from '../../../utils/apiCache';
import { useLetterDescription } from '../../../hooks/useLetterDescription';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PrintSuccessDialog from './PrintSuccessDialog';
import { ArrowLeft, Save, Printer, Download, Upload, Trash2, History, Heart, ZoomIn, ZoomOut, CheckCircle2, FileText } from 'lucide-react';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { getLetterClassifications, saveLetterClassifications, incrementSequenceNumber, generateLetterNumber } from '../../../utils/letterClassifications';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { useDragScroll } from '../../../hooks/useDragScroll';

export default function AdminSuratNikah({ 
  onBack, 
  presetResident,
  editData,
  editLetterId
}: { 
  onBack: () => void, 
  presetResident?: any,
  editData?: any,
  editLetterId?: string | null
}) {
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const [activeDoc, setActiveDoc] = useState('n1');
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [residents, setResidents] = useState<any[]>([]);
  const [isLoadingResidents, setIsLoadingResidents] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(0.45);
  const dragProps = useDragScroll();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const letterFont = localStorage.getItem('village_letter_font') || 'Arial, sans-serif';

  // Prefill in edit mode
  useEffect(() => {
    if (editData) {
      setFormData(editData);
    }
  }, [editData]);

  // Default state from localStorage (village profile)
  const defaultDesa = localStorage.getItem('kop_desa') || 'Wasah Hilir';
  const defaultKecamatan = localStorage.getItem('kop_kecamatan') || 'Simpur';
  const defaultKabupaten = localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan';
  const defaultKUA = 'KUA Kecamatan ' + defaultKecamatan;
  const defaultAlamat = localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261';
  const defaultKontak = localStorage.getItem('kop_kontak') || '081346867519 | pemdesawasahhilir@gmail.com';
  const defaultPejabat = localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD';
  const defaultJabatan = localStorage.getItem('kop_jabatan') || 'Kepala Desa';

  const [formData, setFormData] = useState<any>({
    isWargaSuami: true, // true: Suami warga kita, false: Istri warga kita
    namaDesa: defaultDesa,
    namaKecamatan: defaultKecamatan,
    namaKabupaten: defaultKabupaten,
    namaKUA: defaultKUA,
    alamatKantor: defaultAlamat,
    kontakKantor: defaultKontak,
    namaPejabat: defaultPejabat,
    jabatanPejabat: defaultJabatan,

    nomorSurat: '',
    tanggalSurat: new Date().toISOString().split('T')[0],
    tanggalMenikah: '',
    hariMenikah: '',
    jamMenikah: '',
    tempatMenikah: '',

    noKKSuami: '',
    nikSuami: '',
    namaSuami: '',
    agamaSuami: 'Islam',
    pekerjaanSuami: '',
    pendidikanSuami: '',

    noKKIstri: '',
    nikIstri: '',
    namaIstri: '',
    agamaIstri: 'Islam',
    pekerjaanIstri: '',
    pendidikanIstri: '',

    namaAyahSuami: '', nikAyahSuami: '', tempatLahirAyahSuami: '', tanggalLahirAyahSuami: '', agamaAyahSuami: 'Islam', pekerjaanAyahSuami: '', alamatOrtuSuami: '',
    namaIbuSuami: '', nikIbuSuami: '', tempatLahirIbuSuami: '', tanggalLahirIbuSuami: '', agamaIbuSuami: 'Islam', pekerjaanIbuSuami: '',
    
    namaAyahIstri: '', nikAyahIstri: '', tempatLahirAyahIstri: '', tanggalLahirAyahIstri: '', agamaAyahIstri: 'Islam', pekerjaanAyahIstri: '', alamatOrtuIstri: '',
    namaIbuIstri: '', nikIbuIstri: '', tempatLahirIbuIstri: '', tanggalLahirIbuIstri: '', agamaIbuIstri: 'Islam', pekerjaanIbuIstri: '',

    kewarganegaraanSuami: 'Indonesia',
    statusSuami: 'Jejaka',
    kewarganegaraanIstri: 'Indonesia',
    statusIstri: 'Perawan',
    hubunganWali: 'Ayah Kandung',
  });

  const STEPS = [
    { n: 1, label: 'Mempelai (Warga Desa)' },
    { n: 2, label: 'Data Pasangan' },
    { n: 3, label: 'Data Orang Tua' },
    { n: 4, label: 'Wali & Pejabat' },
    { n: 5, label: 'Preview & Cetak' },
  ];

  const REQUIRED: Record<number, string[]> = {
    1: ['nomorSurat', 'tanggalSurat', 'tanggalMenikah'],
    2: ['namaSuami', 'nikSuami', 'namaIstri', 'nikIstri'],
    3: ['namaAyahSuami', 'namaIbuSuami', 'namaAyahIstri', 'namaIbuIstri'],
    4: ['namaPejabat'],
  };

  const NIK_FIELDS = ['nikSuami', 'nikIstri', 'nikAyahSuami', 'nikIbuSuami', 'nikAyahIstri', 'nikIbuIstri'];
  const RELIGION_OPTIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Budha', 'Konghucu'];

  const PEKERJAAN_OPTIONS = [
    'Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 'Pensiunan',
    'Pegawai Negeri Sipil (PNS)', 'Tentara Nasional Indonesia (TNI)', 'Kepolisian RI (POLRI)', 'Perangkat Desa',
    'Karyawan BUMN/BUMD', 'Karyawan Swasta', 'Buruh Harian Lepas',
    'Petani/Pekebun', 'Peternak', 'Nelayan/Perikanan',
    'Wiraswasta', 'Pedagang', 'Sopir/Ojek', 'Tukang (Kayu/Batu/Las/Jahit, dll)',
    'Guru', 'Dosen', 'Dokter', 'Bidan/Perawat',
    'Wartawan', 'Ustadz/Mubaligh/Penceramah', 'Seniman', 'Konsultan/Profesional Lainnya',
    'Lainnya'
  ];

  const PENDIDIKAN_OPTIONS = [
    'Tidak/Belum Sekolah',
    'SD / Sederajat',
    'SMP / Sederajat',
    'SMA / Sederajat',
    'Diploma (D1/D2/D3)',
    'Sarjana (S1)',
    'Pascasarjana (S2/S3)'
  ];

  const DOC_TABS = [
    { id: 'n1', label: `N1 - Pengantar (${formData.isWargaSuami ? 'Suami' : 'Istri'})` },
    { id: 'biodata_suami', label: 'Biodata Suami' },
    { id: 'biodata_istri', label: 'Biodata Istri' },
    { id: 'n2', label: 'N2 - Permohonan KUA' },
    { id: 'n3', label: 'N3 - Persetujuan' },
    { id: 'n4_suami', label: 'N4 - Izin Ortu Suami' },
    { id: 'n4_istri', label: 'N4 - Izin Ortu Istri' },
  ];

  const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    if (NIK_FIELDS.includes(name)) {
      newValue = value.replace(/\D/g, '').substring(0, 16);
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };
      if (name === 'tanggalMenikah') {
        if (newValue) {
          const d = new Date(newValue);
          updated.hariMenikah = HARI[d.getDay()];
        } else {
          updated.hariMenikah = '';
        }
      }
      return updated;
    });
  };

  const isStepComplete = (n: number) => {
    const req = REQUIRED[n] || [];
    return req.every(f => {
      const val = formData[f];
      if (!val || String(val).trim() === '') return false;
      if (NIK_FIELDS.includes(f)) return val.length === 16;
      return true;
    });
  };

  const v = (val: any, fallback?: string) => (val && String(val).trim() !== '') ? val : (fallback ?? '..............................');
  
  const fmtTgl = (iso: string) => {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return null;
      return d.getDate() + ' ' + BULAN[d.getMonth() + 1] + ' ' + d.getFullYear();
    } catch (e) {
      return null;
    }
  };
  
  const ttl = (tempat: string, iso: string) => {
    const t = fmtTgl(iso);
    if (!tempat && !t) return '..............................';
    return v(tempat, '.....') + ', ' + (t || '.....');
  };

  const saveToRiwayat = () => {
    const id = 'RWY-' + Date.now();
    const entry = { id, savedAt: new Date().toISOString(), data: JSON.parse(JSON.stringify(formData)) };
    const newRiwayat = [entry, ...riwayat];
    setRiwayat(newRiwayat);
    localStorage.setItem('riwayat_surat_nikah', JSON.stringify(newRiwayat));
    
    const updatedFields = {
      nomor: formData.nomorSurat || 'SKN/---',
      nik: formData.nikSuami || formData.nikIstri || '',
      nama: (formData.namaSuami || '') + ' & ' + (formData.namaIstri || ''),
      keperluan: 'Persyaratan Nikah',
      data: formData
    };

    if (editLetterId) {
      updateLetterHistory(editLetterId, updatedFields);
    } else {
      addLetterHistory({
        ...updatedFields,
        jenis: 'Surat Pengantar Nikah',
        tanggal: fmtTgl(formData.tanggalSurat) || new Date().toISOString().split('T')[0],
        status: 'Selesai'
      });
    }
    
    showToast('Tersimpan di riwayat!', 'success');
  };

  useEffect(() => {
    fetchResidentsCached()
      .then(res => res.json())
      .then(data => setResidents(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error loading residents:", err));

    const saved = localStorage.getItem('riwayat_surat_nikah');
    if (saved) {
      try {
        setRiwayat(JSON.parse(saved));
      } catch(e) {}
    }

    // Auto-generate letter number for SKN
    if (!formData.nomorSurat && !editData) {
      const configs = getLetterClassifications();
      const sknConfig = configs.find(c => c.klasifikasi === 'SKN') || { id: 'fallback_skn', jenis: 'SURAT PENGANTAR NIKAH', klasifikasi: 'SKN', kodeKlasifikasi: '474', noUrutTerakhir: 0 };
      const generatedNo = generateLetterNumber(sknConfig.klasifikasi, sknConfig.kodeKlasifikasi || '474');
      setFormData(prev => ({ ...prev, nomorSurat: generatedNo }));
    }

    // Pre-fill data if presetResident is provided
    if (presetResident) {
      handleSelectResident(presetResident);
    }
  }, []);

  // Listen to live village settings and officer changes
  useEffect(() => {
    const handleSettingsUpdate = () => {
      const activeDesa = localStorage.getItem('kop_desa') || 'Wasah Hilir';
      const activeKecamatan = localStorage.getItem('kop_kecamatan') || 'Simpur';
      const activeKabupaten = localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan';
      const activeAlamat = localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261';
      const activeKontak = localStorage.getItem('kop_kontak') || '081346867519 | pemdesawasahhilir@gmail.com';
      const activePejabat = localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD';
      
      let activeJabatan = 'Kepala Desa';
      try {
        const stored = localStorage.getItem('village_officers');
        if (stored) {
          const list = JSON.parse(stored);
          const found = list.find((o: any) => o.name === activePejabat);
          if (found) {
            activeJabatan = found.role;
          }
        }
      } catch (e) {}

      setFormData(prev => ({
        ...prev,
        namaDesa: activeDesa,
        namaKecamatan: activeKecamatan,
        namaKabupaten: activeKabupaten,
        alamatKantor: activeAlamat,
        kontakKantor: activeKontak,
        namaPejabat: prev.namaPejabat || activePejabat,
        jabatanPejabat: prev.jabatanPejabat || activeJabatan,
      }));
    };

    window.addEventListener('village_settings_updated', handleSettingsUpdate);
    handleSettingsUpdate();

    return () => {
      window.removeEventListener('village_settings_updated', handleSettingsUpdate);
    };
  }, []);

  const handleSelectResident = (res: any) => {
    const isMale = res.gender === 'Laki-laki' || res.gender === 'L';
    setFormData(prev => ({
      ...prev,
      isWargaSuami: isMale,
      namaSuami: isMale ? res.name : prev.namaSuami,
      nikSuami: isMale ? res.nik : prev.nikSuami,
      noKKSuami: isMale ? (res.noKk || res.no_kk || '') : prev.noKKSuami,
      tempatLahirSuami: isMale ? res.birthPlace : prev.tempatLahirSuami,
      tanggalLahirSuami: isMale ? res.birthDate : prev.tanggalLahirSuami,
      agamaSuami: isMale ? (res.religion || 'Islam') : prev.agamaSuami,
      pekerjaanSuami: isMale ? (res.job || '') : prev.pekerjaanSuami,
      pendidikanSuami: isMale ? (res.education || '') : prev.pendidikanSuami,
      alamatSuami: isMale ? (res.address || '') : prev.alamatSuami,

      namaIstri: !isMale ? res.name : prev.namaIstri,
      nikIstri: !isMale ? res.nik : prev.nikIstri,
      noKKIstri: !isMale ? (res.noKk || res.no_kk || '') : prev.noKKIstri,
      tempatLahirIstri: !isMale ? res.birthPlace : prev.tempatLahirIstri,
      tanggalLahirIstri: !isMale ? res.birthDate : prev.tanggalLahirIstri,
      agamaIstri: !isMale ? (res.religion || 'Islam') : prev.agamaIstri,
      pekerjaanIstri: !isMale ? (res.job || '') : prev.pekerjaanIstri,
      pendidikanIstri: !isMale ? (res.education || '') : prev.pendidikanIstri,
      alamatIstri: !isMale ? (res.address || '') : prev.alamatIstri,
    }));
    setSearchQuery('');
  };

  const handlePrint = async () => {
    if ((!formData.namaSuami || !formData.namaSuami.trim()) && (!formData.namaIstri || !formData.namaIstri.trim())) {
      showToast("Mohon lengkapi setidaknya salah satu Nama Calon Suami/Istri terlebih dahulu sebelum mencetak surat.", 'error');
      return;
    }
    // Increment sequence number for SKN
    incrementSequenceNumber('SKN');

    // Auto-save resident data if they are ours
    const updateResidentData = async (nik: string, data: any) => {
      if (!nik || nik === '-') return;
      try {
        const checkRes = await fetch(`/api/residents`);
        const allResidents = await checkRes.json();
        const existing = allResidents.find((r: any) => r.nik === nik);

        if (existing) {
          await fetch(`/api/residents/${nik}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...existing, ...data })
          });
        } else {
          await fetch(`/api/residents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nik, status: 'Kawin', statusColor: 'emerald', ...data })
          });
        }

        // Add notification
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Data Penduduk Diperbarui',
            message: `Data penduduk atas nama ${data.name} (NIK: ${nik}) telah diperbarui secara otomatis melalui pembuatan surat.`,
            category: 'Residents'
          })
        });
      } catch (e) { console.error(e); }
    };

    if (formData.nikSuami) {
      await updateResidentData(formData.nikSuami, { 
        name: formData.namaSuami, 
        birthPlace: formData.tempatLahirSuami, 
        birthDate: formData.tanggalLahirSuami, 
        job: formData.pekerjaanSuami, 
        address: formData.alamatSuami, 
        gender: 'Laki-laki', 
        religion: formData.agamaSuami, 
        education: formData.pendidikanSuami, 
        no_kk: formData.noKKSuami,
        status: 'Kawin',
        statusColor: 'emerald'
      });
    }
    if (formData.nikIstri) {
      await updateResidentData(formData.nikIstri, { 
        name: formData.namaIstri, 
        birthPlace: formData.tempatLahirIstri, 
        birthDate: formData.tanggalLahirIstri, 
        job: formData.pekerjaanIstri, 
        address: formData.alamatIstri, 
        gender: 'Perempuan', 
        religion: formData.agamaIstri, 
        education: formData.pendidikanIstri, 
        no_kk: formData.noKKIstri,
        status: 'Kawin',
        statusColor: 'emerald'
      });
    }
    
    // Modern isolated iframe printing to prevent scale/overflow truncation & default browser headers/footers
    const content = getDocHtml();
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
                <title>Cetak Surat Pengantar Nikah</title>
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
                    padding: 56px 75px !important; /* matches preview's padding precisely */
                    box-sizing: border-box !important;
                    background: white !important;
                    color: black !important;
                    box-shadow: none !important;
                    border: none !important;
                    display: block !important;
                    transform: none !important;
                    visibility: visible !important;
                    font-family: ${letterFont}, serif;
                    font-size: 11px;
                    line-height: 1.45;
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
        window.print();
      }
    } else {
      window.print();
    }
    setSuccess(true);
  };

  const kopHtml = () => {
    return `
      <div style="display:flex;align-items:flex-start;border-bottom:2.5px solid #000;padding-bottom:8px;margin-bottom:10px;font-family:${letterFont};">
        <div style="display:flex;width:100%;align-items:center;">
          <div style="width:100px;height:110px;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-right:15px;">
            <img src="${localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png'}" style="width:100%;height:100%;object-fit:contain;" />
          </div>
          <div style="text-align:center;flex:1;padding-right:100px;">
            <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">${v(formData.namaKabupaten).toUpperCase()}</div>
            <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">${v(formData.namaKecamatan).toUpperCase()}</div>
            <div style="font-weight:900;font-size:26px;text-transform:uppercase;letter-spacing:2px;line-height:1.1;margin:2px 0 3px 0;">${v(formData.namaDesa).toUpperCase()}</div>
            <div style="font-size:10.5px;text-transform:capitalize;line-height:1.15;margin:2px 0 1px 0;">${v(formData.alamatKantor)}</div>
            <div style="font-size:10.5px;line-height:1.15;margin:1px 0 0 0;">${v(formData.kontakKantor)}</div>
          </div>
        </div>
      </div>
    `;
  };

  const lampiranHtml = (model: string) => {
    return `
      <div style="font-size:10px;line-height:1.35;font-family:${letterFont};">Lampiran<br>Keputusan Dirjen Bimas Islam No. 713 Tahun 2018<br>Tentang Penetapan Formulir dan Laporan Pencatatan Perkawinan atau Rujuk</div>
      <div style="text-align:right;font-weight:700;font-family:${letterFont};">Model ${model}</div>
    `;
  };
  
  const tempatTgl = () => { return v(formData.namaDesa, '.....') + ', ' + v(fmtTgl(formData.tanggalSurat)); };

  const getDocHtml = () => {
    try {
      let html = '';
      
      const dtTable = (rows: any[]) => `
        <table style="width:100%;border-collapse:collapse;margin:6px 0;font-family:${letterFont};">
          ${rows.map(r => `<tr><td style="width:38%;padding:2.5px 4px;vertical-align:top;">${r[0]}</td><td style="width:2%;padding:2.5px 4px;vertical-align:top;">:</td><td style="padding:2.5px 4px;vertical-align:top;font-weight:700;">${r[1]}</td></tr>`).join('')}
        </table>
      `;

    const isSuami = activeDoc === 'biodata_suami' || (activeDoc === 'n1' && formData.isWargaSuami);
    const isIstri = activeDoc === 'biodata_istri' || (activeDoc === 'n1' && !formData.isWargaSuami);

    const fontStyle = `font-family: ${letterFont};`;

    const P = formData.isWargaSuami ? {
      nama: formData.namaSuami, nik: formData.nikSuami, noKK: formData.noKKSuami, jk: 'Laki-Laki', ttl: ttl(formData.tempatLahirSuami, formData.tanggalLahirSuami),
      warga: formData.kewarganegaraanSuami, agama: formData.agamaSuami, kerja: formData.pekerjaanSuami, alamat: formData.alamatSuami,
      status: formData.statusSuami, labelPasanganTerdahulu: 'Nama Istri Terdahulu',
      pasanganTerdahulu: formData.statusSuami === 'Duda' ? v(formData.namaIstriTerdahulu) : '-',
      ayah: formData.namaAyahSuami, nikAyah: formData.nikAyahSuami, ttlAyah: ttl(formData.tempatLahirAyahSuami, formData.tanggalLahirAyahSuami), agamaAyah: formData.agamaAyahSuami, kerjaAyah: formData.pekerjaanAyahSuami,
      ibu: formData.namaIbuSuami, nikIbu: formData.nikIbuSuami, ttlIbu: ttl(formData.tempatLahirIbuSuami, formData.tanggalLahirIbuSuami), agamaIbu: formData.agamaIbuSuami, kerjaIbu: formData.pekerjaanIbuSuami,
      alamatOrtu: formData.alamatOrtuSuami
    } : {
      nama: formData.namaIstri, nik: formData.nikIstri, noKK: formData.noKKIstri, jk: 'Perempuan', ttl: ttl(formData.tempatLahirIstri, formData.tanggalLahirIstri),
      warga: formData.kewarganegaraanIstri, agama: formData.agamaIstri, kerja: formData.pekerjaanIstri, alamat: formData.alamatIstri,
      status: formData.statusIstri, labelPasanganTerdahulu: 'Nama Suami Terdahulu',
      pasanganTerdahulu: formData.statusIstri === 'Janda' ? v(formData.namaSuamiTerdahulu) : '-',
      ayah: formData.namaAyahIstri, nikAyah: formData.nikAyahIstri, ttlAyah: ttl(formData.tempatLahirAyahIstri, formData.tanggalLahirAyahIstri), agamaAyah: formData.agamaAyahIstri, kerjaAyah: formData.pekerjaanAyahIstri,
      ibu: formData.namaIbuIstri, nikIbu: formData.nikIbuIstri, ttlIbu: ttl(formData.tempatLahirIbuIstri, formData.tanggalLahirIbuIstri), agamaIbu: formData.agamaIbuIstri, kerjaIbu: formData.pekerjaanIbuIstri,
      alamatOrtu: formData.alamatOrtuIstri
    };

    if (activeDoc.startsWith('biodata')) {
      const targetIsSuami = activeDoc === 'biodata_suami';
      const P = targetIsSuami ? {
        nik: formData.nikSuami, noKK: formData.noKKSuami, nama: formData.namaSuami, jk: 'Laki-Laki', ttl: ttl(formData.tempatLahirSuami, formData.tanggalLahirSuami),
        pend: formData.pendidikanSuami, warga: formData.kewarganegaraanSuami, agama: formData.agamaSuami, kerja: formData.pekerjaanSuami, alamat: formData.alamatSuami
      } : {
        nik: formData.nikIstri, noKK: formData.noKKIstri, nama: formData.namaIstri, jk: 'Perempuan', ttl: ttl(formData.tempatLahirIstri, formData.tanggalLahirIstri),
        pend: formData.pendidikanIstri, warga: formData.kewarganegaraanIstri, agama: formData.agamaIstri, kerja: formData.pekerjaanIstri, alamat: formData.alamatIstri
      };

      html = `
        ${kopHtml()}
        <h3 style="text-align:center;font-size:14px;letter-spacing:1px;text-decoration:underline;margin:14px 0 4px;">BIODATA CALON PENGANTIN</h3>
        ${dtTable([
          ['NIK', v(P.nik)],
          ['NO. KK', v(P.noKK)],
          ['NAMA LENGKAP', v(P.nama)],
          ['JENIS KELAMIN', P.jk],
          ['TEMPAT TANGGAL LAHIR', P.ttl],
          ['PENDIDIKAN', v(P.pend)],
          ['WARGANEGARA', v(P.warga)],
          ['AGAMA', v(P.agama, 'Islam')],
          ['PEKERJAAN', v(P.kerja)],
          ['TEMPAT TINGGAL', v(P.alamat)]
        ])}
        <hr style="border:none;border-top:1px solid #111;margin:10px 0;">
        <p style="font-weight:700;">PERHATIAN</p>
        <p>&bull; Dalam penulisan Model N-1: NIK, NAMA, TEMPAT TANGGAL LAHIR, harus sesuai dengan identitas pribadi (Akta Lahir, KTP, Kartu Keluarga, Ijazah).</p>
        <p>&bull; Calon mempelai dan wali harus datang langsung ke ${v(formData.namaKUA, 'KUA')} untuk pendaftaran nikah, pemeriksaan dan penasehatan pra-nikah. Catin wajib berpakaian rapi dan sopan.</p>
        <p>&bull; Penetapan hari/tanggal/tempat akad nikah dikonsultasikan dengan ${v(formData.namaKUA, 'KUA')}.</p>
      `;
    }
    else if (activeDoc === 'n1') {
      html = `
        ${lampiranHtml('N1')}
        ${dtTable([
          ['KANTOR DESA', v(formData.namaDesa).toUpperCase()],
          ['KECAMATAN', v(formData.namaKecamatan).toUpperCase()],
          ['KABUPATEN', v(formData.namaKabupaten).toUpperCase()]
        ])}
        <h3 style="text-align:center;font-size:14px;letter-spacing:1px;text-decoration:underline;margin:14px 0 4px;">SURAT PENGANTAR PERKAWINAN</h3>
        <p style="text-align:center;margin-top:-6px;">Nomor: ${v(formData.nomorSurat)}</p>
        <p>yang bertanda tangan di bawah ini menjelaskan dengan sesungguhnya bahwa:</p>
        ${dtTable([
          ['1. Nama', v(P.nama)],
          ['2. NIK', v(P.nik)],
          ['3. No. KK', v(P.noKK)],
          ['4. Jenis Kelamin', P.jk],
          ['5. Tempat Tanggal Lahir', P.ttl],
          ['6. Kewarganegaraan', v(P.warga)],
          ['7. Agama', v(P.agama, 'Islam')],
          ['8. Pekerjaan', v(P.kerja)],
          ['9. Alamat', v(P.alamat)],
          ['10. Status Perkawinan', v(P.status)],
          ['11. ' + P.labelPasanganTerdahulu, P.pasanganTerdahulu]
        ])}
        <p>adalah benar anak kandung dari perkawinan seorang pria:</p>
        ${dtTable([
          ['1. Nama', v(P.ayah)],
          ['2. NIK', v(P.nikAyah)],
          ['3. Tempat Tanggal Lahir', P.ttlAyah],
          ['4. Pekerjaan', v(P.kerjaAyah)],
          ['5. Alamat', v(P.alamatOrtu)]
        ])}
        <p>dengan seorang wanita:</p>
        ${dtTable([
          ['1. Nama', v(P.ibu)],
          ['2. NIK', v(P.nikIbu)],
          ['3. Tempat Tanggal Lahir', P.ttlIbu],
          ['4. Pekerjaan', v(P.kerjaIbu)],
          ['5. Alamat', v(P.alamatOrtu)]
        ])}
        <p>Rencana akad nikah: ${v(formData.hariMenikah)}, ${v(fmtTgl(formData.tanggalMenikah))} Jam ${v(formData.jamMenikah)} WIB di ${v(formData.tempatMenikah)}.</p>
        <p style="margin-top:10px;">Demikian surat pengantar ini dibuat dengan mengingat sumpah jabatan dan untuk dipergunakan sebagaimana mestinya.</p>
        ${getPrintSignatureHTML(
          formData.namaDesa,
          v(fmtTgl(formData.tanggalSurat)),
          formData.namaPejabat,
          formData.jabatanPejabat,
          // Optional NIP lookup from officers
          (() => {
            try {
              const officersList = JSON.parse(localStorage.getItem('village_officers') || '[]');
              const found = officersList.find((o: any) => o.name === formData.namaPejabat);
              return found?.nip || '-';
            } catch(e) {
              return '-';
            }
          })(),
        formData.includeCamat
      )}
      `;
    }
    else if (activeDoc === 'n2') {
      html = `
        ${lampiranHtml('N2')}
        <p style="text-align:right;">${tempatTgl()}</p>
        <p>Perihal: Permohonan Kehendak Perkawinan</p>
        <p>Kepada Yth.<br>Kepala ${v(formData.namaKUA, 'KUA Kecamatan')}<br>di - Tempat</p>
        <p>Dengan hormat, kami mengajukan permohonan kehendak perkawinan untuk atas kami:</p>
        ${dtTable([
          ['Calon Suami', v(formData.namaSuami)],
          ['dengan Calon Istri', v(formData.namaIstri)],
          ['Hari', v(formData.hariMenikah)],
          ['Tanggal', v(fmtTgl(formData.tanggalMenikah))],
          ['Jam', v(formData.jamMenikah)],
          ['Bertempat di', v(formData.tempatMenikah)]
        ])}
        <p>Bersama ini kami lampirkan surat-surat yang diperlukan untuk diperiksa sebagai berikut:</p>
        <ol style="margin:6px 0;padding-left:18px;font-size:10.8px;">
          <li>Surat Pengantar Perkawinan dari Desa/Kelurahan (Model N1)</li>
          <li>Surat Permohonan Kehendak Perkawinan (Model N2)</li>
          <li>Surat Persetujuan Mempelai (Model N3)</li>
          <li>Surat Izin Orang Tua (Model N4)</li>
          <li>Surat Keterangan Kematian Suami/Istri (Model N6), bila berlaku</li>
          <li>Fotokopi KTP dan Kartu Keluarga</li>
          <li>Fotokopi Akta Kelahiran</li>
          <li>Fotokopi Ijazah Terakhir</li>
          <li>Dokumen tambahan sesuai ketentuan (akta cerai, izin atasan, dispensasi, dsb.) bila berlaku</li>
          <li>Pas foto berwarna</li>
        </ol>
        <p>Demikian permohonan ini kami sampaikan, kiranya dapat diperiksa, dihadiri, dan dicatat sesuai dengan ketentuan perundang-undangan.</p>
        <div style="margin-top:22px;display:flex;justify-content:space-between;">
          <div style="text-align:center;width:44%;">Yang menerima,<br>Kepala ${v(formData.namaKUA, 'KUA')}<span style="font-weight:700;margin-top:56px;display:block;">&nbsp;</span></div>
          <div style="text-align:center;width:44%;">Pemohon,<span style="font-weight:700;margin-top:56px;display:block;">${v(formData.isWargaSuami ? formData.namaSuami : formData.namaIstri).toUpperCase()}</span>${formData.isWargaSuami ? 'BIN' : 'BINTI'} ${v(formData.isWargaSuami ? formData.namaAyahSuami : formData.namaAyahIstri).toUpperCase()}</div>
        </div>
      `;
    }
    else if (activeDoc === 'n3') {
      html = `
        ${lampiranHtml('N3')}
        <h3 style="text-align:center;font-size:14px;letter-spacing:1px;text-decoration:underline;margin:14px 0 4px;">SURAT PERSETUJUAN MEMPELAI</h3>
        <p>yang bertanda tangan di bawah ini:</p>
        <p style="font-weight:700;">A. Calon Suami</p>
        ${dtTable([
          ['1. Nama', v(formData.namaSuami)],
          ['2. NIK', v(formData.nikSuami)],
          ['3. Jenis Kelamin', 'Laki-Laki'],
          ['4. Tempat Tanggal Lahir', ttl(formData.tempatLahirSuami, formData.tanggalLahirSuami)],
          ['5. Pekerjaan', v(formData.pekerjaanSuami)],
          ['6. Alamat', v(formData.alamatSuami)]
        ])}
        <p style="font-weight:700;">B. Calon Istri</p>
        ${dtTable([
          ['1. Nama', v(formData.namaIstri)],
          ['2. NIK', v(formData.nikIstri)],
          ['3. Jenis Kelamin', 'Perempuan'],
          ['4. Tempat Tanggal Lahir', ttl(formData.tempatLahirIstri, formData.tanggalLahirIstri)],
          ['5. Pekerjaan', v(formData.pekerjaanIstri)],
          ['6. Alamat', v(formData.alamatIstri)]
        ])}
        <p>Menyatakan dengan sesungguhnya bahwa atas dasar suka rela, kesadaran sendiri, dan tanpa ada paksaan dari siapapun, setuju untuk melangsungkan perkawinan.</p>
        <p style="text-align:right;">${tempatTgl()}</p>
        <div style="margin-top:22px;display:flex;justify-content:space-between;">
          <div style="text-align:center;width:44%;">Calon Suami,<span style="font-weight:700;margin-top:56px;display:block;">${v(formData.namaSuami).toUpperCase()}</span>BIN ${v(formData.namaAyahSuami).toUpperCase()}</div>
          <div style="text-align:center;width:44%;">Calon Istri,<span style="font-weight:700;margin-top:56px;display:block;">${v(formData.namaIstri).toUpperCase()}</span>BINTI ${v(formData.namaAyahIstri).toUpperCase()}</div>
        </div>
      `;
    }
    else if (activeDoc.startsWith('n4_')) {
      const isSuami = activeDoc === 'n4_suami';
      const anak = isSuami ? {
        nama: formData.namaSuami, nik: formData.nikSuami, jk: 'Laki-Laki', ttl: ttl(formData.tempatLahirSuami, formData.tanggalLahirSuami),
        warga: formData.kewarganegaraanSuami, agama: formData.agamaSuami, kerja: formData.pekerjaanSuami, alamat: formData.alamatSuami,
        ayah: formData.namaAyahSuami, nikAyah: formData.nikAyahSuami, ttlAyah: ttl(formData.tempatLahirAyahSuami, formData.tanggalLahirAyahSuami), agamaAyah: formData.agamaAyahSuami, kerjaAyah: formData.pekerjaanAyahSuami,
        ibu: formData.namaIbuSuami, nikIbu: formData.nikIbuSuami, ttlIbu: ttl(formData.tempatLahirIbuSuami, formData.tanggalLahirIbuSuami), agamaIbu: formData.agamaIbuSuami, kerjaIbu: formData.pekerjaanIbuSuami,
        alamatOrtu: formData.alamatOrtuSuami,
        pasangan: formData.namaIstri, nikPasangan: formData.nikIstri, jkPasangan: 'Perempuan', ttlPasangan: ttl(formData.tempatLahirIstri, formData.tanggalLahirIstri),
        wargaPasangan: formData.kewarganegaraanIstri, agamaPasangan: formData.agamaIstri, kerjaPasangan: formData.pekerjaanIstri, alamatPasangan: formData.alamatIstri
      } : {
        nama: formData.namaIstri, nik: formData.nikIstri, jk: 'Perempuan', ttl: ttl(formData.tempatLahirIstri, formData.tanggalLahirIstri),
        warga: formData.kewarganegaraanIstri, agama: formData.agamaIstri, kerja: formData.pekerjaanIstri, alamat: formData.alamatIstri,
        ayah: formData.namaAyahIstri, nikAyah: formData.nikAyahIstri, ttlAyah: ttl(formData.tempatLahirAyahIstri, formData.tanggalLahirAyahIstri), agamaAyah: formData.agamaAyahIstri, kerjaAyah: formData.pekerjaanAyahIstri,
        ibu: formData.namaIbuIstri, nikIbu: formData.nikIbuIstri, ttlIbu: ttl(formData.tempatLahirIbuIstri, formData.tanggalLahirIbuIstri), agamaIbu: formData.agamaIbuIstri, kerjaIbu: formData.pekerjaanIbuIstri,
        alamatOrtu: formData.alamatOrtuIstri,
        pasangan: formData.namaSuami, nikPasangan: formData.nikSuami, jkPasangan: 'Laki-Laki', ttlPasangan: ttl(formData.tempatLahirSuami, formData.tanggalLahirSuami),
        wargaPasangan: formData.kewarganegaraanSuami, agamaPasangan: formData.agamaSuami, kerjaPasangan: formData.pekerjaanSuami, alamatPasangan: formData.alamatSuami
      };

      html = `
        ${lampiranHtml('N4')}
        <h3 style="text-align:center;font-size:14px;letter-spacing:1px;text-decoration:underline;margin:14px 0 4px;">SURAT IZIN ORANG TUA</h3>
        <p>yang bertanda tangan di bawah ini:</p>
        <p style="font-weight:700;">A. AYAH</p>
        ${dtTable([
          ['1. Nama', v(anak.ayah)],
          ['2. NIK', v(anak.nikAyah)],
          ['3. Tempat Tanggal Lahir', anak.ttlAyah],
          ['4. Agama', v(anak.agamaAyah, 'Islam')],
          ['5. Pekerjaan', v(anak.kerjaAyah)],
          ['6. Alamat', v(anak.alamatOrtu)]
        ])}
        <p style="font-weight:700;">B. IBU</p>
        ${dtTable([
          ['1. Nama', v(anak.ibu)],
          ['2. NIK', v(anak.nikIbu)],
          ['3. Tempat Tanggal Lahir', anak.ttlIbu],
          ['4. Agama', v(anak.agamaIbu, 'Islam')],
          ['5. Pekerjaan', v(anak.kerjaIbu)],
          ['6. Alamat', v(anak.alamatOrtu)]
        ])}
        <p>adalah ayah kandung dan ibu kandung dari:</p>
        ${dtTable([
          ['1. Nama', v(anak.nama)],
          ['2. NIK', v(anak.nik)],
          ['3. Jenis Kelamin', anak.jk],
          ['4. Tempat Tanggal Lahir', anak.ttl],
          ['5. Pekerjaan', v(anak.kerja)],
          ['6. Alamat', v(anak.alamat)]
        ])}
        <p>memberikan izin kepada anak kami untuk melakukan perkawinan dengan:</p>
        ${dtTable([
          ['1. Nama', v(anak.pasangan)],
          ['2. NIK', v(anak.nikPasangan)],
          ['3. Jenis Kelamin', anak.jkPasangan],
          ['4. Tempat Tanggal Lahir', anak.ttlPasangan],
          ['5. Pekerjaan', v(anak.kerjaPasangan)],
          ['6. Alamat', v(anak.alamatPasangan)]
        ])}
        <p>Demikianlah surat izin ini dibuat dengan kesadaran tanpa ada paksaan dari siapapun dan untuk digunakan seperlunya.</p>
        <div style="margin-top:20px;display:flex;justify-content:flex-end;">
          <div style="text-align:center;width:230px;">
            <div style="margin-bottom:45px;">${tempatTgl()}<br>Wali,</div>
            <span style="font-weight:700;">${v(anak.ayah).toUpperCase()}</span>
          </div>
        </div>
      `;
    }
    
    return `<div style="${fontStyle}">` + html + `
      <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    </div>`;
    } catch (e) {
      console.error("Error generating doc HTML:", e);
      return `<div style="color:red;padding:20px;border:1px solid red;">Gagal memuat pratinjau. Silakan periksa kembali data yang diinput.</div>`;
    }
  };

  if (showRiwayat) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-none border border-gray-200 dark:border-slate-700 p-8 text-black">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Riwayat Surat Nikah</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Riwayat ini tersimpan di browser Anda.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                if (window.confirm("Kosongkan semua riwayat?")) {
                  setRiwayat([]);
                  localStorage.removeItem('riwayat_surat_nikah');
                }
              }} 
              className="flex items-center gap-2 px-4 py-2 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 font-medium text-sm"
            >
              <Trash2 className="w-4 h-4" /> Kosongkan
            </button>
            <button 
              onClick={() => setShowRiwayat(false)} 
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
            >
              Kembali
            </button>
          </div>
        </div>

        {riwayat.length === 0 ? (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
            Belum ada riwayat tersimpan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Calon Suami</th>
                  <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Calon Istri</th>
                  <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Nomor Surat</th>
                  <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Tgl Akad</th>
                  <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Disimpan</th>
                  <th className="p-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riwayat.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300">{r.data.namaSuami || '-'}</td>
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300">{r.data.namaIstri || '-'}</td>
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300">{r.data.nomorSurat || '-'}</td>
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300">{r.data.tanggalMenikah ? fmtTgl(r.data.tanggalMenikah) : '-'}</td>
                    <td className="p-3 text-sm text-slate-700 dark:text-slate-300">{new Date(r.savedAt).toLocaleDateString('id-ID')}</td>
                    <td className="p-3 text-sm flex gap-2">
                      <button 
                        onClick={() => {
                          setFormData(r.data);
                          setShowRiwayat(false);
                          setStep(6);
                        }}
                        className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 font-medium"
                      >
                        Muat
                      </button>
                      <button 
                        onClick={() => {
                          const updated = riwayat.filter(item => item.id !== r.id);
                          setRiwayat(updated);
                          localStorage.setItem('riwayat_surat_nikah', JSON.stringify(updated));
                        }}
                        className="px-3 py-1 bg-rose-100 text-rose-700 rounded hover:bg-rose-200 font-medium"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 min-h-screen text-slate-900 dark:text-white pb-20 print:bg-white print:pb-0">
      {/* Dedicated Print Block */}
      <div 
        className="hidden print:block printable-area" 
        style={{ 
          width: '210mm',
          height: '297mm',
          padding: '20mm',
          fontFamily: letterFont, 
          fontSize: '12px', 
          lineHeight: '1.45',
          position: 'relative',
          boxSizing: 'border-box'
        }}
        dangerouslySetInnerHTML={{ __html: getDocHtml() }}
      />
      <div className="hidden print:block">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4; margin: 0 !important; }
            body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact; }
            .print\\:hidden { display: none !important; }
            .printable-area { display: block !important; }
          }
        `}} />
      </div>

      {/* Header - Hidden on Print */}
      <div className="print:hidden px-8 pt-4 pb-3 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 sticky top-16 z-30 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Buat SKN</h1>
              <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Model N1 - N4 & Pengantar</p>
            </div>
          </div>
          
        </div>

        {/* Stepper */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {STEPS.map(s => {
            const done = isStepComplete(s.n);
            const isActive = step === s.n;
            return (
              <button
                key={s.n}
                onClick={() => setStep(s.n)}
                className={`flex-none flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-colors
                  ${isActive ? 'bg-emerald-600 text-white border-emerald-600' : 
                    done ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}
                `}
              >
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold
                  ${isActive ? 'bg-white/25 text-white' : done ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}
                `}>
                  {done ? '✓' : s.n}
                </span>
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Area - Hidden on Print */}
      <div className="print:hidden px-8 max-w-5xl mx-auto">
        {step === 1 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-none">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">1. Pilih Mempelai (Warga Desa)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Pilih salah satu calon mempelai yang merupakan warga desa kita.</p>
            
            <div className="space-y-6">
              <div className="relative">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Cari Penduduk</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Masukkan Nama atau NIK..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <p className="text-[10px] text-emerald-700 font-medium mt-1.5">* Pencarian otomatis melengkapi biodata, alamat, KK, pendidikan, dan pekerjaan warga desa terpilih</p>
                
                {searchQuery.trim().length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                    {(() => {
                      const filtered = residents.filter(r => 
                        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.nik.includes(searchQuery)
                      );
                      
                      if (filtered.length === 0) {
                        return (
                          <div className="p-8 text-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Warga tidak ditemukan dalam database penduduk.</p>
                            <button 
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  isWargaSuami: true,
                                  namaSuami: searchQuery.toUpperCase()
                                }));
                                setStep(2);
                                setSearchQuery('');
                              }}
                              className="px-6 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 shadow-md dark:shadow-none shadow-emerald-100"
                            >
                              Lanjutkan Isi Manual & Daftarkan Baru
                            </button>
                          </div>
                        );
                      }

                      return filtered.map(r => (
                        <button
                          key={r.id}
                          onClick={() => handleSelectResident(r)}
                          className="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b last:border-0 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{templateDesc}</p>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${r.gender === 'Laki-laki' || r.gender === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                            {r.gender}
                          </span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>

              {(formData.namaSuami || formData.namaIstri) && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      {(formData.isWargaSuami ? formData.namaSuami : formData.namaIstri).charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Warga Desa Terpilih</p>
                      <p className="font-bold text-slate-900 dark:text-white">{formData.isWargaSuami ? formData.namaSuami : formData.namaIstri}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{templateDesc}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setFormData(prev => ({ ...prev, namaSuami: '', nikSuami: '', namaIstri: '', nikIstri: '' }));
                    }}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Ganti
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nomor Surat</label>
                  <input type="text" name="nomorSurat" value={formData.nomorSurat} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500" placeholder="SKN/.../..." />
                  <p className="text-[10px] text-emerald-700 font-medium">* Nomor surat otomatis terisi oleh SistemDiDesa</p>
                </div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tanggal Surat</label><input type="date" name="tanggalSurat" value={formData.tanggalSurat} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500" /></div>
                
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tanggal Menikah</label><input type="date" name="tanggalMenikah" value={formData.tanggalMenikah} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jam Menikah</label><input type="time" name="jamMenikah" value={formData.jamMenikah} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500" /></div>
                <div className="col-span-2 space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempat Akad</label><input type="text" name="tempatMenikah" value={formData.tempatMenikah} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900" placeholder="Rumah / KUA / Lokasi Lainnya" /></div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setStep(2)} 
                disabled={!isStepComplete(1) || (!formData.namaSuami && !formData.namaIstri)}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                Lanjut &rarr;
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-none">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">2. Data Pasangan (Luar Desa)</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Lengkapi data pasangan yang berasal dari luar desa.</p>

            <div className="grid grid-cols-2 gap-8">
              {/* KOLOM SUAMI */}
              <div className="space-y-4">
                <h3 className={`text-xs font-bold uppercase tracking-widest pb-2 border-b flex items-center gap-2 ${formData.isWargaSuami ? 'text-emerald-700 border-emerald-100' : 'text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                  Calon Suami {formData.isWargaSuami && <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800">WARGA KITA</span>}
                </h3>
                
                <div className="space-y-3">
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label><input type="text" name="namaSuami" value={formData.namaSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 uppercase font-bold" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">NIK</label>
                      <input type="text" name="nikSuami" value={formData.nikSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" />
                      <p className="text-[10px] text-emerald-700 font-medium">* 16 digit NIK calon suami</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">No. KK</label>
                      <input type="text" name="noKKSuami" value={formData.noKKSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" />
                      <p className="text-[10px] text-emerald-700 font-medium">* 16 digit KK calon suami</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label><input type="text" name="tempatLahirSuami" value={formData.tempatLahirSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tgl Lahir</label><input type="date" name="tanggalLahirSuami" value={formData.tanggalLahirSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Agama</label>
                      <select name="agamaSuami" value={formData.agamaSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                        {RELIGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                      <select name="pekerjaanSuami" value={formData.pekerjaanSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                        <option value="">Pilih...</option>{PEKERJAAN_OPTIONS.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pendidikan</label>
                      <select name="pendidikanSuami" value={formData.pendidikanSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                        <option value="">Pilih...</option>
                        {PENDIDIKAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
                      <select name="statusSuami" value={formData.statusSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                        <option>Jejaka</option><option>Duda</option>
                      </select>
                    </div>
                  </div>
                  {formData.statusSuami === 'Duda' && (
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Istri Terdahulu</label><input type="text" name="namaIstriTerdahulu" value={formData.namaIstriTerdahulu} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 uppercase" /></div>
                  )}
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label><input type="text" name="alamatSuami" value={formData.alamatSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                </div>
              </div>

              {/* KOLOM ISTRI */}
              <div className="space-y-4">
                <h3 className={`text-xs font-bold uppercase tracking-widest pb-2 border-b flex items-center gap-2 ${!formData.isWargaSuami ? 'text-emerald-700 border-emerald-100' : 'text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800'}`}>
                  Calon Istri {!formData.isWargaSuami && <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800">WARGA KITA</span>}
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label><input type="text" name="namaIstri" value={formData.namaIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 uppercase font-bold" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">NIK</label>
                      <input type="text" name="nikIstri" value={formData.nikIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" />
                      <p className="text-[10px] text-emerald-700 font-medium">* 16 digit NIK calon istri</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">No. KK</label>
                      <input type="text" name="noKKIstri" value={formData.noKKIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" />
                      <p className="text-[10px] text-emerald-700 font-medium">* 16 digit KK calon istri</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label><input type="text" name="tempatLahirIstri" value={formData.tempatLahirIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tgl Lahir</label><input type="date" name="tanggalLahirIstri" value={formData.tanggalLahirIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Agama</label>
                      <select name="agamaIstri" value={formData.agamaIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                        {RELIGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                      <select name="pekerjaanIstri" value={formData.pekerjaanIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                        <option value="">Pilih...</option>{PEKERJAAN_OPTIONS.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pendidikan</label>
                      <select name="pendidikanIstri" value={formData.pendidikanIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                        <option value="">Pilih...</option>
                        {PENDIDIKAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Status</label>
                      <select name="statusIstri" value={formData.statusIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                        <option>Perawan</option><option>Janda</option>
                      </select>
                    </div>
                  </div>
                  {formData.statusIstri === 'Janda' && (
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Suami Terdahulu</label><input type="text" name="namaSuamiTerdahulu" value={formData.namaSuamiTerdahulu} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 uppercase" /></div>
                  )}
                  <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label><input type="text" name="alamatIstri" value={formData.alamatIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(1)} className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-800">&larr; Kembali</button>
              <button onClick={() => setStep(3)} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700">Lanjut &rarr;</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-none overflow-hidden">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">3. Data Orang Tua</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Lengkapi data orang tua kedua calon mempelai.</p>
            
            <div className="grid grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              {/* ORTU SUAMI */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-widest pb-2 border-b border-emerald-100">Orang Tua Suami</h3>
                
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Ayah Suami</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Ayah</label><input type="text" name="namaAyahSuami" value={formData.namaAyahSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 uppercase" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">NIK Ayah</label><input type="text" name="nikAyahSuami" value={formData.nikAyahSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label><input type="text" name="tempatLahirAyahSuami" value={formData.tempatLahirAyahSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tgl Lahir</label><input type="date" name="tanggalLahirAyahSuami" value={formData.tanggalLahirAyahSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Agama</label>
                        <select name="agamaAyahSuami" value={formData.agamaAyahSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                          {RELIGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                        <select name="pekerjaanAyahSuami" value={formData.pekerjaanAyahSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                          <option value="">Pilih...</option>{PEKERJAAN_OPTIONS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Ibu Suami</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Ibu</label><input type="text" name="namaIbuSuami" value={formData.namaIbuSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 uppercase" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">NIK Ibu</label><input type="text" name="nikIbuSuami" value={formData.nikIbuSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label><input type="text" name="tempatLahirIbuSuami" value={formData.tempatLahirIbuSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tgl Lahir</label><input type="date" name="tanggalLahirIbuSuami" value={formData.tanggalLahirIbuSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Agama</label>
                        <select name="agamaIbuSuami" value={formData.agamaIbuSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                          {RELIGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                        <select name="pekerjaanIbuSuami" value={formData.pekerjaanIbuSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                          <option value="">Pilih...</option>{PEKERJAAN_OPTIONS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Alamat Orang Tua Suami</label><input type="text" name="alamatOrtuSuami" value={formData.alamatOrtuSuami} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
              </div>

              {/* ORTU ISTRI */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-widest pb-2 border-b border-emerald-100">Orang Tua Istri</h3>
                
                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Ayah Istri</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Ayah</label><input type="text" name="namaAyahIstri" value={formData.namaAyahIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 uppercase" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">NIK Ayah</label><input type="text" name="nikAyahIstri" value={formData.nikAyahIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label><input type="text" name="tempatLahirAyahIstri" value={formData.tempatLahirAyahIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tgl Lahir</label><input type="date" name="tanggalLahirAyahIstri" value={formData.tanggalLahirAyahIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Agama</label>
                        <select name="agamaAyahIstri" value={formData.agamaAyahIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                          {RELIGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                        <select name="pekerjaanAyahIstri" value={formData.pekerjaanAyahIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                          <option value="">Pilih...</option>{PEKERJAAN_OPTIONS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data Ibu Istri</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Ibu</label><input type="text" name="namaIbuIstri" value={formData.namaIbuIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 uppercase" /></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">NIK Ibu</label><input type="text" name="nikIbuIstri" value={formData.nikIbuIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label><input type="text" name="tempatLahirIbuIstri" value={formData.tempatLahirIbuIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tgl Lahir</label><input type="date" name="tanggalLahirIbuIstri" value={formData.tanggalLahirIbuIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Agama</label>
                        <select name="agamaIbuIstri" value={formData.agamaIbuIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                          {RELIGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                        <select name="pekerjaanIbuIstri" value={formData.pekerjaanIbuIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900">
                          <option value="">Pilih...</option>{PEKERJAAN_OPTIONS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Alamat Orang Tua Istri</label><input type="text" name="alamatOrtuIstri" value={formData.alamatOrtuIstri} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" /></div>
              </div>
            </div>

            <div className="mt-8 flex justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
              <button onClick={() => setStep(2)} className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-800">&larr; Kembali</button>
              <button onClick={() => setStep(4)} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700">Lanjut &rarr;</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-none">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">4. Wali & Pejabat</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nama Wali</label>
                <input type="text" name="namaWali" value={formData.namaWali} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 uppercase" placeholder="Sama dengan nama ayah jika kosong" />
                <p className="text-[10px] text-emerald-700 font-medium">* Kosongkan jika wali adalah Ayah Kandung</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Hubungan Wali</label>
                <select name="hubunganWali" value={formData.hubunganWali} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 font-medium">
                  <option>Ayah Kandung</option><option>Saudara Laki-laki Kandung</option><option>Wali Hakim</option>
                </select>
                <p className="text-[10px] text-emerald-700 font-medium">* Hubungan kekerabatan wali nikah dengan calon pengantin wanita</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Pejabat Penandatangan</label>
                <select
                  value={formData.namaPejabat}
                  onChange={(e) => {
                    const val = e.target.value;
                    const stored = localStorage.getItem('village_officers');
                    const officers = stored ? JSON.parse(stored) : [
                      { name: 'Fazakkir Rahmad', role: 'Kepala Desa', nip: '-' },
                      { name: 'Siti Aminah', role: 'Sekretaris Desa', nip: '198510122010122003' },
                      { name: 'Muhammad Noor', role: 'Kasi Pemerintahan', nip: '198704152014021002' },
                      { name: 'Ahmad Rifai', role: 'Kasi Kesejahteraan', nip: '-' },
                      { name: 'Rahmadi', role: 'Kasi Pelayanan', nip: '-' },
                      { name: 'H. Supian', role: 'Kaur Keuangan', nip: '-' },
                      { name: 'Sri Wahyuni', role: 'Kaur Umum', nip: '-' }
                    ];
                    const found = officers.find((o: any) => o.name === val);
                    setFormData(prev => ({ 
                      ...prev, 
                      namaPejabat: val, 
                      jabatanPejabat: found ? found.role : prev.jabatanPejabat 
                    }));
                  }}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 font-bold text-emerald-900"
                >
                  {(() => {
                    try {
                      const stored = localStorage.getItem('village_officers');
                      const list = stored ? JSON.parse(stored) : [
                        { name: 'Fazakkir Rahmad', role: 'Kepala Desa', nip: '-' },
                        { name: 'Siti Aminah', role: 'Sekretaris Desa', nip: '198510122010122003' },
                        { name: 'Muhammad Noor', role: 'Kasi Pemerintahan', nip: '198704152014021002' },
                        { name: 'Ahmad Rifai', role: 'Kasi Kesejahteraan', nip: '-' },
                        { name: 'Rahmadi', role: 'Kasi Pelayanan', nip: '-' },
                        { name: 'H. Supian', role: 'Kaur Keuangan', nip: '-' },
                        { name: 'Sri Wahyuni', role: 'Kaur Umum', nip: '-' }
                      ];
                      return list.map((off: any, idx: number) => (
                        <option key={idx} value={off.name}>{off.name} ({off.role})</option>
                      ));
                    } catch(e) { 
                      return <option value={defaultPejabat}>{defaultPejabat} ({defaultJabatan})</option>;
                    }
                  })()}
                </select>
                <p className="text-[10px] text-emerald-700 font-medium">* Daftar pejabat dapat disesuaikan pada Menu Pengaturan Desa</p>
              </div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-700 dark:text-slate-300">Jabatan (Ketik Manual jika perlu)</label>
                <input type="text" name="jabatanPejabat" value={formData.jabatanPejabat} onChange={handleChange} className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900" />
              </div>
            </div>
            
            <div className="mt-8 flex justify-between">
              <button onClick={() => setStep(3)} className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-800">&larr; Kembali</button>
              <button onClick={() => setStep(5)} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700">Lihat & Cetak &rarr;</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm dark:shadow-none print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* KIRI: KONTROL & TABS */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">5. Preview & Cetak</h2>
                  <div className="flex gap-3">
                    <button onClick={saveToRiwayat} className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                      <Save className="w-4 h-4" /> Simpan 
                    </button>
                    <button onClick={handlePrint} className="flex-1 flex justify-center items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-md dark:shadow-none shadow-emerald-600/20 transition-all active:scale-95">
                      <Printer className="w-4 h-4" /> Cetak
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pilih Dokumen</label>
                  <div className="flex flex-wrap gap-2">
                    {DOC_TABS.map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveDoc(tab.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${activeDoc === tab.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-md dark:shadow-none shadow-emerald-600/20 scale-105' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-start gap-3">
                  <span className="text-emerald-600 shrink-0 mt-0.5 font-bold">💡</span>
                  <div>
                    <h4 className="font-bold text-emerald-900 text-xs">Informasi Penting & Cetak</h4>
                    <p className="text-[11px] text-emerald-700 mt-1.5 leading-relaxed">
                      Pastikan biodata kedua calon mempelai dan saksi sudah lengkap sesuai berkas persyaratan N1-N4 KUA. Jika tombol cetak tidak merespon, silakan gunakan menu <strong>Buka di Tab Baru</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* KANAN: PREVIEW A4 */}
              <div className="lg:col-span-7">
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-inner flex flex-col h-[700px] sticky top-6">
                  <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 shadow-sm dark:shadow-none z-10">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">LIVE A4 ENGINE PREVIEW</span>
                    </div>
                
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                  <button 
                    onClick={() => setPreviewZoom(prev => Math.max(0.3, prev - 0.05))} 
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 px-2 w-14 text-center">
                    {Math.round(previewZoom * 100)}%
                  </span>
                  <button 
                    onClick={() => setPreviewZoom(prev => Math.min(1.2, prev + 0.05))} 
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  <div className="w-px h-5 bg-slate-200 mx-1"></div>
                  <button 
                    onClick={() => setPreviewZoom(0.45)} 
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition-colors text-[10px] font-bold"
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div 
                ref={dragProps.ref}
                onMouseDown={dragProps.onMouseDown}
                onMouseLeave={dragProps.onMouseLeave}
                onMouseUp={dragProps.onMouseUp}
                onMouseMove={dragProps.onMouseMove}
                style={{ ...dragProps.style }}
                className="flex-1 bg-slate-200/40 overflow-auto relative flex p-8"
              >
                <div 
                  style={{
                    width: `${794 * previewZoom}px`,
                    height: `${1123 * previewZoom}px`,
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
                    className="bg-white dark:bg-slate-900 shrink-0"
                    style={{ 
                      width: '794px', 
                      height: '1123px', 
                      padding: '56px 75px',
                      transform: `scale(${previewZoom})`,
                      transformOrigin: 'top left',
                      fontFamily: letterFont,
                      fontSize: '12px',
                      lineHeight: '1.45',
                      position: 'relative',
                      boxSizing: 'border-box',
                      color: 'black'
                    }}
                    dangerouslySetInnerHTML={{ __html: getDocHtml() }}
                  />
                </div>
              </div>
            </div>
            </div>
            </div>

            <div className="mt-8">
              <button onClick={() => setStep(4)} className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-800">&larr; Kembali</button>
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
        nomorSurat={formData.nomorSurat}
        namaWarga={`${formData.namaSuami} & ${formData.namaIstri}`}
        jenisSurat="Surat Pengantar Nikah (SKN)"
        onBackToTemplates={onBack}
      />
    </div>
  );
}


