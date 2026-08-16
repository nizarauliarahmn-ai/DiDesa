import { QRCodeSVG } from 'qrcode.react';

interface TTESignatureBoxProps {
  officerTitle: string;
  officerName: string;
  verifyUrl: string;
  nip?: string;
  dateStr?: string;
}

export default function TTESignatureBox({
  officerTitle,
  officerName,
  verifyUrl,
  nip,
  dateStr
}: TTESignatureBoxProps) {
  return (
    <div
      className="border border-black text-black p-2 bg-white inline-flex items-center gap-2.5 text-left font-sans shadow-none rounded-none max-w-[340px]"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div
        className="w-20 h-20 shrink-0 border border-slate-300 p-1 bg-white print:block print:w-20 print:h-20"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <QRCodeSVG
          value={verifyUrl}
          size={70}
          level="M"
          includeMargin={false}
          fgColor="#000000"
          bgColor="#FFFFFF"
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>
      <div className="flex-1 text-[10px] leading-snug text-black font-sans">
        {dateStr && <p className="text-[9.5px] font-bold text-black mb-0.5">{dateStr}</p>}
        <p className="text-[9px] text-gray-800 font-normal">Ditandatangani secara elektronik oleh:</p>
        <p className="font-bold uppercase tracking-tight text-[10px] my-0.5 leading-tight">{officerTitle}</p>
        <p className="font-bold uppercase text-[10px] leading-tight">{officerName}</p>
        {nip && nip !== '-' && <p className="font-normal text-[8.5px] text-gray-700 mt-0.5">NIP. {nip}</p>}
      </div>
    </div>
  );
}
