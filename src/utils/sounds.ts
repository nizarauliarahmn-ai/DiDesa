// Utilitas suara ringan berbasis WebAudio (tanpa file aset eksternal)
// Digunakan untuk notifikasi pairing KTP Scanner Realtime.

let audioCtx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
};

const tone = (freq: number, durationMs: number, type: OscillatorType = 'sine', volume = 0.12, delayMs = 0) => {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + delayMs / 1000;
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + durationMs / 1000 + 0.05);
  } catch (e) {
    // abaikan error audio
  }
};

/** Bunyi lembut saat tablet menerima permintaan scan dari PC Admin. */
export const playKtpRequestBeep = () => {
  tone(880, 220, 'sine', 0.1);
};

/** Bunyi sukses saat PC Admin menerima hasil scan dari tablet. */
export const playKtpSuccessChime = () => {
  tone(660, 150, 'sine', 0.12);
  tone(880, 180, 'sine', 0.12, 140);
  tone(1320, 220, 'sine', 0.12, 300);
};
