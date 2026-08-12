import React, { useState } from 'react';

// Kandidat nama perempuan Indonesia (beragam penulisan).
const FEMALE_MARKERS = [
  'siti', 'aisha', 'aisyah', 'annisa', 'anisa', 'anita', 'aminah', 'amalia',
  'dewi', 'fatimah', 'fitri', 'indah', 'intan', 'kartini', 'laila', 'lia',
  'lisa', 'maya', 'mini', 'miniyartie', 'nadia', 'nur', 'nurul', 'ratna',
  'rina', 'rini', 'salsa', 'sari', 'sri', 'wahyuni', 'wulan', 'yuni', 'zahra',
  'ayunda', 'citra', 'erna', 'astuti', 'hafizah', 'ulfa', 'juliana', 'kumala',
  'lestari', 'melati', 'putri', 'septi', 'tiara', 'wati', 'winda', 'yanti',
  'yuliana', 'listianawati',
];

// Nama laki-laki yang berakhiran vokal "a" agar tidak salah deteksi.
const MALE_EXCEPTIONS = [
  'yuda', 'dewa', 'putra', 'bagas', 'ardi', 'hendri', 'budi', 'dedi', 'edi',
  'eko', 'bayu', 'rizky', 'rizki', 'indra', 'guntur', 'bambang', 'sutrisno',
  'joko', 'slamet', 'fajar', 'galih', 'khoirul', 'adit', 'agung', 'arif',
  'didi', 'feri', 'gunawan', 'heri', 'hadi', 'jaya', 'made', 'nanda',
  'prakoso', 'santoso', 'setiawan', 'wira',
];

function isFemaleName(name: string): boolean {
  const n = (name || '').trim().toLowerCase().replace(/[^a-z ]+/g, ' ');
  const tokens = n.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (FEMALE_MARKERS.includes(t)) return true;
    if (FEMALE_MARKERS.some((m) => m.length >= 4 && t.startsWith(m))) return true;
  }
  const last = tokens[tokens.length - 1] || '';
  if (!last || MALE_EXCEPTIONS.includes(last)) return false;
  return last.endsWith('a') || (last.endsWith('ie') && last.length > 4);
}

const PALETTE = {
  teal: '#14B8A6',
  gray: '#9CA3AF',
  skin: '#F3C7A0',
  smile: '#8A5A33',
  hair: '#33241B',
  maleShirt: '#3B82F6',
  maleShirtLight: '#DBEAFE',
  hijab: '#F472B6',
  femaleShirt: '#EC4899',
};

function FacelessAvatar({ female, backgroundColor, className }: { female: boolean; backgroundColor: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" role="img" aria-hidden="true" focusable="false" className={className}>
      <circle cx="100" cy="100" r="100" fill={backgroundColor} />
      <g transform="translate(100 104)">
        {female ? (
          <>
            {/* hijab menutupi kepala */}
            <circle cx="0" cy="-30" r="48" fill={PALETTE.hijab} />
            {/* wajah tanpa detail, cukup garis senyum */}
            <circle cx="0" cy="-18" r="34" fill={PALETTE.skin} />
            <path d="M -10 4 Q 0 12 10 4" fill="none" stroke={PALETTE.smile} strokeWidth="3.5" strokeLinecap="round" />
            {/* kerudung menutupi bahu */}
            <path d="M -46 -2 Q -34 26 0 28 Q 34 26 46 -2 L 48 6 Q 30 40 0 42 Q -30 40 -48 6 Z" fill={PALETTE.hijab} />
            {/* atasan pink */}
            <path d="M -92 92 C -92 30 -44 4 0 4 C 44 4 92 30 92 92 Z" fill={PALETTE.femaleShirt} />
          </>
        ) : (
          <>
            {/* rambut rapi */}
            <circle cx="0" cy="-40" r="44" fill={PALETTE.hair} />
            {/* wajah tanpa detail, cukup garis senyum */}
            <circle cx="0" cy="-26" r="44" fill={PALETTE.skin} />
            <path d="M -11 2 Q 0 10 11 2" fill="none" stroke={PALETTE.smile} strokeWidth="3.5" strokeLinecap="round" />
            {/* atasan biru */}
            <path d="M -92 92 C -92 30 -42 0 0 0 C 42 0 92 30 92 92 Z" fill={PALETTE.maleShirt} />
            {/* kerah putih */}
            <path d="M -16 -2 Q 0 10 16 -2 L 14 -8 Q 0 4 -14 -8 Z" fill={PALETTE.maleShirtLight} />
          </>
        )}
      </g>
    </svg>
  );
}

interface AvatarProps {
  name?: string;
  gender?: 'male' | 'female';
  src?: string;
  alt?: string;
  backgroundColor?: 'teal' | 'gray' | string;
  className?: string;
}

export default function Avatar({ name, gender, src, alt, backgroundColor = 'teal', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const isDicebear = !!src && src.includes('dicebear.com');
  const showPhoto = !!src && !isDicebear && !failed;
  const female = gender ? gender === 'female' : isFemaleName(name || '');
  const bg = backgroundColor === 'teal' ? PALETTE.teal : backgroundColor === 'gray' ? PALETTE.gray : backgroundColor || PALETTE.teal;

  if (showPhoto) {
    return <img src={src} alt={alt || name} onError={() => setFailed(true)} className={className} />;
  }

  return (
    <FacelessAvatar
      female={female}
      backgroundColor={bg}
      className={className}
    />
  );
}