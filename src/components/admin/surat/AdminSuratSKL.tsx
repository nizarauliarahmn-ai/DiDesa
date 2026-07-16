import { fetchResidentsCached } from '../../../utils/apiCache';
import { useLetterKode } from '../../../hooks/useLetterKode';
import { useLetterDescription } from '../../../hooks/useLetterDescription';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PrintSuccessDialog from './PrintSuccessDialog';
import { FileText, ArrowLeft, Printer, Search, User, 
  FileSignature, AlertCircle, CheckCircle2, History,
  ZoomIn, ZoomOut, Baby, Building, Users, Activity
} from 'lucide-react';
import { getLetterClassifications, incrementSequenceNumber, generateLetterNumber } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { useDragScroll } from '../../../hooks/useDragScroll';

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
  const [loading, setLoading] = useState(false);
  const templateDesc = useLetterDescription('SKL', 'Surat Keterangan Kelahiran');
  const templateKode = useLetterKode('SKL');
  const [success, setSuccess] = useState(false);
  
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);

  // State untuk Nomor dan Tanggal Surat
  const [noSurat, setNoSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);

  // Data Anak
  const [anakData, setAnakData] = useState({
    nama: '',
    jenisKelamin: 'Laki-laki',
    tempatLahir: '',
    tanggalLahir: '',
    jamLahir: '',
    anakKe: '1'
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
  const [namaPejabat, setNamaPejabat] = useState(localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD');
  const [jabatanPejabat, setJabatanPejabat] = useState('Kepala Desa');
  const [includeCamat, setIncludeCamat] = useState(false);
  
  // Kop Settings
  const namaDesa = localStorage.getItem('kop_desa') || 'Wasah Hilir';
  const namaKecamatan = localStorage.getItem('kop_kecamatan') || 'Simpur';
  const namaKabupaten = localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan';
  const namaProvinsi = localStorage.getItem('kop_provinsi') || 'Kalimantan Selatan';
  const alamatKantor = localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261';
  const kontakKantor = localStorage.getItem('kop_kontak') || '081346867519 | pemdesawasahhilir@gmail.com';

  const [previewZoom, setPreviewZoom] = useState(0.38);
  const dragProps = useDragScroll();
  const letterFont = localStorage.getItem('village_letter_font') || 'Arial, sans-serif';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (editData) {
      setNoSurat(editData.nomorSurat || editData.noSurat || '');
      setTanggalSurat(editData.tanggalSurat || new Date().toISOString().split('T')[0]);
      if (editData.anakData) setAnakData(editData.anakData);
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
      const generatedNo = generateLetterNumber(skl.klasifikasi, skl.kodeKlasifikasi || '474.1');
      setNoSurat(generatedNo);
    }

    const savedRiwayat = localStorage.getItem('riwayat_surat_skl');
    if (savedRiwayat) setRiwayat(JSON.parse(savedRiwayat));

    const activePejabat = localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD';
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
      nama: res.name,
      pekerjaan: res.job || '',
      alamat: res.address || ''
    }));
    setSearchQuery('');
  };

  const handlePrint = async () => {
    if (!anakData.nama || !ayahData.nama || !ibuData.nama) {
      showToast("Data Anak, Ayah, dan Ibu wajib diisi", "error");
      return;
    }
    
    setLoading(true);

    // Auto update/insert to Resident Database
    await updateResidentData(ayahData.nik, {
      name: ayahData.nama,
      job: ayahData.pekerjaan,
      address: ayahData.alamat,
      gender: 'Laki-laki'
    });

    await updateResidentData(ibuData.nik, {
      name: ibuData.nama,
      job: ibuData.pekerjaan,
      address: ibuData.alamat,
      gender: 'Perempuan'
    });

    // Gunakan NIK Dummy jika belum ada NIK, format: BAYI-YYYYMMDD-HHMMSS
    const tempAnakNik = `BAYI-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`;
    await updateResidentData(tempAnakNik, {
      name: anakData.nama,
      gender: anakData.jenisKelamin,
      birthPlace: anakData.tempatLahir,
      birthDate: anakData.tanggalLahir,
      address: ayahData.alamat, // Ikut alamat ayah by default
      fatherName: ayahData.nama,
      motherName: ibuData.nama,
      familyRelation: 'Anak',
      status: 'Aktif'
    });

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
            }
            .printable-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              margin: 0 !important;
              padding: 56px 75px !important; 
              box-sizing: border-box !important;
              background: white !important;
              color: black !important;
              box-shadow: none !important;
              border: none !important;
              display: block !important;
              transform: none !important;
              visibility: visible !important;
              font-family: ${letterFont};
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
        tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'Selesai'
      });
      incrementSequenceNumber('SKL');
    }

    const newEntry = {
      id: Date.now(),
      nama: anakData.nama,
      nomor: noSurat,
      tanggal: new Date().toISOString(),
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

  const v = (val: any, fallback = '_______________________') => val ? val : fallback;
  
    const generateHTML = () => {
    const today = new Date();
    const tglFormatted = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
    const noSuratVal = noSurat || 'SKL/146/WHi/2026';
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

    const KOP = `
      <div style="border-bottom:3px solid #000;padding-bottom:8px;margin-bottom:12px;display:flex;align-items:center;position:relative;">
        <div style="width:70px;height:85px;position:absolute;left:0;top:0;display:flex;align-items:center;justify-content:center;">
          <img src="${villageLogo}" style="width:100%;height:100%;object-fit:contain;" />
        </div>
        <div style="text-align:center;flex:1;padding-right:70px;padding-left:70px;">
          <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2;margin:0 0 1px 0;">PEMERINTAH KABUPATEN ${cleanStr(namaKabupaten, /^(kabupaten|kota)\s+/i).toUpperCase()}</div>
          <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2;margin:0 0 1px 0;">KECAMATAN ${cleanStr(namaKecamatan, /^kecamatan\s+/i).toUpperCase()}</div>
          <div style="font-weight:900;font-size:20px;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2;margin:2px 0 4px 0;">KANTOR KEPALA DESA ${cleanStr(namaDesa, /^(desa|kelurahan)\s+/i).toUpperCase()}</div>
          <div style="font-size:11px;line-height:1.2;margin:1px 0 0 0;">Alamat: ${alamatKantor}</div>
        </div>
      </div>
      <div style="border-top:1px solid #000;margin-top:-10px;margin-bottom:12px;"></div>
    `;

    const pageStyle = 'background:white;width:794px;min-height:1123px;padding:56px 75px;box-sizing:border-box;font-family:Arial,sans-serif;font-size:12px;color:#000;';

    const page1 = `
      <div style="${pageStyle}">
        ${KOP}
        <div style="text-align:center;margin-bottom:18px;">
          <h2 style="font-size:14px;font-weight:bold;text-decoration:underline;margin:0 0 4px 0;text-transform:uppercase;">SURAT KETERANGAN LAHIR</h2>
          <div style="font-size:12px;">Nomor: ${noSuratVal}</div>
        </div>
        <p style="text-align:justify;line-height:1.5;margin-bottom:12px;font-size:12px;text-indent:40px;">
          Yang bertanda tangan di bawah ini, Kepala Desa ${cleanStr(namaDesa, /^(desa|kelurahan)\s+/i)}, Kecamatan ${cleanStr(namaKecamatan, /^kecamatan\s+/i)}, Kabupaten ${cleanStr(namaKabupaten, /^kabupaten\s+/i)}, menerangkan dengan sebenarnya bahwa pasangan suami istri sah:
        </p>
        <p style="font-weight:bold;margin-bottom:6px;font-size:12px;">I. DATA SUAMI (AYAH)</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;margin-left:20px;line-height:1.5;font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">a.</td><td style="width:28%;vertical-align:top;">Nama Lengkap</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(ayahData.nama)}</strong></td></tr>
          <tr><td style="vertical-align:top;">b.</td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ayahData.nik)}</td></tr>
          <tr><td style="vertical-align:top;">c.</td><td style="vertical-align:top;">Tempat, Tanggal Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ayahData.tempatLahir)}, ${v(ayahData.tanggalLahir)}</td></tr>
          <tr><td style="vertical-align:top;">d.</td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ayahData.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">e.</td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;">${v(ayahData.alamat)}</td></tr>
        </table>
        <p style="font-weight:bold;margin-bottom:6px;font-size:12px;">II. DATA ISTRI (IBU)</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:12px;margin-left:20px;line-height:1.5;font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">a.</td><td style="width:28%;vertical-align:top;">Nama Lengkap</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(ibuData.nama)}</strong></td></tr>
          <tr><td style="vertical-align:top;">b.</td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ibuData.nik)}</td></tr>
          <tr><td style="vertical-align:top;">c.</td><td style="vertical-align:top;">Tempat, Tanggal Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ibuData.tempatLahir)}, ${v(ibuData.tanggalLahir)}</td></tr>
          <tr><td style="vertical-align:top;">d.</td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(ibuData.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">e.</td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;">${v(ibuData.alamat)}</td></tr>
        </table>
        <p style="text-align:justify;line-height:1.5;margin-bottom:10px;font-size:12px;">Bahwa dari pernikahan tersebut telah lahir seorang anak:</p>
        <table style="width:100%;border-collapse:collapse;margin-left:20px;line-height:1.5;font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">a.</td><td style="width:28%;vertical-align:top;">Anak Ke-</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;">${v(anakData.anakKe)} (${terbilang(anakData.anakKe)})</td></tr>
          <tr><td style="vertical-align:top;">b.</td><td style="vertical-align:top;">Jenis Kelamin</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(anakData.jenisKelamin)}</td></tr>
          <tr><td style="vertical-align:top;">c.</td><td style="vertical-align:top;">Tanggal / Jam Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(anakData.tanggalLahir)} / ${v(anakData.jamLahir)} WITA</td></tr>
          <tr><td style="vertical-align:top;">d.</td><td style="vertical-align:top;">Tempat Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(anakData.tempatLahir)}</td></tr>
          <tr><td style="vertical-align:top;">e.</td><td style="vertical-align:top;">Diberi Nama</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(anakData.nama)}</strong></td></tr>
        </table>
      </div>
    `;

    const page2 = `
      <div style="${pageStyle}margin-top:24px;">
        ${KOP}
        <p style="font-weight:bold;margin-bottom:6px;font-size:12px;">III. SAKSI-SAKSI</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;margin-left:20px;line-height:1.5;font-size:12px;">
          <tr><td style="width:4%;vertical-align:top;">1.</td><td style="width:28%;vertical-align:top;">Nama Lengkap</td><td style="width:2%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(saksi1Data.nama)}</strong></td></tr>
          <tr><td></td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi1Data.nik)}</td></tr>
          <tr><td></td><td style="vertical-align:top;">Tempat, Tanggal Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi1Data.tempatLahir)}, ${v(saksi1Data.tanggalLahir)}</td></tr>
          <tr><td></td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi1Data.pekerjaan)}</td></tr>
          <tr><td></td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;padding-bottom:14px;">${v(saksi1Data.alamat)}</td></tr>
          <tr><td style="vertical-align:top;">2.</td><td style="vertical-align:top;">Nama Lengkap</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(saksi2Data.nama)}</strong></td></tr>
          <tr><td></td><td style="vertical-align:top;">NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi2Data.nik)}</td></tr>
          <tr><td></td><td style="vertical-align:top;">Tempat, Tanggal Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi2Data.tempatLahir)}, ${v(saksi2Data.tanggalLahir)}</td></tr>
          <tr><td></td><td style="vertical-align:top;">Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(saksi2Data.pekerjaan)}</td></tr>
          <tr><td></td><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td style="text-align:justify;vertical-align:top;">${v(saksi2Data.alamat)}</td></tr>
        </table>
        <p style="text-align:justify;line-height:1.5;margin-bottom:40px;font-size:12px;text-indent:40px;">
          Demikian Surat Keterangan Lahir ini diberikan kepada yang bersangkutan untuk dapat dipergunakan sebagaimana mestinya.
        </p>
        ${getPrintSignatureHTML(namaDesa, tglFormatted, namaPejabat, jabatanPejabat, "", includeCamat)}
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    `;

    return `<div style="font-family:Arial,sans-serif;">${page1}${page2}</div>`;
  };

  const filteredResidents = residents.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.nik.includes(searchQuery)
  ).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-none sticky top-16 z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Buat SK Lahir</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">{templateKode && <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-slate-200 dark:border-slate-700 mr-2">Kode: {templateKode}</span>}<span>{templateDesc}</span></p>
          </div>
        </div>
        <div className="flex gap-2">
          
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg dark:shadow-none shadow-emerald-900/20 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Cetak Surat
          </button>
        </div>
      </div>

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
        <div className="lg:col-span-7 space-y-6">
          
          {/* Pencarian Warga (Ayah/Pelapor) */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Search className="w-4 h-4 text-emerald-600" />
              Pilih Penduduk (Ayah/Keluarga)
            </h3>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Cari NIK atau Nama Ayah..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <p className="mt-2 text-emerald-600 font-medium text-[10px]">* Memudahkan pengisian data Ayah secara otomatis.</p>
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20">
                  {filteredResidents.length > 0 ? (
                    filteredResidents.map(res => (
                      <button
                        key={res.nik}
                        onClick={() => handleSelectAyah(res)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 font-bold shrink-0">
                          {res.name[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100">{res.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">NIK: {res.nik} &bull; {res.desa}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="p-4 text-sm text-slate-500 dark:text-slate-400 italic text-center">Warga tidak ditemukan.</p>
                  )}
                </div>
              )}
            </div>
            {selectedResident && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-900">{selectedResident.name}</p>
                    <p className="text-[10px] text-emerald-700">Terpilih</p>
                  </div>
                </div>
                <button onClick={() => setSelectedResident(null)} className="text-xs font-bold text-emerald-600 hover:underline">Ganti</button>
              </div>
            )}
          </section>

          {/* Form Detail */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-8">
            {/* Informasi Surat */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Informasi Surat</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    Nomor Surat
                  </label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                    value={noSurat}
                    onChange={(e) => setNoSurat(e.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Format: [Kode]/[No]/[Tahun]. Dapat diubah manual jika perlu.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    Tanggal Surat
                  </label>
                  <input 
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                    value={tanggalSurat}
                    onChange={(e) => setTanggalSurat(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Data Bayi / Anak */}
            <div className="bg-emerald-50/30 -mx-8 px-8 py-6 border-y border-emerald-100">
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-emerald-200/50">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Baby className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-emerald-900 uppercase tracking-wide">Data Bayi / Anak</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-emerald-900">Nama Lengkap Bayi</label>
                  <input 
                    type="text"
                    placeholder="Nama anak..."
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500"
                    value={anakData.nama}
                    onChange={(e) => setAnakData({...anakData, nama: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-900">Jenis Kelamin</label>
                  <select 
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl outline-none"
                    value={anakData.jenisKelamin}
                    onChange={(e) => setAnakData({...anakData, jenisKelamin: e.target.value})}
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-900">Anak Ke-</label>
                  <input 
                    type="number"
                    placeholder="Misal: 1"
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl outline-none"
                    value={anakData.anakKe}
                    onChange={(e) => setAnakData({...anakData, anakKe: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-900">Tempat Lahir</label>
                  <input 
                    type="text"
                    placeholder="Kota/Kab"
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl outline-none"
                    value={anakData.tempatLahir}
                    onChange={(e) => setAnakData({...anakData, tempatLahir: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-emerald-900">Tanggal Lahir</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-3 bg-white border border-emerald-200 rounded-xl outline-none"
                    value={anakData.tanggalLahir}
                    onChange={(e) => setAnakData({...anakData, tanggalLahir: e.target.value})}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-emerald-900">Jam Lahir (Opsional)</label>
                  <input 
                    type="time"
                    className="w-full md:w-1/2 px-4 py-3 bg-white border border-emerald-200 rounded-xl outline-none"
                    value={anakData.jamLahir}
                    onChange={(e) => setAnakData({...anakData, jamLahir: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Data Ayah */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Ayah</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK Ayah</label>
                  <input 
                    type="text"
                    placeholder="16 digit NIK"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={ayahData.nik}
                    onChange={(e) => setAyahData({...ayahData, nik: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Ayah</label>
                  <input 
                    type="text"
                    placeholder="Nama lengkap"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={ayahData.nama}
                    onChange={(e) => setAyahData({...ayahData, nama: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input type="text" placeholder="Tempat Lahir" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={ayahData.tempatLahir} onChange={(e) => setAyahData({...ayahData, tempatLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="text" placeholder="Misal: 01 Maret 1967" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={ayahData.tanggalLahir} onChange={(e) => setAyahData({...ayahData, tanggalLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <input 
                    type="text"
                    placeholder="Pekerjaan"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={ayahData.pekerjaan}
                    onChange={(e) => setAyahData({...ayahData, pekerjaan: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                  <textarea 
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                    value={ayahData.alamat}
                    onChange={(e) => setAyahData({...ayahData, alamat: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Data Ibu */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-pink-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Ibu</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK Ibu</label>
                  <input 
                    type="text"
                    placeholder="16 digit NIK"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={ibuData.nik}
                    onChange={(e) => setIbuData({...ibuData, nik: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Ibu</label>
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
                  <input type="text" placeholder="Tempat Lahir" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={ibuData.tempatLahir} onChange={(e) => setIbuData({...ibuData, tempatLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="text" placeholder="Misal: 02 April 1971" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={ibuData.tanggalLahir} onChange={(e) => setIbuData({...ibuData, tanggalLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <input 
                    type="text"
                    placeholder="Pekerjaan"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={ibuData.pekerjaan}
                    onChange={(e) => setIbuData({...ibuData, pekerjaan: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap</label>
                  <textarea 
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                    value={ibuData.alamat}
                    onChange={(e) => setIbuData({...ibuData, alamat: e.target.value})}
                  />
                </div>
              </div>
            </div>

            
            {/* Saksi 1 */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-orange-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Saksi 1</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                  <input type="text" placeholder="16 digit NIK" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.nik} onChange={(e) => setSaksi1Data({...saksi1Data, nik: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input type="text" placeholder="Nama lengkap" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.nama} onChange={(e) => setSaksi1Data({...saksi1Data, nama: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input type="text" placeholder="Tempat Lahir" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.tempatLahir} onChange={(e) => setSaksi1Data({...saksi1Data, tempatLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="text" placeholder="Misal: 05 Maret 1988" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.tanggalLahir} onChange={(e) => setSaksi1Data({...saksi1Data, tanggalLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <input type="text" placeholder="Pekerjaan" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi1Data.pekerjaan} onChange={(e) => setSaksi1Data({...saksi1Data, pekerjaan: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat</label>
                  <textarea rows={2} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none" value={saksi1Data.alamat} onChange={(e) => setSaksi1Data({...saksi1Data, alamat: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Saksi 2 */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Saksi 2</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                  <input type="text" placeholder="16 digit NIK" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.nik} onChange={(e) => setSaksi2Data({...saksi2Data, nik: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input type="text" placeholder="Nama lengkap" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.nama} onChange={(e) => setSaksi2Data({...saksi2Data, nama: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input type="text" placeholder="Tempat Lahir" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.tempatLahir} onChange={(e) => setSaksi2Data({...saksi2Data, tempatLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input type="text" placeholder="Misal: 12 Januari 1991" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.tanggalLahir} onChange={(e) => setSaksi2Data({...saksi2Data, tanggalLahir: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <input type="text" placeholder="Pekerjaan" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={saksi2Data.pekerjaan} onChange={(e) => setSaksi2Data({...saksi2Data, pekerjaan: e.target.value})} />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat</label>
                  <textarea rows={2} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none" value={saksi2Data.alamat} onChange={(e) => setSaksi2Data({...saksi2Data, alamat: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Pejabat Penandatangan */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <FileSignature className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">Pejabat Penandatangan</h3>
              </div>
              <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        return <option value="FAZAKKIR RAHMAD">FAZAKKIR RAHMAD (Kepala Desa)</option>;
                      })()}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-amber-900">Jabatan</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl outline-none font-medium"
                      value={jabatanPejabat}
                      onChange={(e) => setJabatanPejabat(e.target.value)}
                    />
                  </div>
                
                </div>
                
                <div className="mt-6 pt-6 border-t border-amber-100">
                  <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors">
                    <input 
                      type="checkbox"
                      checked={includeCamat}
                      onChange={(e) => setIncludeCamat(e.target.checked)}
                      className="w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tambahkan Kolom Mengetahui Camat</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gunakan format 2 tanda tangan (Camat di sebelah kiri)</div>
                    </div>
                  </label>
                </div>

                <p className="mt-4 text-[10px] text-amber-700 font-medium italic">
                  * Nama dan jabatan pejabat dapat diatur secara permanen melalui Menu Pengaturan.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Preview Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-emerald-900 text-xs">Informasi Penting & Cetak</h4>
              <p className="text-[11px] text-emerald-700 mt-1 leading-relaxed">
                Pastikan data orang tua dan anak sudah sesuai dengan KTP/KK terbaru. 
                Gunakan fitur pencarian untuk meminimalkan kesalahan pengetikan. Jika tombol cetak tidak merespon, silakan gunakan menu <strong>Buka di Tab Baru</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[600px] sticky top-[170px]">
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
              className="flex-1 bg-slate-200/40 overflow-auto relative flex p-8"
            >
              <div 
                style={{
                  width: `${794 * previewZoom}px`,
                  height: `${(1123 * 2 + 24) * previewZoom}px`,
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
                    fontFamily: letterFont,
                    fontSize: '13px',
                    lineHeight: '1.45',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    color: 'black',
                    boxSizing: 'border-box',
                    padding: '56px 75px',
                    background: 'white'
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
    </div>
  );
}
