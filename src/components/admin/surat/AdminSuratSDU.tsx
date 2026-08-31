import SuratEditorHeader, { getLetterHeaderTemplate } from './SuratEditorHeader';
import { useBackdateNumber } from '../../../hooks/useBackdateNumber';
import BackdateConfig from './BackdateConfig';
import { generateKopSuratHTML } from '../../../utils/letterFormat';
import { resolveKadesName } from '../../../utils/letterOfficers';
import { parseAddress } from '../../../utils/addressParser';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PrintSuccessDialog from './PrintSuccessDialog';
import { User, Store, FileSignature, AlertCircle, History,
  ZoomIn, ZoomOut
} from 'lucide-react';
import { getLetterClassifications, incrementSequenceNumber, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { capitalizeResidentFields, capitalizeWords } from '../../../utils/textUtils';
import { useDragScroll } from '../../../hooks/useDragScroll';
import QuickAddResidentModal from '../penduduk/QuickAddResidentModal';
import { UnifiedResidentSearch } from '../penduduk/UnifiedResidentSearch';
import { SuggestCombobox } from './SuggestCombobox';
import { checkResidentExists } from '../../../utils/residentSync';

const BUSINESS_CATEGORIES = [
  "Perdagangan Umum",
  "Jasa",
  "Kuliner / Rumah Makan",
  "Pertanian / Agrobisnis",
  "Peternakan",
  "Perikanan",
  "Industri Kecil / Kerajinan",
  "Kesehatan / Farmasi",
  "Pendidikan / Kursus",
  "Lainnya (Tulis Kustom...)"
];

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

export default function AdminSuratSDU({ 
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
  const [tanggalSurat, setTanggalSurat] = useState(new Date().toISOString().split('T')[0]);
  const backdateKlas = getLetterClassifications().find(c => c.klasifikasi === 'SDU') || { klasifikasi: 'SDU', kodeKlasifikasi: '400' };
  const kodeKlasifikasiSDU = backdateKlas.kodeKlasifikasi || '400';
  const { isBackdate, setIsBackdate } = useBackdateNumber(tanggalSurat, backdateKlas.klasifikasi, backdateKlas.kodeKlasifikasi);
  const [manualSequence, setManualSequence] = useState('');

  const handleCustomNomorSurat = (nomor: string) => {
    setFormData((prev: any) => ({ ...prev, nomorSurat: nomor }));
  };

  // Auto-generate nomor surat saat membuat surat baru (mode normal)
  useEffect(() => {
    if (!editData && !formData.nomorSurat) {
      generateLetterNumberAsync(backdateKlas.klasifikasi, backdateKlas.kodeKlasifikasi)
        .then(generatedNo => setFormData((prev: any) => ({ ...prev, nomorSurat: generatedNo })))
        .catch(err => console.error('Gagal generate nomor surat:', err));
    }
  }, [editData]);

  const [loading, setLoading] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddInitialData, setQuickAddInitialData] = useState<{nik?: string, name?: string}>({});
  const [useEsignature, setUseEsignature] = useState(true);
  const [success, setSuccess] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChild, setSelectedChild] = useState<Resident | null>(null);
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);

  // Prefill in edit mode
  useEffect(() => {
    if (editData) {
      setFormData(prev => ({ ...prev, ...editData }));
    }
  }, [editData]);

  // Form Data
  const [formData, setFormData] = useState({
    nomorSurat: '',
    
    // Data Usaha
    namaUsaha: '',
    bidangUsaha: '',
    alamatUsaha: '',

    // Data Penduduk
    nama: '',
    nik: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'Laki-Laki',
    agama: 'Islam',
    pekerjaan: '',
    kewarganegaraan: 'Indonesia',
    statusPerkawinan: 'Belum Kawin',
    rt: '001',
    rw: '001',
    alamat: '',
    alamatSekarang: '',
    rtSekarang: '001',
    rwSekarang: '001',
    desaSekarang: '',
    kecamatanSekarang: '',
    kabupatenSekarang: '',
    provinsiSekarang: '',
    keperluan: 'Administrasi Kependudukan',
    sifatDomisili: 'Menetap',
    
    // Pejabat
    namaPejabat: resolveKadesName() || '',
    jabatanPejabat: 'Kepala Desa',
    includeCamat: false,
    
    // Kop Settings
    namaDesa: localStorage.getItem('kop_desa') || 'Sukamakmur',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || 'Simpur',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan',
    namaProvinsi: localStorage.getItem('kop_provinsi') || 'Kalimantan Selatan',
    alamatKantor: localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261',
    kontakKantor: localStorage.getItem('kop_kontak') || '081346867519 | pemdesasukamakmur@gmail.com',
    tampilkanDesa: true,
    tampilkanKecamatan: true,
    tampilkanKabupaten: true,
  });

  const [previewZoom, setPreviewZoom] = useState(0.45);
  const dragProps = useDragScroll();
  const letterFont = localStorage.getItem('village_letter_font') || 'Arial, sans-serif';
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [previewIframeReady, setPreviewIframeReady] = useState(false);

  const jobs = [
    'Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 'Pensiunan',
    'Petani/Pekebun', 'Buruh Tani/Perkebunan', 'Peternak', 'Nelayan/Perikanan', 'Buruh Nelayan/Perikanan',
    'Buruh Harian Lepas', 'Pedagang', 'Wiraswasta', 'Karyawan Swasta', 'Karyawan BUMN/BUMD',
    'Sopir/Ojek', 'Tukang (Kayu/Batu/Las/Jahit, dll)', 'Mekanik', 'Pembantu Rumah Tangga',
    'Guru', 'Bidan', 'Perawat', 'Ustadz/Mubaligh',
    'Perangkat Desa', 'Kepala Desa', 'ASN (Aparatur Sipil Negara)', 'PPPK (Pegawai Pemerintah dengan Perjanjian Kerja)'
  ];

  const updateResidentData = async (nik: string, data: any) => {
    if (!nik || nik === '-') return;
    try {
      const checkRes = await fetch(`/api/residents`);
      const allResidents = await checkRes.json();
      const existing = allResidents.find((r: any) => r.nik === nik);

      const computedInitials = data.name 
        ? data.name.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase() 
        : 'W';

      const birthYear = data.birthDate ? new Date(data.birthDate).getFullYear() : 0;
      const computedAge = birthYear ? (new Date().getFullYear() - birthYear) : 30;

      const maritalStatus = data.statusPerkawinan || (existing ? existing.status : 'Belum Kawin');
      const maritalStatusColor = (maritalStatus === 'Kawin') ? 'emerald' : 'gray';

      const residentData = {
        name: data.name,
        birthPlace: data.birthPlace,
        birthDate: data.birthDate,
        gender: data.gender,
        genderColor: data.gender === 'Perempuan' ? 'pink' : 'blue',
        religion: data.religion,
        job: data.job,
        status: maritalStatus,
        statusColor: maritalStatusColor,
        address: data.address,
        rt: data.rt || '001',
        rw: data.rw || '001',
        rtRw: `${data.rt || '001'} / ${data.rw || '001'}`,
        rt_rw: `${data.rt || '001'}/${data.rw || '001'}`,
        domicileStatus: data.sifatDomisili === 'Menetap' ? 'Sesuai KTP' : 'Domisili Sementara',
        desa: data.desa || localStorage.getItem('kop_desa') || 'Sukamakmur',
        initials: existing ? (existing.initials || computedInitials) : computedInitials,
        age: existing ? (existing.age || computedAge) : computedAge,
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

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: existing ? 'Data Penduduk Diperbarui' : 'Penduduk Baru Terdaftar',
          message: existing 
            ? `Data penduduk atas nama ${data.name} (NIK: ${nik}) telah diperbarui secara otomatis melalui pembuatan SDU.`
            : `Penduduk baru atas nama ${data.name} (NIK: ${nik}) telah ditambahkan ke database dengan status ${residentData.domicileStatus} secara otomatis melalui pembuatan SDU.`,
          category: 'Residents'
        })
      });
    } catch (e) {
      console.error('Failed to sync resident data', e);
    }
  };

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
    let sktm = configs.find(c => (c.klasifikasi === 'SDP' || c.klasifikasi === 'SDU' || c.klasifikasi === 'SDUPR'));
    if (!sktm) {
      sktm = { id: 'fallback_sdp', jenis: 'SK DOMISILI USAHA', klasifikasi: 'SDU', kodeKlasifikasi: '145', noUrutTerakhir: 0 };
    }
    
    

    const savedRiwayat = localStorage.getItem('riwayat_surat_sktm');
    if (savedRiwayat) setRiwayat(JSON.parse(savedRiwayat));

    const activePejabat = resolveKadesName() || '';
    try {
      const stored = localStorage.getItem('village_officers');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find((o: any) => o.name === activePejabat);
        if (found) {
          setFormData(prev => ({ ...prev, jabatanPejabat: found.role }));
        }
      }
    } catch (e) {}
    
    if (presetResident) {
      const res = presetResident;
      setSelectedChild(res);
      const rt_rw = res.rt_rw || '001/001';
      const [rt, rw] = rt_rw.split('/');
      setFormData(prev => ({
        ...prev,
        nama: capitalizeResidentFields(res).name,
        nik: res.nik,
        tempatLahir: capitalizeResidentFields(res).birthPlace,
        tanggalLahir: res.birthDate,
        jenisKelamin: res.gender || 'Laki-Laki',
        agama: res.religion || 'Islam',
        pekerjaan: res.job || '',
        alamat: capitalizeResidentFields(res).address,
        rt: rt || '001',
        rw: rw || '001',
      }));
    }
  }, []);

  const handleSelectResident = (res: Resident) => {
    setSelectedChild(res);
    const rt_rw = (res as any).rt_rw || '001/001';
    const [rt, rw] = rt_rw.split('/');

    setFormData(prev => ({
      ...prev,
      nama: capitalizeResidentFields(res).name,
      nik: res.nik,
      tempatLahir: capitalizeResidentFields(res).birthPlace,
      tanggalLahir: res.birthDate,
      jenisKelamin: res.gender || 'Laki-Laki',
      agama: (res as any).religion || 'Islam',
      pekerjaan: res.job || '',
      alamat: capitalizeResidentFields(res).address,
      rt: rt || '001',
      rw: rw || '001',
    }));
    setSearchQuery('');
  };

  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  const requiredFields = [
    { key: 'jenisKelamin', id: 'sdu-jenisKelamin' },
    { key: 'agama', id: 'sdu-agama' },
    { key: 'pekerjaan', id: 'sdu-pekerjaan' },
    { key: 'statusPerkawinan', id: 'sdu-statusPerkawinan' },
    { key: 'tempatLahir', id: 'sdu-tempatLahir' },
    { key: 'tanggalLahir', id: 'sdu-tanggalLahir' },
    { key: 'alamat', id: 'sdu-alamat' },
    { key: 'kewarganegaraan', id: 'sdu-kewarganegaraan' },
    { key: 'sifatDomisili', id: 'sdu-sifatDomisili' },
    { key: 'alamatSekarang', id: 'sdu-alamatSekarang' },
  ];

  const validateRequired = (): boolean => {
    const empty = requiredFields.filter(f => !(formData as any)[f.key]?.trim());
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

  const handlePrint = async (skipCheck = false) => {
    if (!validateRequired()) return;
    if (isBackdate && !(manualSequence || '').trim()) {
      showToast('Mohon isi nomor urut surat sisipan.', 'error');
      return;
    }
    setLoading(true);
    if (!skipCheck && (formData.nama || formData.nik)) {
      setLoading(true);
      const exists = await checkResidentExists(formData.nik, formData.nama);
      setLoading(false);
      if (!exists) {
        setShowQuickAddModal(true);
        return;
      }
    }


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
          <title>Cetak SDU - ${formData.nama}</title>
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
              padding: 56px 75px !important; /* matches preview's padding precisely */
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
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    // Record to global history
    const updatedFields = {
      nomor: formData.nomorSurat,
      nik: formData.nik,
      nama: formData.nama,
      keperluan: formData.keperluan,
      data: formData
    };

    if (editLetterId) {
      updateLetterHistory(editLetterId, updatedFields);
    } else {
      addLetterHistory({
        ...updatedFields,
        jenis: 'SDU',
        tanggal: isBackdate ? new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'Selesai'
      });
      const configs = getLetterClassifications();
      const SDUConfig = configs.find(c => (c.klasifikasi === 'SDU' || c.klasifikasi === 'SDP' || c.klasifikasi === 'SDUPR')) || { klasifikasi: 'SDU' };
      if (!isBackdate) incrementSequenceNumber(SDUConfig.klasifikasi);
    }

    const newEntry = {
      id: Date.now(),
      nama: formData.nama,
      nomor: formData.nomorSurat,
      tanggal: isBackdate ? new Date(tanggalSurat).toISOString() : new Date().toISOString(),
      data: formData
    };
    const updatedRiwayat = [newEntry, ...riwayat].slice(0, 50);
    setRiwayat(updatedRiwayat);
    localStorage.setItem('riwayat_surat_sktm', JSON.stringify(updatedRiwayat));
    setLoading(false);
    setSuccess(true);
  };

  const v = (val: string, fallback = '-') => (val && val.trim() !== '' ? capitalizeWords(val) : fallback);
  
  const generateHTML = () => {
    const today = new Date();
    const printDate = isBackdate ? new Date(tanggalSurat) : today;
    const tglFormatted = printDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';

    const activeKabupaten = localStorage.getItem('kop_kabupaten') || formData.namaKabupaten || 'Hulu Sungai Selatan';
    const activeKecamatan = localStorage.getItem('kop_kecamatan') || formData.namaKecamatan || 'Simpur';
    const activeDesa = localStorage.getItem('kop_desa') || formData.namaDesa || 'Sukamakmur';
    const activeAlamat = localStorage.getItem('kop_alamat') || formData.alamatKantor || 'Jalan Keramat RT.002 RK.001 Kodepos 71261';
    const activeProvinsi = localStorage.getItem('kop_provinsi') || formData.namaProvinsi || 'Kalimantan Selatan';

    const cleanStr = (s: string, regex: RegExp) => (s || "").replace(regex, "");
    const fmtDate = (d: string) => {
      if (!d) return '';
      try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return d;
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) { return d; }
    };

    return `
      ${generateKopSuratHTML()}



      <!-- JUDUL SURAT -->
      <div style="text-align:center;margin-bottom:15px;">
        <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">Surat Keterangan Domisili Usaha</h3>
        <p class="nomor-surat-cetak" style="margin:2px 0 0 0;font-size:14px;text-transform:uppercase;">Nomor : ${v(formData.nomorSurat, '... / ... / ... / ' + (typeof printDate !== 'undefined' ? printDate : new Date()).getFullYear()).toUpperCase()}</p>
      </div>

      <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
        Yang bertanda tangan di bawah ini:
      </p>
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.6;font-size:14px;">
        <tr><td style="width:30%;">a. Nama</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(formData.namaPejabat)}</strong></td></tr>
        <tr><td>b. Jabatan</td><td>:</td><td><strong style="text-transform:uppercase;">${v(formData.jabatanPejabat)} ${activeDesa.toUpperCase()}</strong></td></tr>
      </table>

      <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
        Menerangkan bahwa:
      </p>

      <!-- DATA USAHA -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.6;font-size:14px;">
        <tr><td style="width:38%;vertical-align:top;">a. Nama Perusahaan / Usaha</td><td style="width:3%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(formData.namaUsaha)}</strong></td></tr>
        <tr><td style="vertical-align:top;">b. Bidang Usaha</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(formData.bidangUsaha)}</td></tr>
        <tr><td style="vertical-align:top;">c. Alamat Usaha</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(formData.alamatUsaha)}</td></tr>
      </table>

      <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">
        Adalah benar milik penanggung jawab / pimpinan di bawah ini:
      </p>

      <!-- DATA PIMPINAN -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.6;font-size:14px;">
        <tr><td style="width:38%;vertical-align:top;">a. Nama</td><td style="width:3%;vertical-align:top;">:</td><td style="vertical-align:top;"><strong style="text-transform:uppercase;">${v(formData.nama)}</strong></td></tr>
        <tr><td style="vertical-align:top;">b. NIK</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(formData.nik)}</td></tr>
        <tr><td style="vertical-align:top;">c. Jenis Kelamin</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(formData.jenisKelamin)}</td></tr>
        <tr><td style="vertical-align:top;">d. Tempat, Tgl Lahir</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(formData.tempatLahir)}, ${fmtDate(formData.tanggalLahir)}</td></tr>
        <tr><td style="vertical-align:top;">e. Pekerjaan</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(formData.pekerjaan)}</td></tr>
        <tr><td style="vertical-align:top;">f. Agama</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(formData.agama)}</td></tr>
        <tr><td style="vertical-align:top;">g. Alamat</td><td style="vertical-align:top;">:</td><td style="vertical-align:top;">${v(formData.alamat)} RT.${v(formData.rt)} RW.${v(formData.rw)}${formData.tampilkanDesa || formData.tampilkanKecamatan || formData.tampilkanKabupaten ? `<br/>${formData.tampilkanDesa ? `Desa ${cleanStr(v(formData.namaDesa), /^(desa|kelurahan)\s+/i)}` : ''}${formData.tampilkanDesa && formData.tampilkanKecamatan ? ' ' : ''}${formData.tampilkanKecamatan ? `Kecamatan ${cleanStr(v(formData.namaKecamatan), /^kecamatan\s+/i)}` : ''}${formData.tampilkanKecamatan && formData.tampilkanKabupaten ? ', ' : formData.tampilkanDesa && !formData.tampilkanKecamatan && formData.tampilkanKabupaten ? ', ' : ''}${formData.tampilkanKabupaten ? `Kab. ${cleanStr(v(formData.namaKabupaten), /^(pemerintah\s+)?(kabupaten|kota)\s+/i)}` : ''}` : ''}</td></tr>
      </table>

            <!-- PERNYATAAN -->
      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar memiliki fasilitas tempat usaha operasional yang berdomisili di wilayah administrasi desa kami.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">
        Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi legalitas usaha.
      </p>

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:25px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>

      <!-- TANDA TANGAN -->
      ${getPrintSignatureHTML(
        formData.namaDesa,
        tglFormatted,
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
        formData.includeCamat,
        useEsignature,
        formData.nomorSurat
      )}
      <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    `;
  };

  // Render preview content into isolated iframe for pixel-perfect parity with print engine
  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentWindow?.document;
      if (!doc) return;
      const content = generateHTML();
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');
      doc.open();
      doc.write(`
        <html>
          <head>
            ${styles}
            <style>
              @page { size: A4 portrait; margin: 0 !important; }
              html, body {
                margin: 0;
                padding: 0;
                background: white;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                width: 794px;
                height: 1123px;
                overflow: hidden;
              }
              .page, .print-page {
                width: 794px;
                height: 1123px;
                margin: 0;
                padding: 0;
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
                width: 794px !important;
                height: 1123px !important;
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
              .crop-mark { display: none !important; }
              @media print {
                html, body, .page, .print-page {
                  width: 210mm;
                  height: 297mm;
                }
                body * { visibility: hidden; }
                .print-container, .print-container * { visibility: visible; }
                .print-container {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                }
                .printable-area {
                  width: 210mm !important;
                  height: 297mm !important;
                }
                .nomor-surat-cetak { text-transform: uppercase !important; }
              }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="printable-area bg-white text-black">
                ${content}
              </div>
            </div>
          </body>
        </html>
      `);
      doc.close();
    } catch (e) {
      console.error('Preview iframe error:', e);
    }
  }, [formData, previewIframeReady]);

  const filteredResidents = residents.filter(r => 
    (r.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
    (r.nik || '').includes(searchQuery || '')
  ).slice(0, 5);

  return (
    <div className="space-y-6 pb-20">
      {/* Header (Reusable Standard Header) */}
      <SuratEditorHeader 
          template={getLetterHeaderTemplate('SDU', { kode: '400', jenis: 'Surat Keterangan Domisili Usaha', deskripsi: 'Surat Keterangan Domisili Usaha (SDU)', nomorSurat: formData.nomorSurat })}
          icon={<Store className="w-5 h-5" />}
          onBack={onBack}
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
                Riwayat Pembuatan SDU
              </h2>
              <button 
                onClick={() => {
                  if (confirm('Kosongkan riwayat?')) {
                    setRiwayat([]);
                    localStorage.removeItem('riwayat_surat_sktm');
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
                  onClick={() => setFormData(item.data)}
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
        <div className="lg:col-span-7 space-y-6" onKeyDownCapture={e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); } }}>

          {/* Backdate Config - Paling Atas Form */}
          <BackdateConfig
            prefix={kodeKlasifikasiSDU}
            suffix="WHI-SDU"
            tanggalSurat={tanggalSurat}
            onTanggalSuratChange={setTanggalSurat}
            isBackdate={isBackdate}
            onBackdateChange={setIsBackdate}
            manualSequence={manualSequence}
            onManualSequenceChange={setManualSequence}
            normalNomor={formData.nomorSurat}
            onCustomNomorSurat={handleCustomNomorSurat}
          />


          {/* Form Detail */}
          <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none space-y-8">
            {/* Data Usaha */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <span className="text-emerald-600 text-lg">🏢</span>
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Usaha</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Perusahaan / Usaha<span className="text-emerald-500 ml-0.5">*</span></label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.namaUsaha || ''}
                    onChange={(e) => setFormData({...formData, namaUsaha: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Bidang Usaha<span className="text-emerald-500 ml-0.5">*</span></label>
                  <select 
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={BUSINESS_CATEGORIES.includes(formData.bidangUsaha) ? formData.bidangUsaha : (formData.bidangUsaha ? "Lainnya (Tulis Kustom...)" : "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "Lainnya (Tulis Kustom...)") {
                        setFormData({...formData, bidangUsaha: ""});
                      } else {
                        setFormData({...formData, bidangUsaha: val});
                      }
                    }}
                  >
                    <option value="" disabled>-- Pilih Bidang Usaha --</option>
                    {BUSINESS_CATEGORIES.map((cat, idx) => (
                      <option key={idx} value={cat}>{cat}</option>
                    ))}
                  </select>

                  {(!BUSINESS_CATEGORIES.includes(formData.bidangUsaha) || formData.bidangUsaha === '') && (
                    <input 
                      type="text" 
                      value={formData.bidangUsaha}
                      onChange={(e) => setFormData({...formData, bidangUsaha: e.target.value})}
                      placeholder="Tulis bidang usaha kustom..."
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none mt-2"
                    />
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Usaha<span className="text-emerald-500 ml-0.5">*</span></label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-y min-h-[80px]"
                    value={formData.alamatUsaha || ''}
                    onChange={(e) => setFormData({...formData, alamatUsaha: e.target.value})}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Data Penduduk */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Penanggung Jawab / Pimpinan</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <UnifiedResidentSearch
                  formData={formData}
                  setFormData={setFormData}
                  residents={residents}
                  onOpenQuickAdd={(nik, name) => {
                    setQuickAddInitialData({ nik: nik || formData.nik, name: name || formData.nama || (formData as any).name || (formData as any).namaAyah || (formData as any).namaIbu });
                    setShowQuickAddModal(true);
                  }}
                />
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Jenis Kelamin<span className="text-emerald-500 ml-0.5">*</span></label>
                  <select 
                    id="sdu-jenisKelamin"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('sdu-jenisKelamin') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                    value={formData.jenisKelamin}
                    onChange={(e) => setFormData({...formData, jenisKelamin: e.target.value})}
                  >
                    <option value="Laki-Laki">Laki-Laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Agama<span className="text-emerald-500 ml-0.5">*</span></label>
                  <select 
                    id="sdu-agama"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('sdu-agama') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                    value={formData.agama}
                    onChange={(e) => setFormData({...formData, agama: e.target.value})}
                  >
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Budha">Budha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan<span className="text-emerald-500 ml-0.5">*</span></label>
                  <div id="sdu-pekerjaan">
                  <SuggestCombobox
                    value={formData.pekerjaan}
                    onChange={(v) => setFormData({...formData, pekerjaan: v})}
                    options={jobs}
                  />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Status Perkawinan<span className="text-emerald-500 ml-0.5">*</span></label>
                  <select 
                    id="sdu-statusPerkawinan"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('sdu-statusPerkawinan') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                    value={formData.statusPerkawinan}
                    onChange={(e) => setFormData({...formData, statusPerkawinan: e.target.value})}
                  >
                    <option value="Belum Kawin">Belum Kawin</option>
                    <option value="Kawin">Kawin</option>
                    <option value="Cerai Hidup">Cerai Hidup</option>
                    <option value="Cerai Mati">Cerai Mati</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir<span className="text-emerald-500 ml-0.5">*</span></label>
                  <input 
                    id="sdu-tempatLahir"
                    type="text"
                    placeholder="Kandangan"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('sdu-tempatLahir') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                    value={formData.tempatLahir}
                    onChange={(e) => setFormData({...formData, tempatLahir: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir<span className="text-emerald-500 ml-0.5">*</span></label>
                  <input 
                    id="sdu-tanggalLahir"
                    type="date"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none ${invalidFields.includes('sdu-tanggalLahir') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                    value={formData.tanggalLahir}
                    onChange={(e) => setFormData({...formData, tanggalLahir: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RT</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      value={formData.rt}
                      onChange={(e) => setFormData({...formData, rt: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RW</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      value={formData.rw}
                      onChange={(e) => setFormData({...formData, rw: e.target.value})}
                    />
                  </div>
                </div>
<div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap<span className="text-emerald-500 ml-0.5">*</span></label>
                  <textarea 
                    id="sdu-alamat"
                    rows={2}
                    placeholder="Jl. Keramat, Dusun Mawar"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none resize-none ${invalidFields.includes('sdu-alamat') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                    value={formData.alamat}
                    onChange={(e) => setFormData(prev => ({ ...prev, alamat: e.target.value }))}
                    onBlur={(e) => {
    const val = e.target.value;
    const parsed = parseAddress(val);
    setFormData(prev => ({
      ...prev,
      alamat: parsed.cleanAddress,
      ...(parsed.rt ? { rt: parsed.rt } : {}),
      ...(parsed.rw ? { rw: parsed.rw } : {})
    }));
  }}
                  />
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-4 mt-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input type="checkbox" checked={formData.tampilkanDesa} onChange={(e) => setFormData(prev => ({ ...prev, tampilkanDesa: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    Tampilkan "Desa ..."
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input type="checkbox" checked={formData.tampilkanKecamatan} onChange={(e) => setFormData(prev => ({ ...prev, tampilkanKecamatan: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    Tampilkan "Kecamatan ..."
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input type="checkbox" checked={formData.tampilkanKabupaten} onChange={(e) => setFormData(prev => ({ ...prev, tampilkanKabupaten: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    Tampilkan "Kab. ..."
                  </label>
                </div>
                <div className="md:col-span-1 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Kewarganegaraan<span className="text-emerald-500 ml-0.5">*</span></label>
                  <select 
                    id="sdu-kewarganegaraan"
                    className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none appearance-none ${invalidFields.includes('sdu-kewarganegaraan') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                    value={formData.kewarganegaraan}
                    onChange={(e) => setFormData({...formData, kewarganegaraan: e.target.value})}
                  >
                    <option value="Indonesia">Indonesia</option>
                    <option value="Asing">Asing</option>
                  </select>
                </div>
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Jalan / Nama Tempat (Sekarang)<span className="text-emerald-500 ml-0.5">*</span></label>
                      <textarea 
                        id="sdu-alamatSekarang"
                        rows={2}
                        className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none resize-none ${invalidFields.includes('sdu-alamatSekarang') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                        value={formData.alamatSekarang}
                        onChange={(e) => {
  const val = e.target.value;
  const parsed = parseAddress(val);
  setFormData(prev => ({
    ...prev,
    alamatSekarang: parsed.cleanAddress,
    ...(parsed.rt ? { rtSekarang: parsed.rt } : {}),
    ...(parsed.rw ? { rwSekarang: parsed.rw } : {}),
    ...(parsed.desa ? { desaSekarang: parsed.desa } : {}),
    ...(parsed.kec ? { kecamatanSekarang: parsed.kec } : {})
  }));
}}
                        placeholder="Contoh: Jl. Bungur Raya No. 12"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RT (Sekarang)</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                          value={formData.rtSekarang}
                          onChange={(e) => setFormData({...formData, rtSekarang: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RW (Sekarang)</label>
                        <input 
                          type="text"
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                          value={formData.rwSekarang}
                          onChange={(e) => setFormData({...formData, rwSekarang: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Sifat Domisili<span className="text-emerald-500 ml-0.5">*</span></label>
                    <select 
                      id="sdu-sifatDomisili"
                      className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none appearance-none ${invalidFields.includes('sdu-sifatDomisili') ? 'border-red-500 ring-2 ring-red-200' : 'border-slate-200 dark:border-slate-700'}`}
                      value={formData.sifatDomisili}
                      onChange={(e) => setFormData({...formData, sifatDomisili: e.target.value})}
                    >
                      <option value="Menetap">Menetap</option>
                      <option value="Sementara">Sementara</option>
                    </select>
                    <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Status kependudukan saat ini.</p>
                  </div>
              </div>
              </div>
            </div>
          </section>

            {/* Pejabat Penandatangan */}
            <section className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none mt-6">
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
                      value={formData.namaPejabat}
                      onChange={(e) => {
                        const name = e.target.value;
                        setFormData(prev => ({ ...prev, namaPejabat: name }));
                        // Update role if found
                        try {
                          const stored = localStorage.getItem('village_officers');
                          if (stored) {
                            const list = JSON.parse(stored);
                            const found = list.find((o: any) => o.name === name);
                            if (found) setFormData(prev => ({ ...prev, jabatanPejabat: found.role }));
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
                        checked={formData.includeCamat} 
                        onChange={(e) => setFormData(prev => ({ ...prev, includeCamat: e.target.checked }))}
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
              className="flex-1 bg-slate-200/40 overflow-auto relative flex p-6 justify-center items-start"
            >
                <div 
                  style={{
                    width: '794px',
                    height: '1123px',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                    borderRadius: '12px',
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'top center'
                  }}
                  className="m-auto shrink-0 relative bg-white"
                >
                  <iframe 
                    ref={(el) => {
                      (previewIframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = el;
                      if (el) setPreviewIframeReady(true);
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      display: 'block',
                      background: 'white'
                    }}
                    title="Live A4 Preview"
                    sandbox="allow-same-origin"
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
        nomorSurat={formData.nomorSurat}
        namaWarga={formData.nama}
        jenisSurat="Surat Keterangan Domisili (SDU)"
        onBackToTemplates={onBack}
      />
    
      <QuickAddResidentModal
        isOpen={showQuickAddModal}
        onClose={() => setShowQuickAddModal(false)}
        onSuccess={() => {
          setShowQuickAddModal(false);
          handlePrint(true);
        }}
        initialData={quickAddInitialData}
      />
    </div>
  );
}
