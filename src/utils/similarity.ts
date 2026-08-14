// ── Similarity detection helpers (Usulan Desa) ──
// Token-overlap / string-similarity untuk mendeteksi usulan yang berpotensi ganda.
// Ambang batas dikalibrasi agar contoh: "Perbaikan Jalan Pelipisan" vs "Pengaspalan Jalan Pelipisan" (> 70%) terdeteksi.

export const SIMILARITY_THRESHOLD = 0.65;

const STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'sebuah', 'para', 'atau',
  'agar', 'serta', 'ini', 'itu', 'akan', 'telah', 'sudah', 'dengan', 'adalah',
  'menjadi', 'melalui', 'sangat', 'lebih', 'sebagai', 'karena', 'warga', 'desa',
]);

export const normalizeText = (s: string): string =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const tokenize = (s: string): string[] =>
  normalizeText(s)
    .split(' ')
    .filter(w => w.length > 2 && !STOPWORDS.has(w));

export const tokenOverlapSimilarity = (a: string, b: string): number => {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (!ta.length || !tb.length) return 0;
  const setA = new Set(ta);
  const setB = new Set(tb);
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection += 1;
  }
  return (2 * intersection) / (setA.size + setB.size);
};

export const isSimilarUsulan = (a: string, b: string): boolean =>
  tokenOverlapSimilarity(a, b) >= SIMILARITY_THRESHOLD;

export const findSimilarUsulan = <T extends { uraian_usulan: string }>(
  items: T[],
  target: T
): T[] =>
  items.filter(u => u.uraian_usulan !== target.uraian_usulan && isSimilarUsulan(target.uraian_usulan, u.uraian_usulan));
