import SuratEditorHeader, { getLetterHeaderTemplate } from './SuratEditorHeader';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Printer, Plus, Trash2, Search, ZoomIn, ZoomOut, FileText, Users, ChevronDown, ChevronUp, Check, ArrowLeft, ArrowRight, Loader2, Copy } from 'lucide-react';
import { showToast } from '../../../utils/toast';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { generateKopSuratHTML } from '../../../utils/letterFormat';
import { getLetterClassifications, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { addLetterHistory } from '../../../utils/letterHistory';
import { incrementSequenceNumber } from '../../../utils/letterClassifications';
import { getPrintSignatureHTML } from '../../../utils/signature';
import { SAAS_CONFIG } from './AdminSuratMasterTemplate';
import { useDragScroll } from '../../../hooks/useDragScroll';

type BatchLetterType = 'SKTM' | 'SKU' | 'SDU';

interface WargaBatch {
  id: string;
  nik: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  agama: string;
  pekerjaan: string;
  alamat: string;
  rt: string;
  rw: string;
  statusPerkawinan: string;
  kewarganegaraan: string;
  alamatSekarang: string;
  rtSekarang: string;
  rwSekarang: string;
  desaSekarang: string;
  kecamatanSekarang: string;
  namaUsaha: string;
  bidangUsaha: string;
  alamatUsaha: string;
  usahaMulai: string;
  expanded: boolean;
  nomorSurat: string;
  generated: boolean;
}

const createEmptyWarga = (): WargaBatch => ({
  id: crypto.randomUUID(),
  nik: '', nama: '', tempatLahir: '', tanggalLahir: '',
  jenisKelamin: 'Laki-Laki', agama: 'Islam', pekerjaan: '',
  alamat: '', rt: '', rw: '', statusPerkawinan: 'Belum Kawin',
  kewarganegaraan: 'WNI', alamatSekarang: '', rtSekarang: '', rwSekarang: '',
  desaSekarang: '', kecamatanSekarang: '',
  namaUsaha: '', bidangUsaha: '', alamatUsaha: '', usahaMulai: '',
  expanded: true, nomorSurat: '', generated: false
});

export default function AdminSuratBatch({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [letterType, setLetterType] = useState<BatchLetterType>('SKTM');
  const [wargaList, setWargaList] = useState<WargaBatch[]>([createEmptyWarga()]);
  const [commonKeperluan, setCommonKeperluan] = useState('');
  const [commonTanggal, setCommonTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [commonPejabat, setCommonPejabat] = useState(() => localStorage.getItem('kop_kades') || '');
  const [commonJabatan, setCommonJabatan] = useState('Kepala Desa');
  const [useEsignature, setUseEsignature] = useState(true);
  const [residents, setResidents] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [showResidentSearch, setShowResidentSearch] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [selectedPrintIdx, setSelectedPrintIdx] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoomLevel, setZoomLevel] = useState(0.45);
  const dragProps = useDragScroll();

  const desaName = localStorage.getItem('kop_desa') || 'Wasah Hilir';

  useEffect(() => {
    fetchResidentsCached()
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setResidents(d); })
      .catch(() => {});
    const ol = JSON.parse(localStorage.getItem('village_officers') || '[]');
    setOfficers(ol);
  }, []);

  const updateWarga = (id: string, field: keyof WargaBatch, value: any) => {
    setWargaList(prev => prev.map(w => w.id === id ? { ...w, [field]: value, generated: false } : w));
  };

  const addWarga = () => setWargaList(prev => [...prev, { ...createEmptyWarga(), expanded: true }]);
  const removeWarga = (id: string) => setWargaList(prev => prev.length > 1 ? prev.filter(w => w.id !== id) : prev);

  const fillFromResident = (wargaId: string, res: any) => {
    setWargaList(prev => prev.map(w => w.id === wargaId ? {
      ...w, nik: res.nik || '', nama: res.name || res.nama || '',
      tempatLahir: res.tempatLahir || res.tempat_lahir || '', tanggalLahir: res.tanggalLahir || res.tanggal_lahir || '',
      jenisKelamin: res.jenisKelamin || res.jenis_kelamin || 'Laki-Laki', agama: res.agama || '',
      pekerjaan: res.pekerjaan || '', alamat: res.alamat || res.address || '',
      rt: res.rt || '', rw: res.rw || '', statusPerkawinan: res.statusPerkawinan || res.status_perkawinan || 'Belum Kawin',
      kewarganegaraan: res.kewarganegaraan || 'WNI', expanded: false, generated: false
    } : w));
    setShowResidentSearch(null);
    setSearchQuery('');
  };

  const filteredResidents = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    return residents.filter(r => (r.name || r.nama || '').toLowerCase().includes(q) || (r.nik || '').includes(q)).slice(0, 8);
  }, [searchQuery, residents]);

  const kecamatanName = localStorage.getItem('kop_kecamatan') || '';
  const kabupatenName = localStorage.getItem('kop_kabupaten') || '';

  const resolveNipPejabat = (name: string) => {
    try {
      const found = officers.find((o: any) => o.name === name);
      return found?.nip || '-';
    } catch { return '-'; }
  };

  const generateSingleHTML = (w: WargaBatch, nomor: string, tgl: string) => {
    const kop = generateKopSuratHTML();
    const fmtDate = (d: string) => { if (!d) return ''; try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return d; } };
    const v = (val: string, fallback = '-') => val || fallback;
    const cleanStr = (s: string, regex: RegExp) => (s || '').replace(regex, '');
    const tglFormatted = tgl;
    const nip = resolveNipPejabat(commonPejabat);

    let bodyContent = '';

    if (letterType === 'SKTM') {
      bodyContent = `
        <div style="text-align:center;margin-bottom:15px;">
          <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN TIDAK MAMPU</h3>
          <p style="margin:2px 0 0 0;font-size:14px;text-transform:uppercase;">Nomor : ${nomor.toUpperCase()}</p>
        </div>
        <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">Yang bertanda tangan di bawah ini:</p>
        <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.6;font-size:14px;">
          <tr><td style="width:30%;">a. Nama</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(commonPejabat)}</strong></td></tr>
          <tr><td>b. Jabatan</td><td>:</td><td><strong style="text-transform:uppercase;">${v(commonJabatan)} ${desaName.toUpperCase()}</strong></td></tr>
        </table>
        <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">Menerangkan dengan sebenarnya bahwa:</p>
        <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
          <tr><td style="width:30%;">a. Nama Lengkap</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(w.nama)}</strong></td></tr>
          <tr><td>b. NIK</td><td>:</td><td>${v(w.nik)}</td></tr>
          <tr><td>c. Tempat, Tanggal Lahir</td><td>:</td><td>${v(w.tempatLahir)}, ${fmtDate(w.tanggalLahir)}</td></tr>
          <tr><td>d. Jenis Kelamin</td><td>:</td><td>${v(w.jenisKelamin)}</td></tr>
          <tr><td>e. Agama</td><td>:</td><td>${v(w.agama)}</td></tr>
          <tr><td>f. Pekerjaan</td><td>:</td><td>${v(w.pekerjaan)}</td></tr>
          <tr><td>g. Status Perkawinan</td><td>:</td><td>${v(w.statusPerkawinan)}</td></tr>
          <tr><td style="vertical-align:top;">h. Alamat</td><td style="vertical-align:top;">:</td><td>${v(w.alamat)} RT.${v(w.rt)} RW.${v(w.rw)}, Desa ${cleanStr(desaName, /^(desa|kelurahan)\s+/i)}, Kecamatan ${cleanStr(kecamatanName, /^kecamatan\s+/i)}, Kab. ${cleanStr(kabupatenName, /^(pemerintah\s+)?(kabupaten|kota)\s+/i)}</td></tr>
        </table>
        <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">Berdasarkan permohonan dan keterangan yang bersangkutan, nama tersebut di atas benar-benar penduduk yang berdomisili di wilayah kami dan saat ini tergolong dalam keluarga <strong>kurang mampu (pra sejahtera)</strong>.</p>
        <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk dipergunakan sebagai kelengkapan persyaratan administrasi pengajuan bantuan atau keringanan biaya <strong>${v(commonKeperluan)}</strong>.</p>
        <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:25px;font-size:14px;">Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
      `;
    } else if (letterType === 'SKU') {
      bodyContent = `
        <div style="text-align:center;margin-bottom:15px;">
          <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN USAHA</h3>
          <p style="margin:2px 0 0 0;font-size:14px;text-transform:uppercase;">Nomor : ${nomor.toUpperCase()}</p>
        </div>
        <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">Yang bertanda tangan di bawah ini:</p>
        <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.6;font-size:14px;">
          <tr><td style="width:30%;">a. Nama</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(commonPejabat)}</strong></td></tr>
          <tr><td>b. Jabatan</td><td>:</td><td><strong style="text-transform:uppercase;">${v(commonJabatan)} ${desaName.toUpperCase()}</strong></td></tr>
        </table>
        <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">Menerangkan dengan sebenarnya bahwa:</p>
        <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
          <tr><td style="width:30%;">a. Nama Lengkap</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(w.nama)}</strong></td></tr>
          <tr><td>b. NIK</td><td>:</td><td>${v(w.nik)}</td></tr>
          <tr><td>c. Tempat, Tanggal Lahir</td><td>:</td><td>${v(w.tempatLahir)}, ${fmtDate(w.tanggalLahir)}</td></tr>
          <tr><td>d. Jenis Kelamin</td><td>:</td><td>${v(w.jenisKelamin)}</td></tr>
          <tr><td>e. Pekerjaan</td><td>:</td><td>${v(w.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">f. Alamat</td><td style="vertical-align:top;">:</td><td>${v(w.alamat)} RT.${v(w.rt)} RW.${v(w.rw)}, Desa ${cleanStr(desaName, /^(desa|kelurahan)\s+/i)}</td></tr>
        </table>
        <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">Bahwa yang bersangkutan benar memiliki usaha yang bergerak di bidang <strong>${v(w.bidangUsaha)}</strong> dengan nama usaha <strong>${v(w.namaUsaha)}</strong> yang berlokasi di ${v(w.alamatUsaha)}.</p>
        <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk keperluan <strong>${v(commonKeperluan)}</strong>.</p>
        <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:25px;font-size:14px;">Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
      `;
    } else if (letterType === 'SDU') {
      bodyContent = `
        <div style="text-align:center;margin-bottom:15px;">
          <h3 style="text-decoration:underline;margin:0;font-size:16px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">SURAT KETERANGAN DOMISILI USAHA</h3>
          <p style="margin:2px 0 0 0;font-size:14px;text-transform:uppercase;">Nomor : ${nomor.toUpperCase()}</p>
        </div>
        <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">Yang bertanda tangan di bawah ini:</p>
        <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.6;font-size:14px;">
          <tr><td style="width:30%;">a. Nama</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(commonPejabat)}</strong></td></tr>
          <tr><td>b. Jabatan</td><td>:</td><td><strong style="text-transform:uppercase;">${v(commonJabatan)} ${desaName.toUpperCase()}</strong></td></tr>
        </table>
        <p style="text-align:justify;line-height:1.15;margin-bottom:10px;font-size:14px;">Menerangkan dengan sebenarnya bahwa:</p>
        <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
          <tr><td style="width:30%;">a. Nama Usaha</td><td style="width:3%;">:</td><td><strong>${v(w.namaUsaha)}</strong></td></tr>
          <tr><td>b. Bidang Usaha</td><td>:</td><td>${v(w.bidangUsaha)}</td></tr>
          <tr><td>c. Alamat Usaha</td><td>:</td><td>${v(w.alamatUsaha)}</td></tr>
        </table>
        <p style="margin-bottom:10px;font-size:14px;">Adalah benar milik / dikelola oleh:</p>
        <table style="width:calc(100% - 40px);border-collapse:collapse;margin-bottom:10px;margin-left:40px;line-height:1.5;font-size:14px;">
          <tr><td style="width:30%;">a. Nama Lengkap</td><td style="width:3%;">:</td><td><strong style="text-transform:uppercase;">${v(w.nama)}</strong></td></tr>
          <tr><td>b. NIK</td><td>:</td><td>${v(w.nik)}</td></tr>
          <tr><td>c. Tempat, Tanggal Lahir</td><td>:</td><td>${v(w.tempatLahir)}, ${fmtDate(w.tanggalLahir)}</td></tr>
          <tr><td>d. Jenis Kelamin</td><td>:</td><td>${v(w.jenisKelamin)}</td></tr>
          <tr><td>e. Pekerjaan</td><td>:</td><td>${v(w.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">f. Alamat KTP</td><td style="vertical-align:top;">:</td><td>${v(w.alamat)} RT.${v(w.rt)} RW.${v(w.rw)}</td></tr>
          <tr><td style="vertical-align:top;">g. Alamat Domisili</td><td style="vertical-align:top;">:</td><td>${v(w.alamatSekarang)} RT.${v(w.rtSekarang)} RW.${v(w.rwSekarang)}, Desa ${v(w.desaSekarang)}, Kecamatan ${v(w.kecamatanSekarang)}</td></tr>
        </table>
        <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:8px;font-size:14px;">Surat keterangan ini diberikan atas dasar permohonan yang bersangkutan untuk keperluan <strong>${v(commonKeperluan)}</strong>.</p>
        <p style="text-indent:40px;text-align:justify;line-height:1.15;margin-bottom:25px;font-size:14px;">Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
      `;
    }

    return `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 15mm 20mm; background: white; color: black; -webkit-print-color-adjust: exact; print-color-adjust: exact; line-height: 1.5; }
        @media print { @page { size: A4; margin: 0; } body { padding: 15mm 20mm; } .page-break { page-break-after: always; } }
      </style></head><body>
      ${kop}
      ${bodyContent}
      ${getPrintSignatureHTML(desaName, tglFormatted, commonPejabat, commonJabatan, nip, false, useEsignature, nomor)}
      ${SAAS_CONFIG.globalFooterHTML ? `<div style="position:absolute;bottom:8mm;left:15mm;right:15mm;width:calc(100% - 30mm);">${SAAS_CONFIG.globalFooterHTML}</div>` : ''}
      </body></html>
    `;
  };

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    try {
      const cls = getLetterClassifications().find(c => c.klasifikasi === letterType);
      const kode = cls?.kodeKlasifikasi || '400';
      const tgl = new Date(commonTanggal);
      const tglFormatted = tgl.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const updated = [...wargaList];

      for (let i = 0; i < updated.length; i++) {
        const w = updated[i];
        const nomor = await generateLetterNumberAsync(letterType, kode, tgl);
        updated[i] = { ...w, nomorSurat: nomor, generated: true };

        const formData: any = {
          nomorSurat: nomor, namaPejabat: commonPejabat, jabatanPejabat: commonJabatan,
          nama: w.nama, nik: w.nik, tempatLahir: w.tempatLahir, tanggalLahir: w.tanggalLahir,
          jenisKelamin: w.jenisKelamin, agama: w.agama, pekerjaan: w.pekerjaan,
          alamat: w.alamat, rt: w.rt, rw: w.rw, statusPerkawinan: w.statusPerkawinan,
          kewarganegaraan: w.kewarganegaraan, keperluan: commonKeperluan,
          tampilkanDesa: true, tampilkanKecamatan: true, tampilkanKabupaten: true,
          namaDesa: desaName, namaKecamatan: kecamatanName, namaKabupaten: kabupatenName,
        };

        if (letterType === 'SKU') {
          formData.namaUsaha = w.namaUsaha; formData.bidangUsaha = w.bidangUsaha;
          formData.alamatUsaha = w.alamatUsaha; formData.usahaMulai = w.usahaMulai;
        }
        if (letterType === 'SDU') {
          formData.alamatSekarang = w.alamatSekarang; formData.rtSekarang = w.rtSekarang;
          formData.rwSekarang = w.rwSekarang; formData.desaSekarang = w.desaSekarang;
          formData.kecamatanSekarang = w.kecamatanSekarang;
          formData.namaUsaha = w.namaUsaha; formData.bidangUsaha = w.bidangUsaha;
          formData.alamatUsaha = w.alamatUsaha;
        }

        addLetterHistory({
          nomor, jenis: letterType, nik: w.nik, nama: w.nama,
          tanggal: tglFormatted, keperluan: commonKeperluan, status: 'Selesai', data: formData
        });
        incrementSequenceNumber(letterType);
      }

      setWargaList(updated);

      const allHtml = updated.map((w, i) => {
        const html = generateSingleHTML(w, w.nomorSurat, tglFormatted);
        return `<div class="page-break">${html}</div>`;
      }).join('');

      setPrintPreviewHtml(`<!DOCTYPE html><html><head><meta charset="utf-8">
        <script src="https://cdn.tailwindcss.com"><\/script>
        <style>body{margin:0;padding:0;background:white;}@media print{.page-break{page-break-after:always;}.page-break:last-child{page-break-after:auto;}}</style>
        </head><body>${allHtml}</body></html>`);

      setStep(3);
      showToast(`${updated.length} surat ${letterType} berhasil di-generate!`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Gagal generate surat masal', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintAll = () => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handlePrintSingle = (idx: number) => {
    const w = wargaList[idx];
    if (!w.nomorSurat) return;
    const tgl = new Date(commonTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = generateSingleHTML(w, w.nomorSurat, tgl);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); setTimeout(() => win.print(), 500); }
  };

  const letterTypes: { value: BatchLetterType; label: string; desc: string }[] = [
    { value: 'SKTM', label: 'SKTM', desc: 'Surat Keterangan Tidak Mampu' },
    { value: 'SKU', label: 'SKU', desc: 'Surat Keterangan Usaha' },
    { value: 'SDU', label: 'Domisili', desc: 'Surat Keterangan Domisili Usaha' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <SuratEditorHeader
        template={getLetterHeaderTemplate('BATCH', { kode: '', jenis: 'Surat Masal', deskripsi: `Pembuatan ${letterType} Secara Bersamaan`, nomorSurat: '' })}
        icon={<Users className="w-5 h-5" />}
        onBack={onBack}
      />

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-4 py-4">
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${step === s ? 'bg-emerald-600 text-white shadow-lg' : step > s ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
              {step > s ? <Check size={16} /> : <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">{s}</span>}
              {s === 1 ? 'Pilih Jenis & Warga' : s === 2 ? 'Isi Data' : 'Preview & Cetak'}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-emerald-400' : 'bg-gray-200'}`}></div>}
          </React.Fragment>
        ))}
      </div>

      {/* STEP 1: Select Type + Add Warga */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Jenis Surat</h3>
            <div className="grid grid-cols-3 gap-3">
              {letterTypes.map(lt => (
                <button key={lt.value} onClick={() => setLetterType(lt.value)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${letterType === lt.value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-gray-200 dark:border-slate-700 hover:border-emerald-300'}`}>
                  <div className="font-bold text-gray-900 dark:text-white">{lt.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{lt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Daftar Warga ({wargaList.length})</h3>
              <button onClick={addWarga} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors">
                <Plus size={14} /> Tambah Warga
              </button>
            </div>

            <div className="space-y-3">
              {wargaList.map((w, idx) => (
                <div key={w.id} className={`border rounded-xl overflow-hidden transition-all ${w.nama ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 dark:border-slate-700'}`}>
                  <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => updateWarga(w.id, 'expanded', !w.expanded)}>
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-gray-900 dark:text-white truncate">{w.nama || 'Belum diisi'}</div>
                      <div className="text-xs text-gray-500">{w.nik || 'NIK belum diisi'}</div>
                    </div>
                    {w.nama && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">Lengkap</span>}
                    {!w.nama && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">Kosong</span>}
                    {wargaList.length > 1 && <button onClick={(e) => { e.stopPropagation(); removeWarga(w.id); }} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>}
                    {w.expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>

                  {w.expanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-slate-700 pt-3 space-y-3">
                      <div className="relative">
                        <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Cari / Ketik Nama Warga</label>
                        <div className="relative">
                          <input type="text" value={w.nama} onChange={(e) => { updateWarga(w.id, 'nama', e.target.value); setShowResidentSearch(w.id); setSearchQuery(e.target.value); }}
                            onFocus={() => { setShowResidentSearch(w.id); setSearchQuery(w.nama); }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm" placeholder="Ketik nama atau NIK..." />
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                        {showResidentSearch === w.id && filteredResidents.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 max-h-48 overflow-y-auto z-50">
                            {filteredResidents.map((r, ri) => (
                              <button key={ri} onMouseDown={(e) => { e.preventDefault(); fillFromResident(w.id, r); }}
                                className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                                <div className="font-semibold text-gray-900 dark:text-white text-sm">{r.name || r.nama}</div>
                                <div className="text-xs text-gray-500">NIK: {r.nik}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">NIK</label><input type="text" value={w.nik} onChange={e => updateWarga(w.id, 'nik', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Tempat Lahir</label><input type="text" value={w.tempatLahir} onChange={e => updateWarga(w.id, 'tempatLahir', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Tanggal Lahir</label><input type="date" value={w.tanggalLahir} onChange={e => updateWarga(w.id, 'tanggalLahir', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Jenis Kelamin</label><select value={w.jenisKelamin} onChange={e => updateWarga(w.id, 'jenisKelamin', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800"><option>Laki-Laki</option><option>Perempuan</option></select></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Agama</label><select value={w.agama} onChange={e => updateWarga(w.id, 'agama', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800"><option>Islam</option><option>Kristen</option><option>Katolik</option><option>Hindu</option><option>Buddha</option><option>Konghucu</option></select></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Pekerjaan</label><input type="text" value={w.pekerjaan} onChange={e => updateWarga(w.id, 'pekerjaan', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                        <div><label className="block text-xs font-bold text-gray-600 mb-1">Alamat</label><input type="text" value={w.alamat} onChange={e => updateWarga(w.id, 'alamat', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="block text-xs font-bold text-gray-600 mb-1">RT</label><input type="text" value={w.rt} onChange={e => updateWarga(w.id, 'rt', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                          <div><label className="block text-xs font-bold text-gray-600 mb-1">RW</label><input type="text" value={w.rw} onChange={e => updateWarga(w.id, 'rw', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                        </div>
                      </div>

                      {(letterType === 'SKU' || letterType === 'SDU') && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-3">
                          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Data Usaha</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Nama Usaha</label><input type="text" value={w.namaUsaha} onChange={e => updateWarga(w.id, 'namaUsaha', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Bidang / Jenis Usaha</label><input type="text" value={w.bidangUsaha} onChange={e => updateWarga(w.id, 'bidangUsaha', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                            <div className="col-span-2"><label className="block text-xs font-bold text-gray-600 mb-1">Alamat Usaha</label><input type="text" value={w.alamatUsaha} onChange={e => updateWarga(w.id, 'alamatUsaha', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                          </div>
                        </div>
                      )}

                      {letterType === 'SDU' && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 space-y-3">
                          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider">Alamat Domisili</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2"><label className="block text-xs font-bold text-gray-600 mb-1">Alamat Sekarang</label><input type="text" value={w.alamatSekarang} onChange={e => updateWarga(w.id, 'alamatSekarang', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">RT</label><input type="text" value={w.rtSekarang} onChange={e => updateWarga(w.id, 'rtSekarang', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">RW</label><input type="text" value={w.rwSekarang} onChange={e => updateWarga(w.id, 'rwSekarang', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Desa</label><input type="text" value={w.desaSekarang} onChange={e => updateWarga(w.id, 'desaSekarang', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                            <div><label className="block text-xs font-bold text-gray-600 mb-1">Kecamatan</label><input type="text" value={w.kecamatanSekarang} onChange={e => updateWarga(w.id, 'kecamatanSekarang', e.target.value)} className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-sm dark:bg-slate-800" /></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => setStep(2)} disabled={wargaList.every(w => !w.nama)}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg">
              Selanjutnya <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Common Fields */}
      {step === 2 && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wider">Informasi Umum (untuk semua surat)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Keperluan</label>
                <textarea value={commonKeperluan} onChange={e => setCommonKeperluan(e.target.value)} rows={2} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm" placeholder="Misal: Pengurusan Bantuan BLT Dana Desa" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Tanggal Surat</label>
                <input type="date" value={commonTanggal} onChange={e => setCommonTanggal(e.target.value)} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Pejabat Penandatangan</label>
                <select value={commonPejabat} onChange={e => { setCommonPejabat(e.target.value); const sel = officers.find((o: any) => o.name === e.target.value); if (sel) setCommonJabatan(sel.role); }}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none dark:bg-slate-800 text-sm">
                  {officers.length > 0 ? officers.map((o: any, i: number) => <option key={i} value={o.name}>{o.name} ({o.role})</option>) : <option>{commonPejabat}</option>}
                </select></div>
              <div className="col-span-2">
                <label className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-xl cursor-pointer">
                  <div><div className="font-bold text-sm">Tanda Tangan Elektronik (TTE / QR Code)</div><div className="text-xs text-gray-500">Tampilkan QR Code verifikasi</div></div>
                  <div className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={useEsignature} onChange={e => setUseEsignature(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
            <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-wider">Ringkasan ({wargaList.length} surat {letterType})</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {wargaList.map((w, i) => (
                <div key={w.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{w.nama || 'Belum diisi'}</span>
                  <span className="text-xs text-gray-500 ml-auto">{w.nik}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all text-sm"><ArrowLeft size={16} /> Kembali</button>
            <button onClick={handleGenerateAll} disabled={isGenerating || !commonKeperluan}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg">
              {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><FileText size={16} /> Generate {wargaList.length} Surat</>}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Preview & Print */}
      {step === 3 && (
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* List sidebar */}
            <div className="lg:col-span-4 space-y-3">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-sm">Daftar Surat ({wargaList.length})</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {wargaList.map((w, i) => (
                    <div key={w.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${selectedPrintIdx === i ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 dark:bg-slate-800 hover:bg-gray-100'}`}
                      onClick={() => setSelectedPrintIdx(i)}>
                      <span className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-gray-900 dark:text-white truncate">{w.nama}</div>
                        <div className="text-[10px] text-gray-500 font-mono">{w.nomorSurat}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handlePrintSingle(i); }} className="p-1 text-gray-400 hover:text-emerald-600 transition-colors" title="Cetak surat ini">
                        <Printer size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all text-sm"><ArrowLeft size={14} /> Kembali</button>
                <button onClick={handlePrintAll} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all text-sm shadow-lg"><Printer size={14} /> Cetak Semua</button>
              </div>
            </div>

            {/* Preview area */}
            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-xl flex flex-col h-[700px] sticky top-[170px]">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-gray-50/90 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">Preview</span>
                    {selectedPrintIdx !== null && <span className="text-xs text-gray-500">— {wargaList[selectedPrintIdx]?.nama} ({selectedPrintIdx + 1}/{wargaList.length})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <button onClick={() => setZoomLevel(z => Math.max(0.3, z - 0.1))} className="p-1 text-gray-500 hover:bg-slate-100 rounded-lg"><ZoomOut size={14} /></button>
                      <span className="text-[11px] font-mono font-bold text-slate-600 px-1.5 w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                      <button onClick={() => setZoomLevel(z => Math.min(2.0, z + 0.1))} className="p-1 text-gray-500 hover:bg-slate-100 rounded-lg"><ZoomIn size={14} /></button>
                      <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                      <button onClick={() => setZoomLevel(0.45)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-1.5">Reset</button>
                    </div>
                  </div>
                </div>
                <div {...dragProps} className="flex-1 overflow-auto p-6 flex flex-col items-center bg-slate-200/50 dark:bg-slate-800/50">
                  <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.2s ease', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <iframe ref={iframeRef} scrolling="no" className="pointer-events-none bg-white shadow-lg"
                      style={{ width: '210mm', minHeight: '297mm', height: `${297 * wargaList.length}mm`, border: 'none' }}
                      srcDoc={printPreviewHtml} title="Print Preview Surat Masal" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
