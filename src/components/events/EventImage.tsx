import { useState } from 'react';
import styles from './EventImage.module.css';

// Zone colors per artwork variant (front -> back), so cards without a photo still differ from each other
const VARIANTS = [
  ['#B8893B', '#3E7BE0', '#7D68D8'],
  ['#B8893B', '#2B8A84', '#3E7BE0'],
  ['#D6B36C', '#7D68D8', '#5B7C99'],
  ['#B8893B', '#3E9BE0', '#2B8A84'],
];

// The event image from the server (Cloudinary). Without an image – or if it fails to load –
// a SeatWise hall artwork is shown instead, so a card never shows a broken image.
export function EventImage({
  src,
  alt,
  seed,
  className,
  eager,
}: {
  src: string | null | undefined;
  alt: string;
  seed: number;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;
  const variant = Math.abs(seed) % VARIANTS.length;

  return (
    <div className={`${styles.frame} ${className ?? ''}`}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          className={styles.img}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className={`${styles.fallback} ${styles[`v${variant}`]}`} role="img" aria-label={alt}>
          <HallArtwork colors={VARIANTS[variant]} seed={seed} />
        </div>
      )}
    </div>
  );
}

function HallArtwork({ colors, seed }: { colors: string[]; seed: number }) {
  const seats: JSX.Element[] = [];
  const cx = 200;
  const cy = -40;
  for (let row = 0; row < 7; row++) {
    const r = 140 + row * 22;
    const count = 14 + row * 2;
    const color = colors[Math.min(2, Math.floor(row / 2.5))];
    for (let i = 0; i < count; i++) {
      const a = 0.95 - (1.9 * (i + 0.5)) / count;
      const x = cx + r * Math.sin(a);
      const y = cy + r * Math.cos(a);
      const taken = (row * 5 + i * 7 + seed) % 4 === 0;
      seats.push(
        <rect
          key={`${row}-${i}`}
          x={x - 5.5}
          y={y - 4.5}
          width="11"
          height="9"
          rx="2.4"
          transform={`rotate(${((-a * 180) / Math.PI).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`}
          fill={taken ? 'rgba(247,243,234,0.12)' : color}
          opacity={taken ? 1 : 0.85}
        />,
      );
    }
  }
  return (
    <svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <path d="M 120 30 A 92 92 0 0 0 280 30 L 262 2 A 64 64 0 0 1 138 2 Z" fill="rgba(0,0,0,0.25)" />
      <path d="M 120 30 A 92 92 0 0 0 280 30" fill="none" stroke="#D6B36C" strokeWidth="2.5" strokeLinecap="round" />
      {seats}
    </svg>
  );
}
