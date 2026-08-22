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

  // Keep original address intact - DON'T clean/remove components
  return { rt, rw, desa, kec, cleanAddress: fullText, original: fullText };
}
