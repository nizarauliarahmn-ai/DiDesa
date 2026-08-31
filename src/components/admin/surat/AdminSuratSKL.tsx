import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';
import SuratEditorHeader, { getLetterHeaderTemplate } from './SuratEditorHeader';
import { useBackdateNumber } from '../../../hooks/useBackdateNumber';
import BackdateConfig from './BackdateConfig';
import { generateKopSuratHTML } from '../../../utils/letterFormat';
import { resolveKadesName } from '../../../utils/letterOfficers';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PrintSuccessDialog from './PrintSuccessDialog';
import { FileSignature, AlertCircle, History, ZoomIn, ZoomOut, Baby, Users, Activity } from 'lucide-react';
import { getLetterClassifications, incrementSequenceNumber, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { capitalizeResidentFields, capitalizeWords } from '../../../utils/textUtils';
import { parseAddress } from '../../../utils/addressParser';
import { useDragScroll } from '../../../hooks/useDragScroll';
import { autoSyncResidentFromLetter } from '../../../utils/residentSync';
import { SuggestCombobox } from './SuggestCombobox';

interface Resident {
  nik: string;
  name: string;
  gender: string;
  birthPlace: string;
  birthDate: string;
  job: string;
  address: string;
  desa: string;
  fatherName: string;
  motherName: string;
}

export default function AdminSuratSKL({ 
  onBack,
  editData,
  editLetterId
}: { 
  onBack: () => void;
  editData?: any;
  editLetterId?: string | null;
}) {
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);
  const backdateKlas = getLetterClassifications().find(c => c.klasifikasi === 'SKL') || { klasifikasi: 'SKL', kodeKlasifikasi: '474.1' };
  const kodeKlasifikasiSKL = backdateKlas.kodeKlasifikasi || '474.1';
  const { isBackdate, setIsBackdate } = useBackdateNumber(tanggalSurat, backdateKlas.klasifikasi, backdateKlas.kodeKlasifikasi);
  const [manualSequence, setManualSequence] = useState('');

  const handleCustomNomorSurat = (nomor: string) => {
    setNoSurat(nomor);
  };

  const [loading, setLoading] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);

  // State untuk Nomor dan Tanggal Surat
  const [noSurat, setNoSurat] = useState('');

  // Data Anak
  const [anakData, setAnakData] = useState({
    nama: '',
    jenisKelamin: 'Laki-laki',
    tempatLahir: '',
    tanggalLahir: '',
    jamLahir: '',
    anakKe: '1'
  });

  // Data RS/Kelahiran
  const [rsData, setRsData] = useState({
    namaRS: '',
    noSuratRS: '',
    tanggalSuratRS: ''
  });

  // Data Ayah
  const [ayahData, setAyahData] = useState({
    nik: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    alamat: ''
  });

  // Data Ibu
  const [ibuData, setIbuData] = useState({
    nik: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    alamat: ''
  });

  // Saksi 1
  const [saksi1Data, setSaksi1Data] = useState({
    nik: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    alamat: ''
  });

  // Saksi 2
  const [saksi2Data, setSaksi2Data] = useState({
    nik: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    pekerjaan: '',
    alamat: ''
  });

  // Pejabat
  const [namaPejabat, setNamaPejabat] = useState(resolveKadesName() || '');
  const [jabatanPejabat, setJabatanPejabat] = useState('Kepala Desa');
  const [includeCamat, setIncludeCamat] = useState(false);
  const [useEsignature, setUseEsignature] = useState(true);
  
  // Kop Settings
  const namaDesa = localStorage.getItem('kop_desa') || 'Sukamakmur';
  const namaKecamatan = localStorage.getItem('kop_kecamatan') || 'Simpur';
  const namaKabupaten = localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan';
  const namaProvinsi = localStorage.getItem('kop_provinsi') || 'Kalimantan Selatan';
  const alamatKantor = localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261';
  const kontakKantor = localStorage.getItem('kop_kontak') || '081346867519 | pemdesasukamakmur@gmail.com';

  const [previewZoom, setPreviewZoom] = useState(0.45);

  const jobs = [
    'Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 'Pensiunan',
    'Petani/Pekebun', 'Buruh Tani/Perkebunan', 'Peternak', 'Nelayan/Perikanan', 'Buruh Nelayan/Perikanan',
    'Buruh Harian Lepas', 'Pedagang', 'Wiraswasta', 'Karyawan Swasta', 'Karyawan BUMN/BUMD',
    'Sopir/Ojek', 'Tukang (Kayu/Batu/Las/Jahit, dll)', 'Mekanik', 'Pembantu Rumah Tangga',
    'Guru', 'Bidan', 'Perawat', 'Ustadz/Mubaligh',
    'Perangkat Desa', 'Kepala Desa', 'ASN (Aparatur Sipil Negara)', 'PPPK (Pegawai Pemerintah dengan Perjanjian Kerja)'
  ];
  const dragProps = useDragScroll();
  const letterFont = localStorage.getItem('village_letter_font') || 'Arial, sans-serif';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (editData) {
      setNoSurat(editData.nomorSurat || editData.noSurat || '');
      setTanggalSurat(editData.tanggalSurat || new Date().toISOString().split('T')[0]);
      if (editData.anakData) setAnakData(editData.anakData);
      if (editData.rsData) setRsData(editData.rsData);
      if (editData.ayahData) setAyahData(editData.ayahData);
      if (editData.ibuData) setIbuData(editData.ibuData);
      if (editData.namaPejabat) setNamaPejabat(editData.namaPejabat);
      if (editData.jabatanPejabat) setJabatanPejabat(editData.jabatanPejabat);
      if (editData.includeCamat !== undefined) setIncludeCamat(editData.includeCamat);
    }
  }, [editData]);

  useEffect(() => {
    const fetchResidents = async () => {
      try {
        const res = await fetchResidentsCached();
        if (res.ok) {
          const data = await res.json();
          setResidents(data);
        }
      } catch (e) {}
    };

    fetchResidents();

    const configs = getLetterClassifications();
    const skl = configs.find(c => c.klasifikasi === 'SKL') || { id: 'fallback_skl', jenis: 'SKL', klasifikasi: 'SKL', kodeKlasifikasi: '474.1', noUrutTerakhir: 0 };
    
    if (!editData) {
      generateLetterNumberAsync(skl.klasifikasi, skl.kodeKlasifikasi || '474.1', isBackdate ? new Date(tanggalSurat) : undefined)
        .then(setNoSurat)
        .catch(err => console.error('Gagal generate nomor surat:', err));
    }

    const savedRiwayat = localStorage.getItem('riwayat_surat_skl');
    if (savedRiwayat) setRiwayat(JSON.parse(savedRiwayat));

    const activePejabat = resolveKadesName() || '';
    try {
      const stored = localStorage.getItem('village_officers');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find((o: any) => o.name === activePejabat);
        if (found) {
          setJabatanPejabat(found.role);
        }
      }
    } catch (e) {}
  }, []);

  const handleAyahAlamatBlur = (val: string) => {
    const parsed = parseAddress(val);
    setAyahData(prev => ({
      ...prev,
      alamat: parsed.cleanAddress,
      ...(parsed.rt ? { rt: parsed.rt } : {}),
      ...(parsed.rw ? { rw: parsed.rw } : {})
    }));
  };

  const handleIbuAlamatBlur = (val: string) => {
    const parsed = parseAddress(val);
    setIbuData(prev => ({
      ...prev,
      alamat: parsed.cleanAddress,
      ...(parsed.rt ? { rt: parsed.rt } : {}),
      ...(parsed.rw ? { rw: parsed.rw } : {})
    }));
  };

  const handleSaksiAlamatBlur = (val: string, setSaksiData: (prev: any) => any) => {
    const parsed = parseAddress(val);
    setSaksiData(prev => ({
      ...prev,
      alamat: parsed.cleanAddress,
      ...(parsed.rt ? { rt: parsed.rt } : {}),
      ...(parsed.rw ? { rw: parsed.rw } : {})
    }));
  };

  const updateResidentData = async (nik: string, data: any) => {
    if (!nik || nik.trim() === '' || nik === '-') return;
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
          body: JSON.stringify({ nik, status: 'Aktif', statusColor: 'green', ...data })
        });
      }

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Data Penduduk Diperbarui',
          message: `Data penduduk atas nama ${data.name} telah diperbarui secara otomatis melalui pembuatan SK Kelahiran.`,
          category: 'Residents'
        })
      });
    } catch (e) {
      console.error('Failed to sync resident data', e);
    }
  };

  const handleSelectAyah = (res: Resident) => {
    setSelectedResident(res);
    setAyahData(prev => ({
      ...prev,
      nik: res.nik,
      nama: capitalizeResidentFields(res).name,
      pekerjaan: res.job || '',
      alamat: capitalizeResidentFields(res).address || ''
    }));
    setSearchQuery('');
  };

  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  const requiredFields = [
    { key: 'nik', data: 'ayahData', id: 'skl-nikAyah' },
    { key: 'nama', data: 'ayahData', id: 'skl-namaAyah' },
    { key: 'tempatLahir', data: 'ayahData', id: 'skl-tempatLahirAyah' },
    { key: 'tanggalLahir', data: 'ayahData', id: 'skl-tanggalLahirAyah' },
    { key: 'pekerjaan', data: 'ayahData', id: 'skl-pekerjaanAyah' },
    { key: 'alamat', data: 'ayahData', id: 'skl-alamatAyah' },
    { key: 'nik', data: 'ibuData', id: 'skl-nikIbu' },
    { key: 'nama', data: 'ibuData', id: 'skl-namaIbu' },
    { key: 'tempatLahir', data: 'ibuData', id: 'skl-tempatLahirIbu' },
    { key: 'tanggalLahir', data: 'ibuData', id: 'skl-tanggalLahirIbu' },
    { key: 'pekerjaan', data: 'ibuData', id: 'skl-pekerjaanIbu' },
    { key: 'alamat', data: 'ibuData', id: 'skl-alamatIbu' },
    { key: 'nama', data: 'anakData', id: 'skl-namaBayi' },
    { key: 'jenisKelamin', data: 'anakData', id: 'skl-jenisKelamin' },
    { key: 'anakKe', data: 'anakData', id: 'skl-anakKe' },
    { key: 'nik', data: 'saksi1Data', id: 'skl-nikSaksi1' },
    { key: 'nama', data: 'saksi1Data', id: 'skl-namaSaksi1' },
    { key: 'tempatLahir', data: 'saksi1Data', id: 'skl-tempatLahirSaksi1' },
    { key: 'tanggalLahir', data: 'saksi1Data', id: 'skl-tanggalLahirSaksi1' },
    { key: 'pekerjaan', data: 'saksi1Data', id: 'skl-pekerjaanSaksi1' },
    { key: 'alamat', data: 'saksi1Data', id: 'skl-alamatSaksi1' },
    { key: 'nik', data: 'saksi2Data', id: 'skl-nikSaksi2' },
    { key: 'nama', data: 'saksi2Data', id: 'skl-namaSaksi2' },
    { key: 'tempatLahir', data: 'saksi2Data', id: 'skl-tempatLahirSaksi2' },
    { key: 'tanggalLahir', data: 'saksi2Data', id: 'skl-tanggalLahirSaksi2' },
    { key: 'pekerjaan', data: 'saksi2Data', id: 'skl-pekerjaanSaksi2' },
    { key: 'alamat', data: 'saksi2Data', id: 'skl-alamatSaksi2' },
  ];

  const getDataValue = (dataName: string, key: string) => {
    const data = dataName === 'ayahData' ? ayahData : dataName === 'ibuData' ? ibuData : dataName === 'anakData' ? anakData : dataName === 'saksi1Data' ? saksi1Data : saksi2Data;
    return (data as any)[key];
  };

  const validateRequired = (): boolean => {
    const empty = requiredFields.filter(f => {
      const val = getDataValue(f.data, f.key);
      return !val?.trim?.() && !String(val || '').trim();
    });
    if (empty.length === 0) {
      setInvalidFields([]);
      return true;
    }
    setInvalidFields(empty.map(f => f.id));
    const first = document.getElementById(empty[0].id);
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast(`Mohon lengkapi ${empty.length} kolom wajib yang masih kosong.`, 'error');
    return false;
  };

  
  const handleSave = async () => {
    if (!formData.namaIbu || !formData.namaAyah) {
      showToast('Mohon lengkapi nama ibu dan nama ayah.', 'error');
      return;
    }
    setLoading(true);
    
    const updatedFields = {
      nomor: nomorSurat,
      nik: formData.nik,
      nama: formData.nama,
      data: formData
    };

    try {
      if (editLetterId) {
        await updateLetterHistory(editLetterId, updatedFields);
        showToast('Surat berhasil diperbarui!', 'success');
      } else {
        await addLetterHistory({
          ...updatedFields,
          jenis: 'SKL',
          tanggal: isBackdate ? new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          status: 'Selesai'
        });
        if (!isBackdate) incrementSequenceNumber('SKL');
        showToast('Surat berhasil disimpan ke Arsip!', 'success');
      }
    } catch (err) {
      showToast('Gagal menyimpan surat: ' + (err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };
const handlePrint = async () => {
    if (!validateRequired()) return;
    if (isBackdate && !(manualSequence || '').trim()) {
      showToast('Mohon isi nomor urut surat sisipan.', 'error');
      return;
    }
    
    setLoading(true);

    // Auto update/insert to Resident Database
    await autoSyncResidentFromLetter(ayahData.nik, {
      name: ayahData.nama,
      job: ayahData.pekerjaan,
      address: ayahData.alamat,
      gender: 'Laki-laki'
    }, 'Pembuatan Surat');

    await autoSyncResidentFromLetter(ibuData.nik, {
      name: ibuData.nama,
      job: ibuData.pekerjaan,
      address: ibuData.alamat,
      gender: 'Perempuan'
    }, 'Pembuatan Surat');

    // Gunakan NIK Dummy jika belum ada NIK, format: BAYI-YYYYMMDD-HHMMSS
    const tempAnakNik = `BAYI-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`;
    await autoSyncResidentFromLetter(tempAnakNik, {
      name: anakData.nama,
      gender: anakData.jenisKelamin,
      birthPlace: anakData.tempatLahir,
      birthDate: anakData.tanggalLahir,
      address: ayahData.alamat, // Ikut alamat ayah by default
      fatherName: ayahData.nama,
      motherName: ibuData.nama,
      familyRelation: 'Anak',
      status: 'Aktif'
    }, 'Pembuatan Surat');

    const content = generateHTML();
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Cetak SKL - ${anakData.nama}</title>
          ${styles}
          <style>
            @page { size: A4; margin: 0; }
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
            }
            .printable-area {
              position: relative !important;
              width: 210mm !important;
              height: auto !important;
              min-height: 297mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              box-sizing: border-box !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              transform: none !important;
              font-family: ${letterFont};
              font-size: 13px;
              line-height: 1.5;
            };
              font-size: 13px;
              line-height: 1.5;
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
              .nomor-surat-cetak { text-transform: uppercase !important; }
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

    // Record to global history
    const payloadData = {
      nomorSurat: noSurat,
      tanggalSurat,
      rsData,
      anakData,
      ayahData,
      ibuData,
      saksi1Data,
      saksi2Data,
      namaPejabat,
      jabatanPejabat,
      includeCamat
    };

    const updatedFields = {
      nomor: noSurat,
      nik: tempAnakNik,
      nama: anakData.nama,
      keperluan: 'Surat Keterangan Kelahiran',
      data: payloadData
    };

    if (editLetterId) {
      updateLetterHistory(editLetterId, updatedFields);
    } else {
      addLetterHistory({
        ...updatedFields,
        jenis: 'SKL',
        tanggal: isBackdate ? new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'Selesai'
      });
      if (!isBackdate) incrementSequenceNumber('SKL');
    }

    const newEntry = {
      id: Date.now(),
      nama: anakData.nama,
      nomor: noSurat,
      tanggal: isBackdate ? new Date(tanggalSurat).toISOString() : new Date().toISOString(),
      data: payloadData
    };
    const updatedRiwayat = [newEntry, ...riwayat].slice(0, 50);
    setRiwayat(updatedRiwayat);
    localStorage.setItem('riwayat_surat_skl', JSON.stringify(updatedRiwayat));
    
    // Dispatch update global untuk merefresh data penduduk di halaman lain
    window.dispatchEvent(new Event('residents_updated'));

    setLoading(false);
    setSuccess(true);
  };

  const v = (val: any, fallback = '_______________________') => val ? capitalizeWords(String(val)) : fallback;
  const fmtDate = (d: string) => {
    if (!d) return '';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return d;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return d; }
  };
  
    const generateHTML = () => {
    const today = new Date();
    const printDate = isBackdate ? new Date(tanggalSurat) : today;
    const tglFormatted = printDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
    const noSuratVal = noSurat || 'SKL/146/WHI/2026';
    const cleanStr = (str, pattern) => str.replace(pattern, '').trim();
    
    const terbilang = (angka) => {
      const num = parseInt(angka);
      if (isNaN(num)) return '';
      const huruf = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
      if (num < 12) return huruf[num];
      if (num < 20) return huruf[num - 10] + " Belas";
      if (num < 100) return huruf[Math.floor(num / 10)] + " Puluh " + huruf[num % 10];
      return num.toString();
    };

    let pPengantarAnak = "Bahwa dari pernikahan tersebut telah lahir seorang anak:";
    if (rsData.namaRS) {
      pPengantarAnak = `Bahwa dari pernikahan tersebut telah lahir seorang anak di ${rsData.namaRS}${rsData.noSuratRS ? `, berdasarkan Surat Keterangan Lahir Nomor ${rsData.noSuratRS}` : ''}${rsData.tanggalSuratRS ? ` tanggal ${rsData.tanggalSuratRS}` : ''}, dengan rincian:`;
    }

    let html = `
      <div style="background:white;width:794px;min-height:1123px;padding:70px 75px 80px 75px;box-sizing:border-box;position:relative;overflow:hidden;font-family:Arial, sans-serif;color:#000;">
        
        ${generateKopSuratHTML()}



        <!-- JUDUL SURAT -->
        <div style="text-align:center;margin-bottom:10px;">
          <h2 style="font-size:14px;font-weight:bold;text-decoration:underline;margin:0 0 2px 0;text-transform:uppercase;">SURAT KETERANGAN LAHIR</h2>
          <div class="nomor-surat-cetak" style="font-size:12px;text-transform:uppercase;">Nomor: ${noSuratVal.toUpperCase()}</div>
        </div>

        <p style="text-align:justify;line-height:1.3;margin-bottom:8px;font-size:12px;text-indent:30px;">
          Yang bertanda tangan di bawah ini, Kepala Desa ${cleanStr(namaDesa, /^(desa|kelurahan)\s+/i)}, Kecamatan ${cleanStr(namaKecamatan, /^kecamatan\s+/i)}, Kabupaten ${cleanStr(namaKabupaten, /^kabupaten\s+/i)}, menerangkan dengan sebenarnya bahwa pasangan suami istri sah:
        </p>

        <p style="font-weight:bold; margin-bottom: 4px; font-size:12px;">I. DATA SUAMI (AYAH)</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:8px; margin-left:10px; line-height:1.3; font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">a.</td><td style="width:25%;vertical-align:top;">Nama Lengkap</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(ayahData.nama)}</strong></td></tr>
          <tr><td style="vertical-align:top;">b.</td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ayahData.nik)}</td></tr>
          <tr><td style="vertical-align:top;">c.</td><td style="vertical-align:top;">Tempat, Tanggal Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ayahData.tempatLahir)}, ${fmtDate(ayahData.tanggalLahir)}</td></tr>
          <tr><td style="vertical-align:top;">d.</td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ayahData.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">e.</td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;">${v(ayahData.alamat)}</td></tr>
        </table>

        <p style="font-weight:bold; margin-bottom: 4px; font-size:12px;">II. DATA ISTRI (IBU)</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:8px; margin-left:10px; line-height:1.3; font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">a.</td><td style="width:25%;vertical-align:top;">Nama Lengkap</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(ibuData.nama)}</strong></td></tr>
          <tr><td style="vertical-align:top;">b.</td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ibuData.nik)}</td></tr>
          <tr><td style="vertical-align:top;">c.</td><td style="vertical-align:top;">Tempat, Tanggal Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ibuData.tempatLahir)}, ${fmtDate(ibuData.tanggalLahir)}</td></tr>
          <tr><td style="vertical-align:top;">d.</td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ibuData.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">e.</td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;">${v(ibuData.alamat)}</td></tr>
        </table>

        <p style="text-align:justify;line-height:1.3;margin-bottom:8px;font-size:12px;">${pPengantarAnak}</p>

        <table style="width:100%; border-collapse:collapse; margin-bottom:8px; margin-left:10px; line-height:1.3; font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">a.</td><td style="width:25%;vertical-align:top;">Anak Ke-</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;">${v(anakData.anakKe)} (${terbilang(anakData.anakKe)})</td></tr>
          <tr><td style="vertical-align:top;">b.</td><td style="vertical-align:top;">Jenis Kelamin</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(anakData.jenisKelamin)}</td></tr>
          <tr><td style="vertical-align:top;">c.</td><td style="vertical-align:top;">Tanggal / Jam Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${fmtDate(anakData.tanggalLahir)} / ${v(anakData.jamLahir)} WITA</td></tr>
          <tr><td style="vertical-align:top;">d.</td><td style="vertical-align:top;">Tempat Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(anakData.tempatLahir)}</td></tr>
          <tr><td style="vertical-align:top;">e.</td><td style="vertical-align:top;">Diberi Nama</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(anakData.nama)}</strong></td></tr>
        </table>

        <p style="font-weight:bold; margin-bottom: 4px; font-size:12px;">III. SAKSI-SAKSI</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:10px; margin-left:10px; line-height:1.3; font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">1.</td><td style="width:25%;vertical-align:top;">Nama Lengkap</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(saksi1Data.nama)}</strong></td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi1Data.nik)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Tempat, Tgl Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi1Data.tempatLahir)}, ${fmtDate(saksi1Data.tanggalLahir)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi1Data.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;padding-bottom:6px;">${v(saksi1Data.alamat)}</td></tr>

          <tr><td style="vertical-align:top;">2.</td><td style="vertical-align:top;">Nama Lengkap</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(saksi2Data.nama)}</strong></td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi2Data.nik)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Tempat, Tgl Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi2Data.tempatLahir)}, ${fmtDate(saksi2Data.tanggalLahir)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi2Data.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;"></td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;">${v(saksi2Data.alamat)}</td></tr>
        </table>

        <p style="text-align:justify;line-height:1.3;margin-bottom:20px;font-size:12px;text-indent:30px;">
          Demikian Surat Keterangan Lahir ini diberikan kepada yang bersangkutan untuk dapat dipergunakan sebagaimana mestinya.
        </p>

        <!-- TANDA TANGAN -->
        ${getPrintSignatureHTML(
          namaDesa,
          tglFormatted,
          namaPejabat,
          jabatanPejabat,
          "",
          includeCamat,
          useEsignature,
          noSurat
        )}

        <!-- GLOBAL FOOTER -->
        <div style="position: absolute; bottom: 30px; left: 75px; right: 75px; text-align: center;">
          ${SAAS_CONFIG.globalFooterHTML}
        </div>
      </div>
    `;

    return html;
  };

  const filteredResidents = residents.filter(r => 
    (r.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    (r.nik || '').includes(searchQuery || '')
  ).slice(0, 5);

  return (
    <div className="space-y-6 pb-20">
      {/* Header (Reusable Standard Header) */}
      <SuratEditorHeader template={getLetterHeaderTemplate('SKL', { kode: '474.1', jenis: 'Surat Keterangan Kelahiran', deskripsi: 'Surat Keterangan Kelahiran (SKL)', nomorSurat: noSurat })}
          icon={<Baby className="w-5 h-5" />}
          onBack={onBack}
          onSave={handleSave}
          isSaving={loading}
          onPrint={handlePrint}
          printLabel="Cetak Surat"
        />

      <AnimatePresence>
        {showRiwayat && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none p-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                Riwayat Pembuatan SK Lahir
              </h2>
              <button 
                onClick={() => {
                  if (confirm('Kosongkan riwayat?')) {
                    setRiwayat([]);
                    localStorage.removeItem('riwayat_surat_skl');
                  }
                }}
                className="text-xs text-rose-500 font-bold hover:underline"
              >
                Hapus Semua
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {riwayat.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Belum ada riwayat cetak.</p>
              ) : riwayat.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    const data = item.data;
                    setNoSurat(data.nomorSurat || '');
                    setTanggalSurat(data.tanggalSurat || '');
                    setAnakData(data.anakData || anakData);
                    setRsData(data.rsData || rsData);
                    setAyahData(data.ayahData || ayahData);
                    setIbuData(data.ibuData || ibuData);
                    setSaksi1Data(data.saksi1Data || saksi1Data);
                    setSaksi2Data(data.saksi2Data || saksi2Data);
                    setNamaPejabat(data.namaPejabat || namaPejabat);
                    setJabatanPejabat(data.jabatanPejabat || jabatanPejabat);
                    setIncludeCamat(data.includeCamat || false);
                  }}
                  className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-emerald-200 hover:bg-emerald-50 cursor-pointer transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{item.nama}</p>
                      <p className="text-[10px] text-slate-400">{item.nomor || 'No Nomor'}</p>
                    </div>
                    <span className="text-[10px] text-slate-400">{new Date(item.tanggal).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-5" onKeyDownCapture={e => { if (e.key === 'Enter' && !(e.target as HTMLElement)?.closest('[data-suggest]')) { e.preventDefault(); e.stopPropagation(); } }}>

          {/* Backdate Config - Paling Atas Form */}
          <BackdateConfig
            prefix={kodeKlasifikasiSKL}
            suffix="WHI-SKL"
            tanggalSurat={tanggalSurat}
            onTanggalSuratChange={setTanggalSurat}
            isBackdate={isBackdate}
            onBackdateChange={setIsBackdate}
            manualSequence={manualSequence}
            onManualSequenceChange={setManualSequence}
            normalNomor={noSurat}
            onCustomNomorSurat={handleCustomNomorSurat}
          />      

          {/* Data Ayah */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-slate-800/30">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Ayah</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK Ayah<span className="text-emerald-500 ml-0.5">*</span></label>
                <input 
                  id="skl-nikAyah"
                  type="text"
                  placeholder="6303..."
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-nikAyah') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                  value={ayahData.nik}
                  onChange={(e) => setAyahData({...ayahData, nik: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Ayah<span className="text-emerald-500 ml-0.5">*</span></label>
                <input 
                  id="skl-namaAyah"
                  type="text"
                  placeholder="Masukkan nama ayah"
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-namaAyah') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                  value={ayahData.nama}
                  onChange={(e) => setAyahData({...ayahData, nama: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                <input id="skl-tempatLahirAyah" type="text" placeholder="Tempat Lahir" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-tempatLahirAyah') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={ayahData.tempatLahir} onChange={(e) => setAyahData({...ayahData, tempatLahir: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                <input id="skl-tanggalLahirAyah" type="date" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-tanggalLahirAyah') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={ayahData.tanggalLahir} onChange={(e) => setAyahData({...ayahData, tanggalLahir: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                <div id="skl-pekerjaanAyah">
                <SuggestCombobox
                  value={ayahData.pekerjaan}
                  onChange={(v) => setAyahData({...ayahData, pekerjaan: v})}
                  options={jobs}
                />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
<textarea
                  id="skl-alamatAyah"
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, Desa Wasah Hilir"
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none resize-none ${invalidFields.includes('skl-alamatAyah') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                  value={ayahData.alamat}
                  onChange={(e) => setAyahData({...ayahData, alamat: e.target.value})}
                  onBlur={(e) => handleAyahAlamatBlur(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Data Ibu */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-slate-800/30">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-pink-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Ibu</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK Ibu<span className="text-emerald-500 ml-0.5">*</span></label>
                <input 
                  type="text"
                  placeholder="16 digit NIK"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={ibuData.nik}
                  onChange={(e) => setIbuData({...ibuData, nik: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Ibu<span className="text-emerald-500 ml-0.5">*</span></label>
                <input 
                  type="text"
                  placeholder="Nama lengkap"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={ibuData.nama}
                  onChange={(e) => setIbuData({...ibuData, nama: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                <input id="skl-tempatLahirIbu" type="text" placeholder="Tempat Lahir" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-tempatLahirIbu') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={ibuData.tempatLahir} onChange={(e) => setIbuData({...ibuData, tempatLahir: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                <input id="skl-tanggalLahirIbu" type="date" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-tanggalLahirIbu') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={ibuData.tanggalLahir} onChange={(e) => setIbuData({...ibuData, tanggalLahir: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                <div id="skl-pekerjaanIbu">
                <SuggestCombobox
                  value={ibuData.pekerjaan}
                  onChange={(v) => setIbuData({...ibuData, pekerjaan: v})}
                  options={jobs}
                />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
<textarea
                  id="skl-alamatIbu"
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, Desa Wasah Hilir"
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none resize-none ${invalidFields.includes('skl-alamatIbu') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                  value={ibuData.alamat}
                  onChange={(e) => setIbuData(prev => ({ ...prev, alamat: e.target.value }))}
onBlur={(e) => handleIbuAlamatBlur(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Data Bayi / Anak */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-slate-800/30">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Baby className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Bayi / Anak</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap Bayi<span className="text-emerald-500 ml-0.5">*</span></label>
                <input 
                  type="text"
                  placeholder="Nama anak..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500"
                  value={anakData.nama}
                  onChange={(e) => setAnakData({...anakData, nama: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Jenis Kelamin<span className="text-emerald-500 ml-0.5">*</span></label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={anakData.jenisKelamin}
                  onChange={(e) => setAnakData({...anakData, jenisKelamin: e.target.value})}
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Anak Ke-<span className="text-emerald-500 ml-0.5">*</span></label>
                <input 
                  id="skl-anakKe"
                  type="number"
                  placeholder="Misal: 1"
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-anakKe') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                  value={anakData.anakKe}
                  onChange={(e) => setAnakData({...anakData, anakKe: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                <input 
                  type="text"
                  placeholder="Kota/Kab"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={anakData.tempatLahir}
                  onChange={(e) => setAnakData({...anakData, tempatLahir: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={anakData.tanggalLahir}
                  onChange={(e) => setAnakData({...anakData, tanggalLahir: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Jam Lahir (Opsional)</label>
                <input 
                  type="time"
                  className="w-full md:w-1/2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  value={anakData.jamLahir}
                  onChange={(e) => setAnakData({...anakData, jamLahir: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* Saksi 1 */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-slate-800/30">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-orange-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Saksi 1</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                <input id="skl-nikSaksi1" type="text" placeholder="16 digit NIK" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-nikSaksi1') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={saksi1Data.nik} onChange={(e) => setSaksi1Data({...saksi1Data, nik: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                <input id="skl-namaSaksi1" type="text" placeholder="Nama lengkap" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-namaSaksi1') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={saksi1Data.nama} onChange={(e) => setSaksi1Data({...saksi1Data, nama: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                <input id="skl-tempatLahirSaksi1" type="text" placeholder="Tempat Lahir" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-tempatLahirSaksi1') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={saksi1Data.tempatLahir} onChange={(e) => setSaksi1Data({...saksi1Data, tempatLahir: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                <input id="skl-tanggalLahirSaksi1" type="date" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-tanggalLahirSaksi1') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={saksi1Data.tanggalLahir} onChange={(e) => setSaksi1Data({...saksi1Data, tanggalLahir: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                <div id="skl-pekerjaanSaksi1">
                <SuggestCombobox
                  value={saksi1Data.pekerjaan}
                  onChange={(v) => setSaksi1Data({...saksi1Data, pekerjaan: v})}
                  options={jobs}
                />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat</label>
                <textarea
                  id="skl-alamatSaksi1"
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, Desa Wasah Hilir"
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none resize-none ${invalidFields.includes('skl-alamatSaksi1') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                  value={saksi1Data.alamat}
                  onChange={(e) => setSaksi1Data(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => handleSaksiAlamatBlur(e.target.value, setSaksi1Data)}
                />
              </div>
            </div>
          </section>

          {/* Saksi 2 */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-slate-800/30">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Saksi 2</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                <input id="skl-nikSaksi2" type="text" placeholder="16 digit NIK" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-nikSaksi2') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={saksi2Data.nik} onChange={(e) => setSaksi2Data({...saksi2Data, nik: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                <input id="skl-namaSaksi2" type="text" placeholder="Nama lengkap" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-namaSaksi2') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={saksi2Data.nama} onChange={(e) => setSaksi2Data({...saksi2Data, nama: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                <input id="skl-tempatLahirSaksi2" type="text" placeholder="Tempat Lahir" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-tempatLahirSaksi2') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={saksi2Data.tempatLahir} onChange={(e) => setSaksi2Data({...saksi2Data, tempatLahir: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                <input id="skl-tanggalLahirSaksi2" type="date" className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('skl-tanggalLahirSaksi2') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`} value={saksi2Data.tanggalLahir} onChange={(e) => setSaksi2Data({...saksi2Data, tanggalLahir: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                <div id="skl-pekerjaanSaksi2">
                <SuggestCombobox
                  value={saksi2Data.pekerjaan}
                  onChange={(v) => setSaksi2Data({...saksi2Data, pekerjaan: v})}
                  options={jobs}
                />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat</label>
                <textarea
                  id="skl-alamatSaksi2"
                  rows={2}
                  placeholder="Contoh: Jl. Keramat, Desa Wasah Hilir"
                  className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none resize-none ${invalidFields.includes('skl-alamatSaksi2') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                  value={saksi2Data.alamat}
                  onChange={(e) => setSaksi2Data(prev => ({ ...prev, alamat: e.target.value }))}
                  onBlur={(e) => handleSaksiAlamatBlur(e.target.value, setSaksi2Data)}
                />
              </div>
            </div>
          </section>

          {/* Pejabat Penandatangan */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-slate-800/30">
            <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <FileSignature className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Pejabat Penandatangan</h3>
            </div>
            <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-amber-900">Nama Pejabat</label>
                  <select 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold"
                    value={namaPejabat}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNamaPejabat(name);
                      try {
                        const stored = localStorage.getItem('village_officers');
                        if (stored) {
                          const list = JSON.parse(stored);
                          const found = list.find((o: any) => o.name === name);
                          if (found) setJabatanPejabat(found.role);
                        }
                      } catch (e) {}
                    }}
                  >
                    {(() => {
                      try {
                        const stored = localStorage.getItem('village_officers');
                        if (stored) {
                          const list = JSON.parse(stored);
                          return list.map((o: any, i: number) => (
                            <option key={i} value={o.name}>{o.name} ({o.role})</option>
                          ));
                        }
                      } catch (e) {}
                      return <option value={resolveKadesName() || 'Kepala Desa'}>{resolveKadesName() || 'Kepala Desa'} (Kepala Desa)</option>;
                    })()}
                  </select>
                </div>
              
              </div>
              
              <div className="mt-6 pt-6 border-t border-amber-100 space-y-3">
                {/* Toggle TTE / QR Code */}
                <label className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-all">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tanda Tangan Elektronik (TTE / QR Code)</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Tampilkan QR Code verifikasi dokumen resmi pada hasil cetak</div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={useEsignature} 
                      onChange={(e) => setUseEsignature(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </div>
                </label>

                {/* Toggle Mengetahui Camat */}
                <label className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-all">
                  <div className="space-y-0.5 pr-4">
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tambahkan Kolom Mengetahui Camat</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Gunakan format 2 tanda tangan (Camat di sebelah kiri)</div>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={includeCamat} 
                      onChange={(e) => setIncludeCamat(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                  </div>
                </label>
              </div>

              <p className="mt-4 text-[10px] text-amber-700 font-medium italic">
                * Nama dan jabatan pejabat dapat diatur secara permanen melalui Menu Pengaturan.
              </p>
            </div>
          </section>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[700px] sticky top-[170px]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
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
                  onClick={() => setPreviewZoom(0.38)} 
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
              className="flex-1 bg-slate-200/40 overflow-auto relative flex p-6 justify-center items-start"
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
                  style={{
                    width: '794px',
                    height: '1123px',
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    color: 'black',
                    boxSizing: 'border-box'
                  }}
                  dangerouslySetInnerHTML={{ __html: generateHTML() }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Iframe for Printing */}
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
        nomorSurat={noSurat}
        namaWarga={anakData.nama}
        jenisSurat="Surat Keterangan Kelahiran"
        onBackToTemplates={onBack}
      />
      <QuickAddResidentModal isOpen={showQuickAddModal} onClose={() => setShowQuickAddModal(false)} onSuccess={() => { setShowQuickAddModal(false); handlePrint(); }} initialData={anakData} />
</div>
  );
}
