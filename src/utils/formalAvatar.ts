// Helper avatar ilustrasi gaya formal & profesional.
// Memakai Dicebear Avataaars (v9) alih-alih gaya kasual (micah/notionists):
// - Warna rambut pakai kode hex natural (hitam, coklat, coklat tua, abu-abu).
//   Catatan: API Dicebear v9 tidak menerima nama warna (mis. "black"), hanya kode hex/[transparent].
// - Potongan rambut pendek & rapi (hanya nilai `top` yang terverifikasi valid di API v9).
// - Pakaian formal berkerah (blazer + kemeja / kemeja / collar + sweater) warna netral.
// - Ekspresi wajah profesional (tersenyum natural).

const HAIR_COLORS = ['2B2B2B', '6B4423', '3E2C20', '9CA3AF'];
const NEAT_SHORT_HAIR = ['shortFlat', 'shortRound', 'shortCurly', 'shortWaved'];
const FORMAL_CLOTHING_TYPES = ['blazerAndShirt', 'blazerAndSweater', 'collarAndSweater'];
const NEUTRAL_CLOTHING_COLORS = ['2C3E50', '34495E', '4A5568', '5D6D7E', '1F2937', '374151', '3B4252', '7F8C8D'];
const PROFESSIONAL_MOUTHS = ['default', 'smile'];

function seedHash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(arr: T[], hash: number, salt: number): T {
  return arr[(hash + salt) % arr.length];
}

export function formalAvatarUrl(seed: string, backgroundColor?: string): string {
  const s = seed || 'Warga';
  const h = seedHash(s);

  const params: Array<[string, string]> = [
    ['seed', s],
    ['top', pick(NEAT_SHORT_HAIR, h, 1)],
    ['hairColor', pick(HAIR_COLORS, h, 2)],
    ['facialHairType', 'blank'],
    ['facialHairColor', pick(HAIR_COLORS, h, 2)],
    ['clothingType', pick(FORMAL_CLOTHING_TYPES, h, 3)],
    ['clothingColor', pick(NEUTRAL_CLOTHING_COLORS, h, 4)],
    ['mouthType', pick(PROFESSIONAL_MOUTHS, h, 5)],
  ];

  if (backgroundColor) params.push(['backgroundColor', backgroundColor]);

  const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `https://api.dicebear.com/9.x/avataaars/svg?${qs}`;
}