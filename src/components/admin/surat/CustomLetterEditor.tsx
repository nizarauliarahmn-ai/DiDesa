import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Table, Minus, ArrowLeft, Printer, Save,
  Undo2, Redo2, Indent, Outdent, RemoveFormatting, Hash, User, Calendar, FileSignature,
  ZoomIn, ZoomOut, Maximize, PanelLeft, PanelTop
} from 'lucide-react';
import { generateKopSuratHTML } from '../../../utils/letterFormat';
import { getLetterClassifications, generateLetterNumberAsync } from '../../../utils/letterClassifications';
import { resolveKadesName, getOfficerOptions } from '../../../utils/letterOfficers';
import TemplatePickerModal, { type LetterTemplate } from './TemplatePickerModal';
import { addLetterHistory } from '../../../utils/letterHistory';
import { showToast } from '../../../utils/toast';

const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24'];
const FONT_FAMILIES = ['Arial, sans-serif', 'Times New Roman, serif', 'Georgia, serif', 'Calibri, sans-serif', 'Courier New, monospace'];
const ZOOM_LEVELS = [50, 75, 100, 125, 150];
const ZOOM_DEFAULT = 100;

type SignatureLayout = 'kades_only' | 'kades_rt' | 'kades_bpd' | 'kades_rw' | 'kades_rw_rt' | 'custom';
type ToolbarPos = 'left' | 'top';

const LAYOUT_OPTIONS: { value: SignatureLayout; label: string }[] = [
  { value: 'kades_only', label: 'Kepala Desa Saja' },
  { value: 'kades_rt', label: 'Kepala Desa + Ketua RT' },
  { value: 'kades_bpd', label: 'Kepala Desa + BPD' },
  { value: 'kades_rw', label: 'Kepala Desa + Ketua RW' },
  { value: 'kades_rw_rt', label: 'Kepala Desa + RW + RT' },
  { value: 'custom', label: 'Custom (Atur Sendiri)' },
];

function execCmd(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function formatDateID(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CustomLetterEditor({ onBack }: { onBack: () => void }) {
  const [showPicker, setShowPicker] = useState(true);
  const [activeTemplate, setActiveTemplate] = useState<LetterTemplate | null>(null);
  const [letterTitle, setLetterTitle] = useState('');
  const [nomorSurat, setNomorSurat] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentFont, setCurrentFont] = useState('Arial, sans-serif');
  const [currentFontSize, setCurrentFontSize] = useState('12');
  const editorRef = useRef<HTMLDivElement>(null);
  const printFrameRef = useRef<HTMLIFrameElement>(null);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [tableGridSize, setTableGridSize] = useState({ rows: 3, cols: 3 });
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sigLayout, setSigLayout] = useState<SignatureLayout>('kades_only');
  const [kadesName, setKadesName] = useState(() => localStorage.getItem('village_super_admin') || resolveKadesName() || '');
  const [kadesJabatan] = useState(() => localStorage.getItem('village_super_admin_role') || 'Kepala Desa');
  const [rtName, setRtName] = useState('');
  const [rwName, setRwName] = useState('');
  const [bpdName, setBpdName] = useState('');
  const [custom1Label, setCustom1Label] = useState('');
  const [custom1Name, setCustom1Name] = useState('');
  const [custom2Label, setCustom2Label] = useState('');
  const [custom2Name, setCustom2Name] = useState('');

  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('custom_letter_zoom');
    return saved ? parseInt(saved) : ZOOM_DEFAULT;
  });
  const [toolbarPos, setToolbarPos] = useState<ToolbarPos>(() => {
    return (localStorage.getItem('custom_letter_toolbar_pos') as ToolbarPos) || 'left';
  });

  const applyZoom = (z: number) => {
    setZoom(z);
    localStorage.setItem('custom_letter_zoom', String(z));
  };
  const zoomIn = () => { const i = ZOOM_LEVELS.findIndex(z => z > zoom); if (i >= 0) applyZoom(ZOOM_LEVELS[i]); };
  const zoomOut = () => { for (let i = ZOOM_LEVELS.length - 1; i >= 0; i--) { if (ZOOM_LEVELS[i] < zoom) { applyZoom(ZOOM_LEVELS[i]); return; } } };
  const zoomFit = () => applyZoom(ZOOM_DEFAULT);

  const toggleToolbarPos = () => {
    const next = toolbarPos === 'left' ? 'top' : 'left';
    setToolbarPos(next);
    localStorage.setItem('custom_letter_toolbar_pos', next);
  };

  const pushHistory = useCallback((html: string) => {
    setHistoryStack(prev => {
      const newStack = prev.slice(0, historyIndex + 1);
      newStack.push(html);
      if (newStack.length > 50) newStack.shift();
      return newStack;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && editorRef.current) {
      editorRef.current.innerHTML = historyStack[historyIndex - 1];
      setHistoryIndex(prev => prev - 1);
    }
  }, [historyIndex, historyStack]);

  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1 && editorRef.current) {
      editorRef.current.innerHTML = historyStack[historyIndex + 1];
      setHistoryIndex(prev => prev + 1);
    }
  }, [historyIndex, historyStack]);

  const recordChange = useCallback(() => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      if (editorRef.current) pushHistory(editorRef.current.innerHTML);
    }, 500);
  }, [pushHistory]);

  useEffect(() => {
    return () => { if (historyTimerRef.current) clearTimeout(historyTimerRef.current); };
  }, []);

  useEffect(() => {
    const configs = getLetterClassifications();
    const custom = configs.find(c => c.klasifikasi === 'UND' || c.klasifikasi === '005') || configs[0];
    if (custom) {
      generateLetterNumberAsync(custom.klasifikasi, custom.kodeKlasifikasi || '005')
        .then(generatedNo => setNomorSurat(generatedNo))
        .catch(() => setNomorSurat(`001/005/${new Date().getFullYear()}`));
    }
  }, []);

  useEffect(() => {
    const officers = getOfficerOptions();
    const rt = officers.find(o => o.role.toLowerCase().includes('rt'));
    if (rt && !rtName) setRtName(rt.name);
    const rw = officers.find(o => o.role.toLowerCase().includes('rw'));
    if (rw && !rwName) setRwName(rw.name);
  }, []);

  const handleSelectTemplate = (tpl: LetterTemplate) => {
    setActiveTemplate(tpl);
    setLetterTitle(tpl.label);
    setShowPicker(false);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = tpl.content;
        pushHistory(tpl.content);
      }
    }, 100);
  };

  const insertTable = (rows: number, cols: number) => {
    execCmd('insertHTML', `<table style="width:100%;border-collapse:collapse;margin:12px 0;border:1px solid #d1d5db;" class="editor-table"><tbody>${
      Array(rows).fill(0).map(() =>
        `<tr>${Array(cols).fill(0).map(() =>
          `<td style="border:1px solid #d1d5db;padding:8px;min-width:60px;">&nbsp;</td>`
        ).join('')}</tr>`
      ).join('')
    }</tbody></table><p>&nbsp;</p>`);
    setShowTableGrid(false);
    recordChange();
  };

  const buildSignatureBlockHTML = (): string => {
    const tgl = formatDateID(tanggalSurat);
    const desaName = (localStorage.getItem('kop_desa') || 'Desa').replace(/^(desa|kelurahan)\s+/i, '').trim();

    const col = (label: string, name: string) => `
      <td style="width:50%;vertical-align:top;border:none;padding:0;text-align:center;">
        <p style="margin:0 0 4px 0;">Mengetahui,</p>
        <p style="margin:40px 0 0 0;font-weight:bold;text-decoration:underline;text-transform:uppercase;">${label}</p>
        <p style="margin:2px 0 0 0;font-size:10pt;">${name || '................................'}</p>
      </td>`;

    const kadesCol = `
      <td style="width:50%;vertical-align:top;border:none;padding:0;text-align:center;">
        <p style="margin:0;">${desaName}, ${tgl}</p>
        <p style="margin:0;">${kadesJabatan},</p>
        <p style="margin:40px 0 0 0;font-weight:bold;text-decoration:underline;text-transform:uppercase;">${kadesName}</p>
      </td>`;

    if (sigLayout === 'kades_only') {
      return `<div style="margin-top:24px;"><table style="width:100%;border-collapse:collapse;border:none;"><tr>
        <td style="width:100%;vertical-align:top;border:none;padding:0;text-align:center;">
          <p style="margin:0;">${desaName}, ${tgl}</p>
          <p style="margin:0;">${kadesJabatan},</p>
          <p style="margin:40px 0 0 0;font-weight:bold;text-decoration:underline;text-transform:uppercase;">${kadesName}</p>
        </td>
      </tr></table></div>`;
    }

    let leftCells = '';
    switch (sigLayout) {
      case 'kades_rt': leftCells = col('Ketua RT', rtName); break;
      case 'kades_bpd': leftCells = col('Ketua BPD', bpdName); break;
      case 'kades_rw': leftCells = col('Ketua RW', rwName); break;
      case 'kades_rw_rt':
        leftCells = `<td style="width:50%;vertical-align:top;border:none;padding:0;">
          <table style="width:100%;border-collapse:collapse;border:none;"><tr>
            <td style="width:50%;vertical-align:top;border:none;padding:0;text-align:center;">
              <p style="margin:0 0 4px 0;">Mengetahui,</p>
              <p style="margin:40px 0 0 0;font-weight:bold;text-decoration:underline;">Ketua RW</p>
              <p style="margin:2px 0 0 0;font-size:10pt;">${rwName || '................................'}</p>
            </td>
            <td style="width:50%;vertical-align:top;border:none;padding:0;text-align:center;">
              <p style="margin:0 0 4px 0;">Mengetahui,</p>
              <p style="margin:40px 0 0 0;font-weight:bold;text-decoration:underline;">Ketua RT</p>
              <p style="margin:2px 0 0 0;font-size:10pt;">${rtName || '................................'}</p>
            </td>
          </tr></table></td>`;
        break;
      case 'custom':
        const parts: string[] = [];
        if (custom1Label) parts.push(`<td style="width:${custom2Label ? '50' : '100'}%;vertical-align:top;border:none;padding:0;text-align:center;">
          <p style="margin:0 0 4px 0;">Mengetahui,</p>
          <p style="margin:40px 0 0 0;font-weight:bold;text-decoration:underline;">${custom1Label}</p>
          <p style="margin:2px 0 0 0;font-size:10pt;">${custom1Name || '................................'}</p></td>`);
        if (custom2Label) parts.push(`<td style="width:${custom1Label ? '50' : '100'}%;vertical-align:top;border:none;padding:0;text-align:center;">
          <p style="margin:0 0 4px 0;">Mengetahui,</p>
          <p style="margin:40px 0 0 0;font-weight:bold;text-decoration:underline;">${custom2Label}</p>
          <p style="margin:2px 0 0 0;font-size:10pt;">${custom2Name || '................................'}</p></td>`);
        leftCells = parts.length > 0 ? `<td style="width:50%;vertical-align:top;border:none;padding:0;"><table style="width:100%;border-collapse:collapse;border:none;"><tr>${parts.join('')}</tr></table></td>` : '';
        break;
    }

    return `<div style="margin-top:24px;"><table style="width:100%;border-collapse:collapse;border:none;"><tr>${leftCells}${kadesCol}</tr></table></div>`;
  };

  const buildSignatureBlockCanvas = () => {
    const tgl = formatDateID(tanggalSurat);
    const desaName = (localStorage.getItem('kop_desa') || 'Desa').replace(/^(desa|kelurahan)\s+/i, '').trim();

    const sigCell = (label: string, name: string) => (
      <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
        <p style={{ margin: '0 0 4px 0' }}>Mengetahui,</p>
        <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{label}</p>
        <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>{name || '................................'}</p>
      </td>
    );

    const kadesCell = (width = '50%') => (
      <td style={{ width, verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
        <p style={{ margin: 0 }}>{desaName}, {tgl}</p>
        <p style={{ margin: 0 }}>{kadesJabatan},</p>
        <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline', textTransform: 'uppercase' }}>{kadesName}</p>
      </td>
    );

    if (sigLayout === 'kades_only') {
      return <div style={{ marginTop: '24px' }}><table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}><tbody><tr>{kadesCell('100%')}</tr></tbody></table></div>;
    }

    const buildLeft = () => {
      switch (sigLayout) {
        case 'kades_rt': return sigCell('Ketua RT', rtName);
        case 'kades_bpd': return sigCell('Ketua BPD', bpdName);
        case 'kades_rw': return sigCell('Ketua RW', rwName);
        case 'kades_rw_rt':
          return (
            <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}><tbody><tr>
                <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px 0' }}>Mengetahui,</p>
                  <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' }}>Ketua RW</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>{rwName || '................................'}</p>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px 0' }}>Mengetahui,</p>
                  <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' }}>Ketua RT</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>{rtName || '................................'}</p>
                </td>
              </tr></tbody></table>
            </td>
          );
        case 'custom':
          return (
            <td style={{ width: '50%', verticalAlign: 'top', border: 'none', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}><tbody><tr>
                {custom1Label && <td style={{ width: custom2Label ? '50%' : '100%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px 0' }}>Mengetahui,</p>
                  <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' }}>{custom1Label}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>{custom1Name || '................................'}</p>
                </td>}
                {custom2Label && <td style={{ width: custom1Label ? '50%' : '100%', verticalAlign: 'top', border: 'none', padding: 0, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 4px 0' }}>Mengetahui,</p>
                  <p style={{ margin: '40px 0 0 0', fontWeight: 'bold', textDecoration: 'underline' }}>{custom2Label}</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '10pt' }}>{custom2Name || '................................'}</p>
                </td>}
              </tr></tbody></table>
            </td>
          );
        default: return null;
      }
    };

    return <div style={{ marginTop: '24px' }}><table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}><tbody><tr>{buildLeft()}{kadesCell()}</tr></tbody></table></div>;
  };

  const handlePrint = () => {
    const content = editorRef.current?.innerHTML;
    if (!content || !printFrameRef.current) return;

    const kopSurat = generateKopSuratHTML();
    const globalFooter = localStorage.getItem('global_print_footer') ||
      'Dokumen ini dibuat &amp; dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia';
    const letterFont = localStorage.getItem('village_letter_font') || currentFont;

    const doc = printFrameRef.current.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><style>
      @page{size:A4 portrait;margin:0}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{margin:0;padding:1.5cm 1.5cm 1cm 1.5cm;font-family:${letterFont};font-size:10pt;line-height:1.6;color:#000}
      table{width:100%;border-collapse:collapse;border:none}
      td{border:none;padding:0}
      .editor-table td{border:1px solid #d1d5db;padding:8px}
      .global-footer{border-top:0.5px solid #cbd5e1;padding-top:5px;font-family:Inter,sans-serif;line-height:1.5;font-size:8px;color:#94a3b8;text-align:left;margin-top:24px}
      ul,ol{margin:8px 0 8px 20px} li{margin:4px 0} p{margin:0 0 8px 0}
      h1,h2,h3,h4,h5,h6{margin:0 0 8px 0}
      strong,b{font-weight:bold} em,i{font-style:italic} u{text-decoration:underline}
      hr{border:none;border-top:1px solid #d1d5db;margin:12px 0}
    </style></head><body>
    ${kopSurat}
    <p style="text-align:center;font-weight:bold;text-decoration:underline;font-size:14pt;text-transform:uppercase;margin:0 0 4px 0;">${letterTitle || 'SURAT'}</p>
    <p style="text-align:center;margin:0 0 16px 0;">Nomor: ${nomorSurat}</p>
    <div>${content}</div>
    ${buildSignatureBlockHTML()}
    <div class="global-footer">${globalFooter}</div>
    </body></html>`);
    doc.close();

    setTimeout(() => {
      printFrameRef.current?.contentWindow?.focus();
      printFrameRef.current?.contentWindow?.print();
    }, 500);
  };

  const handleSaveDraft = () => {
    const content = editorRef.current?.innerHTML || '';
    addLetterHistory({
      nomor: nomorSurat || `draft/${new Date().getFullYear()}`,
      jenis: letterTitle || 'Surat Manual',
      penerima: '',
      status: 'draft',
      tanggal: new Date().toISOString(),
      data: { title: letterTitle, content, nomorSurat, kadesName, sigLayout },
    });
    showToast('Draft surat berhasil disimpan!', 'success');
  };

  const ToolbarButton = ({ cmd, icon, title, onClick }: {
    cmd?: string; icon: React.ReactNode; title: string; onClick?: () => void;
  }) => (
    <button type="button" title={title}
      onClick={onClick || (() => { execCmd(cmd!); recordChange(); })}
      className="p-1.5 rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white transition-all"
    >{icon}</button>
  );

  const desaName = (localStorage.getItem('kop_desa') || 'Desa').replace(/^(desa|kelurahan)\s+/i, '').trim();
  const kecamatan = (localStorage.getItem('kop_kecamatan') || 'Kecamatan').replace(/^kecamatan\s+/i, '').trim();

  const renderToolbarButtons = (isHorizontal: boolean) => (
    <>
      {/* Undo / Redo */}
      <div className={`flex items-center gap-0.5 ${isHorizontal ? '' : ''}`}>
        <ToolbarButton icon={<Undo2 className="w-4 h-4" />} title="Undo" onClick={handleUndo} />
        <ToolbarButton icon={<Redo2 className="w-4 h-4" />} title="Redo" onClick={handleRedo} />
      </div>

      {/* Font */}
      <div className="flex items-center gap-0.5">
        <select value={currentFont} onChange={e => { setCurrentFont(e.target.value); execCmd('fontName', e.target.value); recordChange(); }}
          className={`${isHorizontal ? 'w-32' : 'flex-1 min-w-0'} px-2 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 outline-none cursor-pointer`}>
          {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
        </select>
        <select value={currentFontSize} onChange={e => { setCurrentFontSize(e.target.value); execCmd('fontSize', '4'); recordChange(); }}
          className="w-14 px-1 py-1.5 text-[11px] font-medium rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 outline-none cursor-pointer">
          {FONT_SIZES.map(s => <option key={s} value={s}>{s}pt</option>)}
        </select>
      </div>

      <div className={isHorizontal ? 'w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1' : 'h-px bg-gray-100 dark:bg-slate-800 my-0.5'} />

      {/* Text Style */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton cmd="bold" icon={<Bold className="w-4 h-4" />} title="Bold" />
        <ToolbarButton cmd="italic" icon={<Italic className="w-4 h-4" />} title="Italic" />
        <ToolbarButton cmd="underline" icon={<Underline className="w-4 h-4" />} title="Underline" />
      </div>

      <div className={isHorizontal ? 'w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1' : 'h-px bg-gray-100 dark:bg-slate-800 my-0.5'} />

      {/* Alignment */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton cmd="justifyLeft" icon={<AlignLeft className="w-4 h-4" />} title="Rata Kiri" />
        <ToolbarButton cmd="justifyCenter" icon={<AlignCenter className="w-4 h-4" />} title="Rata Tengah" />
        <ToolbarButton cmd="justifyRight" icon={<AlignRight className="w-4 h-4" />} title="Rata Kanan" />
        <ToolbarButton cmd="justifyFull" icon={<AlignJustify className="w-4 h-4" />} title="Rata Kiri-Kanan" />
      </div>

      <div className={isHorizontal ? 'w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1' : 'h-px bg-gray-100 dark:bg-slate-800 my-0.5'} />

      {/* Lists & Indent */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton cmd="insertUnorderedList" icon={<List className="w-4 h-4" />} title="Bullet List" />
        <ToolbarButton cmd="insertOrderedList" icon={<ListOrdered className="w-4 h-4" />} title="Numbering" />
        <ToolbarButton cmd="indent" icon={<Indent className="w-4 h-4" />} title="Indent" />
        <ToolbarButton cmd="outdent" icon={<Outdent className="w-4 h-4" />} title="Outdent" />
      </div>

      <div className={isHorizontal ? 'w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1' : 'h-px bg-gray-100 dark:bg-slate-800 my-0.5'} />

      {/* Insert */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton icon={<Minus className="w-4 h-4" />} title="Garis Horizontal" onClick={() => { execCmd('insertHTML', '<hr style="border:none;border-top:1px solid #d1d5db;margin:12px 0;" /><p>&nbsp;</p>'); recordChange(); }} />
        <div className="relative">
          <ToolbarButton icon={<Table className="w-4 h-4" />} title="Tabel" onClick={() => setShowTableGrid(!showTableGrid)} />
          {showTableGrid && (
            <div className={`${isHorizontal ? 'absolute top-full left-0 mt-1' : 'absolute left-full top-0 ml-2'} bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl p-3 z-50`}>
              <p className="text-[10px] font-bold text-gray-500 dark:text-slate-400 mb-2">Ukuran Tabel</p>
              <div className="grid grid-cols-5 gap-1 mb-2">
                {Array(5).fill(0).map((_, r) => Array(5).fill(0).map((_, c) => (
                  <button key={`${r}-${c}`} onMouseEnter={() => setTableGridSize({ rows: r + 1, cols: c + 1 })}
                    onClick={() => insertTable(r + 1, c + 1)}
                    className={`w-5 h-5 rounded border transition-colors ${r < tableGridSize.rows && c < tableGridSize.cols ? 'bg-emerald-400 border-emerald-500' : 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-emerald-100'}`} />
                )))}
              </div>
              <p className="text-[10px] text-center text-gray-400">{tableGridSize.rows} × {tableGridSize.cols}</p>
            </div>
          )}
        </div>
        <ToolbarButton cmd="removeFormat" icon={<RemoveFormatting className="w-4 h-4" />} title="Hapus Format" />
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-full">
      <TemplatePickerModal isOpen={showPicker} onClose={() => {}} onSelect={handleSelectTemplate} />

      {!showPicker && (
        <>
          {/* ─── Header ─── */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-5 py-3 shadow-sm mb-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
              <input type="text" value={letterTitle} onChange={e => setLetterTitle(e.target.value)}
                placeholder="Judul Surat"
                className="text-lg font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder:text-gray-300 dark:placeholder:text-slate-600 w-72" />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleToolbarPos} title={toolbarPos === 'left' ? 'Toolbar di Atas' : 'Toolbar di Samping'}
                className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                {toolbarPos === 'left' ? <PanelTop className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowPicker(true)} className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">Ganti Template</button>
              <button onClick={handleSaveDraft} className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Simpan Draft</button>
              <button onClick={handlePrint} className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors flex items-center gap-1.5"><Printer className="w-3.5 h-3.5" /> Cetak</button>
            </div>
          </div>

          {/* ─── Main Layout ─── */}
          {toolbarPos === 'left' ? (
            /* === POSISI LEFT: Sidebar + Canvas === */
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Sidebar */}
              <div className="w-72 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
                {/* Metadata */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-4 py-3 shadow-sm space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3" /> Nomor Surat</label>
                    <input type="text" value={nomorSurat} onChange={e => setNomorSurat(e.target.value)} placeholder="001/005/2026"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-mono outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Tanggal</label>
                    <input type="date" value={tanggalSurat} onChange={e => setTanggalSurat(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><FileSignature className="w-3 h-3" /> Layout Tanda Tangan</label>
                    <select value={sigLayout} onChange={e => setSigLayout(e.target.value as SignatureLayout)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800">
                      {LAYOUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1"><User className="w-3 h-3" /> Pejabat Penandatangan</label>
                    <select value={kadesName} onChange={e => setKadesName(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800">
                      <option value="">{kadesName || 'Pilih'}</option>
                      {getOfficerOptions().map(o => <option key={o.name} value={o.name}>{o.name} ({o.role})</option>)}
                    </select>
                  </div>

                  {/* Signature config fields */}
                  {sigLayout !== 'kades_only' && (
                    <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                      {(sigLayout === 'kades_rt' || sigLayout === 'kades_rw_rt') && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ketua RT</label>
                          <input type="text" value={rtName} onChange={e => setRtName(e.target.value)} placeholder="Nama Ketua RT"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                        </div>
                      )}
                      {(sigLayout === 'kades_rw' || sigLayout === 'kades_rw_rt') && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ketua RW</label>
                          <input type="text" value={rwName} onChange={e => setRwName(e.target.value)} placeholder="Nama Ketua RW"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                        </div>
                      )}
                      {sigLayout === 'kades_bpd' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ketua BPD</label>
                          <input type="text" value={bpdName} onChange={e => setBpdName(e.target.value)} placeholder="Nama Ketua BPD"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                        </div>
                      )}
                      {sigLayout === 'custom' && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jabatan 1</label>
                            <input type="text" value={custom1Label} onChange={e => setCustom1Label(e.target.value)} placeholder="cth: Sekretaris Desa"
                              className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                            <input type="text" value={custom1Name} onChange={e => setCustom1Name(e.target.value)} placeholder="Nama"
                              className="w-full px-2.5 py-1.5 mt-1 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jabatan 2</label>
                            <input type="text" value={custom2Label} onChange={e => setCustom2Label(e.target.value)} placeholder="cth: Bendahara Desa"
                              className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                            <input type="text" value={custom2Name} onChange={e => setCustom2Name(e.target.value)} placeholder="Nama"
                              className="w-full px-2.5 py-1.5 mt-1 rounded-xl border border-gray-200 dark:border-slate-700 text-[11px] font-bold outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50 dark:bg-slate-800" />
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-gray-400 dark:text-slate-500">{desaName} Kec. {kecamatan}</p>
                </div>

                {/* Toolbar — vertical */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-2 py-2 shadow-sm flex flex-col gap-0.5 sticky top-0">
                  {renderToolbarButtons(false)}
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Zoom bar */}
                <div className="flex items-center justify-center gap-1 mb-3 flex-shrink-0">
                  <button onClick={zoomOut} disabled={zoom <= ZOOM_LEVELS[0]}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ZoomOut className="w-4 h-4" /></button>
                  <button onClick={zoomFit} className="px-2 py-1 text-[11px] font-bold text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 min-w-[48px] transition-colors">{zoom}%</button>
                  <button onClick={zoomIn} disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ZoomIn className="w-4 h-4" /></button>
                  <button onClick={zoomFit} title="Fit to 100%"
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"><Maximize className="w-4 h-4" /></button>
                </div>
                {/* Scrollable canvas */}
                <div className="flex-1 flex justify-center bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 overflow-auto min-h-0">
                  <div style={{ width: `${210 * zoom / 100}mm`, height: `${297 * zoom / 100}mm`, flexShrink: 0 }}>
                    <div className="bg-white shadow-2xl" style={{ width: '210mm', height: '297mm', padding: '2cm 2.5cm', boxSizing: 'border-box', fontFamily: currentFont, fontSize: `${currentFontSize}pt`, lineHeight: 1.6, transformOrigin: 'top left', transform: `scale(${zoom / 100})` }}>
                      <div dangerouslySetInnerHTML={{ __html: generateKopSuratHTML() }} />
                      <p style={{ textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', fontSize: '14pt', textTransform: 'uppercase', margin: '0 0 4px 0' }}>{letterTitle || 'SURAT'}</p>
                      <p style={{ textAlign: 'center', margin: '0 0 16px 0' }}>Nomor: {nomorSurat}</p>
                      <div ref={editorRef} contentEditable suppressContentEditableWarning
                        className="outline-none min-h-[200mm] prose prose-sm max-w-none"
                        style={{ fontFamily: currentFont, fontSize: `${currentFontSize}pt`, lineHeight: 1.6 }}
                        onInput={recordChange}
                        onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); execCmd('insertHTML', '&emsp;&emsp;'); } }} />
                      {buildSignatureBlockCanvas()}
                      <div className="mt-6 pt-3 border-t border-gray-300">
                        <p className="text-[8px] text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{
                          __html: localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat &amp; dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia'
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* === POSISI TOP: Toolbar + Metadata inline + Canvas === */
            <div className="flex flex-col flex-1 min-h-0">
              {/* Top toolbar — sticky */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-3 py-2 shadow-sm flex flex-wrap items-center gap-0.5 mb-3 flex-shrink-0 sticky top-0 z-10">
                {/* Metadata inline */}
                <div className="flex items-center gap-2 mr-2">
                  <input type="text" value={nomorSurat} onChange={e => setNomorSurat(e.target.value)} placeholder="Nomor"
                    className="w-28 px-2 py-1 text-[11px] font-mono rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500" />
                  <input type="date" value={tanggalSurat} onChange={e => setTanggalSurat(e.target.value)}
                    className="px-2 py-1 text-[11px] rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500" />
                  <select value={sigLayout} onChange={e => setSigLayout(e.target.value as SignatureLayout)}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500">
                    {LAYOUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select value={kadesName} onChange={e => setKadesName(e.target.value)}
                    className="px-2 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500">
                    <option value="">{kadesName || 'Pilih'}</option>
                    {getOfficerOptions().map(o => <option key={o.name} value={o.name}>{o.name} ({o.role})</option>)}
                  </select>
                </div>
                <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />
                {renderToolbarButtons(true)}
                {/* Zoom inline */}
                <div className="w-px h-6 bg-gray-200 dark:bg-slate-700 mx-1" />
                <div className="flex items-center gap-0.5">
                  <button onClick={zoomOut} disabled={zoom <= ZOOM_LEVELS[0]}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ZoomOut className="w-4 h-4" /></button>
                  <button onClick={zoomFit} className="px-2 py-1 text-[11px] font-bold text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 min-w-[40px] transition-colors">{zoom}%</button>
                  <button onClick={zoomIn} disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"><ZoomIn className="w-4 h-4" /></button>
                </div>
              </div>

              {/* Signature config — only for non-default layouts */}
              {sigLayout !== 'kades_only' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 px-4 py-2 shadow-sm mb-3 flex-shrink-0 flex flex-wrap items-center gap-3">
                  {(sigLayout === 'kades_rt' || sigLayout === 'kades_rw_rt') && (
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase">RT</label>
                      <input type="text" value={rtName} onChange={e => setRtName(e.target.value)} placeholder="Ketua RT"
                        className="w-32 px-2 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                  )}
                  {(sigLayout === 'kades_rw' || sigLayout === 'kades_rw_rt') && (
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase">RW</label>
                      <input type="text" value={rwName} onChange={e => setRwName(e.target.value)} placeholder="Ketua RW"
                        className="w-32 px-2 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                  )}
                  {sigLayout === 'kades_bpd' && (
                    <div className="flex items-center gap-1.5">
                      <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase">BPD</label>
                      <input type="text" value={bpdName} onChange={e => setBpdName(e.target.value)} placeholder="Ketua BPD"
                        className="w-32 px-2 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500" />
                    </div>
                  )}
                  {sigLayout === 'custom' && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase">Jab.1</label>
                        <input type="text" value={custom1Label} onChange={e => setCustom1Label(e.target.value)} placeholder="Jabatan"
                          className="w-24 px-2 py-1 text-[11px] rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500" />
                        <input type="text" value={custom1Name} onChange={e => setCustom1Name(e.target.value)} placeholder="Nama"
                          className="w-28 px-2 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] font-extrabold text-gray-500 dark:text-slate-400 uppercase">Jab.2</label>
                        <input type="text" value={custom2Label} onChange={e => setCustom2Label(e.target.value)} placeholder="Jabatan"
                          className="w-24 px-2 py-1 text-[11px] rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500" />
                        <input type="text" value={custom2Name} onChange={e => setCustom2Name(e.target.value)} placeholder="Nama"
                          className="w-28 px-2 py-1 text-[11px] font-bold rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-500" />
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Canvas */}
              <div className="flex-1 flex justify-center bg-gray-100 dark:bg-slate-800 rounded-2xl p-6 overflow-auto min-h-0">
                <div style={{ width: `${210 * zoom / 100}mm`, height: `${297 * zoom / 100}mm`, flexShrink: 0 }}>
                  <div className="bg-white shadow-2xl" style={{ width: '210mm', height: '297mm', padding: '2cm 2.5cm', boxSizing: 'border-box', fontFamily: currentFont, fontSize: `${currentFontSize}pt`, lineHeight: 1.6, transformOrigin: 'top left', transform: `scale(${zoom / 100})` }}>
                    <div dangerouslySetInnerHTML={{ __html: generateKopSuratHTML() }} />
                    <p style={{ textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', fontSize: '14pt', textTransform: 'uppercase', margin: '0 0 4px 0' }}>{letterTitle || 'SURAT'}</p>
                    <p style={{ textAlign: 'center', margin: '0 0 16px 0' }}>Nomor: {nomorSurat}</p>
                    <div ref={editorRef} contentEditable suppressContentEditableWarning
                      className="outline-none min-h-[200mm] prose prose-sm max-w-none"
                      style={{ fontFamily: currentFont, fontSize: `${currentFontSize}pt`, lineHeight: 1.6 }}
                      onInput={recordChange}
                      onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); execCmd('insertHTML', '&emsp;&emsp;'); } }} />
                    {buildSignatureBlockCanvas()}
                    <div className="mt-6 pt-3 border-t border-gray-300">
                      <p className="text-[8px] text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{
                        __html: localStorage.getItem('global_print_footer') || 'Dokumen ini dibuat &amp; dicetak melalui <strong>Sistem DiDesa</strong><br>Solusi Administrasi Desa Modern Indonesia'
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <iframe ref={printFrameRef} className="hidden" title="Print Preview" />
    </div>
  );
}
