import { X, Download, Printer, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Image, Maximize2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: string | null;
  documentName: string;
  documentType: string;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

const PDF_JS_VERSION = '3.11.174';
const PDF_JS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.min.js`;
const PDF_JS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.js`;

let pdfLoaded = false;
let pdfLoading = false;

function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    if (pdfLoaded && window.pdfjsLib) { resolve(window.pdfjsLib); return; }
    if (pdfLoading) {
      const check = setInterval(() => {
        if (window.pdfjsLib) { clearInterval(check); resolve(window.pdfjsLib); }
      }, 100);
      return;
    }
    pdfLoading = true;
    const script = document.createElement('script');
    script.src = PDF_JS_CDN;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_JS_WORKER;
      pdfLoaded = true;
      pdfLoading = false;
      resolve(window.pdfjsLib);
    };
    script.onerror = () => { pdfLoading = false; reject(new Error('Gagal load PDF.js')); };
    document.head.appendChild(script);
  });
}

export default function DocumentViewerModal({ isOpen, onClose, documentData, documentName, documentType }: DocumentViewerModalProps) {
  const [scale, setScale] = useState(1.2);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);

  const isPDF = documentType === 'pdf' || documentName?.toLowerCase().endsWith('.pdf');
  const isImage = documentType === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(documentName || '');

  // Load all PDF pages as images
  useEffect(() => {
    if (!isOpen || !documentData || !isPDF) return;
    let cancelled = false;

    const loadAllPages = async () => {
      setIsLoading(true);
      setPageImages([]);
      try {
        const pdfjsLib = await loadPdfJs();
        const byteString = atob(documentData.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);

        const doc = await pdfjsLib.getDocument({ data: ab }).promise;
        if (cancelled) return;
        setTotalPages(doc.numPages);

        const images: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
            images.push(canvas.toDataURL('image/jpeg', 0.92));
          }
        }
        if (!cancelled) {
          setPageImages(images);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadAllPages();
    return () => { cancelled = true; };
  }, [isOpen, documentData, isPDF]);

  // Track current page on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container || pageImages.length === 0) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const scrollMid = scrollTop + containerHeight / 2;

      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const top = el.offsetTop;
        const bottom = top + el.offsetHeight;
        if (scrollMid >= top && scrollMid < bottom) {
          setCurrentPage(i + 1);
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [pageImages.length]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setPageImages([]);
      setCurrentPage(1);
      setTotalPages(0);
      setScale(1.2);
    }
  }, [isOpen]);

  const scrollToPage = (page: number) => {
    const el = pageRefs.current[page - 1];
    if (el && containerRef.current) {
      containerRef.current.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    const prev = Math.max(1, currentPage - 1);
    setCurrentPage(prev);
    scrollToPage(prev);
  };

  const handleNextPage = () => {
    const next = Math.min(totalPages, currentPage + 1);
    setCurrentPage(next);
    scrollToPage(next);
  };

  const handleZoomIn = () => setScale(s => Math.min(3, s + 0.25));
  const handleZoomOut = () => setScale(s => Math.max(0.5, s - 0.25));
  const handleFitWidth = () => setScale(1.0);

  const handlePrint = () => {
    if (!documentData) return;
    const w = window.open('', '_blank');
    if (w) {
      if (isPDF) {
        w.location.href = documentData;
      } else {
        w.document.write(`<html><head><title>${documentName}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;}img{max-width:100%;max-height:100vh;}</style></head><body><img src="${documentData}" onload="window.print();window.close();" /></body></html>`);
        w.document.close();
      }
    }
  };

  const handleDownload = () => {
    if (!documentData) return;
    const link = document.createElement('a');
    link.href = documentData;
    link.download = documentName || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 w-full max-w-5xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center shrink-0">
              {isPDF ? <FileText size={16} className="text-emerald-600" /> : <Image size={16} className="text-emerald-600" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{documentName || 'Dokumen'}</h3>
              <p className="text-[10px] text-gray-500 dark:text-slate-400">
                {isLoading ? 'Memuat...' : isPDF ? `Halaman ${currentPage} dari ${totalPages}` : 'Image'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isPDF && totalPages > 0 && (
              <>
                <button onClick={handlePrevPage} disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 min-w-[60px] text-center">{currentPage}/{totalPages}</span>
                <button onClick={handleNextPage} disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors">
                  <ChevronRight size={16} />
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />
              </>
            )}

            <button onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 transition-colors" title="Perkecil">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 transition-colors" title="Perbesar">
              <ZoomIn size={16} />
            </button>
            <button onClick={handleFitWidth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 transition-colors" title="Fit to Width">
              <Maximize2 size={16} />
            </button>

            <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />

            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-gray-600 dark:text-slate-400 hover:text-emerald-600 text-xs font-semibold transition-colors">
              <Printer size={14} /> Cetak
            </button>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors">
              <Download size={14} /> Download
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-600 transition-colors ml-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content - Continuous scroll */}
        <div ref={containerRef} className="flex-1 overflow-auto bg-gray-200 dark:bg-slate-800 p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Memuat semua halaman...</p>
            </div>
          ) : !documentData ? (
            <div className="flex flex-col items-center justify-center h-full">
              <FileText size={48} className="text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Tidak ada dokumen</p>
            </div>
          ) : isPDF ? (
            <div className="flex flex-col items-center gap-4">
              {pageImages.map((imgSrc, idx) => (
                <div
                  key={idx}
                  ref={el => { pageRefs.current[idx] = el; }}
                  className="bg-white shadow-lg rounded-lg overflow-hidden"
                  style={{ width: `${794 * scale}px` }}
                >
                  <img src={imgSrc} alt={`Halaman ${idx + 1}`} className="w-full h-auto block" />
                  <div className="text-center py-1 text-[10px] text-gray-400 bg-gray-50 border-t">{idx + 1}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="bg-white shadow-lg rounded-lg overflow-hidden" style={{ maxWidth: '100%' }}>
                <img ref={imgRef} src={documentData} alt={documentName}
                  className="max-w-full h-auto block transition-transform"
                  style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
