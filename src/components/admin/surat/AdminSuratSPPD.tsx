import React, { useState, useEffect, useRef, Component } from 'react';
import { ArrowLeft, Printer, Save, Plus, Trash2, Search, ZoomIn, ZoomOut, FileText, Eye } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { capitalizeResidentFields } from '../../../utils/textUtils';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { useLetterKode } from '../../../hooks/useLetterKode';
import { getLetterClassifications, generateLetterNumber, getGlobalSequenceNumber } from '../../../utils/letterClassifications';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { useDragScroll } from '../../../hooks/useDragScroll';

// Error Boundary to catch and display any rendering errors
class SPPDErrorBoundary extends Component<{children: React.ReactNode, onBack: () => void}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('SPPD Error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: 40, fontFamily: 'monospace'}}>
          <h2 style={{color: 'red'}}>⚠️ Error pada halaman SPPD</h2>
          <pre style={{background: '#fee', padding: 20, borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <pre style={{background: '#fff3cd', padding: 20, borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: 10}}>
            {String(this.state.error?.stack || '')}
          </pre>
          <button onClick={this.props.onBack} style={{marginTop: 20, padding: '10px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer'}}>← Kembali</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminSuratSPPD({ onBack, editData, editLetterId }: { onBack: () => void, editData?: any, editLetterId?: string | null }) {
  return (
    <SPPDErrorBoundary onBack={onBack}>
      <AdminSuratSPPDInner onBack={onBack} editData={editData} editLetterId={editLetterId} />
    </SPPDErrorBoundary>
  );
}

function AdminSuratSPPDInner({ onBack, editData, editLetterId }: { onBack: () => void, editData?: any, editLetterId?: string | null }) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [officers, setOfficers] = useState<any[]>([]);

  // Desa Settings
  const [desaName, setDesaName] = useState('Desa Sukamakmur');
  const [namaKades, setNamaKades] = useState('FAZAKKIR RAHMAD');
  const [roleKades, setRoleKades] = useState('Kepala Desa');
  const [nipKades, setNipKades] = useState('');
  const [includeCamat, setIncludeCamat] = useState(false);

  // SPPD State
  const classifications = getLetterClassifications();
  const sppdClass = classifications.find(c => c.klasifikasi === 'SPPD');
  const kodeKlasifikasiRaw = useLetterKode('SPPD');
  const kodeKlasifikasi = kodeKlasifikasiRaw || '094';
  const [nomorSurat, setNomorSurat] = useState('');
  
  // Resident Data for Search
  const [residents, setResidents] = useState<any[]>([]);
  const [activePelaksanaDropdown, setActivePelaksanaDropdown] = useState<string | null>(null);
  const [activePengikutDropdown, setActivePengikutDropdown] = useState<string | null>(null);

  useEffect(() => {
    fetchResidentsCached()
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        if (Array.isArray(data)) setResidents(data);
      })
      .catch(err => console.error("Failed to load residents for SPPD:", err));
      
    const officersList = JSON.parse(localStorage.getItem('village_officers') || '[]');
    setOfficers(officersList);
  }, []);

  // Daftar Pelaksana Perjalanan Dinas & Pengikut
  const [pelaksanaList, setPelaksanaList] = useState<any[]>(() => {
    if (editData?.pelaksanaList) return editData.pelaksanaList;
    if (editData?.namaPegawai) {
      return [{
        id: crypto.randomUUID(),
        nama: editData.namaPegawai,
        nip: editData.nipPegawai || '',
        pangkat: editData.pangkatGolongan || '',
        jabatan: editData.jabatanPegawai || '',
        pengikutList: editData.pengikut || []
      }];
    }
    return [{ id: crypto.randomUUID(), nama: '', nip: '', pangkat: '', jabatan: '', pengikutList: [] }];
  });

  const [activePreviewTab, setActivePreviewTab] = useState('surattugas');

  // Dasar & Pelaporan
  const [dasarPenugasan, setDasarPenugasan] = useState(editData?.dasarPenugasan || 'surat undangan dengan nomor surat: ........ tanggal ........');
  const [isDasarManual, setIsDasarManual] = useState(() => {
    if (!editData) return false;
    return editData.dasarPenugasan && !editData.dasarPenugasan.startsWith('surat undangan');
  });
  const [dasarNo, setDasarNo] = useState('');
  const [dasarTgl, setDasarTgl] = useState('');
  const [namaPPTK, setNamaPPTK] = useState(editData?.namaPPTK || '');
  const [kepadaYth, setKepadaYth] = useState(editData?.kepadaYth || `Kepala ${SAAS_CONFIG.desaName}`);

  // Detail Perjalanan
  const [maksudPerjalanan, setMaksudPerjalanan] = useState(editData?.maksudPerjalanan || '');
  const [alatAngkut, setAlatAngkut] = useState(editData?.alatAngkut || '');
  const [tempatBerangkat, setTempatBerangkat] = useState(editData?.tempatBerangkat || 'Desa Sukamakmur');
  const [tempatTujuan, setTempatTujuan] = useState(editData?.tempatTujuan || '');
  const [lamaPerjalanan, setLamaPerjalanan] = useState(editData?.lamaPerjalanan || '1 (Satu) Hari');
  const [tanggalBerangkat, setTanggalBerangkat] = useState(editData?.tanggalBerangkat || '');
  const [tanggalKembali, setTanggalKembali] = useState(editData?.tanggalKembali || '');
  
  // Anggaran
  const [bebanAnggaran, setBebanAnggaran] = useState(editData?.bebanAnggaran || 'APBDes');
  const [mataAnggaran, setMataAnggaran] = useState(editData?.mataAnggaran || '');


  const [activeTab, setActiveTab] = useState<'form' | 'cetak'>('form');
  const [printLayout, setPrintLayout] = useState('surattugas');

  const dragProps = useDragScroll();

  useEffect(() => {
    setDesaName(localStorage.getItem('kop_desa') || 'Sukamakmur');
    setNamaKades(localStorage.getItem('kop_kades') || 'FAZAKKIR RAHMAD');
    setRoleKades('Kepala Desa');
    
    const officersList = JSON.parse(localStorage.getItem('village_officers') || '[]');
    const activeKades = localStorage.getItem('kop_kades');
    const found = officersList.find((o: any) => o.name === activeKades);
    setNipKades(found?.nip || '');
    setIncludeCamat(false);

    if (editData?.nomorSurat) {
      setNomorSurat(editData.nomorSurat);
    } else {
      const generatedNo = generateLetterNumber('SPPD', kodeKlasifikasi || '094');
      setNomorSurat(generatedNo);
    }
  }, [editData, kodeKlasifikasi]);

  const angkaTerbilang = (angka: number): string => {
    const words = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    if (angka < 12) return words[angka];
    if (angka < 20) return words[angka - 10] + " Belas";
    if (angka < 100) return words[Math.floor(angka / 10)] + " Puluh " + (angka % 10 !== 0 ? words[angka % 10] : "");
    return angka.toString();
  };

  useEffect(() => {
    if (tanggalBerangkat && tanggalKembali) {
      const start = new Date(tanggalBerangkat);
      const end = new Date(tanggalKembali);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays > 0) {
        setLamaPerjalanan(`${diffDays} (${angkaTerbilang(diffDays).trim()}) Hari`);
      }
    }
  }, [tanggalBerangkat, tanggalKembali]);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  const handleRecord = () => {
    if (!nomorSurat) {
      showToast('error', 'Nomor surat wajib diisi');
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        klasifikasi: 'SPPD',
        nomorSurat: nomorSurat,
        tanggal: new Date().toISOString(),
        pemohon: pelaksanaList[0]?.nama || 'Pelaksana',
        nikPemohon: pelaksanaList[0]?.nip || '-',
        pelaksanaList,
        maksudPerjalanan,
        alatAngkut,
        tempatBerangkat,
        tempatTujuan,
        lamaPerjalanan,
        tanggalBerangkat,
        tanggalKembali,
        bebanAnggaran,
        mataAnggaran,
        dasarPenugasan,
        namaPPTK,
        kepadaYth
      };

      if (editLetterId) {
        updateLetterHistory(editLetterId, payload);
        showToast('success', 'Surat SPPD berhasil diperbarui!');
      } else {
        addLetterHistory(payload);
        showToast('success', 'Surat SPPD berhasil dicatat!');
      }
      setHasRecorded(true);
    } catch (e) {
      showToast('error', 'Gagal mencatat surat');
    } finally {
      setIsSaving(false);
    }
  };

  const addPelaksana = () => {
    setPelaksanaList([...pelaksanaList, { id: crypto.randomUUID(), nama: '', nip: '', pangkat: '', jabatan: '', pengikutList: [] }]);
  };

  const removePelaksana = (id: string) => {
    setPelaksanaList(pelaksanaList.filter(p => p.id !== id));
    if (activePreviewTab === id) setActivePreviewTab('surattugas');
  };

  const handlePelaksanaChange = (id: string, field: string, value: string) => {
    setPelaksanaList(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addPengikutToPelaksana = (pelaksanaId: string) => {
    setPelaksanaList(pelaksanaList.map(p => {
      if (p.id === pelaksanaId) {
        if (p.pengikutList.length >= 5) return p;
        return { ...p, pengikutList: [...p.pengikutList, { nama: '', umur: '', keterangan: '' }] };
      }
      return p;
    }));
  };

  const removePengikutFromPelaksana = (pelaksanaId: string, pengikutIndex: number) => {
    setPelaksanaList(pelaksanaList.map(p => {
      if (p.id === pelaksanaId) {
        return { ...p, pengikutList: p.pengikutList.filter((_: any, i: number) => i !== pengikutIndex) };
      }
      return p;
    }));
  };

  const handlePengikutChange = (pelaksanaId: string, pengikutIndex: number, field: string, value: string) => {
    setPelaksanaList(prev => prev.map(p => {
      if (p.id === pelaksanaId) {
        const newPengikut = [...p.pengikutList];
        newPengikut[pengikutIndex] = { ...newPengikut[pengikutIndex], [field]: value };
        return { ...p, pengikutList: newPengikut };
      }
      return p;
    }));
  };

  const formatDateFull = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  useEffect(() => {
    if (!isDasarManual) {
      const tglStr = dasarTgl ? formatDate(dasarTgl) : '........';
      setDasarPenugasan(`surat undangan dengan nomor surat: ${dasarNo || '........'} tanggal ${tglStr}`);
    }
  }, [dasarNo, dasarTgl, isDasarManual]);

  const currentDateFormatted = () => {
    const d = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const generateHTML = () => {
    const activeKabupaten = localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan';
    const activeKecamatan = localStorage.getItem('kop_kecamatan') || 'Simpur';
    const activeDesa = localStorage.getItem('kop_desa') || 'Sukamakmur';
    const activeAlamat = localStorage.getItem('kop_alamat') || 'Jalan Keramat RT.002 RK.001 Kodepos 71261';
    const kontakKantor = localStorage.getItem('kop_kontak') || '0813 4686 7519, pemdessukamakmur@gmail.com';
    const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
    const isAn = roleKades.toLowerCase() !== 'kepala desa';
    const cleanDesaName = activeDesa.replace(/desa|kelurahan/gi, '').trim();
    const rightRoleHtml = isAn ? `a.n. Kepala Desa ${cleanDesaName},<br/>${roleKades}` : `${roleKades}`;

    const kopSuratHTML = `
        <div style="border-bottom:2px solid #000;margin-bottom:8px;padding-bottom:2px;">
          <div style="display:flex;align-items:center;font-family:Arial, sans-serif;">
            <div style="width:75px;height:75px;flex:none;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-right:10px;">
              <img src="${villageLogo}" style="width:100%;height:100%;object-fit:contain;" />
            </div>
            <div style="text-align:center;flex:1;">
              <div style="font-weight:bold;font-size:13px;text-transform:uppercase;line-height:1.1;margin:0 0 1px 0;">Pemerintah Kabupaten ${activeKabupaten.toUpperCase()}</div>
              <div style="font-weight:bold;font-size:13px;text-transform:uppercase;line-height:1.1;margin:0 0 1px 0;">Kecamatan ${activeKecamatan.toUpperCase()}</div>
              <div style="font-weight:900;font-size:20px;text-transform:uppercase;letter-spacing:1px;line-height:1.1;margin:1px 0 2px 0;">Desa ${activeDesa.toUpperCase()}</div>
              <div style="font-size:10px;text-transform:capitalize;line-height:1.1;margin:1px 0 0 0;">${activeAlamat}</div>
              <div style="font-size:10px;line-height:1.1;margin:1px 0 0 0;">${kontakKantor}</div>
            </div>
          </div>
        </div>
    `;

    const allParticipantsFlat = pelaksanaList.flatMap((p) => [
      { ...p, isLeader: true, groupId: p.id },
      ...(p.pengikutList || []).map((pg: any) => ({
        nama: pg.nama,
        jabatan: pg.keterangan || '-',
        pangkat: '-',
        nip: '-',
        isLeader: false,
        groupId: p.id
      }))
    ]); // Do not filter empty names so blank forms can be printed

    const generatePage2And3 = (participant: any) => `
          <!-- HALAMAN 2: VISUM SPPD (LANDSCAPE) -->
          <div class="page-landscape page-sppd bg-white shadow-lg mx-auto" style="${printLayout !== `sppd-${participant.groupId}` ? 'display: none;' : ''}">
            <div class="flex gap-4 h-full">
              <!-- Kiri -->
              <div class="w-[53%] pr-4">
                ${kopSuratHTML}
                
                <div class="flex justify-end text-[10px] pr-8 mb-2 mt-2">
                  <div class="grid grid-cols-[80px_10px_1fr]">
                    <span>Lembar ke</span><span>:</span><span>1</span>
                    <span>Kode Nomor</span><span>:</span><span>${kodeKlasifikasi}</span>
                    <span>Nomor</span><span>:</span><span>${nomorSurat}</span>
                  </div>
                </div>
                
                <div class="text-center text-[12px] mb-2">
                  <h6 class="font-bold underline uppercase text-[13px] tracking-wide">SURAT PERJALANAN DINAS</h6>
                </div>

                <table class="print-table text-[10px] mb-4">
                  <tbody>
                    <tr>
                      <td class="w-6 text-center">1</td>
                      <td class="w-[140px]">Pejabat berwenang yang memberi perintah</td>
                      <td>Kepala ${desaName}</td>
                    </tr>
                    <tr>
                      <td class="text-center">2</td>
                      <td>Nama Pegawai yang diperintah</td>
                      <td class="font-bold">${participant.nama}</td>
                    </tr>
                    <tr>
                      <td class="text-center">3</td>
                      <td>a. Pangkat dan golongan ruang<br>b. Jabatan<br>c. Tingkat menurut peraturan perjalanan</td>
                      <td>a. ${participant.pangkat}<br>b. ${participant.jabatan}<br>c. -</td>
                    </tr>
                    <tr>
                      <td class="text-center">4</td>
                      <td>Maksud perjalanan dinas</td>
                      <td>${maksudPerjalanan}</td>
                    </tr>
                    <tr>
                      <td class="text-center">5</td>
                      <td>Alat angkut yang dipergunakan</td>
                      <td>${alatAngkut}</td>
                    </tr>
                    <tr>
                      <td class="text-center">6</td>
                      <td>a. Tempat berangkat<br>b. Tempat Tujuan</td>
                      <td>a. ${tempatBerangkat}<br>b. ${tempatTujuan}</td>
                    </tr>
                    <tr>
                      <td class="text-center">7</td>
                      <td>a. Lamanya perjalanan dinas<br>b. Tanggal berangkat<br>c. Tanggal harus kembali</td>
                      <td>a. ${lamaPerjalanan}<br>b. ${formatDateFull(tanggalBerangkat)}<br>c. ${formatDateFull(tanggalKembali)}</td>
                    </tr>
                    <tr>
                        <td rowspan="2" class="text-center align-top">8</td>
                        <td class="font-bold align-middle pl-2">Pengikut/ Nama</td>
                        <td class="p-0 align-top border-b border-black">
                          <div class="flex w-full h-full min-h-[20px]">
                            <div class="w-[45%] border-r border-black p-1 text-center font-bold">Tgl Lahir</div>
                            <div class="w-[55%] p-1 text-center font-bold">Keterangan</div>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td class="align-top pl-2" style="min-height: 40px; padding-bottom: 8px;">
                          ${participant.pengikutList?.length > 0 ? participant.pengikutList.map((p: any, i: number) => `${i+1}. ${p.nama}<br>`).join('') : (participant.isLeader ? '1.<br>2.<br>3. dst' : '')}
                        </td>
                        <td class="p-0 align-top h-full">
                          <div class="flex w-full h-full min-h-[40px]">
                            <div class="w-[45%] border-r border-black p-1 text-center">
                              ${participant.pengikutList?.length > 0 ? participant.pengikutList.map((p: any) => `${p.umur}<br>`).join('') : ''}
                            </div>
                            <div class="w-[55%] p-1 text-center">
                              ${participant.pengikutList?.length > 0 ? participant.pengikutList.map((p: any) => `${p.keterangan}<br>`).join('') : ''}
                            </div>
                          </div>
                        </td>
                      </tr>
                    <tr>
                      <td class="text-center align-top">9</td>
                      <td>Pembebanan anggaran<br>a. Instansi<br>b. Mata anggaran</td>
                      <td class="align-top"><br>a. Pemerintah Desa ${cleanDesaName}<br>b. ${bebanAnggaran || '-'}</td>
                    </tr>
                    <tr>
                      <td class="text-center">10</td>
                      <td>Keterangan</td>
                      <td>-</td>
                    </tr>
                  </tbody>
                </table>

                <div class="flex justify-end text-[10px] mt-1 pr-4">
                  <div class="w-[200px]">
                    <div class="grid grid-cols-[80px_10px_1fr] mb-1">
                      <span>Dikeluarkan di</span><span>:</span><span>${desaName.replace(/desa|kelurahan/gi, '').trim()}</span>
                      <span>pada tanggal</span><span>:</span><span>${currentDateFormatted()}</span>
                    </div>
                    <div class="text-center w-full">
                      <div class="font-bold">${rightRoleHtml}</div>
                      <div class="h-12"></div>
                      <div class="font-bold uppercase">${namaKades}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Kanan -->
              <div class="w-[47%] pl-4 text-[9px] flex flex-col">
                <div class="pl-8 mb-2">
                  <div class="grid grid-cols-[90px_10px_1fr] leading-tight mb-2">
                    <span>I. SPPD Nomor</span><span>:</span><span>${nomorSurat}</span>
                    <span>Berangkat dari</span><span>:</span><span>${tempatBerangkat}</span>
                    <span class="pl-2 italic">(tempat kedudukan)</span><span></span><span></span>
                    <span>Pada tanggal</span><span>:</span><span>${formatDateFull(tanggalBerangkat)}</span>
                    <span>Ke</span><span>:</span><span>${tempatTujuan}</span>
                  </div>
                  <div class="text-center w-full">
                    <div class="font-bold">Pejabat Pelaksana Teknis Kegiatan,</div>
                    <div class="h-12"></div>
                    <div class="font-bold uppercase">${namaPPTK || '...................................................'}</div>
                  </div>
                </div>

                <table class="w-full border-collapse" style="border: 1px solid black;">
                  <tbody>
                    <!-- Box II -->
                    <tr>
                      <td class="border-b border-r border-black p-1 w-1/2 align-top">
                        <div class="grid grid-cols-[15px_45px_10px_1fr] leading-tight">
                          <span>II.</span><span>Tiba di</span><span>:</span><span>${tempatTujuan}</span>
                          <span></span><span>Pada tanggal</span><span>:</span><span>${formatDateFull(tanggalBerangkat)}</span>
                          <span></span><span>Kepala</span><span>:</span><span></span>
                        </div>
                        <div class="h-8"></div>
                        <div class="flex justify-center text-gray-500">..................................</div>
                      </td>
                      <td class="border-b border-black p-1 w-1/2 align-top">
                        <div class="grid grid-cols-[60px_10px_1fr] leading-tight pl-2">
                          <span>Berangkat dari</span><span>:</span><span>${tempatTujuan}</span>
                          <span>Ke</span><span>:</span><span>${tempatBerangkat}</span>
                          <span>Pada Tanggal</span><span>:</span><span>${formatDateFull(tanggalKembali)}</span>
                          <span>Kepala</span><span>:</span><span></span>
                        </div>
                        <div class="h-8"></div>
                        <div class="flex justify-center text-gray-500">..................................</div>
                      </td>
                    </tr>
                    
                    <!-- Box III -->
                    <tr>
                      <td class="border-b border-r border-black p-1 w-1/2 align-top">
                        <div class="grid grid-cols-[15px_45px_10px_1fr] leading-tight">
                          <span>III.</span><span>Tiba di</span><span>:</span><span></span>
                          <span></span><span>Pada tanggal</span><span>:</span><span></span>
                          <span></span><span>Kepala</span><span>:</span><span></span>
                        </div>
                        <div class="h-8"></div>
                        <div class="flex justify-center text-gray-500">..................................</div>
                      </td>
                      <td class="border-b border-black p-1 w-1/2 align-top">
                        <div class="grid grid-cols-[60px_10px_1fr] leading-tight pl-2">
                          <span>Berangkat dari</span><span>:</span><span></span>
                          <span>Ke</span><span>:</span><span></span>
                          <span>Pada Tanggal</span><span>:</span><span></span>
                          <span>Kepala</span><span>:</span><span></span>
                        </div>
                        <div class="h-8"></div>
                        <div class="flex justify-center text-gray-500">..................................</div>
                      </td>
                    </tr>
                    
                    <!-- Box IV -->
                    <tr>
                      <td class="border-b border-r border-black p-1 w-1/2 align-top">
                        <div class="grid grid-cols-[15px_45px_10px_1fr] leading-tight">
                          <span>IV.</span><span>Tiba di</span><span>:</span><span></span>
                          <span></span><span>Pada tanggal</span><span>:</span><span></span>
                          <span></span><span>Kepala</span><span>:</span><span></span>
                        </div>
                        <div class="h-8"></div>
                        <div class="flex justify-center text-gray-500">..................................</div>
                      </td>
                      <td class="border-b border-black p-1 w-1/2 align-top">
                        <div class="grid grid-cols-[60px_10px_1fr] leading-tight pl-2">
                          <span>Berangkat dari</span><span>:</span><span></span>
                          <span>Ke</span><span>:</span><span></span>
                          <span>Pada Tanggal</span><span>:</span><span></span>
                          <span>Kepala</span><span>:</span><span></span>
                        </div>
                        <div class="h-8"></div>
                        <div class="flex justify-center text-gray-500">..................................</div>
                      </td>
                    </tr>
                    
                    <!-- Box V -->
                    <tr>
                      <td colspan="2" class="border-b border-black p-1 align-top">
                        <div class="grid grid-cols-[15px_1fr] leading-tight">
                          <span>V.</span>
                          <div>
                            <div class="grid grid-cols-[60px_10px_1fr] leading-tight">
                              <span>Tiba di</span><span>:</span><span></span>
                              <span>Pada tanggal</span><span>:</span><span></span>
                            </div>
                            <div class="mt-1 leading-tight text-justify pr-2">
                              Telah diperiksa dengan keterangan bahwa perjalanan tersebut dilakukan atas perintah dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.
                            </div>
                          </div>
                        </div>
                        <div class="flex justify-center mt-2">
                          <div class="text-center w-full">
                            <div class="font-bold">${rightRoleHtml}</div>
                            <div class="h-12"></div>
                            <div class="font-bold uppercase">${namaKades}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Box VI -->
                    <tr>
                      <td colspan="2" class="border-b border-black p-1 align-top">
                        <div class="grid grid-cols-[15px_1fr] leading-tight">
                          <span>VI.</span><span>CATATAN LAIN-LAIN</span>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Box VII -->
                    <tr>
                      <td colspan="2" class="p-1 align-top">
                        <div class="grid grid-cols-[15px_1fr] leading-tight">
                          <span>VII.</span>
                          <div>
                            <span>PERHATIAN :</span>
                            <div class="text-justify leading-tight mt-1">
                              Pejabat yang berwenang menerbitkan SPPD, Pegawai yang melakukan Perjalanan Dinas Para pejabat yang mengesahkan tanggal berangkat/tiba serta Bendaharawan bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara, apabila Negara menderita rugi akibat kesalahan dan kealpaannya
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">
                ${SAAS_CONFIG.globalFooterHTML}
            </div>
          </div>

          <!-- HALAMAN 3: LEMBAR LAPORAN -->
          <div class="page-a4 page-laporan bg-white shadow-lg mx-auto" style="${printLayout !== `laporan-${participant.groupId}` ? 'display: none;' : ''}">
            <div class="text-[14px] text-black pt-12">
              <div class="text-center mb-10">
                <h6 class="font-bold uppercase text-[16px]">LAPORAN PERJALANAN DINAS</h6>
              </div>

              <div class="grid grid-cols-[150px_10px_1fr] gap-2 mb-8 max-w-xl mx-auto">
                <span>Kepada Yth</span><span>:</span><span>${kepadaYth}</span>
                <span>Dari</span><span>:</span><span></span>
                <span>Nama</span><span>:</span><span>${participant.nama}</span>
                <span>Jabatan</span><span>:</span><span>${participant.jabatan}</span>
                <span>Hari/Tanggal</span><span>:</span><span>${formatDateFull(tanggalBerangkat)}</span>
                <span>Perihal</span><span>:</span><span>${maksudPerjalanan}</span>
                <span>Tempat</span><span>:</span><span>${tempatTujuan}</span>
              </div>

              <div class="grid grid-cols-[150px_10px_1fr] gap-2 mb-8 max-w-xl mx-auto">
                <span>HASIL PERJALANAN</span><span>:</span><span></span>
              </div>

              <div class="flex justify-end pr-10 mt-32">
                <div class="text-center w-[250px]">
                  <p>Yang Melaporkan,</p>
                  <div class="h-24"></div>
                  <p class="font-bold underline">${participant.nama}</p>
                </div>
              </div>
            </div>
            <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">
                ${SAAS_CONFIG.globalFooterHTML}
            </div>
          </div>
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Surat Perjalanan Dinas (SPPD)</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
          <style>
            body { font-family: Arial, Helvetica, sans-serif; background: transparent; margin: 0; padding: 0; line-height: 1.5; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; overflow: hidden; }
            /* Hide scrollbar for Chrome, Safari and Opera */
            body::-webkit-scrollbar { display: none; }
            .page-a4 { width: 210mm; min-height: 297mm; padding: 15mm 20mm; position: relative; page-break-after: always; box-sizing: border-box; background: white; margin-bottom: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; }
            .page-landscape { width: 297mm; min-height: 210mm; padding: 10mm 15mm; position: relative; page-break-after: always; box-sizing: border-box; background: white; margin-bottom: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; }
            .page-a4:last-child, .page-landscape:last-child { page-break-after: auto; }
            .print-table { width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.2; }
            .print-table th, .print-table td { border: 1px solid black; padding: 2px 4px; vertical-align: top; }
            
            @media print {
              body { background: white; overflow: visible; margin: 0; padding: 0; }
              .page-a4 { width: 100% !important; min-height: 297mm !important; box-shadow: none; margin: 0; border-radius: 0; overflow: visible !important; }
              .page-landscape { width: 100% !important; min-height: 210mm !important; box-shadow: none; margin: 0; border-radius: 0; overflow: visible !important; }
              
              ${printLayout === 'surattugas' ? `@page { size: portrait; margin: 0; }` : ''}
              ${printLayout.startsWith('sppd-') ? `@page { size: landscape; margin: 0; }` : ''}
              ${printLayout.startsWith('laporan-') ? `@page { size: portrait; margin: 0; }` : ''}
            }
          </style>
        </head>
        <body>

          <!-- HALAMAN 1: SURAT TUGAS -->
          <div class="page-a4 page-spt bg-white shadow-lg mx-auto" style="${printLayout !== 'surattugas' ? 'display: none;' : ''}">
            ${kopSuratHTML}
            
            <div class="text-[14px] text-black">
              <div class="text-center mb-8">
                <h6 class="font-bold underline uppercase text-[16px]">SURAT TUGAS</h6>
                <p class="font-bold mt-1">Nomor : ${nomorSurat}</p>
              </div>

              <div class="mb-6 text-justify leading-relaxed">
                Berdasarkan ${dasarPenugasan},
              </div>

              <div class="text-center font-bold mb-6">MEMERINTAHKAN</div>
              
              <table class="print-table mb-8">
                <thead>
                  <tr class="bg-gray-50">
                    <th class="w-12 text-center py-3">NO</th>
                    <th class="text-center py-3">NAMA</th>
                    <th class="text-center py-3">JABATAN</th>
                  </tr>
                </thead>
                <tbody>
                  ${allParticipantsFlat.map((p: any, i: number) => `
                    <tr>
                      <td class="text-center py-3">${i+1}</td>
                      <td class="py-3 font-semibold">${p.nama}</td>
                      <td class="py-3">${p.jabatan || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="grid grid-cols-[130px_10px_1fr] gap-2 mb-10 text-[14px]">
                <span class="font-semibold">Hari/Tanggal</span><span>:</span>
                <span>${formatDateFull(tanggalBerangkat)}</span>
                
                <span class="font-semibold">Perihal</span><span>:</span>
                <span>${maksudPerjalanan}</span>

                <span class="font-semibold">Tempat</span><span>:</span>
                <span>${tempatTujuan}</span>
              </div>

              <div class="mb-10 text-justify leading-relaxed">Demikian surat tugas ini untuk dilaksanakan sebagaimana mestinya.</div>

              ${getPrintSignatureHTML(desaName, currentDateFormatted(), namaKades, roleKades, nipKades, includeCamat)}
            </div>
            <div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">
                ${SAAS_CONFIG.globalFooterHTML}
            </div>
          </div>

          ${allParticipantsFlat.map((p: any) => generatePage2And3(p)).join('')}

        </body>
      </html>
    `;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-none sticky top-16 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 text-gray-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {editData ? 'Edit SPPD' : 'Buat SPPD'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Surat Perjalanan Dinas</p>
          </div>
        </div>

        {/* Center: Tab switcher — fixed layout, no shift */}
        <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
          <button
            onClick={() => setActiveTab('form')}
            className={`flex items-center gap-1.5 min-w-[140px] justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'form'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-500 dark:text-slate-400'
            }`}
          >
            <FileText size={14} /> Pengisian Form
          </button>
          <button
            onClick={() => setActiveTab('cetak')}
            className={`flex items-center gap-1.5 min-w-[150px] justify-center px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'cetak'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-500 dark:text-slate-400'
            }`}
          >
            <Eye size={14} /> Pratinjau & Cetak
          </button>
        </div>

        {/* Right: actions — always the same */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg font-mono text-sm font-semibold border border-emerald-100 dark:border-emerald-500/20">
            {kodeKlasifikasi}/{nomorSurat}
          </div>
          <button
            onClick={handleRecord}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm shadow-emerald-200 dark:shadow-none font-semibold disabled:opacity-50 text-sm"
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan...' : (hasRecorded ? 'Perbarui Data' : 'Catat & Simpan')}
          </button>
        </div>
    </div>

      {/* TAB: PENGISIAN FORM */}
      {activeTab === 'form' && (
      <div className="max-w-2xl mx-auto space-y-6">

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Identitas Surat</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nomor Surat</label>
                <input 
                  type="text" 
                  value={nomorSurat}
                  onChange={(e) => setNomorSurat(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  placeholder="Format Lengkap (Misal: 094 / ...)"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Daftar Pelaksana Perjalanan Dinas</h3>
            </div>
            
            <div className="space-y-6">
              {pelaksanaList.map((pelaksana, pIdx) => (
                <div key={pelaksana.id} className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-slate-700">
                    <h4 className="font-semibold text-gray-800 dark:text-slate-200 text-sm">
                      Pelaksana No. {pIdx + 1} {pIdx === 0 ? '(Ketua Rombongan)' : ''}
                    </h4>
                    {pelaksanaList.length > 1 && (
                      <button onClick={() => removePelaksana(pelaksana.id)} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 font-medium">
                        <Trash2 size={14} /> Hapus
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-4 mb-4">
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={pelaksana.nama}
                          onChange={(e) => {
                            handlePelaksanaChange(pelaksana.id, 'nama', e.target.value);
                            setActivePelaksanaDropdown(pelaksana.id);
                          }}
                          onFocus={() => setActivePelaksanaDropdown(pelaksana.id)}
                          onBlur={() => setTimeout(() => setActivePelaksanaDropdown(null), 200)}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 bg-white"
                          placeholder="Ketik nama aparat / penduduk..."
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      </div>
                      {activePelaksanaDropdown === pelaksana.id && pelaksana.nama.length > 1 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 max-h-60 overflow-y-auto z-50">
                          {[...officers, ...residents].filter((r: any) => (r.name || r.nama || '').toLowerCase().includes(pelaksana.nama.toLowerCase()) || (r.nik || r.nip || '').includes(pelaksana.nama)).slice(0, 5).map((res: any, idx: number) => (
                            <button
                              key={res.nik || res.nip || idx}
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input onBlur from firing before selection
                                handlePelaksanaChange(pelaksana.id, 'nama', res.name || res.nama || '');
                                handlePelaksanaChange(pelaksana.id, 'nip', res.nik || res.nip || '');
                                handlePelaksanaChange(pelaksana.id, 'jabatan', res.pekerjaan || res.jabatan || '');
                                setActivePelaksanaDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                            >
                              <div className="font-semibold text-gray-900 dark:text-white text-sm">{res.name || res.nama}</div>
                              <div className="text-xs text-gray-500 dark:text-slate-400">{res.nik ? `NIK: ${res.nik}` : (res.nip ? `NIP: ${res.nip}` : '')} &bull; {res.pekerjaan || res.jabatan || 'Tidak ada keterangan'}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">NIP/NIK (Opsional)</label>
                        <input 
                          type="text" 
                          value={pelaksana.nip}
                          onChange={(e) => handlePelaksanaChange(pelaksana.id, 'nip', e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 bg-white"
                          placeholder="NIP / NIK"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pangkat/Gol (Opsional)</label>
                        <input 
                          type="text" 
                          value={pelaksana.pangkat}
                          onChange={(e) => handlePelaksanaChange(pelaksana.id, 'pangkat', e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 bg-white"
                          placeholder="Misal: II/a"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Jabatan / Keterangan</label>
                      <input 
                        type="text" 
                        value={pelaksana.jabatan}
                        onChange={(e) => handlePelaksanaChange(pelaksana.id, 'jabatan', e.target.value)}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 bg-white"
                        placeholder="Misal: Kaur Keuangan"
                      />
                    </div>
                  </div>

                  {/* Pengikut Section for this Pelaksana */}
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-semibold text-gray-700 dark:text-slate-300 text-xs uppercase tracking-wider">Pengikut (Bawaan No. {pIdx + 1})</h5>
                      {pelaksana.pengikutList.length < 5 && (
                        <button 
                          onClick={() => addPengikutToPelaksana(pelaksana.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 text-xs rounded transition-colors"
                        >
                          <Plus size={12} /> Tambah Pengikut
                        </button>
                      )}
                    </div>
                    {pelaksana.pengikutList.length === 0 ? (
                      <div className="text-center py-4 text-xs text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-gray-200 dark:border-slate-700">
                        Tidak ada pengikut.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {pelaksana.pengikutList.map((p: any, index: number) => (
                          <div key={index} className="flex gap-2 items-start bg-white dark:bg-slate-900 p-2 rounded-lg border border-gray-100 dark:border-slate-700">
                            <div className="flex-1 grid grid-cols-12 gap-2">
                              <div className="col-span-5 relative">
                                <input 
                                  type="text" 
                                  value={p.nama}
                                  onChange={(e) => {
                                    handlePengikutChange(pelaksana.id, index, 'nama', e.target.value);
                                    setActivePengikutDropdown(`${pelaksana.id}-${index}`);
                                  }}
                                  onFocus={() => setActivePengikutDropdown(`${pelaksana.id}-${index}`)}
                                  onBlur={() => setTimeout(() => setActivePengikutDropdown(null), 200)}
                                  className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                                  placeholder="Nama Pengikut"
                                />
                                {activePengikutDropdown === `${pelaksana.id}-${index}` && p.nama.length > 1 && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 max-h-48 overflow-y-auto z-50">
                                    {[...officers, ...residents].filter((r: any) => (r.name || r.nama || '').toLowerCase().includes(p.nama.toLowerCase()) || (r.nik || r.nip || '').includes(p.nama)).slice(0, 5).map((res: any, idx: number) => (
                                      <button
                                        key={res.nik || res.nip || idx}
                                        onMouseDown={(e) => {
                                          e.preventDefault(); // Prevent input onBlur from firing before selection
                                          handlePengikutChange(pelaksana.id, index, 'nama', res.name || res.nama || '');
                                          handlePengikutChange(pelaksana.id, index, 'umur', (res.umur ? res.umur.toString() : (res.nik || res.nip || '')));
                                          handlePengikutChange(pelaksana.id, index, 'keterangan', res.pekerjaan || res.jabatan || '');
                                          setActivePengikutDropdown(null);
                                        }}
                                        className="w-full text-left px-2 py-1.5 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                                      >
                                        <div className="font-medium text-gray-900 dark:text-white text-[11px]">{res.name || res.nama}</div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="col-span-3">
                                <input 
                                  type="text" 
                                  value={p.umur}
                                  onChange={(e) => handlePengikutChange(pelaksana.id, index, 'umur', e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                                  placeholder="Umur"
                                />
                              </div>
                              <div className="col-span-4">
                                <input 
                                  type="text" 
                                  value={p.keterangan}
                                  onChange={(e) => handlePengikutChange(pelaksana.id, index, 'keterangan', e.target.value)}
                                  className="w-full px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                                  placeholder="Keterangan"
                                />
                              </div>
                            </div>
                            <button 
                              onClick={() => removePengikutFromPelaksana(pelaksana.id, index)}
                              className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors mt-0.5"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <button 
                onClick={addPelaksana}
                className="w-full flex justify-center items-center gap-2 py-3 bg-emerald-50 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 text-sm font-semibold rounded-xl transition-colors border border-emerald-100 dark:border-slate-700"
              >
                <Plus size={16} /> Tambah Orang yang Melakukan Perjalanan Dinas
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Detail Perjalanan Dinas & Dasar</h3>
            <div className="space-y-4 mb-4">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Dasar Penugasan</label>
                  <label className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 cursor-pointer hover:bg-emerald-50 dark:hover:bg-slate-800 p-1 px-2 rounded transition-colors">
                    <input 
                      type="checkbox" 
                      checked={isDasarManual} 
                      onChange={(e) => setIsDasarManual(e.target.checked)} 
                      className="rounded border-gray-300 dark:border-slate-600 text-emerald-500 focus:ring-emerald-500" 
                    />
                    Isi Manual (Format Lain)
                  </label>
                </div>
                {!isDasarManual ? (
                  <div className="flex gap-3 items-center">
                    <input 
                      type="text" 
                      value={dasarNo} 
                      onChange={(e) => setDasarNo(e.target.value)} 
                      placeholder="Nomor Surat Undangan..." 
                      className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm" 
                    />
                    <input 
                      type="date" 
                      value={dasarTgl} 
                      onChange={(e) => setDasarTgl(e.target.value)} 
                      className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm w-48" 
                    />
                  </div>
                ) : (
                  <textarea 
                    value={dasarPenugasan}
                    onChange={(e) => setDasarPenugasan(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm"
                    rows={2}
                    placeholder="Misal: Dokumen Pelaksanaan Anggaran (DPA)..."
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pejabat Pelaksana Teknis (PPTK)</label>
                <select
                  value={namaPPTK}
                  onChange={(e) => setNamaPPTK(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm"
                >
                  <option value="">-- Pilih PPTK (Jika Ada) --</option>
                  {officers.length > 0 ? (
                    officers.map((officer: any, idx: number) => (
                      <option key={idx} value={officer.name}>{officer.name} - {officer.role}</option>
                    ))
                  ) : (
                    <option value={namaPPTK}>{namaPPTK}</option>
                  )}
                </select>
              </div>
            </div>
            
            <div className="h-px bg-gray-200 dark:bg-slate-700 my-4"></div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Maksud Perjalanan</label>
                <textarea 
                  value={maksudPerjalanan}
                  onChange={(e) => setMaksudPerjalanan(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 min-h-[80px]"
                  placeholder="Misal: Konsultasi terkait dana desa..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tempat Tujuan</label>
                <textarea 
                  value={tempatTujuan}
                  onChange={(e) => setTempatTujuan(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  rows={2}
                  placeholder="Tempat Tujuan (Bisa diisi panjang jika perlu)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Alat Angkut</label>
                  <select 
                    value={alatAngkut}
                    onChange={(e) => setAlatAngkut(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  >
                    <option value="">-- Pilih Alat Angkut --</option>
                    <option value="Kendaraan Dinas">Kendaraan Dinas</option>
                    <option value="Kendaraan Umum">Kendaraan Umum</option>
                    <option value="Kendaraan Pribadi">Kendaraan Pribadi</option>
                    <option value="Pesawat Udara">Pesawat Udara</option>
                    <option value="Kapal Laut">Kapal Laut</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Lama Perjalanan (Hari)</label>
                  <input 
                    type="text" 
                    value={lamaPerjalanan}
                    onChange={(e) => setLamaPerjalanan(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                    placeholder="Misal: 1 (Satu) Hari"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tanggal Berangkat</label>
                  <input 
                    type="date" 
                    value={tanggalBerangkat}
                    onChange={(e) => setTanggalBerangkat(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tanggal Kembali</label>
                  <input 
                    type="date" 
                    value={tanggalKembali}
                    onChange={(e) => setTanggalKembali(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Pembebanan Anggaran</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mata Anggaran</label>
                <input 
                  type="text" 
                  value={bebanAnggaran}
                  onChange={(e) => setBebanAnggaran(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  placeholder="Misal: APBDes Tahun 2026"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Pengaturan Tanda Tangan</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pejabat Penandatangan</label>
                <select
                  value={namaKades}
                  onChange={(e) => {
                    const selected = officers.find((o: any) => o.name === e.target.value);
                    if (selected) {
                      setNamaKades(selected.name);
                      setRoleKades(selected.role);
                      setNipKades(selected.nip || '');
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                >
                  {officers.length > 0 ? (
                    officers.map((officer: any, idx: number) => (
                      <option key={idx} value={officer.name}>{officer.name} - {officer.role}</option>
                    ))
                  ) : (
                    <option value={namaKades}>{namaKades} - {roleKades}</option>
                  )}
                </select>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Jika memilih selain Kepala Desa, sistem akan otomatis menambahkan keterangan <strong>"A.n. Kepala Desa,"</strong>.
                </p>
              </div>
              
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-start gap-3 cursor-pointer p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                  <input 
                    type="checkbox"
                    checked={includeCamat}
                    onChange={(e) => setIncludeCamat(e.target.checked)}
                    className="w-5 h-5 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tambahkan Kolom Mengetahui Camat</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gunakan format 2 tanda tangan pada Surat Tugas (Camat di sebelah kiri)</div>
                  </div>
                </label>
              </div>
            </div>
          </div>

      </div>
      )}


      {/* TAB: PRATINJAU & CETAK */}
      {activeTab === 'cetak' && (
        <div className="h-[calc(100vh-160px)] flex flex-col">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden h-full">

            {/* Document selector bar */}
            <div className="flex flex-col border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 shrink-0">
              {/* Row 1: Surat Tugas */}
              <div className="flex items-center gap-4 p-3 overflow-x-auto">
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 w-24 shrink-0">Surat Tugas:</span>
                <button
                  onClick={() => setPrintLayout('surattugas')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all border ${
                    printLayout === 'surattugas'
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                      : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-600'
                  }`}
                >
                  <FileText size={14} /> Cetak Surat Tugas
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5">
                    <button onClick={() => setZoomLevel(z => Math.max(0.3, z - 0.1))} className="p-1.5 text-gray-500 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs font-mono w-10 text-center text-gray-700 dark:text-slate-300">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.1))} className="p-1.5 text-gray-500 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors"><ZoomIn className="w-4 h-4" /></button>
                  </div>
                  <button
                    onClick={handlePrint}
                    disabled={!nomorSurat}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-slate-700 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                  >
                    <Printer size={14} /> Cetak Sekarang
                  </button>
                </div>
              </div>
              
              {/* Row 2: SPPD */}
              <div className="flex items-center gap-4 p-3 border-t border-gray-100 dark:border-slate-700/50 overflow-x-auto">
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 w-24 shrink-0">SPPD (Lanskap):</span>
                {pelaksanaList.map((p, idx) => (
                  <button
                    key={`sppd-${p.id}`}
                    onClick={() => setPrintLayout(`sppd-${p.id}`)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all border ${
                      printLayout === `sppd-${p.id}`
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-600'
                    }`}
                  >
                    <Printer size={14} />
                    <span className="truncate max-w-[120px]">{p.nama ? p.nama.split(' ')[0] : `Pelaksana ${idx + 1}`}</span>
                  </button>
                ))}
              </div>

              {/* Row 3: Laporan */}
              <div className="flex items-center gap-4 p-3 border-t border-gray-100 dark:border-slate-700/50 overflow-x-auto">
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 w-24 shrink-0">Laporan:</span>
                {pelaksanaList.map((p, idx) => (
                  <button
                    key={`laporan-${p.id}`}
                    onClick={() => setPrintLayout(`laporan-${p.id}`)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all border ${
                      printLayout === `laporan-${p.id}`
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                        : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-600'
                    }`}
                  >
                    <FileText size={14} />
                    <span className="truncate max-w-[120px]">{p.nama ? p.nama.split(' ')[0] : `Pelaksana ${idx + 1}`}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Document label banner */}
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800/30 shrink-0 flex items-center gap-3">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pratinjau:</span>
              {printLayout === 'surattugas' && (
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Surat Tugas (Kertas Portrait)</span>
              )}
              {pelaksanaList.map((p, idx) =>
                printLayout === `sppd-${p.id}` ? (
                  <span key={`lbl-sppd-${p.id}`} className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    SPPD — Pelaksana {idx + 1}: {p.nama || '—'} (Kertas Lanskap)
                  </span>
                ) : printLayout === `laporan-${p.id}` ? (
                  <span key={`lbl-lap-${p.id}`} className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Laporan — Pelaksana {idx + 1}: {p.nama || '—'} (Kertas Portrait)
                  </span>
                ) : null
              )}
            </div>

            {/* Preview iframe */}
            <div
              {...dragProps}
              className="flex-1 overflow-auto p-8 flex flex-col items-center bg-slate-200/50 dark:bg-slate-800/50"
            >
              <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.2s ease', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <iframe
                  ref={iframeRef}
                  scrolling="no"
                  className="pointer-events-none"
                  style={{
                    width: '297mm',
                    minHeight: '297mm',
                    height: printLayout.startsWith('sppd-') ? '215mm' : '300mm',
                    border: 'none',
                    background: 'transparent'
                  }}
                  srcDoc={generateHTML()}
                  title="Print Preview SPPD"
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
