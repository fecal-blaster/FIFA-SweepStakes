import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Deep stadium night — dark, rich, blue-greens
        ink: {
          950: "#04070d",
          900: "#080d18",
          800: "#0c1424",
          700: "#121e36",
          600: "#1a2b4a"
        },
        pitch: {
          950: "#031208",
          900: "#062014",
          800: "#0a3322",
          700: "#0f4d33",
          600: "#16704a"
        },
        // Broadcast accents
        lime: { 400: "#a3ff5e", 500: "#7eff32", 600: "#5fd618" },
        cyan: { 400: "#5ef0ff", 500: "#2ee0f5" },
        gold: { 400: "#ffd75a", 500: "#f5c542", 600: "#e0a800" },
        silver: { 400: "#cfd6e0" },
        bronze: { 400: "#d68a4a" },
        live: { 400: "#ff5670", 500: "#ff2747" }
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      boxShadow: {
        glow: "0 0 24px -4px rgba(126, 255, 50, 0.55)",
        lift: "0 18px 50px -25px rgba(0, 0, 0, 0.9)",
        livepulse: "0 0 0 4px rgba(255, 39, 71, 0.18)"
      },
      backgroundImage: {
        "stadium-grad":
          "radial-gradient(1200px 600px at 20% -10%, rgba(126,255,50,0.16), transparent 60%), radial-gradient(900px 500px at 80% 0%, rgba(94,240,255,0.10), transparent 60%), linear-gradient(180deg, #04080f 0%, #02060b 100%)",
        "card-grad":
          "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 60%, rgba(0,0,0,0) 100%)",
        "noise":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
      },
      keyframes: {
        "rank-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" }
        },
        "ticker": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" }
        },
        "live-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 39, 71, 0.55)" },
          "50%": { boxShadow: "0 0 0 8px rgba(255, 39, 71, 0)" }
        },
        "score-pop": {
          "0%": { transform: "scale(1)", color: "#7eff32" },
          "30%": { transform: "scale(1.25)", color: "#a3ff5e" },
          "100%": { transform: "scale(1)" }
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        }
      },
      animation: {
        "rank-up": "rank-up 0.4s ease-out",
        "ticker": "ticker 30s linear infinite",
        "live-pulse": "live-pulse 1.5s ease-out infinite",
        "score-pop": "score-pop 0.9s ease-out",
        "shimmer": "shimmer 2.5s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
