import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Search, Printer, MapPin, Map as MapIcon, Layers, Compass, Navigation, ZoomIn, ZoomOut, UserCheck } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLetterKode } from '../../../hooks/useLetterKode';
import { useLetterDescription } from '../../../hooks/useLetterDescription';
import { fetchResidentsCached } from '../../../utils/apiCache';
import { addLetterHistory, updateLetterHistory } from '../../../utils/letterHistory';
import { showToast } from '../../../utils/toast';
import { useDragScroll } from '../../../hooks/useDragScroll';
import { LandPolygonPickerModal, PolygonData } from './LandPolygonPickerModal';

interface Resident {
  nik: string;
  name: string;
  gender: string;
  birthPlace: string;
  birthDate: string;
  job: string;
  address: string;
  desa: string;
}

// Removed inline LandMapPickerModal, replaced by external LandPolygonPickerModal

export default function AdminSuratSKKT({ 
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
  const [loading, setLoading] = useState(false);
  const templateKode = useLetterKode('SKKT');
  const templateDesc = useLetterDescription('SKKT', 'Surat Keterangan Kepemilikan Tanah');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Search state for Saksi-saksi
  const [searchSaksi1, setSearchSaksi1] = useState('');
  const [searchSaksi2, setSearchSaksi2] = useState('');
  const [searchSaksi3, setSearchSaksi3] = useState('');

  const [showMapModal, setShowMapModal] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(0.45);
  const dragProps = useDragScroll();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const cleanStr = (s: string, regex: RegExp) => (s || "").replace(regex, "");

  const [formData, setFormData] = useState({
    nomorSurat: '',
    nama: 'SAMSUL BAHRI',
    nik: '6306061903680001',
    tempatLahir: 'WASAH HILIR',
    tanggalLahir: '19/03/1968',
    pekerjaan: 'Perdagangan',
    alamat: 'Jl. Bukhari, RT.02 RW.01 Desa Wasah Hilir Kec. Simpur',

    // Objek Tanah
    lokasiTanah: 'Jalan Bukhari',
    rtRw: '02 / 01',
    nib: '-',
    diPergunakan: 'Pribadi',
    luasTanah: '42',
    asalPerolehan: 'warisan peninggalan orang tua yang sampai saat ini saya kuasai secara terus menerus',

    // Batas-Batas & Ukuran Sisi
    batasUtara: 'Alkah Keluarga (Bahruddin)',
    ukuranUtara: '6 Meter',
    batasSelatan: 'Abdul Khair',
    ukuranSelatan: '6.5 Meter',
    batasTimur: 'H. Fahrurrazi',
    ukuranTimur: '7 Meter',
    batasBarat: 'Badrul Kamal',
    ukuranBarat: '7 Meter',

    // Saksi-Saksi (3 Orang)
    saksi1Nama: 'H. Abdul Mukhlis',
    saksi1Nik: '6306062501670002',
    saksi2Nama: 'Badrul Kamal',
    saksi2Nik: '6306062612770001',
    saksi3Nama: '',
    saksi3Nik: '',

    // RT & Pejabat
    nomorRt: '02',
    namaKetuaRt: 'TAIBAH',
    namaPejabat: localStorage.getItem('village_super_admin') || localStorage.getItem('kop_kades') || 'PELDA (PURN) FAZAKKIR RAHMAD',
    jabatanPejabat: localStorage.getItem('village_super_admin_role') || 'Kepala Desa',
    includeCamat: false,
    namaDesa: localStorage.getItem('kop_desa') || 'Wasah Hilir',
    namaKecamatan: localStorage.getItem('kop_kecamatan') || 'Simpur',
    namaKabupaten: localStorage.getItem('kop_kabupaten') || 'Hulu Sungai Selatan',
    alamatKantor: localStorage.getItem('kop_alamat') || '',
    kontakKantor: localStorage.getItem('kop_kontak') || '',

    lat: editData?.data?.lat || '',
    lng: editData?.data?.lng || '',
    polygonPoints: editData?.data?.polygonPoints || [],
    keperluan: 'Kelengkapan Berkas / Sertifikasi Tanah',
  });

  const villageLogo = localStorage.getItem('kop_logo_url') || 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Lambang_Kabupaten_Hulu_Sungai_Selatan.svg/200px-Lambang_Kabupaten_Hulu_Sungai_Selatan.svg.png';
  const letterFont = localStorage.getItem('village_letter_font') || localStorage.getItem('letter_font') || 'Arial, sans-serif';

  const activeKabupaten = localStorage.getItem('kop_kabupaten') || formData.namaKabupaten || 'Hulu Sungai Selatan';
  const activeKecamatan = localStorage.getItem('kop_kecamatan') || formData.namaKecamatan || 'Simpur';
  const activeDesa = cleanStr(localStorage.getItem('kop_desa') || formData.namaDesa || 'Wasah Hilir', /^(desa|kelurahan)\s+/i);
  const activeAlamat = localStorage.getItem('kop_alamat') || formData.alamatKantor || '';
  const activeKontak = localStorage.getItem('kop_kontak') || formData.kontakKantor || '';

  useEffect(() => {
    if (editData) {
      setFormData(prev => ({ ...prev, ...editData }));
    }
  }, [editData]);

  useEffect(() => {
    fetchResidentsCached()
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setResidents(data); })
      .catch(e => console.error(e));
  }, []);

  const filteredResidents = searchQuery.trim() === '' ? [] : residents.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.nik.includes(searchQuery)
  );

  const filteredSaksi1 = searchSaksi1.trim() === '' ? [] : residents.filter(r => 
    r.name.toLowerCase().includes(searchSaksi1.toLowerCase()) || r.nik.includes(searchSaksi1)
  );
  const filteredSaksi2 = searchSaksi2.trim() === '' ? [] : residents.filter(r => 
    r.name.toLowerCase().includes(searchSaksi2.toLowerCase()) || r.nik.includes(searchSaksi2)
  );
  const filteredSaksi3 = searchSaksi3.trim() === '' ? [] : residents.filter(r => 
    r.name.toLowerCase().includes(searchSaksi3.toLowerCase()) || r.nik.includes(searchSaksi3)
  );

  const handleSelectResident = (r: Resident) => {
    setFormData(prev => ({
      ...prev,
      nama: r.name,
      nik: r.nik,
      tempatLahir: r.birthPlace || '',
      tanggalLahir: r.birthDate || '',
      pekerjaan: r.job || 'Wiraswasta',
      alamat: r.address || '',
    }));
    setSearchQuery('');
  };

  const v = (val: string, fallback = '-') => (val && val.trim() !== '' ? val : fallback);
  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
  };

  const generatePolygonSVG = () => {
    const pts = formData.polygonPoints;
    if (!pts || pts.length < 3) {
      return `<div style="width:100%; height:100%; border:1px dashed #94a3b8; background: #f8fafc; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:11px;">Belum ada poligon peta satelit (Klik 'Buka Peta' untuk menggambar)</div>`;
    }
    const lats = pts.map((p: any) => p.lat);
    const lngs = pts.map((p: any) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    
    const viewWidth = 220;
    const viewHeight = 220;
    const padding = 25;
    const drawWidth = viewWidth - 2 * padding;
    const drawHeight = viewHeight - 2 * padding;
    
    const dLat = maxLat - minLat || 0.00001;
    const dLng = maxLng - minLng || 0.00001;
    
    const scaleX = drawWidth / dLng;
    const scaleY = drawHeight / dLat;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledW = dLng * scale;
    const scaledH = dLat * scale;
    const offsetX = (viewWidth - scaledW) / 2;
    const offsetY = (viewHeight - scaledH) / 2;
    
    const mappedPts = pts.map((p: any, i: number) => {
      const x = offsetX + (p.lng - minLng) * scale;
      const y = offsetY + (maxLat - p.lat) * scale;
      return { x, y, lat: p.lat, lng: p.lng, index: i + 1 };
    });

    const svgPolygonPoints = mappedPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const edgeLabels = [];
    for (let i = 0; i < mappedPts.length; i++) {
      const p1 = mappedPts[i];
      const p2 = mappedPts[(i + 1) % mappedPts.length];
      
      const lat1 = p1.lat, lng1 = p1.lng, lat2 = p2.lat, lng2 = p2.lng;
      const R = 6378137;
      const dLatRad = (lat2 - lat1) * Math.PI / 180;
      const dLngRad = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLngRad / 2) * Math.sin(dLngRad / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distMeters = R * c;

      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;

      edgeLabels.push(`
        <g transform="translate(${midX.toFixed(1)}, ${midY.toFixed(1)})">
          <rect x="-16" y="-7" width="32" height="13" rx="3" fill="#ffffff" stroke="#059669" stroke-width="0.6" />
          <text x="0" y="2.5" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#065f46">${distMeters.toFixed(1)}m</text>
        </g>
      `);
    }

    const vertexElements = mappedPts.map(p => `
      <g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)})">
        <circle cx="0" cy="0" r="4" fill="#ef4444" stroke="#ffffff" stroke-width="1.2" />
        <text x="0" y="-6" text-anchor="middle" font-size="7.5" font-weight="bold" fill="#1e293b">P${p.index}</text>
      </g>
    `);

    return `
      <svg width="100%" height="100%" viewBox="0 0 ${viewWidth} ${viewHeight}" preserveAspectRatio="xMidYMid meet" style="background:#f8fafc;">
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <polygon points="${svgPolygonPoints}" fill="#dcfce7" fill-opacity="0.8" stroke="#059669" stroke-width="2" stroke-linejoin="round" />
        ${edgeLabels.join('')}
        ${vertexElements.join('')}
      </svg>
    `;
  };
  
  const generateHTML = () => {
    const today = new Date();
    const tglFormatted = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const page1 = `
      <!-- PAGE 1: SURAT PERNYATAAN PENGUASAAN FISIK BIDANG TANAH -->
      <div style="font-family:${letterFont}; font-size:12px; line-height:1.45; color:black; box-sizing: border-box; padding-bottom: 20px;">

        <!-- JUDUL SURAT -->
        <div style="text-align:center; margin-top:10px; margin-bottom:16px;">
          <h3 style="text-decoration:underline; margin:0; font-size:14px; text-transform:uppercase; font-weight:bold; letter-spacing:0.5px;">SURAT PERNYATAAN PENGUASAAN FISIK BIDANG TANAH</h3>
          <p style="margin:3px 0 0 0; font-size:12px;">Nomor : ${formData.nomorSurat || '...'}</p>
        </div>

        <p style="margin-bottom:6px;">Yang bertanda tangan di bawah ini :</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; margin-left:15px; font-size:12px;">
          <tr><td style="width:130px;">N a m a</td><td style="width:12px;">:</td><td><strong>${v(formData.nama).toUpperCase()}</strong></td></tr>
          <tr><td>NIK</td><td>:</td><td>${v(formData.nik)}</td></tr>
          <tr><td>Ttl</td><td>:</td><td>${v(formData.tempatLahir)}${formData.tanggalLahir ? ', ' + formData.tanggalLahir : ''}</td></tr>
          <tr><td>Pekerjaan</td><td>:</td><td>${v(formData.pekerjaan)}</td></tr>
          <tr><td style="vertical-align:top;">Alamat</td><td style="vertical-align:top;">:</td><td>${v(formData.alamat)}</td></tr>
        </table>

        <p style="margin-bottom:6px; text-align:justify;">Dengan ini menyatakan bahwa saya dengan itikat baik telah menguasai sebidang tanah yang terletak di :</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; margin-left:15px; font-size:12px;">
          <tr><td style="width:130px;">Lokasi</td><td style="width:12px;">:</td><td>${v(formData.lokasiTanah)}</td></tr>
          <tr><td>RT / RW</td><td>:</td><td>${v(formData.rtRw, '02 / 01')}</td></tr>
          <tr><td>D e s a</td><td>:</td><td>${v(activeDesa)}</td></tr>
          <tr><td>Kecamatan</td><td>:</td><td>${v(activeKecamatan)}</td></tr>
          <tr><td>Kabupaten</td><td>:</td><td>${v(activeKabupaten)}</td></tr>
          <tr><td>N I B</td><td>:</td><td>${v(formData.nib, '-')}</td></tr>
          <tr><td>Di pergunakan</td><td>:</td><td>${v(formData.diPergunakan, 'Pribadi')}</td></tr>
        </table>

        <p style="margin-bottom:4px;">Batas – batas tanah di maksud adalah sebagai berikut :</p>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; margin-left:15px; font-size:12px;">
          <tr><td style="width:130px;">Sebelah Utara</td><td style="width:12px;">:</td><td>Berbatasan dengan ${v(formData.batasUtara)}</td></tr>
          <tr><td>Sebelah Selatan</td><td>:</td><td>Berbatasan dengan ${v(formData.batasSelatan)}</td></tr>
          <tr><td>Sebelah Timur</td><td>:</td><td>Berbatasan dengan ${v(formData.batasTimur)}</td></tr>
          <tr><td>Sebelah Barat</td><td>:</td><td>Berbatasan dengan ${v(formData.batasBarat)}</td></tr>
        </table>

        <p style="margin-bottom:10px;">Luas Tanah di maksud : <strong>± ${v(formData.luasTanah)} Meter</strong></p>

        <p style="text-align:justify; margin-bottom:8px; line-height:1.4;">
          Bidang tanah tersebut saya peroleh dari ${v(formData.asalPerolehan, 'warisan peninggalan orang tua yang sampai saat ini saya kuasai secara terus menerus')} , tidak di jadikan / menjadi jaminan suatu hutang dan tidak dalam sengketa , dengan saksi – saksi sebagai berikut :
        </p>

        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; margin-left:15px; font-size:12px;">
          <tr>
            <td style="width:20px; vertical-align:top;">1.</td>
            <td style="width:90px; vertical-align:top;">Nama<br/>NIK</td>
            <td style="width:12px; vertical-align:top;">:<br/>:</td>
            <td style="vertical-align:top;"><strong>${toTitleCase(v(formData.saksi1Nama))}</strong><br/>${v(formData.saksi1Nik)}</td>
          </tr>
          <tr>
            <td style="vertical-align:top;">2.</td>
            <td style="vertical-align:top;">Nama<br/>NIK</td>
            <td style="vertical-align:top;">:<br/>:</td>
            <td style="vertical-align:top;"><strong>${toTitleCase(v(formData.saksi2Nama))}</strong><br/>${v(formData.saksi2Nik)}</td>
          </tr>
          <tr>
            <td style="vertical-align:top;">3.</td>
            <td style="vertical-align:top;">Nama<br/>NIK</td>
            <td style="vertical-align:top;">:<br/>:</td>
            <td style="vertical-align:top;"><strong>${toTitleCase(v(formData.saksi3Nama))}</strong><br/>${v(formData.saksi3Nik)}</td>
          </tr>
        </table>

        <p style="text-align:justify; margin-bottom:16px; line-height:1.4;">
          Surat Pernyataan ini saya buat dengan sebenarnya dengan penuh tanggung jawab dan saya bersedia mengangkat sumpah apabila di perlukan. Apabila Pernyataan ini tidak benar, saya bersedia di tuntut sesuai dengan hukum yang berlaku.
        </p>

        <!-- TANDA TANGAN PAGE 1 -->
        <div style="display:flex; justify-content:space-between; margin-top:10px; align-items:flex-start;">
          <!-- SAKSI-SAKSI (KIRI) -->
          <div style="width:48%;">
            <p style="margin-bottom:6px; font-weight:bold;">Saksi – Saksi :</p>
            <p style="margin-bottom:4px;">1. ${toTitleCase(v(formData.saksi1Nama))} ( ....................... )</p>
            <p style="margin-bottom:4px;">2. ${toTitleCase(v(formData.saksi2Nama))} ( ....................... )</p>
            <p style="margin-bottom:4px;">3. ${toTitleCase(v(formData.saksi3Nama))} ( ....................... )</p>
          </div>

          <!-- PEMBUAT PERNYATAAN (KANAN) -->
          <div style="width:48%; text-align:center;">
            <p style="margin-bottom:2px;">${activeDesa}, ${tglFormatted}</p>
            <p style="margin-bottom:48px; font-weight:bold;">Yang membuat pernyataan</p>
            <p style="font-weight:bold; text-transform:uppercase;">${v(formData.nama)}</p>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-top:15px; align-items:flex-start;">
          <!-- KETUA RT (KIRI) -->
          <div style="width:48%; text-align:center;">
            <p style="margin-bottom:2px;">Mengetahui / Membenarkan</p>
            <p style="margin-bottom:48px; font-weight:bold;">Ketua RT ${v(formData.nomorRt, '02')}</p>
            <p style="font-weight:bold; text-transform:uppercase;">${v(formData.namaKetuaRt, 'TAIBAH')}</p>
          </div>

          <!-- KEPALA DESA (KANAN) -->
          <div style="width:48%; text-align:center;">
            <p style="margin-bottom:2px;">Mengetahui</p>
            <p style="margin-bottom:48px; font-weight:bold;">${v(formData.jabatanPejabat)} ${activeDesa}</p>
            <p style="font-weight:bold; text-transform:uppercase;">${v(formData.namaPejabat)}</p>
          </div>
        </div>

      </div>
    `;

    const page2 = `
      <!-- PAGE 2: GAMBAR SITUASI KASAR TANAH -->
      <div style="font-family:${letterFont}; font-size:12px; line-height:1.4; color:black; box-sizing: border-box; padding-bottom: 20px;">

        <div style="text-align:center; margin-bottom:15px;">
          <h3 style="text-decoration:underline; margin:0; font-size:14px; text-transform:uppercase; font-weight:bold; letter-spacing:0.5px;">GAMBAR SITUASI KASAR TANAH</h3>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-weight:bold; font-size:12px;">
          <tr><td style="width:100px;">MILIK</td><td style="width:12px;">:</td><td style="text-transform:uppercase;">${v(formData.nama)}</td></tr>
          <tr><td>LOKASI</td><td>:</td><td>${v(formData.lokasiTanah)} RT. ${v(formData.nomorRt, '2')} RW. 1 Desa ${activeDesa} Kec. ${activeKecamatan}</td></tr>
          <tr><td>LUAS</td><td>:</td><td>± ${v(formData.luasTanah)} Meter</td></tr>
        </table>

        <!-- DIAGRAM BOX PETAK TANAH & KOMPAS -->
        <div style="border:1.5px solid #000; padding:15px; margin-bottom:15px; position:relative; min-height:330px; display:flex; align-items:center; justify-content:center; background:#fff;">
          <!-- DIAGRAM TRAPEZOID SKETSA -->
          <div style="width:82%; height:270px; border:1.5px solid #333; position:relative; margin:auto; background:#ffffff; display:flex; flex-direction:column; justify-content:between;">
            <!-- NORTH (UTARA) -->
            <div style="position:absolute; top:-28px; left:50%; transform:translateX(-50%); text-align:center; font-size:11px; font-weight:bold; white-space:nowrap;">
              ${v(formData.batasUtara)}<br/>
              <span style="font-size:10px; color:#059669;">${v(formData.ukuranUtara, '-')}</span>
            </div>

            <!-- SOUTH (SELATAN) -->
            <div style="position:absolute; bottom:-28px; left:50%; transform:translateX(-50%); text-align:center; font-size:11px; font-weight:bold; white-space:nowrap;">
              ${v(formData.batasSelatan)}<br/>
              <span style="font-size:10px; color:#059669;">${v(formData.ukuranSelatan, '-')}</span>
            </div>

            <!-- EAST (TIMUR - RIGHT) -->
            <div style="position:absolute; right:-125px; top:50%; transform:translateY(-50%); text-align:left; font-size:11px; font-weight:bold; width:115px;">
              ${v(formData.batasTimur)}<br/>
              <span style="font-size:10px; color:#059669;">${v(formData.ukuranTimur, '-')}</span>
            </div>

            <!-- WEST (BARAT - LEFT) -->
            <div style="position:absolute; left:-125px; top:50%; transform:translateY(-50%); text-align:right; font-size:11px; font-weight:bold; width:115px;">
              ${v(formData.batasBarat)}<br/>
              <span style="font-size:10px; color:#059669;">${v(formData.ukuranBarat, '-')}</span>
            </div>

            <!-- SKETSA SHAPE INSIDE (FROM POLYGON MAP) -->
            <div style="width:100%; height:100%; border:1px solid #e2e8f0; background: #ffffff;">
              ${generatePolygonSVG()}
            </div>
          </div>  </div>

          <!-- KOMPAS PANAH ARAH UTARA (U) -> SELATAN (S) DI SEBELAH KANAN -->
          <div style="position:absolute; right:15px; top:15px; bottom:15px; width:20px; display:flex; flex-direction:column; align-items:center; justify-content:space-between; font-weight:bold; font-size:13px;">
            <div>U</div>
            <div style="flex:1; width:2px; background:#000; position:relative; margin:4px 0;">
              <div style="position:absolute; top:0; left:-4px; width:0; height:0; border-left:5px solid transparent; border-right:5px solid transparent; border-bottom:10px solid #000;"></div>
            </div>
            <div>S</div>
          </div>
        </div>

        <p style="text-align:justify; margin-bottom:10px; font-size:11px;">
          Kami yang bertanda tangan di bawah ini adalah yang masing-masing memiliki tanah yang berbatasan dengan tanah yang di terangkan pada gambar di atas , dengan ini membenarkan batas-batas tanah tersebut :
        </p>

        <!-- TABEL PEMILIK BATAS TANAH -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:25px; font-size:11px;" border="1" cellPadding="5">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="width:35px; text-align:center;">NO</th>
              <th style="text-align:center;">N A M A</th>
              <th style="width:130px; text-align:center;">BATAS DI SEBELAH</th>
              <th style="width:160px; text-align:center;">TANDA TANGAN</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align:center;">1.</td>
              <td>${v(formData.batasUtara)}</td>
              <td style="text-align:center; font-weight:bold;">UTARA</td>
              <td style="height:28px;"></td>
            </tr>
            <tr>
              <td style="text-align:center;">2.</td>
              <td>${v(formData.batasSelatan)}</td>
              <td style="text-align:center; font-weight:bold;">SELATAN</td>
              <td style="height:28px;"></td>
            </tr>
            <tr>
              <td style="text-align:center;">3.</td>
              <td>${v(formData.batasTimur)}</td>
              <td style="text-align:center; font-weight:bold;">TIMUR</td>
              <td style="height:28px;"></td>
            </tr>
            <tr>
              <td style="text-align:center;">4.</td>
              <td>${v(formData.batasBarat)}</td>
              <td style="text-align:center; font-weight:bold;">BARAT</td>
              <td style="height:28px;"></td>
            </tr>
          </tbody>
        </table>

        <!-- TANDA TANGAN PAGE 2 -->
        <div style="display:flex; justify-content:space-between; margin-top:15px; align-items:flex-start;">
          <!-- KEPALA DESA (KIRI) -->
          <div style="width:48%; text-align:center;">
            <p style="margin-bottom:2px;">Mengetahui</p>
            <p style="margin-bottom:50px; font-weight:bold;">${v(formData.jabatanPejabat)} ${activeDesa}</p>
            <p style="font-weight:bold; text-transform:uppercase;">${v(formData.namaPejabat)}</p>
          </div>

          <!-- KETUA RT (KANAN) -->
          <div style="width:48%; text-align:center;">
            <p style="margin-bottom:2px;">Mengetahui / Membenarkan</p>
            <p style="margin-bottom:50px; font-weight:bold;">Ketua RT ${v(formData.nomorRt, '02')}</p>
            <p style="font-weight:bold; text-transform:uppercase;">${v(formData.namaKetuaRt, 'TAIBAH')}</p>
          </div>
        </div>

      </div>
    `;

    return [page1, page2];
  };

  const handleSave = async () => {
    if (!formData.nama || !formData.nik || !formData.luasTanah) {
      showToast('Mohon lengkapi nama pemohon, NIK, dan luas tanah.', 'error');
      return;
    }
    setLoading(true);

    const letterData = {
      nomor: formData.nomorSurat || `251/SKKT/${new Date().getFullYear()}`,
      jenis: 'Surat Pernyataan Penguasaan Fisik Bidang Tanah (SKKT)',
      nik: formData.nik,
      nama: formData.nama,
      tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      keperluan: formData.keperluan,
      status: 'Selesai' as const,
      data: formData
    };

    try {
      if (editLetterId) {
        await updateLetterHistory(editLetterId, letterData);
        showToast('Surat SKKT berhasil diperbarui!', 'success');
      } else {
        await addLetterHistory(letterData);
        showToast('Surat SKKT berhasil dibuat dan disimpan ke Arsip!', 'success');
      }

      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const [page1Html, page2Html] = generateHTML();
      const globalPrintFooter = localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat & dicetak melalui <strong>Sistem DiDesa</strong>';
      
      const printHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Cetak SKKT - ${formData.nama}</title>
            ${styles}
            <style>
              @page { 
                size: A4; 
                margin: 0 !important; 
              }
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
                margin: 0 auto;
                padding: 45px 55px;
                box-sizing: border-box; 
                background: white; 
                position: relative;
                page-break-after: always;
                break-after: page;
              }
              .page:last-child {
                page-break-after: auto;
                break-after: auto;
              }
              .footer {
                position: absolute;
                bottom: 45px;
                left: 55px;
                right: 55px;
                border-top: 0.5px solid #cbd5e1;
                padding-top: 4px;
                font-family: ${letterFont};
                font-size: 8px;
                color: #64748b;
                text-align: left;
              }
            </style>
          </head>
          <body>
            <div class="page">
              ${page1Html}
              <div class="footer">${globalPrintFooter}</div>
            </div>
            <div class="page">
              ${page2Html}
              <div class="footer">${globalPrintFooter}</div>
            </div>
          </body>
        </html>
      `;

      if (iframeRef.current) {
        const doc = iframeRef.current.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(printHTML);
          doc.close();
          setTimeout(() => {
            try {
              iframeRef.current.contentWindow?.focus();
              iframeRef.current.contentWindow?.print();
            } catch (e) {
              window.print();
            }
          }, 500);
        }
      }

      onBack();
    } catch (e) {
      showToast('Gagal menyimpan surat SKKT', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <iframe ref={iframeRef} className="absolute opacity-0 pointer-events-none -z-50 w-[210mm] h-[297mm]" title="Print Frame SKKT" />

      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Surat Keterangan Kepemilikan Tanah (SKKT)</h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">Surat Pernyataan Penguasaan Fisik Bidang Tanah & Gambar Situasi Kasar Tanah</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Menyimpan...' : 'Simpan & Cetak'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Input Side */}
        <div className="lg:col-span-6 space-y-6">
          {/* Section 1: Pemohon / Pemilik Tanah */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-600" /> 1. Pemohon / Pemilik Tanah
            </h3>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Ketik NIK atau Nama Pemohon..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {filteredResidents.length > 0 && (
                <div className="absolute left-0 right-0 z-20 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {filteredResidents.map(r => (
                    <button key={r.nik} onClick={() => handleSelectResident(r)} className="w-full text-left p-3 hover:bg-emerald-50 text-xs font-semibold block">
                      {r.name} ({r.nik}) - {r.address}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Nama Pemohon</label>
                <input type="text" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-800 font-semibold" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">NIK Pemohon</label>
                <input type="text" value={formData.nik} onChange={e => setFormData({ ...formData, nik: e.target.value })} className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-800 font-mono" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Tempat Lahir</label>
                <input type="text" value={formData.tempatLahir} onChange={e => setFormData({ ...formData, tempatLahir: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Tanggal Lahir</label>
                <input type="text" placeholder="19/03/1968" value={formData.tanggalLahir} onChange={e => setFormData({ ...formData, tanggalLahir: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Pekerjaan</label>
                <input type="text" value={formData.pekerjaan} onChange={e => setFormData({ ...formData, pekerjaan: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Alamat Lengkap</label>
                <input type="text" value={formData.alamat} onChange={e => setFormData({ ...formData, alamat: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
          </div>

          {/* Section 2: Detail Obyek Tanah */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" /> 2. Data Obyek Tanah & Ukuran Sisi
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Lokasi Jalan / Dusun</label>
                <input type="text" placeholder="Jalan Bukhari" value={formData.lokasiTanah} onChange={e => setFormData({ ...formData, lokasiTanah: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">RT / RW</label>
                <input type="text" placeholder="02 / 01" value={formData.rtRw} onChange={e => setFormData({ ...formData, rtRw: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Luas Tanah (m²)</label>
                <input type="text" placeholder="Contoh: 42" value={formData.luasTanah} onChange={e => setFormData({ ...formData, luasTanah: e.target.value })} className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 font-semibold" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">NIB</label>
                <input type="text" placeholder="-" value={formData.nib} onChange={e => setFormData({ ...formData, nib: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Di pergunakan</label>
                <input type="text" placeholder="Pribadi" value={formData.diPergunakan} onChange={e => setFormData({ ...formData, diPergunakan: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Nomor Surat</label>
                <input type="text" placeholder="251/SKKT/VII/2026" value={formData.nomorSurat} onChange={e => setFormData({ ...formData, nomorSurat: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Asal Perolehan Tanah</label>
              <textarea rows={2} value={formData.asalPerolehan} onChange={e => setFormData({ ...formData, asalPerolehan: e.target.value })} className="w-full p-2 border rounded-lg text-xs" />
            </div>

            {/* Batas-Batas & Ukuran Meter */}
            <div className="space-y-3 pt-2">
              <p className="font-bold text-xs text-gray-700 dark:text-slate-300">Batas & Panjang Sisi Tanah (Meter):</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px]">Utara (Pemilik / Ukuran)</span>
                  <input type="text" placeholder="Nama Pemilik" value={formData.batasUtara} onChange={e => setFormData({ ...formData, batasUtara: e.target.value })} className="w-full p-1.5 border rounded-lg mb-1" />
                  <input type="text" placeholder="Ukuran (misal 6 Meter)" value={formData.ukuranUtara} onChange={e => setFormData({ ...formData, ukuranUtara: e.target.value })} className="w-full p-1.5 border rounded-lg font-mono text-[11px]" />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Selatan (Pemilik / Ukuran)</span>
                  <input type="text" placeholder="Nama Pemilik" value={formData.batasSelatan} onChange={e => setFormData({ ...formData, batasSelatan: e.target.value })} className="w-full p-1.5 border rounded-lg mb-1" />
                  <input type="text" placeholder="Ukuran (misal 6.5 Meter)" value={formData.ukuranSelatan} onChange={e => setFormData({ ...formData, ukuranSelatan: e.target.value })} className="w-full p-1.5 border rounded-lg font-mono text-[11px]" />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Timur (Pemilik / Ukuran)</span>
                  <input type="text" placeholder="Nama Pemilik" value={formData.batasTimur} onChange={e => setFormData({ ...formData, batasTimur: e.target.value })} className="w-full p-1.5 border rounded-lg mb-1" />
                  <input type="text" placeholder="Ukuran (misal 7 Meter)" value={formData.ukuranTimur} onChange={e => setFormData({ ...formData, ukuranTimur: e.target.value })} className="w-full p-1.5 border rounded-lg font-mono text-[11px]" />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Barat (Pemilik / Ukuran)</span>
                  <input type="text" placeholder="Nama Pemilik" value={formData.batasBarat} onChange={e => setFormData({ ...formData, batasBarat: e.target.value })} className="w-full p-1.5 border rounded-lg mb-1" />
                  <input type="text" placeholder="Ukuran (misal 7 Meter)" value={formData.ukuranBarat} onChange={e => setFormData({ ...formData, ukuranBarat: e.target.value })} className="w-full p-1.5 border rounded-lg font-mono text-[11px]" />
                </div>
              </div>
            </div>

            {/* Geo Coordinate Picker */}
            <div className="p-4 bg-emerald-50/50 dark:bg-slate-800/50 rounded-xl border border-emerald-100 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Koordinat Poligon & Satelit <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Klik tombol map untuk menggambar" 
                      value={formData.polygonPoints?.length > 0 ? `${formData.polygonPoints.length} Titik Terukur` : ''} 
                      disabled
                      className="w-full p-2 border rounded-lg bg-gray-50 dark:bg-slate-800 text-emerald-700 font-bold" 
                    />
                    <button 
                      onClick={() => setShowMapModal(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-2 whitespace-nowrap shadow-sm"
                    >
                      <MapPin className="w-4 h-4" /> Buka Peta
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Gunakan peta satelit interaktif untuk menggambar batas tanah dan menghitung luas otomatis.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Data Saksi-Saksi (3 Orang) */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" /> 3. Data Saksi-Saksi (3 Orang)
            </h3>

            {/* Saksi 1 */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 space-y-2 text-xs">
              <p className="font-bold text-gray-700 dark:text-slate-300">Saksi 1:</p>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cari Saksi 1..."
                  value={searchSaksi1}
                  onChange={(e) => setSearchSaksi1(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900"
                />
                {filteredSaksi1.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-1 bg-white dark:bg-slate-900 border rounded-xl shadow-xl max-h-36 overflow-y-auto">
                    {filteredSaksi1.map(r => (
                      <button key={r.nik} onClick={() => { setFormData(prev => ({ ...prev, saksi1Nama: r.name, saksi1Nik: r.nik })); setSearchSaksi1(''); }} className="w-full text-left p-2 hover:bg-emerald-50 text-xs block">
                        {r.name} ({r.nik})
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nama Saksi 1" value={formData.saksi1Nama} onChange={e => setFormData({ ...formData, saksi1Nama: e.target.value })} className="p-2 border rounded-lg" />
                <input type="text" placeholder="NIK Saksi 1" value={formData.saksi1Nik} onChange={e => setFormData({ ...formData, saksi1Nik: e.target.value })} className="p-2 border rounded-lg font-mono" />
              </div>
            </div>

            {/* Saksi 2 */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 space-y-2 text-xs">
              <p className="font-bold text-gray-700 dark:text-slate-300">Saksi 2:</p>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cari Saksi 2..."
                  value={searchSaksi2}
                  onChange={(e) => setSearchSaksi2(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900"
                />
                {filteredSaksi2.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-1 bg-white dark:bg-slate-900 border rounded-xl shadow-xl max-h-36 overflow-y-auto">
                    {filteredSaksi2.map(r => (
                      <button key={r.nik} onClick={() => { setFormData(prev => ({ ...prev, saksi2Nama: r.name, saksi2Nik: r.nik })); setSearchSaksi2(''); }} className="w-full text-left p-2 hover:bg-emerald-50 text-xs block">
                        {r.name} ({r.nik})
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nama Saksi 2" value={formData.saksi2Nama} onChange={e => setFormData({ ...formData, saksi2Nama: e.target.value })} className="p-2 border rounded-lg" />
                <input type="text" placeholder="NIK Saksi 2" value={formData.saksi2Nik} onChange={e => setFormData({ ...formData, saksi2Nik: e.target.value })} className="p-2 border rounded-lg font-mono" />
              </div>
            </div>

            {/* Saksi 3 */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 space-y-2 text-xs">
              <p className="font-bold text-gray-700 dark:text-slate-300">Saksi 3:</p>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cari Saksi 3..."
                  value={searchSaksi3}
                  onChange={(e) => setSearchSaksi3(e.target.value)}
                  className="w-full p-2 border rounded-lg bg-white dark:bg-slate-900"
                />
                {filteredSaksi3.length > 0 && (
                  <div className="absolute left-0 right-0 z-20 mt-1 bg-white dark:bg-slate-900 border rounded-xl shadow-xl max-h-36 overflow-y-auto">
                    {filteredSaksi3.map(r => (
                      <button key={r.nik} onClick={() => { setFormData(prev => ({ ...prev, saksi3Nama: r.name, saksi3Nik: r.nik })); setSearchSaksi3(''); }} className="w-full text-left p-2 hover:bg-emerald-50 text-xs block">
                        {r.name} ({r.nik})
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nama Saksi 3" value={formData.saksi3Nama} onChange={e => setFormData({ ...formData, saksi3Nama: e.target.value })} className="p-2 border rounded-lg" />
                <input type="text" placeholder="NIK Saksi 3" value={formData.saksi3Nik} onChange={e => setFormData({ ...formData, saksi3Nik: e.target.value })} className="p-2 border rounded-lg font-mono" />
              </div>
            </div>

            {/* Section 4: RT & Kades */}
            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Nomor RT</label>
                <input type="text" placeholder="02" value={formData.nomorRt} onChange={e => setFormData({ ...formData, nomorRt: e.target.value })} className="w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="font-bold text-gray-600 dark:text-slate-400 block mb-1">Nama Ketua RT</label>
                <input type="text" placeholder="TAIBAH" value={formData.namaKetuaRt} onChange={e => setFormData({ ...formData, namaKetuaRt: e.target.value.toUpperCase() })} className="w-full p-2 border rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Side */}
        <div className="lg:col-span-6 bg-gray-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4 sticky top-6">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pratinjau Lembar Surat (2 Halaman A4)</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPreviewZoom(z => Math.max(0.3, z - 0.05))} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-xs font-mono font-bold text-gray-600">{Math.round(previewZoom * 100)}%</span>
              <button onClick={() => setPreviewZoom(z => Math.min(1.0, z + 0.05))} className="p-1 text-gray-500 hover:bg-gray-200 rounded"><ZoomIn className="w-4 h-4" /></button>
            </div>
          </div>

          <div 
            ref={dragProps.ref}
            onMouseDown={dragProps.onMouseDown}
            onMouseLeave={dragProps.onMouseLeave}
            onMouseUp={dragProps.onMouseUp}
            onMouseMove={dragProps.onMouseMove}
            style={{ ...dragProps.style }}
            className="flex-1 bg-slate-200/40 overflow-auto relative flex flex-col items-center gap-8 p-8 max-h-[85vh]"
          >
            {generateHTML().map((pageHtml, index) => (
              <div 
                key={index}
                style={{
                  width: `${794 * previewZoom}px`,
                  height: `${1123 * previewZoom}px`,
                  overflow: 'hidden',
                  position: 'relative',
                  boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)',
                  borderRadius: '12px',
                  transition: 'width 0.2s ease-out, height 0.2s ease-out'
                }}
                className="bg-white dark:bg-slate-900 shrink-0 relative"
              >
                <div 
                  className="bg-white dark:bg-slate-900 shrink-0"
                  style={{ 
                    width: '794px', 
                    height: '1123px',
                    padding: '45px 55px',
                    transform: `scale(${previewZoom})`,
                    transformOrigin: 'top left',
                    fontFamily: letterFont,
                    fontSize: '12px',
                    lineHeight: '1.45',
                    position: 'relative',
                    color: 'black',
                    boxSizing: 'border-box'
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: pageHtml }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '45px',
                    left: '55px',
                    right: '55px',
                    borderTop: '0.5px solid #cbd5e1',
                    paddingTop: '4px',
                    fontSize: '8px',
                    color: '#64748b',
                    textAlign: 'left'
                  }} dangerouslySetInnerHTML={{ __html: localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat & dicetak melalui <strong>Sistem DiDesa</strong>' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Satellite Map Picker Modal */}
      {showMapModal && (
        <LandPolygonPickerModal
          initialLat={formData.lat}
          initialLng={formData.lng}
          onSave={(data: PolygonData) => {
            setFormData(prev => ({ 
              ...prev, 
              lat: data.centerLat, 
              lng: data.centerLng,
              polygonPoints: data.points,
              luasTanah: data.area.toFixed(2),
              ukuranUtara: data.northDistance > 0 ? `${data.northDistance.toFixed(1)} Meter` : prev.ukuranUtara,
              ukuranSelatan: data.southDistance > 0 ? `${data.southDistance.toFixed(1)} Meter` : prev.ukuranSelatan,
              ukuranTimur: data.eastDistance > 0 ? `${data.eastDistance.toFixed(1)} Meter` : prev.ukuranTimur,
              ukuranBarat: data.westDistance > 0 ? `${data.westDistance.toFixed(1)} Meter` : prev.ukuranBarat,
            }));
            showToast(`Area berhasil diukur: ${data.area.toFixed(2)} m²`, 'success');
            setShowMapModal(false);
          }}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}
