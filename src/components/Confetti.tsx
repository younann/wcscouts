// Pure-CSS confetti rain — no JS, no images. Renders gold/violet pieces
// at random columns with staggered delays.

const COLORS = ['#fcc028', '#fdd34c', '#a36f00', '#d8bdff', '#7c4dd1', '#ffffff'];
const PIECES = 24;

export function Confetti({ className = '' }: { className?: string }) {
  const pieces = Array.from({ length: PIECES }, (_, i) => {
    const left = ((i * 37) % 100) + (i % 3) * 1.7;
    const delay = (i % 7) * 0.9;
    const dur = 6 + (i % 5);
    const color = COLORS[i % COLORS.length];
    const w = (i % 2 === 0 ? 6 : 8) + (i % 3);
    const h = w + 6;
    const tilt = (i * 31) % 60 - 30;
    return (
      <span
        key={i}
        className="confetti-piece"
        style={{
          left: `${left}%`,
          width: `${w}px`,
          height: `${h}px`,
          background: color,
          animationDelay: `${delay}s`,
          animationDuration: `${dur}s`,
          transform: `rotate(${tilt}deg)`,
        }}
      />
    );
  });
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {pieces}
    </div>
  );
}
