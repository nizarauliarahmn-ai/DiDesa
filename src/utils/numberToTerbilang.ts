import React, { useRef, useLayoutEffect } from 'react';

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

export interface RupiahInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function RupiahInput({ value, onChange, placeholder, className }: RupiahInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<number | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const rawVal = inputEl.value;
    const oldVal = value || '';
    const oldCursor = inputEl.selectionStart || oldVal.length;

    // Digits before old cursor position
    const digitsBeforeCursor = oldVal.slice(0, oldCursor).replace(/\D/g, '').length;
    const oldTotalDigits = oldVal.replace(/\D/g, '').length;
    const newTotalDigits = rawVal.replace(/\D/g, '').length;
    const delta = newTotalDigits - oldTotalDigits;

    const targetDigitCount = Math.max(0, digitsBeforeCursor + delta);

    // Compute new formatted string
    const cleanDigits = rawVal.replace(/\D/g, '');
    let formatted = '';
    if (cleanDigits) {
      const num = Number(cleanDigits);
      const formattedNum = new Intl.NumberFormat('id-ID').format(num);
      formatted = `Rp. ${formattedNum},-`;
    }

    // Compute target cursor position in the NEW formatted string
    let newPos = formatted.length;
    if (!formatted) {
      newPos = 0;
    } else if (targetDigitCount === 0) {
      const prefixIdx = formatted.indexOf('Rp. ');
      newPos = prefixIdx !== -1 ? prefixIdx + 4 : 0;
    } else {
      let digitCounter = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
          digitCounter++;
          if (digitCounter === targetDigitCount) {
            newPos = i + 1;
            break;
          }
        }
      }
    }

    selectionRef.current = newPos;
    onChange(formatted);
  };

  useLayoutEffect(() => {
    if (inputRef.current && selectionRef.current !== null) {
      const pos = selectionRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      selectionRef.current = null;
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleInput}
      placeholder={placeholder}
      className={className}
    />
  );
}
