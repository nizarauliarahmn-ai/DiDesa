import { X, Download, Printer, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Image } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentData: string | null;
  documentName: string;
  documentType: string;
}

export default function DocumentViewerModal({ isOpen, onClose, documentData, documentName, documentType }: DocumentViewerModalProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const isPDF = documentType === 'pdf' || documentName?.toLowerCase().endsWith('.pdf');
  const isImage = documentType === 'image' || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(documentName || '');

  // Load PDF document
  useEffect(() => {
    if (!isOpen || !documentData || !isPDF) return;

    const loadPDF = async () => {
      try {
        const data = atob(documentData.split(',')[1]);
        const uint8Array = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          uint8Array[i] = data.charCodeAt(i);
        }
        
        const doc = await pdfjsLib.getDocument({ data: uint8Array }).promise;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err) {
        console.error('Error loading PDF:', err);
      }
    };

    loadPDF();
  }, [isOpen, documentData, isPDF]);

  // Render PDF page
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const scale = (zoom / 100) * 1.5;
      const viewport = page.getViewport({ scale, rotation });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err) {
      console.error('Error rendering page:', err);
    }
  }, [pdfDoc, currentPage, zoom, rotation]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Reset when closing
  useEffect(() => {
    if (!isOpen) {
      setPdfDoc(null);
      setCurrentPage(1);
      setTotalPages(0);
      setZoom(100);
      setRotation(0);
    }
  }, [isOpen]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handleZoomIn = () => setZoom(z => Math.min(300, z + 25));
  const handleZoomOut = () => setZoom(z => Math.max(25, z - 25));
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  const handlePrint = () => {
    if (isPDF && documentData) {
      const link = document.createElement('a');
      link.href = documentData;
      link.target = '_blank';
      link.click();
    } else if (isImage && imgRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html><head><title>${documentName}</title>
          <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;}img{max-width:100%;max-height:100vh;}</style>
          </head><body><img src="${documentData}" onload="window.print();window.close();" /></body></html>
        `);
        printWindow.document.close();
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
                {isPDF ? `PDF • ${totalPages} halaman` : 'Image'}
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-1">
            {isPDF && totalPages > 0 && (
              <>
                <button onClick={handlePrevPage} disabled={currentPage <= 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 min-w-[60px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <button onClick={handleNextPage} disabled={currentPage >= totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={16} />
                </button>
                <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />
              </>
            )}
            
            <button onClick={handleZoomOut}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 transition-colors" title="Perkecil">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 w-10 text-center">{zoom}%</span>
            <button onClick={handleZoomIn}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 transition-colors" title="Perbesar">
              <ZoomIn size={16} />
            </button>
            <button onClick={handleRotate}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-700 transition-colors" title="Putar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
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

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 dark:bg-slate-800 flex items-center justify-center p-4">
          {!documentData ? (
            <div className="text-center">
              <FileText size={48} className="text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-400">Tidak ada dokumen</p>
            </div>
          ) : isPDF ? (
            <div className="bg-white rounded-lg shadow-lg overflow-auto max-w-full max-h-full">
              <canvas ref={canvasRef} className="block" />
            </div>
          ) : (
            <div className="overflow-auto max-w-full max-h-full">
              <img
                ref={imgRef}
                src={documentData}
                alt={documentName}
                className="max-w-full rounded-lg shadow-lg transition-transform"
                style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
