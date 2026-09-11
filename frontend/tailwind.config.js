/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0D0E12",
        surface: "#16171D",
        elevated: "#1D1E26",
        border: "#2A2C36",
        muted: "#9497A6",
        ink: "#F3F3F6",
        accent: {
          DEFAULT: "#7C6CFF",
          soft: "#7C6CFF1a",
          bright: "#9C8FFF",
        },
        good: "#3DD68C",
        warn: "#F5B942",
        bad: "#F45B69",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 8px 30px -10px rgba(0,0,0,0.5)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite",
        fadeIn: "fadeIn 0.25s ease-out",
        popIn: "popIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
