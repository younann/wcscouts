import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Saint Joseph scouts purple — tuned to match the original logo ink
        royal: {
          50: "#f4eeff",
          100: "#e6d6ff",
          200: "#cdacff",
          300: "#b083f0",
          400: "#9462dd",
          500: "#7a45c8",
          600: "#5e2db0",
          700: "#481f95",
          800: "#37177a",
          900: "#260f56",
          950: "#160833",
        },
        // Trophy gold — slightly warmer / richer
        gold: {
          100: "#fff4cf",
          200: "#feeb96",
          300: "#fdda59",
          400: "#fbc62e",
          500: "#f5b50a",
          600: "#cf9100",
          700: "#9d6e00",
        },
        silver: "#c0c0c0",
        bronze: "#cd7f32",
        cream: "#f6efe1",
      },
      backgroundImage: {
        "btn-gold":
          "linear-gradient(135deg, #fdda59 0%, #f5b50a 50%, #cf9100 100%)",
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        royal: "0 10px 30px -8px rgba(45, 16, 104, 0.55)",
        gold: "0 10px 30px -6px rgba(245, 181, 10, 0.45)",
        glow: "0 0 30px rgba(252, 192, 40, 0.35)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "serif"],
      },
      animation: {
        "pop-in": "popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up": "slideUp 0.3s ease-out",
        "float": "float 4s ease-in-out infinite",
        "spin-slow": "spin 18s linear infinite",
        "shimmer": "shimmer 2.4s linear infinite",
        "confetti": "confetti 7s linear infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
      },
      keyframes: {
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        confetti: {
          "0%": { transform: "translateY(-10vh) rotate(0deg)", opacity: "0" },
          "10%": { opacity: "1" },
          "100%": { transform: "translateY(110vh) rotate(720deg)", opacity: "0" },
        },
        pulseGlow: {
          "0%,100%": { filter: "drop-shadow(0 0 12px rgba(252, 192, 40, 0.35))" },
          "50%": { filter: "drop-shadow(0 0 24px rgba(252, 192, 40, 0.7))" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
