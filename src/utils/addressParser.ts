export function parseAddress(fullText: string) {
  let rt = '';
  let rw = '';
  let desa = '';
  let kec = '';
  
  const rtMatch = fullText.match(/\bRT\.?\s*0*(\d{1,3})\b/i);
  if (rtMatch) rt = rtMatch[1].padStart(3, '0');

  const rwMatch = fullText.match(/\bRW\.?\s*0*(\d{1,3})\b/i);
  if (rwMatch) rw = rwMatch[1].padStart(3, '0');

  const desaMatch = fullText.match(/\b(?:Desa|Kelurahan|Kel\.)\s+([a-zA-Z0-9\s]+?)(?=\s+(?:RT|RW|Kecamatan|Kec\.|Kabupaten|Kab\.|Kota|Provinsi)|\s*$)/i);
  if (desaMatch) desa = desaMatch[1].trim();

  const kecMatch = fullText.match(/\b(?:Kecamatan|Kec\.)\s+([a-zA-Z0-9\s]+?)(?=\s+(?:RT|RW|Desa|Kelurahan|Kabupaten|Kab\.|Kota|Provinsi)|\s*$)/i);
  if (kecMatch) kec = kecMatch[1].trim();

  let cleanAddress = fullText;
  if (rtMatch || rwMatch || desaMatch || kecMatch) {
    if (rtMatch) cleanAddress = cleanAddress.replace(rtMatch[0], '');
    if (rwMatch) cleanAddress = cleanAddress.replace(rwMatch[0], '');
    if (desaMatch) cleanAddress = cleanAddress.replace(desaMatch[0], '');
    if (kecMatch) cleanAddress = cleanAddress.replace(kecMatch[0], '');
    
    cleanAddress = cleanAddress
      .replace(/,\s*,/g, ',')
      .replace(/\s+/g, ' ')
      .replace(/^[,\s]+|[,\s]+$/g, '');
  }

  return { rt, rw, desa, kec, cleanAddress, original: fullText };
}
