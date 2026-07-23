import React, { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BookOpen } from 'lucide-react';

export default function PrintQRKiosk() {
  useEffect(() => {
    // Automatically trigger print dialog when component mounts
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white w-full flex flex-col items-center justify-center p-10 text-center font-sans">
      <h2 className="text-4xl font-black text-gray-900 uppercase tracking-wider mb-4">Buku Tamu Digital</h2>
      <p className="text-xl text-gray-600 font-medium mb-12 max-w-md mx-auto">
        Scan QR Code di bawah ini menggunakan kamera HP Anda untuk mengisi daftar hadir secara mandiri.
      </p>
      
      <div className="bg-white p-12 rounded-[3rem] shadow-sm border-4 border-gray-100 mb-12 inline-block">
        <QRCodeSVG 
          value={`${window.location.origin}/?tab=buku_tamu`} 
          size={400} 
          level="H"
          includeMargin={false}
        />
      </div>
      
      <div className="mt-auto pt-10 flex items-center justify-center gap-3 text-emerald-700 font-bold text-2xl">
        <BookOpen className="w-8 h-8" />
        <p>Powered by DiDesa</p>
      </div>

      <style>{`
        @media print {
          body, html, #root {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
