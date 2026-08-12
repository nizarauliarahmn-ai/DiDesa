import React, { useState } from 'react';
import { formalAvatarUrl } from '../../utils/formalAvatar';

function getInitials(name: string): string {
  const t = (name || '').trim();
  if (!t) return 'WG';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface FormalAvatarProps {
  name: string;
  src?: string;
  alt?: string;
  backgroundColor?: string;
  className?: string;
}

export default function FormalAvatar({ name, src, backgroundColor, alt, className }: FormalAvatarProps) {
  const [failed, setFailed] = useState(false);
  const isDicebear = !!src && src.includes('dicebear.com');
  const url = (src && !isDicebear) ? src : formalAvatarUrl(name, backgroundColor);

  if (failed) {
    return (
      <div
        className={`bg-emerald-800 text-white font-bold flex items-center justify-center ${className || ''}`}
        aria-label={alt || name}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt || name}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}