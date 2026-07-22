/**
 * Helper utility for smart text formatting & address parsing in DiDesa
 */

/**
 * Capitalizes the first letter of each word in a string (Title Case)
 * Handles words separated by spaces, hyphens, and slashes.
 */
export function capitalizeWords(str: string): string {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export interface ParsedAddress {
  address: string;
  rt: string;
  rw: string;
}

/**
 * Smart Address Parser:
 * Automatically extracts RT and RW from a pasted full address string,
 * and returns the cleaned street address alongside auto-extracted RT & RW values.
 */
export function parseAddressString(input: string, currentRt = '', currentRw = ''): ParsedAddress {
  if (!input) return { address: '', rt: currentRt, rw: currentRw };

  let extractedRt = currentRt;
  let extractedRw = currentRw;
  let cleanAddress = input;

  // Match RT pattern (e.g. RT 02, RT.002, Rt. 3, RT/002)
  const rtMatch = input.match(/\bRT[\.\s/:]*([0-9]{1,3})\b/i);
  if (rtMatch) {
    extractedRt = rtMatch[1].padStart(3, '0');
    cleanAddress = cleanAddress.replace(rtMatch[0], '');
  }

  // Match RW pattern (e.g. RW 01, RW.001, Rw. 2, RW/001)
  const rwMatch = input.match(/\bRW[\.\s/:]*([0-9]{1,3})\b/i);
  if (rwMatch) {
    extractedRw = rwMatch[1].padStart(3, '0');
    cleanAddress = cleanAddress.replace(rwMatch[0], '');
  }

  // Clean up residual trailing/leading commas, dashes, or duplicate spaces
  cleanAddress = cleanAddress
    .replace(/,\s*,/g, ',')
    .replace(/^[,\s-]+|[,\s-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Apply Title Case to clean address
  cleanAddress = capitalizeWords(cleanAddress);

  return {
    address: cleanAddress,
    rt: extractedRt,
    rw: extractedRw
  };
}
