import Image from 'next/image';

interface Props {
  /** Square size in px. */
  size?: number;
  /** Add an outer gold-glow ring. */
  glow?: boolean;
  /** Optional extra class names for the outer wrapper. */
  className?: string;
  alt?: string;
}

// Cream/white circular badge holding the original purple Saint Joseph emblem.
// Keeps the logo unmodified — no inversion, no recolouring.
export function ScoutLogo({ size = 120, glow = false, className = '', alt = '' }: Props) {
  const inner = Math.round(size * 0.84);
  return (
    <span
      className={`inline-grid place-items-center rounded-full bg-cream ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: glow
          ? '0 0 0 4px rgba(252,192,40,0.35), 0 0 40px rgba(252,192,40,0.35), 0 12px 28px -8px rgba(0,0,0,0.55)'
          : '0 8px 22px -8px rgba(0,0,0,0.45)',
        border: '1px solid rgba(252, 192, 40, 0.55)',
      }}
    >
      <Image
        src="/scout-logo.png"
        alt={alt}
        width={inner}
        height={inner}
        priority
        className="object-contain"
      />
    </span>
  );
}
