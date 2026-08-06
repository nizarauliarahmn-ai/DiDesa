import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { resolveCurrentTenant } from '../utils/tenantResolver';
import { generateLetterNumber } from '../utils/letterClassifications';

export function useBackdateNumber(
  tanggalSurat: string,
  klasifikasi: string,
  kodeKlasifikasi: string
) {
  const [customNumber, setCustomNumber] = useState<string | undefined>(undefined);
  const [customNomorSurat, setCustomNomorSurat] = useState<string>('');
  const [isBackdate, setIsBackdate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function calculateBackdate() {
      if (!tanggalSurat) {
        setIsBackdate(false);
        setCustomNumber(undefined);
        setCustomNomorSurat('');
        return;
      }

      const selectedDate = new Date(tanggalSurat);
      selectedDate.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Jika tanggal hari ini atau masa depan, bukan backdate
      if (selectedDate >= today) {
        setIsBackdate(false);
        setCustomNumber(undefined);
        setCustomNomorSurat('');
        return;
      }

      setIsBackdate(true);
      setIsLoading(true);

      try {
        const tenantId = await resolveCurrentTenant();
        if (!tenantId) throw new Error("No tenant");

        // 1. Cari nomor urut induk terakhir sebelum atau pada tanggal yang dipilih
        // End of selected day
        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const { data: pastLetters, error: err1 } = await supabase
          .from('surat')
          .select('nomor, created_at')
          .eq('tenant_id', tenantId)
          .lte('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: false })
          .limit(10); // Ambil beberapa surat terakhir untuk mencari pola angka

        let baseSequence = 0;
        
        if (pastLetters && pastLetters.length > 0) {
          // Cari angka urut dari surat-surat sebelumnya
          for (const letter of pastLetters) {
            if (!letter.nomor) continue;
            // Biasanya nomor urut ada di segmen ke-2 (misal: 400/055/WHi-SKTM/2026)
            // Cari pola angka 3 digit berturut-turut (kemungkinan ada .1 .2 dsb)
            const match = letter.nomor.match(/(?:\/|-|^)0*(\d+)(?:\.\d+)?(?:\/|-|$)/);
            if (match && match[1]) {
              const num = parseInt(match[1], 10);
              // Angka wajar untuk sequence
              if (num > 0 && num < 10000) {
                baseSequence = num;
                break;
              }
            }
          }
        }
        
        if (baseSequence === 0) {
          baseSequence = 1; // Fallback jika belum pernah ada surat sama sekali
        }

        // 2. Cari semua surat backdate di tanggal yang sama dengan induk yang sama
        // Start of selected day
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const { data: sameDayLetters } = await supabase
          .from('surat')
          .select('nomor')
          .eq('tenant_id', tenantId)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());

        let maxSubNumber = 0;
        
        if (sameDayLetters && sameDayLetters.length > 0) {
          for (const letter of sameDayLetters) {
             if (!letter.nomor) continue;
             
             // Cari pola [baseSequence].[subNumber]
             // Contoh: /055.2/ atau -55.2-
             const subMatch = letter.nomor.match(new RegExp(`(?:\\/|-|^)0*${baseSequence}\\.(\\d+)(?:\\/|-|$)`));
             if (subMatch && subMatch[1]) {
               const subNum = parseInt(subMatch[1], 10);
               if (subNum > maxSubNumber) {
                 maxSubNumber = subNum;
               }
             }
          }
        }

        // 3. Susun nomor akhir (misal 055.1)
        const finalCustomSequence = `${String(baseSequence).padStart(3, '0')}.${maxSubNumber + 1}`;
        setCustomNumber(finalCustomSequence);
        
        // 4. Generate pratinjau nomor surat lengkap
        const fullFormat = generateLetterNumber(klasifikasi, kodeKlasifikasi, finalCustomSequence, selectedDate);
        setCustomNomorSurat(fullFormat);

      } catch (error) {
        console.error("Gagal menghitung nomor backdate:", error);
      } finally {
        setIsLoading(false);
      }
    }

    calculateBackdate();
  }, [tanggalSurat, klasifikasi, kodeKlasifikasi]);

  return { customNumber, customNomorSurat, isBackdate, isLoading };
}
