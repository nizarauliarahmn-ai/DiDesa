import { useState } from 'react';

export function useBackdateNumber(
  _tanggalSurat?: string,
  _klasifikasi?: string,
  _kodeKlasifikasi?: string
) {
  const [isBackdate, setIsBackdate] = useState(false);

  return {
    isBackdate,
    setIsBackdate,
    customNomorSurat: undefined as string | undefined,
    customNumber: undefined as string | undefined,
    isLoading: false,
  };
}
