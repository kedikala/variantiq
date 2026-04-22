import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0a0a0f",
          surface: "#111118",
          border: "#1e1e2e",
          accent: "#00d4aa",
          warning: "#f0a050",
          success: "#4fc3a1",
          text: "#e8e8f0",
          muted: "#6b6b80",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        display: ["var(--font-syne)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0, 212, 170, 0.18), 0 16px 48px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
