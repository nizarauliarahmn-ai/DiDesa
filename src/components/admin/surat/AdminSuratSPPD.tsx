import React, { useState, useEffect, useRef, Component } from 'react';
import { ArrowLeft, Printer, Save, Plus, Trash2, Search } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { useLetterKode } from '../../../hooks/useLetterKode';
import { getLetterClassifications, generateLetterNumber } from '../../../utils/letterClassifications';
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

  // Desa Settings
  const [desaName, setDesaName] = useState('Desa Wasah Hilir');
  const [namaKades, setNamaKades] = useState('NIZAR AULIA RAHMAN');
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
  const [showPegawaiDropdown, setShowPegawaiDropdown] = useState(false);
  const [activePengikutDropdown, setActivePengikutDropdown] = useState<number | null>(null);

  useEffect(() => {
    fetchResidentsCached()
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => {
        if (Array.isArray(data)) setResidents(data);
      })
      .catch(err => console.error("Failed to load residents for SPPD:", err));
  }, []);

  // Pegawai / Yang Diperintah
  const [namaPegawai, setNamaPegawai] = useState(editData?.namaPegawai || '');
  const [nipPegawai, setNipPegawai] = useState(editData?.nipPegawai || '');
  const [pangkatGolongan, setPangkatGolongan] = useState(editData?.pangkatGolongan || '');
  const [jabatanPegawai, setJabatanPegawai] = useState(editData?.jabatanPegawai || '');

  // Dasar & Pelaporan
  const [dasarPenugasan, setDasarPenugasan] = useState(editData?.dasarPenugasan || 'surat undangan dengan nomor surat: ........ tanggal ........');
  const [namaPPTK, setNamaPPTK] = useState(editData?.namaPPTK || '');
  const [kepadaYth, setKepadaYth] = useState(editData?.kepadaYth || 'Kepala Desa Wasah Hilir');

  // Detail Perjalanan
  const [maksudPerjalanan, setMaksudPerjalanan] = useState(editData?.maksudPerjalanan || '');
  const [alatAngkut, setAlatAngkut] = useState(editData?.alatAngkut || '');
  const [tempatBerangkat, setTempatBerangkat] = useState(editData?.tempatBerangkat || 'Desa Wasah Hilir');
  const [tempatTujuan, setTempatTujuan] = useState(editData?.tempatTujuan || '');
  const [lamaPerjalanan, setLamaPerjalanan] = useState(editData?.lamaPerjalanan || '1 (Satu) Hari');
  const [tanggalBerangkat, setTanggalBerangkat] = useState(editData?.tanggalBerangkat || '');
  const [tanggalKembali, setTanggalKembali] = useState(editData?.tanggalKembali || '');
  
  // Anggaran
  const [bebanAnggaran, setBebanAnggaran] = useState(editData?.bebanAnggaran || 'APBDes');
  const [mataAnggaran, setMataAnggaran] = useState(editData?.mataAnggaran || '');

  // Pengikut
  const [pengikut, setPengikut] = useState<{nama: string, umur: string, keterangan: string}[]>(editData?.pengikut || []);

  const [printLayout, setPrintLayout] = useState('semua'); // 'semua', 'spt', 'sppd', 'laporan'

  const scrollRef = useDragScroll();

  useEffect(() => {
    setDesaName(localStorage.getItem('kop_desa') || 'Wasah Hilir');
    setNamaKades(localStorage.getItem('kop_kades') || 'NIZAR AULIA RAHMAN');
    setRoleKades('Kepala Desa');
    
    const officersList = JSON.parse(localStorage.getItem('village_officers') || '[]');
    const activeKades = localStorage.getItem('kop_kades');
    const found = officersList.find((o: any) => o.name === activeKades);
    setNipKades(found?.nip || '');
    setIncludeCamat(false);

    if (editData?.nomorSurat) {
      setNomorSurat(editData.nomorSurat.split('/').pop() || '');
    } else {
      setNomorSurat(generateLetterNumber('SPPD', kodeKlasifikasi));
    }
  }, [editData, kodeKlasifikasi]);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
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
      const fullNomor = `${kodeKlasifikasi}/${nomorSurat}`;
      const payload = {
        klasifikasi: 'SPPD',
        nomorSurat: fullNomor,
        tanggal: new Date().toISOString(),
        pemohon: namaPegawai,
        nikPemohon: nipPegawai || '-',
        namaPegawai,
        nipPegawai,
        pangkatGolongan,
        jabatanPegawai,
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
        kepadaYth,
        pengikut
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

  const addPengikut = () => {
    setPengikut([...pengikut, { nama: '', umur: '', keterangan: '' }]);
  };

  const removePengikut = (index: number) => {
    setPengikut(pengikut.filter((_, i) => i !== index));
  };

  const handlePengikutChange = (index: number, field: string, value: string) => {
    const newPengikut = [...pengikut];
    newPengikut[index] = { ...newPengikut[index], [field]: value };
    setPengikut(newPengikut);
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

  const currentDateFormatted = () => {
    const d = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const generateHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Surat Perjalanan Dinas (SPPD)</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap');
            body { font-family: 'Times New Roman', Times, serif; background: white; margin: 0; padding: 0; }
            .page-a4 { width: 210mm; min-height: 297mm; padding: 15mm 20mm; position: relative; page-break-after: always; box-sizing: border-box; }
            .page-landscape { width: 330mm; min-height: 210mm; padding: 10mm 15mm; position: relative; page-break-after: always; box-sizing: border-box; }
            .page-a4:last-child, .page-landscape:last-child { page-break-after: auto; }
            .print-table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .print-table th, .print-table td { border: 1px solid black; padding: 4px 8px; vertical-align: top; }
            
            @media print {
              body { background: white; }
              .page-a4, .page-landscape { padding: 0 !important; min-height: auto; box-shadow: none; margin: 0; }
              
              ${printLayout === 'spt' ? `@page { size: portrait; margin: 15mm 20mm; } .page-spt { display: block; } .page-sppd { display: none; } .page-laporan { display: none; }` : ''}
              ${printLayout === 'sppd' ? `@page { size: landscape; margin: 10mm 15mm; } .page-spt { display: none; } .page-sppd { display: block; } .page-laporan { display: none; }` : ''}
              ${printLayout === 'laporan' ? `@page { size: portrait; margin: 15mm 20mm; } .page-spt { display: none; } .page-sppd { display: none; } .page-laporan { display: block; }` : ''}
              ${printLayout === 'semua' ? `@page { size: portrait; margin: 15mm 20mm; } .page-spt { display: block; } .page-sppd { display: block; } .page-laporan { display: block; }` : ''}
            }

            /* Non-print layout visibility */
            ${printLayout !== 'semua' ? `
              .page-spt { display: ${printLayout === 'spt' ? 'block' : 'none'}; }
              .page-sppd { display: ${printLayout === 'sppd' ? 'block' : 'none'}; }
              .page-laporan { display: ${printLayout === 'laporan' ? 'block' : 'none'}; }
            ` : ''}
          </style>
        </head>
        <body>

          <!-- HALAMAN 1: SURAT TUGAS -->
          <div class="page-a4 page-spt bg-white shadow-lg mb-8 mx-auto" style="${printLayout === 'semua' ? 'margin-bottom: 2rem;' : ''}">
            ${SAAS_CONFIG.globalHeaderHTML}
            
            <div class="text-[14px] text-black">
              <div class="text-center mb-6">
                <h6 class="font-bold underline uppercase text-[16px] tracking-wide">SURAT TUGAS</h6>
                <p class="font-bold">${kodeKlasifikasi} / ${nomorSurat}</p>
              </div>

              <div class="mb-4 text-justify">
                Berdasarkan ${dasarPenugasan},
              </div>

              <div class="text-center font-bold mb-4">MEMERINTAHKAN</div>
              
              <table class="print-table mb-6">
                <thead>
                  <tr>
                    <th class="w-12 text-center">NO</th>
                    <th class="text-center">NAMA</th>
                    <th class="text-center">JABATAN</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="text-center">1</td>
                    <td>${namaPegawai}</td>
                    <td>${jabatanPegawai}</td>
                  </tr>
                  ${pengikut.map((p, i) => `
                    <tr>
                      <td class="text-center">${i+2}</td>
                      <td>${p.nama}</td>
                      <td>${p.keterangan || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="grid grid-cols-[120px_10px_1fr] gap-1 mb-8">
                <span>Hari/Tanggal</span><span>:</span>
                <span>${formatDateFull(tanggalBerangkat)}</span>
                
                <span>Perihal</span><span>:</span>
                <span>${maksudPerjalanan}</span>

                <span>Tempat</span><span>:</span>
                <span>${tempatTujuan}</span>
              </div>

              <div class="mb-8">Demikian surat tugas ini untuk dilaksanakan sebagaimana mestinya.</div>

              ${getPrintSignatureHTML(desaName, currentDateFormatted(), namaKades, roleKades, nipKades, includeCamat)}
            </div>
          </div>

          <!-- HALAMAN 2: VISUM SPPD (LANDSCAPE) -->
          <div class="page-landscape page-sppd bg-white shadow-lg mb-8 mx-auto" style="${printLayout === 'semua' ? 'margin-bottom: 2rem;' : ''}">
            <div class="flex gap-4 h-full">
              
              <!-- Kiri -->
              <div class="w-[53%] pr-4 border-r border-gray-400">
                ${SAAS_CONFIG.globalHeaderHTML}
                <div class="flex justify-center my-4">
                  <div class="w-full h-px bg-black"></div>
                </div>
                
                <div class="text-center text-[12px] mb-4">
                  <div class="grid grid-cols-[120px_10px_1fr] text-left mx-auto max-w-[200px]">
                    <span>Kode Nomor</span><span>:</span><span>${kodeKlasifikasi}</span>
                    <span>Nomor</span><span>:</span><span>${kodeKlasifikasi}/${nomorSurat}</span>
                  </div>
                  <h6 class="font-bold underline uppercase text-[14px] mt-2">SURAT PERJALANAN DINAS</h6>
                </div>

                <table class="print-table text-[11px] mb-4">
                  <tbody>
                    <tr>
                      <td class="w-6 text-center">1</td>
                      <td class="w-[140px]">Pejabat berwenang yang memberi perintah</td>
                      <td>Kepala ${desaName}</td>
                    </tr>
                    <tr>
                      <td class="text-center">2</td>
                      <td>Nama / NIP Pegawai yang diperintahkan</td>
                      <td class="font-bold">${namaPegawai} ${nipPegawai ? '/ ' + nipPegawai : ''}</td>
                    </tr>
                    <tr>
                      <td class="text-center">3</td>
                      <td>a. Pangkat dan golongan ruang gaji<br>b. Jabatan<br>c. Tingkat menurut peraturan perjalanan</td>
                      <td>a. ${pangkatGolongan || '-'}<br>b. ${jabatanPegawai || '-'}<br>c. -</td>
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
                      <td>a. Tempat berangkat<br>b. Tempat tujuan</td>
                      <td>a. ${tempatBerangkat}<br>b. ${tempatTujuan}</td>
                    </tr>
                    <tr>
                      <td class="text-center">7</td>
                      <td>a. Lamanya perjalanan dinas<br>b. Tanggal berangkat<br>c. Tanggal harus kembali</td>
                      <td>a. ${lamaPerjalanan}<br>b. ${formatDateFull(tanggalBerangkat)}<br>c. ${formatDateFull(tanggalKembali)}</td>
                    </tr>
                    <tr>
                      <td class="text-center">8</td>
                      <td colspan="2">
                        <div class="grid grid-cols-[1fr_80px_1fr] font-bold border-b border-black pb-1 mb-1">
                          <div>Pengikut Nama</div>
                          <div>Umur/Tgl Lahir</div>
                          <div>Keterangan</div>
                        </div>
                        ${pengikut.length > 0 ? pengikut.map((p, i) => `
                          <div class="grid grid-cols-[15px_1fr_80px_1fr]">
                            <div>${i+1}.</div>
                            <div>${p.nama}</div>
                            <div>${p.umur}</div>
                            <div>${p.keterangan}</div>
                          </div>
                        `).join('') : '<div class="text-center italic">-</div>'}
                      </td>
                    </tr>
                    <tr>
                      <td class="text-center">9</td>
                      <td>Pembebanan anggaran<br>a. Instansi<br>b. Mata anggaran</td>
                      <td>a. ${bebanAnggaran}<br>b. ${mataAnggaran || '-'}</td>
                    </tr>
                    <tr>
                      <td class="text-center">10</td>
                      <td>Keterangan lain-lain</td>
                      <td>-</td>
                    </tr>
                  </tbody>
                </table>

                <div class="flex justify-end text-[11px] mt-4">
                  <div class="w-[200px]">
                    <div class="grid grid-cols-[80px_10px_1fr]">
                      <span>Dikeluarkan di</span><span>:</span><span>${desaName.replace(/desa|kelurahan/gi, '').trim()}</span>
                      <span>Pada tanggal</span><span>:</span><span>${currentDateFormatted()}</span>
                    </div>
                    <div class="mt-2 font-bold">${roleKades},</div>
                    <div class="h-12"></div>
                    <div class="font-bold underline">${namaKades}</div>
                  </div>
                </div>
              </div>
              
              <!-- Kanan -->
              <div class="w-[47%] pl-4 text-[11px] flex flex-col">
                
                <!-- Box I -->
                <div class="grid grid-cols-[1fr_auto] mb-2">
                  <div></div>
                  <div>
                    <div class="grid grid-cols-[20px_100px_10px_1fr]">
                      <span>I.</span><span>SPPD Nomor</span><span>:</span><span>${kodeKlasifikasi}/${nomorSurat}</span>
                      <span></span><span>Berangkat dari</span><span>:</span><span>${tempatBerangkat}</span>
                      <span></span><span>Pada tanggal</span><span>:</span><span>${formatDateFull(tanggalBerangkat)}</span>
                      <span></span><span>Ke</span><span>:</span><span>${tempatTujuan}</span>
                    </div>
                    <div class="mt-4 mb-8 text-center">Pejabat Pelaksana Teknis Kegiatan,</div>
                    <div class="text-center font-bold">${namaPPTK || '................................'}</div>
                  </div>
                </div>

                <!-- Box II -->
                <div class="border-t border-black py-2 grid grid-cols-2 gap-2">
                  <div>
                    <div class="grid grid-cols-[20px_60px_10px_1fr]">
                      <span>II.</span><span>Tiba di</span><span>:</span><span>${tempatTujuan}</span>
                      <span></span><span>Pada tanggal</span><span>:</span><span>${formatDateFull(tanggalBerangkat)}</span>
                      <span></span><span>Kepala</span><span>:</span><span></span>
                    </div>
                    <div class="h-10"></div>
                    <div class="text-center">(.......................................)</div>
                  </div>
                  <div>
                    <div class="grid grid-cols-[80px_10px_1fr]">
                      <span>Berangkat dari</span><span>:</span><span>${tempatTujuan}</span>
                      <span>Ke</span><span>:</span><span>${tempatBerangkat}</span>
                      <span>Pada Tanggal</span><span>:</span><span>${formatDateFull(tanggalKembali)}</span>
                    </div>
                    <div class="h-10"></div>
                    <div class="text-center">(.......................................)</div>
                  </div>
                </div>

                <!-- Box III -->
                <div class="border-t border-black py-2 grid grid-cols-2 gap-2">
                  <div>
                    <div class="grid grid-cols-[20px_60px_10px_1fr]">
                      <span>III.</span><span>Tiba di</span><span>:</span><span></span>
                      <span></span><span>Pada tanggal</span><span>:</span><span></span>
                      <span></span><span>Kepala</span><span>:</span><span></span>
                    </div>
                    <div class="h-10"></div>
                    <div class="text-center">(.......................................)</div>
                  </div>
                  <div>
                    <div class="grid grid-cols-[80px_10px_1fr]">
                      <span>Berangkat dari</span><span>:</span><span></span>
                      <span>Ke</span><span>:</span><span></span>
                      <span>Pada Tanggal</span><span>:</span><span></span>
                    </div>
                    <div class="h-10"></div>
                    <div class="text-center">(.......................................)</div>
                  </div>
                </div>

                <!-- Box IV -->
                <div class="border-t border-black py-2 grid grid-cols-2 gap-2">
                  <div>
                    <div class="grid grid-cols-[20px_60px_10px_1fr]">
                      <span>IV.</span><span>Tiba di</span><span>:</span><span></span>
                      <span></span><span>Pada tanggal</span><span>:</span><span></span>
                      <span></span><span>Kepala</span><span>:</span><span></span>
                    </div>
                    <div class="h-10"></div>
                    <div class="text-center">(.......................................)</div>
                  </div>
                  <div>
                    <div class="grid grid-cols-[80px_10px_1fr]">
                      <span>Berangkat dari</span><span>:</span><span></span>
                      <span>Ke</span><span>:</span><span></span>
                      <span>Pada Tanggal</span><span>:</span><span></span>
                    </div>
                    <div class="h-10"></div>
                    <div class="text-center">(.......................................)</div>
                  </div>
                </div>

                <!-- Box V -->
                <div class="border-t border-black py-2 grid grid-cols-2 gap-2">
                  <div>
                    <div class="grid grid-cols-[20px_60px_10px_1fr]">
                      <span>V.</span><span>Tiba di</span><span>:</span><span>${tempatBerangkat}</span>
                      <span></span><span>Pada tanggal</span><span>:</span><span>${formatDateFull(tanggalKembali)}</span>
                    </div>
                    <div class="col-span-2 mt-2">
                      Telah diperiksa dengan keterangan bahwa perjalanan tersebut di atas benar dilakukan atas perintahnya dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.
                    </div>
                  </div>
                  <div>
                    <div class="mt-8 text-center font-bold">${roleKades},</div>
                    <div class="h-10"></div>
                    <div class="text-center font-bold">${namaKades}</div>
                  </div>
                </div>

                <!-- Box VI & VII -->
                <div class="border-t border-black mt-auto pt-1 grid grid-cols-[20px_1fr]">
                  <span>VI.</span><span class="font-bold underline">CATATAN LAIN-LAIN</span>
                </div>
                <div class="border-t border-black mt-1 pt-1 grid grid-cols-[20px_1fr]">
                  <span>VII.</span>
                  <div>
                    <span class="font-bold underline">PERHATIAN</span>
                    <div class="text-[9px] mt-1 text-justify">
                      Pejabat yang berwenang menerbitkan SPPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba serta Bendaharawan bertanggung jawab berdasarkan peraturan-peraturan Keuangan Negara apabila Negara menderita kerugian akibat kesalahan, kelalaian dan kealpaannya.
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- HALAMAN 3: LEMBAR LAPORAN -->
          <div class="page-a4 page-laporan bg-white shadow-lg mx-auto">
            <div class="text-[14px] text-black pt-12">
              <div class="text-center mb-10">
                <h6 class="font-bold uppercase text-[16px] tracking-wide">LAPORAN PERJALANAN DINAS</h6>
              </div>

              <div class="grid grid-cols-[150px_10px_1fr] gap-2 mb-8 max-w-xl mx-auto">
                <span>Kepada Yth</span><span>:</span><span>${kepadaYth}</span>
                <span>Dari</span><span>:</span><span></span>
                <span>Nama</span><span>:</span><span>${namaPegawai}</span>
                <span>Jabatan</span><span>:</span><span>${jabatanPegawai}</span>
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
                  <p class="font-bold underline">${namaPegawai}</p>
                </div>
              </div>

            </div>
          </div>

        </body>
      </html>
    `;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="flex-none bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
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
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Surat Perjalanan Dinas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-mono text-sm font-semibold border border-emerald-100 dark:border-emerald-500/20">
              {kodeKlasifikasi}/{nomorSurat}
            </div>
            <button
              onClick={handleRecord}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-sm shadow-emerald-200 dark:shadow-none font-medium disabled:opacity-50"
            >
              <Save size={18} />
              {isSaving ? 'Menyimpan...' : (hasRecorded ? 'Perbarui Data' : 'Catat & Simpan')}
            </button>
            <button
              onClick={handlePrint}
              disabled={!nomorSurat}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-slate-700 hover:bg-gray-800 dark:hover:bg-slate-600 text-white rounded-xl transition-all shadow-sm disabled:opacity-50 font-medium"
            >
              <Printer size={18} />
              Cetak SPPD
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Form */}
        <div className="w-[500px] flex-none overflow-y-auto bg-slate-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 p-6 custom-scrollbar">
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Identitas Surat</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nomor Surat Akhir</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400">
                    {kodeKlasifikasi} / 
                  </div>
                  <input 
                    type="text" 
                    value={nomorSurat}
                    onChange={(e) => setNomorSurat(e.target.value)}
                    className="w-32 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                    placeholder="001"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Detail Perjalanan Dinas & Dasar</h3>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Dasar Penugasan (Berdasarkan...)</label>
                <input 
                  type="text" 
                  value={dasarPenugasan}
                  onChange={(e) => setDasarPenugasan(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm"
                  placeholder="Misal: surat undangan dengan nomor surat: ... tanggal ..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pejabat Pelaksana Teknis (PPTK)</label>
                  <input 
                    type="text" 
                    value={namaPPTK}
                    onChange={(e) => setNamaPPTK(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm"
                    placeholder="Nama PPTK (Jika Ada)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Laporan Ditujukan Kepada</label>
                  <input 
                    type="text" 
                    value={kepadaYth}
                    onChange={(e) => setKepadaYth(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm"
                    placeholder="Misal: Kepala Desa Wasah Hilir"
                  />
                </div>
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tempat Tujuan</label>
                  <input 
                    type="text" 
                    value={tempatTujuan}
                    onChange={(e) => setTempatTujuan(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                    placeholder="Tujuan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Alat Angkut</label>
                  <input 
                    type="text" 
                    value={alatAngkut}
                    onChange={(e) => setAlatAngkut(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                    placeholder="Misal: Kendaraan Dinas"
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Lama Perjalanan (Hari)</label>
                <input 
                  type="text" 
                  value={lamaPerjalanan}
                  onChange={(e) => setLamaPerjalanan(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  placeholder="Misal: 2 (Dua) Hari"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Pegawai yang Diperintah</h3>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nama Lengkap</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={namaPegawai}
                    onChange={(e) => {
                      setNamaPegawai(e.target.value);
                      setShowPegawaiDropdown(true);
                    }}
                    onFocus={() => setShowPegawaiDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPegawaiDropdown(false), 200)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 pr-8"
                    placeholder="Ketik nama untuk mencari penduduk / isi manual..."
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
                {showPegawaiDropdown && namaPegawai.length > 1 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 max-h-60 overflow-y-auto z-50">
                    {residents.filter(r => r.name.toLowerCase().includes(namaPegawai.toLowerCase()) || r.nik.includes(namaPegawai)).slice(0, 5).map(res => (
                      <button
                        key={res.nik}
                        onClick={() => {
                          setNamaPegawai(res.name);
                          setNipPegawai(res.nik);
                          setJabatanPegawai(res.pekerjaan || '');
                          setShowPegawaiDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                      >
                        <div className="font-semibold text-gray-900 dark:text-white text-sm">{res.name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">NIK: {res.nik} &bull; {res.pekerjaan || 'Tidak ada pekerjaan'}</div>
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
                    value={nipPegawai}
                    onChange={(e) => setNipPegawai(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                    placeholder="NIP / NIK"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pangkat/Gol (Opsional)</label>
                  <input 
                    type="text" 
                    value={pangkatGolongan}
                    onChange={(e) => setPangkatGolongan(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                    placeholder="Misal: II/a"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Jabatan</label>
                <input 
                  type="text" 
                  value={jabatanPegawai}
                  onChange={(e) => setJabatanPegawai(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  placeholder="Misal: Kaur Keuangan"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Pengikut (Opsional)</h3>
              <button 
                onClick={addPengikut}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus size={14} /> Tambah Pengikut
              </button>
            </div>
            
            {pengikut.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                Tidak ada pengikut. Klik tambah untuk memasukkan.
              </div>
            ) : (
              <div className="space-y-3">
                {pengikut.map((p, index) => (
                  <div key={index} className="flex gap-2 items-start bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                    <div className="flex-1 grid grid-cols-12 gap-2">
                      <div className="col-span-5 relative">
                        <input 
                          type="text" 
                          value={p.nama}
                          onChange={(e) => {
                            handlePengikutChange(index, 'nama', e.target.value);
                            setActivePengikutDropdown(index);
                          }}
                          onFocus={() => setActivePengikutDropdown(index)}
                          onBlur={() => setTimeout(() => setActivePengikutDropdown(null), 200)}
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 pr-8"
                          placeholder="Cari penduduk / isi nama..."
                        />
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                        {activePengikutDropdown === index && p.nama.length > 1 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 max-h-40 overflow-y-auto z-50">
                            {residents.filter(r => r.name.toLowerCase().includes(p.nama.toLowerCase()) || r.nik.includes(p.nama)).slice(0, 5).map(res => (
                              <button
                                key={res.nik}
                                onClick={() => {
                                  handlePengikutChange(index, 'nama', res.name);
                                  handlePengikutChange(index, 'umur', res.umur || res.nik);
                                  handlePengikutChange(index, 'keterangan', res.pekerjaan || '');
                                  setActivePengikutDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0"
                              >
                                <div className="font-semibold text-gray-900 dark:text-white text-xs">{res.name}</div>
                                <div className="text-[10px] text-gray-500 dark:text-slate-400">NIK: {res.nik}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-3">
                        <input 
                          type="text" 
                          value={p.umur}
                          onChange={(e) => handlePengikutChange(index, 'umur', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                          placeholder="Umur/NIK"
                        />
                      </div>
                      <div className="col-span-4">
                        <input 
                          type="text" 
                          value={p.keterangan}
                          onChange={(e) => handlePengikutChange(index, 'keterangan', e.target.value)}
                          className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                          placeholder="Keterangan"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => removePengikut(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors mt-0.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm dark:shadow-none border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Pembebanan Anggaran</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Instansi / Beban Anggaran</label>
                <input 
                  type="text" 
                  value={bebanAnggaran}
                  onChange={(e) => setBebanAnggaran(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  placeholder="Misal: Pemerintah Desa Wasah Hilir"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Mata Anggaran</label>
                <input 
                  type="text" 
                  value={mataAnggaran}
                  onChange={(e) => setMataAnggaran(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800"
                  placeholder="Misal: APBDes Tahun 2025"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="flex-1 bg-slate-200/40 dark:bg-slate-800/20 flex flex-col relative overflow-hidden">
          
          {/* Print Layout Selector */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 p-1 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 flex z-10">
            <button
              onClick={() => setPrintLayout('semua')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${printLayout === 'semua' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-600 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
            >
              Semua Halaman
            </button>
            <button
              onClick={() => setPrintLayout('spt')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${printLayout === 'spt' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-600 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
            >
              1. Surat Tugas
            </button>
            <button
              onClick={() => setPrintLayout('sppd')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${printLayout === 'sppd' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-600 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
            >
              2. Visum SPPD
            </button>
            <button
              onClick={() => setPrintLayout('laporan')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${printLayout === 'laporan' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-gray-600 hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-700'}`}
            >
              3. Lembar Laporan
            </button>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-auto p-8 flex flex-col items-center gap-8 cursor-grab active:cursor-grabbing"
          >
            <iframe
              ref={iframeRef}
              className="w-full max-w-[330mm] bg-white shadow-xl pointer-events-none"
              style={{ 
                minHeight: '297mm', // A4 min height
                height: printLayout === 'semua' ? '1000mm' : '320mm'
              }}
              srcDoc={generateHTML()}
              title="Print Preview SPPD"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
