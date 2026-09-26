import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Theme-aware tokens backed by the CSS custom properties set by applyTheme().
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
        "accent-2": "rgb(var(--accent-2-rgb) / <alpha-value>)",
        ink: "var(--ink)",
        "ink-dim": "var(--ink-dim)",
        hairline: "var(--border)",
        // Static fallbacks kept for backwards compatibility.
        blood: "#dc143c",
        "dark-red": "#8b0000",
        bone: "#e0e0e0",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(30px, -20px) scale(1.1)" },
        },
        shimmer: {
          "0%": { left: "-100%" },
          "100%": { left: "100%" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeInUp: {
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeInScale: {
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        slideInRight: {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        slideInUp: {
          from: { opacity: "0", transform: "translateY(30px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "0.8", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        flashWarning: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.7", transform: "scale(1.1)" },
        },
        borderFlash: {
          "0%, 100%": { borderColor: "#e74c3c", boxShadow: "0 0 10px rgba(231,76,60,0.3)" },
          "50%": { borderColor: "#c0392b", boxShadow: "0 0 20px rgba(231,76,60,0.6)" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        drift: "drift 20s infinite ease-in-out",
        shimmer: "shimmer 3s infinite",
        fadeIn: "fadeIn 0.5s ease-in",
        fadeInUp: "fadeInUp 0.8s ease-out forwards",
        fadeInScale: "fadeInScale 0.5s ease-out",
        slideInRight: "slideInRight 0.4s ease-out",
        slideInUp: "slideInUp 0.8s ease-out",
        pulse: "pulse 2s ease-in-out infinite",
        flashWarning: "flashWarning 0.5s ease-in-out infinite",
        borderFlash: "borderFlash 1s ease-in-out infinite",
        spin: "spin 1s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
