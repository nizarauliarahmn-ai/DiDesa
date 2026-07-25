import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface TTESignatureBoxProps {
  officerTitle: string;
  officerName: string;
  verifyUrl: string;
  nip?: string;
}

export default function TTESignatureBox({
  officerTitle,
  officerName,
  verifyUrl,
  nip
}: TTESignatureBoxProps) {
  return (
    <div className="border border-gray-900 text-black p-2.5 bg-white inline-flex items-center gap-3 text-left font-sans shadow-none rounded-none max-w-[340px]">
      <div className="shrink-0 bg-white p-0.5 border border-gray-200">
        <QRCodeSVG 
          value={verifyUrl} 
          size={72} 
          level="M"
          includeMargin={false}
        />
      </div>
      <div className="flex-1 text-[10px] leading-snug text-gray-900 font-sans">
        <p className="text-[9px] text-gray-700 font-medium">Ditandatangani secara elektronik oleh:</p>
        <p className="font-bold uppercase tracking-tight text-[10.5px] mt-0.5 leading-tight">{officerTitle}</p>
        <div className="mt-3 font-bold uppercase text-[10.5px] leading-tight border-t border-gray-200 pt-1">
          {officerName}
          {nip && <span className="block font-normal text-[9px] text-gray-600 normal-case">NIP. {nip}</span>}
        </div>
      </div>
    </div>
  );
}
