import { QRCodeSVG } from 'qrcode.react';
import { resolveSignatureRoleText } from '../../../utils/signature';

interface SharedSignatureBlockProps {
  officerTitle: string;
  officerName: string;
  verifyUrl: string;
  nip?: string;
  placeName?: string;
  dateStr?: string;
}

export default function SharedSignatureBlock({
  officerTitle,
  officerName,
  verifyUrl,
  nip,
  placeName,
  dateStr,
}: SharedSignatureBlockProps) {
  const locationStr = [placeName, dateStr].filter(Boolean).join(', ');

  // Konsisten dengan SKTM: bila penandatangan bukan Kepala Desa, tampilkan
  // "a.n. Kepala Desa, {Peran}" (mis. Sekretaris Desa). Input yang sudah
  // berformat "a.n. ..." dibiarkan apa adanya (dipakai Dashboard surat).
  const rawTitle = (officerTitle || '').trim();
  const resolvedTitle = /^a\.n\./i.test(rawTitle) || /^mengetahui/i.test(rawTitle)
    ? officerTitle
    : resolveSignatureRoleText(officerName, officerTitle);

  return (
    <div
      className="border border-black text-black bg-white inline-flex items-center gap-2.5 text-left font-sans shadow-none rounded-none max-w-[340px] py-1.5 px-2.5"
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      <div
        className="shrink-0 bg-white print:block"
        style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <QRCodeSVG
          value={verifyUrl}
          size={64}
          level="M"
          includeMargin={false}
          fgColor="#000000"
          bgColor="#FFFFFF"
          style={{ display: 'block', width: '64px', height: '64px' }}
        />
      </div>
      <div className="flex-1 text-[10px] leading-snug text-black font-sans">
        {locationStr && <p className="text-[9.5px] font-bold text-black mb-0.5">{locationStr}</p>}
        <p className="text-[9px] text-gray-800 font-normal">Ditandatangani secara elektronik oleh:</p>
        <p className="font-bold uppercase tracking-tight text-[10px] my-0.5 leading-tight">{resolvedTitle}</p>
        <p className="font-bold uppercase text-[10px] leading-tight">{officerName}</p>
        {nip && nip !== '-' && <p className="font-normal text-[8.5px] text-gray-700 mt-0.5">NIP. {nip}</p>}
      </div>
    </div>
  );
}