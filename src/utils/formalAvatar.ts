// Helper avatar ilustrasi gaya formal, seragam, & profesional.
// Memakai Dicebear Avataaars (v9):
// - Latar belakang: lingkaran solid pirus/teal (senada tema utama aplikasi).
// - Rambut: warna natural (hitam / coklat tua) dengan potongan rapi & tertata, tanpa warna terang/neon.
// - Pakaian: berkerah navy gelap profesional (blazer + kemeja putih) sehingga detail kerah putih tampak di dalam.
// - Ekspresi: senyum ramah yang tenang & berwibawa.
// Catatan API v9: hairColor/clothingColor wajib kode hex atau "transparent", bukan nama warna.

const DEFAULT_BACKGROUND = '14B8A6'; // pirus/teal
const HAIR_COLORS = ['1C1917', '26201C', '2E2723', '3B2F23']; // hitam & coklat tua natural
const NEAT_SHORT_HAIR = ['shortFlat', 'shortRound', 'shortCurly', 'shortWaved']; // terverifikasi valid di API v9
const NAVY_CLOTHING_COLORS = ['1E3A8A', '172554', '1E3A5F', '16324F', '0B2447'];
const PROFESSIONAL_MOUTHS = ['smile'];

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
    ['clothingType', 'blazerAndShirt'],
    ['clothingColor', pick(NAVY_CLOTHING_COLORS, h, 3)],
    ['mouthType', 'smile'],
    ['backgroundColor', backgroundColor || DEFAULT_BACKGROUND],
  ];

  const qs = params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return `https://api.dicebear.com/9.x/avataaars/svg?${qs}`;
}