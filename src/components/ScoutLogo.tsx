import { Trophy } from 'lucide-react';

interface Props {
  /** Square size in px. */
  size?: number;
  /** Add an outer gold-glow ring. */
  glow?: boolean;
  /** Optional extra class names for the outer wrapper. */
  className?: string;
  alt?: string;
}

// World Cup themed circular badge: gold trophy inside a deep-royal disc,
// finished with a gold ring (and optional glow for hero placements).
export function ScoutLogo({ size = 120, glow = false, className = '', alt }: Props) {
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt}
      className={`inline-grid place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 30% 25%, #4a1e96 0%, #1c0743 70%)',
        boxShadow: glow
          ? '0 0 0 4px rgba(252,192,40,0.35), 0 0 40px rgba(252,192,40,0.35), 0 12px 28px -8px rgba(0,0,0,0.55)'
          : '0 8px 22px -8px rgba(0,0,0,0.45)',
        border: '2px solid rgba(252, 192, 40, 0.75)',
      }}
    >
      <Trophy
        style={{
          width: Math.round(size * 0.55),
          height: Math.round(size * 0.55),
          color: '#fdd34c',
          filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.45))',
        }}
        strokeWidth={2.25}
      />
    </span>
  );
}
