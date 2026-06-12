interface Props {
  className?: string;
}

// Stylised FIFA-style trophy. Pure SVG so it renders crisp at any size
// and tints with the gold gradient theme.
export function WorldCupTrophy({ className }: Props) {
  return (
    <svg
      viewBox="0 0 200 320"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="goldA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff4cf" />
          <stop offset="35%" stopColor="#fcc028" />
          <stop offset="70%" stopColor="#f5b50a" />
          <stop offset="100%" stopColor="#a36f00" />
        </linearGradient>
        <linearGradient id="goldB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fcc028" />
          <stop offset="100%" stopColor="#a36f00" />
        </linearGradient>
        <linearGradient id="bandGreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0f8a4d" />
          <stop offset="100%" stopColor="#075f33" />
        </linearGradient>
        <radialGradient id="globeShine" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#fff4cf" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#fcc028" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#a36f00" stopOpacity="0.9" />
        </radialGradient>
      </defs>

      {/* Globe / top */}
      <ellipse cx="100" cy="60" rx="48" ry="50" fill="url(#globeShine)" />
      <path
        d="M55 55 q45 -30 90 0"
        fill="none"
        stroke="#a36f00"
        strokeWidth="2"
        opacity="0.7"
      />
      <path
        d="M58 75 q42 -18 84 0"
        fill="none"
        stroke="#a36f00"
        strokeWidth="2"
        opacity="0.55"
      />
      <ellipse cx="100" cy="60" rx="18" ry="50" fill="none" stroke="#a36f00" strokeWidth="2" opacity="0.45" />

      {/* Figures supporting the globe */}
      <path
        d="M62 110 Q70 70 100 80 Q130 70 138 110 L138 175 Q120 195 100 195 Q80 195 62 175 Z"
        fill="url(#goldA)"
        stroke="#a36f00"
        strokeWidth="2"
      />
      <path
        d="M80 115 q20 -20 40 0"
        fill="none"
        stroke="#a36f00"
        strokeWidth="2"
        opacity="0.45"
      />
      <path
        d="M75 130 q25 -10 50 0"
        fill="none"
        stroke="#a36f00"
        strokeWidth="2"
        opacity="0.35"
      />

      {/* Mid waist */}
      <path
        d="M70 175 Q100 188 130 175 L132 195 Q100 205 68 195 Z"
        fill="url(#goldB)"
        stroke="#a36f00"
        strokeWidth="2"
      />

      {/* Tapered stem */}
      <path
        d="M75 200 L78 240 L122 240 L125 200 Z"
        fill="url(#goldA)"
        stroke="#a36f00"
        strokeWidth="2"
      />

      {/* Base top */}
      <rect x="55" y="238" width="90" height="14" rx="3" fill="url(#goldB)" stroke="#a36f00" />
      {/* Green base bands */}
      <rect x="48" y="252" width="104" height="22" rx="4" fill="url(#bandGreen)" />
      <text
        x="100"
        y="269"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="900"
        fontSize="13"
        fill="#fff4cf"
        letterSpacing="2"
      >
        WORLD CUP
      </text>
      <rect x="48" y="276" width="104" height="14" rx="4" fill="url(#bandGreen)" />

      {/* Bottom plate */}
      <rect x="42" y="292" width="116" height="14" rx="3" fill="url(#goldB)" stroke="#a36f00" />

      {/* Subtle glow */}
      <ellipse cx="100" cy="60" rx="60" ry="62" fill="none" stroke="#fcc028" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}
