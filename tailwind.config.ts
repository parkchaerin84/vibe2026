import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: { pink: "#F7A8C4", blue: "#A8D8F0", canvas: "#FFF9FC", action: "#E86A9A", soft: "#FFF0F6", ink: "#74334F" },
        ink: { DEFAULT: "#333740", muted: "#555D6B" },
        gray: { 400: "#687080", 500: "#5D6572", 600: "#535A67", 700: "#434957", 800: "#333740", 900: "#262B35" },
        line1: "#0052A4",
        line2: "#00A84D",
        line3: "#EF7C1C",
        line4: "#00A5DE",
        line5: "#996CAC",
        line6: "#CD7C2F",
        line7: "#747F00",
        line8: "#E6186C",
        line9: "#BDB092",
      },
    },
  },
  plugins: [],
};

export default config;
