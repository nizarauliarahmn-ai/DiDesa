import { fetchResidentsCached } from '../../../utils/apiCache';
import { useLetterKode } from '../../../hooks/useLetterKode';
import { useLetterDescription } from '../../../hooks/useLetterDescription';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import PrintSuccessDialog from './PrintSuccessDialog';
import { FileText, ArrowLeft, Printer, Save, Search, User, 
  MapPin, Calendar, Briefcase, FileSignature, AlertCircle, CheckCircle2, History, Trash2, Heart,
  ZoomIn, ZoomOut, ArrowRight
} from 'lucide-react';
import { getLetterClassifications, saveLetterClassifications, incrementSequenceNumber, generateLetterNumber } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { showToast } from '../../../utils/toast';
import { capitalizeResidentFields } from '../../../utils/textUtils';
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

interface ManualFollower {
  id: string;
  name: string;
  nik: string;
  relationship: string;
  gender: string;
}

export default function AdminSuratSKP({ 
  onBack,
  editData,
  editLetterId
}: { 
  onBack: () => void;
  editData?: any;
  editLetterId?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const templateDesc = useLetterDescription('SKP', 'Formulir pembuatan Surat Keterangan Pindah Domisili Antar Wilayah');
  const templateKode = useLetterKode('SKP');
  const [success, setSuccess] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChild, setSelectedChild] = useState<Resident | null>(null);
  const [showRiwayat, setShowRiwayat] = useState(false);
  const [riwayat, setRiwayat] = useState<any[]>([]);

  // States for automated follower checklist
  const [familyMembers, setFamilyMembers] = useState<Resident[]>([]);
  const [checkedFamilyNiks, setCheckedFamilyNiks] = useState<string[]>([]);
  const [familyRelations, setFamilyRelations] = useState<Record<string, string>>({});
  const [manualFollowers, setManualFollowers] = useState<ManualFollower[]>([]);

  // Prefill in edit mode
  useEffect(() => {
    if (editData) {
      setFormData(editData);
      if (editData.manualFollowers) {
        setManualFollowers(editData.manualFollowers);
      }
      if (editData.checkedFamilyNiks) {
        setCheckedFamilyNiks(editData.checkedFamilyNiks);
      }
      if (editData.familyRelations) {
        setFamilyRelations(editData.familyRelations);
      }
    }
  }, [editData]);

  // Form Data
  const [formData, setFormData] = useState({
    nomorSurat: '',
    
    // Data Penduduk Asal
    nama: '',
    nik: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'Laki-Laki',
    agama: 'Islam',
    pekerjaan: 'Wiraswasta',
    statusPerkawinan: 'Belum Kawin',
    rt: '001',
    rw: '001',
    alamat: '',
    
    // Data Tujuan Pindah
    alamatTujuan: '',
    rtTujuan: '001',
    rwTujuan: '001',
    desaTujuan: '',
    kecamatanTujuan: '',
    kabupatenTujuan: '',
    provinsiTujuan: '',
    
    // Detail Kepindahan
    alasanPindah: 'Pekerjaan',
    tanggalPindah: new Date().toISOString().split('T')[0],
    jumlahKeluargaPindah: '0',
    pengikut: '',
    
    // Pejabat
    namaPejabat: localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD',
    jabatanPejabat: 'Kepala Desa',
    includeCamat: false,
    
    // Kop Settings
    namaDesa: localStorage.getItem('kop_desa') || 'Sukamakmur',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || 'Simpur',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan',
    namaProvinsi: localStorage.getItem('kop_provinsi') || 'Kalimantan Selatan',
    alamatKantor: localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261',
    kontakKantor: localStorage.getItem('kop_kontak') || '081346867519 | pemdesasukamakmur@gmail.com',
  });

  const [previewZoom, setPreviewZoom] = useState(0.45);
  const dragProps = useDragScroll();
  const letterFont = localStorage.getItem('village_letter_font') || 'Arial, sans-serif';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const jobs = [
    'Belum/Tidak Bekerja', 'Mengurus Rumah Tangga', 'Pelajar/Mahasiswa', 'Pensiunan', 
    'Pegawai Negeri Sipil', 'Tentara Nasional Indonesia', 'Kepolisian RI', 'Perdagangan', 
    'Petani/Pekebun', 'Peternak', 'Nelayan/Perikanan', 'Industri', 'Konstruksi', 'Transportasi', 
    'Karyawan Swasta', 'Karyawan BUMN', 'Karyawan BUMD', 'Karyawan Honorer', 'Buruh Harian Lepas', 
    'Buruh Tani/Perkebunan', 'Buruh Nelayan/Perikanan', 'Buruh Peternakan', 'Pembantu Rumah Tangga', 
    'Tukang Cukur', 'Tukang Listrik', 'Tukang Batu', 'Tukang Kayu', 'Tukang Sol Sepatu', 
    'Tukang Las/Pandai Besi', 'Tukang Jahit', 'Tukang Masak', 'Penata Rambut', 'Penata Rias', 
    'Penata Busana', 'Mekanik', 'Seniman', 'Tabib', 'Paraji', 'Perancang Busana', 'Penterjemah', 
    'Imam Masjid', 'Pendeta', 'Pastor', 'Wartawan', 'Ustadz/Mubaligh', 'Juru Masak', 'Promotor Acara', 
    'Anggota DPR-RI', 'Anggota DPD', 'Anggota BPK', 'Presiden', 'Wakil Presiden', 'Anggota Mahkamah Konstitusi', 
    'Anggota Kabinet/Kementerian', 'Duta Besar', 'Gubernur', 'Wakil Gubernur', 'Bupati', 'Wakil Bupati', 
    'Walikota', 'Wakil Walikota', 'Anggota DPRD Provinsi', 'Anggota DPRD Kabupaten/Kota', 'Dosen', 
    'Guru', 'Pilot', 'Pengacara', 'Notaris', 'Arsitek', 'Akuntan', 'Konsultan', 'Dokter', 'Bidan', 
    'Perawat', 'Apoteker', 'Psikiater/Psikolog', 'Penyiar Televisi', 'Penyiar Radio', 'Pelaut', 
    'Peneliti', 'Sopir', 'Pialang', 'Paranormal', 'Pedagang', 'Perangkat Desa', 'Kepala Desa', 
    'Biarawati', 'Wiraswasta'
  ];

  const updateResidentData = async (nik: string, data: any) => {
    if (!nik || nik === '-') return;
    try {
      const checkRes = await fetch(`/api/residents`);
      const allResidents = await checkRes.json();
      const existing = allResidents.find((r: any) => r.nik === nik);

      const residentData = {
        name: data.name,
        birthPlace: data.birthPlace,
        birthDate: data.birthDate,
        gender: data.gender,
        religion: data.religion,
        job: data.job,
        address: data.address,
        rt_rw: `${data.rt}/${data.rw}`
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
          body: JSON.stringify({ nik, status: 'Aktif', statusColor: 'green', ...residentData })
        });
      }

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Data Penduduk Diperbarui',
          message: `Data penduduk atas nama ${data.name} telah diperbarui secara otomatis melalui pembuatan SKP.`,
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
    const skp = configs.find(c => c.klasifikasi === 'SKP') || { id: 'fallback_skp', jenis: 'SURAT KETERANGAN PINDAH', klasifikasi: 'SKP', kodeKlasifikasi: '475', noUrutTerakhir: 0 };
    
    if (!editData) {
      const generatedNo = generateLetterNumber(skp.klasifikasi, skp.kodeKlasifikasi || '475');
      setFormData(prev => ({
        ...prev,
        nomorSurat: generatedNo
      }));
    }

    const savedRiwayat = localStorage.getItem('riwayat_surat_skp');
    if (savedRiwayat) setRiwayat(JSON.parse(savedRiwayat));

    const activePejabat = localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD';
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
  }, []);

  const handleSelectResident = (res: Resident) => {
    setSelectedChild(res);
    const rt_rw = (res as any).rt_rw || '001/001';
    const [rt, rw] = rt_rw.split('/');

    // Clear previous follower selections on new resident selection
    setCheckedFamilyNiks([]);
    setManualFollowers([]);

    setFormData(prev => ({
      ...prev,
      nama: capitalizeResidentFields(res).name,
      nik: res.nik,
      tempatLahir: capitalizeResidentFields(res).birthPlace,
      tanggalLahir: res.birthDate,
      jenisKelamin: res.gender || 'Laki-Laki',
      agama: (res as any).religion || 'Islam',
      pekerjaan: res.job || 'Wiraswasta',
      alamat: capitalizeResidentFields(res).address,
      rt: rt || '001',
      rw: rw || '001',
    }));
    setSearchQuery('');
  };

  // Helper to construct structured follower list
  const getFollowersList = () => {
    const list: { name: string; nik: string; relationship: string; gender: string }[] = [];
    
    checkedFamilyNiks.forEach(nik => {
      const member = residents.find(r => r.nik === nik);
      if (member) {
        list.push({
          name: member.name,
          nik: member.nik,
          relationship: familyRelations[nik] || (member as any).familyRelation || (member as any).hubunganKeluarga || 'Anak',
          gender: member.gender || 'Laki-Laki'
        });
      }
    });

    manualFollowers.forEach(f => {
      list.push({
        name: f.name,
        nik: f.nik,
        relationship: f.relationship,
        gender: f.gender
      });
    });

    return list;
  };

  // Automatically fetch family members when main resident's NIK changes
  useEffect(() => {
    if (formData.nik && residents.length > 0) {
      const selectedRes = residents.find(r => r.nik === formData.nik);
      if (selectedRes) {
        const mainNoKk = (selectedRes as any).noKk || (selectedRes as any).no_kk;
        if (mainNoKk) {
          const family = residents.filter(r => 
            (((r as any).noKk || (r as any).no_kk) === mainNoKk) && 
            r.nik !== formData.nik
          );
          setFamilyMembers(family);
          
          // Pre-fill relations if not defined
          setFamilyRelations(prev => {
            const next = { ...prev };
            family.forEach(member => {
              if (!next[member.nik]) {
                next[member.nik] = (member as any).familyRelation || (member as any).hubunganKeluarga || 'Anak';
              }
            });
            return next;
          });
        } else {
          setFamilyMembers([]);
        }
      } else {
        setFamilyMembers([]);
      }
    } else {
      setFamilyMembers([]);
    }
  }, [formData.nik, residents]);

  // Sync follower list updates to formData
  useEffect(() => {
    const list = getFollowersList();
    setFormData(prev => ({
      ...prev,
      jumlahKeluargaPindah: list.length.toString(),
      pengikut: JSON.stringify(list)
    }));
  }, [checkedFamilyNiks, manualFollowers, familyRelations, residents]);

  const handlePrint = async () => {
    if (!formData.nama || !formData.nama.trim()) {
      showToast("Mohon lengkapi Nama Pemohon terlebih dahulu sebelum mencetak surat.", 'error');
      return;
    }
    setLoading(true);

    await updateResidentData(formData.nik, { 
      name: formData.nama, 
      birthPlace: formData.tempatLahir, 
      birthDate: formData.tanggalLahir, 
      gender: formData.jenisKelamin,
      religion: formData.agama,
      job: formData.pekerjaan,
      address: formData.alamat,
      rt: formData.rt,
      rw: formData.rw
    });

    const pages = generateHTML();
    const pagesHTML = pages.map((page, index) => `
      <div class="page" style="${index > 0 ? 'page-break-before: always;' : ''}">
        <div class="printable-area bg-white dark:bg-slate-900 text-black">
          ${page}
        </div>
      </div>
    `).join('\n');

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
          <title>Cetak SKP - ${formData.nama}</title>
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
              min-height: 297mm; 
              height: auto; 
              margin: 0; 
              box-sizing: border-box; 
              background: white; 
              position: relative; 
              overflow: visible;
            }
            .printable-area {
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              min-height: 297mm !important;
              height: auto !important;
              margin: 0 !important;
              padding: 40px 48px !important; /* reduced print margins */
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
              line-height: 1.4;
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
                min-height: 297mm; 
                height: auto;
              }
              tr { page-break-inside: avoid !important; }
              thead { display: table-header-group !important; }
            }
          </style>
        </head>
        <body>
          ${pagesHTML}
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
    const updatedFields = {
      nomor: formData.nomorSurat,
      nik: formData.nik,
      nama: formData.nama,
      keperluan: `Pindah ke Desa/Kelurahan ${formData.desaTujuan}, Kecamatan ${formData.kecamatanTujuan}`,
      data: {
        ...formData,
        manualFollowers,
        checkedFamilyNiks,
        familyRelations
      }
    };

    if (editLetterId) {
      updateLetterHistory(editLetterId, updatedFields);
    } else {
      addLetterHistory({
        ...updatedFields,
        jenis: 'SKP',
        tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        status: 'Selesai'
      });
      incrementSequenceNumber('SKP');
    }

    const newEntry = {
      id: Date.now(),
      nama: formData.nama,
      nomor: formData.nomorSurat,
      tanggal: new Date().toISOString(),
      data: {
        ...formData,
        manualFollowers,
        checkedFamilyNiks,
        familyRelations
      }
    };
    const updatedRiwayat = [newEntry, ...riwayat].slice(0, 50);
    setRiwayat(updatedRiwayat);
    localStorage.setItem('riwayat_surat_skp', JSON.stringify(updatedRiwayat));
    setLoading(false);
    setSuccess(true);
  };

  const v = (val: string, fallback = '-') => (val && val.trim() !== '' ? val : fallback);
  
  const generateHTML = (): string[] => {
    const today = new Date();
    const tglFormatted = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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

    const followers = getFollowersList();
    const rawPengikut = formData.pengikut || '';

    const page1Content = `
      <!-- KOP SURAT -->
      <div style="border-bottom:3px solid #000;margin-bottom:8px;">
        <div style="display:flex;align-items:flex-start;padding-bottom:4px;border-bottom:1px solid #000;margin-bottom:1px;font-family:${letterFont};">
          <div style="display:flex;width:100%;align-items:center;">
            <div style="width:90px;height:90px;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-right:15px;">
              <img src="${villageLogo}" style="width:100%;height:100%;object-fit:contain;" />
            </div>
            <div style="text-align:center;flex:1;padding-right:90px;">
              <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">${activeKabupaten.toUpperCase()}</div>
              <div style="font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:0 0 2px 0;">${activeKecamatan.toUpperCase()}</div>
              <div style="font-weight:900;font-size:26px;text-transform:uppercase;letter-spacing:2px;line-height:1.1;margin:2px 0 3px 0;">DESA ${activeDesa.toUpperCase()}</div>
              <div style="font-size:10.5px;margin-top:4px;text-transform:capitalize;line-height:1.15;margin:2px 0 1px 0;">${activeAlamat}</div>
              <div style="font-size:10.5px;line-height:1.15;margin:1px 0 0 0;">${formData.kontakKantor || '0813 4686 7519, pemdessukamakmur@gmail.com'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- JUDUL SURAT -->
      <div style="text-align:center;margin-bottom:12px;">
        <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN PINDAH</h3>
        <p style="margin:2px 0 0 0;font-size:14px;">Nomor : ${v(formData.nomorSurat, '... / ... / ... / ' + today.getFullYear())}</p>
      </div>

      <p style="text-indent:40px;text-align:justify;line-height:1.25;margin-bottom:6px;font-size:13.5px;">
        Yang bertanda tangan di bawah ini Kepala Desa ${cleanStr(activeDesa, /^(desa|kelurahan)\s+/i)} Kecamatan ${cleanStr(activeKecamatan, /^kecamatan\s+/i)} Kabupaten ${cleanStr(activeKabupaten, /^(kabupaten|kota)\s+/i)} Provinsi ${cleanStr(activeProvinsi, /^provinsi\s+/i)}, menerangkan dengan sebenarnya bahwa :
      </p>

      <!-- DATA PENDUDUK ASAL -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:8px;margin-left:40px;line-height:1.35;font-size:13px;">
        <tr><td style="width:30%;">Nama Lengkap</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(formData.nama)}</strong></td></tr>
        <tr><td>NIK</td><td>:</td><td>${v(formData.nik)}</td></tr>
        <tr><td>Tempat, Tanggal lahir</td><td>:</td><td>${v(formData.tempatLahir)}, ${fmtDate(formData.tanggalLahir)}</td></tr>
        <tr><td>Jenis Kelamin</td><td>:</td><td>${v(formData.jenisKelamin)}</td></tr>
        <tr><td>Agama</td><td>:</td><td>${v(formData.agama)}</td></tr>
        <tr><td>Pekerjaan</td><td>:</td><td>${v(formData.pekerjaan)}</td></tr>
        <tr><td>Status Perkawinan</td><td>:</td><td>${v(formData.statusPerkawinan)}</td></tr>
        <tr><td style="vertical-align:top;">Alamat Asal</td><td style="vertical-align:top;">:</td><td>${v(formData.alamat)} RT.${v(formData.rt)} RW.${v(formData.rw)}<br/>Desa ${cleanStr(v(formData.namaDesa), /^(desa|kelurahan)\s+/i)} Kecamatan ${cleanStr(v(formData.namaKecamatan), /^kecamatan\s+/i)} Kabupaten ${cleanStr(v(formData.namaKabupaten), /^(kabupaten|kota)\s+/i)}</td></tr>
      </table>

      <p style="text-indent:40px;text-align:justify;line-height:1.25;margin-bottom:6px;font-size:13.5px;">
        Bahwa nama tersebut di atas terhitung mulai tanggal <strong>${fmtDate(formData.tanggalPindah)}</strong> mengajukan permohonan pindah domisili dengan rincian sebagai berikut:
      </p>

      <!-- DATA TUJUAN PINDAH -->
      <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:8px;margin-left:40px;line-height:1.35;font-size:13px;">
        <tr>
          <td style="width:20%;vertical-align:top;">Alamat Tujuan</td>
          <td style="width:2%;vertical-align:top;">:</td>
          <td style="width:28%;vertical-align:top;">${v(formData.alamatTujuan)}</td>
          <td style="width:20%;vertical-align:top;">Kabupaten Tujuan</td>
          <td style="width:2%;vertical-align:top;">:</td>
          <td style="width:28%;vertical-align:top;">${v(formData.kabupatenTujuan)}</td>
        </tr>
        <tr>
          <td style="vertical-align:top;">RT / RW Tujuan</td>
          <td style="vertical-align:top;">:</td>
          <td style="vertical-align:top;">RT. ${v(formData.rtTujuan)} / RW. ${v(formData.rwTujuan)}</td>
          <td style="vertical-align:top;">Provinsi Tujuan</td>
          <td style="vertical-align:top;">:</td>
          <td style="vertical-align:top;">${v(formData.provinsiTujuan)}</td>
        </tr>
        <tr>
          <td style="vertical-align:top;">Desa Tujuan</td>
          <td style="vertical-align:top;">:</td>
          <td style="vertical-align:top;">${v(formData.desaTujuan)}</td>
          <td style="vertical-align:top;">Alasan Pindah</td>
          <td style="vertical-align:top;">:</td>
          <td style="vertical-align:top;"><strong>${v(formData.alasanPindah)}</strong></td>
        </tr>
        <tr>
          <td style="vertical-align:top;">Kecamatan Tujuan</td>
          <td style="vertical-align:top;">:</td>
          <td style="vertical-align:top;">${v(formData.kecamatanTujuan)}</td>
          <td style="vertical-align:top;">Pengikut</td>
          <td style="vertical-align:top;">:</td>
          <td style="vertical-align:top;">${(() => {
            if (followers.length >= 5) {
              return `${v(formData.jumlahKeluargaPindah)} Orang (Lampiran)`;
            }
            return `${v(formData.jumlahKeluargaPindah)} Orang`;
          })()}</td>
        </tr>
      </table>

      ${(() => {
        if (followers.length > 0) {
          if (followers.length >= 5) {
            return `
              <!-- PENGIKUT / KELUARGA YANG IKUT (TERLAMPIR) -->
              <div style="margin-left:40px; margin-bottom:8px; font-size:12.5px; line-height:1.3;">
                <div style="font-weight:bold; margin-bottom:4px;">Daftar Pengikut / Anggota Keluarga yang Ikut Pindah:</div>
                <div style="border: 1px dashed #000; padding: 10px; background-color: #fafafa; font-style: italic; text-align: center; font-size: 12.5px; font-weight: bold; margin-top: 4px; margin-bottom: 4px;">
                  * Daftar pengikut lengkap terlampir pada Lembar Kedua (Lampiran)
                </div>
              </div>
            `;
          }

          return `
            <!-- PENGIKUT / KELUARGA YANG IKUT -->
            <div style="margin-left:40px; margin-bottom:8px; font-size:12.5px; line-height:1.3;">
              <div style="font-weight:bold; margin-bottom:4px;">Daftar Pengikut / Anggota Keluarga yang Ikut Pindah:</div>
              <table style="width:100%; border-collapse:collapse; margin-top:2px; margin-bottom:6px; font-size:12px;">
                <thead>
                  <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                    <th style="border: 1px solid #000; padding: 4px 6px; width: 6%;">No</th>
                    <th style="border: 1px solid #000; padding: 4px 6px; text-align: left; width: 34%;">Nama Lengkap</th>
                    <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; width: 25%;">NIK</th>
                    <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; width: 20%;">Hubungan Keluarga</th>
                    <th style="border: 1px solid #000; padding: 4px 6px; text-align: center; width: 15%;">Jenis Kelamin</th>
                  </tr>
                </thead>
                <tbody>
                  ${followers.map((f, index) => `
                    <tr>
                      <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${index + 1}</td>
                      <td style="border: 1px solid #000; padding: 4px 6px; font-weight: bold; text-transform: uppercase;">${f.name}</td>
                      <td style="border: 1px solid #000; padding: 4px 6px; text-align: center; font-family: monospace;">${f.nik}</td>
                      <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${f.relationship}</td>
                      <td style="border: 1px solid #000; padding: 4px 6px; text-align: center;">${f.gender === 'Perempuan' ? 'P' : 'L'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        }

        if (rawPengikut.trim() && !rawPengikut.startsWith('[')) {
          return `
            <!-- PENGIKUT / KELUARGA YANG IKUT (LEGACY) -->
            <div style="margin-left:40px; margin-bottom:8px; font-size:12.5px; line-height:1.3;">
              <div style="font-weight:bold; margin-bottom:4px;">Daftar Pengikut / Anggota Keluarga yang Ikut Pindah:</div>
              <div style="white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 6px; font-family: ${letterFont};">${v(rawPengikut)}</div>
            </div>
          `;
        }

        return '';
      })()}

      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;margin-top:15px;">
        Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar berstatus sebagai warga kami yang bermaksud melakukan perpindahan alamat domisili ke tujuan yang baru.
      </p>


      <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:25px;font-size:14px;">
        Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.
      </p>

      <!-- TANDA TANGAN LEMBAR 1 -->
      ${getPrintSignatureHTML(
        formData.namaDesa,
        tglFormatted,
        formData.namaPejabat,
        formData.jabatanPejabat,
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
      <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">
        ${SAAS_CONFIG.globalFooterHTML}
      </div>
    `;

    if (followers.length >= 5) {
      const page2Content = `
        <!-- KOP LAMPIRAN -->
        <div style="text-align: center; margin-bottom: 24px;">
          <h3 style="margin: 0; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">LAMPIRAN SURAT KETERANGAN PINDAH</h3>
          <p style="margin: 4px 0; font-size: 13px; font-family: monospace;">Nomor : ${v(formData.nomorSurat, '... / ... / ... / ' + today.getFullYear())}</p>
          <div style="margin: 10px auto; width: 100%; border-bottom: 1px solid #000;"></div>
          <p style="margin: 6px 0 2px 0; font-size: 13px;">Daftar pengikut / anggota keluarga yang ikut pindah dari penduduk atas nama:</p>
          <p style="margin: 2px 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">${v(formData.nama)} (NIK: ${v(formData.nik)})</p>
        </div>

        <!-- TABEL PENGIKUT LENGKAP -->
        <div style="margin-bottom: 24px; font-size: 12.5px; line-height: 1.35;">
          <table style="width:100%; border-collapse:collapse; margin-top:5px; margin-bottom:8px; font-size:12px;">
            <thead>
              <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
                <th style="border: 1px solid #000; padding: 6px 8px; width: 6%;">No</th>
                <th style="border: 1px solid #000; padding: 6px 8px; text-align: left; width: 34%;">Nama Lengkap</th>
                <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 25%;">NIK</th>
                <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 20%;">Hubungan Keluarga</th>
                <th style="border: 1px solid #000; padding: 6px 8px; text-align: center; width: 15%;">Jenis Kelamin</th>
              </tr>
            </thead>
            <tbody>
              ${followers.map((f, index) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 5px 8px; text-align: center;">${index + 1}</td>
                  <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold; text-transform: uppercase;">${f.name}</td>
                  <td style="border: 1px solid #000; padding: 5px 8px; text-align: center; font-family: monospace;">${f.nik}</td>
                  <td style="border: 1px solid #000; padding: 5px 8px; text-align: center;">${f.relationship}</td>
                  <td style="border: 1px solid #000; padding: 5px 8px; text-align: center;">${f.gender === 'Perempuan' ? 'P' : 'L'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <p style="text-align:justify; line-height:1.25; margin-bottom:24px; font-size:13px; font-style: italic;">
          * Lampiran ini merupakan satu kesatuan yang tidak terpisahkan dari Surat Keterangan Pindah Nomor: ${v(formData.nomorSurat)}.
        </p>

        <!-- TANDA TANGAN LEMBAR 2 -->
        ${getPrintSignatureHTML(
          formData.namaDesa,
          tglFormatted,
          formData.namaPejabat,
          formData.jabatanPejabat,
          (() => {
            try {
              const officersList = JSON.parse(localStorage.getItem('village_officers') || '[]');
              const found = officersList.find((o: any) => o.name === formData.namaPejabat);
              return found?.nip || '-';
            } catch(e) {
              return '-';
            }
          })(),
          false
        )}

        <!-- FOOTER LEMBAR 2 -->
        <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">
          ${SAAS_CONFIG.globalFooterHTML}
        </div>
      `;

      return [page1Content, page2Content];
    }

    return [page1Content];
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
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Buat SKP</h1>
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
                Riwayat Pembuatan SKP
              </h2>
              <button 
                onClick={() => {
                  if (confirm('Kosongkan riwayat?')) {
                    setRiwayat([]);
                    localStorage.removeItem('riwayat_surat_skp');
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
                    setFormData(item.data);
                    if (item.data.pengikut) {
                      try {
                        const parsed = JSON.parse(item.data.pengikut);
                        if (Array.isArray(parsed)) {
                          const familyNiks: string[] = [];
                          const manuals: ManualFollower[] = [];
                          const relations: Record<string, string> = {};
                          parsed.forEach((pf: any) => {
                            const exists = residents.some(r => r.nik === pf.nik);
                            if (exists && pf.nik !== item.data.nik) {
                              familyNiks.push(pf.nik);
                              relations[pf.nik] = pf.relationship;
                            } else {
                              manuals.push({
                                id: pf.nik || Math.random().toString(),
                                name: pf.name,
                                nik: pf.nik,
                                relationship: pf.relationship,
                                gender: pf.gender
                              });
                            }
                          });
                          setCheckedFamilyNiks(familyNiks);
                          setFamilyRelations(relations);
                          setManualFollowers(manuals);
                        }
                      } catch (e) {
                        // legacy plain text string
                      }
                    } else {
                      setCheckedFamilyNiks([]);
                      setManualFollowers([]);
                    }
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
          
          {/* Pencarian Warga */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Search className="w-4 h-4 text-emerald-600" />
              Pilih Penduduk (Warga)
            </h3>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Cari NIK atau Nama Warga..."
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <p className="mt-2 text-emerald-600 font-medium text-[10px]">* Pencarian otomatis melengkapi biodata, alamat asal, dan pekerjaan warga desa terpilih</p>
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-20">
                  {filteredResidents.length > 0 ? (
                    filteredResidents.map(res => (
                      <button
                        key={res.nik}
                        onClick={() => handleSelectResident(res)}
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
            {selectedChild && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-900">{selectedChild.name}</p>
                    <p className="text-[10px] text-emerald-700">Warga Terpilih</p>
                  </div>
                </div>
                <button onClick={() => setSelectedChild(null)} className="text-xs font-bold text-emerald-600 hover:underline">Ganti</button>
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
                    placeholder="Contoh: SKP/064/WHi/2026"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                    value={formData.nomorSurat}
                    onChange={(e) => setFormData({...formData, nomorSurat: e.target.value})}
                  />
                  <p className="mt-1 text-[10px] text-emerald-600 font-medium">* Format: [Kode]/[No]/[Tahun]. Dapat diubah manual jika perlu.</p>
                </div>
              </div>
            </div>

            {/* Data Penduduk Asal */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Penduduk (Asal)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.nama}
                    onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">NIK</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.nik}
                    onChange={(e) => setFormData({...formData, nik: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.jenisKelamin}
                    onChange={(e) => setFormData({...formData, jenisKelamin: e.target.value})}
                  >
                    <option value="Laki-Laki">Laki-Laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Agama</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
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
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Pekerjaan</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={formData.pekerjaan}
                    onChange={(e) => setFormData({...formData, pekerjaan: e.target.value})}
                  >
                    <option value="">Pilih Pekerjaan</option>
                    {jobs.map((j, i) => <option key={i} value={j}>{j}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Status Perkawinan</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
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
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tempat Lahir</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.tempatLahir}
                    onChange={(e) => setFormData({...formData, tempatLahir: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.tanggalLahir}
                    onChange={(e) => setFormData({...formData, tanggalLahir: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RT (Asal)</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      value={formData.rt}
                      onChange={(e) => setFormData({...formData, rt: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RW (Asal)</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      value={formData.rw}
                      onChange={(e) => setFormData({...formData, rw: e.target.value})}
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Lengkap (Asal)</label>
                  <textarea 
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                    value={formData.alamat}
                    onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Data Tujuan Pindah */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Data Tujuan Kepindahan</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alamat Tujuan Lengkap (Jalan/Dukuh/Kampung)</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Jl. Diponegoro No. 12"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.alamatTujuan}
                    onChange={(e) => setFormData({...formData, alamatTujuan: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RT Tujuan</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      value={formData.rtTujuan}
                      onChange={(e) => setFormData({...formData, rtTujuan: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">RW Tujuan</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                      value={formData.rwTujuan}
                      onChange={(e) => setFormData({...formData, rwTujuan: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Desa/Kelurahan Tujuan</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Menteng"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.desaTujuan}
                    onChange={(e) => setFormData({...formData, desaTujuan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Kecamatan Tujuan</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Menteng"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.kecamatanTujuan}
                    onChange={(e) => setFormData({...formData, kecamatanTujuan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Kabupaten/Kota Tujuan</label>
                  <input 
                    type="text"
                    placeholder="Contoh: Jakarta Pusat"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.kabupatenTujuan}
                    onChange={(e) => setFormData({...formData, kabupatenTujuan: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Provinsi Tujuan</label>
                  <input 
                    type="text"
                    placeholder="Contoh: DKI Jakarta"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.provinsiTujuan}
                    onChange={(e) => setFormData({...formData, provinsiTujuan: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Detail Kepindahan */}
            <div>
              <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">Detail Kepindahan</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Alasan Pindah</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.alasanPindah}
                    onChange={(e) => setFormData({...formData, alasanPindah: e.target.value})}
                  >
                    <option value="Pekerjaan">Pekerjaan</option>
                    <option value="Pendidikan">Pendidikan</option>
                    <option value="Keluarga / Ikut Suami/Istri">Keluarga / Ikut Suami/Istri</option>
                    <option value="Keluarga / Ikut Orang Tua">Keluarga / Ikut Orang Tua</option>
                    <option value="Perumahan / Domisili Baru">Perumahan / Domisili Baru</option>
                    <option value="Keamanan">Keamanan</option>
                    <option value="Kesehatan">Kesehatan</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Tanggal Pindah</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                    value={formData.tanggalPindah}
                    onChange={(e) => setFormData({...formData, tanggalPindah: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex justify-between items-center">
                    <span>Jumlah Keluarga yang Ikut (Orang)</span>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-semibold">Otomatis</span>
                  </label>
                  <input 
                    type="number"
                    min="0"
                    readOnly
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-500 dark:text-slate-400 font-bold cursor-not-allowed"
                    value={formData.jumlahKeluargaPindah}
                  />
                </div>
                
                {/* AUTOMATED FAMILY MEMBERS CHECKLIST */}
                <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>Daftar Pengikut / Anggota Keluarga (Satu KK)</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-800">
                      No. KK: {(() => {
                        const sRes = residents.find(r => r.nik === formData.nik);
                        return sRes ? ((sRes as any).noKk || (sRes as any).no_kk || '-') : '-';
                      })()}
                    </span>
                  </div>

                  {familyMembers.length > 0 ? (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm dark:shadow-none">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                              <th className="p-3.5 text-center w-14">Pilih</th>
                              <th className="p-3.5">Nama Lengkap</th>
                              <th className="p-3.5">NIK</th>
                              <th className="p-3.5">Hubungan Keluarga</th>
                              <th className="p-3.5">Gender</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {familyMembers.map((member) => {
                              const isChecked = checkedFamilyNiks.includes(member.nik);
                              return (
                                <tr key={member.nik} className={`hover:bg-slate-50/50 transition-colors ${isChecked ? 'bg-emerald-50/10' : ''}`}>
                                  <td className="p-3.5 text-center">
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setCheckedFamilyNiks([...checkedFamilyNiks, member.nik]);
                                        } else {
                                          setCheckedFamilyNiks(checkedFamilyNiks.filter(n => n !== member.nik));
                                        }
                                      }}
                                      className="w-4.5 h-4.5 text-emerald-600 rounded border-slate-300 dark:border-slate-600 focus:ring-emerald-500/20 cursor-pointer transition-all"
                                    />
                                  </td>
                                  <td className="p-3.5 font-bold text-slate-800 dark:text-slate-100">{member.name}</td>
                                  <td className="p-3.5 font-mono text-slate-500 dark:text-slate-400">{member.nik}</td>
                                  <td className="p-3.5">
                                    <select
                                      value={familyRelations[member.nik] || 'Anak'}
                                      onChange={(e) => {
                                        setFamilyRelations({
                                          ...familyRelations,
                                          [member.nik]: e.target.value
                                        });
                                      }}
                                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-emerald-500 font-semibold text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:bg-slate-100 transition-all"
                                      disabled={!isChecked}
                                    >
                                      <option value="Istri">Istri</option>
                                      <option value="Suami">Suami</option>
                                      <option value="Anak">Anak</option>
                                      <option value="Orang Tua">Orang Tua</option>
                                      <option value="Mertua">Mertua</option>
                                      <option value="Menantu">Menantu</option>
                                      <option value="Cucu">Cucu</option>
                                      <option value="Famili Lain">Famili Lain</option>
                                    </select>
                                  </td>
                                  <td className="p-3.5 text-slate-500 dark:text-slate-400 font-medium">
                                    {member.gender === 'Laki-Laki' ? 'L' : 'P'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-dashed rounded-2xl text-center">
                      <p className="text-xs text-slate-400 italic font-medium">
                        * Tidak ditemukan warga lain dengan No. KK yang sama di database penduduk desa.
                      </p>
                    </div>
                  )}
                </div>

                {/* MANUAL ADDITIONAL FOLLOWERS */}
                <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Pengikut Tambahan (Manual)</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setManualFollowers([...manualFollowers, {
                          id: Math.random().toString(),
                          name: '',
                          nik: '',
                          relationship: 'Anak',
                          gender: 'Laki-Laki'
                        }]);
                      }}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-100"
                    >
                      + Tambah Manual
                    </button>
                  </div>

                  {manualFollowers.length > 0 ? (
                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                      {manualFollowers.map((follower, index) => (
                        <div key={follower.id} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none relative group">
                          <div className="flex-1 min-w-[140px]">
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Nama Lengkap</label>
                            <input 
                              type="text"
                              placeholder="Nama Lengkap"
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-emerald-500 font-bold text-slate-800 dark:text-slate-100"
                              value={follower.name}
                              onChange={(e) => {
                                const next = [...manualFollowers];
                                next[index].name = e.target.value;
                                setManualFollowers(next);
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">NIK</label>
                            <input 
                              type="text"
                              placeholder="NIK"
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none focus:border-emerald-500 text-slate-700 dark:text-slate-300"
                              value={follower.nik}
                              onChange={(e) => {
                                const next = [...manualFollowers];
                                next[index].nik = e.target.value;
                                setManualFollowers(next);
                              }}
                            />
                          </div>
                          <div className="w-28 shrink-0">
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Hubungan</label>
                            <select
                              value={follower.relationship}
                              onChange={(e) => {
                                const next = [...manualFollowers];
                                next[index].relationship = e.target.value;
                                setManualFollowers(next);
                              }}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-700 dark:text-slate-300 font-semibold"
                            >
                              <option value="Istri">Istri</option>
                              <option value="Suami">Suami</option>
                              <option value="Anak">Anak</option>
                              <option value="Orang Tua">Orang Tua</option>
                              <option value="Mertua">Mertua</option>
                              <option value="Menantu">Menantu</option>
                              <option value="Cucu">Cucu</option>
                              <option value="Famili Lain">Famili Lain</option>
                            </select>
                          </div>
                          <div className="w-24 shrink-0">
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">Gender</label>
                            <select
                              value={follower.gender}
                              onChange={(e) => {
                                const next = [...manualFollowers];
                                next[index].gender = e.target.value;
                                setManualFollowers(next);
                              }}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none text-slate-700 dark:text-slate-300 font-semibold"
                            >
                              <option value="Laki-Laki">Laki-Laki</option>
                              <option value="Perempuan">Perempuan</option>
                            </select>
                          </div>
                          <div className="pt-5">
                            <button
                              type="button"
                              onClick={() => {
                                setManualFollowers(manualFollowers.filter(f => f.id !== follower.id));
                              }}
                              className="p-2 hover:bg-rose-50 rounded-lg text-rose-500 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
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
                        return <option value="FAZAKKIR RAHMAD">FAZAKKIR RAHMAD (Kepala Desa)</option>;
                      })()}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-amber-900">Jabatan</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl outline-none font-medium"
                      value={formData.jabatanPejabat}
                      onChange={(e) => setFormData({...formData, jabatanPejabat: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t border-amber-100">
                  <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-50 transition-colors">
                    <input 
                      type="checkbox"
                      checked={formData.includeCamat}
                      onChange={(e) => setFormData({...formData, includeCamat: e.target.checked})}
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
                Pastikan data penduduk asal dan wilayah tujuan pindah sudah sesuai dengan KTP/KK terbaru. 
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
              </div>
            </div>

            {/* Stage containing A4 page scaled using CSS transform */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 overflow-auto p-6 flex flex-col items-center gap-6 cursor-grab active:cursor-grabbing" {...dragProps}>
              {(() => {
                const pages = generateHTML();
                return pages.map((pageHtml, index) => (
                  <div 
                    key={index}
                    className="bg-white dark:bg-slate-900 shadow-2xl relative select-none shrink-0"
                    style={{ 
                      width: '210mm', 
                      height: '297mm',
                      transform: `scale(${previewZoom})`, 
                      transformOrigin: 'top center',
                      marginBottom: index === pages.length - 1 
                        ? `calc(297mm * (${previewZoom} - 1))` 
                        : `calc(297mm * (${previewZoom} - 1) + 24px)`
                    }}
                  >
                    {/* Page Number Label */}
                    <div className="absolute -top-6 left-0 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      Halaman {index + 1} dari {pages.length}
                    </div>

                    {/* 4 Corner Crop Marks for Premium Print Layout */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-slate-300 dark:border-slate-600 crop-mark" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-slate-300 dark:border-slate-600 crop-mark" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-slate-300 dark:border-slate-600 crop-mark" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-slate-300 dark:border-slate-600 crop-mark" />

                    {/* Printable Content Frame */}
                    <div 
                      className="w-full text-black bg-white dark:bg-slate-900 relative h-full"
                      style={{ 
                        padding: '40px 48px',
                        boxSizing: 'border-box',
                        fontFamily: letterFont,
                        fontSize: '13px',
                        lineHeight: '1.4',
                        height: '297mm'
                      }}
                      dangerouslySetInnerHTML={{ __html: pageHtml }}
                    />
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden iframe for background print execution */}
      <iframe 
        ref={iframeRef} 
        style={{ position: 'absolute', width: '0px', height: '0px', border: 'none' }} 
        title="Print Framework"
      />

      {/* Pop-up Dialog Success Printing */}
      <PrintSuccessDialog
        isOpen={success}
        onClose={() => setSuccess(false)}
        nomorSurat={formData.nomorSurat}
        namaWarga={formData.nama}
        jenisSurat="Surat Keterangan Pindah (SKP)"
        onBackToTemplates={onBack}
      />
    </div>
  );
}




