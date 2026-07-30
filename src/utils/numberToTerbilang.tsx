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

export function RupiahInput({ value, onChange, placeholder }: RupiahInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<number | null>(null);

  // Extract digits and display only formatted numbers inside the input element
  const cleanDigits = (value || '').replace(/\D/g, '');
  const displayValue = cleanDigits ? new Intl.NumberFormat('id-ID').format(Number(cleanDigits)) : '';

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const newRawVal = inputEl.value; // The string AFTER the browser processed the keystroke
    const newCursor = inputEl.selectionStart || 0;
    const oldVal = displayValue;
    
    // We get old cursor from our selectionRef if available, otherwise from the input
    const oldCursor = selectionRef.current !== null ? selectionRef.current : oldVal.length;

    // 1. Digits before the new cursor in the newly emitted string
    let digitsBeforeCursor = newRawVal.slice(0, newCursor).replace(/\D/g, '').length;

    const oldDigitsBeforeCursor = oldVal.slice(0, oldCursor).replace(/\D/g, '').length;
    const oldCleanLength = oldVal.replace(/\D/g, '').length;
    const newCleanLength = newRawVal.replace(/\D/g, '').length;
    
    const cleanLengthUnchanged = oldCleanLength === newCleanLength;
    const lengthDecreased = newRawVal.length < oldVal.length;

    let cleanDigitsStr = newRawVal.replace(/\D/g, '');

    // 2. Detect Backspace on a dot
    // If length decreased but digit count stayed the same, and cursor moved left (newCursor < oldCursor)
    if (lengthDecreased && cleanLengthUnchanged && newCursor < oldCursor && digitsBeforeCursor === oldDigitsBeforeCursor) {
      if (digitsBeforeCursor > 0) {
        const arr = cleanDigitsStr.split('');
        arr.splice(digitsBeforeCursor - 1, 1);
        cleanDigitsStr = arr.join('');
        digitsBeforeCursor -= 1;
      }
    }

    // 3. Detect Delete on a dot
    // If length decreased, digit count same, but cursor stayed in exactly the same position!
    if (lengthDecreased && cleanLengthUnchanged && newCursor === oldCursor) {
      if (digitsBeforeCursor < cleanDigitsStr.length) {
        const arr = cleanDigitsStr.split('');
        arr.splice(digitsBeforeCursor, 1);
        cleanDigitsStr = arr.join('');
      }
    }

    // 4. Format the final string
    let newDisplay = '';
    let fullFormatted = '';

    if (cleanDigitsStr) {
      const num = Number(cleanDigitsStr);
      newDisplay = new Intl.NumberFormat('id-ID').format(num);
      fullFormatted = `Rp. ${newDisplay},-`;
    }

    // 5. Calculate new cursor position in the formatted string
    let nextCursorPos = 0;
    if (newDisplay) {
      let digitCounter = 0;
      for (let i = 0; i < newDisplay.length; i++) {
        if (/\d/.test(newDisplay[i])) {
          digitCounter++;
          if (digitCounter === digitsBeforeCursor) {
            nextCursorPos = i + 1;
            break;
          }
        }
      }
    }

    selectionRef.current = nextCursorPos;
    onChange(fullFormatted);
  };

  useLayoutEffect(() => {
    if (inputRef.current && selectionRef.current !== null) {
      const pos = selectionRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      // Don't reset selectionRef to null yet! Let it persist until the next handleInput runs so we can track oldCursor properly.
    }
  });

  return (
    <div className="flex items-center w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus-within:ring-2 focus-within:ring-emerald-500">
      <span className="text-slate-700 dark:text-slate-300 font-bold select-none mr-1.5 shrink-0">Rp.</span>
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInput}
        placeholder={placeholder ? placeholder.replace(/^Rp\.\s*/i, '').replace(/,-$/i, '') : '5.000.000'}
        className="w-full text-slate-800 dark:text-slate-100 font-bold tracking-wide"
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          padding: 0
        }}
      />
      {displayValue ? (
        <span className="text-slate-700 dark:text-slate-300 font-bold select-none ml-0.5 shrink-0">,-</span>
      ) : null}
    </div>
  );
}
