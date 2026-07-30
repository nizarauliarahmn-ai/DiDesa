export function terbilang(n: number): string {
  if (isNaN(n) || n < 0) return '';
  if (n === 0) return 'Nol';

  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  if (n < 12) return satuan[n];
  if (n < 20) return terbilang(n - 10) + ' Belas';
  if (n < 100) return terbilang(Math.floor(n / 10)) + ' Puluh' + (n % 10 !== 0 ? ' ' + terbilang(n % 10) : '');
  if (n < 200) return 'Seratus' + (n - 100 !== 0 ? ' ' + terbilang(n - 100) : '');
  if (n < 1000) return terbilang(Math.floor(n / 100)) + ' Ratus' + (n % 100 !== 0 ? ' ' + terbilang(n % 100) : '');
  if (n < 2000) return 'Seribu' + (n - 1000 !== 0 ? ' ' + terbilang(n - 1000) : '');
  if (n < 1000000) return terbilang(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 !== 0 ? ' ' + terbilang(n % 1000) : '');
  if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 !== 0 ? ' ' + terbilang(n % 1000000) : '');
  if (n < 1000000000000) return terbilang(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 !== 0 ? ' ' + terbilang(n % 1000000000) : '');
  return terbilang(Math.floor(n / 1000000000000)) + ' Triliun' + (n % 1000000000000 !== 0 ? ' ' + terbilang(n % 1000000000000) : '');
}

export function formatRupiahInput(val: string): string {
  const cleanDigits = (val || '').replace(/\D/g, '');
  if (!cleanDigits) return '';
  const num = Number(cleanDigits);
  const formattedNum = new Intl.NumberFormat('id-ID').format(num);
  return `Rp. ${formattedNum},-`;
}

export function formatRupiahWithTerbilang(val: string): string {
  const cleanDigits = (val || '').replace(/\D/g, '');
  if (!cleanDigits) return val || '';
  const num = Number(cleanDigits);
  const formattedNum = new Intl.NumberFormat('id-ID').format(num);
  const kata = terbilang(num);
  return `Rp. ${formattedNum},- (${kata} Rupiah)`;
}

export function handleRupiahInputChange(
  e: React.ChangeEvent<HTMLInputElement>,
  currentValue: string,
  onUpdate: (formattedValue: string) => void
) {
  const inputEl = e.target;
  const rawInput = inputEl.value;
  const oldVal = currentValue || '';
  const oldCursorPos = inputEl.selectionStart || oldVal.length;

  // Count how many digits were before the cursor in the old value
  const digitsBeforeCursor = oldVal.slice(0, oldCursorPos).replace(/\D/g, '').length;
  
  // Count delta in total digits
  const oldTotalDigits = oldVal.replace(/\D/g, '').length;
  const newTotalDigits = rawInput.replace(/\D/g, '').length;
  const deltaDigits = newTotalDigits - oldTotalDigits;

  const targetDigitCount = Math.max(0, digitsBeforeCursor + deltaDigits);
  const formatted = formatRupiahInput(rawInput);

  onUpdate(formatted);

  // Restore cursor position preserving digit placement
  requestAnimationFrame(() => {
    if (!inputEl) return;
    if (!formatted) {
      inputEl.setSelectionRange(0, 0);
      return;
    }

    if (targetDigitCount === 0) {
      const prefixIdx = formatted.indexOf('Rp. ');
      const pos = prefixIdx !== -1 ? prefixIdx + 4 : 0;
      inputEl.setSelectionRange(pos, pos);
      return;
    }

    let digitCounter = 0;
    let newPos = formatted.length;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        digitCounter++;
        if (digitCounter === targetDigitCount) {
          newPos = i + 1;
          break;
        }
      }
    }

    // Don't place cursor inside or past ",-" suffix if possible
    const suffixIdx = formatted.indexOf(',-');
    if (suffixIdx !== -1 && newPos > suffixIdx) {
      newPos = suffixIdx;
    }

    inputEl.setSelectionRange(newPos, newPos);
  });
}
