import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0E0D1A",
        panel: "#171629",
        raised: "#1F1E38",
        line: "#2D2B52",
        fg: "#F1F0FA",
        muted: "#A9A7C9",
        violet: { DEFAULT: "#8B6CFF", soft: "#B3A0FF" },
        azure: { DEFAULT: "#4C8DFF" },
        danger: "#FF8A98",
        ok: "#5FD3A0",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "1.25rem" },
    },
  },
  plugins: [],
};

export default config;
