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
